-- Odtworzenie modelu Rexor E82 (slug "e82") wraz z rozmiarami, bateriami,
-- osprzętem, ustawieniami grup i powiązaniami zdjęć.
--
-- Model został omyłkowo usunięty na wdrożeniu dev przez nowy endpoint
-- DELETE /admin/models/{id}. Dane pochodzą z bazy lokalnej, zgodnej co do
-- wiersza z produkcją. Każdy INSERT jest warunkowy: tam, gdzie model już
-- istnieje (produkcja), migracja nie zmienia niczego.

INSERT INTO bike_models (category_id, slug, name, short_description, description_html, computed_base_price_gross, frame_price_gross, assembly_price_gross, margin_percent, currency, vat_rate, prices_include_vat, specifications, default_image_path, status, sort_order)
SELECT c.id, 'e82', 'Rexor E82', 'Pełnozawieszony elektryczny rower enduro na karbonowej ramie DengFu E82.', '<h3>Karbonowe e-enduro stworzone do mocnej jazdy</h3><p><strong>Rexor E82</strong> to najbardziej sportowy i agresywny model e-MTB w naszej ofercie. Został zaprojektowany dla osób, które chcą wykorzystać możliwości napędu elektrycznego nie tylko na podjazdach, ale przede wszystkim podczas szybkiej jazdy w prawdziwym terenie.</p><p>Karbonowa rama, około <strong>170 mm skoku tylnego zawieszenia</strong>, nowoczesna geometria oraz możliwość zastosowania kół 29" sprawiają, że E82 czuje się najlepiej na stromych trasach, kamieniach, korzeniach, szybkich zjazdach i technicznych singletrackach. To konstrukcja zdecydowanie bliższa współczesnemu rowerowi enduro niż klasycznemu trekkingowemu e-bike''owi.</p><h3>Dlaczego E82?</h3><p>Największą zaletą E82 jest połączenie dużego skoku z relatywnie kompaktową i sportową konstrukcją. <strong>Kąt główki ramy 64°</strong> zapewnia stabilność na stromych zjazdach, natomiast <strong>kąt rury podsiodłowej 77°</strong> pomaga utrzymać wydajną pozycję na podjazdach. Tylne widełki mają około <strong>455 mm</strong>, dzięki czemu rower pozostaje znacznie bardziej zwrotny niż typowe ciężkie konstrukcje wykorzystujące większe jednostki napędowe.</p><p>E82 wykorzystuje standard <strong>Boost 148 × 12 mm</strong>, hak przerzutki <strong>UDH</strong>, wewnętrzne prowadzenie przewodów oraz pozwala na montaż opon do <strong>29 × 2,6"</strong> albo <strong>27,5 × 2,8"</strong>. Rama wykonana jest z włókien węglowych Toray T700/T800.</p><h3>Dla kogo?</h3><p>To najlepszy wybór dla osoby, która:</p><ul><li>jeździ po górach, bikeparkach i technicznych trasach,</li><li>chce dużego skoku zawieszenia i geometrii enduro,</li><li>oczekuje dobrej zwrotności mimo obecności silnika i dużej baterii,</li><li>bardziej ceni prowadzenie roweru niż maksymalną moc napędu,</li><li>chce zbudować nowoczesnego e-MTB na kołach 29".</li></ul><h3>Najważniejsze parametry E82</h3><table><thead><tr><th>Parametr</th><th>Rexor E82</th></tr></thead><tbody><tr><td>Typ</td><td>E-MTB / Enduro</td></tr><tr><td>Materiał ramy</td><td>karbon Toray T700/T800</td></tr><tr><td>Skok ramy</td><td>ok. 170–171 mm</td></tr><tr><td>Amortyzator tylny</td><td>230 × 60 mm</td></tr><tr><td>Kąt główki</td><td>64°</td></tr><tr><td>Kąt rury podsiodłowej</td><td>77°</td></tr><tr><td>Tył</td><td>Boost 148 × 12 mm</td></tr><tr><td>Hak przerzutki</td><td>UDH</td></tr><tr><td>Maks. opona</td><td>29 × 2,6" / 27,5 × 2,8"</td></tr><tr><td>Prowadzenie przewodów</td><td>wewnętrzne</td></tr><tr><td>Rozmiary platformy</td><td>M / L / XL, zależnie od wersji</td></tr><tr><td>Typ napędu OEM</td><td>Bafang M510 / M560</td></tr><tr><td>Bateria OEM</td><td>do ok. 1008 Wh</td></tr></tbody></table><p><strong>„Pod górę dzięki elektryce. W dół jak prawdziwe enduro.”</strong></p>', 15000.00, 4500.00, 1500.00, 0.00, 'PLN', 23.00, 1, '{"order_type": "reference", "frame_model": "E82", "frame_material": "Toray T700/T800 carbon", "selected_motor": "Bafang M560 750 W", "display_options": ["DPC 030", "DPC 245"], "frame_travel_mm": 170, "frame_manufacturer": "DengFu"}', '/media/models/e82/01.jpg', 'draft', 10
FROM bike_categories c
WHERE c.slug = 'elektryczne'
  AND NOT EXISTS (SELECT 1 FROM bike_models m WHERE m.slug = 'e82');

INSERT INTO model_sizes (model_id, code, label, rider_height_min_cm, rider_height_max_cm, geometry, source_url, sort_order, is_active)
SELECT m.id, 'S', 'S (widoczny tylko w tabeli geometrii)', NULL, NULL, '{"reach_mm": 435, "stack_mm": 606, "bb_drop_mm": 12, "top_tube_mm": 563, "bb_height_mm": 360, "chainstay_mm": 455, "head_tube_mm": 110, "seat_tube_mm": 400, "wheelbase_mm": 1224, "fork_length_mm": 590, "head_angle_deg": 64, "rear_travel_mm": 171, "seat_angle_deg": 77}', 'https://www.dengfubike.com/products/e82-frame-motor-battery-kit', 10, 1
FROM bike_models m WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_sizes s WHERE s.model_id = m.id AND s.code = 'S');

INSERT INTO model_sizes (model_id, code, label, rider_height_min_cm, rider_height_max_cm, geometry, source_url, sort_order, is_active)
SELECT m.id, 'M', 'M / 17 cali', NULL, NULL, '{"reach_mm": 450, "stack_mm": 624, "bb_drop_mm": 12, "top_tube_mm": 595, "bb_height_mm": 360, "chainstay_mm": 455, "head_tube_mm": 120, "seat_tube_mm": 440, "wheelbase_mm": 1253, "fork_length_mm": 590, "head_angle_deg": 64, "rear_travel_mm": 171, "seat_angle_deg": 77}', 'https://www.dengfubike.com/products/e82-frame-motor-battery-kit', 20, 1
FROM bike_models m WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_sizes s WHERE s.model_id = m.id AND s.code = 'M');

INSERT INTO model_sizes (model_id, code, label, rider_height_min_cm, rider_height_max_cm, geometry, source_url, sort_order, is_active)
SELECT m.id, 'L', 'L / 19 cali', NULL, NULL, '{"reach_mm": 485, "stack_mm": 624, "bb_drop_mm": 12, "top_tube_mm": 618, "bb_height_mm": 360, "chainstay_mm": 455, "head_tube_mm": 130, "seat_tube_mm": 480, "wheelbase_mm": 1282, "fork_length_mm": 590, "head_angle_deg": 64, "rear_travel_mm": 171, "seat_angle_deg": 77}', 'https://www.dengfubike.com/products/e82-frame-motor-battery-kit', 30, 1
FROM bike_models m WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_sizes s WHERE s.model_id = m.id AND s.code = 'L');

INSERT INTO model_sizes (model_id, code, label, rider_height_min_cm, rider_height_max_cm, geometry, source_url, sort_order, is_active)
SELECT m.id, 'XL', 'XL / 21 cali', NULL, NULL, '{"reach_mm": 510, "stack_mm": 638, "bb_drop_mm": 12, "top_tube_mm": 648, "bb_height_mm": 360, "chainstay_mm": 455, "head_tube_mm": 135, "seat_tube_mm": 520, "wheelbase_mm": 1314, "fork_length_mm": 590, "head_angle_deg": 64, "rear_travel_mm": 171, "seat_angle_deg": 77}', 'https://www.dengfubike.com/products/e82-frame-motor-battery-kit', 40, 1
FROM bike_models m WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_sizes s WHERE s.model_id = m.id AND s.code = 'XL');

INSERT INTO model_batteries (model_id, code, name, short_label, cell_format, cell_manufacturer, cell_model, series_count, parallel_count, cell_capacity_ah, nominal_voltage_v, charge_voltage_v, pack_capacity_ah, nominal_energy_wh, bms_continuous_a, gross_price, sort_order, is_default, is_active)
SELECT m.id, 'e82-982wh', 'Samsung 35E 13S6P', '18650 · 13S6P · 982,8 Wh', '18650', 'Samsung SDI', 'INR18650-35E', 13, 6, 3.500, 46.80, 54.60, 21.00, 982.80, NULL, 2400.00, 0, 1, 1
FROM bike_models m WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_batteries b WHERE b.model_id = m.id AND b.code = 'e82-982wh');

INSERT INTO model_batteries (model_id, code, name, short_label, cell_format, cell_manufacturer, cell_model, series_count, parallel_count, cell_capacity_ah, nominal_voltage_v, charge_voltage_v, pack_capacity_ah, nominal_energy_wh, bms_continuous_a, gross_price, sort_order, is_default, is_active)
SELECT m.id, 'e82-655wh', 'Samsung 35E 13S4P - pakiet lżejszy', '18650 · 13S4P · 655,2 Wh', '18650', 'Samsung SDI', 'INR18650-35E', 13, 4, 3.500, 46.80, 54.60, 14.00, 655.20, NULL, 1800.00, 10, 0, 1
FROM bike_models m WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_batteries b WHERE b.model_id = m.id AND b.code = 'e82-655wh');

INSERT INTO model_batteries (model_id, code, name, short_label, cell_format, cell_manufacturer, cell_model, series_count, parallel_count, cell_capacity_ah, nominal_voltage_v, charge_voltage_v, pack_capacity_ah, nominal_energy_wh, bms_continuous_a, gross_price, sort_order, is_default, is_active)
SELECT m.id, 'e82-706wh', 'Samsung 35E 14S4P · 705,6 Wh', '18650 · 14S4P · 705,6 Wh', '18650', 'Samsung SDI', 'INR18650-35E', 14, 4, 3.500, 50.40, 58.80, 14.00, 705.60, 45.00, 1950.00, 15, 0, 1
FROM bike_models m WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_batteries b WHERE b.model_id = m.id AND b.code = 'e82-706wh');

INSERT INTO model_part_group_settings (model_id, group_id, selection_mode, customer_part_allowed, customer_part_gross_price, customer_part_label, helper_text)
SELECT m.id, pg.id, 'fixed', 0, 0.00, 'Dostarczam własną część', 'Silnik jest przypisany do wariantu modelu; klient wybiera wyświetlacz.'
FROM bike_models m JOIN part_groups pg ON pg.slug = 'motor'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_part_group_settings s WHERE s.model_id = m.id AND s.group_id = pg.id);

INSERT INTO model_part_group_settings (model_id, group_id, selection_mode, customer_part_allowed, customer_part_gross_price, customer_part_label, helper_text)
SELECT m.id, pg.id, 'fixed', 0, 0.00, 'Dostarczam własną część', 'Element stały wariantu modelu; wchodzi w cenę składników.'
FROM bike_models m JOIN part_groups pg ON pg.slug = 'charger'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_part_group_settings s WHERE s.model_id = m.id AND s.group_id = pg.id);

INSERT INTO model_part_group_settings (model_id, group_id, selection_mode, customer_part_allowed, customer_part_gross_price, customer_part_label, helper_text)
SELECT m.id, pg.id, 'fixed', 0, 0.00, 'Dostarczam własną część', 'Wyświetlacz DPC 030 jest zintegrowany z ramą E82 i nie podlega zmianie.'
FROM bike_models m JOIN part_groups pg ON pg.slug = 'display'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_part_group_settings s WHERE s.model_id = m.id AND s.group_id = pg.id);

INSERT INTO model_part_group_settings (model_id, group_id, selection_mode, customer_part_allowed, customer_part_gross_price, customer_part_label, helper_text)
SELECT m.id, pg.id, 'optional', 0, 0.00, 'Dostarczam własną część', 'Opcjonalny dodatek - możesz go pominąć.'
FROM bike_models m JOIN part_groups pg ON pg.slug = 'front-light'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_part_group_settings s WHERE s.model_id = m.id AND s.group_id = pg.id);

INSERT INTO model_part_group_settings (model_id, group_id, selection_mode, customer_part_allowed, customer_part_gross_price, customer_part_label, helper_text)
SELECT m.id, pg.id, 'optional', 0, 0.00, 'Dostarczam własną część', 'Opcjonalny dodatek - możesz go pominąć.'
FROM bike_models m JOIN part_groups pg ON pg.slug = 'rear-light'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_part_group_settings s WHERE s.model_id = m.id AND s.group_id = pg.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 0, 1, 0, 0.00, NULL, 'Opcja/dopłata dla E82 - dane robocze.', 0
FROM bike_models m JOIN parts p ON p.sku = 'brakes-magura-mt5'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 1, 1, 1, 0.00, NULL, 'W cenie bazowej według konfiguracji referencyjnej.', 0
FROM bike_models m JOIN parts p ON p.sku = 'brakes-shimano-4p'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 1, 1, 0, 0.00, NULL, 'W cenie bazowej według konfiguracji referencyjnej.', 0
FROM bike_models m JOIN parts p ON p.sku = 'charger-54-6v-5a'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 1, 0, 0, 0.00, NULL, 'Opcja/dopłata dla E82 - dane robocze.', 0
FROM bike_models m JOIN parts p ON p.sku = 'display-dpc030'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 0, 1, 0, 0.00, NULL, 'Opcja/dopłata dla E82 - dane robocze.', 0
FROM bike_models m JOIN parts p ON p.sku = 'drivetrain-cues-u6000-10'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 1, 1, 0, 0.00, NULL, 'W cenie bazowej według konfiguracji referencyjnej.', 0
FROM bike_models m JOIN parts p ON p.sku = 'drivetrain-deore-m5100-11'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 1, 1, 0, 0.00, NULL, 'W cenie bazowej według konfiguracji referencyjnej.', 0
FROM bike_models m JOIN parts p ON p.sku = 'dropper-31-6-170'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 0, 1, 0, 0.00, NULL, 'Opcja/dopłata dla E82 - dane robocze.', 0
FROM bike_models m JOIN parts p ON p.sku = 'fork-fox-36-performance-160'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 1, 1, 1, 0.00, NULL, 'W cenie bazowej według konfiguracji referencyjnej.', 0
FROM bike_models m JOIN parts p ON p.sku = 'fork-rs-35-silver-150'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 1, 1, 0, 0.00, NULL, 'W cenie bazowej według konfiguracji referencyjnej.', 0
FROM bike_models m JOIN parts p ON p.sku = 'grips-odi-rogue-v21'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 1, 1, 0, 0.00, NULL, 'W cenie bazowej według konfiguracji referencyjnej.', 0
FROM bike_models m JOIN parts p ON p.sku = 'handlebar-alu-760-780-9'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 1, 0, 0, 0.00, NULL, 'W cenie bazowej według konfiguracji referencyjnej.', 0
FROM bike_models m JOIN parts p ON p.sku = 'motor-m560-750w-bt'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 0, 1, 0, 0.00, NULL, 'Opcja/dopłata dla E82 - dane robocze.', 0
FROM bike_models m JOIN parts p ON p.sku = 'paint-custom-two-color'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 0, 1, 0, 0.00, NULL, 'Opcja/dopłata dla E82 - dane robocze.', 0
FROM bike_models m JOIN parts p ON p.sku = 'paint-single-color'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 1, 1, 0, 0.00, NULL, 'Standardowe lakierowanie jest punktem odniesienia dla dopłat.', 0
FROM bike_models m JOIN parts p ON p.sku = 'paint-standard'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 1, 1, 1, 0.00, NULL, 'W cenie bazowej według konfiguracji referencyjnej.', 0
FROM bike_models m JOIN parts p ON p.sku = 'pedals-platform-mtb'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 1, 1, 0, 0.00, NULL, 'W cenie bazowej według konfiguracji referencyjnej.', 0
FROM bike_models m JOIN parts p ON p.sku = 'rotors-203-180'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 1, 1, 1, 0.00, NULL, 'W cenie bazowej według konfiguracji referencyjnej.', 0
FROM bike_models m JOIN parts p ON p.sku = 'saddle-gel'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 0, 1, 0, 0.00, NULL, 'Opcja/dopłata dla E82 - dane robocze.', 0
FROM bike_models m JOIN parts p ON p.sku = 'shock-fox-float-x-pe-230x60'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 1, 1, 1, 0.00, NULL, 'W cenie bazowej według konfiguracji referencyjnej.', 0
FROM bike_models m JOIN parts p ON p.sku = 'shock-rs-deluxe-230x60'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 0, 1, 0, 0.00, NULL, 'Opcja/dopłata dla E82 - dane robocze.', 0
FROM bike_models m JOIN parts p ON p.sku = 'shock-rs-super-deluxe'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 1, 1, 0, 0.00, NULL, 'W cenie bazowej według konfiguracji referencyjnej.', 0
FROM bike_models m JOIN parts p ON p.sku = 'stem-short-mtb-black'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 0, 1, 0, 0.00, NULL, 'Opcja/dopłata dla E82 - dane robocze.', 0
FROM bike_models m JOIN parts p ON p.sku = 'tires-maxxis-2-6'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 1, 1, 0, 0.00, NULL, 'W cenie bazowej według konfiguracji referencyjnej.', 0
FROM bike_models m JOIN parts p ON p.sku = 'tires-schwalbe-johnny-watts-29'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 1, 1, 0, 0.00, NULL, 'W cenie bazowej według konfiguracji referencyjnej.', 0
FROM bike_models m JOIN parts p ON p.sku = 'wheels-dt-swiss-29'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 0, 1, 0, 0.00, NULL, NULL, 10
FROM bike_models m JOIN parts p ON p.sku = 'grips-wrist-support'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 0, 1, 0, 0.00, NULL, NULL, 10
FROM bike_models m JOIN parts p ON p.sku = 'light-front-knog-blinder-e1300'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 0, 1, 0, 0.00, NULL, NULL, 10
FROM bike_models m JOIN parts p ON p.sku = 'light-rear-supernova-tl3-seatpost'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 0, 1, 0, 0.00, NULL, 'Opcjonalny wariant silnika dla E82', 10
FROM bike_models m JOIN parts p ON p.sku = 'motor-m510-250w'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 0, 1, 0, 0.00, NULL, 'Opcjonalny wariant silnika dla E82', 10
FROM bike_models m JOIN parts p ON p.sku = 'motor-m560-500w-bt'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 0, 1, 0, 0.00, NULL, 'Opcjonalny wariant silnika dla E82', 10
FROM bike_models m JOIN parts p ON p.sku = 'motor-m560-750w-can'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT m.id, p.id, 0, 1, 0, 0.00, NULL, NULL, 20
FROM bike_models m JOIN parts p ON p.sku = 'drivetrain-linkglide-xt'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_parts mp WHERE mp.model_id = m.id AND mp.part_id = p.id);

INSERT INTO media (storage_path, original_filename, mime_type, width_px, height_px, size_bytes, alt_text, caption)
SELECT '/media/models/e82/01.jpg', 'e82s-l1600.jpg', 'image/jpeg', 1600, 1066, 230775, 'Rexor E82 - widok całego roweru z boku', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media WHERE storage_path = '/media/models/e82/01.jpg');

INSERT INTO model_media (model_id, media_id, role, sort_order)
SELECT m.id, me.id, 'default', 10
FROM bike_models m JOIN media me ON me.storage_path = '/media/models/e82/01.jpg'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_media mm WHERE mm.model_id = m.id AND mm.media_id = me.id);

INSERT INTO media (storage_path, original_filename, mime_type, width_px, height_px, size_bytes, alt_text, caption)
SELECT '/media/models/e82/02.jpg', 'e82s-l1600-2.jpg', 'image/jpeg', 1600, 1066, 218074, 'Rexor E82 - zdjęcie modelu 2', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media WHERE storage_path = '/media/models/e82/02.jpg');

INSERT INTO model_media (model_id, media_id, role, sort_order)
SELECT m.id, me.id, 'gallery', 20
FROM bike_models m JOIN media me ON me.storage_path = '/media/models/e82/02.jpg'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_media mm WHERE mm.model_id = m.id AND mm.media_id = me.id);

INSERT INTO media (storage_path, original_filename, mime_type, width_px, height_px, size_bytes, alt_text, caption)
SELECT '/media/models/e82/03.jpg', 'e82s-l1600-3.jpg', 'image/jpeg', 1600, 1066, 272947, 'Rexor E82 - zdjęcie modelu 3', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media WHERE storage_path = '/media/models/e82/03.jpg');

INSERT INTO model_media (model_id, media_id, role, sort_order)
SELECT m.id, me.id, 'gallery', 30
FROM bike_models m JOIN media me ON me.storage_path = '/media/models/e82/03.jpg'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_media mm WHERE mm.model_id = m.id AND mm.media_id = me.id);

INSERT INTO media (storage_path, original_filename, mime_type, width_px, height_px, size_bytes, alt_text, caption)
SELECT '/media/models/e82/04.jpg', 'e82s-l1600-4.jpg', 'image/jpeg', 1600, 1066, 245384, 'Rexor E82 - zdjęcie modelu 4', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media WHERE storage_path = '/media/models/e82/04.jpg');

INSERT INTO model_media (model_id, media_id, role, sort_order)
SELECT m.id, me.id, 'gallery', 40
FROM bike_models m JOIN media me ON me.storage_path = '/media/models/e82/04.jpg'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_media mm WHERE mm.model_id = m.id AND mm.media_id = me.id);

INSERT INTO media (storage_path, original_filename, mime_type, width_px, height_px, size_bytes, alt_text, caption)
SELECT '/media/models/e82/05.jpg', 'e82s-l1600-5.jpg', 'image/jpeg', 1600, 1066, 187645, 'Rexor E82 - zdjęcie modelu 5', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media WHERE storage_path = '/media/models/e82/05.jpg');

INSERT INTO model_media (model_id, media_id, role, sort_order)
SELECT m.id, me.id, 'gallery', 50
FROM bike_models m JOIN media me ON me.storage_path = '/media/models/e82/05.jpg'
WHERE m.slug = 'e82'
  AND NOT EXISTS (SELECT 1 FROM model_media mm WHERE mm.model_id = m.id AND mm.media_id = me.id);

