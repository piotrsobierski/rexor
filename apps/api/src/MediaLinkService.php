<?php

declare(strict_types=1);

/**
 * Wspólna obsługa tabel łączących media z bytami katalogu (frames, projects).
 *
 * Modele mają własne, starsze funkcje w AdminService.php (deleteModelMedia,
 * reorderModelMedia). Tutaj zbieramy ten sam mechanizm w postaci
 * sparametryzowanej, żeby ramy i realizacje nie kopiowały go po raz drugi
 * i trzeci.
 *
 * Nazwa tabeli i kolumny NIGDY nie pochodzą z żądania - funkcje przyjmują
 * klucz zasobu i tłumaczą go przez whitelistę mediaLinkDefinition(). Do
 * zapytania trafia wyłącznie stała z tego pliku.
 */

/**
 * Kanoniczna lista tabel łączących media. Używana przy sprzątaniu sierot:
 * wiersz z `media` kasujemy dopiero, gdy nie wisi na nim już żaden byt.
 * Pominięcie tabeli na tej liście kasowałoby zdjęcie nadal używane gdzie
 * indziej, więc każda nowa tabela *_media musi tu trafić.
 */
function mediaLinkTables(): array
{
    return ['category_media', 'model_media', 'part_media', 'frame_media', 'project_media'];
}

/**
 * @return array{table: string, column: string, roles: string[], label: string}
 */
function mediaLinkDefinition(string $resource): array
{
    $definitions = [
        'frames' => [
            'table' => 'frame_media',
            'column' => 'frame_id',
            'roles' => ['default', 'gallery', 'description', 'geometry'],
            'label' => 'ramy',
        ],
        'projects' => [
            'table' => 'project_media',
            'column' => 'project_id',
            'roles' => ['cover', 'gallery', 'description'],
            'label' => 'realizacji',
        ],
    ];
    if (!isset($definitions[$resource])) {
        throw new InvalidArgumentException('Nieznany typ danych.');
    }

    return $definitions[$resource];
}

/**
 * Przypisanie wgranego wcześniej zdjęcia do ramy lub realizacji wraz z rolą
 * (m.in. 'geometry' dla tabeli geometrii ramy i 'cover' dla realizacji).
 * Wgrywanie pliku jest osobnym wywołaniem - POST /admin/media.
 */
function attachEntityMedia(PDO $pdo, string $resource, int $ownerId, int $mediaId, string $role): array
{
    $definition = mediaLinkDefinition($resource);
    if (!in_array($role, $definition['roles'], true)) {
        throw new InvalidArgumentException('Nieznana rola zdjęcia.');
    }

    $media = $pdo->prepare('SELECT id FROM media WHERE id = :id');
    $media->execute(['id' => $mediaId]);
    if (!$media->fetch()) {
        throw new InvalidArgumentException('Nie znaleziono wskazanego zdjęcia.');
    }

    $nextSort = $pdo->prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 FROM {$definition['table']} WHERE {$definition['column']} = :owner");
    $nextSort->execute(['owner' => $ownerId]);

    // Ponowne przypisanie tego samego zdjęcia zmienia tylko rolę - pozycja
    // w galerii zostaje tam, gdzie ustawił ją administrator.
    $pdo->prepare(
        "INSERT INTO {$definition['table']} ({$definition['column']}, media_id, role, sort_order) " .
        'VALUES (:owner, :media, :role, :sort) ON DUPLICATE KEY UPDATE role = VALUES(role)'
    )->execute([
        'owner' => $ownerId,
        'media' => $mediaId,
        'role' => $role,
        'sort' => (int) $nextSort->fetchColumn(),
    ]);

    logActivity(
        $pdo,
        'media_attached',
        'admin',
        currentAdmin()['email'] ?? null,
        "Przypisano zdjęcie #{$mediaId} do {$definition['label']} #{$ownerId} (rola: {$role}).",
        ['resource' => $resource, 'id' => $ownerId, 'mediaId' => $mediaId, 'role' => $role]
    );

    return ['id' => $ownerId, 'mediaId' => $mediaId, 'role' => $role];
}

/**
 * Odpięcie zdjęcia. Plik z dysku znika dopiero wtedy, gdy media przestaje
 * być używane przez jakikolwiek byt - tak samo jak w deleteModelMedia().
 */
function deleteEntityMedia(PDO $pdo, string $resource, int $ownerId, int $mediaId): array
{
    $definition = mediaLinkDefinition($resource);

    $pdo->beginTransaction();
    try {
        $statement = $pdo->prepare("DELETE FROM {$definition['table']} WHERE {$definition['column']} = :owner AND media_id = :media");
        $statement->execute(['owner' => $ownerId, 'media' => $mediaId]);
        if ($statement->rowCount() === 0) {
            throw new InvalidArgumentException('To zdjęcie nie jest już przypisane do tej pozycji.');
        }
        deleteOrphanMedia($pdo, $mediaId);
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }

    logActivity(
        $pdo,
        'media_deleted',
        'admin',
        currentAdmin()['email'] ?? null,
        "Usunięto zdjęcie #{$mediaId} z {$definition['label']} #{$ownerId}.",
        ['resource' => $resource, 'id' => $ownerId, 'mediaId' => $mediaId]
    );

    return ['id' => $ownerId, 'mediaId' => $mediaId, 'deleted' => true];
}

/**
 * Kasuje wiersz `media` i plik, jeżeli po odpięciu nie wisi już na nim żaden
 * byt. Wywoływane wewnątrz transakcji wywołującego.
 */
function deleteOrphanMedia(PDO $pdo, int $mediaId): void
{
    foreach (mediaLinkTables() as $joinTable) {
        $count = $pdo->prepare("SELECT COUNT(*) FROM {$joinTable} WHERE media_id = :media");
        $count->execute(['media' => $mediaId]);
        if ((int) $count->fetchColumn() > 0) {
            return;
        }
    }

    $media = $pdo->prepare('SELECT storage_path FROM media WHERE id = :id');
    $media->execute(['id' => $mediaId]);
    $storagePath = $media->fetchColumn();
    $pdo->prepare('DELETE FROM media WHERE id = :id')->execute(['id' => $mediaId]);

    // Tylko pliki wgrane przez panel (pod /uploads) mają fizyczną kopię
    // w storage/media - zdjęcia z preseedu (/media/...) są współdzielonym
    // zasobem statycznym i nie są tu kasowane.
    if (is_string($storagePath) && str_starts_with($storagePath, '/uploads/')) {
        $file = projectRoot() . '/storage/media/' . substr($storagePath, strlen('/uploads/'));
        if (is_file($file)) {
            unlink($file);
        }
    }
}

/**
 * Nowa kolejność galerii. Lista musi pokrywać się co do składu z tym, co
 * faktycznie wisi na bycie - inaczej odrzucamy całość zamiast po cichu
 * przestawiać część zdjęć.
 */
function reorderEntityMedia(PDO $pdo, string $resource, int $ownerId, array $mediaIds): array
{
    $definition = mediaLinkDefinition($resource);
    $mediaIds = array_values(array_map('intval', $mediaIds));
    if ($mediaIds === []) {
        throw new InvalidArgumentException('Brak listy zdjęć do uporządkowania.');
    }

    $placeholders = implode(',', array_fill(0, count($mediaIds), '?'));
    $statement = $pdo->prepare("SELECT media_id FROM {$definition['table']} WHERE {$definition['column']} = ? AND media_id IN ({$placeholders})");
    $statement->execute(array_merge([$ownerId], $mediaIds));
    $linked = array_map('intval', $statement->fetchAll(PDO::FETCH_COLUMN));
    if (count($linked) !== count($mediaIds) || array_diff($mediaIds, $linked) !== []) {
        throw new InvalidArgumentException('Lista zdjęć nie zgadza się z galerią tej pozycji.');
    }

    $update = $pdo->prepare("UPDATE {$definition['table']} SET sort_order = :sort WHERE {$definition['column']} = :owner AND media_id = :media");
    $pdo->beginTransaction();
    try {
        foreach ($mediaIds as $index => $mediaId) {
            $update->execute(['sort' => $index, 'owner' => $ownerId, 'media' => $mediaId]);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }

    return ['id' => $ownerId, 'mediaIds' => $mediaIds];
}

/**
 * Wiersze galerii jednego bytu w kształcie wymaganym przez `ApiFrame.media`
 * i `ApiProject.media`: storage_path, role, alt_text.
 */
function entityMediaRows(PDO $pdo, string $resource, int $ownerId): array
{
    $definition = mediaLinkDefinition($resource);
    $statement = $pdo->prepare(
        "SELECT me.storage_path, em.role, me.alt_text FROM {$definition['table']} em " .
        "JOIN media me ON me.id = em.media_id WHERE em.{$definition['column']} = :owner " .
        'ORDER BY em.sort_order, em.media_id'
    );
    $statement->execute(['owner' => $ownerId]);

    return $statement->fetchAll();
}
