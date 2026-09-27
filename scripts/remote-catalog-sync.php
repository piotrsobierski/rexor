<?php

declare(strict_types=1);

/**
 * Wykonuje storage/tmp/catalog-sync.sql (wgrany wcześniej przez FTP przez
 * scripts/sync-catalog-prod-to-qa.sh) i kasuje plik po wykonaniu.
 *
 * Zamierzone tylko dla QA: APP_ENV=production na obu środowiskach (QA ma to
 * ustawione celowo, żeby zachowywać się jak prod poza danymi), więc jedyną
 * ochroną - tak jak w remote-migrate.php/remote-backup.php - jest token.
 * DEPLOY_CATALOG_SYNC_TOKEN jest osobny od DEPLOY_MIGRATION_TOKEN/
 * DEPLOY_BACKUP_TOKEN i ustawiony tylko w .env.remote (QA), nigdy w
 * .env.production - jeśli ten plik trafi kiedyś na prod przez pomyłkę,
 * pusty token i tak zwróci 404.
 *
 * .htaccess blokuje /storage/ dla HTTP, ale ten plik czyta ze
 * storage/tmp/ po stronie serwera (nie serwuje go przez WWW), więc to nie
 * jest ochrona przed tym endpointem - ochroną jest sam token.
 */

require __DIR__ . '/../apps/api/src/bootstrap.php';

$providedToken = (string) ($_SERVER['HTTP_X_DEPLOY_TOKEN'] ?? '');
$expectedToken = envValue('DEPLOY_CATALOG_SYNC_TOKEN');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST'
    || $expectedToken === ''
    || !hash_equals($expectedToken, $providedToken)
) {
    http_response_code(404);
    exit;
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$sqlPath = projectRoot() . '/storage/tmp/catalog-sync.sql';

try {
    if (!is_file($sqlPath)) {
        throw new RuntimeException('Brak storage/tmp/catalog-sync.sql - wgraj plik przez FTP przed wywołaniem.');
    }

    $sql = file_get_contents($sqlPath);
    if ($sql === false || trim($sql) === '') {
        throw new RuntimeException('Plik catalog-sync.sql jest pusty lub nieczytelny.');
    }

    $pdo = database();
    $pdo->exec($sql);

    unlink($sqlPath);

    echo json_encode(['ok' => true], JSON_THROW_ON_ERROR);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(['error' => $error->getMessage()], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
}
