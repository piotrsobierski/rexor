<?php

declare(strict_types=1);

/**
 * Minimalny runner migracji dla MySQL 8.0.
 *
 * Podgląd (domyślny): php scripts/migrate.php
 * Wykonanie:           php scripts/migrate.php --apply
 */

function fail(string $message): never
{
    fwrite(STDERR, "BŁĄD: {$message}\n");
    exit(1);
}

function loadEnvFile(string $path): void
{
    if (!is_file($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        fail("Nie można odczytać {$path}");
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        [$key, $value] = array_pad(explode('=', $line, 2), 2, '');
        $key = trim($key);
        $value = trim($value);

        if ($key === '' || getenv($key) !== false) {
            continue;
        }

        if (strlen($value) >= 2) {
            $first = $value[0];
            $last = $value[strlen($value) - 1];
            if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                $value = substr($value, 1, -1);
            }
        }

        putenv("{$key}={$value}");
    }
}

function migrationFiles(string $root): array
{
    $files = [$root . '/database/schema.sql'];
    $additional = glob($root . '/database/migrations/*.sql') ?: [];
    sort($additional, SORT_STRING);

    return array_merge($files, $additional);
}

function migrationVersion(string $path): string
{
    return basename($path) === 'schema.sql'
        ? '000_base_schema'
        : pathinfo($path, PATHINFO_FILENAME);
}

function main(array $argv): int
{
    if (PHP_SAPI !== 'cli') {
        fail('Migracje można uruchamiać wyłącznie z CLI.');
    }

    $root = dirname(__DIR__);
    loadEnvFile($root . '/.env');

    $apply = in_array('--apply', $argv, true);
    $unknown = array_values(array_filter(
        array_slice($argv, 1),
        static fn (string $arg): bool => $arg !== '--apply'
    ));
    if ($unknown !== []) {
        fail('Nieznane argumenty: ' . implode(', ', $unknown));
    }

    $environment = getenv('APP_ENV') ?: 'local';
    if ($apply && $environment === 'production' && getenv('MIGRATION_ALLOW_PRODUCTION') !== '1') {
        fail('Produkcja wymaga MIGRATION_ALLOW_PRODUCTION=1 oraz potwierdzonego backupu.');
    }

    $dsn = getenv('DB_DSN') ?: '';
    $user = getenv('DB_USER') ?: '';
    $password = getenv('DB_PASSWORD') ?: '';
    if ($dsn === '' || $user === '') {
        fail('Ustaw DB_DSN i DB_USER w .env lub zmiennych środowiskowych.');
    }

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    if (class_exists('Pdo\\Mysql') && defined('Pdo\\Mysql::ATTR_MULTI_STATEMENTS')) {
        $options[constant('Pdo\\Mysql::ATTR_MULTI_STATEMENTS')] = true;
    } elseif (defined('PDO::MYSQL_ATTR_MULTI_STATEMENTS')) {
        $options[constant('PDO::MYSQL_ATTR_MULTI_STATEMENTS')] = true;
    }

    try {
        $pdo = new PDO($dsn, $user, $password, $options);
    } catch (Throwable $error) {
        fail('Połączenie z bazą nie powiodło się: ' . $error->getMessage());
    }

    $lockName = 'rexor_configurator_migrations';
    $lock = $pdo->prepare('SELECT GET_LOCK(:name, 30)');
    $lock->execute(['name' => $lockName]);
    if ((int) $lock->fetchColumn() !== 1) {
        fail('Nie udało się uzyskać blokady migracji.');
    }

    try {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS schema_migrations (' .
            'version VARCHAR(190) PRIMARY KEY,' .
            'checksum CHAR(64) NOT NULL,' .
            'applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP' .
            ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );

        $applied = [];
        foreach ($pdo->query('SELECT version, checksum FROM schema_migrations')->fetchAll() as $row) {
            $applied[$row['version']] = $row['checksum'];
        }

        $pending = [];
        foreach (migrationFiles($root) as $path) {
            if (!is_file($path)) {
                fail("Brak pliku migracji: {$path}");
            }

            $version = migrationVersion($path);
            $checksum = hash_file('sha256', $path);
            if ($checksum === false) {
                fail("Nie można policzyć sumy kontrolnej: {$path}");
            }

            if (isset($applied[$version])) {
                if (!hash_equals($applied[$version], $checksum)) {
                    fail("Wykonana migracja {$version} została zmieniona. Dodaj nową migrację zamiast edytować starą.");
                }
                continue;
            }

            $pending[] = ['version' => $version, 'checksum' => $checksum, 'path' => $path];
        }

        if ($pending === []) {
            fwrite(STDOUT, "Baza jest aktualna.\n");
            return 0;
        }

        fwrite(STDOUT, ($apply ? 'Migracje do wykonania:' : 'Podgląd migracji:') . "\n");
        foreach ($pending as $migration) {
            fwrite(STDOUT, " - {$migration['version']}\n");
        }

        if (!$apply) {
            fwrite(STDOUT, "Nie zmieniono bazy. Użyj --apply po sprawdzeniu backupu i listy migracji.\n");
            return 0;
        }

        $record = $pdo->prepare(
            'INSERT INTO schema_migrations (version, checksum) VALUES (:version, :checksum)'
        );
        foreach ($pending as $migration) {
            $sql = file_get_contents($migration['path']);
            if ($sql === false || trim($sql) === '') {
                fail("Pusta lub nieczytelna migracja: {$migration['path']}");
            }

            fwrite(STDOUT, "Wykonuję {$migration['version']}...\n");
            $pdo->exec($sql);
            $record->execute([
                'version' => $migration['version'],
                'checksum' => $migration['checksum'],
            ]);
        }

        fwrite(STDOUT, "Migracje zakończone poprawnie.\n");
        return 0;
    } finally {
        $release = $pdo->prepare('SELECT RELEASE_LOCK(:name)');
        $release->execute(['name' => $lockName]);
    }
}

exit(main($argv));
