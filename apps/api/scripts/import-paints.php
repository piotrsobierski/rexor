<?php

declare(strict_types=1);

/**
 * Import palet lakierów i renderów z projektu `e55-paint-to-sample`.
 *
 * Źródłem są dwa pliki tamtego repozytorium:
 *   * `palette.js`            - katalog lakierów Porsche i Volkswagena
 *                               (nazwa, kod, hex, synonimy do wyszukiwarki),
 *   * `renders/manifest.json` - co zostało policzone: render ramy E55 w danym
 *                               kolorze, wariant "ultra" i zdjęcie referencyjne.
 *
 * Skrypt jest idempotentny: kluczem naturalnym koloru jest `slug` w obrębie
 * palety, a renderu para kolor + produkt + wariant. Ponowne uruchomienie
 * aktualizuje, nie duplikuje.
 *
 * Podgląd (domyślny):  php apps/api/scripts/import-paints.php
 * Wykonanie:           php apps/api/scripts/import-paints.php --apply
 * Opcje:
 *   --source=ŚCIEŻKA   katalog repo e55-paint-to-sample
 *                      (domyślnie ../e55-paint-to-sample obok tego repo)
 *   --model=SLUG       model, do którego przypisujemy rendery (domyślnie e55)
 *   --no-references    pomija zdjęcia referencyjne aut
 */

require dirname(__DIR__) . '/src/bootstrap.php';

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Skrypt jest wyłącznie dla CLI.\n");
}

$options = getopt('', ['source::', 'model::', 'apply', 'no-references']);
$apply = isset($options['apply']);
$withReferences = !isset($options['no-references']);
$source = rtrim((string) ($options['source'] ?? dirname(projectRoot()) . '/e55-paint-to-sample'), '/');
$modelSlug = (string) ($options['model'] ?? 'e55');

$paletteFile = "{$source}/palette.js";
$manifestFile = "{$source}/renders/manifest.json";
foreach ([$paletteFile, $manifestFile] as $required) {
    if (!is_file($required)) {
        fwrite(STDERR, "BŁĄD: nie znaleziono {$required}\n");
        exit(1);
    }
}

/**
 * `palette.js` to moduł przeglądarkowy przypisujący `window.PALETTES`, a nie
 * JSON: ma niecytowane klucze, apostrofy i komentarze. Zamiast pisać własny
 * parser JS oddajemy plik Node'owi z podstawionym `window` - to jest dokładnie
 * to środowisko, dla którego plik powstał, więc nie ma miejsca na rozjazd.
 */
function readPalettes(string $paletteFile): array
{
    $script = 'global.window = {}; require(' . json_encode($paletteFile) . '); '
        . 'process.stdout.write(JSON.stringify(window.PALETTES));';
    $descriptors = [1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
    $process = proc_open(['node', '-e', $script], $descriptors, $pipes);
    if (!is_resource($process)) {
        throw new RuntimeException('Nie udało się uruchomić node. Import palety wymaga Node.js.');
    }
    $json = stream_get_contents($pipes[1]);
    $error = stream_get_contents($pipes[2]);
    foreach ($pipes as $pipe) {
        fclose($pipe);
    }
    if (proc_close($process) !== 0) {
        throw new RuntimeException('node nie odczytał palette.js: ' . trim((string) $error));
    }

    return json_decode((string) $json, true, 64, JSON_THROW_ON_ERROR);
}

/** Slug ASCII z polskich i niemieckich nazw lakierów. */
function paintSlug(string $value): string
{
    $map = ['ą' => 'a', 'ć' => 'c', 'ę' => 'e', 'ł' => 'l', 'ń' => 'n', 'ó' => 'o', 'ś' => 's', 'ź' => 'z', 'ż' => 'z', 'ä' => 'ae', 'ö' => 'oe', 'ü' => 'ue', 'ß' => 'ss'];
    $value = strtr(mb_strtolower($value, 'UTF-8'), $map);
    $value = preg_replace('~[^a-z0-9]+~', '-', $value) ?? '';
    return trim($value, '-');
}

/**
 * Rodzina efektu z nazwy i synonimów. To samo rozróżnienie, które w projekcie
 * e55 steruje modelem kątowym lakieru; tutaj służy do etykiety i filtra.
 */
function paintFinish(string $name, string $alt): string
{
    $haystack = mb_strtolower($name . ' ' . $alt, 'UTF-8');
    if (preg_match('~perl|pearl~', $haystack)) {
        return 'pearl';
    }
    if (preg_match('~metallic|metalik|effekt~', $haystack)) {
        return 'metallic';
    }
    return 'uni';
}

/** Kopia pliku do katalogu docelowego; zwraca ścieżkę publiczną albo null. */
function copyPaintFile(string $from, string $toAbsolute, bool $apply): bool
{
    if (!is_file($from)) {
        return false;
    }
    if (!$apply) {
        return true;
    }
    $directory = dirname($toAbsolute);
    if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
        throw new RuntimeException("Nie udało się utworzyć katalogu {$directory}.");
    }
    // Kopiujemy tylko wtedy, gdy plik jeszcze nie istnieje albo różni się
    // rozmiarem - ponowny import 1,5 tys. obrazów nie musi przepisywać dysku.
    if (is_file($toAbsolute) && filesize($toAbsolute) === filesize($from)) {
        return true;
    }
    if (!copy($from, $toAbsolute)) {
        throw new RuntimeException("Nie udało się skopiować {$from}.");
    }
    return true;
}

$pdo = database();
$palettes = readPalettes($paletteFile);
$manifest = json_decode((string) file_get_contents($manifestFile), true, 64, JSON_THROW_ON_ERROR);

// Paleta źródłowa -> paleta w bazie. Import nie zakłada palet; muszą istnieć
// (migracja 028), bo to one niosą cenę i regułę wymuszania opcji lakierowania.
$paletteMap = ['porsche' => 'porsche-pts', 'vw' => 'volkswagen'];

$paletteIds = [];
foreach ($paletteMap as $targetSlug) {
    $statement = $pdo->prepare('SELECT id FROM paint_palettes WHERE slug = :slug');
    $statement->execute(['slug' => $targetSlug]);
    $id = $statement->fetchColumn();
    if ($id === false) {
        fwrite(STDERR, "BŁĄD: brak palety '{$targetSlug}' w bazie. Uruchom migracje.\n");
        exit(1);
    }
    $paletteIds[$targetSlug] = (int) $id;
}

$modelStatement = $pdo->prepare("SELECT id, name FROM bike_models WHERE slug = :slug AND status <> 'archived'");
$modelStatement->execute(['slug' => $modelSlug]);
$model = $modelStatement->fetch();
if (!$model) {
    fwrite(STDERR, "BŁĄD: nie znaleziono modelu '{$modelSlug}'.\n");
    exit(1);
}
$modelId = (int) $model['id'];

// ---------------------------------------------------------------------------
// 1. Kolory
// ---------------------------------------------------------------------------

$insertColor = $pdo->prepare(
    'INSERT INTO paint_colors (palette_id, slug, code, name, hex, finish, group_name, search_alt, sort_order) ' .
    'VALUES (:palette, :slug, :code, :name, :hex, :finish, :group_name, :alt, :sort) ' .
    'ON DUPLICATE KEY UPDATE code = VALUES(code), name = VALUES(name), hex = VALUES(hex), ' .
    'finish = VALUES(finish), group_name = VALUES(group_name), search_alt = VALUES(search_alt), sort_order = VALUES(sort_order)'
);
$findColor = $pdo->prepare('SELECT id FROM paint_colors WHERE palette_id = :palette AND slug = :slug');

$colorIdByKey = [];   // "paleta|slug"  -> id (albo null w podglądzie)
$colorIdByName = [];  // "paleta|nazwa" -> slug, do dopasowania manifestu
// Wpisy manifestu pobrane samym zdjęciem referencyjnym (435 z 664) nie mają
// nazwy ani marki - tylko klucz hex. Dla nich jedynym połączeniem z paletą
// jest hex, bo to on był kluczem cache'u w tamtej aplikacji.
$colorByHex = []; // "#RRGGBB" -> lista ["paleta", "slug"]
$imported = ['colors' => 0, 'renders' => 0, 'ultra' => 0, 'references' => 0, 'unmatched' => [], 'ambiguous' => []];

foreach ($palettes as $palette) {
    $targetSlug = $paletteMap[$palette['id']] ?? null;
    if ($targetSlug === null) {
        continue;
    }
    $paletteId = $paletteIds[$targetSlug];
    $sort = 0;
    $usedSlugs = [];

    foreach ($palette['groups'] as $group) {
        foreach ($group['colors'] as $color) {
            $sort += 10;
            $name = (string) $color['name'];
            $code = isset($color['code']) && $color['code'] !== '' ? (string) $color['code'] : null;
            $alt = isset($color['alt']) ? (string) $color['alt'] : '';

            // Kod bywa powtórzony w obrębie marki (39 przypadków u Porsche),
            // więc klucz naturalny to nazwa + kod, a kolizje rozstrzyga numer.
            $base = paintSlug($name . ($code !== null ? "-{$code}" : ''));
            $slug = $base;
            $suffix = 1;
            while (isset($usedSlugs[$slug])) {
                $slug = $base . '-' . (++$suffix);
            }
            $usedSlugs[$slug] = true;

            if ($apply) {
                $insertColor->execute([
                    'palette' => $paletteId,
                    'slug' => $slug,
                    'code' => $code,
                    'name' => $name,
                    'hex' => strtoupper((string) $color['hex']),
                    'finish' => paintFinish($name, $alt),
                    'group_name' => (string) $group['group'],
                    'alt' => $alt !== '' ? $alt : null,
                    'sort' => $sort,
                ]);
                $findColor->execute(['palette' => $paletteId, 'slug' => $slug]);
                $colorIdByKey["{$targetSlug}|{$slug}"] = (int) $findColor->fetchColumn();
            }
            $colorIdByName["{$targetSlug}|" . mb_strtolower($name, 'UTF-8')] = $slug;
            $colorByHex[strtoupper((string) $color['hex'])][] = [$targetSlug, $slug];
            $imported['colors']++;
        }
    }
}

// ---------------------------------------------------------------------------
// 2. Rendery i zdjęcia referencyjne
// ---------------------------------------------------------------------------

$brandMap = ['Porsche' => 'porsche-pts', 'Volkswagen' => 'volkswagen'];
$renderDirectory = projectRoot() . "/public/media/paints/renders/{$modelSlug}";
$referenceDirectory = projectRoot() . '/storage/paint-reference';

$findRender = $pdo->prepare('SELECT id FROM paint_renders WHERE color_id = :color AND model_id = :model AND variant = :variant');
$insertRender = $pdo->prepare(
    'INSERT INTO paint_renders (color_id, model_id, variant, image_path, thumb_path, source) ' .
    'VALUES (:color, :model, :variant, :image, :thumb, :source)'
);
$updateRender = $pdo->prepare('UPDATE paint_renders SET image_path = :image, thumb_path = :thumb, source = :source WHERE id = :id');
$updateReference = $pdo->prepare('UPDATE paint_colors SET reference_image_path = :path, reference_source_url = :url WHERE id = :id');

foreach ($manifest['colors'] ?? [] as $hex => $entry) {
    $paletteSlug = $brandMap[$entry['brand'] ?? ''] ?? null;
    $name = (string) ($entry['name'] ?? '');
    $colorSlug = $paletteSlug !== null && $name !== ''
        ? ($colorIdByName["{$paletteSlug}|" . mb_strtolower($name, 'UTF-8')] ?? null)
        : null;

    if ($colorSlug === null) {
        // Fallback po hexie. Dla 13 lakierów Porsche ten sam hex mają dwie
        // nazwy - bierzemy pierwszy i zapisujemy to w raporcie, bo na tym
        // poziomie danych nie ma czym rozstrzygnąć, o który lakier chodziło.
        $candidates = $colorByHex[strtoupper((string) $hex)] ?? [];
        if ($candidates === []) {
            $imported['unmatched'][] = "{$hex} (" . ($entry['brand'] ?? '?') . ' ' . ($name !== '' ? $name : 'bez nazwy') . ')';
            continue;
        }
        if (count($candidates) > 1) {
            $imported['ambiguous'][] = $hex . ' -> ' . implode(', ', array_map(static fn (array $c): string => $c[1], $candidates));
        }
        [$paletteSlug, $colorSlug] = $candidates[0];
    }
    $colorId = $colorIdByKey["{$paletteSlug}|{$colorSlug}"] ?? null;

    // Jedna wizualizacja na produkt (migracja 041): bierzemy wersję ultra,
    // a zwykłą tylko wtedy, gdy ultra nie ma - zapisaną jako „ultra".
    $variants = [];
    if (isset($entry['ultra']['file'])) {
        $variants['ultra'] = ['file' => $entry['ultra']['file'], 'thumb' => $entry['ultra']['thumb'] ?? null, 'source' => $entry['ultra']['model'] ?? null];
    } elseif (isset($entry['file'])) {
        $variants['ultra'] = ['file' => $entry['file'], 'thumb' => $entry['thumb'] ?? null, 'source' => $entry['model'] ?? null];
    }

    foreach ($variants as $variant => $files) {
        $extension = pathinfo((string) $files['file'], PATHINFO_EXTENSION) ?: 'jpg';
        $publicName = $colorSlug . ($variant === 'ultra' ? '-ultra' : '') . '.' . $extension;
        $thumbName = $files['thumb'] !== null ? $colorSlug . ($variant === 'ultra' ? '-ultra' : '') . '-t.' . $extension : null;

        if (!copyPaintFile("{$source}/renders/{$files['file']}", "{$renderDirectory}/{$publicName}", $apply)) {
            continue;
        }
        $thumbPath = null;
        if ($thumbName !== null && copyPaintFile("{$source}/renders/{$files['thumb']}", "{$renderDirectory}/{$thumbName}", $apply)) {
            $thumbPath = "/media/paints/renders/{$modelSlug}/{$thumbName}";
        }

        if ($apply && $colorId !== null) {
            $findRender->execute(['color' => $colorId, 'model' => $modelId, 'variant' => $variant]);
            $existingId = $findRender->fetchColumn();
            $parameters = [
                'image' => "/media/paints/renders/{$modelSlug}/{$publicName}",
                'thumb' => $thumbPath,
                'source' => $files['source'],
            ];
            if ($existingId === false) {
                $insertRender->execute($parameters + ['color' => $colorId, 'model' => $modelId, 'variant' => $variant]);
            } else {
                $updateRender->execute($parameters + ['id' => (int) $existingId]);
            }
        }
        $imported[$variant === 'ultra' ? 'ultra' : 'renders']++;
    }

    // Zdjęcie referencyjne trafia POZA katalog publiczny: to cudze materiały
    // z galerii Rennbow, wykorzystywane jako referencja w panelu i wejście dla
    // generatora renderów. Publikację włącza dopiero `reference_is_public`.
    if ($withReferences && isset($entry['ref'])) {
        $extension = pathinfo((string) $entry['ref'], PATHINFO_EXTENSION) ?: 'jpg';
        $referenceName = "{$paletteSlug}/{$colorSlug}.{$extension}";
        if (copyPaintFile("{$source}/renders/{$entry['ref']}", "{$referenceDirectory}/{$referenceName}", $apply)) {
            if ($apply && $colorId !== null) {
                $updateReference->execute([
                    'path' => "/paint-reference/{$referenceName}",
                    'url' => $entry['ref_url'] ?? null,
                    'id' => $colorId,
                ]);
            }
            $imported['references']++;
        }
    }
}

$mode = $apply ? 'Zaimportowano' : 'Podgląd (bez zapisu)';
echo "{$mode}:\n";
echo "  kolory:               {$imported['colors']}\n";
echo "  wizualizacje:         {$imported['renders']}\n";
echo "  rendery ultra:        {$imported['ultra']}\n";
echo "  zdjęcia referencyjne: {$imported['references']}\n";
if ($imported['ambiguous'] !== []) {
    echo '  ten sam hex w kilku lakierach (' . count($imported['ambiguous']) . ", przypisano do pierwszego):\n";
    foreach ($imported['ambiguous'] as $entry) {
        echo "    - {$entry}\n";
    }
}
if ($imported['unmatched'] !== []) {
    echo '  bez dopasowania (' . count($imported['unmatched']) . "):\n";
    foreach (array_slice($imported['unmatched'], 0, 20) as $entry) {
        echo "    - {$entry}\n";
    }
}
if (!$apply) {
    echo "\nNic nie zapisano. Uruchom ponownie z --apply.\n";
}
