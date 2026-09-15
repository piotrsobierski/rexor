<?php

declare(strict_types=1);

/**
 * Realizacje: rowery i pojazdy elektryczne faktycznie zbudowane przez Rexor.
 *
 * Kształt odpowiedzi jest kontraktem z frontem - `ApiProject`
 * w apps/web/lib/projects.ts. Bliżej tu do `site_pages` niż do `bike_models`:
 * redagowana strona ze zdjęciami i spisem komponentów, bez cennika.
 */

function projectSelectColumns(): string
{
    return 'p.id, p.slug, p.title, p.short_description, p.content_html, p.specification, ' .
        'bc.slug AS category_slug, p.completed_at, p.cover_image_path';
}

function hydrateProjectRow(PDO $pdo, array $row): array
{
    $projectId = (int) $row['id'];
    unset($row['id']);
    $row['specification'] = $row['specification'] !== null
        ? json_decode((string) $row['specification'], true, 64, JSON_THROW_ON_ERROR)
        : null;
    $row['media'] = entityMediaRows($pdo, 'projects', $projectId);

    return $row;
}

/**
 * Kategoria realizacji jest opcjonalna, więc LEFT JOIN - realizacja bez
 * kategorii ma zniknąć z filtra, a nie z listy.
 */
function publicProjects(PDO $pdo): array
{
    $rows = $pdo->query(
        'SELECT ' . projectSelectColumns() . ' FROM projects p ' .
        'LEFT JOIN bike_categories bc ON bc.id = p.category_id ' .
        'WHERE p.is_published = TRUE ORDER BY p.sort_order, p.title'
    )->fetchAll();

    return ['projects' => array_map(static fn (array $row): array => hydrateProjectRow($pdo, $row), $rows)];
}

function publicProject(PDO $pdo, string $slug): ?array
{
    $statement = $pdo->prepare(
        'SELECT ' . projectSelectColumns() . ' FROM projects p ' .
        'LEFT JOIN bike_categories bc ON bc.id = p.category_id ' .
        'WHERE p.slug = :slug AND p.is_published = TRUE LIMIT 1'
    );
    $statement->execute(['slug' => $slug]);
    $row = $statement->fetch();

    return $row ? ['project' => hydrateProjectRow($pdo, $row)] : null;
}

/** Nowa realizacja powstaje jako nieopublikowany szkic z samym tytułem. */
function createAdminProject(PDO $pdo, array $input): array
{
    $title = trim((string) ($input['title'] ?? ''));
    if ($title === '') {
        throw new InvalidArgumentException('Podaj tytuł realizacji.');
    }

    $categoryId = (int) ($input['category_id'] ?? 0);
    if ($categoryId > 0) {
        $category = $pdo->prepare('SELECT id FROM bike_categories WHERE id = :id');
        $category->execute(['id' => $categoryId]);
        if (!$category->fetch()) {
            throw new InvalidArgumentException('Nieznana kategoria.');
        }
    }

    $slug = uniqueSlug($pdo, 'projects', slugify($title, 'realizacja'));
    $nextSort = (int) $pdo->query('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM projects')->fetchColumn();

    $pdo->prepare(
        'INSERT INTO projects (slug, title, short_description, category_id, sort_order) ' .
        'VALUES (:slug, :title, :short_description, :category_id, :sort_order)'
    )->execute([
        'slug' => $slug,
        'title' => $title,
        'short_description' => ($short = trim((string) ($input['short_description'] ?? ''))) !== '' ? $short : null,
        'category_id' => $categoryId > 0 ? $categoryId : null,
        'sort_order' => $nextSort,
    ]);

    $newId = (int) $pdo->lastInsertId();
    logActivity($pdo, 'project_created', 'admin', currentAdmin()['email'] ?? null, "Utworzono realizację \"{$title}\" (#{$newId}).", ['id' => $newId, 'slug' => $slug, 'title' => $title]);

    return ['id' => $newId, 'slug' => $slug];
}

function deleteAdminProject(PDO $pdo, int $id): array
{
    $project = $pdo->prepare('SELECT title FROM projects WHERE id = :id');
    $project->execute(['id' => $id]);
    $title = $project->fetchColumn();
    if ($title === false) {
        throw new InvalidArgumentException('Nie znaleziono realizacji.');
    }

    $pdo->beginTransaction();
    try {
        $media = $pdo->prepare('SELECT media_id FROM project_media WHERE project_id = :id');
        $media->execute(['id' => $id]);
        $mediaIds = array_map('intval', $media->fetchAll(PDO::FETCH_COLUMN));

        $pdo->prepare('DELETE FROM projects WHERE id = :id')->execute(['id' => $id]);
        foreach ($mediaIds as $mediaId) {
            deleteOrphanMedia($pdo, $mediaId);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }

    logActivity($pdo, 'project_deleted', 'admin', currentAdmin()['email'] ?? null, "Usunięto realizację \"{$title}\" (#{$id}).", ['id' => $id, 'title' => $title]);

    return ['id' => $id, 'deleted' => true];
}

function adminProjects(PDO $pdo): array
{
    $rows = $pdo->query(
        'SELECT p.id, p.slug, p.title, p.short_description, p.content_html, p.specification, p.category_id, ' .
        'p.completed_at, p.cover_image_path, p.is_published, p.sort_order, COUNT(pm.media_id) AS media_count ' .
        'FROM projects p LEFT JOIN project_media pm ON pm.project_id = p.id GROUP BY p.id ORDER BY p.sort_order, p.title'
    )->fetchAll();

    foreach ($rows as &$row) {
        $row['specification'] = $row['specification'] !== null
            ? json_decode((string) $row['specification'], true, 64, JSON_THROW_ON_ERROR)
            : null;
        $row['is_published'] = (bool) $row['is_published'];
    }
    unset($row);

    return $rows;
}

function adminProjectMedia(PDO $pdo): array
{
    return $pdo->query(
        'SELECT pm.project_id, pm.media_id, pm.role, pm.sort_order, me.storage_path, me.alt_text ' .
        'FROM project_media pm JOIN media me ON me.id = pm.media_id ORDER BY pm.project_id, pm.sort_order, pm.media_id'
    )->fetchAll();
}
