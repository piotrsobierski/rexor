<?php

declare(strict_types=1);

/**
 * Wspólny handler dla formularza kontaktowego (/kontakt) i zgłoszenia
 * serwisowego (/serwis) - to samo API, inny adresat, wybierany po polu
 * `type` i zgodny z routingiem ustawionym w panelu (getMailRouting()).
 */
function handleContactRequest(PDO $pdo, array $payload): array
{
    $type = in_array($payload['type'] ?? '', ['contact', 'service'], true) ? (string) $payload['type'] : 'contact';
    $name = trim((string) ($payload['name'] ?? ''));
    $email = trim((string) ($payload['email'] ?? ''));
    $phone = trim((string) ($payload['phone'] ?? ''));
    $message = trim((string) ($payload['message'] ?? ''));

    if ($name === '' || $message === '') {
        throw new InvalidArgumentException('Podaj imię oraz treść wiadomości.');
    }
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('Podaj poprawny adres e-mail.');
    }

    enforceRateLimit($pdo, 'contact', 5, 'Zbyt wiele zgłoszeń. Spróbuj ponownie za chwilę.');

    $routing = getMailRouting($pdo);
    $recipient = $type === 'service' ? $routing['service_email'] : $routing['contact_email'];
    $label = $type === 'service' ? 'Zgłoszenie serwisowe' : 'Wiadomość z formularza kontaktowego';

    $safeName = htmlspecialchars($name, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $safeEmail = htmlspecialchars($email, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $safePhone = htmlspecialchars($phone, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $safeMessage = nl2br(htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));
    $subject = "{$label} — {$name}";
    $html = "<h1>{$label}</h1><p><strong>Imię:</strong> {$safeName}</p><p><strong>E-mail:</strong> {$safeEmail}</p>"
        . ($phone !== '' ? "<p><strong>Telefon:</strong> {$safePhone}</p>" : '')
        . "<p><strong>Wiadomość:</strong><br>{$safeMessage}</p>";

    $outboxId = insertOutboxMail($pdo, null, $recipient, $type === 'service' ? 'service_message' : 'contact_message', [
        'name' => $name,
        'email' => $email,
        'phone' => $phone,
        'message' => $message,
    ]);
    sendOutboxMailBestEffort($pdo, $outboxId, $recipient, $name, $subject, $html);

    logActivity(
        $pdo,
        $type === 'service' ? 'service_message' : 'contact_message',
        'customer',
        null,
        mb_substr($message, 0, 200),
        ['name' => $name, 'email' => $email, 'phone' => $phone, 'recipient' => $recipient]
    );

    return ['ok' => true];
}
