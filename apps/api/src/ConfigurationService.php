<?php

declare(strict_types=1);

function createConfiguration(PDO $pdo, array $input): array
{
    $name = trim((string) ($input['customerName'] ?? ''));
    $email = trim((string) ($input['customerEmail'] ?? ''));
    $phone = trim((string) ($input['customerPhone'] ?? ''));
    $notes = trim((string) ($input['customerNotes'] ?? ''));
    $modelSlug = trim((string) ($input['modelSlug'] ?? ''));
    $sizeCode = trim((string) ($input['sizeCode'] ?? ''));
    $batteryCode = trim((string) ($input['batteryCode'] ?? ''));
    $selections = $input['selections'] ?? [];

    if ($name === '' || mb_strlen($name) > 200) {
        throw new InvalidArgumentException('Podaj imię i nazwisko.');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('Podaj poprawny adres e-mail.');
    }
    if (($input['privacyConsent'] ?? false) !== true) {
        throw new InvalidArgumentException('Zgoda na przetwarzanie danych jest wymagana.');
    }
    if (!is_array($selections)) {
        throw new InvalidArgumentException('Nieprawidłowa lista wybranych części.');
    }

    $modelStatement = $pdo->prepare('SELECT * FROM bike_models WHERE slug = :slug AND status <> \'archived\'');
    $modelStatement->execute(['slug' => $modelSlug]);
    $model = $modelStatement->fetch();
    if (!$model || $model['base_price'] === null) {
        throw new InvalidArgumentException('Wybrany model nie jest jeszcze dostępny do konfiguracji.');
    }

    $sizeStatement = $pdo->prepare('SELECT id, code, label FROM model_sizes WHERE model_id = :model AND code = :code AND is_active = TRUE');
    $sizeStatement->execute(['model' => $model['id'], 'code' => $sizeCode]);
    $size = $sizeStatement->fetch();
    if (!$size) {
        throw new InvalidArgumentException('Wybrany rozmiar nie jest dostępny dla tego modelu.');
    }

    // Bateria jest wyborem klienta. Domyślny pakiet wyznacza cenę bazową modelu,
    // a wybrany pakiet dopłatę albo upust względem tej ceny.
    $defaultBatteryStatement = $pdo->prepare('SELECT * FROM model_batteries WHERE model_id = :model AND is_default = TRUE AND is_active = TRUE LIMIT 1');
    $defaultBatteryStatement->execute(['model' => $model['id']]);
    $defaultBattery = $defaultBatteryStatement->fetch() ?: null;

    $battery = $defaultBattery;
    if ($batteryCode !== '') {
        $batteryStatement = $pdo->prepare('SELECT * FROM model_batteries WHERE model_id = :model AND code = :code AND is_active = TRUE LIMIT 1');
        $batteryStatement->execute(['model' => $model['id'], 'code' => $batteryCode]);
        $battery = $batteryStatement->fetch() ?: null;
        if (!$battery) {
            throw new InvalidArgumentException('Wybrana bateria nie jest dostępna dla tego modelu.');
        }
    }

    $items = [];
    $totalDelta = 0.0;
    $batteryDelta = 0.0;
    if ($battery) {
        $batteryDelta = round((float) $battery['gross_price'] - (float) ($defaultBattery['gross_price'] ?? 0), 2);
        $totalDelta += $batteryDelta;
    }
    foreach ($selections as $groupSlug => $selectionSku) {
        if (!is_string($groupSlug) || !is_string($selectionSku)) {
            throw new InvalidArgumentException('Nieprawidłowy wybór części.');
        }

        $groupStatement = $pdo->prepare('SELECT id, name FROM part_groups WHERE slug = :slug');
        $groupStatement->execute(['slug' => $groupSlug]);
        $group = $groupStatement->fetch();
        if (!$group) {
            throw new InvalidArgumentException("Nieznana grupa opcji: {$groupSlug}.");
        }

        $defaultStatement = $pdo->prepare(
            'SELECT p.id, p.sku, p.name, p.description, COALESCE(mp.gross_price_override, p.gross_price) AS effective_price, ' .
            'mp.customer_supplied_allowed, mp.customer_supplied_gross_price ' .
            'FROM model_parts mp JOIN parts p ON p.id = mp.part_id ' .
            'WHERE mp.model_id = :model AND p.group_id = :group_id AND mp.is_default = TRUE LIMIT 1'
        );
        $defaultStatement->execute(['model' => $model['id'], 'group_id' => $group['id']]);
        $default = $defaultStatement->fetch() ?: null;
        $defaultPrice = (float) ($default['effective_price'] ?? 0);

        if ($selectionSku === '__customer_supplied__') {
            $settingsStatement = $pdo->prepare(
                'SELECT customer_part_allowed, customer_part_gross_price, customer_part_label FROM model_part_group_settings ' .
                'WHERE model_id = :model AND group_id = :group_id'
            );
            $settingsStatement->execute(['model' => $model['id'], 'group_id' => $group['id']]);
            $settings = $settingsStatement->fetch() ?: null;
            $allowed = (bool) ($default['customer_supplied_allowed'] ?? false) || (bool) ($settings['customer_part_allowed'] ?? false);
            if (!$allowed) {
                throw new InvalidArgumentException("Własna część nie jest dozwolona w grupie {$group['name']}.");
            }
            $selectedPrice = $default && (bool) $default['customer_supplied_allowed']
                ? (float) $default['customer_supplied_gross_price']
                : (float) ($settings['customer_part_gross_price'] ?? 0);
            $selected = [
                'id' => null,
                'sku' => '__customer_supplied__',
                'name' => (string) ($settings['customer_part_label'] ?? 'Dostarczam własną część'),
                'description' => 'Element dostarczany przez klienta; zgodność potwierdzi Rexor.',
                'effective_price' => $selectedPrice,
                'selection_type' => 'customer_supplied',
            ];
        } else {
            $partStatement = $pdo->prepare(
                'SELECT p.id, p.sku, p.name, p.description, p.price_status, COALESCE(mp.gross_price_override, p.gross_price) AS effective_price ' .
                'FROM model_parts mp JOIN parts p ON p.id = mp.part_id ' .
                'WHERE mp.model_id = :model AND p.group_id = :group_id AND p.sku = :sku AND p.is_active = TRUE LIMIT 1'
            );
            $partStatement->execute(['model' => $model['id'], 'group_id' => $group['id'], 'sku' => $selectionSku]);
            $selected = $partStatement->fetch();
            if (!$selected || $selected['price_status'] !== 'fixed' || $selected['effective_price'] === null) {
                throw new InvalidArgumentException("Wybrana opcja w grupie {$group['name']} nie ma zatwierdzonej ceny.");
            }
            $selected['selection_type'] = 'catalog_part';
            $selectedPrice = (float) $selected['effective_price'];
        }

        $delta = round($selectedPrice - $defaultPrice, 2);
        $totalDelta += $delta;
        $items[] = [
            'groupSlug' => $groupSlug,
            'groupName' => $group['name'],
            'partId' => $selected['id'],
            'sku' => $selected['sku'],
            'name' => $selected['name'],
            'description' => $selected['description'],
            'selectionType' => $selected['selection_type'],
            'grossPrice' => $selectedPrice,
            'grossDelta' => $delta,
        ];
    }

    $basePrice = (float) $model['base_price'];
    $grossTotal = round($basePrice + $totalDelta, 2);
    $shareToken = randomToken();
    $resumeToken = randomToken();
    $publicId = publicId();
    $frontendUrl = rtrim(envValue('FRONTEND_URL', envValue('APP_URL', 'http://localhost:3000')), '/');
    $shareUrl = "{$frontendUrl}/konfiguracja/{$shareToken}";
    $resumeUrl = "{$frontendUrl}/konfigurator?resume={$resumeToken}";

    $snapshot = [
        'publicId' => $publicId,
        'model' => ['slug' => $model['slug'], 'name' => $model['name'], 'image' => $model['default_image_path']],
        'size' => ['code' => $size['code'], 'label' => $size['label']],
        'battery' => $battery ? [
            'code' => $battery['code'],
            'name' => $battery['name'],
            'shortLabel' => $battery['short_label'],
            'cellFormat' => $battery['cell_format'],
            'capacityAh' => (float) $battery['pack_capacity_ah'],
            'energyWh' => (float) $battery['nominal_energy_wh'],
            'grossPrice' => (float) $battery['gross_price'],
            'grossDelta' => $batteryDelta,
        ] : null,
        'items' => $items,
        'basePriceGross' => $basePrice,
        'grossTotal' => $grossTotal,
        'currency' => 'PLN',
        'createdAt' => gmdate(DATE_ATOM),
    ];

    $pdo->beginTransaction();
    try {
        $insert = $pdo->prepare(
            'INSERT INTO configurations (public_id, share_token_hash, resume_token_hash, model_id, model_size_id, model_battery_id, status, currency, base_price_gross_snapshot, vat_rate, gross_total, customer_email, customer_name, customer_phone, customer_notes, snapshot, consent_privacy_at, submitted_at) ' .
            'VALUES (:public_id, :share_hash, :resume_hash, :model_id, :size_id, :battery_id, \'submitted\', \'PLN\', :base_price, :vat_rate, :gross_total, :email, :name, :phone, :notes, :snapshot, UTC_TIMESTAMP(), UTC_TIMESTAMP())'
        );
        $insert->execute([
            'public_id' => $publicId,
            'share_hash' => hash('sha256', $shareToken),
            'resume_hash' => hash('sha256', $resumeToken),
            'model_id' => $model['id'],
            'size_id' => $size['id'],
            'battery_id' => $battery['id'] ?? null,
            'base_price' => $basePrice,
            'vat_rate' => $model['vat_rate'],
            'gross_total' => $grossTotal,
            'email' => $email,
            'name' => $name,
            'phone' => $phone !== '' ? $phone : null,
            'notes' => $notes !== '' ? $notes : null,
            'snapshot' => json_encode($snapshot, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
        $configurationId = (int) $pdo->lastInsertId();

        $itemInsert = $pdo->prepare(
            'INSERT INTO configuration_items (configuration_id, part_id, selection_type, group_name_snapshot, part_name_snapshot, specification_snapshot, gross_price_snapshot, gross_price_delta_snapshot) ' .
            'VALUES (:configuration, :part, :type, :group_name, :part_name, :specification, :price, :delta)'
        );
        foreach ($items as $item) {
            $itemInsert->execute([
                'configuration' => $configurationId,
                'part' => $item['partId'],
                'type' => $item['selectionType'],
                'group_name' => $item['groupName'],
                'part_name' => $item['name'],
                'specification' => $item['description'],
                'price' => $item['grossPrice'],
                'delta' => $item['grossDelta'],
            ]);
        }

        $pdo->prepare('INSERT INTO inquiries (configuration_id) VALUES (:id)')->execute(['id' => $configurationId]);
        $mailPayload = [
            'customerName' => $name,
            'modelName' => $model['name'],
            'publicId' => $publicId,
            'grossTotal' => $grossTotal,
            'shareUrl' => $shareUrl,
            'resumeUrl' => $resumeUrl,
        ];
        $pdo->prepare(
            'INSERT INTO email_outbox (configuration_id, recipient_email, template_key, payload) VALUES (:configuration, :recipient, \'configuration_confirmation\', :payload)'
        )->execute([
            'configuration' => $configurationId,
            'recipient' => $email,
            'payload' => json_encode($mailPayload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }

    return [
        'publicId' => $publicId,
        'shareUrl' => $shareUrl,
        'resumeUrl' => $resumeUrl,
        'grossTotal' => $grossTotal,
    ];
}

function getConfigurationByToken(PDO $pdo, string $token, string $kind): array
{
    if (!preg_match('/^[A-Za-z0-9_-]{40,80}$/', $token)) {
        throw new InvalidArgumentException('Nieprawidłowy link konfiguracji.');
    }
    $column = $kind === 'resume' ? 'resume_token_hash' : 'share_token_hash';
    $statement = $pdo->prepare("SELECT id, public_id, gross_total, snapshot, created_at FROM configurations WHERE {$column} = :hash AND status <> 'archived' AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP()) LIMIT 1");
    $statement->execute(['hash' => hash('sha256', $token)]);
    $configuration = $statement->fetch();
    if (!$configuration) {
        throw new RuntimeException('Konfiguracja nie istnieje albo link wygasł.', 404);
    }
    $pdo->prepare('UPDATE configurations SET last_opened_at = UTC_TIMESTAMP() WHERE id = :id')->execute(['id' => $configuration['id']]);
    return [
        'publicId' => $configuration['public_id'],
        'grossTotal' => (float) $configuration['gross_total'],
        'createdAt' => $configuration['created_at'],
        'configuration' => json_decode($configuration['snapshot'], true, 64, JSON_THROW_ON_ERROR),
        'canResume' => $kind === 'resume',
    ];
}
