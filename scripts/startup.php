<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "Ten skrypt można uruchamiać wyłącznie z CLI.\n");
    exit(1);
}

$migrationScript = __DIR__ . '/migrate.php';
$command = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($migrationScript) . ' --apply';

passthru($command, $exitCode);
exit($exitCode);
