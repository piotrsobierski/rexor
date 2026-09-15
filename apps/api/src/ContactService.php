<?php

declare(strict_types=1);

/**
 * Wspólny handler dla formularza kontaktowego (/kontakt), zgłoszenia
 * serwisowego (/serwis) i zapytania o ramę (/ramy/{slug}) - to samo API,
 * inny adresat, wybierany po polu `type` i zgodny z routingiem ustawionym
 * w panelu (getMailRouting()).
 *
 * Zapytanie o ramę idzie na adres zamówień, nie kontaktowy: to intencja
 * zakupowa, tak samo jak zapytanie ofertowe z konfiguratora. Szczegóły
 * wyboru (rozmiar, malowanie) przychodzą w `context` i trafiają do maila
 * jako lista - budowanie drugiego mechanizmu formularza nie miałoby sensu.
 */
function handleContactRequest(PDO $pdo, array $payload): array
{
    $type = in_array($payload['type'] ?? '', ['contact', 'service', 'frame'], true) ? (string) $payload['type'] : 'contact';
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
    $recipient = match ($type) {
        'service' => $routing['service_email'],
        'frame' => $routing['order_email'],
        default => $routing['contact_email'],
    };
    $label = match ($type) {
        'service' => 'Zgłoszenie serwisowe',
        'frame' => 'Zapytanie o ramę',
        default => 'Wiadomość z formularza kontaktowego',
    };
    $eventType = match ($type) {
        'service' => 'service_message',
        'frame' => 'frame_message',
        default => 'contact_message',
    };

    // Kontekst wyboru ze strony ramy: { frameSlug, frameName, size, paint }.
    // Przyjmujemy dowolne klucze skalarne - formularz może z czasem dostać
    // kolejne pola, a mail ma je pokazać bez zmiany backendu.
    $context = [];
    foreach ((array) ($payload['context'] ?? []) as $key => $value) {
        if (is_scalar($value) && trim((string) $value) !== '') {
            $context[(string) $key] = trim((string) $value);
        }
    }
    $frameName = $context['frameName'] ?? '';

    $safeName = htmlspecialchars($name, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $safeEmail = htmlspecialchars($email, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $safePhone = htmlspecialchars($phone, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $safeMessage = nl2br(htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));
    $subject = $type === 'frame' && $frameName !== ''
        ? "{$label} — {$frameName} — {$name}"
        : "{$label} — {$name}";

    $contextHtml = '';
    if ($context !== []) {
        $items = '';
        foreach ($context as $key => $value) {
            $safeLabel = htmlspecialchars(contextFieldLabel($key), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            $safeValue = htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            $items .= "<li><strong>{$safeLabel}:</strong> {$safeValue}</li>";
        }
        $contextHtml = "<p><strong>Szczegóły zapytania:</strong></p><ul>{$items}</ul>";
    }

    $html = "<h1>{$label}</h1><p><strong>Imię:</strong> {$safeName}</p><p><strong>E-mail:</strong> {$safeEmail}</p>"
        . ($phone !== '' ? "<p><strong>Telefon:</strong> {$safePhone}</p>" : '')
        . $contextHtml
        . "<p><strong>Wiadomość:</strong><br>{$safeMessage}</p>";

    $outboxId = insertOutboxMail($pdo, null, $recipient, $eventType, [
        'name' => $name,
        'email' => $email,
        'phone' => $phone,
        'message' => $message,
        'context' => $context,
    ]);
    sendOutboxMailBestEffort($pdo, $outboxId, $recipient, $name, $subject, $html);

    logActivity(
        $pdo,
        $eventType,
        'customer',
        null,
        mb_substr($message, 0, 200),
        ['name' => $name, 'email' => $email, 'phone' => $phone, 'recipient' => $recipient, 'context' => $context]
    );

    return ['ok' => true];
}

/**
 * Nazwy pól kontekstu po polsku - mail czyta człowiek, nie front. Klucz
 * spoza listy trafia do maila w oryginalnej postaci, żeby nowe pole
 * formularza nie znikało po cichu.
 */
function contextFieldLabel(string $key): string
{
    return match ($key) {
        'frameName' => 'Rama',
        'frameSlug' => 'Identyfikator ramy',
        'size' => 'Rozmiar',
        'paint' => 'Malowanie',
        default => $key,
    };
}
