<?php

declare(strict_types=1);

/**
 * Wysyłka e-maili z panelu i formularzy publicznych. Projekt nie ma Composera/
 * vendor, więc SMTP jest zaimplementowane jako minimalny klient na surowych
 * gniazdach (STARTTLS + AUTH LOGIN) - wystarczające dla jednej skrzynki na
 * hostingu współdzielonym home.pl. Transport wybiera MAIL_TRANSPORT (.env):
 * 'smtp' (produkcja), 'mail' (PHP mail()) albo 'log' (zapis do pliku, domyślne
 * lokalnie/dev, żeby nie wysyłać realnych maili podczas testów).
 */
function smtpSendMail(string $to, string $toName, string $subject, string $html): void
{
    $host = envValue('SMTP_HOST');
    $port = (int) envValue('SMTP_PORT', '587');
    $user = envValue('SMTP_USER');
    $password = envValue('SMTP_PASSWORD');
    $encryption = strtolower(envValue('SMTP_ENCRYPTION', 'tls'));
    $fromAddress = envValue('MAIL_FROM_ADDRESS', 'no-reply@rexorbikes.com');
    $fromName = envValue('MAIL_FROM_NAME', 'Rexor Bikes');

    if ($host === '' || $user === '' || $password === '') {
        throw new RuntimeException('Brak konfiguracji SMTP (SMTP_HOST/SMTP_USER/SMTP_PASSWORD) w .env.');
    }

    $prefix = $encryption === 'ssl' ? 'ssl://' : '';
    $socket = @stream_socket_client("{$prefix}{$host}:{$port}", $errno, $errstr, 15);
    if ($socket === false) {
        throw new RuntimeException("Nie udało się połączyć z serwerem SMTP {$host}:{$port} - {$errstr} ({$errno}).");
    }
    stream_set_timeout($socket, 15);

    $readResponse = function () use ($socket): string {
        $response = '';
        while (($line = fgets($socket, 515)) !== false) {
            $response .= $line;
            // Ostatnia linia wieloliniowej odpowiedzi SMTP ma spację po kodzie (np. "250 "), a nie myślnik ("250-").
            if (strlen($line) < 4 || $line[3] === ' ') {
                break;
            }
        }
        return $response;
    };
    $expect = function (string $context) use ($readResponse, $socket): string {
        $response = $readResponse();
        if ($response === '' || !preg_match('/^[123]/', $response)) {
            fclose($socket);
            throw new RuntimeException("Serwer SMTP odrzucił krok '{$context}': {$response}");
        }
        return $response;
    };
    $command = function (string $line) use ($socket): void {
        fwrite($socket, $line . "\r\n");
    };

    try {
        $expect('connect');
        $command('EHLO rexorbikes.com');
        $expect('EHLO');

        if ($encryption === 'tls') {
            $command('STARTTLS');
            $expect('STARTTLS');
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new RuntimeException('Nie udało się nawiązać szyfrowania TLS z serwerem SMTP.');
            }
            $command('EHLO rexorbikes.com');
            $expect('EHLO po STARTTLS');
        }

        $command('AUTH LOGIN');
        $expect('AUTH LOGIN');
        $command(base64_encode($user));
        $expect('login SMTP');
        $command(base64_encode($password));
        $expect('hasło SMTP');

        $command('MAIL FROM:<' . $fromAddress . '>');
        $expect('MAIL FROM');
        $command('RCPT TO:<' . $to . '>');
        $expect('RCPT TO');
        $command('DATA');
        $expect('DATA');

        $safeToName = str_replace(["\r", "\n"], '', $toName);
        $headers = [
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'From: ' . mb_encode_mimeheader($fromName) . " <{$fromAddress}>",
            'To: ' . ($safeToName !== '' ? mb_encode_mimeheader($safeToName) . " <{$to}>" : $to),
            'Subject: ' . mb_encode_mimeheader($subject),
            'Date: ' . date('r'),
        ];
        // Podwajanie kropki na początku linii to standardowe SMTP "dot-stuffing" -
        // bez tego linia z samą kropką przedwcześnie kończyłaby treść DATA.
        $escapedHtml = preg_replace('/^\./m', '..', $html);
        $command(implode("\r\n", $headers) . "\r\n\r\n" . $escapedHtml . "\r\n.");
        $expect('treść wiadomości');

        $command('QUIT');
    } finally {
        fclose($socket);
    }
}

function insertOutboxMail(PDO $pdo, ?int $configurationId, string $recipient, string $templateKey, array $payload): int
{
    $pdo->prepare(
        'INSERT INTO email_outbox (configuration_id, recipient_email, template_key, payload) VALUES (:configuration, :recipient, :template, :payload)'
    )->execute([
        'configuration' => $configurationId,
        'recipient' => $recipient,
        'template' => $templateKey,
        'payload' => json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ]);
    return (int) $pdo->lastInsertId();
}

/** Faktyczna wysyłka wg MAIL_TRANSPORT; aktualizuje status wiersza w email_outbox, jeśli podano jego id. */
function dispatchMail(PDO $pdo, string $recipientEmail, string $recipientName, string $subject, string $html, ?int $outboxId = null): void
{
    $transport = envValue('MAIL_TRANSPORT', 'log');
    try {
        if ($transport === 'smtp') {
            smtpSendMail($recipientEmail, $recipientName, $subject, $html);
        } elseif ($transport === 'mail') {
            $fromAddress = envValue('MAIL_FROM_ADDRESS', 'no-reply@rexorbikes.com');
            $fromName = envValue('MAIL_FROM_NAME', 'Rexor Bikes');
            $headers = [
                'MIME-Version: 1.0',
                'Content-Type: text/html; charset=UTF-8',
                'From: ' . mb_encode_mimeheader($fromName) . " <{$fromAddress}>",
            ];
            if (!mail($recipientEmail, mb_encode_mimeheader($subject), $html, implode("\r\n", $headers))) {
                throw new RuntimeException('Funkcja mail() odrzuciła wiadomość.');
            }
        } elseif ($transport === 'log') {
            $directory = projectRoot() . '/storage/logs';
            if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
                throw new RuntimeException('Nie udało się utworzyć katalogu logów.');
            }
            file_put_contents(
                $directory . '/mail.log',
                json_encode(['to' => $recipientEmail, 'subject' => $subject, 'html' => $html], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL,
                FILE_APPEND | LOCK_EX
            );
        } else {
            throw new RuntimeException("Nieobsługiwany MAIL_TRANSPORT: {$transport}.");
        }

        if ($outboxId !== null) {
            $pdo->prepare("UPDATE email_outbox SET status = 'sent', sent_at = UTC_TIMESTAMP(), last_error = NULL WHERE id = :id")
                ->execute(['id' => $outboxId]);
        }
    } catch (Throwable $error) {
        if ($outboxId !== null) {
            $pdo->prepare("UPDATE email_outbox SET status = 'failed', attempts = attempts + 1, last_error = :error, available_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 15 MINUTE) WHERE id = :id")
                ->execute(['id' => $outboxId, 'error' => mb_substr($error->getMessage(), 0, 1000)]);
        }
        throw $error;
    }
}

/**
 * Hosting współdzielony home.pl nie ma tu skonfigurowanego crona (i nie mamy
 * do niego dostępu z tego wdrożenia), więc zamiast liczyć wyłącznie na
 * apps/api/scripts/process-email-outbox.php, wysyłamy od razu przy żądaniu.
 * Błąd wysyłki nie może jednak wywrócić żądania klienta (np. zapis
 * konfiguracji) - jest już zapisany w email_outbox.status='failed' do
 * ewentualnego ręcznego/cronowego dogrania później.
 */
function sendOutboxMailBestEffort(PDO $pdo, int $outboxId, string $recipient, string $recipientName, string $subject, string $html): void
{
    try {
        dispatchMail($pdo, $recipient, $recipientName, $subject, $html, $outboxId);
    } catch (Throwable $error) {
        error_log("sendOutboxMailBestEffort(#{$outboxId}) failed: " . $error->getMessage());
    }
}

/**
 * Adresy, na które trafiają poszczególne rodzaje wiadomości. Admin może je
 * nadpisać w panelu (site_settings.mail_routing); w przeciwnym razie
 * używamy sensownych wartości domyślnych ze skrzynek założonych na hostingu.
 */
function getMailRouting(PDO $pdo): array
{
    $value = $pdo->query("SELECT value FROM site_settings WHERE setting_key = 'mail_routing'")->fetchColumn();
    $stored = $value ? json_decode((string) $value, true, 8, JSON_THROW_ON_ERROR) : [];
    // envValue() zwraca domyślną wartość tylko dla nieustawionej zmiennej, a
    // .env definiuje QUOTE_RECIPIENT jako pusty klucz - trim() na obu stronach.
    $defaultBusinessEmail = trim(envValue('QUOTE_RECIPIENT')) ?: 'biuro@rexorbikes.com';
    return [
        'order_email' => trim((string) ($stored['order_email'] ?? '')) ?: $defaultBusinessEmail,
        'contact_email' => trim((string) ($stored['contact_email'] ?? '')) ?: $defaultBusinessEmail,
        'service_email' => trim((string) ($stored['service_email'] ?? '')) ?: 'serwis@rexorbikes.com',
    ];
}

function updateMailRouting(PDO $pdo, array $input): array
{
    $routing = [];
    foreach (['order_email', 'contact_email', 'service_email'] as $field) {
        $value = trim((string) ($input[$field] ?? ''));
        if ($value !== '' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException("Adres e-mail dla pola {$field} jest nieprawidłowy.");
        }
        $routing[$field] = $value;
    }
    $statement = $pdo->prepare("INSERT INTO site_settings (setting_key, value) VALUES ('mail_routing', :value) ON DUPLICATE KEY UPDATE value = VALUES(value)");
    $statement->execute(['value' => json_encode($routing, JSON_THROW_ON_ERROR)]);
    logActivity($pdo, 'mail_routing_updated', 'admin', currentAdmin()['email'] ?? null, 'Zmieniono adresy e-mail do wysyłki.', $routing);
    return $routing;
}
