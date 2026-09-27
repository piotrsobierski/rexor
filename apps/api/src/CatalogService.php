<?php

declare(strict_types=1);

/**
 * Publiczny katalog zawiera wszystko, co konfigurator musi pokazać i policzyć:
 * grupy opcji modelu, ceny pozycji, rozmiary, baterie i składniki ceny.
 * Konfigurator nie ma własnego cennika — liczy z tych danych i tak samo jak API.
 */
function publicCatalog(PDO $pdo): array
{
    $categories = $pdo->query('SELECT slug, name, short_description, description_html, default_image_path, hero_image_path, icon_key FROM bike_categories WHERE is_published = TRUE ORDER BY sort_order')->fetchAll();
    $models = $pdo->query(
        "SELECT m.id, m.category_id, bc.slug AS category_slug, m.slug, m.name, m.short_description, m.description_html, m.computed_base_price_gross, " .
        "m.frame_price_gross, m.assembly_price_gross, m.margin_percent, m.default_image_path, m.specifications, m.status, m.is_recommended " .
        "FROM bike_models m JOIN bike_categories bc ON bc.id = m.category_id WHERE m.status <> 'archived' ORDER BY m.sort_order"
    )->fetchAll();

    $mediaStatement = $pdo->prepare('SELECT me.storage_path, me.alt_text, mm.role, mm.sort_order FROM model_media mm JOIN media me ON me.id = mm.media_id WHERE mm.model_id = :model ORDER BY mm.sort_order, mm.media_id');

    foreach ($models as &$model) {
        $modelId = (int) $model['id'];
        $model['is_recommended'] = (bool) $model['is_recommended'];
        $mediaStatement->execute(['model' => $modelId]);
        $model['media'] = $mediaStatement->fetchAll();

        $model['batteries'] = array_map(static fn (array $battery): array => [
            'code' => $battery['code'],
            'name' => $battery['name'],
            'shortLabel' => $battery['short_label'],
            'cellFormat' => $battery['cell_format'],
            'seriesCount' => (int) $battery['series_count'],
            'parallelCount' => (int) $battery['parallel_count'],
            'capacityAh' => (float) $battery['pack_capacity_ah'],
            'energyWh' => (float) $battery['nominal_energy_wh'],
            'grossPrice' => (float) $battery['gross_price'],
            'isDefault' => (bool) $battery['is_default'],
        ], modelBatteries($pdo, $modelId));

        $model['sizes'] = array_map(static fn (array $size): array => [
            'code' => $size['code'],
            'label' => $size['label'],
            'priceDelta' => (float) $size['price_delta_gross'],
            'riderHeightMinCm' => $size['rider_height_min_cm'] !== null ? (int) $size['rider_height_min_cm'] : null,
            'riderHeightMaxCm' => $size['rider_height_max_cm'] !== null ? (int) $size['rider_height_max_cm'] : null,
        ], modelSizes($pdo, $modelId));

        // Grupy publikujemy bez pól wewnętrznych: konfigurator potrzebuje nazwy,
        // ceny, wyboru domyślnego i informacji, czy wolno podstawić część klienta.
        $model['groups'] = array_values(array_map(static function (array $group): array {
            $options = array_values(array_filter(
                array_map(static fn (array $option): array => [
                    'sku' => $option['sku'],
                    'name' => $option['name'],
                    'detail' => $option['detail'],
                    'price' => $option['price'],
                    'priceStatus' => $option['priceStatus'],
                    'isDefault' => $option['isDefault'],
                    'imagePath' => $option['imagePath'],
                    'configurable' => $option['isCustomerConfigurable'],
                ], $group['options']),
                static fn (array $option): bool => $option['configurable'] || $option['isDefault']
            ));

            return [
                'slug' => $group['slug'],
                'name' => $group['name'],
                'helper' => $group['helper'],
                'selectionMode' => $group['selectionMode'],
                'defaultSku' => $group['defaultSku'],
                'customerPartAllowed' => $group['customerPartAllowed'],
                'customerPartLabel' => $group['customerPartLabel'],
                'customerPartGrossPrice' => $group['customerPartGrossPrice'],
                'options' => $options,
            ];
        }, modelOptionGroups($pdo, $modelId)));

        $model['framePriceGross'] = (float) $model['frame_price_gross'];
        $model['assemblyPriceGross'] = (float) $model['assembly_price_gross'];
        $model['marginPercent'] = (float) $model['margin_percent'];
        $model['base_price'] = $model['computed_base_price_gross'] !== null ? (float) $model['computed_base_price_gross'] : null;
        $model['specifications'] = $model['specifications'] ? json_decode((string) $model['specifications'], true, 64, JSON_THROW_ON_ERROR) : [];
        unset($model['computed_base_price_gross'], $model['frame_price_gross'], $model['assembly_price_gross'], $model['margin_percent']);
    }
    unset($model);

    return ['categories' => $categories, 'models' => $models];
}
