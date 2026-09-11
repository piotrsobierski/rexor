<?php

declare(strict_types=1);

function loginAdmin(PDO $pdo, array $input): array
{
    $email = strtolower(trim((string) ($input['email'] ?? '')));
    $password = (string) ($input['password'] ?? '');
    $statement = $pdo->prepare('SELECT * FROM admin_users WHERE email = :email AND is_active = TRUE');
    $statement->execute(['email' => $email]);
    $user = $statement->fetch();
    // TODO: dev-only bypass — password check disabled, re-enable password_verify() before deploying anywhere reachable.
    if (!$user) {
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
        'models' => $pdo->query('SELECT m.id, m.category_id, m.slug, m.name, m.short_description, m.description_html, m.computed_base_price_gross, m.frame_price_gross, m.assembly_price_gross, m.margin_percent, m.fit_requirements, m.default_image_path, m.status, COUNT(mm.media_id) AS media_count FROM bike_models m LEFT JOIN model_media mm ON mm.model_id = m.id GROUP BY m.id ORDER BY m.sort_order')->fetchAll(),
        'partGroups' => $pdo->query('SELECT id, slug, name, description, sort_order, is_required FROM part_groups ORDER BY sort_order, id')->fetchAll(),
        'modelParts' => $pdo->query('SELECT mp.model_id, mp.part_id, pg.slug AS group_slug, p.group_id, mp.is_default, mp.is_customer_configurable, mp.customer_supplied_allowed, mp.customer_supplied_gross_price, mp.gross_price_override, mp.sort_order, mp.notes FROM model_parts mp JOIN parts p ON p.id = mp.part_id JOIN part_groups pg ON pg.id = p.group_id ORDER BY mp.model_id, pg.sort_order, mp.sort_order')->fetchAll(),
        'modelGroupSettings' => $pdo->query('SELECT mpgs.model_id, mpgs.group_id, pg.slug AS group_slug, mpgs.selection_mode, mpgs.customer_part_allowed, mpgs.customer_part_gross_price, mpgs.customer_part_label, mpgs.helper_text FROM model_part_group_settings mpgs JOIN part_groups pg ON pg.id = mpgs.group_id ORDER BY mpgs.model_id, pg.sort_order')->fetchAll(),
        'modelSizes' => $pdo->query('SELECT id, model_id, code, label, price_delta_gross, sort_order, is_active FROM model_sizes ORDER BY model_id, sort_order, id')->fetchAll(),
        'modelPricing' => adminModelPricing($pdo),
        'modelMedia' => $pdo->query('SELECT mm.model_id, mm.media_id, mm.role, mm.sort_order, me.storage_path, me.alt_text FROM model_media mm JOIN media me ON me.id = mm.media_id ORDER BY mm.model_id, mm.sort_order, mm.media_id')->fetchAll(),
        'batteries' => $pdo->query('SELECT id, model_id, code, name, short_label, cell_format, cell_manufacturer, cell_model, series_count, parallel_count, cell_capacity_ah, nominal_voltage_v, charge_voltage_v, pack_capacity_ah, nominal_energy_wh, bms_continuous_a, gross_price, sort_order, is_default, is_active FROM model_batteries ORDER BY model_id, sort_order, nominal_energy_wh')->fetchAll(),
        'parts' => $pdo->query('SELECT p.id, p.group_id, p.sku, p.name, p.manufacturer, p.model, p.description, p.gross_price, p.price_status, p.fit_attributes, p.is_active, pg.slug AS group_slug, pg.name AS group_name FROM parts p JOIN part_groups pg ON pg.id = p.group_id ORDER BY pg.sort_order, p.name')->fetchAll(),
        'inquiries' => $pdo->query('SELECT i.id, i.status, c.public_id, c.customer_name, c.customer_email, c.gross_total, c.created_at FROM inquiries i JOIN configurations c ON c.id = i.configuration_id ORDER BY i.created_at DESC LIMIT 50')->fetchAll(),
        'pages' => $pdo->query('SELECT id, slug, title, navigation_label, excerpt, content_html, hero_image_path, is_published, updated_at FROM site_pages ORDER BY navigation_label')->fetchAll(),
        'theme' => json_decode((string) $pdo->query("SELECT value FROM site_settings WHERE setting_key = 'theme'")->fetchColumn(), true, 16, JSON_THROW_ON_ERROR),
    ];
}

function updateAdminRecord(PDO $pdo, string $resource, int $id, array $input): array
{
    $definitions = [
        'categories' => ['table' => 'bike_categories', 'fields' => ['name', 'short_description', 'description_html', 'default_image_path', 'is_published', 'sort_order']],
        'models' => ['table' => 'bike_models', 'fields' => ['category_id', 'name', 'short_description', 'description_html', 'frame_price_gross', 'assembly_price_gross', 'margin_percent', 'default_image_path', 'status', 'sort_order']],
        'parts' => ['table' => 'parts', 'fields' => ['name', 'description', 'gross_price', 'price_status', 'image_path', 'is_active']],
        'sizes' => ['table' => 'model_sizes', 'fields' => ['label', 'price_delta_gross', 'sort_order', 'is_active']],
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

    // Cena "od" jest wyliczana, nie wpisywana. Po każdej zmianie, która może
    // ruszyć sumę składników, przeliczamy dotknięte modele.
    $prices = [];
    if ($resource === 'models') {
        $prices = [$id => recomputeModelBasePrice($pdo, $id)];
    } elseif ($resource === 'parts') {
        $affected = $pdo->prepare('SELECT DISTINCT model_id FROM model_parts WHERE part_id = :part');
        $affected->execute(['part' => $id]);
        foreach ($affected->fetchAll() as $row) {
            $prices[(int) $row['model_id']] = recomputeModelBasePrice($pdo, (int) $row['model_id']);
        }
    } elseif ($resource === 'sizes') {
        $model = $pdo->prepare('SELECT model_id FROM model_sizes WHERE id = :id');
        $model->execute(['id' => $id]);
        $modelId = (int) $model->fetchColumn();
        if ($modelId > 0) {
            $prices = [$modelId => recomputeModelBasePrice($pdo, $modelId)];
        }
    }

    return ['id' => $id, 'updated' => array_keys(array_diff_key($parameters, ['id' => true])), 'recomputedBasePrices' => $prices];
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
        } else {
            // Model z bateriami musi mieć pakiet domyślny, bo to on wchodzi
            // w cenę "od". Bez niego katalog pokazałby rower bez baterii.
            $hasDefault = $pdo->prepare('SELECT COUNT(*) FROM model_batteries WHERE model_id = :model AND is_default = TRUE AND is_active = TRUE');
            $hasDefault->execute(['model' => $modelId]);
            if ((int) $hasDefault->fetchColumn() === 0) {
                $pdo->prepare('UPDATE model_batteries SET is_default = TRUE WHERE id = :id')->execute(['id' => $id]);
            }
        }
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }

    $statement = $pdo->prepare('SELECT id, model_id, code, name, short_label, cell_format, cell_manufacturer, cell_model, series_count, parallel_count, cell_capacity_ah, nominal_voltage_v, charge_voltage_v, pack_capacity_ah, nominal_energy_wh, bms_continuous_a, gross_price, sort_order, is_default, is_active FROM model_batteries WHERE id = :id');
    $statement->execute(['id' => $id]);
    // Bateria jest składnikiem ceny, więc zmiana pakietu domyślnego albo jego
    // ceny musi od razu przeliczyć cenę "od" modelu.
    return ['battery' => $statement->fetch(), 'basePriceGross' => recomputeModelBasePrice($pdo, $modelId)];
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

/** Limity z php.ini zapisane jako 32M albo 512K przeliczamy na bajty. */
function iniBytes(string $directive): int
{
    $value = trim((string) ini_get($directive));
    if ($value === '') {
        return 0;
    }
    $unit = strtolower(substr($value, -1));
    $number = (int) $value;
    return match ($unit) {
        'g' => $number * 1024 * 1024 * 1024,
        'm' => $number * 1024 * 1024,
        'k' => $number * 1024,
        default => $number,
    };
}

function formatMegabytes(int $bytes): string
{
    return number_format($bytes / (1024 * 1024), 1, ',', ' ') . ' MB';
}

function uploadAdminMedia(PDO $pdo): array
{
    // PHP odrzuca zbyt duże żądanie jeszcze przed wejściem tutaj: $_FILES
    // i $_POST są wtedy puste. Bez tego sprawdzenia panel pokazywał
    // "Wybierz plik obrazu" przy poprawnie wybranym zdjęciu z telefonu.
    $postLimit = iniBytes('post_max_size');
    $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($_FILES === [] && $postLimit > 0 && $contentLength > $postLimit) {
        throw new InvalidArgumentException(sprintf(
            'Plik ma %s, a serwer przyjmuje wysyłki do %s. Zmniejsz zdjęcie albo podnieś post_max_size.',
            formatMegabytes($contentLength),
            formatMegabytes($postLimit)
        ));
    }
    if (!isset($_FILES['file'])) {
        throw new InvalidArgumentException('Wybierz plik obrazu.');
    }
    $file = $_FILES['file'];
    $uploadLimit = iniBytes('upload_max_filesize');
    if ((int) $file['error'] === UPLOAD_ERR_INI_SIZE) {
        throw new InvalidArgumentException(sprintf(
            'Zdjęcie jest większe niż limit pojedynczego pliku (%s). Zmniejsz je albo podnieś upload_max_filesize.',
            formatMegabytes($uploadLimit)
        ));
    }
    if ((int) $file['error'] === UPLOAD_ERR_PARTIAL || (int) $file['error'] === UPLOAD_ERR_NO_FILE) {
        throw new InvalidArgumentException('Plik nie został przesłany w całości. Spróbuj ponownie.');
    }
    if ((int) $file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
        throw new InvalidArgumentException('Nie udało się odebrać pliku.');
    }
    // Limit aplikacji trzyma się limitu serwera, żeby komunikat nie obiecywał
    // więcej, niż PHP w ogóle przyjmie.
    $maxSize = $uploadLimit > 0 ? min($uploadLimit, 32 * 1024 * 1024) : 32 * 1024 * 1024;
    if ((int) $file['size'] > $maxSize) {
        throw new InvalidArgumentException(sprintf('Zdjęcie ma %s, a limit to %s.', formatMegabytes((int) $file['size']), formatMegabytes($maxSize)));
    }
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/avif' => 'avif'];
    if (!isset($extensions[$mime])) {
        throw new InvalidArgumentException('Dozwolone formaty: JPG, PNG, WebP i AVIF.');
    }
    // 12000 px mieści zdjęcia z aparatów 48 Mpix (np. 8064x6048).
    $dimensions = getimagesize($file['tmp_name']);
    if (!$dimensions || $dimensions[0] > 12000 || $dimensions[1] > 12000) {
        throw new InvalidArgumentException('Nieprawidłowe wymiary obrazu. Maksimum to 12000 px na krawędź.');
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

function deleteModelMedia(PDO $pdo, int $modelId, int $mediaId): array
{
    $pdo->beginTransaction();
    try {
        $statement = $pdo->prepare('DELETE FROM model_media WHERE model_id = :model AND media_id = :media');
        $statement->execute(['model' => $modelId, 'media' => $mediaId]);
        if ($statement->rowCount() === 0) {
            throw new InvalidArgumentException('To zdjęcie nie jest już przypisane do tego modelu.');
        }

        $stillLinked = false;
        foreach (['category_media', 'model_media', 'part_media'] as $joinTable) {
            $count = $pdo->prepare("SELECT COUNT(*) FROM {$joinTable} WHERE media_id = :media");
            $count->execute(['media' => $mediaId]);
            if ((int) $count->fetchColumn() > 0) {
                $stillLinked = true;
                break;
            }
        }

        if (!$stillLinked) {
            $media = $pdo->prepare('SELECT storage_path FROM media WHERE id = :id');
            $media->execute(['id' => $mediaId]);
            $storagePath = $media->fetchColumn();
            $pdo->prepare('DELETE FROM media WHERE id = :id')->execute(['id' => $mediaId]);
            // Tylko pliki wgrane przez panel (pod /uploads) mają fizyczną
            // kopię w storage/media — zdjęcia z preseedu (/media/...) są
            // współdzielonym zasobem statycznym i nie są tu kasowane.
            if (is_string($storagePath) && str_starts_with($storagePath, '/uploads/')) {
                $file = projectRoot() . '/storage/media/' . substr($storagePath, strlen('/uploads/'));
                if (is_file($file)) {
                    unlink($file);
                }
            }
        }
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }

    return ['modelId' => $modelId, 'mediaId' => $mediaId, 'deleted' => true];
}

/**
 * Rozbicie ceny "od" każdego modelu dla panelu: administrator widzi, z czego
 * wynika kwota, a nie tylko jej wynik. To jest odpowiedź na pytanie
 * „dlaczego ten rower kosztuje tyle”.
 */
function adminModelPricing(PDO $pdo): array
{
    $pricing = [];
    foreach ($pdo->query('SELECT * FROM bike_models ORDER BY sort_order')->fetchAll() as $model) {
        $modelId = (int) $model['id'];
        $groups = modelOptionGroups($pdo, $modelId);
        $defaultBattery = null;
        foreach (modelBatteries($pdo, $modelId) as $battery) {
            if ((bool) $battery['is_default']) {
                $defaultBattery = $battery;
                break;
            }
        }
        $model['adjustments'] = modelPriceAdjustments($pdo, $modelId);
        $result = priceConfiguration($model, $groups, null, $defaultBattery, []);
        $pricing[(string) $modelId] = [
            'modelId' => $modelId,
            'framePriceGross' => $result['framePriceGross'],
            'batteryPriceGross' => $result['batteryPriceGross'],
            'componentsPriceGross' => $result['componentsPriceGross'],
            'assemblyPriceGross' => $result['assemblyPriceGross'],
            'marginPercent' => $result['marginPercent'],
            'marginAmountGross' => $result['marginAmountGross'],
            'adjustments' => $result['adjustments'],
            'grossTotal' => $result['grossTotal'],
            'issues' => $result['issues'],
            'notes' => $result['notes'],
            'lines' => array_map(static fn (array $line): array => [
                'groupSlug' => $line['groupSlug'],
                'groupName' => $line['groupName'],
                'name' => $line['name'],
                'grossPrice' => $line['grossPrice'],
            ], $result['lines']),
        ];
    }
    return $pricing;
}

/**
 * Przypisanie części do modelu. Panel wysyła stan jednej pozycji, a nie
 * wyliczoną dopłatę: dopłata zawsze wynika z różnicy cen.
 *
 * Dostępność części definiujemy na poziomie modelu, bo zgodność wynika z ramy
 * i silnika, a nie z kategorii marketingowej. Żeby to nie było żmudne,
 * katalog części ma atrybuty zgodności, a model wymagania — panel podpowiada
 * tylko pasujące pozycje.
 */
function saveModelPart(PDO $pdo, array $input): array
{
    $modelId = (int) ($input['model_id'] ?? 0);
    $partId = (int) ($input['part_id'] ?? 0);
    if ($modelId <= 0 || $partId <= 0) {
        throw new InvalidArgumentException('Wskaż model i część.');
    }

    $partStatement = $pdo->prepare('SELECT p.id, p.group_id, p.name, pg.slug AS group_slug FROM parts p JOIN part_groups pg ON pg.id = p.group_id WHERE p.id = :id');
    $partStatement->execute(['id' => $partId]);
    $part = $partStatement->fetch();
    if (!$part) {
        throw new InvalidArgumentException('Nie znaleziono części.');
    }

    $pdo->beginTransaction();
    try {
        if (($input['assigned'] ?? true) === false) {
            $pdo->prepare('DELETE FROM model_parts WHERE model_id = :model AND part_id = :part')
                ->execute(['model' => $modelId, 'part' => $partId]);
        } else {
            $current = $pdo->prepare('SELECT * FROM model_parts WHERE model_id = :model AND part_id = :part');
            $current->execute(['model' => $modelId, 'part' => $partId]);
            $existing = $current->fetch() ?: [];
            $value = static fn (string $field, mixed $fallback): mixed => array_key_exists($field, $input) ? $input[$field] : ($existing[$field] ?? $fallback);

            $override = $value('gross_price_override', null);
            $payload = [
                'model' => $modelId,
                'part' => $partId,
                'is_default' => $value('is_default', false) ? 1 : 0,
                'is_customer_configurable' => $value('is_customer_configurable', true) ? 1 : 0,
                'customer_supplied_allowed' => $value('customer_supplied_allowed', false) ? 1 : 0,
                'customer_supplied_gross_price' => (float) $value('customer_supplied_gross_price', 0),
                'gross_price_override' => $override === null || $override === '' ? null : (float) $override,
                'notes' => ($notes = trim((string) $value('notes', ''))) !== '' ? $notes : null,
                'sort_order' => (int) $value('sort_order', 0),
            ];
            if ($payload['gross_price_override'] !== null && $payload['gross_price_override'] < 0) {
                throw new InvalidArgumentException('Cena dla modelu nie może być ujemna.');
            }

            $pdo->prepare(
                'INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order) ' .
                'VALUES (:model, :part, :is_default, :is_customer_configurable, :customer_supplied_allowed, :customer_supplied_gross_price, :gross_price_override, :notes, :sort_order) ' .
                'ON DUPLICATE KEY UPDATE is_default = VALUES(is_default), is_customer_configurable = VALUES(is_customer_configurable), ' .
                'customer_supplied_allowed = VALUES(customer_supplied_allowed), customer_supplied_gross_price = VALUES(customer_supplied_gross_price), ' .
                'gross_price_override = VALUES(gross_price_override), notes = VALUES(notes), sort_order = VALUES(sort_order)'
            )->execute($payload);

            // W grupie może być dokładnie jedna pozycja domyślna: to ona wyznacza
            // cenę "od" i punkt odniesienia dla pokazywanych różnic.
            if ($payload['is_default'] === 1) {
                $pdo->prepare(
                    'UPDATE model_parts mp JOIN parts p ON p.id = mp.part_id ' .
                    'SET mp.is_default = FALSE WHERE mp.model_id = :model AND p.group_id = :group AND mp.part_id <> :part'
                )->execute(['model' => $modelId, 'group' => $part['group_id'], 'part' => $partId]);
            }
        }
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }

    return [
        'modelId' => $modelId,
        'partId' => $partId,
        'groupSlug' => $part['group_slug'],
        'basePriceGross' => recomputeModelBasePrice($pdo, $modelId),
    ];
}

/** Tryb wyboru i część klienta dla całej grupy w obrębie modelu. */
function saveModelGroupSettings(PDO $pdo, array $input): array
{
    $modelId = (int) ($input['model_id'] ?? 0);
    $groupId = (int) ($input['group_id'] ?? 0);
    if ($modelId <= 0 || $groupId <= 0) {
        throw new InvalidArgumentException('Wskaż model i grupę części.');
    }
    $mode = (string) ($input['selection_mode'] ?? 'select_one');
    if (!in_array($mode, ['fixed', 'select_one', 'optional'], true)) {
        throw new InvalidArgumentException('Nieznany tryb wyboru grupy.');
    }
    $customerPrice = (float) ($input['customer_part_gross_price'] ?? 0);
    if ($customerPrice < 0) {
        throw new InvalidArgumentException('Wartość rozliczeniowa części klienta nie może być ujemna.');
    }
    $label = trim((string) ($input['customer_part_label'] ?? 'Dostarczam własną część'));
    $helper = trim((string) ($input['helper_text'] ?? ''));

    $pdo->prepare(
        'INSERT INTO model_part_group_settings (model_id, group_id, selection_mode, customer_part_allowed, customer_part_gross_price, customer_part_label, helper_text) ' .
        'VALUES (:model, :group, :mode, :allowed, :price, :label, :helper) ' .
        'ON DUPLICATE KEY UPDATE selection_mode = VALUES(selection_mode), customer_part_allowed = VALUES(customer_part_allowed), ' .
        'customer_part_gross_price = VALUES(customer_part_gross_price), customer_part_label = VALUES(customer_part_label), helper_text = VALUES(helper_text)'
    )->execute([
        'model' => $modelId,
        'group' => $groupId,
        'mode' => $mode,
        'allowed' => ($input['customer_part_allowed'] ?? false) ? 1 : 0,
        'price' => $customerPrice,
        'label' => $label !== '' ? $label : 'Dostarczam własną część',
        'helper' => $helper !== '' ? $helper : null,
    ]);

    return ['modelId' => $modelId, 'groupId' => $groupId, 'basePriceGross' => recomputeModelBasePrice($pdo, $modelId)];
}

/**
 * Skopiowanie osprzętu z innego modelu. Nowy model tej samej rodziny startuje
 * z gotowej listy, więc definiowanie per model nie oznacza wpisywania
 * wszystkiego od zera.
 */
function copyModelParts(PDO $pdo, int $targetModelId, int $sourceModelId): array
{
    if ($targetModelId === $sourceModelId) {
        throw new InvalidArgumentException('Model źródłowy i docelowy muszą być różne.');
    }
    $exists = $pdo->prepare('SELECT COUNT(*) FROM bike_models WHERE id IN (:target, :source)');
    $exists->execute(['target' => $targetModelId, 'source' => $sourceModelId]);
    if ((int) $exists->fetchColumn() !== 2) {
        throw new InvalidArgumentException('Nie znaleziono jednego z modeli.');
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM model_parts WHERE model_id = :model')->execute(['model' => $targetModelId]);
        $pdo->prepare('DELETE FROM model_part_group_settings WHERE model_id = :model')->execute(['model' => $targetModelId]);
        $pdo->prepare(
            'INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order) ' .
            'SELECT :target, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order ' .
            'FROM model_parts WHERE model_id = :source'
        )->execute(['target' => $targetModelId, 'source' => $sourceModelId]);
        $pdo->prepare(
            'INSERT INTO model_part_group_settings (model_id, group_id, selection_mode, customer_part_allowed, customer_part_gross_price, customer_part_label, helper_text) ' .
            'SELECT :target, group_id, selection_mode, customer_part_allowed, customer_part_gross_price, customer_part_label, helper_text ' .
            'FROM model_part_group_settings WHERE model_id = :source'
        )->execute(['target' => $targetModelId, 'source' => $sourceModelId]);
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }

    return ['modelId' => $targetModelId, 'copiedFrom' => $sourceModelId, 'basePriceGross' => recomputeModelBasePrice($pdo, $targetModelId)];
}
