<?php

declare(strict_types=1);

require dirname(__DIR__) . '/src/bootstrap.php';

if (PHP_SAPI !== 'cli') {
    exit(1);
}

$email = strtolower(trim($argv[1] ?? envValue('ADMIN_EMAIL')));
$password = $argv[2] ?? envValue('ADMIN_PASSWORD');
$name = trim($argv[3] ?? 'Administrator Rexor');
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 12) {
    fwrite(STDERR, "Użycie: php apps/api/scripts/create-admin.php EMAIL HASLO [NAZWA]\nHasło musi mieć minimum 12 znaków.\n");
    exit(2);
}

$statement = database()->prepare(
    'INSERT INTO admin_users (email, display_name, password_hash) VALUES (:email, :name, :hash) ' .
    'ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), password_hash = VALUES(password_hash), is_active = TRUE'
);
$statement->execute(['email' => $email, 'name' => $name, 'hash' => password_hash($password, PASSWORD_DEFAULT)]);
fwrite(STDOUT, "Konto administratora zostało zapisane.\n");
