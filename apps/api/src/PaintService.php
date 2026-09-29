<?php

declare(strict_types=1);

/**
 * Lakier jako osobny wymiar konfiguracji.
 *
 * Konfigurator ma dwie niezależne osie i celowo ich nie miesza:
 *
 *   * grupa części `paint` wycenia PROCES - czy rama w ogóle idzie do lakierni
 *     i w jakim zakresie. Siedzi w zwykłym cenniku części (`parts`).
 *   * paleta i kolor wyceniają DOSTĘP do konkretnego lakieru - kolory Rexor
 *     są w cenie, Porsche Paint to Sample i Volkswagen z dopłatą.
 *
 * Spójność pilnuje `paint_palettes.requires_part_sku`: kolor z palety płatnej
 * nie może stać obok "lakierowania standardowego". Konfigurator podnosi opcję
 * procesu sam, a API i tak sprawdza to jeszcze raz - patrz
 * validatePaintSelection().
 *
 * Dopłata za kolor jest ceną sprzedaży, nie kosztem składnika, więc narzut
 * modelu jej nie dotyczy. Doliczamy ją po narzucie, tak samo jak
 * `model_price_adjustments`.
 */

const PAINT_GROUP_SLUG = 'paint';

/**
 * Filtr „które kolory w ogóle pokazujemy klientowi”.
 *
 *   all         - wszystkie aktywne kolory (domyślnie)
 *   with_image  - tylko te, dla których mamy zdjęcie ALBO render produktu
 *   with_photo  - tylko te ze zdjęciem realnego roweru
 *
 * Kompletna paleta 686 lakierów jest atutem tylko wtedy, gdy klient widzi,
 * jak one wyglądają. Zanim renderów i zdjęć będzie komplet, właściciel może
 * chcieć pokazywać wyłącznie to, co ma obraz - stąd ustawienie, a nie
 * wyłączanie kilkuset kolorów po jednym.
 */
const PAINT_COLOR_FILTERS = ['all', 'with_image', 'with_photo'];

/**
 * Globalne ustawienia palet. Jeden dokument w `site_settings`, tak samo jak
 * motyw i teksty - to ustawienie całego sklepu, nie własność pojedynczej
 * palety, więc nie ma po co kolumny w `paint_palettes`.
 *
 * Czyta z domyślnymi wartościami, więc brak wiersza nie jest błędem i nie
 * wymagał migracji.
 *
 * `renderFallback` (domyślnie włączone): gdy lakier nie ma obrazu na TYM
 * produkcie, pokazujemy obraz z innego modelu/ramy - klient wybiera kolor,
 * a nie render konkretnej ramy (uwaga klienta z 29 września 2026).
 *
 * @return array{colorFilter:string, renderFallback:bool}
 */
function paintSettings(PDO $pdo): array
{
    $value = $pdo->query("SELECT value FROM site_settings WHERE setting_key = 'paint_visibility'")->fetchColumn();
    $stored = is_string($value) ? json_decode($value, true) : null;
    $filter = is_array($stored) ? (string) ($stored['colorFilter'] ?? 'all') : 'all';

    return [
        'colorFilter' => in_array($filter, PAINT_COLOR_FILTERS, true) ? $filter : 'all',
        'renderFallback' => is_array($stored) ? (bool) ($stored['renderFallback'] ?? true) : true,
    ];
}

/** Czy kolor z takim kompletem obrazów przechodzi przez globalny filtr. */
function paintColorPassesFilter(array $renders, string $filter): bool
{
    if ($filter === 'with_photo') {
        return ($renders['photos'] ?? []) !== [];
    }
    if ($filter === 'with_image') {
        return $renders !== [];
    }

    return true;
}

/**
 * Palety dostępne dla produktu wraz z kolorami i renderami.
 *
 * $resource to 'model' albo 'frame' - nazwa tabeli NIGDY nie pochodzi
 * z żądania, tylko z tej whitelisty.
 *
 * Globalny filtr kolorów działa TU, a nie w przeglądarce: to on rozstrzyga
 * też o dostępności przy zapisie konfiguracji (`resolvePaintSelection` woła
 * tę samą funkcję), więc ukrytego koloru nie da się wybrać z pominięciem
 * interfejsu. Filtr jest liczony per produkt, bo obrazy należą do PARY
 * kolor + produkt: ten sam lakier może mieć render na E55 i nie mieć na E82.
 */
function paintPalettesFor(PDO $pdo, string $resource, int $ownerId, bool $includeAdminOnly = false): array
{
    $definitions = [
        'model' => ['table' => 'model_paint_palettes', 'column' => 'model_id'],
        'frame' => ['table' => 'frame_paint_palettes', 'column' => 'frame_id'],
    ];
    if (!isset($definitions[$resource])) {
        throw new InvalidArgumentException('Nieznany typ produktu dla lakierów.');
    }
    $definition = $definitions[$resource];

    $paletteStatement = $pdo->prepare(
        'SELECT pp.id, pp.slug, pp.name, pp.brand, pp.kind, pp.description, pp.requires_part_sku, ' .
        'COALESCE(link.price_gross_override, pp.price_gross) AS price_gross, pp.currency, pp.sort_order ' .
        "FROM {$definition['table']} link " .
        'JOIN paint_palettes pp ON pp.id = link.palette_id ' .
        "WHERE link.{$definition['column']} = :owner AND link.is_active = TRUE AND pp.is_active = TRUE " .
        'ORDER BY link.sort_order, pp.sort_order, pp.id'
    );
    $paletteStatement->execute(['owner' => $ownerId]);
    $palettes = $paletteStatement->fetchAll();
    if ($palettes === []) {
        return [];
    }

    // Panel ogląda komplet - filtr ma ukrywać kolory klientowi, a nie temu,
    // kto ma je uzupełnić o zdjęcia.
    $settings = paintSettings($pdo);
    $colorFilter = $includeAdminOnly ? 'all' : $settings['colorFilter'];
    // Panel edytuje obrazy konkretnego produktu, więc zastępcze obrazy
    // z innych produktów widzi tylko klient.
    $renderFallback = !$includeAdminOnly && $settings['renderFallback'];

    $colorStatement = $pdo->prepare(
        'SELECT id, palette_id, slug, code, name, hex, finish, group_name, search_alt, price_gross_override, ' .
        'reference_image_path, reference_source_url, reference_is_public ' .
        'FROM paint_colors WHERE palette_id = :palette AND is_active = TRUE ORDER BY sort_order, id'
    );
    // Render zależy od PARY kolor + produkt, więc pobieramy go dla tego
    // jednego właściciela, a nie dla koloru w oderwaniu od produktu.
    $renderStatement = $pdo->prepare(
        'SELECT r.color_id, r.variant, r.image_path, r.thumb_path, r.source ' .
        'FROM paint_renders r JOIN paint_colors c ON c.id = r.color_id ' .
        "WHERE c.palette_id = :palette AND r.{$definition['column']} = :owner AND r.is_public = TRUE " .
        'ORDER BY r.variant, r.sort_order, r.id'
    );
    // Obrazy tego lakieru na innych produktach - najpierw modele (wg ich
    // kolejności), potem ramy. Dawcą jest jeden, pierwszy produkt, żeby nie
    // mieszać ujęć z różnych rowerów.
    $fallbackStatement = $renderFallback ? $pdo->prepare(
        'SELECT r.color_id, r.model_id, r.frame_id, r.variant, r.image_path, r.thumb_path, r.source, ' .
        'COALESCE(m.name, f.name) AS owner_name ' .
        'FROM paint_renders r JOIN paint_colors c ON c.id = r.color_id ' .
        'LEFT JOIN bike_models m ON m.id = r.model_id LEFT JOIN frames f ON f.id = r.frame_id ' .
        "WHERE c.palette_id = :palette AND r.is_public = TRUE AND NOT (r.{$definition['column']} <=> :owner) " .
        'ORDER BY r.model_id IS NULL, m.sort_order, m.id, f.sort_order, f.id, r.variant, r.sort_order, r.id'
    ) : null;

    $result = [];
    foreach ($palettes as $palette) {
        $paletteId = (int) $palette['id'];
        $palettePrice = (float) $palette['price_gross'];

        $renderStatement->execute(['palette' => $paletteId, 'owner' => $ownerId]);
        $renders = [];
        foreach ($renderStatement->fetchAll() as $render) {
            $colorKey = (int) $render['color_id'];
            $variant = (string) $render['variant'];
            $entry = [
                'variant' => $variant,
                'image' => $render['image_path'],
                'thumb' => $render['thumb_path'],
                'source' => $render['source'],
            ];
            // Wizualizacja jest jedna (`ultra`), zdjęć wiele - stąd `photos`
            // jako lista, a `ultra` jako pojedyncze pole.
            if ($variant === 'photo') {
                $renders[$colorKey]['photos'][] = $entry;
            } else {
                $renders[$colorKey][$variant] = $entry;
            }
        }

        $fallbackRenders = [];
        if ($fallbackStatement !== null) {
            $fallbackStatement->execute(['palette' => $paletteId, 'owner' => $ownerId]);
            $donors = [];
            foreach ($fallbackStatement->fetchAll() as $render) {
                $colorKey = (int) $render['color_id'];
                if (isset($renders[$colorKey])) {
                    continue;
                }
                $donor = $render['model_id'] !== null ? "m{$render['model_id']}" : "f{$render['frame_id']}";
                $donors[$colorKey] ??= $donor;
                if ($donors[$colorKey] !== $donor) {
                    continue;
                }
                $entry = [
                    'variant' => (string) $render['variant'],
                    'image' => $render['image_path'],
                    'thumb' => $render['thumb_path'],
                    'source' => $render['source'],
                    // Klient ma wiedzieć, że ogląda lakier na innym rowerze.
                    'fallbackFrom' => $render['owner_name'],
                ];
                if ($entry['variant'] === 'photo') {
                    $fallbackRenders[$colorKey]['photos'][] = $entry;
                } else {
                    $fallbackRenders[$colorKey][$entry['variant']] = $entry;
                }
            }
        }

        $colorStatement->execute(['palette' => $paletteId]);
        $colors = [];
        foreach ($colorStatement->fetchAll() as $color) {
            $colorId = (int) $color['id'];
            $colorRenders = $renders[$colorId] ?? $fallbackRenders[$colorId] ?? [];
            if (!paintColorPassesFilter($colorRenders, $colorFilter)) {
                continue;
            }
            $entry = [
                'id' => $colorId,
                'slug' => $color['slug'],
                'code' => $color['code'],
                'name' => $color['name'],
                'hex' => $color['hex'],
                'finish' => $color['finish'],
                'groupName' => $color['group_name'],
                'searchAlt' => $color['search_alt'],
                'priceGross' => $color['price_gross_override'] !== null ? (float) $color['price_gross_override'] : $palettePrice,
                'renders' => $colorRenders,
            ];
            // Zdjęcia referencyjne aut pochodzą z zewnętrznych galerii.
            // Publiczna odpowiedź nie niesie nawet ścieżki, dopóki
            // administrator nie oznaczy zdjęcia jako publiczne.
            if ($includeAdminOnly) {
                $entry['referencePath'] = $color['reference_image_path'];
                $entry['referenceSourceUrl'] = $color['reference_source_url'];
                $entry['referenceIsPublic'] = (bool) $color['reference_is_public'];
            } elseif ((bool) $color['reference_is_public'] && $color['reference_image_path'] !== null) {
                $entry['referencePath'] = $color['reference_image_path'];
                $entry['referenceSourceUrl'] = $color['reference_source_url'];
            }
            $colors[] = $entry;
        }

        // Paleta bez ani jednego widocznego koloru to pusty filtr i pusta
        // sekcja w pickerze - lepiej jej nie pokazywać wcale.
        if ($colors === []) {
            continue;
        }

        $result[] = [
            'slug' => $palette['slug'],
            'name' => $palette['name'],
            'brand' => $palette['brand'],
            'kind' => $palette['kind'],
            'description' => $palette['description'],
            'priceGross' => $palettePrice,
            'currency' => $palette['currency'],
            'requiresPartSku' => $palette['requires_part_sku'],
            'colors' => $colors,
        ];
    }

    return $result;
}

/** Publiczna odpowiedź `/paints/{model|frame}/{slug}`. */
function publicPaints(PDO $pdo, string $resource, string $slug): ?array
{
    if ($resource === 'model') {
        $statement = $pdo->prepare("SELECT id, name FROM bike_models WHERE slug = :slug AND status <> 'archived'");
    } else {
        $statement = $pdo->prepare("SELECT id, name FROM frames WHERE slug = :slug AND status = 'published' AND paint_available = TRUE");
    }
    $statement->execute(['slug' => $slug]);
    $owner = $statement->fetch();
    if (!$owner) {
        return null;
    }

    // `colorFilter` jedzie do przeglądarki nie po to, żeby cokolwiek filtrowała
    // (to już zrobił serwer), tylko żeby picker mógł napisać klientowi, czemu
    // widzi 40 lakierów zamiast 686.
    return [
        'resource' => $resource,
        'slug' => $slug,
        'colorFilter' => paintSettings($pdo)['colorFilter'],
        'palettes' => paintPalettesFor($pdo, $resource, (int) $owner['id']),
    ];
}

/**
 * Wybrany kolor wraz z ceną i regułą procesu, albo null gdy klient nie wskazał
 * koloru. Rzuca wyjątek, gdy kolor nie jest dostępny dla tego produktu -
 * cena i dostępność powstają wyłącznie po stronie serwera.
 *
 * @return array{colorId:int,paletteName:string,paletteSlug:string,name:string,code:?string,hex:string,finish:string,priceGross:float,requiresPartSku:?string,render:?string}|null
 */
function resolvePaintSelection(PDO $pdo, string $resource, int $ownerId, ?string $paletteSlug, ?string $colorSlug): ?array
{
    if ($colorSlug === null || $colorSlug === '' || $paletteSlug === null || $paletteSlug === '') {
        return null;
    }

    foreach (paintPalettesFor($pdo, $resource, $ownerId) as $palette) {
        if ($palette['slug'] !== $paletteSlug) {
            continue;
        }
        foreach ($palette['colors'] as $color) {
            if ($color['slug'] !== $colorSlug) {
                continue;
            }
            // Prawdziwe zdjęcie bije wizualizację - ta sama kolejność co
            // w `bestRender()` po stronie web. To, co widział klient, trafia
            // do migawki konfiguracji.
            $render = $color['renders']['photos'][0]['image']
                ?? $color['renders']['ultra']['image']
                ?? null;

            return [
                'colorId' => $color['id'],
                'paletteSlug' => $palette['slug'],
                'paletteName' => $palette['name'],
                'colorSlug' => $color['slug'],
                'name' => $color['name'],
                'code' => $color['code'],
                'hex' => $color['hex'],
                'finish' => $color['finish'],
                'priceGross' => $color['priceGross'],
                'requiresPartSku' => $palette['requiresPartSku'],
                'render' => $render,
            ];
        }
        throw new InvalidArgumentException('Wybrany kolor lakieru nie jest dostępny dla tego produktu.');
    }

    throw new InvalidArgumentException('Wybrana paleta lakierów nie jest dostępna dla tego produktu.');
}

/**
 * Sprawdza, czy wybrana opcja z grupy `paint` wystarcza dla wybranego koloru.
 *
 * Reguła jest celowo minimalna: paleta wskazuje SKU, którego wymaga, a wybór
 * klienta musi być albo tym SKU, albo dowolną inną opcją niedomyślną (czyli
 * czymś szerszym niż lakierowanie standardowe). Dzięki temu dołożenie w panelu
 * droższej opcji lakierowania nie wymaga dopisywania nowej reguły.
 */
function validatePaintSelection(array $groups, array $selections, array $paint): void
{
    $requiredSku = $paint['requiresPartSku'] ?? null;
    if ($requiredSku === null) {
        return;
    }
    $group = $groups[PAINT_GROUP_SLUG] ?? null;
    if ($group === null) {
        throw new InvalidArgumentException('Ten model nie ma opcji lakierowania, więc nie można wybrać koloru z palety płatnej.');
    }
    $selected = $selections[PAINT_GROUP_SLUG] ?? $group['defaultSku'];
    if ($selected === null || $selected === $group['defaultSku']) {
        $requiredName = $group['options'][$requiredSku]['name'] ?? $requiredSku;
        throw new InvalidArgumentException("Kolor {$paint['name']} wymaga opcji „{$requiredName}” w grupie {$group['name']}.");
    }
}

/** Migawka lakieru w zapisanej konfiguracji. */
function storeConfigurationPaint(PDO $pdo, int $configurationId, array $paint): void
{
    $pdo->prepare(
        'INSERT INTO configuration_paint (configuration_id, color_id, palette_name_snapshot, color_name_snapshot, ' .
        'color_code_snapshot, color_hex_snapshot, finish_snapshot, gross_price_snapshot, render_path_snapshot) ' .
        'VALUES (:configuration, :color, :palette, :name, :code, :hex, :finish, :price, :render)'
    )->execute([
        'configuration' => $configurationId,
        'color' => $paint['colorId'],
        'palette' => $paint['paletteName'],
        'name' => $paint['name'],
        'code' => $paint['code'],
        'hex' => $paint['hex'],
        'finish' => $paint['finish'],
        'price' => $paint['priceGross'],
        'render' => $paint['render'],
    ]);
}
