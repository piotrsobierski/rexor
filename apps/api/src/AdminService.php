<?php

declare(strict_types=1);

function loginAdmin(PDO $pdo, array $input): array
{
    $email = strtolower(trim((string) ($input['email'] ?? '')));
    $password = (string) ($input['password'] ?? '');
    $statement = $pdo->prepare('SELECT * FROM admin_users WHERE email = :email AND is_active = TRUE');
    $statement->execute(['email' => $email]);
    $user = $statement->fetch();
    if (!$user || !password_verify($password, $user['password_hash'])) {
        throw new RuntimeException('Nieprawidłowy e-mail lub hasło.', 401);
    }
    $token = randomToken();
    $pdo->prepare('DELETE FROM admin_sessions WHERE expires_at <= UTC_TIMESTAMP()')->execute();
    $pdo->prepare('INSERT INTO admin_sessions (admin_user_id, token_hash, expires_at) VALUES (:user, :hash, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 12 HOUR))')->execute([
        'user' => $user['id'],
        'hash' => hash('sha256', $token),
    ]);
    $pdo->prepare('UPDATE admin_users SET last_login_at = UTC_TIMESTAMP() WHERE id = :id')->execute(['id' => $user['id']]);
    return ['token' => $token, 'user' => ['email' => $user['email'], 'displayName' => $user['display_name']]];
}

function adminCatalog(PDO $pdo): array
{
    return [
        'categories' => $pdo->query('SELECT id, slug, name, short_description, description_html, default_image_path, is_published, sort_order FROM bike_categories ORDER BY sort_order')->fetchAll(),
        'models' => $pdo->query('SELECT m.id, m.category_id, m.slug, m.name, m.short_description, m.description_html, m.base_price, m.default_image_path, m.status, COUNT(mm.media_id) AS media_count FROM bike_models m LEFT JOIN model_media mm ON mm.model_id = m.id GROUP BY m.id ORDER BY m.sort_order')->fetchAll(),
        'modelMedia' => $pdo->query('SELECT mm.model_id, mm.media_id, mm.role, mm.sort_order, me.storage_path, me.alt_text FROM model_media mm JOIN media me ON me.id = mm.media_id ORDER BY mm.model_id, mm.sort_order, mm.media_id')->fetchAll(),
        'batteries' => $pdo->query('SELECT id, model_id, code, name, short_label, cell_format, cell_manufacturer, cell_model, series_count, parallel_count, cell_capacity_ah, nominal_voltage_v, charge_voltage_v, pack_capacity_ah, nominal_energy_wh, bms_continuous_a, gross_price, sort_order, is_default, is_active FROM model_batteries ORDER BY model_id, sort_order, nominal_energy_wh')->fetchAll(),
        'parts' => $pdo->query('SELECT p.id, p.sku, p.name, p.manufacturer, p.model, p.gross_price, p.price_status, p.is_active, pg.name AS group_name FROM parts p JOIN part_groups pg ON pg.id = p.group_id ORDER BY pg.sort_order, p.name')->fetchAll(),
        'inquiries' => $pdo->query('SELECT i.id, i.status, c.public_id, c.customer_name, c.customer_email, c.gross_total, c.created_at FROM inquiries i JOIN configurations c ON c.id = i.configuration_id ORDER BY i.created_at DESC LIMIT 50')->fetchAll(),
        'pages' => $pdo->query('SELECT id, slug, title, navigation_label, excerpt, content_html, hero_image_path, is_published, updated_at FROM site_pages ORDER BY navigation_label')->fetchAll(),
        'theme' => json_decode((string) $pdo->query("SELECT value FROM site_settings WHERE setting_key = 'theme'")->fetchColumn(), true, 16, JSON_THROW_ON_ERROR),
    ];
}

function updateAdminRecord(PDO $pdo, string $resource, int $id, array $input): array
{
    $definitions = [
        'categories' => ['table' => 'bike_categories', 'fields' => ['name', 'short_description', 'description_html', 'default_image_path', 'is_published', 'sort_order']],
        'models' => ['table' => 'bike_models', 'fields' => ['name', 'short_description', 'description_html', 'base_price', 'default_image_path', 'status', 'sort_order']],
        'parts' => ['table' => 'parts', 'fields' => ['name', 'description', 'gross_price', 'price_status', 'image_path', 'is_active']],
        'pages' => ['table' => 'site_pages', 'fields' => ['title', 'navigation_label', 'excerpt', 'content_html', 'hero_image_path', 'is_published']],
    ];
    if (!isset($definitions[$resource])) {
        throw new InvalidArgumentException('Nieznany typ danych.');
    }
    $definition = $definitions[$resource];
    $updates = [];
    $parameters = ['id' => $id];
    foreach ($definition['fields'] as $field) {
        if (!array_key_exists($field, $input)) {
            continue;
        }
        $value = $input[$field];
        if ($field === 'description_html') {
            $value = sanitizeRichHtml((string) $value);
        }
        $updates[] = "{$field} = :{$field}";
        $parameters[$field] = $value;
    }
    if ($updates === []) {
        throw new InvalidArgumentException('Brak pól do zapisania.');
    }
    $statement = $pdo->prepare('UPDATE ' . $definition['table'] . ' SET ' . implode(', ', $updates) . ' WHERE id = :id');
    $statement->execute($parameters);
    return ['id' => $id, 'updated' => array_keys(array_diff_key($parameters, ['id' => true]))];
}

/**
 * Bateria ma pola wyliczalne: pojemność pakietu wynika z liczby gałęzi
 * równoległych i pojemności ogniwa, a energia z pojemności i napięcia
 * nominalnego. Liczymy je po stronie serwera, żeby panel nie mógł zapisać
 * pakietu, którego parametry nie trzymają się razem.
 */
function batteryPayload(array $input, array $current = []): array
{
    $value = static fn (string $field, mixed $fallback): mixed => array_key_exists($field, $input) ? $input[$field] : $fallback;

    $name = trim((string) $value('name', $current['name'] ?? ''));
    $cellFormat = trim((string) $value('cell_format', $current['cell_format'] ?? ''));
    $series = (int) $value('series_count', $current['series_count'] ?? 0);
    $parallel = (int) $value('parallel_count', $current['parallel_count'] ?? 0);
    $cellCapacity = (float) $value('cell_capacity_ah', $current['cell_capacity_ah'] ?? 0);
    $nominalVoltage = (float) $value('nominal_voltage_v', $current['nominal_voltage_v'] ?? 0);
    $chargeVoltage = (float) $value('charge_voltage_v', $current['charge_voltage_v'] ?? 0);
    $grossPrice = (float) $value('gross_price', $current['gross_price'] ?? 0);

    if ($name === '' || mb_strlen($name) > 200) {
        throw new InvalidArgumentException('Podaj nazwę pakietu baterii.');
    }
    if ($cellFormat === '' || mb_strlen($cellFormat) > 20) {
        throw new InvalidArgumentException('Podaj format ogniwa, na przykład 18650 albo 21700.');
    }
    if ($series < 1 || $parallel < 1) {
        throw new InvalidArgumentException('Liczba ogniw szeregowo i równolegle musi być większa od zera.');
    }
    if ($cellCapacity <= 0 || $nominalVoltage <= 0 || $chargeVoltage <= 0) {
        throw new InvalidArgumentException('Pojemność ogniwa oraz napięcia muszą być większe od zera.');
    }
    if ($chargeVoltage < $nominalVoltage) {
        throw new InvalidArgumentException('Napięcie ładowania nie może być niższe od nominalnego.');
    }
    if ($grossPrice < 0) {
        throw new InvalidArgumentException('Cena brutto nie może być ujemna.');
    }

    $bms = $value('bms_continuous_a', $current['bms_continuous_a'] ?? null);
    $packCapacity = round($parallel * $cellCapacity, 2);
    $energy = round($packCapacity * $nominalVoltage, 2);

    return [
        'name' => $name,
        'short_label' => sprintf('%s · %dS%dP · %s Wh', $cellFormat, $series, $parallel, number_format($energy, 1, ',', ' ')),
        'cell_format' => $cellFormat,
        'cell_manufacturer' => trim((string) $value('cell_manufacturer', $current['cell_manufacturer'] ?? '')) ?: null,
        'cell_model' => trim((string) $value('cell_model', $current['cell_model'] ?? '')) ?: null,
        'series_count' => $series,
        'parallel_count' => $parallel,
        'cell_capacity_ah' => $cellCapacity,
        'nominal_voltage_v' => $nominalVoltage,
        'charge_voltage_v' => $chargeVoltage,
        'pack_capacity_ah' => $packCapacity,
        'nominal_energy_wh' => $energy,
        'bms_continuous_a' => $bms === null || $bms === '' ? null : (float) $bms,
        'gross_price' => $grossPrice,
        'sort_order' => (int) $value('sort_order', $current['sort_order'] ?? 0),
        // Kolumny BOOLEAN dostają 0/1: PDO w trybie emulacji zapisałoby false
        // jako pusty łańcuch, którego strict mode MySQL nie przyjmie.
        'is_default' => $value('is_default', $current['is_default'] ?? false) ? 1 : 0,
        'is_active' => $value('is_active', $current['is_active'] ?? true) ? 1 : 0,
    ];
}

function saveAdminBattery(PDO $pdo, ?int $id, array $input): array
{
    if ($id !== null) {
        $statement = $pdo->prepare('SELECT * FROM model_batteries WHERE id = :id');
        $statement->execute(['id' => $id]);
        $current = $statement->fetch();
        if (!$current) {
            throw new InvalidArgumentException('Nie znaleziono baterii.');
        }
        $modelId = (int) $current['model_id'];
        $code = $current['code'];
    } else {
        $current = [];
        $modelId = (int) ($input['model_id'] ?? 0);
        $code = strtolower(trim((string) ($input['code'] ?? '')));
        if ($modelId <= 0) {
            throw new InvalidArgumentException('Wskaż model, do którego należy bateria.');
        }
        if (!preg_match('/^[a-z0-9][a-z0-9-]{1,59}$/', $code)) {
            throw new InvalidArgumentException('Kod baterii może zawierać małe litery, cyfry i myślnik.');
        }
    }

    $payload = batteryPayload($input, $current);
    $isDefault = $payload['is_default'] === 1;

    $pdo->beginTransaction();
    try {
        if ($id !== null) {
            $assignments = implode(', ', array_map(static fn (string $field): string => "{$field} = :{$field}", array_keys($payload)));
            $statement = $pdo->prepare("UPDATE model_batteries SET {$assignments} WHERE id = :id");
            $statement->execute($payload + ['id' => $id]);
        } else {
            $columns = array_keys($payload);
            $statement = $pdo->prepare(
                'INSERT INTO model_batteries (model_id, code, ' . implode(', ', $columns) . ') ' .
                'VALUES (:model_id, :code, :' . implode(', :', $columns) . ')'
            );
            $statement->execute($payload + ['model_id' => $modelId, 'code' => $code]);
            $id = (int) $pdo->lastInsertId();
        }
        // Dokładnie jeden pakiet domyślny na model wyznacza cenę bazową.
        if ($isDefault) {
            $pdo->prepare('UPDATE model_batteries SET is_default = FALSE WHERE model_id = :model AND id <> :id')
                ->execute(['model' => $modelId, 'id' => $id]);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }

    $statement = $pdo->prepare('SELECT id, model_id, code, name, short_label, cell_format, cell_manufacturer, cell_model, series_count, parallel_count, cell_capacity_ah, nominal_voltage_v, charge_voltage_v, pack_capacity_ah, nominal_energy_wh, bms_continuous_a, gross_price, sort_order, is_default, is_active FROM model_batteries WHERE id = :id');
    $statement->execute(['id' => $id]);
    return ['battery' => $statement->fetch()];
}

function updateTheme(PDO $pdo, array $input): array
{
    $fields = ['background', 'foreground', 'surface', 'muted', 'accent', 'accentForeground', 'border'];
    $theme = [];
    foreach ($fields as $field) {
        $value = strtolower(trim((string) ($input[$field] ?? '')));
        if (!preg_match('/^#[0-9a-f]{6}$/', $value)) {
            throw new InvalidArgumentException("Kolor {$field} musi mieć format #RRGGBB.");
        }
        $theme[$field] = $value;
    }
    $statement = $pdo->prepare("INSERT INTO site_settings (setting_key, value) VALUES ('theme', :value) ON DUPLICATE KEY UPDATE value = VALUES(value)");
    $statement->execute(['value' => json_encode($theme, JSON_THROW_ON_ERROR)]);
    return $theme;
}

function uploadAdminMedia(PDO $pdo): array
{
    if (!isset($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
        throw new InvalidArgumentException('Wybierz plik obrazu.');
    }
    $file = $_FILES['file'];
    if ($file['error'] !== UPLOAD_ERR_OK || $file['size'] > 8 * 1024 * 1024) {
        throw new InvalidArgumentException('Obraz jest za duży albo nie został poprawnie przesłany.');
    }
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/avif' => 'avif'];
    if (!isset($extensions[$mime])) {
        throw new InvalidArgumentException('Dozwolone formaty: JPG, PNG, WebP i AVIF.');
    }
    $dimensions = getimagesize($file['tmp_name']);
    if (!$dimensions || $dimensions[0] > 8000 || $dimensions[1] > 8000) {
        throw new InvalidArgumentException('Nieprawidłowe wymiary obrazu.');
    }

    $relativeDirectory = gmdate('Y/m');
    $directory = projectRoot() . '/storage/media/' . $relativeDirectory;
    if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
        throw new RuntimeException('Nie udało się utworzyć katalogu mediów.');
    }
    $filename = bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
    $target = $directory . '/' . $filename;
    if (!move_uploaded_file($file['tmp_name'], $target)) {
        throw new RuntimeException('Nie udało się zapisać obrazu.');
    }

    $storagePath = '/uploads/' . $relativeDirectory . '/' . $filename;
    $statement = $pdo->prepare('INSERT INTO media (storage_path, original_filename, mime_type, width_px, height_px, size_bytes, alt_text, caption) VALUES (:path, :original, :mime, :width, :height, :size, :alt, :caption)');
    $statement->execute([
        'path' => $storagePath,
        'original' => basename((string) $file['name']),
        'mime' => $mime,
        'width' => $dimensions[0],
        'height' => $dimensions[1],
        'size' => $file['size'],
        'alt' => trim((string) ($_POST['altText'] ?? '')),
        'caption' => trim((string) ($_POST['caption'] ?? '')),
    ]);
    $mediaId = (int) $pdo->lastInsertId();

    $ownerType = (string) ($_POST['ownerType'] ?? '');
    $ownerId = (int) ($_POST['ownerId'] ?? 0);
    $role = in_array($_POST['role'] ?? '', ['default', 'gallery', 'description', 'geometry'], true) ? $_POST['role'] : 'gallery';
    $maps = [
        'category' => ['table' => 'category_media', 'column' => 'category_id', 'allowedRoles' => ['default', 'gallery', 'description']],
        'model' => ['table' => 'model_media', 'column' => 'model_id', 'allowedRoles' => ['default', 'gallery', 'description', 'geometry']],
        'part' => ['table' => 'part_media', 'column' => 'part_id', 'allowedRoles' => ['default', 'gallery', 'description']],
    ];
    if ($ownerId > 0 && isset($maps[$ownerType])) {
        $map = $maps[$ownerType];
        if (!in_array($role, $map['allowedRoles'], true)) {
            $role = 'gallery';
        }
        $link = $pdo->prepare("INSERT INTO {$map['table']} ({$map['column']}, media_id, role, sort_order) VALUES (:owner, :media, :role, 0)");
        $link->execute(['owner' => $ownerId, 'media' => $mediaId, 'role' => $role]);
    }
    return ['id' => $mediaId, 'url' => $storagePath, 'width' => $dimensions[0], 'height' => $dimensions[1]];
}
