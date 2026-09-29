<?php

declare(strict_types=1);

/**
 * Limit prób logowania per e-mail: bez tego /admin/login przyjmował dowolną
 * liczbę żądań z różnymi hasłami. Okno i próg są celowo szerokie (10 prób /
 * 15 minut) - to ochrona przed brute-force, nie normalna pomyłka w haśle.
 */
function assertLoginNotLocked(PDO $pdo, string $email): void
{
    $pdo->prepare('DELETE FROM admin_login_attempts WHERE created_at <= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)')->execute();

    $count = $pdo->prepare(
        'SELECT COUNT(*) FROM admin_login_attempts WHERE email = :email AND created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 MINUTE)'
    );
    $count->execute(['email' => $email]);
    if ((int) $count->fetchColumn() >= 10) {
        throw new RuntimeException('Zbyt wiele nieudanych prób logowania. Spróbuj ponownie za 15 minut.', 429);
    }
}

function recordFailedLogin(PDO $pdo, string $email): void
{
    $pdo->prepare('INSERT INTO admin_login_attempts (email, ip_address) VALUES (:email, :ip)')
        ->execute(['email' => $email, 'ip' => clientIp()]);
}

function loginAdmin(PDO $pdo, array $input): array
{
    $email = strtolower(trim((string) ($input['email'] ?? '')));
    $password = (string) ($input['password'] ?? '');
    assertLoginNotLocked($pdo, $email);
    $statement = $pdo->prepare('SELECT * FROM admin_users WHERE email = :email AND is_active = TRUE');
    $statement->execute(['email' => $email]);
    $user = $statement->fetch();
    if (!$user || !password_verify($password, $user['password_hash'])) {
        recordFailedLogin($pdo, $email);
        throw new RuntimeException('Nieprawidłowy e-mail lub hasło.', 401);
    }
    $pdo->prepare('DELETE FROM admin_login_attempts WHERE email = :email')->execute(['email' => $email]);
    $token = randomToken();
    $pdo->prepare('DELETE FROM admin_sessions WHERE expires_at <= UTC_TIMESTAMP()')->execute();
    $pdo->prepare('INSERT INTO admin_sessions (admin_user_id, token_hash, expires_at) VALUES (:user, :hash, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 12 HOUR))')->execute([
        'user' => $user['id'],
        'hash' => hash('sha256', $token),
    ]);
    $pdo->prepare('UPDATE admin_users SET last_login_at = UTC_TIMESTAMP() WHERE id = :id')->execute(['id' => $user['id']]);
    return ['token' => $token, 'user' => ['email' => $user['email'], 'displayName' => $user['display_name']]];
}

/** PDO może zwracać TINYINT jako tekst; JSON powinien zawierać prawdziwe booleany. */
function normalizeAdminFlags(array $rows, array $fields): array
{
    foreach ($rows as &$row) {
        foreach ($fields as $field) {
            if (array_key_exists($field, $row)) {
                $row[$field] = (bool) $row[$field];
            }
        }
    }
    unset($row);
    return $rows;
}

function adminCatalog(PDO $pdo): array
{
    $catalog = [
        'categories' => $pdo->query('SELECT id, slug, name, short_description, description_html, default_image_path, hero_image_path, show_hero_image, icon_key, is_published, sort_order FROM bike_categories ORDER BY sort_order')->fetchAll(),
        'models' => $pdo->query('SELECT m.id, m.category_id, m.slug, m.name, m.short_description, m.description_html, m.computed_base_price_gross, m.frame_price_gross, m.assembly_price_gross, m.margin_percent, m.default_image_path, m.status, m.is_recommended, COUNT(mm.media_id) AS media_count FROM bike_models m LEFT JOIN model_media mm ON mm.model_id = m.id GROUP BY m.id ORDER BY m.sort_order')->fetchAll(),
        'partGroups' => $pdo->query('SELECT id, slug, name, description, sort_order, is_required FROM part_groups ORDER BY sort_order, id')->fetchAll(),
        'modelParts' => $pdo->query('SELECT mp.model_id, mp.part_id, pg.slug AS group_slug, p.group_id, mp.is_default, mp.is_customer_configurable, mp.customer_supplied_allowed, mp.customer_supplied_gross_price, mp.gross_price_override, mp.sort_order, mp.notes FROM model_parts mp JOIN parts p ON p.id = mp.part_id JOIN part_groups pg ON pg.id = p.group_id ORDER BY mp.model_id, pg.sort_order, mp.sort_order')->fetchAll(),
        'modelGroupSettings' => $pdo->query('SELECT mpgs.model_id, mpgs.group_id, pg.slug AS group_slug, mpgs.selection_mode, mpgs.customer_part_allowed, mpgs.customer_part_gross_price, mpgs.customer_part_label, mpgs.helper_text FROM model_part_group_settings mpgs JOIN part_groups pg ON pg.id = mpgs.group_id ORDER BY mpgs.model_id, pg.sort_order')->fetchAll(),
        'modelSizes' => $pdo->query('SELECT id, model_id, code, label, price_delta_gross, sort_order, is_active FROM model_sizes ORDER BY model_id, sort_order, id')->fetchAll(),
        'modelPricing' => adminModelPricing($pdo),
        'modelMedia' => $pdo->query('SELECT mm.model_id, mm.media_id, mm.role, mm.sort_order, me.storage_path, me.alt_text FROM model_media mm JOIN media me ON me.id = mm.media_id ORDER BY mm.model_id, mm.sort_order, mm.media_id')->fetchAll(),
        'batteries' => $pdo->query('SELECT id, model_id, code, name, short_label, cell_format, cell_manufacturer, cell_model, series_count, parallel_count, cell_capacity_ah, nominal_voltage_v, charge_voltage_v, pack_capacity_ah, nominal_energy_wh, bms_continuous_a, gross_price, sort_order, is_default, is_active FROM model_batteries ORDER BY model_id, sort_order, nominal_energy_wh')->fetchAll(),
        'parts' => $pdo->query('SELECT p.id, p.group_id, p.sku, p.name, p.manufacturer, p.model, p.description, p.gross_price, p.price_status, p.image_path, p.is_active, pg.slug AS group_slug, pg.name AS group_name FROM parts p JOIN part_groups pg ON pg.id = p.group_id ORDER BY pg.sort_order, p.name')->fetchAll(),
        'inquiries' => $pdo->query('SELECT i.id, i.status, c.public_id, c.customer_name, c.customer_email, c.gross_total, c.created_at FROM inquiries i JOIN configurations c ON c.id = i.configuration_id ORDER BY i.created_at DESC LIMIT 50')->fetchAll(),
        'pages' => $pdo->query('SELECT id, slug, title, navigation_label, excerpt, content_html, hero_image_path, is_published, updated_at FROM site_pages ORDER BY navigation_label')->fetchAll(),
        'theme' => json_decode((string) $pdo->query("SELECT value FROM site_settings WHERE setting_key = 'theme'")->fetchColumn(), true, 16, JSON_THROW_ON_ERROR),
        'modelSpecifications' => (function () use ($pdo) {
            $rows = $pdo->query('SELECT id, specifications FROM bike_models')->fetchAll();
            $result = [];
            foreach ($rows as $row) {
                $result[$row['id']] = $row['specifications'] ? json_decode((string) $row['specifications'], true, 64, JSON_THROW_ON_ERROR) : [];
            }
            return $result;
        })(),
        'copy' => (function () use ($pdo) {
            $value = $pdo->query("SELECT value FROM site_settings WHERE setting_key = 'copy'")->fetchColumn();
            return $value ? json_decode((string) $value, true, 512, JSON_THROW_ON_ERROR) : null;
        })(),
        'chatbotPrompt' => (function () use ($pdo) {
            $value = $pdo->query("SELECT value FROM site_settings WHERE setting_key = 'chatbot_prompt'")->fetchColumn();
            $stored = $value ? json_decode((string) $value, true, 16, JSON_THROW_ON_ERROR) : [];
            return [
                'instructions' => $stored['instructions'] ?? '',
                'extra_context' => $stored['extra_context'] ?? '',
                // Punkt startowy do edycji w panelu - to, co faktycznie wysyłamy dziś, gdy admin nic nie nadpisał.
                'default_instructions' => defaultChatbotInstructions(),
            ];
        })(),
        'frames' => adminFrames($pdo),
        'frameMedia' => adminFrameMedia($pdo),
        'frameSizes' => adminFrameSizes($pdo),
        'projects' => adminProjects($pdo),
        'projectMedia' => adminProjectMedia($pdo),
        'branding' => getBranding($pdo),
        'mailRouting' => getMailRouting($pdo),
        'configurationEmailTemplate' => getConfigurationEmailTemplate($pdo),
    ];
    $flagFields = [
        'categories' => ['is_published', 'show_hero_image'],
        'models' => ['is_recommended'],
        'partGroups' => ['is_required'],
        'modelParts' => ['is_default', 'is_customer_configurable', 'customer_supplied_allowed'],
        'modelGroupSettings' => ['customer_part_allowed'],
        'modelSizes' => ['is_active'],
        'frameSizes' => ['is_active'],
        'batteries' => ['is_default', 'is_active'],
        'parts' => ['is_active'],
        'pages' => ['is_published'],
        'frames' => ['paint_available', 'is_recommended'],
        'projects' => ['is_published'],
    ];
    foreach ($flagFields as $collection => $fields) {
        $catalog[$collection] = normalizeAdminFlags($catalog[$collection], $fields);
    }
    return $catalog;

}

function updateAdminRecord(PDO $pdo, string $resource, int $id, array $input): array
{
    $definitions = [
        'categories' => ['table' => 'bike_categories', 'fields' => ['name', 'short_description', 'description_html', 'default_image_path', 'hero_image_path', 'show_hero_image', 'icon_key', 'is_published', 'sort_order']],
        'models' => ['table' => 'bike_models', 'fields' => ['category_id', 'name', 'short_description', 'description_html', 'frame_price_gross', 'assembly_price_gross', 'margin_percent', 'default_image_path', 'status', 'is_recommended', 'sort_order', 'specifications']],
        'parts' => ['table' => 'parts', 'fields' => ['name', 'group_id', 'description', 'gross_price', 'price_status', 'image_path', 'is_active']],
        'sizes' => ['table' => 'model_sizes', 'fields' => ['label', 'price_delta_gross', 'sort_order', 'is_active']],
        'frame-sizes' => ['table' => 'frame_sizes', 'fields' => ['label', 'sort_order', 'is_active']],
        'pages' => ['table' => 'site_pages', 'fields' => ['title', 'navigation_label', 'excerpt', 'content_html', 'hero_image_path', 'is_published']],
        'frames' => [
            'table' => 'frames',
            'fields' => ['category_id', 'name', 'manufacturer', 'short_description', 'description_html', 'geometry_html', 'specifications', 'price_gross', 'currency', 'paint_available', 'is_recommended', 'source_url', 'default_image_path', 'status', 'sort_order'],
            // Puste pole w panelu znaczy "brak wartości", nie pusty tekst:
            // price_gross = NULL to "wymaga wyceny", nie cena zerowa.
            'nullable' => ['manufacturer', 'short_description', 'price_gross', 'source_url', 'default_image_path'],
        ],
        'projects' => [
            'table' => 'projects',
            'fields' => ['title', 'short_description', 'content_html', 'specification', 'category_id', 'completed_at', 'cover_image_path', 'is_published', 'sort_order'],
            'nullable' => ['short_description', 'category_id', 'completed_at', 'cover_image_path'],
        ],
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
        if (in_array($field, ['description_html', 'geometry_html', 'content_html'], true)) {
            $value = sanitizeRichHtml((string) $value);
        } elseif (in_array($field, ['specifications', 'specification'], true)) {
            // `frames.specifications` to obiekt { facts: [...] }, a
            // `projects.specification` lista par - json_encode zachowuje
            // jedno i drugie, bo (array) nie zmienia kształtu tablicy.
            $value = $value === null ? null : json_encode((array) $value, JSON_THROW_ON_ERROR);
        } elseif ($value === '' && in_array($field, $definition['nullable'] ?? [], true)) {
            $value = null;
        }
        // PDO bez jawnego typu wiąże PHP-owe false jako pusty ciąg, a MySQL w
        // trybie ścisłym odrzuca '' dla kolumny TINYINT(1). Przez to KAŻDY
        // zapis odznaczonego pola wyboru wywracał cały UPDATE (nie tylko to
        // jedno pole), a panel pokazywał błąd SQL zamiast zapisać zmianę.
        if (is_bool($value)) {
            $value = $value ? 1 : 0;
        }
        $updates[] = "{$field} = :{$field}";
        $parameters[$field] = $value;
    }
    if ($updates === []) {
        throw new InvalidArgumentException('Brak pól do zapisania.');
    }
    // Model/rama bez aktywnego rozmiaru przechodzi przez konfigurator/formularz
    // zapytania, ale nie da się jej sensownie zamówić - `sizeCode` wysłany do
    // /configurations (albo puste pole rozmiaru w zapytaniu o ramę) trafia w
    // pustkę. Łapiemy to tutaj, zanim model/rama w ogóle trafi na stronę
    // publiczną, zamiast dopiero przy pierwszym zamówieniu klienta.
    $publishSizeGuards = [
        'models' => ['table' => 'model_sizes', 'column' => 'model_id', 'label' => 'modelu', 'section' => 'Rozmiary i dopłaty'],
        'frames' => ['table' => 'frame_sizes', 'column' => 'frame_id', 'label' => 'ramy', 'section' => 'Rozmiary'],
    ];
    if (isset($publishSizeGuards[$resource]) && ($parameters['status'] ?? null) === 'published') {
        $guard = $publishSizeGuards[$resource];
        $sizeCount = $pdo->prepare("SELECT COUNT(*) FROM {$guard['table']} WHERE {$guard['column']} = :parent AND is_active = TRUE");
        $sizeCount->execute(['parent' => $id]);
        if ((int) $sizeCount->fetchColumn() === 0) {
            throw new InvalidArgumentException("Nie można opublikować {$guard['label']} bez rozmiaru. Dodaj co najmniej jeden aktywny rozmiar w sekcji „{$guard['section']}”.");
        }
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

    $changedFields = array_keys(array_diff_key($parameters, ['id' => true]));
    logActivity(
        $pdo,
        'record_updated',
        'admin',
        currentAdmin()['email'] ?? null,
        "Zmieniono {$resource} #{$id}: " . implode(', ', $changedFields) . '.',
        ['resource' => $resource, 'id' => $id, 'fields' => $changedFields]
    );

    return ['id' => $id, 'updated' => $changedFields, 'recomputedBasePrices' => $prices];
}

/**
 * Widok "Dziennik aktywności" w panelu admina: kto/co/kiedy, stronicowany po
 * malejącym id (najnowsze najpierw). eventType filtruje po typie zdarzenia
 * (np. tylko 'chat_message'), beforeId pobiera kolejną stronę starszych wpisów.
 */
function activityLog(PDO $pdo, int $limit, ?int $beforeId, ?string $eventType): array
{
    $limit = max(1, min($limit, 200));
    $conditions = [];
    $params = [];
    if ($beforeId !== null) {
        $conditions[] = 'id < :before_id';
        $params['before_id'] = $beforeId;
    }
    if ($eventType !== null && $eventType !== '') {
        $conditions[] = 'event_type = :event_type';
        $params['event_type'] = $eventType;
    }
    $where = $conditions !== [] ? 'WHERE ' . implode(' AND ', $conditions) : '';
    // $limit jest zaciśnięty do liczby całkowitej powyżej, więc jest bezpieczny
    // do interpolacji — LIMIT jako parametr wiązany wymagałby jawnego
    // PDO::PARAM_INT przy wyłączonej emulacji przygotowanych zapytań.
    $statement = $pdo->prepare("SELECT id, event_type, actor_type, actor_label, ip_address, summary, details, created_at FROM activity_log {$where} ORDER BY id DESC LIMIT {$limit}");
    $statement->execute($params);
    $rows = $statement->fetchAll();
    foreach ($rows as &$row) {
        $row['id'] = (int) $row['id'];
        $row['details'] = $row['details'] !== null ? json_decode((string) $row['details'], true, 32, JSON_THROW_ON_ERROR) : null;
    }
    unset($row);

    return ['items' => $rows, 'nextBeforeId' => $rows !== [] ? (int) end($rows)['id'] : null];
}

function slugify(string $value, string $fallback = 'element'): string
{
    $ascii = iconv('UTF-8', 'ASCII//TRANSLIT', $value) ?: $value;
    $slug = strtolower(trim((string) preg_replace('/[^a-zA-Z0-9]+/', '-', $ascii), '-'));
    return $slug !== '' ? $slug : $fallback;
}

function uniqueSlug(PDO $pdo, string $table, string $base): string
{
    $slug = $base;
    $suffix = 2;
    $exists = $pdo->prepare("SELECT COUNT(*) FROM {$table} WHERE slug = :slug");
    while (true) {
        $exists->execute(['slug' => $slug]);
        if ((int) $exists->fetchColumn() === 0) {
            return $slug;
        }
        $slug = "{$base}-{$suffix}";
        $suffix++;
    }
}

function createAdminModel(PDO $pdo, array $input): array
{
    $name = trim((string) ($input['name'] ?? ''));
    $categoryId = (int) ($input['category_id'] ?? 0);
    if ($name === '' || $categoryId <= 0) {
        throw new InvalidArgumentException('Podaj nazwę i kategorię modelu.');
    }

    $category = $pdo->prepare('SELECT id FROM bike_categories WHERE id = :id');
    $category->execute(['id' => $categoryId]);
    if (!$category->fetch()) {
        throw new InvalidArgumentException('Nieznana kategoria.');
    }

    $slug = uniqueSlug($pdo, 'bike_models', slugify($name, 'model'));
    $nextSort = (int) $pdo->query('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM bike_models')->fetchColumn();

    $statement = $pdo->prepare(
        'INSERT INTO bike_models (category_id, slug, name, short_description, status, sort_order) ' .
        'VALUES (:category_id, :slug, :name, :short_description, :status, :sort_order)'
    );
    $statement->execute([
        'category_id' => $categoryId,
        'slug' => $slug,
        'name' => $name,
        'short_description' => ($short = trim((string) ($input['short_description'] ?? ''))) !== '' ? $short : null,
        'status' => in_array($input['status'] ?? 'draft', ['draft', 'published', 'archived'], true) ? ($input['status'] ?? 'draft') : 'draft',
        'sort_order' => $nextSort,
    ]);

    $newId = (int) $pdo->lastInsertId();
    logActivity($pdo, 'model_created', 'admin', currentAdmin()['email'] ?? null, "Utworzono model \"{$name}\" (#{$newId}).", ['id' => $newId, 'slug' => $slug, 'name' => $name]);

    return ['id' => $newId, 'slug' => $slug];
}

function createAdminPart(PDO $pdo, array $input): array
{
    $name = trim((string) ($input['name'] ?? ''));
    $groupId = (int) ($input['group_id'] ?? 0);
    if ($name === '' || $groupId <= 0) {
        throw new InvalidArgumentException('Podaj nazwę i kategorię części.');
    }

    $group = $pdo->prepare('SELECT id FROM part_groups WHERE id = :id');
    $group->execute(['id' => $groupId]);
    if (!$group->fetch()) {
        throw new InvalidArgumentException('Nieznana kategoria części.');
    }

    $sku = trim((string) ($input['sku'] ?? ''));
    if ($sku === '') {
        $sku = slugify($name);
    }
    $baseSku = $sku;
    $suffix = 2;
    $exists = $pdo->prepare('SELECT COUNT(*) FROM parts WHERE sku = :sku');
    while (true) {
        $exists->execute(['sku' => $sku]);
        if ((int) $exists->fetchColumn() === 0) {
            break;
        }
        $sku = "{$baseSku}-{$suffix}";
        $suffix++;
    }

    $grossPrice = $input['gross_price'] ?? null;
    $priceStatus = $input['price_status'] ?? 'fixed';
    if (!in_array($priceStatus, ['fixed', 'quote'], true)) {
        $priceStatus = 'fixed';
    }
    $statement = $pdo->prepare(
        'INSERT INTO parts (group_id, sku, name, manufacturer, model, description, price_status, gross_price, is_active) ' .
        'VALUES (:group_id, :sku, :name, :manufacturer, :model, :description, :price_status, :gross_price, TRUE)'
    );
    $statement->execute([
        'group_id' => $groupId,
        'sku' => $sku,
        'name' => $name,
        'manufacturer' => ($manufacturer = trim((string) ($input['manufacturer'] ?? ''))) !== '' ? $manufacturer : null,
        'model' => ($model = trim((string) ($input['model'] ?? ''))) !== '' ? $model : null,
        'description' => ($description = trim((string) ($input['description'] ?? ''))) !== '' ? $description : null,
        'price_status' => $priceStatus,
        'gross_price' => $grossPrice === null || $grossPrice === '' ? null : (float) $grossPrice,
    ]);

    $newId = (int) $pdo->lastInsertId();
    logActivity($pdo, 'part_created', 'admin', currentAdmin()['email'] ?? null, "Utworzono część \"{$name}\" (#{$newId}).", ['id' => $newId, 'sku' => $sku, 'name' => $name]);

    return ['id' => $newId, 'sku' => $sku];
}

function deleteAdminPart(PDO $pdo, int $id): array
{
    $usage = $pdo->prepare('SELECT COUNT(*) FROM model_parts WHERE part_id = :id');
    $usage->execute(['id' => $id]);
    $modelCount = (int) $usage->fetchColumn();
    if ($modelCount > 0) {
        throw new InvalidArgumentException(
            "Ta część jest przypisana do {$modelCount} " . ($modelCount === 1 ? 'modelu' : 'modeli') . '. Odepnij ją najpierw w zakładce „Osprzęt i cena modelu" albo klikając chip modelu w tabeli części.'
        );
    }

    // part_media, category_parts i part_compatibility_rules mają ON DELETE
    // CASCADE - czyszczą się same. model_parts ma RESTRICT (sprawdzone wyżej),
    // a configuration_items ustawia part_id na NULL, więc historyczne
    // zapytania klientów zachowują swoją treść nawet po usunięciu części.
    $pdo->beginTransaction();
    try {
        $media = $pdo->prepare('SELECT media_id FROM part_media WHERE part_id = :id');
        $media->execute(['id' => $id]);
        $mediaIds = array_map('intval', $media->fetchAll(PDO::FETCH_COLUMN));

        $statement = $pdo->prepare('DELETE FROM parts WHERE id = :id');
        $statement->execute(['id' => $id]);
        if ($statement->rowCount() === 0) {
            throw new InvalidArgumentException('Nie znaleziono części.');
        }
        // Kaskada zdejmuje powiązania part_media, ale o wierszach `media`
        // i plikach w storage nie wie - tak samo jak przy ramach.
        foreach ($mediaIds as $mediaId) {
            deleteOrphanMedia($pdo, $mediaId);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }

    logActivity($pdo, 'part_deleted', 'admin', currentAdmin()['email'] ?? null, "Usunięto część #{$id}.", ['id' => $id]);

    return ['id' => $id, 'deleted' => true];
}

/**
 * Usuwanie modelu. Kaskady w bazie sprzątają wszystko, co należy wyłącznie do
 * modelu (rozmiary, baterie, osprzęt, ustawienia grup, korekty ceny, powiązania
 * zdjęć), ale `configurations.model_id` ma RESTRICT - zapytania klientów są
 * dokumentem i nie mogą zniknąć razem z modelem. Dlatego zamiast pozwolić
 * bazie rzucić surowy błąd FK, sprawdzamy to wcześniej i mówimy, co zrobić.
 */
function deleteAdminModel(PDO $pdo, int $id): array
{
    $model = $pdo->prepare('SELECT name FROM bike_models WHERE id = :id');
    $model->execute(['id' => $id]);
    $name = $model->fetchColumn();
    if ($name === false) {
        throw new InvalidArgumentException('Nie znaleziono modelu.');
    }

    $usage = $pdo->prepare('SELECT COUNT(*) FROM configurations WHERE model_id = :id');
    $usage->execute(['id' => $id]);
    $configurationCount = (int) $usage->fetchColumn();
    if ($configurationCount > 0) {
        throw new InvalidArgumentException(
            "Model ma {$configurationCount} " . ($configurationCount === 1 ? 'zapisaną konfigurację klienta' : 'zapisanych konfiguracji klientów')
            . '. Usunięcie modelu skasowałoby historię zapytań, więc zamiast tego ustaw status „archived” - model zniknie ze strony, a zapytania zostaną.'
        );
    }

    $pdo->beginTransaction();
    try {
        $media = $pdo->prepare('SELECT media_id FROM model_media WHERE model_id = :id');
        $media->execute(['id' => $id]);
        $mediaIds = array_map('intval', $media->fetchAll(PDO::FETCH_COLUMN));

        $pdo->prepare('DELETE FROM bike_models WHERE id = :id')->execute(['id' => $id]);
        foreach ($mediaIds as $mediaId) {
            deleteOrphanMedia($pdo, $mediaId);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }

    logActivity($pdo, 'model_deleted', 'admin', currentAdmin()['email'] ?? null, "Usunięto model \"{$name}\" (#{$id}).", ['id' => $id, 'name' => $name]);

    return ['id' => $id, 'deleted' => true];
}

function createAdminCategory(PDO $pdo, array $input): array
{
    $name = trim((string) ($input['name'] ?? ''));
    if ($name === '') {
        throw new InvalidArgumentException('Podaj nazwę kategorii.');
    }

    $slug = uniqueSlug($pdo, 'bike_categories', slugify($name, 'kategoria'));
    $nextSort = (int) $pdo->query('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM bike_categories')->fetchColumn();

    $iconKey = trim((string) ($input['icon_key'] ?? ''));

    $statement = $pdo->prepare(
        'INSERT INTO bike_categories (slug, name, short_description, icon_key, sort_order, is_published) ' .
        'VALUES (:slug, :name, :short_description, :icon_key, :sort_order, 0)'
    );
    $statement->execute([
        'slug' => $slug,
        'name' => $name,
        'short_description' => ($short = trim((string) ($input['short_description'] ?? ''))) !== '' ? $short : null,
        'icon_key' => $iconKey !== '' ? $iconKey : null,
        'sort_order' => $nextSort,
    ]);

    $newId = (int) $pdo->lastInsertId();
    logActivity($pdo, 'category_created', 'admin', currentAdmin()['email'] ?? null, "Utworzono kategorię \"{$name}\" (#{$newId}).", ['id' => $newId, 'slug' => $slug, 'name' => $name]);

    return ['id' => $newId, 'slug' => $slug];
}

/**
 * Usuwanie kategorii. Modele i ramy wskazują na kategorię przez RESTRICT
 * (kategoria jest ich wymaganą częścią), realizacje przez SET NULL - te
 * ostatnie przeżyją usunięcie, tylko wypadną z filtrów, więc liczymy je
 * w ostrzeżeniu zamiast blokować.
 */
function deleteAdminCategory(PDO $pdo, int $id): array
{
    $category = $pdo->prepare('SELECT name FROM bike_categories WHERE id = :id');
    $category->execute(['id' => $id]);
    $name = $category->fetchColumn();
    if ($name === false) {
        throw new InvalidArgumentException('Nie znaleziono kategorii.');
    }

    foreach ([['bike_models', 'modeli', 'model'], ['frames', 'ram', 'ramę']] as [$table, $plural, $singular]) {
        $usage = $pdo->prepare("SELECT COUNT(*) FROM {$table} WHERE category_id = :id");
        $usage->execute(['id' => $id]);
        $count = (int) $usage->fetchColumn();
        if ($count > 0) {
            throw new InvalidArgumentException(
                "Kategoria zawiera {$count} " . ($count === 1 ? $singular : $plural)
                . '. Przenieś je najpierw do innej kategorii albo usuń.'
            );
        }
    }

    $pdo->beginTransaction();
    try {
        $media = $pdo->prepare('SELECT media_id FROM category_media WHERE category_id = :id');
        $media->execute(['id' => $id]);
        $mediaIds = array_map('intval', $media->fetchAll(PDO::FETCH_COLUMN));

        $pdo->prepare('DELETE FROM bike_categories WHERE id = :id')->execute(['id' => $id]);
        foreach ($mediaIds as $mediaId) {
            deleteOrphanMedia($pdo, $mediaId);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }

    logActivity($pdo, 'category_deleted', 'admin', currentAdmin()['email'] ?? null, "Usunięto kategorię \"{$name}\" (#{$id}).", ['id' => $id, 'name' => $name]);

    return ['id' => $id, 'deleted' => true];
}

/**
 * Dodanie rozmiaru ramy. `geometry` jest kolumną JSON NOT NULL bez wartości
 * domyślnej, a panel nie ma na razie edytora geometrii - nowy rozmiar startuje
 * więc z pustym obiektem i tabela geometrii po prostu go pomija, dopóki ktoś
 * nie uzupełni danych.
 */
function createAdminSize(PDO $pdo, array $input): array
{
    $modelId = (int) ($input['model_id'] ?? 0);
    $code = trim((string) ($input['code'] ?? ''));
    $label = trim((string) ($input['label'] ?? ''));

    if ($modelId <= 0) {
        throw new InvalidArgumentException('Wskaż model.');
    }
    if ($code === '' || mb_strlen($code) > 40) {
        throw new InvalidArgumentException('Podaj oznaczenie rozmiaru (np. M), maksymalnie 40 znaków.');
    }
    if ($label === '' || mb_strlen($label) > 120) {
        throw new InvalidArgumentException('Podaj nazwę rozmiaru widoczną dla klienta, maksymalnie 120 znaków.');
    }

    $model = $pdo->prepare('SELECT name FROM bike_models WHERE id = :id');
    $model->execute(['id' => $modelId]);
    $modelName = $model->fetchColumn();
    if ($modelName === false) {
        throw new InvalidArgumentException('Nie znaleziono modelu.');
    }

    // UNIQUE (model_id, code) złapałby to samo, ale surowy błąd klucza jest
    // dla admina nieczytelny.
    $duplicate = $pdo->prepare('SELECT 1 FROM model_sizes WHERE model_id = :model AND code = :code');
    $duplicate->execute(['model' => $modelId, 'code' => $code]);
    if ($duplicate->fetchColumn() !== false) {
        throw new InvalidArgumentException("Model ma już rozmiar o oznaczeniu „{$code}”.");
    }

    $priceDelta = (float) ($input['price_delta_gross'] ?? 0);
    if ($priceDelta < 0) {
        throw new InvalidArgumentException('Dopłata za rozmiar nie może być ujemna.');
    }

    $height = static function (string $field) use ($input): ?int {
        $raw = $input[$field] ?? null;
        if ($raw === null || $raw === '') {
            return null;
        }
        $value = (int) $raw;

        return $value > 0 ? $value : null;
    };

    $statement = $pdo->prepare(
        'INSERT INTO model_sizes (model_id, code, label, price_delta_gross, rider_height_min_cm, rider_height_max_cm, geometry, source_url, sort_order, is_active) ' .
        'VALUES (:model, :code, :label, :price_delta, :height_min, :height_max, :geometry, :source_url, :sort_order, :is_active)'
    );
    $statement->execute([
        'model' => $modelId,
        'code' => $code,
        'label' => $label,
        'price_delta' => $priceDelta,
        'height_min' => $height('rider_height_min_cm'),
        'height_max' => $height('rider_height_max_cm'),
        'geometry' => json_encode((object) ($input['geometry'] ?? []), JSON_THROW_ON_ERROR),
        'source_url' => ($sourceUrl = trim((string) ($input['source_url'] ?? ''))) !== '' ? $sourceUrl : null,
        'sort_order' => (int) ($input['sort_order'] ?? 0),
        'is_active' => ($input['is_active'] ?? true) ? 1 : 0,
    ]);
    $id = (int) $pdo->lastInsertId();

    logActivity(
        $pdo,
        'size_created',
        'admin',
        currentAdmin()['email'] ?? null,
        "Dodano rozmiar \"{$label}\" (#{$id}) do modelu \"{$modelName}\" (#{$modelId}).",
        ['id' => $id, 'modelId' => $modelId, 'code' => $code]
    );

    $row = $pdo->prepare('SELECT id, model_id, code, label, price_delta_gross, sort_order, is_active FROM model_sizes WHERE id = :id');
    $row->execute(['id' => $id]);

    return ['size' => $row->fetch(), 'basePriceGross' => recomputeModelBasePrice($pdo, $modelId)];
}

/**
 * Usuwanie rozmiaru ramy. Zapisane konfiguracje mają `model_size_id` z SET
 * NULL i własną migawkę z etykietą rozmiaru, więc nie tracą treści. Ostatniego
 * rozmiaru nie usuwamy: model bez rozmiaru nie da się skonfigurować.
 */
function deleteAdminSize(PDO $pdo, int $id): array
{
    $size = $pdo->prepare('SELECT model_id, code, label FROM model_sizes WHERE id = :id');
    $size->execute(['id' => $id]);
    $row = $size->fetch();
    if (!$row) {
        throw new InvalidArgumentException('Nie znaleziono rozmiaru.');
    }

    $siblings = $pdo->prepare('SELECT COUNT(*) FROM model_sizes WHERE model_id = :model');
    $siblings->execute(['model' => $row['model_id']]);
    if ((int) $siblings->fetchColumn() <= 1) {
        throw new InvalidArgumentException('To jedyny rozmiar tego modelu. Dodaj inny, zanim usuniesz ten - bez rozmiaru modelu nie da się skonfigurować.');
    }

    $pdo->prepare('DELETE FROM model_sizes WHERE id = :id')->execute(['id' => $id]);
    logActivity(
        $pdo,
        'size_deleted',
        'admin',
        currentAdmin()['email'] ?? null,
        "Usunięto rozmiar \"{$row['label']}\" (#{$id}) modelu #{$row['model_id']}.",
        ['id' => $id, 'modelId' => (int) $row['model_id'], 'code' => $row['code']]
    );

    return ['id' => $id, 'deleted' => true, 'basePriceGross' => recomputeModelBasePrice($pdo, (int) $row['model_id'])];
}

/**
 * Usuwanie pakietu baterii. Konfiguracje trzymają `model_battery_id` z SET
 * NULL i pełną specyfikację w migawce. Bateria domyślna jest składnikiem ceny
 * „od”, więc po usunięciu przeliczamy cenę modelu.
 */
function deleteAdminBattery(PDO $pdo, int $id): array
{
    $battery = $pdo->prepare('SELECT model_id, code, name, is_default FROM model_batteries WHERE id = :id');
    $battery->execute(['id' => $id]);
    $row = $battery->fetch();
    if (!$row) {
        throw new InvalidArgumentException('Nie znaleziono pakietu baterii.');
    }

    $siblings = $pdo->prepare('SELECT COUNT(*) FROM model_batteries WHERE model_id = :model');
    $siblings->execute(['model' => $row['model_id']]);
    if ((int) $siblings->fetchColumn() <= 1) {
        throw new InvalidArgumentException('To jedyny pakiet baterii tego modelu. Dodaj inny, zanim usuniesz ten.');
    }
    if ((int) $row['is_default'] === 1) {
        throw new InvalidArgumentException('To pakiet domyślny - wskaż najpierw inny jako domyślny, bo od niego liczy się cena modelu.');
    }

    $pdo->prepare('DELETE FROM model_batteries WHERE id = :id')->execute(['id' => $id]);
    logActivity(
        $pdo,
        'battery_deleted',
        'admin',
        currentAdmin()['email'] ?? null,
        "Usunięto pakiet baterii \"{$row['name']}\" (#{$id}) modelu #{$row['model_id']}.",
        ['id' => $id, 'modelId' => (int) $row['model_id'], 'code' => $row['code']]
    );

    return ['id' => $id, 'deleted' => true, 'basePriceGross' => recomputeModelBasePrice($pdo, (int) $row['model_id'])];
}

/**
 * Usuwanie strony treściowej. `site_pages` nie ma relacji przychodzących, ale
 * strony wpisane w nawigację (regulamin, polityka) mają swoje trasy w kodzie
 * frontendu i po usunięciu wiersza zwracałyby 404 - stąd blokada na slugach
 * systemowych, zamiast cichego rozsypania menu.
 */
function deleteAdminPage(PDO $pdo, int $id): array
{
    $page = $pdo->prepare('SELECT slug, title FROM site_pages WHERE id = :id');
    $page->execute(['id' => $id]);
    $row = $page->fetch();
    if (!$row) {
        throw new InvalidArgumentException('Nie znaleziono strony.');
    }
    if (in_array($row['slug'], systemPageSlugs(), true)) {
        throw new InvalidArgumentException("Strona „{$row['title']}” jest wpisana w stopkę i nawigację serwisu. Możesz ją ukryć przełącznikiem „Opublikowana”, ale nie usunąć.");
    }

    $pdo->prepare('DELETE FROM site_pages WHERE id = :id')->execute(['id' => $id]);
    logActivity($pdo, 'page_deleted', 'admin', currentAdmin()['email'] ?? null, "Usunięto stronę \"{$row['title']}\" (#{$id}).", ['id' => $id, 'slug' => $row['slug']]);

    return ['id' => $id, 'deleted' => true];
}

/** Slugi stron, do których prowadzą trasy zaszyte w kodzie frontendu. */
function systemPageSlugs(): array
{
    return ['regulamin', 'polityka-prywatnosci', 'serwis', 'kontakt'];
}


/**
 * Bateria ma pola wyliczalne: pojemność pakietu wynika z liczby gałęzi
 * równoległych i pojemności ogniwa, a energia z pojemności i napięcia
 * nominalnego. Liczymy je po stronie serwera, żeby panel nie mógł zapisać
 * pakietu, którego parametry nie trzymają się razem.
 */
/**
 * Napięcie nominalne/ładowania ogniwa jest stałą chemii/formatu, nie polem
 * do wpisania - lustrzane odbicie detectCellSpec() z apps/web/lib/battery.ts.
 */
function cellVoltageSpec(string $formatRaw): array
{
    $lower = strtolower(str_replace(' ', '', $formatRaw));

    if (str_contains($lower, '21700') || str_contains($lower, '2170')) {
        return ['nominal' => 3.6, 'max' => 4.2];
    }
    if (str_contains($lower, '18650') || str_contains($lower, '16850') || str_contains($lower, '1865')) {
        return ['nominal' => 3.6, 'max' => 4.2];
    }
    if (str_contains($lower, '26650')) {
        return ['nominal' => 3.6, 'max' => 4.2];
    }
    if (str_contains($lower, '32700') || str_contains($lower, '32650')) {
        return ['nominal' => 3.2, 'max' => 3.65];
    }

    return ['nominal' => 3.6, 'max' => 4.2];
}

function batteryPayload(array $input, array $current = []): array
{
    $value = static fn (string $field, mixed $fallback): mixed => array_key_exists($field, $input) ? $input[$field] : $fallback;

    $toFloat = static function (mixed $raw): float {
        if (is_numeric($raw)) {
            return (float) $raw;
        }
        if (is_string($raw)) {
            $cleaned = trim(str_replace([' ', ','], ['', '.'], $raw));
            return is_numeric($cleaned) ? (float) $cleaned : 0.0;
        }
        return 0.0;
    };

    $toInt = static function (mixed $raw): int {
        if (is_numeric($raw)) {
            return (int) $raw;
        }
        if (is_string($raw)) {
            $cleaned = trim(str_replace([' ', ','], ['', '.'], $raw));
            return is_numeric($cleaned) ? (int) round((float) $cleaned) : 0;
        }
        return 0;
    };

    $name = trim((string) $value('name', $current['name'] ?? ''));
    $cellFormat = trim((string) $value('cell_format', $current['cell_format'] ?? ''));
    $series = $toInt($value('series_count', $current['series_count'] ?? 0));
    $parallel = $toInt($value('parallel_count', $current['parallel_count'] ?? 0));
    $cellCapacity = $toFloat($value('cell_capacity_ah', $current['cell_capacity_ah'] ?? 0));
    $grossPrice = $toFloat($value('gross_price', $current['gross_price'] ?? 0));

    if ($name === '' || mb_strlen($name) > 200) {
        throw new InvalidArgumentException('Podaj nazwę pakietu baterii.');
    }
    if ($cellFormat === '' || mb_strlen($cellFormat) > 20) {
        throw new InvalidArgumentException('Podaj format ogniwa, na przykład 18650 albo 21700.');
    }
    if ($series < 1 || $parallel < 1) {
        throw new InvalidArgumentException('Liczba ogniw szeregowo i równolegle musi być większa od zera.');
    }
    if ($cellCapacity <= 0) {
        throw new InvalidArgumentException('Pojemność ogniwa musi być większa od zera.');
    }

    // Napięcie pakietu wynika wyłącznie z liczby ogniw szeregowo i stałej
    // napięcia dla danego formatu ogniwa - nigdy z wartości przysłanej z klienta.
    $voltageSpec = cellVoltageSpec($cellFormat);
    $nominalVoltage = round($series * $voltageSpec['nominal'], 2);
    $chargeVoltage = round($series * $voltageSpec['max'], 2);

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
    $isCreate = $id === null;

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

    logActivity(
        $pdo,
        'battery_saved',
        'admin',
        currentAdmin()['email'] ?? null,
        ($isCreate ? 'Utworzono' : 'Zaktualizowano') . " pakiet baterii \"{$payload['name']}\" (#{$id}) dla modelu #{$modelId}.",
        ['id' => $id, 'modelId' => $modelId, 'code' => $code, 'name' => $payload['name']]
    );

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
    logActivity($pdo, 'theme_updated', 'admin', currentAdmin()['email'] ?? null, 'Zmieniono kolory motywu strony.', $theme);
    return $theme;
}

/**
 * Ikona strony (favicona). Domyślnie serwujemy statyczny plik wygenerowany
 * z logo (apps/web/scripts/build-favicon.py); tu admin może wskazać własny
 * obrazek z biblioteki mediów, bez redeployu frontendu. Puste pole =
 * wracamy do domyślnej ikony z kodu.
 */
function getBranding(PDO $pdo): array
{
    $value = $pdo->query("SELECT value FROM site_settings WHERE setting_key = 'branding'")->fetchColumn();
    $stored = $value ? json_decode((string) $value, true, 16, JSON_THROW_ON_ERROR) : [];

    return ['faviconPath' => $stored['faviconPath'] ?? null];
}

function updateBranding(PDO $pdo, array $input): array
{
    $path = trim((string) ($input['faviconPath'] ?? ''));
    // Tylko ścieżki z naszej biblioteki mediów: wartość trafia prosto do
    // atrybutu href w <link>, więc nie może być dowolnym adresem.
    if ($path !== '' && !preg_match('~^/uploads/\d{4}/\d{2}/[a-f0-9]{32}\.(?:jpg|png|webp|avif)$~', $path)) {
        throw new InvalidArgumentException('Ikona musi pochodzić z biblioteki mediów (wgraj plik przyciskiem obok).');
    }
    $branding = ['faviconPath' => $path !== '' ? $path : null];
    $statement = $pdo->prepare("INSERT INTO site_settings (setting_key, value) VALUES ('branding', :value) ON DUPLICATE KEY UPDATE value = VALUES(value)");
    $statement->execute(['value' => json_encode($branding, JSON_THROW_ON_ERROR)]);
    logActivity(
        $pdo,
        'branding_updated',
        'admin',
        currentAdmin()['email'] ?? null,
        $branding['faviconPath'] === null ? 'Przywrócono domyślną ikonę strony.' : 'Zmieniono ikonę strony (favicon).',
        $branding
    );

    return $branding;
}

/**
 * Teksty statyczne stron publicznych. W przeciwieństwie do motywu (stały
 * zestaw 7 kolorów) kształt tego dokumentu jest zdefiniowany po stronie
 * frontendu (apps/web/lib/copy.ts) i może się rozrastać. Zapis scalany jest
 * w głąb z obecną wartością, więc częściowy zapis (np. sama sekcja Chat z
 * przyszłego klienta albo starszej wersji panelu) nie wyzeroje pozostałych
 * sekcji; pełny draft z zakładki „Teksty" daje ten sam wynik.
 */
function updateSiteCopy(PDO $pdo, array $input): array
{
    if ($input === [] || array_is_list($input)) {
        throw new RuntimeException('Nieprawidłowa treść tekstów strony.', 422);
    }
    $current = $pdo->query("SELECT value FROM site_settings WHERE setting_key = 'copy'")->fetchColumn();
    $decoded = $current === false || $current === null || $current === ''
        ? []
        : json_decode((string) $current, true);
    if (!is_array($decoded)) {
        $decoded = [];
    }
    $merged = array_replace_recursive($decoded, $input);
    $statement = $pdo->prepare("INSERT INTO site_settings (setting_key, value) VALUES ('copy', :value) ON DUPLICATE KEY UPDATE value = VALUES(value)");
    $statement->execute(['value' => json_encode($merged, JSON_THROW_ON_ERROR)]);
    logActivity($pdo, 'copy_updated', 'admin', currentAdmin()['email'] ?? null, 'Zmieniono teksty strony.', []);
    return $merged;
}

/**
 * Nadpisania promptu systemowego chatbota AI. Domyślnie prompt jest w pełni
 * generowany w ChatService.php (buildChatbotSystemPromptFromDb); tu admin
 * może opcjonalnie podmienić stały blok instrukcji ("instructions") i/lub
 * dopisać dodatkowy kontekst ("extra_context") bez zmiany kodu i redeployu.
 * Puste pole = używany jest domyślny prompt z kodu.
 */
function updateChatbotPrompt(PDO $pdo, array $input): array
{
    $prompt = [
        'instructions' => trim((string) ($input['instructions'] ?? '')),
        'extra_context' => trim((string) ($input['extra_context'] ?? '')),
    ];
    $statement = $pdo->prepare("INSERT INTO site_settings (setting_key, value) VALUES ('chatbot_prompt', :value) ON DUPLICATE KEY UPDATE value = VALUES(value)");
    $statement->execute(['value' => json_encode($prompt, JSON_THROW_ON_ERROR)]);
    logActivity($pdo, 'chatbot_prompt_updated', 'admin', currentAdmin()['email'] ?? null, 'Zmieniono prompt i kontekst chatbota AI.', $prompt);
    return $prompt;
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
    $role = in_array($_POST['role'] ?? '', ['default', 'hero', 'gallery', 'description', 'geometry'], true) ? $_POST['role'] : 'gallery';
    $maps = [
        'category' => ['table' => 'category_media', 'column' => 'category_id', 'allowedRoles' => ['default', 'hero', 'gallery', 'description']],
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
    logActivity(
        $pdo,
        'media_uploaded',
        'admin',
        currentAdmin()['email'] ?? null,
        "Wgrano zdjęcie #{$mediaId}" . ($ownerId > 0 ? " dla {$ownerType} #{$ownerId}" : '') . '.',
        ['mediaId' => $mediaId, 'ownerType' => $ownerType, 'ownerId' => $ownerId, 'path' => $storagePath]
    );
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

        // Sprzątanie osieroconego wiersza `media` i pliku jest wspólne dla
        // wszystkich bytów (MediaLinkService) - lista tabel łączących musi
        // obejmować też frame_media i project_media, inaczej skasowalibyśmy
        // zdjęcie nadal używane przez ramę albo realizację.
        deleteOrphanMedia($pdo, $mediaId);
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }

    logActivity($pdo, 'media_deleted', 'admin', currentAdmin()['email'] ?? null, "Usunięto zdjęcie #{$mediaId} z modelu #{$modelId}.", ['modelId' => $modelId, 'mediaId' => $mediaId]);

    return ['modelId' => $modelId, 'mediaId' => $mediaId, 'deleted' => true];
}

function reorderModelMedia(PDO $pdo, int $modelId, array $mediaIds): array
{
    $mediaIds = array_values(array_map('intval', $mediaIds));
    if ($mediaIds === []) {
        throw new InvalidArgumentException('Brak listy zdjęć do uporządkowania.');
    }

    $placeholders = implode(',', array_fill(0, count($mediaIds), '?'));
    $statement = $pdo->prepare("SELECT media_id FROM model_media WHERE model_id = ? AND media_id IN ({$placeholders})");
    $statement->execute(array_merge([$modelId], $mediaIds));
    $linked = array_map('intval', $statement->fetchAll(PDO::FETCH_COLUMN));
    if (count($linked) !== count($mediaIds) || array_diff($mediaIds, $linked) !== []) {
        throw new InvalidArgumentException('Lista zdjęć nie zgadza się z galerią tego modelu.');
    }

    $update = $pdo->prepare('UPDATE model_media SET sort_order = :sort WHERE model_id = :model AND media_id = :media');
    $pdo->beginTransaction();
    try {
        foreach ($mediaIds as $index => $mediaId) {
            $update->execute(['sort' => $index, 'model' => $modelId, 'media' => $mediaId]);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }

    return ['modelId' => $modelId, 'mediaIds' => $mediaIds];
}

/**
 * Kolejność grup części (sekcji) w konfiguratorze. Lista musi zawierać
 * wszystkie grupy - częściowa lista zostawiłaby pozostałe na starych
 * numerach i kolejność rozjechałaby się po cichu.
 */
function reorderPartGroups(PDO $pdo, array $groupIds): array
{
    $groupIds = array_values(array_unique(array_map('intval', $groupIds)));
    $existing = array_map('intval', $pdo->query('SELECT id FROM part_groups')->fetchAll(PDO::FETCH_COLUMN));
    sort($existing);
    $sorted = $groupIds;
    sort($sorted);
    if ($sorted !== $existing) {
        throw new InvalidArgumentException('Lista grup nie zgadza się z grupami części w bazie. Odśwież panel.');
    }

    $update = $pdo->prepare('UPDATE part_groups SET sort_order = :sort WHERE id = :id');
    $pdo->beginTransaction();
    try {
        foreach ($groupIds as $index => $groupId) {
            $update->execute(['sort' => ($index + 1) * 10, 'id' => $groupId]);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }
    logActivity($pdo, 'part_groups_reordered', 'admin', currentAdmin()['email'] ?? null, 'Zmieniono kolejność grup w konfiguratorze.', ['groupIds' => $groupIds]);

    return ['groupIds' => $groupIds];
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

        // priceConfiguration() liczy tylko cenę "od" (rozmiar i bateria mogą
        // być NULL bez błędu, bo cena składników i tak wychodzi) - nie zgłasza
        // więc braku rozmiaru/baterii, choć bez nich model przechodzi przez
        // configurator, ale nie da się go zamówić (patrz guard w
        // updateAdminRecord() blokujący publikację). Dokładamy to tutaj jako
        // checklistę gotowości widoczną w panelu, zanim ktoś w ogóle spróbuje
        // opublikować model.
        $readinessIssues = [];
        $activeBatteries = modelBatteries($pdo, $modelId);
        if (empty(modelSizes($pdo, $modelId))) {
            $readinessIssues[] = 'Brak aktywnego rozmiaru - dodaj co najmniej jeden w zakładce „Modele”.';
        }
        if (empty($activeBatteries)) {
            $readinessIssues[] = 'Brak aktywnej baterii - dodaj co najmniej jedną w zakładce „Baterie”.';
        } elseif ($defaultBattery === null) {
            $readinessIssues[] = 'Żadna bateria nie jest oznaczona jako domyślna - ustaw to w zakładce „Baterie”.';
        }
        if (empty($groups)) {
            $readinessIssues[] = 'Model nie ma przypisanego żadnego osprzętu - uzupełnij grupy części w zakładce „Osprzęt i cena modelu”.';
        }

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
            'issues' => [...$readinessIssues, ...$result['issues']],
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

    $assigned = ($input['assigned'] ?? true) !== false;
    logActivity(
        $pdo,
        'model_part_saved',
        'admin',
        currentAdmin()['email'] ?? null,
        ($assigned ? 'Przypisano' : 'Odpięto') . " część \"{$part['name']}\" (#{$partId}) " . ($assigned ? 'do' : 'od') . " modelu #{$modelId}.",
        ['modelId' => $modelId, 'partId' => $partId, 'assigned' => $assigned]
    );

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

    logActivity(
        $pdo,
        'model_group_settings_saved',
        'admin',
        currentAdmin()['email'] ?? null,
        "Zmieniono ustawienia grupy #{$groupId} dla modelu #{$modelId} (tryb: {$mode}).",
        ['modelId' => $modelId, 'groupId' => $groupId, 'mode' => $mode]
    );

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

    logActivity(
        $pdo,
        'model_parts_copied',
        'admin',
        currentAdmin()['email'] ?? null,
        "Skopiowano osprzęt z modelu #{$sourceModelId} do modelu #{$targetModelId}.",
        ['targetModelId' => $targetModelId, 'sourceModelId' => $sourceModelId]
    );

    return ['modelId' => $targetModelId, 'copiedFrom' => $sourceModelId, 'basePriceGross' => recomputeModelBasePrice($pdo, $targetModelId)];
}
