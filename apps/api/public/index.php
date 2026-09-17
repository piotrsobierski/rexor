<?php

declare(strict_types=1);

require dirname(__DIR__) . '/src/bootstrap.php';
require dirname(__DIR__) . '/src/PricingService.php';
require dirname(__DIR__) . '/src/ConfigurationService.php';
require dirname(__DIR__) . '/src/AdminService.php';
require dirname(__DIR__) . '/src/CatalogService.php';
require dirname(__DIR__) . '/src/PaintService.php';
require dirname(__DIR__) . '/src/AdminPaintService.php';
require dirname(__DIR__) . '/src/MediaLinkService.php';
require dirname(__DIR__) . '/src/FramesService.php';
require dirname(__DIR__) . '/src/ProjectsService.php';
require dirname(__DIR__) . '/src/ChatService.php';
require dirname(__DIR__) . '/src/AiContentService.php';
require dirname(__DIR__) . '/src/MailService.php';
require dirname(__DIR__) . '/src/ContactService.php';

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

// Ramy i realizacje: publicznie widoczne są wyłącznie pozycje opublikowane.
if ($method === 'GET' && $path === '/frames') {
    jsonResponse(publicFrames($pdo));
}

if ($method === 'GET' && preg_match('~^/frames/([a-z0-9-]+)$~', $path, $matches)) {
    $frame = publicFrame($pdo, $matches[1]);
    if (!$frame) {
        jsonResponse(['error' => 'Nie znaleziono ramy.'], 404);
    }
    jsonResponse($frame);
}

// Palety lakierów pobierane osobno, nie razem z /catalog: 680 kolorów to
// ładunek, którego strona główna i listing modeli nie potrzebują. Konfigurator
// woła ten adres dopiero przy pierwszym otwarciu wyboru koloru.
if ($method === 'GET' && preg_match('~^/paints/(model|frame)/([a-z0-9-]+)$~', $path, $matches)) {
    $paints = publicPaints($pdo, $matches[1], $matches[2]);
    if ($paints === null) {
        jsonResponse(['error' => 'Nie znaleziono produktu albo nie ma dla niego lakierowania.'], 404);
    }
    jsonResponse($paints);
}

if ($method === 'GET' && $path === '/projects') {
    jsonResponse(publicProjects($pdo));
}

if ($method === 'GET' && preg_match('~^/projects/([a-z0-9-]+)$~', $path, $matches)) {
    $project = publicProject($pdo, $matches[1]);
    if (!$project) {
        jsonResponse(['error' => 'Nie znaleziono realizacji.'], 404);
    }
    jsonResponse($project);
}

if ($method === 'POST' && $path === '/chat') {
    jsonResponse(handleChatRequest($pdo, requestJson()));
}

if ($method === 'POST' && $path === '/contact') {
    jsonResponse(handleContactRequest($pdo, requestJson()));
}

if ($method === 'GET' && $path === '/settings/theme') {
    $value = $pdo->query("SELECT value FROM site_settings WHERE setting_key = 'theme'")->fetchColumn();
    jsonResponse(['theme' => $value ? json_decode((string) $value, true, 16, JSON_THROW_ON_ERROR) : null]);
}

if ($method === 'GET' && $path === '/settings/branding') {
    jsonResponse(['branding' => getBranding($pdo)]);
}

if ($method === 'GET' && $path === '/settings/copy') {
    $value = $pdo->query("SELECT value FROM site_settings WHERE setting_key = 'copy'")->fetchColumn();
    jsonResponse(['copy' => $value ? json_decode((string) $value, true, 512, JSON_THROW_ON_ERROR) : null]);
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

if ($method === 'POST' && $path === '/configurator-events') {
    // Publiczny, bez logowania - limit chroni activity_log przed zalaniem
    // wpisami ze skryptu odpalonego wprost na ten endpoint.
    enforceRateLimit($pdo, 'configurator-event', 60, 'Zbyt wiele zdarzeń. Spróbuj ponownie za chwilę.');
    jsonResponse(logConfiguratorEvent($pdo, requestJson()));
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

if ($method === 'GET' && $path === '/admin/activity-log') {
    requireAdmin($pdo);
    $limit = (int) ($_GET['limit'] ?? 50);
    $beforeId = isset($_GET['beforeId']) && $_GET['beforeId'] !== '' ? (int) $_GET['beforeId'] : null;
    $eventType = isset($_GET['eventType']) ? (string) $_GET['eventType'] : null;
    jsonResponse(activityLog($pdo, $limit, $beforeId, $eventType));
}

if ($method === 'PATCH' && preg_match('~^/admin/(categories|models|parts|sizes|frames|projects)/(\d+)$~', $path, $matches)) {
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

if ($method === 'DELETE' && preg_match('~^/admin/models/(\d+)$~', $path, $matches)) {
    requireAdmin($pdo);
    jsonResponse(deleteAdminModel($pdo, (int) $matches[1]));
}

if ($method === 'POST' && $path === '/admin/categories') {
    requireAdmin($pdo);
    jsonResponse(createAdminCategory($pdo, requestJson()), 201);
}

if ($method === 'DELETE' && preg_match('~^/admin/categories/(\d+)$~', $path, $matches)) {
    requireAdmin($pdo);
    jsonResponse(deleteAdminCategory($pdo, (int) $matches[1]));
}

if ($method === 'POST' && $path === '/admin/sizes') {
    requireAdmin($pdo);
    jsonResponse(createAdminSize($pdo, requestJson()), 201);
}

if ($method === 'DELETE' && preg_match('~^/admin/sizes/(\d+)$~', $path, $matches)) {
    requireAdmin($pdo);
    jsonResponse(deleteAdminSize($pdo, (int) $matches[1]));
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

if ($method === 'DELETE' && preg_match('~^/admin/batteries/(\d+)$~', $path, $matches)) {
    requireAdmin($pdo);
    jsonResponse(deleteAdminBattery($pdo, (int) $matches[1]));
}

if ($method === 'DELETE' && preg_match('~^/admin/pages/(\d+)$~', $path, $matches)) {
    requireAdmin($pdo);
    jsonResponse(deleteAdminPage($pdo, (int) $matches[1]));
}

if ($method === 'PATCH' && $path === '/admin/settings/theme') {
    requireAdmin($pdo);
    jsonResponse(['theme' => updateTheme($pdo, requestJson())]);
}

if ($method === 'PATCH' && $path === '/admin/settings/copy') {
    requireAdmin($pdo);
    jsonResponse(['copy' => updateSiteCopy($pdo, requestJson())]);
}

if ($method === 'PATCH' && $path === '/admin/settings/branding') {
    requireAdmin($pdo);
    jsonResponse(['branding' => updateBranding($pdo, requestJson())]);
}

if ($method === 'PATCH' && $path === '/admin/settings/chatbot-prompt') {
    requireAdmin($pdo);
    jsonResponse(['chatbotPrompt' => updateChatbotPrompt($pdo, requestJson())]);
}

if ($method === 'PATCH' && $path === '/admin/settings/mail-routing') {
    requireAdmin($pdo);
    jsonResponse(['mailRouting' => updateMailRouting($pdo, requestJson())]);
}

if ($method === 'PATCH' && $path === '/admin/settings/configuration-email-template') {
    requireAdmin($pdo);
    jsonResponse(['configurationEmailTemplate' => updateConfigurationEmailTemplate($pdo, requestJson())]);
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

// Ramy i realizacje w panelu. Wgrywanie pliku zostaje osobnym wywołaniem
// (POST /admin/media), tutaj przypisujemy istniejące media i ustawiamy rolę.
if ($method === 'POST' && $path === '/admin/frames') {
    requireAdmin($pdo);
    jsonResponse(createAdminFrame($pdo, requestJson()), 201);
}

if ($method === 'DELETE' && preg_match('~^/admin/frames/(\d+)$~', $path, $matches)) {
    requireAdmin($pdo);
    jsonResponse(deleteAdminFrame($pdo, (int) $matches[1]));
}

if ($method === 'POST' && preg_match('~^/admin/frames/(\d+)/media$~', $path, $matches)) {
    requireAdmin($pdo);
    $payload = requestJson();
    jsonResponse(attachEntityMedia($pdo, 'frames', (int) $matches[1], (int) ($payload['mediaId'] ?? 0), (string) ($payload['role'] ?? 'gallery')), 201);
}

if ($method === 'DELETE' && preg_match('~^/admin/frames/(\d+)/media/(\d+)$~', $path, $matches)) {
    requireAdmin($pdo);
    jsonResponse(deleteEntityMedia($pdo, 'frames', (int) $matches[1], (int) $matches[2]));
}

if ($method === 'PATCH' && preg_match('~^/admin/frames/(\d+)/media/reorder$~', $path, $matches)) {
    requireAdmin($pdo);
    $payload = requestJson();
    jsonResponse(reorderEntityMedia($pdo, 'frames', (int) $matches[1], (array) ($payload['mediaIds'] ?? [])));
}

if ($method === 'POST' && $path === '/admin/projects') {
    requireAdmin($pdo);
    jsonResponse(createAdminProject($pdo, requestJson()), 201);
}

if ($method === 'DELETE' && preg_match('~^/admin/projects/(\d+)$~', $path, $matches)) {
    requireAdmin($pdo);
    jsonResponse(deleteAdminProject($pdo, (int) $matches[1]));
}

if ($method === 'POST' && preg_match('~^/admin/projects/(\d+)/media$~', $path, $matches)) {
    requireAdmin($pdo);
    $payload = requestJson();
    jsonResponse(attachEntityMedia($pdo, 'projects', (int) $matches[1], (int) ($payload['mediaId'] ?? 0), (string) ($payload['role'] ?? 'gallery')), 201);
}

if ($method === 'DELETE' && preg_match('~^/admin/projects/(\d+)/media/(\d+)$~', $path, $matches)) {
    requireAdmin($pdo);
    jsonResponse(deleteEntityMedia($pdo, 'projects', (int) $matches[1], (int) $matches[2]));
}

if ($method === 'PATCH' && preg_match('~^/admin/projects/(\d+)/media/reorder$~', $path, $matches)) {
    requireAdmin($pdo);
    $payload = requestJson();
    jsonResponse(reorderEntityMedia($pdo, 'projects', (int) $matches[1], (array) ($payload['mediaIds'] ?? [])));
}

if ($method === 'GET' && preg_match('~^/admin/configurations/([A-Za-z0-9]{20,32})$~', $path, $matches)) {
    requireAdmin($pdo);
    jsonResponse(getConfigurationForAdmin($pdo, $matches[1]));
}

// Panel lakierów: palety, kolory, przypisanie do modeli/ram i rendery.
if ($method === 'GET' && $path === '/admin/paints') {
    requireAdmin($pdo);
    jsonResponse(adminPaints($pdo));
}

if ($method === 'POST' && $path === '/admin/paint-palettes') {
    requireAdmin($pdo);
    jsonResponse(saveAdminPaintPalette($pdo, null, requestJson()), 201);
}

if ($method === 'PATCH' && preg_match('~^/admin/paint-palettes/(\d+)$~', $path, $matches)) {
    requireAdmin($pdo);
    jsonResponse(saveAdminPaintPalette($pdo, (int) $matches[1], requestJson()));
}

if ($method === 'DELETE' && preg_match('~^/admin/paint-palettes/(\d+)$~', $path, $matches)) {
    requireAdmin($pdo);
    jsonResponse(deleteAdminPaintPalette($pdo, (int) $matches[1]));
}

if ($method === 'POST' && $path === '/admin/paint-colors') {
    requireAdmin($pdo);
    jsonResponse(saveAdminPaintColor($pdo, null, requestJson()), 201);
}

if ($method === 'PATCH' && preg_match('~^/admin/paint-colors/(\d+)$~', $path, $matches)) {
    requireAdmin($pdo);
    jsonResponse(saveAdminPaintColor($pdo, (int) $matches[1], requestJson()));
}

if ($method === 'DELETE' && preg_match('~^/admin/paint-colors/(\d+)$~', $path, $matches)) {
    requireAdmin($pdo);
    jsonResponse(deleteAdminPaintColor($pdo, (int) $matches[1]));
}

if ($method === 'POST' && $path === '/admin/paint-settings') {
    requireAdmin($pdo);
    jsonResponse(saveAdminPaintSettings($pdo, requestJson()));
}

if ($method === 'POST' && $path === '/admin/paint-availability') {
    requireAdmin($pdo);
    jsonResponse(saveAdminPaintAvailability($pdo, requestJson()));
}

if ($method === 'POST' && $path === '/admin/paint-renders') {
    requireAdmin($pdo);
    jsonResponse(saveAdminPaintRender($pdo, requestJson()), 201);
}

if ($method === 'DELETE' && preg_match('~^/admin/paint-renders/(\d+)$~', $path, $matches)) {
    requireAdmin($pdo);
    jsonResponse(deleteAdminPaintRender($pdo, (int) $matches[1]));
}

// Zdjęcia referencyjne aut leżą POZA katalogiem publicznym i wymagają
// zalogowania. Token idzie w adresie, bo <img> nie wyśle nagłówka
// Authorization; to jedyna trasa, która go tak przyjmuje, i tylko do odczytu
// obrazu, który i tak jest widoczny wyłącznie w panelu.
if ($method === 'GET' && preg_match('~^/admin/paint-reference/([a-z0-9-]+/[a-z0-9._-]+\.(?:jpg|jpeg|png|webp|avif))$~', $path, $matches)) {
    requireAdminToken($pdo, (string) ($_GET['token'] ?? ''));
    $file = projectRoot() . '/storage/paint-reference/' . $matches[1];
    if (!is_file($file)) {
        jsonResponse(['error' => 'Nie znaleziono zdjęcia referencyjnego.'], 404);
    }
    header('Content-Type: ' . (new finfo(FILEINFO_MIME_TYPE))->file($file));
    header('Cache-Control: private, max-age=3600');
    readfile($file);
    exit;
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
// Rendery lakierów: setki plików generowanych maszynowo, trzymane poza
// tabelą `media` i poza buildem frontendu. Wzorzec nie dopuszcza kropki
// poza rozszerzeniem, więc nie da się nim wyjść z katalogu.
if ($method === 'GET' && preg_match('~^/media/(paints/renders/[a-z0-9-]+/[a-z0-9_-]+\.(?:jpg|jpeg|png|webp|avif))$~', $path, $matches)) {
    $file = projectRoot() . '/public/media/' . $matches[1];
    if (!is_file($file)) {
        jsonResponse(['error' => 'Nie znaleziono renderu.'], 404);
    }
    header('Content-Type: ' . (new finfo(FILEINFO_MIME_TYPE))->file($file));
    header('Cache-Control: public, max-age=31536000, immutable');
    readfile($file);
    exit;
}

if ($method === 'GET' && preg_match('~^/media/((?:models|frames)/[a-z0-9-]+/[a-z0-9._-]+\.(?:jpg|jpeg|png|webp|avif)|categories/[a-z0-9._-]+\.(?:jpg|jpeg|png|webp|avif))$~', $path, $matches)) {
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
