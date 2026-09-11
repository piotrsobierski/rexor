<?php

declare(strict_types=1);

/**
 * Jedno miejsce, w którym powstaje cena roweru.
 *
 * Cena nie jest wpisywana ręcznie. Wynika z sumy składników:
 *
 *   cena = rama (+ dopłata rozmiaru) + bateria + suma wybranych części
 *        + składanie + narzut modelu + dopłaty modelu
 *
 * Ta sama funkcja liczy cenę "od" dla katalogu (wszystkie wybory domyślne)
 * i cenę wysłanej konfiguracji, więc obie nie mogą się rozjechać.
 */

const CUSTOMER_SUPPLIED_SKU = '__customer_supplied__';

/**
 * Grupy opcji oferowane przez model wraz z pozycjami, trybem wyboru
 * i ustawieniem części klienta. Model oferuje grupę wtedy, gdy ma w niej
 * przypisaną choć jedną część albo dopuszcza w niej część klienta.
 */
function modelOptionGroups(PDO $pdo, int $modelId): array
{
    $groupStatement = $pdo->prepare(
        'SELECT pg.id AS group_id, pg.slug AS group_slug, pg.name AS group_name, pg.description AS group_description, ' .
        'pg.is_required, ' .
        'COALESCE(mpgs.selection_mode, \'select_one\') AS selection_mode, ' .
        'COALESCE(mpgs.customer_part_allowed, FALSE) AS customer_part_allowed, ' .
        'COALESCE(mpgs.customer_part_gross_price, 0) AS customer_part_gross_price, ' .
        'COALESCE(mpgs.customer_part_label, \'Dostarczam własną część\') AS customer_part_label, ' .
        'mpgs.helper_text ' .
        'FROM part_groups pg ' .
        'LEFT JOIN model_part_group_settings mpgs ON mpgs.group_id = pg.id AND mpgs.model_id = :model_settings ' .
        'WHERE mpgs.customer_part_allowed = TRUE OR EXISTS ( ' .
        '    SELECT 1 FROM model_parts mp JOIN parts p ON p.id = mp.part_id ' .
        '    WHERE mp.model_id = :model_exists AND p.group_id = pg.id AND p.is_active = TRUE ' .
        ') ' .
        'ORDER BY pg.sort_order, pg.id'
    );
    $groupStatement->execute(['model_settings' => $modelId, 'model_exists' => $modelId]);

    $groups = [];
    foreach ($groupStatement->fetchAll() as $row) {
        $groups[(string) $row['group_slug']] = [
            'id' => (int) $row['group_id'],
            'slug' => (string) $row['group_slug'],
            'name' => (string) $row['group_name'],
            'helper' => (string) ($row['helper_text'] ?? $row['group_description'] ?? ''),
            'selectionMode' => (string) $row['selection_mode'],
            'isRequired' => (bool) $row['is_required'],
            'customerPartAllowed' => (bool) $row['customer_part_allowed'],
            'customerPartGrossPrice' => (float) $row['customer_part_gross_price'],
            'customerPartLabel' => (string) $row['customer_part_label'],
            'options' => [],
            'defaultSku' => null,
        ];
    }

    $optionStatement = $pdo->prepare(
        'SELECT pg.slug AS group_slug, p.id AS part_id, p.sku, p.name AS part_name, p.description AS part_description, ' .
        'p.price_status, p.image_path, ' .
        'COALESCE(mp.gross_price_override, p.gross_price) AS effective_price, ' .
        'mp.is_default, mp.is_customer_configurable, mp.customer_supplied_allowed, mp.customer_supplied_gross_price ' .
        'FROM model_parts mp ' .
        'JOIN parts p ON p.id = mp.part_id AND p.is_active = TRUE ' .
        'JOIN part_groups pg ON pg.id = p.group_id ' .
        'WHERE mp.model_id = :model ' .
        'ORDER BY pg.sort_order, mp.sort_order, p.name'
    );
    $optionStatement->execute(['model' => $modelId]);

    foreach ($optionStatement->fetchAll() as $row) {
        $slug = (string) $row['group_slug'];
        if (!isset($groups[$slug])) {
            continue;
        }
        // Pozycja oznaczona jako niekonfigurowalna jest elementem stałym:
        // wchodzi do ceny, ale konfigurator nie pokazuje jej jako wyboru.
        $option = [
            'sku' => (string) $row['sku'],
            'partId' => (int) $row['part_id'],
            'name' => (string) $row['part_name'],
            'detail' => (string) ($row['part_description'] ?? ''),
            'price' => $row['effective_price'] !== null ? (float) $row['effective_price'] : null,
            'priceStatus' => (string) $row['price_status'],
            'isDefault' => (bool) $row['is_default'],
            'isCustomerConfigurable' => (bool) $row['is_customer_configurable'],
            'customerSuppliedAllowed' => (bool) $row['customer_supplied_allowed'],
            'customerSuppliedGrossPrice' => (float) $row['customer_supplied_gross_price'],
            'imagePath' => $row['image_path'],
        ];
        $groups[$slug]['options'][$option['sku']] = $option;
        if ($option['isDefault']) {
            $groups[$slug]['defaultSku'] = $option['sku'];
        }
        if ($option['customerSuppliedAllowed']) {
            $groups[$slug]['customerPartAllowed'] = true;
            $groups[$slug]['customerPartGrossPrice'] = $option['customerSuppliedGrossPrice'];
        }
    }

    return $groups;
}

/** Aktywne pakiety baterii modelu; pierwszy domyślny wyznacza cenę "od". */
function modelBatteries(PDO $pdo, int $modelId): array
{
    $statement = $pdo->prepare(
        'SELECT id, code, name, short_label, cell_format, series_count, parallel_count, pack_capacity_ah, ' .
        'nominal_energy_wh, gross_price, is_default FROM model_batteries ' .
        'WHERE model_id = :model AND is_active = TRUE ORDER BY sort_order, nominal_energy_wh'
    );
    $statement->execute(['model' => $modelId]);
    return $statement->fetchAll();
}

/** Aktywne rozmiary modelu wraz z dopłatą rozmiaru. */
function modelSizes(PDO $pdo, int $modelId): array
{
    $statement = $pdo->prepare(
        'SELECT id, code, label, price_delta_gross, rider_height_min_cm, rider_height_max_cm, geometry ' .
        'FROM model_sizes WHERE model_id = :model AND is_active = TRUE ORDER BY sort_order, id'
    );
    $statement->execute(['model' => $modelId]);
    return $statement->fetchAll();
}

function modelPriceAdjustments(PDO $pdo, int $modelId): array
{
    $statement = $pdo->prepare('SELECT code, name, adjustment_type, amount, description FROM model_price_adjustments WHERE model_id = :model AND is_active = TRUE ORDER BY id');
    $statement->execute(['model' => $modelId]);
    return $statement->fetchAll();
}

/**
 * Wycena konfiguracji. $selections to mapa slug grupy na SKU wybranej części
 * albo na CUSTOMER_SUPPLIED_SKU. Brak wpisu oznacza wybór domyślny.
 *
 * Zwraca pozycje, podsumy i listę problemów. Pusta lista problemów znaczy,
 * że konfigurację można wycenić bez kontaktu z Rexor.
 */
function priceConfiguration(array $model, array $groups, ?array $size, ?array $battery, array $selections): array
{
    $lines = [];
    $issues = [];
    $notes = [];
    $componentsTotal = 0.0;

    $framePrice = (float) $model['frame_price_gross'];
    $sizeDelta = $size !== null ? (float) $size['price_delta_gross'] : 0.0;
    $frameTotal = round($framePrice + $sizeDelta, 2);

    foreach ($groups as $slug => $group) {
        $requested = $selections[$slug] ?? null;
        $defaultSku = $group['defaultSku'];

        // Grupa stała ignoruje wybór klienta i zawsze rozlicza pozycję domyślną.
        if ($group['selectionMode'] === 'fixed') {
            $requested = $defaultSku;
        }
        if ($requested === null) {
            $requested = $defaultSku;
        }
        if ($requested === null) {
            if ($group['selectionMode'] !== 'optional' && $group['isRequired'] && !$group['customerPartAllowed']) {
                $issues[] = "Grupa {$group['name']} nie ma pozycji domyślnej.";
            }
            continue;
        }

        if ($requested === CUSTOMER_SUPPLIED_SKU) {
            if (!$group['customerPartAllowed']) {
                throw new InvalidArgumentException("Własna część nie jest dozwolona w grupie {$group['name']}.");
            }
            $price = (float) $group['customerPartGrossPrice'];
            $lines[] = [
                'groupSlug' => $slug,
                'groupName' => $group['name'],
                'partId' => null,
                'sku' => CUSTOMER_SUPPLIED_SKU,
                'name' => $group['customerPartLabel'],
                'description' => 'Element dostarczany przez klienta; zgodność potwierdzi Rexor.',
                'selectionType' => 'customer_supplied',
                'grossPrice' => $price,
                'grossDelta' => round($price - (float) ($group['options'][$defaultSku]['price'] ?? 0), 2),
            ];
            $componentsTotal += $price;
            continue;
        }

        if (!isset($group['options'][$requested])) {
            throw new InvalidArgumentException("Wybrana opcja w grupie {$group['name']} nie jest dostępna dla tego modelu.");
        }
        $option = $group['options'][$requested];
        if ($group['selectionMode'] !== 'fixed' && !$option['isCustomerConfigurable'] && $requested !== $defaultSku) {
            throw new InvalidArgumentException("Pozycja {$option['name']} nie jest wybierana przez klienta.");
        }
        if ($option['priceStatus'] !== 'fixed' || $option['price'] === null) {
            $issues[] = "Pozycja {$option['name']} wymaga indywidualnej wyceny.";
            continue;
        }

        $price = (float) $option['price'];
        $componentsTotal += $price;
        $lines[] = [
            'groupSlug' => $slug,
            'groupName' => $group['name'],
            'partId' => $option['partId'],
            'sku' => $option['sku'],
            'name' => $option['name'],
            'description' => $option['detail'],
            'selectionType' => 'catalog_part',
            'grossPrice' => $price,
            'grossDelta' => round($price - (float) ($group['options'][$defaultSku]['price'] ?? 0), 2),
        ];
    }

    $batteryPrice = $battery !== null ? (float) $battery['gross_price'] : 0.0;
    $assemblyPrice = (float) $model['assembly_price_gross'];
    $componentsTotal = round($componentsTotal, 2);
    $subtotal = round($frameTotal + $batteryPrice + $componentsTotal + $assemblyPrice, 2);
    $marginPercent = (float) $model['margin_percent'];
    $marginAmount = round($subtotal * $marginPercent / 100, 2);
    $total = round($subtotal + $marginAmount, 2);

    $adjustments = [];
    foreach ($model['adjustments'] ?? [] as $adjustment) {
        if ($adjustment['adjustment_type'] === 'quote') {
            // Warunek do ustalenia nie blokuje wyceny roweru: cena składników
            // jest znana, a ten punkt obsługa potwierdza z klientem. Wycenę
            // blokuje tylko brak ceny wybranej pozycji.
            $notes[] = "{$adjustment['name']} wymaga ustalenia z obsługą.";
            $adjustments[] = ['code' => $adjustment['code'], 'name' => $adjustment['name'], 'type' => 'quote', 'amount' => null];
            continue;
        }
        $amount = $adjustment['adjustment_type'] === 'percentage'
            ? round($total * (float) $adjustment['amount'] / 100, 2)
            : round((float) $adjustment['amount'], 2);
        $total = round($total + $amount, 2);
        $adjustments[] = ['code' => $adjustment['code'], 'name' => $adjustment['name'], 'type' => $adjustment['adjustment_type'], 'amount' => $amount];
    }

    return [
        'lines' => $lines,
        'framePriceGross' => $frameTotal,
        'batteryPriceGross' => $batteryPrice,
        'componentsPriceGross' => $componentsTotal,
        'assemblyPriceGross' => $assemblyPrice,
        'marginPercent' => $marginPercent,
        'marginAmountGross' => $marginAmount,
        'adjustments' => $adjustments,
        'grossTotal' => $total,
        'issues' => $issues,
        'notes' => $notes,
    ];
}

/**
 * Cena "od": wszystkie wybory domyślne, rozmiar bez dopłaty, bateria domyślna.
 * Zapisujemy ją w bike_models.computed_base_price_gross, żeby listingi nie
 * musiały liczyć sumy dla każdego modelu osobno. Pole jest wyliczane tylko tu.
 */
function recomputeModelBasePrice(PDO $pdo, int $modelId): ?float
{
    $statement = $pdo->prepare('SELECT * FROM bike_models WHERE id = :id');
    $statement->execute(['id' => $modelId]);
    $model = $statement->fetch();
    if (!$model) {
        return null;
    }

    $groups = modelOptionGroups($pdo, $modelId);
    $batteries = modelBatteries($pdo, $modelId);
    $defaultBattery = null;
    foreach ($batteries as $candidate) {
        if ((bool) $candidate['is_default']) {
            $defaultBattery = $candidate;
            break;
        }
    }
    $model['adjustments'] = modelPriceAdjustments($pdo, $modelId);

    // Model bez składników nie ma ceny: konfigurator pokazuje go jako
    // niedostępny, zamiast wyświetlać samą cenę składania.
    if ($groups === [] && (float) $model['frame_price_gross'] <= 0.0) {
        $pdo->prepare('UPDATE bike_models SET computed_base_price_gross = NULL WHERE id = :id')->execute(['id' => $modelId]);
        return null;
    }

    $pricing = priceConfiguration($model, $groups, null, $defaultBattery, []);
    $price = $pricing['issues'] === [] ? $pricing['grossTotal'] : null;
    $pdo->prepare('UPDATE bike_models SET computed_base_price_gross = :price WHERE id = :id')
        ->execute(['price' => $price, 'id' => $modelId]);

    return $price;
}

function recomputeAllModelBasePrices(PDO $pdo): array
{
    $prices = [];
    foreach ($pdo->query('SELECT id, slug FROM bike_models')->fetchAll() as $model) {
        $prices[(string) $model['slug']] = recomputeModelBasePrice($pdo, (int) $model['id']);
    }
    return $prices;
}
