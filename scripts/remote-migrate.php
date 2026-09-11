<?php

declare(strict_types=1);

require __DIR__ . '/../apps/api/src/bootstrap.php';

$providedToken = (string) ($_SERVER['HTTP_X_DEPLOY_TOKEN'] ?? '');
$expectedToken = envValue('DEPLOY_MIGRATION_TOKEN');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST'
    || $expectedToken === ''
    || !hash_equals($expectedToken, $providedToken)
) {
    http_response_code(404);
    exit;
}

putenv('MIGRATION_ALLOW_PRODUCTION=1');
require __DIR__ . '/migrate.php';

header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store');

runMigrations(['migrate.php', '--apply', '--bootstrap-seed'], true);
