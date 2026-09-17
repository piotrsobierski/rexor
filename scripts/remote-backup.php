<?php

declare(strict_types=1);

/**
 * Wyzwala świeży zrzut bazy (scripts/db-dump.php) na serwerze i zapisuje go
 * pod storage/backups/<znacznik-czasu>/database.sql.gz - tak samo jak
 * scripts/backup.sh, ale bez zależności od `mysqldump`/`shell_exec`
 * (patrz komentarz w db-dump.php).
 *
 * Inaczej niż scripts/remote-migrate.php (kasowany przez deploy zaraz po
 * użyciu), ten endpoint zostaje wdrożony na stałe - backup ma być
 * wyzwalany kiedy trzeba, nie tylko zaraz po wdrożeniu. Chroni go
 * DEPLOY_BACKUP_TOKEN (osobny od DEPLOY_MIGRATION_TOKEN, żeby dostęp do
 * kopii danych i dostęp do zmiany schematu nie dzieliły jednego sekretu),
 * a .htaccess i tak blokuje całe /storage/backups/ przed pobraniem przez
 * WWW - ten endpoint tylko tworzy plik, nie serwuje go.
 */

require __DIR__ . '/../apps/api/src/bootstrap.php';

$providedToken = (string) ($_SERVER['HTTP_X_DEPLOY_TOKEN'] ?? '');
$expectedToken = envValue('DEPLOY_BACKUP_TOKEN');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST'
    || $expectedToken === ''
    || !hash_equals($expectedToken, $providedToken)
) {
    http_response_code(404);
    exit;
}

require __DIR__ . '/db-dump.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

try {
    $timestamp = gmdate('Ymd\THis\Z');
    $outputPath = projectRoot() . "/storage/backups/{$timestamp}/database.sql.gz";
    $result = dumpDatabase(database(), $outputPath);
    // Ścieżka względem katalogu instalacji - lokalny skrypt pobierający
    // (scripts/download-db-backup.sh) łączy to z DEPLOY_REMOTE_DIR przez FTP.
    $result['relativePath'] = "storage/backups/{$timestamp}/database.sql.gz";
    echo json_encode($result, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(['error' => $error->getMessage()], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
}
