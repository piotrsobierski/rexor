<?php

declare(strict_types=1);

require dirname(__DIR__) . '/src/bootstrap.php';

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "Ten skrypt działa wyłącznie z CLI.\n");
    exit(1);
}

require dirname(__DIR__) . '/src/MailService.php';

/**
 * Filet bezpieczeństwa: normalnie każdy e-mail jest już wysyłany synchronicznie
 * przy żądaniu (ConfigurationService.php, ContactService.php) przez
 * sendOutboxMailBestEffort(), bo hosting współdzielony home.pl nie ma tu
 * skonfigurowanego crona. Ten skrypt dogrywa tylko to, co się nie wysłało
 * (status 'failed') - trzeba go uruchamiać ręcznie lub przez cron, jeśli
 * kiedyś zostanie dodany.
 */
$pdo = database();
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
        $name = htmlspecialchars((string) ($payload['customerName'] ?? $payload['name'] ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $model = htmlspecialchars((string) ($payload['modelName'] ?? 'Rexor'), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $shareUrl = htmlspecialchars((string) ($payload['shareUrl'] ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $resumeUrl = htmlspecialchars((string) ($payload['resumeUrl'] ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $price = number_format((float) ($payload['grossTotal'] ?? 0), 0, ',', ' ') . ' zł brutto';

        $templateKey = (string) $message['template_key'];
        if ($templateKey === 'inquiry_notification') {
            $subject = "Nowe zapytanie ofertowe — {$model}";
            $html = "<h1>Nowe zapytanie ofertowe</h1><p><strong>Klient:</strong> {$name}</p><p><strong>Model:</strong> {$model}</p><p><strong>Cena:</strong> {$price}</p><p><a href=\"{$shareUrl}\">Podgląd konfiguracji</a></p>";
        } elseif ($templateKey === 'contact_message' || $templateKey === 'service_message') {
            $email = htmlspecialchars((string) ($payload['email'] ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            $phone = htmlspecialchars((string) ($payload['phone'] ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            $bodyMessage = nl2br(htmlspecialchars((string) ($payload['message'] ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));
            $label = $templateKey === 'service_message' ? 'Zgłoszenie serwisowe' : 'Wiadomość z formularza kontaktowego';
            $subject = "{$label} — " . ($payload['name'] ?? '');
            $html = "<h1>{$label}</h1><p><strong>Imię:</strong> {$name}</p><p><strong>E-mail:</strong> {$email}</p>" . ($phone !== '' ? "<p><strong>Telefon:</strong> {$phone}</p>" : '') . "<p><strong>Wiadomość:</strong><br>{$bodyMessage}</p>";
        } else {
            $rendered = renderConfigurationEmail($pdo, [
                '{{customerName}}' => (string) ($payload['customerName'] ?? ''),
                '{{modelName}}' => (string) ($payload['modelName'] ?? 'Rexor'),
                '{{price}}' => $price,
                '{{shareUrl}}' => (string) ($payload['shareUrl'] ?? ''),
                '{{resumeUrl}}' => (string) ($payload['resumeUrl'] ?? ''),
                '{{publicId}}' => (string) ($payload['publicId'] ?? ''),
            ]);
            $subject = $rendered['subject'];
            $html = $rendered['html'];
        }

        dispatchMail($pdo, (string) $message['recipient_email'], strip_tags($name), $subject, $html, (int) $message['id']);
        fwrite(STDOUT, "Wysłano kolejkę #{$message['id']} do {$message['recipient_email']}.\n");
    } catch (Throwable $error) {
        fwrite(STDERR, "Błąd kolejki #{$message['id']}: {$error->getMessage()}\n");
    }
}

fwrite(STDOUT, 'Przetworzono: ' . count($messages) . " wiadomości.\n");
