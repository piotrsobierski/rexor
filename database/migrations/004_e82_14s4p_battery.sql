-- Dodanie pakietu 14S4P 50.4 V (705.6 Wh) do modelu Rexor E82
-- Bazuje na ogniwach 18650 (Samsung INR18650-35E 3.5 Ah, 14S4P, 56 ogniw).

INSERT INTO model_batteries
    (model_id, code, name, short_label, cell_format, cell_manufacturer, cell_model, series_count, parallel_count, cell_capacity_ah, nominal_voltage_v, charge_voltage_v, pack_capacity_ah, nominal_energy_wh, bms_continuous_a, gross_price, specifications, sort_order, is_default, is_active)
SELECT
    m.id,
    'e82-706wh',
    'Samsung 35E 14S4P · 705,6 Wh',
    '18650 · 14S4P · 705,6 Wh',
    '18650',
    'Samsung SDI',
    'INR18650-35E',
    14,
    4,
    3.500,
    50.40,
    58.80,
    14.00,
    705.60,
    45.00,
    1950.00,
    JSON_OBJECT('cell_count', 56, 'estimated_cells_weight_kg', 2.63, 'estimated_pack_weight_kg', 3.25, 'status', 'configured'),
    15,
    FALSE,
    TRUE
FROM bike_models m
WHERE m.slug = 'e82-wielichowo'
  AND NOT EXISTS (SELECT 1 FROM model_batteries b WHERE b.model_id = m.id AND b.code = 'e82-706wh');
