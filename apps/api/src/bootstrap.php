<?php

declare(strict_types=1);

function projectRoot(): string
{
    return dirname(__DIR__, 3);
}

function loadEnvironment(string $path): void
{
    if (!is_file($path)) {
        return;
    }

    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        if ($key === '' || getenv($key) !== false) {
            continue;
        }
        $value = trim($value);
        if (strlen($value) >= 2 && (($value[0] === '"' && $value[-1] === '"') || ($value[0] === "'" && $value[-1] === "'"))) {
            $value = substr($value, 1, -1);
        }
        putenv("{$key}={$value}");
    }
}

loadEnvironment(projectRoot() . '/.env');

function envValue(string $key, string $default = ''): string
{
    $value = getenv($key);
    return $value === false ? $default : $value;
}

function database(): PDO
{
    static $pdo;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $pdo = new PDO(
        envValue('DB_DSN'),
        envValue('DB_USER'),
        envValue('DB_PASSWORD'),
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ],
    );
    // Wszystkie daty aplikacyjne zapisujemy i porównujemy w UTC niezależnie od
    // strefy skonfigurowanej na komputerze developerskim lub hostingu.
    $pdo->exec("SET time_zone = '+00:00'");
    return $pdo;
}

function jsonResponse(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function requestJson(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $data = json_decode($raw, true, 64, JSON_THROW_ON_ERROR);
    if (!is_array($data)) {
        throw new InvalidArgumentException('Nieprawidłowe dane żądania.');
    }
    return $data;
}

function randomToken(int $bytes = 32): string
{
    return rtrim(strtr(base64_encode(random_bytes($bytes)), '+/', '-_'), '=');
}

function publicId(): string
{
    $alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    $bytes = random_bytes(26);
    $id = '';
    for ($index = 0; $index < 26; $index++) {
        $id .= $alphabet[ord($bytes[$index]) & 31];
    }
    return $id;
}

function sanitizeRichHtml(string $html): string
{
    $allowedTags = '<p><br><h2><h3><h4><strong><em><ul><ol><li><blockquote><a><img><table><thead><tbody><tfoot><tr><th><td><span><hr>';
    $html = strip_tags($html, $allowedTags);
    $document = new DOMDocument('1.0', 'UTF-8');
    libxml_use_internal_errors(true);
    $document->loadHTML('<?xml encoding="utf-8" ?><div id="root">' . $html . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
    libxml_clear_errors();

    $allowedAttributes = [
        'a' => ['href', 'title', 'target', 'rel', 'class'],
        'img' => ['src', 'alt', 'title', 'class', 'width', 'height'],
        'table' => ['class'],
        'th' => ['colspan', 'rowspan', 'scope', 'class'],
        'td' => ['colspan', 'rowspan', 'class'],
        'span' => ['class'],
        'p' => ['class'],
        'h2' => ['class'],
        'h3' => ['class'],
        'h4' => ['class'],
        'ul' => ['class'],
        'ol' => ['class'],
        'li' => ['class'],
        'blockquote' => ['class'],
    ];
    foreach ($document->getElementsByTagName('*') as $element) {
        if (!$element instanceof DOMElement || $element->getAttribute('id') === 'root') {
            continue;
        }
        $allowed = $allowedAttributes[strtolower($element->tagName)] ?? [];
        foreach (iterator_to_array($element->attributes) as $attribute) {
            if (!in_array(strtolower($attribute->name), $allowed, true)) {
                $element->removeAttribute($attribute->name);
            }
        }
        foreach (['href', 'src'] as $urlAttribute) {
            if (!$element->hasAttribute($urlAttribute)) {
                continue;
            }
            $url = trim($element->getAttribute($urlAttribute));
            if (!preg_match('~^(https?://|/)[^\s]+$~i', $url)) {
                $element->removeAttribute($urlAttribute);
            }
        }
        if (strtolower($element->tagName) === 'a' && $element->getAttribute('target') === '_blank') {
            $element->setAttribute('rel', 'noopener noreferrer');
        }
    }

    $root = $document->getElementById('root');
    if (!$root) {
        return '';
    }
    $result = '';
    foreach ($root->childNodes as $child) {
        $result .= $document->saveHTML($child);
    }
    return $result;
}

function bearerToken(): string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    return preg_match('/^Bearer\s+(.+)$/i', $header, $matches) ? trim($matches[1]) : '';
}

function requireAdmin(PDO $pdo): array
{
    $token = bearerToken();
    if ($token === '') {
        jsonResponse(['error' => 'Brak autoryzacji.'], 401);
    }
    $statement = $pdo->prepare(
        'SELECT u.id, u.email, u.display_name FROM admin_sessions s ' .
        'JOIN admin_users u ON u.id = s.admin_user_id ' .
        'WHERE s.token_hash = :hash AND s.expires_at > UTC_TIMESTAMP() AND u.is_active = TRUE'
    );
    $statement->execute(['hash' => hash('sha256', $token)]);
    $user = $statement->fetch();
    if (!$user) {
        jsonResponse(['error' => 'Sesja wygasła lub jest nieprawidłowa.'], 401);
    }
    return $user;
}
