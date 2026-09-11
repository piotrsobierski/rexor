<?php

declare(strict_types=1);

require dirname(__DIR__) . '/src/bootstrap.php';
require dirname(__DIR__) . '/src/PricingService.php';
require dirname(__DIR__) . '/src/ConfigurationService.php';
require dirname(__DIR__) . '/src/AdminService.php';
require dirname(__DIR__) . '/src/CatalogService.php';
require dirname(__DIR__) . '/src/ChatService.php';
require dirname(__DIR__) . '/src/AiContentService.php';

$allowedOrigin = envValue('CORS_ORIGIN', 'http://localhost:3000');
if (($_SERVER['HTTP_ORIGIN'] ?? '') === $allowedOrigin) {
    header("Access-Control-Allow-Origin: {$allowedOrigin}");
    header('Vary: Origin');
}
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

set_exception_handler(static function (Throwable $error): never {
    $status = match (true) {
        $error instanceof InvalidArgumentException => 422,
        $error->getCode() >= 400 && $error->getCode() <= 599 => (int) $error->getCode(),
        default => 500,
    };
    $message = $status >= 500 && envValue('APP_DEBUG', '0') !== '1'
        ? 'Wystąpił błąd serwera.'
        : $error->getMessage();
    jsonResponse(['error' => $message], $status);
});

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
$path = preg_replace('~^/api~', '', $path) ?: '/';
$pdo = database();

if ($method === 'GET' && $path === '/health') {
    $pdo->query('SELECT 1');
    jsonResponse(['status' => 'ok', 'database' => 'connected']);
}

if ($method === 'GET' && $path === '/catalog') {
    jsonResponse(publicCatalog($pdo));
}

if ($method === 'POST' && $path === '/chat') {
    jsonResponse(handleChatRequest($pdo, requestJson()));
}

if ($method === 'GET' && $path === '/settings/theme') {
    $value = $pdo->query("SELECT value FROM site_settings WHERE setting_key = 'theme'")->fetchColumn();
    jsonResponse(['theme' => $value ? json_decode((string) $value, true, 16, JSON_THROW_ON_ERROR) : null]);
}

if ($method === 'GET' && preg_match('~^/pages/([a-z0-9-]+)$~', $path, $matches)) {
    $statement = $pdo->prepare('SELECT slug, title, excerpt, content_html, hero_image_path, updated_at FROM site_pages WHERE slug = :slug AND is_published = TRUE');
    $statement->execute(['slug' => $matches[1]]);
    $page = $statement->fetch();
    if (!$page) {
        jsonResponse(['error' => 'Nie znaleziono strony.'], 404);
    }
    jsonResponse(['page' => $page]);
}

if ($method === 'POST' && $path === '/configurations') {
    jsonResponse(createConfiguration($pdo, requestJson()), 201);
}

if ($method === 'GET' && preg_match('~^/configurations/(share|resume)/([A-Za-z0-9_-]+)$~', $path, $matches)) {
    jsonResponse(getConfigurationByToken($pdo, $matches[2], $matches[1]));
}

if ($method === 'POST' && $path === '/admin/login') {
    jsonResponse(loginAdmin($pdo, requestJson()));
}

if ($method === 'GET' && $path === '/admin/catalog') {
    requireAdmin($pdo);
    jsonResponse(adminCatalog($pdo));
}

if ($method === 'PATCH' && preg_match('~^/admin/(categories|models|parts|sizes)/(\d+)$~', $path, $matches)) {
    requireAdmin($pdo);
    jsonResponse(updateAdminRecord($pdo, $matches[1], (int) $matches[2], requestJson()));
}

// Osprzęt modelu: przypisanie części, pozycja domyślna i tryb grupy.
// Cena nie jest tu przesyłana — wynika z cennika części.
if ($method === 'POST' && $path === '/admin/models') {
    requireAdmin($pdo);
    jsonResponse(createAdminModel($pdo, requestJson()), 201);
}

if ($method === 'POST' && $path === '/admin/parts') {
    requireAdmin($pdo);
    jsonResponse(createAdminPart($pdo, requestJson()), 201);
}

if ($method === 'DELETE' && preg_match('~^/admin/parts/(\d+)$~', $path, $matches)) {
    requireAdmin($pdo);
    jsonResponse(deleteAdminPart($pdo, (int) $matches[1]));
}

if ($method === 'POST' && $path === '/admin/model-parts') {
    requireAdmin($pdo);
    jsonResponse(saveModelPart($pdo, requestJson()));
}

if ($method === 'POST' && $path === '/admin/model-group-settings') {
    requireAdmin($pdo);
    jsonResponse(saveModelGroupSettings($pdo, requestJson()));
}

if ($method === 'POST' && preg_match('~^/admin/models/(\d+)/copy-parts$~', $path, $matches)) {
    requireAdmin($pdo);
    $payload = requestJson();
    jsonResponse(copyModelParts($pdo, (int) $matches[1], (int) ($payload['source_model_id'] ?? 0)));
}

if ($method === 'POST' && $path === '/admin/recompute-prices') {
    requireAdmin($pdo);
    jsonResponse(['basePrices' => recomputeAllModelBasePrices($pdo)]);
}

if ($method === 'POST' && $path === '/admin/batteries') {
    requireAdmin($pdo);
    jsonResponse(saveAdminBattery($pdo, null, requestJson()), 201);
}

if ($method === 'PATCH' && preg_match('~^/admin/batteries/(\d+)$~', $path, $matches)) {
    requireAdmin($pdo);
    jsonResponse(saveAdminBattery($pdo, (int) $matches[1], requestJson()));
}

if ($method === 'PATCH' && preg_match('~^/admin/pages/(\d+)$~', $path, $matches)) {
    requireAdmin($pdo);
    jsonResponse(updateAdminRecord($pdo, 'pages', (int) $matches[1], requestJson()));
}

if ($method === 'PATCH' && $path === '/admin/settings/theme') {
    requireAdmin($pdo);
    jsonResponse(['theme' => updateTheme($pdo, requestJson())]);
}

if ($method === 'POST' && $path === '/admin/ai/rich-content') {
    requireAdmin($pdo);
    jsonResponse(aiEditRichContent($pdo, requestJson()));
}

if ($method === 'POST' && $path === '/admin/media') {
    requireAdmin($pdo);
    jsonResponse(uploadAdminMedia($pdo), 201);
}

if ($method === 'DELETE' && preg_match('~^/admin/models/(\d+)/media/(\d+)$~', $path, $matches)) {
    requireAdmin($pdo);
    jsonResponse(deleteModelMedia($pdo, (int) $matches[1], (int) $matches[2]));
}

if ($method === 'PATCH' && preg_match('~^/admin/models/(\d+)/media/reorder$~', $path, $matches)) {
    requireAdmin($pdo);
    $payload = requestJson();
    jsonResponse(reorderModelMedia($pdo, (int) $matches[1], (array) ($payload['mediaIds'] ?? [])));
}

if ($method === 'GET' && preg_match('~^/admin/configurations/([A-Za-z0-9]{20,32})$~', $path, $matches)) {
    requireAdmin($pdo);
    jsonResponse(getConfigurationForAdmin($pdo, $matches[1]));
}

if ($method === 'GET' && preg_match('~^/uploads/(\d{4}/\d{2}/[a-f0-9]{32}\.(?:jpg|png|webp|avif))$~', $path, $matches)) {
    $file = projectRoot() . '/storage/media/' . $matches[1];
    if (!is_file($file)) {
        jsonResponse(['error' => 'Nie znaleziono obrazu.'], 404);
    }
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file);
    header('Content-Type: ' . $mime);
    header('Cache-Control: public, max-age=31536000, immutable');
    readfile($file);
    exit;
}

// Zdjęcia z preseedu bazy (spoza panelu admina) leżą w /public/media, nie w
// /storage/media — osobna, węższa trasa niż /uploads, żeby nie serwować
// dowolnych plików spod /public.
if ($method === 'GET' && preg_match('~^/media/(models/[a-z0-9-]+/[a-z0-9._-]+\.(?:jpg|jpeg|png|webp|avif))$~', $path, $matches)) {
    $file = projectRoot() . '/public/media/' . $matches[1];
    if (!is_file($file)) {
        jsonResponse(['error' => 'Nie znaleziono obrazu.'], 404);
    }
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file);
    header('Content-Type: ' . $mime);
    header('Cache-Control: public, max-age=31536000, immutable');
    readfile($file);
    exit;
}

jsonResponse(['error' => 'Nie znaleziono endpointu.'], 404);
