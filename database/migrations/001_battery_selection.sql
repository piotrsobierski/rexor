-- Bateria staje się wyborem w konfiguratorze, a nie stałą cechą modelu.
-- Potrzebny jest stabilny, czytelny identyfikator opcji (kod) oraz kolejność
-- prezentacji. Identyfikator liczbowy nie nadaje się do linków i snapshotów.

ALTER TABLE model_batteries
    ADD COLUMN code VARCHAR(60) NULL AFTER model_id,
    ADD COLUMN short_label VARCHAR(160) NULL AFTER name,
    ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER specifications;

-- Kody preseedowanych pakietów ustawiamy wprost, bo frontend trzyma ten sam
-- katalog zapasowy na wypadek niedostępności API.
UPDATE model_batteries mb
JOIN bike_models m ON m.id = mb.model_id
SET mb.code = 'e82-982wh'
WHERE mb.code IS NULL AND m.slug = 'e82-wielichowo';

UPDATE model_batteries mb
JOIN bike_models m ON m.id = mb.model_id
SET mb.code = 'e55-1310wh'
WHERE mb.code IS NULL AND m.slug = 'e55-reference';

-- Pozostałe rekordy dostają kod pochodny od energii pakietu.
UPDATE model_batteries
SET code = CONCAT('pack-', id, '-', REPLACE(FORMAT(nominal_energy_wh, 0), ',', ''), 'wh')
WHERE code IS NULL;

UPDATE model_batteries
SET short_label = CONCAT(cell_format, ' · ', series_count, 'S', parallel_count, 'P · ', FORMAT(nominal_energy_wh, 1), ' Wh')
WHERE short_label IS NULL;

ALTER TABLE model_batteries
    MODIFY COLUMN code VARCHAR(60) NOT NULL,
    ADD UNIQUE KEY uq_model_battery_code (model_id, code);

-- Preseed przykładowych wariantów, żeby wybór baterii miał sens w katalogu
-- startowym. Ceny i oznaczenia ogniw wymagają potwierdzenia przez Rexor.
INSERT INTO model_batteries
    (model_id, code, name, short_label, cell_format, cell_manufacturer, cell_model, series_count, parallel_count, cell_capacity_ah, nominal_voltage_v, charge_voltage_v, pack_capacity_ah, nominal_energy_wh, bms_continuous_a, gross_price, specifications, sort_order, is_default, is_active)
SELECT m.id, 'e82-655wh', 'Samsung 35E 13S4P - pakiet lżejszy', '18650 · 13S4P · 655,2 Wh', '18650', 'Samsung SDI', 'INR18650-35E', 13, 4, 3.500, 46.80, 54.60, 14.00, 655.20, NULL, 1800.00, JSON_OBJECT('cell_count', 52, 'status', 'example_to_confirm'), 10, FALSE, TRUE
FROM bike_models m
WHERE m.slug = 'e82-wielichowo'
  AND NOT EXISTS (SELECT 1 FROM model_batteries b WHERE b.model_id = m.id AND b.code = 'e82-655wh');

INSERT INTO model_batteries
    (model_id, code, name, short_label, cell_format, cell_manufacturer, cell_model, series_count, parallel_count, cell_capacity_ah, nominal_voltage_v, charge_voltage_v, pack_capacity_ah, nominal_energy_wh, bms_continuous_a, gross_price, specifications, sort_order, is_default, is_active)
SELECT m.id, 'e55-983wh', 'DengFu 52 V 14S3P - pakiet standardowy', '21700 · 14S3P · 982,8 Wh', '21700', 'Far East Battery', 'FEB 21700 6500 mAh - kod do potwierdzenia', 14, 3, 6.500, 50.40, 58.80, 19.50, 982.80, 60.00, 2600.00, JSON_OBJECT('cell_count', 42, 'status', 'example_to_confirm'), 10, FALSE, TRUE
FROM bike_models m
WHERE m.slug = 'e55-reference'
  AND NOT EXISTS (SELECT 1 FROM model_batteries b WHERE b.model_id = m.id AND b.code = 'e55-983wh');

UPDATE model_batteries SET sort_order = 0 WHERE is_default = TRUE;
