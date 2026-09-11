<?php

declare(strict_types=1);

require dirname(__DIR__) . '/src/bootstrap.php';

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "Ten skrypt działa wyłącznie z CLI.\n");
    exit(1);
}

$pdo = database();
$transport = envValue('MAIL_TRANSPORT', 'log');
$fromAddress = envValue('MAIL_FROM_ADDRESS', 'no-reply@rexorbikes.com');
$fromName = envValue('MAIL_FROM_NAME', 'Rexor Bikes');
$limit = 20;

$statement = $pdo->prepare("SELECT * FROM email_outbox WHERE status IN ('pending', 'failed') AND available_at <= UTC_TIMESTAMP() AND attempts < 5 ORDER BY id LIMIT {$limit}");
$statement->execute();
$messages = $statement->fetchAll();

foreach ($messages as $message) {
    $claimed = $pdo->prepare("UPDATE email_outbox SET status = 'sending', attempts = attempts + 1 WHERE id = :id AND status IN ('pending', 'failed')");
    $claimed->execute(['id' => $message['id']]);
    if ($claimed->rowCount() !== 1) {
        continue;
    }

    try {
        $payload = json_decode($message['payload'], true, 32, JSON_THROW_ON_ERROR);
        $name = htmlspecialchars((string) ($payload['customerName'] ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $model = htmlspecialchars((string) ($payload['modelName'] ?? 'Rexor'), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $shareUrl = htmlspecialchars((string) ($payload['shareUrl'] ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $resumeUrl = htmlspecialchars((string) ($payload['resumeUrl'] ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $price = number_format((float) ($payload['grossTotal'] ?? 0), 0, ',', ' ') . ' zł brutto';
        $subject = "Twój projekt {$model} — Rexor Bikes";
        $html = "<h1>Dziękujemy, {$name}</h1><p>Konfiguracja <strong>{$model}</strong> została zapisana.</p><p>Aktualna cena: <strong>{$price}</strong>.</p><p><a href=\"{$shareUrl}\">Otwórz podsumowanie</a></p><p><a href=\"{$resumeUrl}\">Wróć do konfiguratora</a></p><p>Przed realizacją Rexor potwierdzi kompatybilność i ostateczny zakres.</p>";

        if ($transport === 'log') {
            $directory = projectRoot() . '/storage/logs';
            if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
                throw new RuntimeException('Nie udało się utworzyć katalogu logów.');
            }
            file_put_contents($directory . '/mail.log', json_encode(['to' => $message['recipient_email'], 'subject' => $subject, 'html' => $html], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL, FILE_APPEND | LOCK_EX);
        } elseif ($transport === 'mail') {
            $headers = [
                'MIME-Version: 1.0',
                'Content-Type: text/html; charset=UTF-8',
                'From: ' . mb_encode_mimeheader($fromName) . " <{$fromAddress}>",
            ];
            if (!mail((string) $message['recipient_email'], mb_encode_mimeheader($subject), $html, implode("\r\n", $headers))) {
                throw new RuntimeException('Funkcja mail() odrzuciła wiadomość.');
            }
        } else {
            throw new RuntimeException("Nieobsługiwany MAIL_TRANSPORT: {$transport}.");
        }

        $pdo->prepare("UPDATE email_outbox SET status = 'sent', sent_at = UTC_TIMESTAMP(), last_error = NULL WHERE id = :id")->execute(['id' => $message['id']]);
        fwrite(STDOUT, "Wysłano kolejkę #{$message['id']} do {$message['recipient_email']}.\n");
    } catch (Throwable $error) {
        $pdo->prepare("UPDATE email_outbox SET status = 'failed', last_error = :error, available_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 15 MINUTE) WHERE id = :id")->execute([
            'id' => $message['id'],
            'error' => mb_substr($error->getMessage(), 0, 1000),
        ]);
        fwrite(STDERR, "Błąd kolejki #{$message['id']}: {$error->getMessage()}\n");
    }
}

fwrite(STDOUT, 'Przetworzono: ' . count($messages) . " wiadomości.\n");
