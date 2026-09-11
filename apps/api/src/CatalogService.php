<?php

declare(strict_types=1);

function publicCatalog(PDO $pdo): array
{
    $categories = $pdo->query('SELECT slug, name, short_description, description_html, default_image_path FROM bike_categories WHERE is_published = TRUE ORDER BY sort_order')->fetchAll();
    $models = $pdo->query("SELECT id, category_id, slug, name, short_description, description_html, base_price, default_image_path, specifications FROM bike_models WHERE status <> 'archived' ORDER BY sort_order")->fetchAll();
    $mediaStatement = $pdo->prepare('SELECT me.storage_path, me.alt_text, mm.role, mm.sort_order FROM model_media mm JOIN media me ON me.id = mm.media_id WHERE mm.model_id = :model ORDER BY mm.sort_order, mm.media_id');
    // Bateria jest wyborem w konfiguratorze, więc publiczny katalog musi podać
    // wszystkie aktywne pakiety modelu razem z ceną i domyślnym wariantem.
    $batteryStatement = $pdo->prepare(
        'SELECT code, name, short_label, cell_format, series_count, parallel_count, pack_capacity_ah, nominal_energy_wh, gross_price, is_default ' .
        'FROM model_batteries WHERE model_id = :model AND is_active = TRUE ORDER BY sort_order, nominal_energy_wh'
    );
    foreach ($models as &$model) {
        $mediaStatement->execute(['model' => $model['id']]);
        $model['media'] = $mediaStatement->fetchAll();
        $batteryStatement->execute(['model' => $model['id']]);
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
        ], $batteryStatement->fetchAll());
        $model['base_price'] = $model['base_price'] !== null ? (float) $model['base_price'] : null;
        $model['specifications'] = $model['specifications'] ? json_decode((string) $model['specifications'], true, 64, JSON_THROW_ON_ERROR) : [];
    }
    unset($model);
    return ['categories' => $categories, 'models' => $models];
}
