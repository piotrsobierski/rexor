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
    if (!$model) {
        throw new InvalidArgumentException('Wybrany model nie jest jeszcze dostępny do konfiguracji.');
    }

    $sizeStatement = $pdo->prepare('SELECT id, code, label, price_delta_gross FROM model_sizes WHERE model_id = :model AND code = :code AND is_active = TRUE');
    $sizeStatement->execute(['model' => $model['id'], 'code' => $sizeCode]);
    $size = $sizeStatement->fetch();
    if (!$size) {
        throw new InvalidArgumentException('Wybrany rozmiar nie jest dostępny dla tego modelu.');
    }

    // Bateria jest osobnym składnikiem ceny, tak samo jak rama czy hamulce.
    // Domyślny pakiet służy tylko do pokazania różnicy w konfiguratorze.
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

    foreach ($selections as $groupSlug => $selectionSku) {
        if (!is_string($groupSlug) || !is_string($selectionSku)) {
            throw new InvalidArgumentException('Nieprawidłowy wybór części.');
        }
    }

    // Cena powstaje wyłącznie w PricingService, z tej samej funkcji, która liczy
    // cenę "od" w katalogu. Klient nie przysyła żadnej kwoty.
    $groups = modelOptionGroups($pdo, (int) $model['id']);
    foreach (array_keys($selections) as $groupSlug) {
        if (!isset($groups[$groupSlug])) {
            throw new InvalidArgumentException("Nieznana grupa opcji: {$groupSlug}.");
        }
    }
    $model['adjustments'] = modelPriceAdjustments($pdo, (int) $model['id']);
    $pricing = priceConfiguration($model, $groups, $size, $battery, $selections);
    if ($pricing['issues'] !== []) {
        throw new InvalidArgumentException('Ta konfiguracja wymaga indywidualnej wyceny: ' . implode(' ', $pricing['issues']));
    }
    $items = $pricing['lines'];
    $batteryDelta = $battery !== null
        ? round((float) $battery['gross_price'] - (float) ($defaultBattery['gross_price'] ?? 0), 2)
        : 0.0;

    // base_price_gross_snapshot to cena "od" modelu w chwili zamówienia:
    // punkt odniesienia dla obsługi, nie składnik sumy.
    $basePrice = $model['computed_base_price_gross'] !== null ? (float) $model['computed_base_price_gross'] : 0.0;
    $grossTotal = $pricing['grossTotal'];
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
        'pricing' => [
            'framePriceGross' => $pricing['framePriceGross'],
            'batteryPriceGross' => $pricing['batteryPriceGross'],
            'componentsPriceGross' => $pricing['componentsPriceGross'],
            'assemblyPriceGross' => $pricing['assemblyPriceGross'],
            'marginPercent' => $pricing['marginPercent'],
            'marginAmountGross' => $pricing['marginAmountGross'],
            'adjustments' => $pricing['adjustments'],
            'notes' => $pricing['notes'],
        ],
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
        $confirmationOutboxId = insertOutboxMail($pdo, $configurationId, $email, 'configuration_confirmation', $mailPayload);
        $orderRecipient = getMailRouting($pdo)['order_email'];
        $notificationOutboxId = insertOutboxMail($pdo, $configurationId, $orderRecipient, 'inquiry_notification', $mailPayload);
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }

    // Wysyłka poza transakcją: I/O do serwera SMTP nie powinno trzymać
    // otwartej transakcji DB, a błąd wysyłki nie może cofnąć zapisanego
    // zamówienia - jest już zapisany w email_outbox do ew. ponowienia.
    $price = number_format($grossTotal, 0, ',', ' ') . ' zł brutto';
    sendOutboxMailBestEffort(
        $pdo,
        $confirmationOutboxId,
        $email,
        $name,
        "Twój projekt {$model['name']} — Rexor Bikes",
        "<h1>Dziękujemy, " . htmlspecialchars($name, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . "</h1><p>Konfiguracja <strong>{$model['name']}</strong> została zapisana.</p><p>Aktualna cena: <strong>{$price}</strong>.</p><p><a href=\"{$shareUrl}\">Otwórz podsumowanie</a></p><p><a href=\"{$resumeUrl}\">Wróć do konfiguratora</a></p><p>Przed realizacją Rexor potwierdzi kompatybilność i ostateczny zakres.</p>"
    );
    sendOutboxMailBestEffort(
        $pdo,
        $notificationOutboxId,
        $orderRecipient,
        'Rexor Bikes',
        "Nowe zapytanie ofertowe — {$model['name']}",
        '<h1>Nowe zapytanie ofertowe</h1><p><strong>Klient:</strong> ' . htmlspecialchars($name, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . ' (' . htmlspecialchars($email, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . ')</p>'
            . '<p><strong>Model:</strong> ' . htmlspecialchars($model['name'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . ' (' . htmlspecialchars($size['label'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . ')</p>'
            . "<p><strong>Cena:</strong> {$price}</p>"
            . "<p><a href=\"{$shareUrl}\">Podgląd konfiguracji</a></p>"
            . '<p><a href="' . rtrim(envValue('FRONTEND_URL', envValue('APP_URL', 'http://localhost:3000')), '/') . "/admin/konfiguracje/{$publicId}\">Otwórz w panelu admina</a></p>"
    );

    logActivity(
        $pdo,
        'configuration_created',
        'customer',
        $email,
        "Nowa konfiguracja {$model['name']} ({$size['label']}) dla {$name} — " . number_format($grossTotal, 0, ',', ' ') . ' zł.',
        ['publicId' => $publicId, 'modelSlug' => $model['slug'], 'sizeCode' => $size['code'], 'batteryCode' => $battery['code'] ?? null, 'grossTotal' => $grossTotal, 'selections' => $selections]
    );

    return [
        'publicId' => $publicId,
        'shareUrl' => $shareUrl,
        'resumeUrl' => $resumeUrl,
        'grossTotal' => $grossTotal,
    ];
}

/**
 * Granularne logowanie zmian w konfiguratorze (wybór modelu, rozmiaru,
 * baterii, osprzętu) - osobne od /configurations, które zapisuje dopiero
 * finalne zgłoszenie formularza. Endpoint jest publiczny (klient jeszcze nie
 * podał e-maila) i celowo lekki: nie sprawdza zgodności z katalogiem, bo to
 * tylko log aktywności, nie źródło prawdy o cenie czy dostępności - tę
 * walidację i tak robi createConfiguration() przy złożeniu zamówienia.
 */
function logConfiguratorEvent(PDO $pdo, array $input): array
{
    $modelSlug = trim((string) ($input['modelSlug'] ?? ''));
    $parameter = trim((string) ($input['parameter'] ?? ''));
    $value = trim((string) ($input['value'] ?? ''));
    $label = trim((string) ($input['label'] ?? ''));

    if ($modelSlug === '' || mb_strlen($modelSlug) > 120) {
        throw new InvalidArgumentException('Nieprawidłowy model.');
    }
    if ($parameter === '' || mb_strlen($parameter) > 60) {
        throw new InvalidArgumentException('Nieprawidłowy parametr.');
    }
    if (mb_strlen($value) > 200 || mb_strlen($label) > 200) {
        throw new InvalidArgumentException('Zbyt długa wartość.');
    }

    logActivity(
        $pdo,
        'configurator_change',
        'customer',
        null,
        "Konfigurator ({$modelSlug}): " . ($label !== '' ? $label : "{$parameter} = {$value}"),
        ['modelSlug' => $modelSlug, 'parameter' => $parameter, 'value' => $value, 'label' => $label !== '' ? $label : null]
    );

    return ['logged' => true];
}

/**
 * Podgląd konfiguracji dla panelu admina, po jawnym public_id — bez
 * sekretnego tokenu udostępniania. share_token/resume_token trzymamy w
 * bazie tylko jako skrót SHA-256 (jak reset hasła), więc admin nie może
 * odtworzyć oryginalnego linku klienta; to jest bezpieczny odpowiednik
 * tej samej treści, dostępny wyłącznie po zalogowaniu.
 */
function getConfigurationForAdmin(PDO $pdo, string $publicId): array
{
    $statement = $pdo->prepare('SELECT id, public_id, gross_total, snapshot, created_at FROM configurations WHERE public_id = :public_id LIMIT 1');
    $statement->execute(['public_id' => $publicId]);
    $configuration = $statement->fetch();
    if (!$configuration) {
        throw new RuntimeException('Konfiguracja nie istnieje.', 404);
    }
    return [
        'publicId' => $configuration['public_id'],
        'grossTotal' => (float) $configuration['gross_total'],
        'createdAt' => $configuration['created_at'],
        'configuration' => json_decode($configuration['snapshot'], true, 64, JSON_THROW_ON_ERROR),
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
