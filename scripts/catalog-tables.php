<?php

declare(strict_types=1);

/**
 * Tabele "katalogu produktowego" (modele, ramy, malowania, realizacje) -
 * współdzielona lista dla scripts/extract-catalog-sql.php i dokumentacji.
 * Kolejność ma znaczenie dla INSERT (rodzice przed dziećmi); TRUNCATE i tak
 * biegnie pod SET FOREIGN_KEY_CHECKS=0, więc jego kolejność jest dowolna.
 *
 * Świadomie POZA zakresem: configurations, configuration_items,
 * configuration_paint, inquiries, email_outbox (dane wygenerowane przez
 * użytkowników środowiska, nie katalog) oraz konta admina, activity_log,
 * site_pages, site_settings.
 */

function catalogTables(): array
{
    return [
        'media',
        'bike_categories',
        'bike_models',
        'category_media',
        'frames',
        'frame_media',
        'frame_sizes',
        'frame_paint_palettes',
        'model_batteries',
        'model_media',
        'paint_palettes',
        'paint_colors',
        'model_paint_palettes',
        'part_groups',
        'parts',
        'compatibility_rules',
        'model_parts',
        'model_part_group_settings',
        'model_price_adjustments',
        'model_sizes',
        'paint_renders',
        'part_media',
        'projects',
        'project_media',
    ];
}
