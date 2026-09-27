<?php

declare(strict_types=1);

/**
 * Wyciąga z pełnego zrzutu bazy (scripts/db-dump.php) same wiersze tabel
 * katalogu produktowego (scripts/catalog-tables.php) i buduje z nich plik
 * SQL typu "pełne lustro": TRUNCATE + INSERT z dokładnymi ID źródła.
 *
 * Świadomie NIE kopiuje CREATE/DROP TABLE - schemat obu środowisk ma i tak
 * być zgodny dzięki migracjom; ten skrypt przenosi tylko dane.
 *
 * Użycie: php scripts/extract-catalog-sql.php <rozpakowany-dump.sql> > catalog-sync.sql
 */

require __DIR__ . '/catalog-tables.php';

$dumpPath = $argv[1] ?? null;
if ($dumpPath === null || !is_file($dumpPath)) {
    fwrite(STDERR, "Użycie: php scripts/extract-catalog-sql.php <rozpakowany-dump.sql>\n");
    exit(1);
}

$content = file_get_contents($dumpPath);
if ($content === false) {
    fwrite(STDERR, "Nie można odczytać {$dumpPath}\n");
    exit(1);
}

$tables = catalogTables();

echo "-- Wygenerowane przez scripts/extract-catalog-sql.php - pełne lustro katalogu produktowego z prod.\n";
echo "SET NAMES utf8mb4;\n";
echo "SET FOREIGN_KEY_CHECKS=0;\n\n";

foreach ($tables as $table) {
    echo "TRUNCATE TABLE `{$table}`;\n";
}
echo "\n";

foreach ($tables as $table) {
    $pattern = '/INSERT INTO `' . preg_quote($table, '/') . '` VALUES\n(.*?);\n/s';
    if (!preg_match_all($pattern, $content, $matches)) {
        fwrite(STDERR, "Uwaga: brak wierszy w dumpie dla tabeli {$table} (zostanie tylko wyczyszczona).\n");
        continue;
    }
    foreach ($matches[1] as $values) {
        echo "INSERT INTO `{$table}` VALUES\n{$values};\n";
    }
}

echo "\nSET FOREIGN_KEY_CHECKS=1;\n";
