<?php

declare(strict_types=1);

/**
 * Zrzut bazy w czystym PHP/PDO, bez `mysqldump`/`shell_exec`.
 *
 * Hosting współdzielony (rexorbikes.com, rexor.sobierski.com) zwykle ma
 * wyłączone `exec`/`shell_exec`/`proc_open`, więc zrzut przez binarkę
 * `mysqldump` wywołaną z PHP (jak w scripts/backup.sh, uruchamianym z
 * maszyny z bezpośrednim dostępem do bazy) nie zadziała zza publicznego
 * endpointu. Ta wersja czyta schemat i wiersze przez to samo połączenie
 * PDO co reszta aplikacji (apps/api/src/bootstrap.php) i strumieniuje
 * SQL od razu do gzip, więc pamięć nie rośnie z rozmiarem bazy.
 *
 * Użycie CLI:   php scripts/db-dump.php [--out=sciezka.sql.gz]
 * Użycie webowe: require'owany przez scripts/remote-backup.php.
 */

function dumpDatabase(PDO $pdo, string $outputPath): array
{
    $dir = dirname($outputPath);
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
        throw new RuntimeException("Nie udało się utworzyć katalogu: {$dir}");
    }

    $handle = gzopen($outputPath, 'wb9');
    if ($handle === false) {
        throw new RuntimeException("Nie udało się otworzyć pliku wyjściowego: {$outputPath}");
    }

    $startedAt = microtime(true);
    $tableCount = 0;
    $rowCount = 0;

    try {
        $write = static function (string $chunk) use ($handle): void {
            if (gzwrite($handle, $chunk) === false) {
                throw new RuntimeException('Błąd zapisu do pliku gzip.');
            }
        };

        $write("-- Zrzut bazy Rexor - wygenerowany przez scripts/db-dump.php\n");
        $write('-- ' . gmdate('Y-m-d\TH:i:s\Z') . "\n\n");
        $write("SET NAMES utf8mb4;\n");
        $write("SET FOREIGN_KEY_CHECKS=0;\n\n");

        $tables = $pdo->query('SHOW FULL TABLES WHERE Table_type = \'BASE TABLE\'')
            ->fetchAll(PDO::FETCH_NUM);

        foreach ($tables as [$table]) {
            $tableCount++;
            $quotedTable = "`{$table}`";

            $createRow = $pdo->query("SHOW CREATE TABLE {$quotedTable}")->fetch(PDO::FETCH_NUM);
            $createSql = $createRow[1] ?? '';

            $write("--\n-- Tabela {$table}\n--\n\n");
            $write("DROP TABLE IF EXISTS {$quotedTable};\n");
            $write($createSql . ";\n\n");

            // Kursor bez buforowania - wiersze schodzą po jednym, więc duża
            // tabela nie trafia w całości do pamięci PHP.
            $pdo->setAttribute(PDO::MYSQL_ATTR_USE_BUFFERED_QUERY, false);
            $statement = $pdo->query("SELECT * FROM {$quotedTable}");
            $batch = [];
            $batchSize = 200;

            while (($row = $statement->fetch(PDO::FETCH_ASSOC)) !== false) {
                $rowCount++;
                $values = array_map(static function ($value) use ($pdo): string {
                    if ($value === null) {
                        return 'NULL';
                    }
                    return $pdo->quote((string) $value);
                }, array_values($row));
                $batch[] = '(' . implode(',', $values) . ')';

                if (count($batch) >= $batchSize) {
                    $write("INSERT INTO {$quotedTable} VALUES\n" . implode(",\n", $batch) . ";\n");
                    $batch = [];
                }
            }
            if ($batch !== []) {
                $write("INSERT INTO {$quotedTable} VALUES\n" . implode(",\n", $batch) . ";\n");
            }
            $write("\n");
            $statement->closeCursor();
            $pdo->setAttribute(PDO::MYSQL_ATTR_USE_BUFFERED_QUERY, true);
        }

        $write("SET FOREIGN_KEY_CHECKS=1;\n");
    } finally {
        gzclose($handle);
    }

    return [
        'file' => $outputPath,
        'sizeBytes' => filesize($outputPath) ?: 0,
        'tables' => $tableCount,
        'rows' => $rowCount,
        'elapsedSeconds' => round(microtime(true) - $startedAt, 2),
    ];
}

if (PHP_SAPI === 'cli' && realpath($argv[0] ?? '') === __FILE__) {
    require __DIR__ . '/../apps/api/src/bootstrap.php';

    $outPath = null;
    foreach ($argv as $arg) {
        if (str_starts_with($arg, '--out=')) {
            $outPath = substr($arg, strlen('--out='));
        }
    }
    $outPath ??= projectRoot() . '/storage/backups/' . gmdate('Ymd\THis\Z') . '/database.sql.gz';

    fwrite(STDOUT, "Zrzucam bazę '" . envValue('DB_NAME') . "' do {$outPath}...\n");
    $result = dumpDatabase(database(), $outPath);
    fwrite(STDOUT, sprintf(
        "Gotowe: %d tabel, %d wierszy, %.1f KB, %.2fs -> %s\n",
        $result['tables'],
        $result['rows'],
        $result['sizeBytes'] / 1024,
        $result['elapsedSeconds'],
        $result['file'],
    ));
}
