<?php

declare(strict_types=1);

/**
 * Ramy sprzedawane osobno, poza konfiguratorem.
 *
 * Kształt odpowiedzi jest kontraktem z frontem - `ApiFrame`
 * w apps/web/lib/frames.ts. Nazwy pól są 1:1 z kolumnami tabeli `frames`,
 * więc zmiana którejkolwiek z nich wymaga zmiany po obu stronach.
 */

/** Kolumny wspólne dla listy i szczegółu - dokładnie pola `ApiFrame`. */
function frameSelectColumns(): string
{
    return 'f.id, f.slug, bc.slug AS category_slug, f.name, f.manufacturer, f.short_description, ' .
        'f.description_html, f.geometry_html, f.specifications, f.price_gross, f.paint_available, ' .
        'f.is_recommended, f.source_url, f.default_image_path';
}

/**
 * PDO oddaje DECIMAL jako tekst, a BOOLEAN jako 0/1. Front dostaje liczbę
 * albo null ("wymaga wyceny") i prawdziwe wartości logiczne.
 */
function hydrateFrameRow(PDO $pdo, array $row): array
{
    $frameId = (int) $row['id'];
    unset($row['id']);
    $row['specifications'] = $row['specifications'] !== null
        ? json_decode((string) $row['specifications'], true, 64, JSON_THROW_ON_ERROR)
        : null;
    $row['price_gross'] = $row['price_gross'] !== null ? (float) $row['price_gross'] : null;
    $row['paint_available'] = (bool) $row['paint_available'];
    $row['is_recommended'] = (bool) $row['is_recommended'];
    $row['media'] = entityMediaRows($pdo, 'frames', $frameId);
    $row['sizes'] = frameSizes($pdo, $frameId);

    return $row;
}

/** Aktywne rozmiary ramy, w kolejności prezentacji. */
function frameSizes(PDO $pdo, int $frameId): array
{
    $statement = $pdo->prepare(
        'SELECT code, label FROM frame_sizes WHERE frame_id = :frame AND is_active = TRUE ORDER BY sort_order, id'
    );
    $statement->execute(['frame' => $frameId]);

    return array_map(static fn (array $size): array => [
        'code' => $size['code'],
        'label' => $size['label'],
    ], $statement->fetchAll());
}

/** Publiczna lista: tylko opublikowane, kolejność jak w panelu, potem alfabetycznie. */
function publicFrames(PDO $pdo): array
{
    $rows = $pdo->query(
        'SELECT ' . frameSelectColumns() . ' FROM frames f ' .
        'JOIN bike_categories bc ON bc.id = f.category_id ' .
        "WHERE f.status = 'published' ORDER BY f.sort_order, f.name"
    )->fetchAll();

    return ['frames' => array_map(static fn (array $row): array => hydrateFrameRow($pdo, $row), $rows)];
}

/** Szczegół po slugu; null znaczy 404 dla wywołującego. */
function publicFrame(PDO $pdo, string $slug): ?array
{
    $statement = $pdo->prepare(
        'SELECT ' . frameSelectColumns() . ' FROM frames f ' .
        'JOIN bike_categories bc ON bc.id = f.category_id ' .
        "WHERE f.slug = :slug AND f.status = 'published' LIMIT 1"
    );
    $statement->execute(['slug' => $slug]);
    $row = $statement->fetch();

    return $row ? ['frame' => hydrateFrameRow($pdo, $row)] : null;
}

/**
 * Nowa rama powstaje jako szkic z nazwą i kategorią - resztę (opis, cenę,
 * geometrię, zdjęcia) administrator uzupełnia przez PATCH, tak samo jak
 * przy modelach (createAdminModel).
 */
function createAdminFrame(PDO $pdo, array $input): array
{
    $name = trim((string) ($input['name'] ?? ''));
    $categoryId = (int) ($input['category_id'] ?? 0);
    if ($name === '' || $categoryId <= 0) {
        throw new InvalidArgumentException('Podaj nazwę i kategorię ramy.');
    }

    $category = $pdo->prepare('SELECT id FROM bike_categories WHERE id = :id');
    $category->execute(['id' => $categoryId]);
    if (!$category->fetch()) {
        throw new InvalidArgumentException('Nieznana kategoria.');
    }

    $slug = uniqueSlug($pdo, 'frames', slugify($name, 'rama'));
    $nextSort = (int) $pdo->query('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM frames')->fetchColumn();

    $pdo->prepare(
        'INSERT INTO frames (category_id, slug, name, manufacturer, short_description, status, sort_order) ' .
        'VALUES (:category_id, :slug, :name, :manufacturer, :short_description, :status, :sort_order)'
    )->execute([
        'category_id' => $categoryId,
        'slug' => $slug,
        'name' => $name,
        'manufacturer' => ($manufacturer = trim((string) ($input['manufacturer'] ?? ''))) !== '' ? $manufacturer : null,
        'short_description' => ($short = trim((string) ($input['short_description'] ?? ''))) !== '' ? $short : null,
        'status' => in_array($input['status'] ?? 'draft', ['draft', 'published', 'archived'], true) ? ($input['status'] ?? 'draft') : 'draft',
        'sort_order' => $nextSort,
    ]);

    $newId = (int) $pdo->lastInsertId();
    logActivity($pdo, 'frame_created', 'admin', currentAdmin()['email'] ?? null, "Utworzono ramę \"{$name}\" (#{$newId}).", ['id' => $newId, 'slug' => $slug, 'name' => $name]);

    return ['id' => $newId, 'slug' => $slug];
}

/**
 * Usunięcie ramy. Wiersze frame_media znikają kaskadowo, ale same pliki
 * sprzątamy jawnie - kaskada w bazie nie wie nic o storage/media.
 */
function deleteAdminFrame(PDO $pdo, int $id): array
{
    $frame = $pdo->prepare('SELECT name FROM frames WHERE id = :id');
    $frame->execute(['id' => $id]);
    $name = $frame->fetchColumn();
    if ($name === false) {
        throw new InvalidArgumentException('Nie znaleziono ramy.');
    }

    $pdo->beginTransaction();
    try {
        $media = $pdo->prepare('SELECT media_id FROM frame_media WHERE frame_id = :id');
        $media->execute(['id' => $id]);
        $mediaIds = array_map('intval', $media->fetchAll(PDO::FETCH_COLUMN));

        $pdo->prepare('DELETE FROM frames WHERE id = :id')->execute(['id' => $id]);
        foreach ($mediaIds as $mediaId) {
            deleteOrphanMedia($pdo, $mediaId);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }

    logActivity($pdo, 'frame_deleted', 'admin', currentAdmin()['email'] ?? null, "Usunięto ramę \"{$name}\" (#{$id}).", ['id' => $id, 'name' => $name]);

    return ['id' => $id, 'deleted' => true];
}

/** Płaskie wiersze dla panelu - odpowiednik `models` w adminCatalog(). */
function adminFrames(PDO $pdo): array
{
    $rows = $pdo->query(
        'SELECT f.id, f.category_id, f.slug, f.name, f.manufacturer, f.short_description, f.description_html, ' .
        'f.geometry_html, f.specifications, f.price_gross, f.currency, f.paint_available, f.is_recommended, ' .
        'f.source_url, f.default_image_path, f.status, f.sort_order, COUNT(fm.media_id) AS media_count ' .
        'FROM frames f LEFT JOIN frame_media fm ON fm.frame_id = f.id GROUP BY f.id ORDER BY f.sort_order, f.name'
    )->fetchAll();

    // Panel dostaje te same typy co front: JSON już rozpakowany, cena jako
    // liczba albo null, flagi jako wartości logiczne.
    foreach ($rows as &$row) {
        $row['specifications'] = $row['specifications'] !== null
            ? json_decode((string) $row['specifications'], true, 64, JSON_THROW_ON_ERROR)
            : null;
        $row['price_gross'] = $row['price_gross'] !== null ? (float) $row['price_gross'] : null;
        $row['paint_available'] = (bool) $row['paint_available'];
        $row['is_recommended'] = (bool) $row['is_recommended'];
    }
    unset($row);

    return $rows;
}

function adminFrameMedia(PDO $pdo): array
{
    return $pdo->query(
        'SELECT fm.frame_id, fm.media_id, fm.role, fm.sort_order, me.storage_path, me.alt_text ' .
        'FROM frame_media fm JOIN media me ON me.id = fm.media_id ORDER BY fm.frame_id, fm.sort_order, fm.media_id'
    )->fetchAll();
}

/** Płaskie wiersze dla panelu - odpowiednik `modelSizes` w adminCatalog(). */
function adminFrameSizes(PDO $pdo): array
{
    return $pdo->query(
        'SELECT id, frame_id, code, label, sort_order, is_active FROM frame_sizes ORDER BY frame_id, sort_order, id'
    )->fetchAll();
}

function createAdminFrameSize(PDO $pdo, array $input): array
{
    $frameId = (int) ($input['frame_id'] ?? 0);
    $code = trim((string) ($input['code'] ?? ''));
    $label = trim((string) ($input['label'] ?? ''));

    if ($frameId <= 0) {
        throw new InvalidArgumentException('Wskaż ramę.');
    }
    if ($code === '' || mb_strlen($code) > 40) {
        throw new InvalidArgumentException('Podaj oznaczenie rozmiaru (np. M), maksymalnie 40 znaków.');
    }
    if ($label === '' || mb_strlen($label) > 120) {
        throw new InvalidArgumentException('Podaj nazwę rozmiaru widoczną dla klienta, maksymalnie 120 znaków.');
    }

    $frame = $pdo->prepare('SELECT name FROM frames WHERE id = :id');
    $frame->execute(['id' => $frameId]);
    $frameName = $frame->fetchColumn();
    if ($frameName === false) {
        throw new InvalidArgumentException('Nie znaleziono ramy.');
    }

    $duplicate = $pdo->prepare('SELECT 1 FROM frame_sizes WHERE frame_id = :frame AND code = :code');
    $duplicate->execute(['frame' => $frameId, 'code' => $code]);
    if ($duplicate->fetchColumn() !== false) {
        throw new InvalidArgumentException("Rama ma już rozmiar o oznaczeniu „{$code}”.");
    }

    $statement = $pdo->prepare(
        'INSERT INTO frame_sizes (frame_id, code, label, sort_order, is_active) ' .
        'VALUES (:frame, :code, :label, :sort_order, :is_active)'
    );
    $statement->execute([
        'frame' => $frameId,
        'code' => $code,
        'label' => $label,
        'sort_order' => (int) ($input['sort_order'] ?? 0),
        'is_active' => ($input['is_active'] ?? true) ? 1 : 0,
    ]);
    $id = (int) $pdo->lastInsertId();

    logActivity(
        $pdo,
        'frame_size_created',
        'admin',
        currentAdmin()['email'] ?? null,
        "Dodano rozmiar \"{$label}\" (#{$id}) do ramy \"{$frameName}\" (#{$frameId}).",
        ['id' => $id, 'frameId' => $frameId, 'code' => $code]
    );

    $row = $pdo->prepare('SELECT id, frame_id, code, label, sort_order, is_active FROM frame_sizes WHERE id = :id');
    $row->execute(['id' => $id]);

    return ['size' => $row->fetch()];
}

/**
 * Usuwanie rozmiaru ramy. Ostatniego aktywnego rozmiaru nie usuwamy: rama
 * opublikowana bez rozmiaru wraca do tego samego problemu, któremu zapobiega
 * blokada publikacji w updateAdminRecord().
 */
function deleteAdminFrameSize(PDO $pdo, int $id): array
{
    $size = $pdo->prepare('SELECT frame_id, code, label FROM frame_sizes WHERE id = :id');
    $size->execute(['id' => $id]);
    $row = $size->fetch();
    if (!$row) {
        throw new InvalidArgumentException('Nie znaleziono rozmiaru.');
    }

    $siblings = $pdo->prepare('SELECT COUNT(*) FROM frame_sizes WHERE frame_id = :frame');
    $siblings->execute(['frame' => $row['frame_id']]);
    if ((int) $siblings->fetchColumn() <= 1) {
        throw new InvalidArgumentException('To jedyny rozmiar tej ramy. Dodaj inny, zanim usuniesz ten - opublikowana rama musi mieć co najmniej jeden rozmiar.');
    }

    $pdo->prepare('DELETE FROM frame_sizes WHERE id = :id')->execute(['id' => $id]);

    logActivity(
        $pdo,
        'frame_size_deleted',
        'admin',
        currentAdmin()['email'] ?? null,
        "Usunięto rozmiar \"{$row['label']}\" ({$row['code']}) z ramy #{$row['frame_id']}.",
        ['id' => $id, 'frameId' => $row['frame_id'], 'code' => $row['code']]
    );

    return ['id' => $id, 'deleted' => true];
}
