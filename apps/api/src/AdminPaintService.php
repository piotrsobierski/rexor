<?php

declare(strict_types=1);

/**
 * Panel lakierów: palety, kolory, przypisanie do modeli i ram oraz rendery.
 *
 * Osobny plik, a nie kolejne 400 linii w AdminService.php - to zamknięty
 * obszar z własnym słownikiem i własnymi regułami ceny (PaintService.php).
 */

/** Slug ASCII z polskiej i niemieckiej nazwy lakieru. */
function paintAdminSlug(string $value): string
{
    $map = ['ą' => 'a', 'ć' => 'c', 'ę' => 'e', 'ł' => 'l', 'ń' => 'n', 'ó' => 'o', 'ś' => 's', 'ź' => 'z', 'ż' => 'z', 'ä' => 'ae', 'ö' => 'oe', 'ü' => 'ue', 'ß' => 'ss'];
    $value = strtr(mb_strtolower($value, 'UTF-8'), $map);
    return trim(preg_replace('~[^a-z0-9]+~', '-', $value) ?? '', '-');
}

/**
 * Pełny stan sekcji „Lakiery”.
 *
 * Kolory wracają bez paginacji (dziś 680 pozycji, ok. 130 kB): panel filtruje
 * i wyszukuje po stronie klienta, tak samo jak lista części, a jeden przelot
 * jest tańszy niż stronicowanie z wyszukiwarką po serwerze.
 */
function adminPaints(PDO $pdo): array
{
    $palettes = $pdo->query(
        'SELECT id, slug, name, brand, kind, description, price_gross, currency, requires_part_sku, is_active, sort_order ' .
        'FROM paint_palettes ORDER BY sort_order, id'
    )->fetchAll();

    $colors = $pdo->query(
        'SELECT c.id, c.palette_id, c.slug, c.code, c.name, c.hex, c.finish, c.group_name, c.search_alt, ' .
        'c.price_gross_override, c.reference_image_path, c.reference_source_url, c.reference_is_public, ' .
        'c.is_active, c.sort_order, ' .
        '(SELECT COUNT(*) FROM paint_renders r WHERE r.color_id = c.id) AS render_count ' .
        'FROM paint_colors c ORDER BY c.palette_id, c.sort_order, c.id'
    )->fetchAll();

    $renders = $pdo->query(
        'SELECT r.id, r.color_id, r.model_id, r.frame_id, r.variant, r.image_path, r.thumb_path, r.source, ' .
        'r.sort_order, r.is_public, ' .
        'm.slug AS model_slug, f.slug AS frame_slug ' .
        'FROM paint_renders r ' .
        'LEFT JOIN bike_models m ON m.id = r.model_id ' .
        'LEFT JOIN frames f ON f.id = r.frame_id ' .
        'ORDER BY r.color_id, r.variant, r.sort_order, r.id'
    )->fetchAll();

    return [
        'palettes' => array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'slug' => $row['slug'],
            'name' => $row['name'],
            'brand' => $row['brand'],
            'kind' => $row['kind'],
            'description' => $row['description'],
            'priceGross' => (float) $row['price_gross'],
            'currency' => $row['currency'],
            'requiresPartSku' => $row['requires_part_sku'],
            'isActive' => (bool) $row['is_active'],
            'sortOrder' => (int) $row['sort_order'],
        ], $palettes),
        'colors' => array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'paletteId' => (int) $row['palette_id'],
            'slug' => $row['slug'],
            'code' => $row['code'],
            'name' => $row['name'],
            'hex' => $row['hex'],
            'finish' => $row['finish'],
            'groupName' => $row['group_name'],
            'searchAlt' => $row['search_alt'],
            'priceGrossOverride' => $row['price_gross_override'] !== null ? (float) $row['price_gross_override'] : null,
            'referencePath' => $row['reference_image_path'],
            'referenceSourceUrl' => $row['reference_source_url'],
            'referenceIsPublic' => (bool) $row['reference_is_public'],
            'isActive' => (bool) $row['is_active'],
            'sortOrder' => (int) $row['sort_order'],
            'renderCount' => (int) $row['render_count'],
        ], $colors),
        'renders' => array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'colorId' => (int) $row['color_id'],
            'modelSlug' => $row['model_slug'],
            'frameSlug' => $row['frame_slug'],
            'variant' => $row['variant'],
            'imagePath' => $row['image_path'],
            'thumbPath' => $row['thumb_path'],
            'source' => $row['source'],
            'sortOrder' => (int) $row['sort_order'],
            'isPublic' => (bool) $row['is_public'],
        ], $renders),
        'availability' => [
            'models' => $pdo->query(
                'SELECT m.slug AS product_slug, p.slug AS palette_slug, mpp.price_gross_override, mpp.is_active ' .
                'FROM model_paint_palettes mpp JOIN bike_models m ON m.id = mpp.model_id ' .
                'JOIN paint_palettes p ON p.id = mpp.palette_id ORDER BY m.slug, p.sort_order'
            )->fetchAll(),
            'frames' => $pdo->query(
                'SELECT f.slug AS product_slug, p.slug AS palette_slug, fpp.price_gross_override, fpp.is_active ' .
                'FROM frame_paint_palettes fpp JOIN frames f ON f.id = fpp.frame_id ' .
                'JOIN paint_palettes p ON p.id = fpp.palette_id ORDER BY f.slug, p.sort_order'
            )->fetchAll(),
        ],
    ];
}

function saveAdminPaintPalette(PDO $pdo, ?int $id, array $input): array
{
    $name = trim((string) ($input['name'] ?? ''));
    if ($name === '') {
        throw new InvalidArgumentException('Podaj nazwę palety.');
    }
    $kind = (string) ($input['kind'] ?? 'custom');
    if (!in_array($kind, ['factory', 'custom'], true)) {
        throw new InvalidArgumentException('Rodzaj palety to „factory” albo „custom”.');
    }
    $price = round((float) ($input['priceGross'] ?? 0), 2);
    if ($price < 0) {
        throw new InvalidArgumentException('Dopłata nie może być ujemna.');
    }
    $requiresPartSku = trim((string) ($input['requiresPartSku'] ?? ''));
    if ($requiresPartSku !== '') {
        $part = $pdo->prepare('SELECT p.id FROM parts p JOIN part_groups g ON g.id = p.group_id WHERE p.sku = :sku AND g.slug = :group');
        $part->execute(['sku' => $requiresPartSku, 'group' => PAINT_GROUP_SLUG]);
        if (!$part->fetch()) {
            throw new InvalidArgumentException('Wymagana opcja musi być istniejącą częścią z grupy „Lakierowanie”.');
        }
    }

    $parameters = [
        'name' => $name,
        'brand' => trim((string) ($input['brand'] ?? '')) ?: null,
        'kind' => $kind,
        'description' => trim((string) ($input['description'] ?? '')) ?: null,
        'price' => $price,
        'requires' => $requiresPartSku !== '' ? $requiresPartSku : null,
        'active' => ($input['isActive'] ?? true) ? 1 : 0,
        'sort' => (int) ($input['sortOrder'] ?? 0),
    ];

    if ($id === null) {
        $slug = paintAdminSlug((string) ($input['slug'] ?? $name));
        if ($slug === '') {
            throw new InvalidArgumentException('Nie udało się zbudować identyfikatora palety z tej nazwy.');
        }
        $pdo->prepare(
            'INSERT INTO paint_palettes (slug, name, brand, kind, description, price_gross, requires_part_sku, is_active, sort_order) ' .
            'VALUES (:slug, :name, :brand, :kind, :description, :price, :requires, :active, :sort)'
        )->execute($parameters + ['slug' => $slug]);
        $id = (int) $pdo->lastInsertId();
    } else {
        $pdo->prepare(
            'UPDATE paint_palettes SET name = :name, brand = :brand, kind = :kind, description = :description, ' .
            'price_gross = :price, requires_part_sku = :requires, is_active = :active, sort_order = :sort WHERE id = :id'
        )->execute($parameters + ['id' => $id]);
    }

    logActivity($pdo, 'paint_palette_saved', 'admin', currentAdmin()['email'] ?? null, "Zapisano paletę lakierów „{$name}”.", ['id' => $id]);

    return ['id' => $id];
}

function deleteAdminPaintPalette(PDO $pdo, int $id): array
{
    // Kasowanie palety zabiera ze sobą kolory (ON DELETE CASCADE), więc
    // blokujemy je, gdy któryś kolor jest użyty w zapisanej konfiguracji -
    // migawka ma zostać czytelna także po sprzątaniu cennika.
    $used = $pdo->prepare('SELECT COUNT(*) FROM configuration_paint cp JOIN paint_colors c ON c.id = cp.color_id WHERE c.palette_id = :id');
    $used->execute(['id' => $id]);
    if ((int) $used->fetchColumn() > 0) {
        throw new InvalidArgumentException('Ta paleta jest użyta w zapisanych konfiguracjach. Zamiast kasować, wyłącz ją.');
    }
    $pdo->prepare('DELETE FROM paint_palettes WHERE id = :id')->execute(['id' => $id]);
    logActivity($pdo, 'paint_palette_deleted', 'admin', currentAdmin()['email'] ?? null, "Usunięto paletę lakierów #{$id}.", ['id' => $id]);

    return ['id' => $id, 'deleted' => true];
}

function saveAdminPaintColor(PDO $pdo, ?int $id, array $input): array
{
    $name = trim((string) ($input['name'] ?? ''));
    if ($name === '') {
        throw new InvalidArgumentException('Podaj nazwę koloru.');
    }
    $hex = strtoupper(trim((string) ($input['hex'] ?? '')));
    if (!preg_match('/^#[0-9A-F]{6}$/', $hex)) {
        throw new InvalidArgumentException('Kolor musi być zapisany jako #RRGGBB.');
    }
    $finish = (string) ($input['finish'] ?? 'uni');
    if (!in_array($finish, ['uni', 'metallic', 'pearl'], true)) {
        throw new InvalidArgumentException('Rodzaj lakieru to uni, metallic albo pearl.');
    }
    $code = trim((string) ($input['code'] ?? ''));

    $parameters = [
        'code' => $code !== '' ? $code : null,
        'name' => $name,
        'hex' => $hex,
        'finish' => $finish,
        'group_name' => trim((string) ($input['groupName'] ?? '')) ?: null,
        'alt' => trim((string) ($input['searchAlt'] ?? '')) ?: null,
        'override' => isset($input['priceGrossOverride']) && $input['priceGrossOverride'] !== null && $input['priceGrossOverride'] !== ''
            ? round((float) $input['priceGrossOverride'], 2)
            : null,
        'reference_public' => ($input['referenceIsPublic'] ?? false) ? 1 : 0,
        'active' => ($input['isActive'] ?? true) ? 1 : 0,
        'sort' => (int) ($input['sortOrder'] ?? 0),
    ];

    if ($id === null) {
        $paletteId = (int) ($input['paletteId'] ?? 0);
        $palette = $pdo->prepare('SELECT id FROM paint_palettes WHERE id = :id');
        $palette->execute(['id' => $paletteId]);
        if (!$palette->fetch()) {
            throw new InvalidArgumentException('Wybierz istniejącą paletę.');
        }
        $base = paintAdminSlug($name . ($code !== '' ? "-{$code}" : ''));
        if ($base === '') {
            throw new InvalidArgumentException('Nie udało się zbudować identyfikatora koloru z tej nazwy.');
        }
        $exists = $pdo->prepare('SELECT 1 FROM paint_colors WHERE palette_id = :palette AND slug = :slug');
        $slug = $base;
        $suffix = 1;
        while (true) {
            $exists->execute(['palette' => $paletteId, 'slug' => $slug]);
            if (!$exists->fetchColumn()) {
                break;
            }
            $slug = $base . '-' . (++$suffix);
        }
        $pdo->prepare(
            'INSERT INTO paint_colors (palette_id, slug, code, name, hex, finish, group_name, search_alt, ' .
            'price_gross_override, reference_is_public, is_active, sort_order) ' .
            'VALUES (:palette, :slug, :code, :name, :hex, :finish, :group_name, :alt, :override, :reference_public, :active, :sort)'
        )->execute($parameters + ['palette' => $paletteId, 'slug' => $slug]);
        $id = (int) $pdo->lastInsertId();
    } else {
        $pdo->prepare(
            'UPDATE paint_colors SET code = :code, name = :name, hex = :hex, finish = :finish, group_name = :group_name, ' .
            'search_alt = :alt, price_gross_override = :override, reference_is_public = :reference_public, ' .
            'is_active = :active, sort_order = :sort WHERE id = :id'
        )->execute($parameters + ['id' => $id]);
    }

    logActivity($pdo, 'paint_color_saved', 'admin', currentAdmin()['email'] ?? null, "Zapisano kolor lakieru „{$name}”.", ['id' => $id]);

    return ['id' => $id];
}

function deleteAdminPaintColor(PDO $pdo, int $id): array
{
    $used = $pdo->prepare('SELECT COUNT(*) FROM configuration_paint WHERE color_id = :id');
    $used->execute(['id' => $id]);
    if ((int) $used->fetchColumn() > 0) {
        throw new InvalidArgumentException('Ten kolor jest użyty w zapisanych konfiguracjach. Zamiast kasować, wyłącz go.');
    }
    $pdo->prepare('DELETE FROM paint_colors WHERE id = :id')->execute(['id' => $id]);
    logActivity($pdo, 'paint_color_deleted', 'admin', currentAdmin()['email'] ?? null, "Usunięto kolor lakieru #{$id}.", ['id' => $id]);

    return ['id' => $id, 'deleted' => true];
}

/**
 * Włączenie albo wyłączenie palety dla jednego produktu, z ewentualną ceną
 * inną niż w palecie. Mapujemy PALETĘ, nie pojedynczy kolor - przypisywanie
 * 636 lakierów Porsche do modelu po jednym nie miałoby sensu.
 */
function saveAdminPaintAvailability(PDO $pdo, array $input): array
{
    $resource = (string) ($input['resource'] ?? '');
    $definitions = [
        'model' => ['table' => 'model_paint_palettes', 'column' => 'model_id', 'source' => 'bike_models'],
        'frame' => ['table' => 'frame_paint_palettes', 'column' => 'frame_id', 'source' => 'frames'],
    ];
    if (!isset($definitions[$resource])) {
        throw new InvalidArgumentException('Nieznany typ produktu.');
    }
    $definition = $definitions[$resource];

    $owner = $pdo->prepare("SELECT id FROM {$definition['source']} WHERE slug = :slug");
    $owner->execute(['slug' => (string) ($input['productSlug'] ?? '')]);
    $ownerId = $owner->fetchColumn();
    if ($ownerId === false) {
        throw new InvalidArgumentException('Nie znaleziono produktu o tym identyfikatorze.');
    }

    $palette = $pdo->prepare('SELECT id FROM paint_palettes WHERE slug = :slug');
    $palette->execute(['slug' => (string) ($input['paletteSlug'] ?? '')]);
    $paletteId = $palette->fetchColumn();
    if ($paletteId === false) {
        throw new InvalidArgumentException('Nie znaleziono palety o tym identyfikatorze.');
    }

    $override = isset($input['priceGrossOverride']) && $input['priceGrossOverride'] !== null && $input['priceGrossOverride'] !== ''
        ? round((float) $input['priceGrossOverride'], 2)
        : null;

    $pdo->prepare(
        "INSERT INTO {$definition['table']} ({$definition['column']}, palette_id, price_gross_override, is_active, sort_order) " .
        'VALUES (:owner, :palette, :override, :active, :sort) ' .
        'ON DUPLICATE KEY UPDATE price_gross_override = VALUES(price_gross_override), is_active = VALUES(is_active), sort_order = VALUES(sort_order)'
    )->execute([
        'owner' => (int) $ownerId,
        'palette' => (int) $paletteId,
        'override' => $override,
        'active' => ($input['isActive'] ?? true) ? 1 : 0,
        'sort' => (int) ($input['sortOrder'] ?? 0),
    ]);

    return ['resource' => $resource, 'productSlug' => $input['productSlug'], 'paletteSlug' => $input['paletteSlug']];
}

/**
 * Render dla pary kolor + produkt. Plik jest wgrywany osobno przez
 * POST /admin/media, a tutaj zapisujemy zwróconą ścieżkę - tak samo jak
 * w przypadku ram i realizacji.
 */
function saveAdminPaintRender(PDO $pdo, array $input): array
{
    $colorId = (int) ($input['colorId'] ?? 0);
    $color = $pdo->prepare('SELECT id, name FROM paint_colors WHERE id = :id');
    $color->execute(['id' => $colorId]);
    $colorRow = $color->fetch();
    if (!$colorRow) {
        throw new InvalidArgumentException('Nie znaleziono koloru.');
    }

    $variant = (string) ($input['variant'] ?? 'standard');
    if (!in_array($variant, ['standard', 'ultra', 'photo'], true)) {
        throw new InvalidArgumentException('Wariant obrazu to „standard”, „ultra” albo „photo”.');
    }
    $imagePath = trim((string) ($input['imagePath'] ?? ''));
    if (!preg_match('~^/(uploads|media)/~', $imagePath)) {
        throw new InvalidArgumentException('Ścieżka renderu musi wskazywać wgrany plik.');
    }

    $modelId = null;
    $frameId = null;
    if (($input['modelSlug'] ?? '') !== '') {
        $statement = $pdo->prepare('SELECT id FROM bike_models WHERE slug = :slug');
        $statement->execute(['slug' => (string) $input['modelSlug']]);
        $modelId = $statement->fetchColumn();
        if ($modelId === false) {
            throw new InvalidArgumentException('Nie znaleziono modelu.');
        }
        $modelId = (int) $modelId;
    } elseif (($input['frameSlug'] ?? '') !== '') {
        $statement = $pdo->prepare('SELECT id FROM frames WHERE slug = :slug');
        $statement->execute(['slug' => (string) $input['frameSlug']]);
        $frameId = $statement->fetchColumn();
        if ($frameId === false) {
            throw new InvalidArgumentException('Nie znaleziono ramy.');
        }
        $frameId = (int) $frameId;
    } else {
        throw new InvalidArgumentException('Render musi być przypisany do modelu albo do ramy.');
    }

    // Jedna para kolor + produkt + wariant ma jeden render: kolejny upload
    // podmienia poprzedni zamiast dokładać drugi wiersz. Zdjęcia są wyjątkiem
    // - rower sfotografowany z kilku stron to kilka wierszy, więc każdy upload
    // dokłada nowy, a `sort_order` trzyma kolejność wgrywania.
    $existingId = false;
    if ($variant !== 'photo') {
        $existing = $pdo->prepare(
            'SELECT id FROM paint_renders WHERE color_id = :color AND variant = :variant ' .
            'AND model_id <=> :model AND frame_id <=> :frame'
        );
        $existing->execute(['color' => $colorId, 'variant' => $variant, 'model' => $modelId, 'frame' => $frameId]);
        $existingId = $existing->fetchColumn();
    }

    $parameters = [
        'image' => $imagePath,
        'thumb' => trim((string) ($input['thumbPath'] ?? '')) ?: null,
        'source' => trim((string) ($input['source'] ?? '')) ?: null,
        'public' => ($input['isPublic'] ?? true) ? 1 : 0,
    ];
    if ($existingId === false) {
        if (isset($input['sortOrder']) && $input['sortOrder'] !== null && $input['sortOrder'] !== '') {
            $sort = (int) $input['sortOrder'];
        } else {
            $next = $pdo->prepare(
                'SELECT COALESCE(MAX(sort_order), 0) + 10 FROM paint_renders ' .
                'WHERE color_id = :color AND variant = :variant AND model_id <=> :model AND frame_id <=> :frame'
            );
            $next->execute(['color' => $colorId, 'variant' => $variant, 'model' => $modelId, 'frame' => $frameId]);
            $sort = (int) $next->fetchColumn();
        }
        $pdo->prepare(
            'INSERT INTO paint_renders (color_id, model_id, frame_id, variant, image_path, thumb_path, source, sort_order, is_public) ' .
            'VALUES (:color, :model, :frame, :variant, :image, :thumb, :source, :sort, :public)'
        )->execute($parameters + ['color' => $colorId, 'model' => $modelId, 'frame' => $frameId, 'variant' => $variant, 'sort' => $sort]);
        $id = (int) $pdo->lastInsertId();
    } else {
        $id = (int) $existingId;
        $pdo->prepare('UPDATE paint_renders SET image_path = :image, thumb_path = :thumb, source = :source, is_public = :public WHERE id = :id')
            ->execute($parameters + ['id' => $id]);
    }

    $what = $variant === 'photo' ? 'zdjęcie' : 'render';
    logActivity($pdo, 'paint_render_saved', 'admin', currentAdmin()['email'] ?? null, "Zapisano {$what} lakieru „{$colorRow['name']}”.", ['id' => $id, 'variant' => $variant]);

    return ['id' => $id];
}

function deleteAdminPaintRender(PDO $pdo, int $id): array
{
    $pdo->prepare('DELETE FROM paint_renders WHERE id = :id')->execute(['id' => $id]);
    logActivity($pdo, 'paint_render_deleted', 'admin', currentAdmin()['email'] ?? null, "Usunięto render lakieru #{$id}.", ['id' => $id]);

    return ['id' => $id, 'deleted' => true];
}
