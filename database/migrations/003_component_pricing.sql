-- Cena roweru wynika z sumy składników, a nie z ręcznie wpisanej ceny bazowej.
-- Model dostaje cenę ramy, cenę składania i opcjonalny narzut; dotychczasowe
-- base_price staje się polem wyliczanym przez serwer (cena "od"), którego
-- panel nie może edytować.
ALTER TABLE bike_models
    CHANGE COLUMN base_price computed_base_price_gross DECIMAL(12,2) NULL,
    ADD COLUMN frame_price_gross DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER computed_base_price_gross,
    ADD COLUMN assembly_price_gross DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER frame_price_gross,
    ADD COLUMN margin_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER assembly_price_gross,
    ADD COLUMN fit_requirements JSON NULL AFTER specifications;

-- Rozmiar może kosztować więcej niż rozmiar odniesienia (np. dłuższa rama).
ALTER TABLE model_sizes
    ADD COLUMN price_delta_gross DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER label;

-- Atrybuty decydujące o zgodności trzymamy w osobnej kolumnie o stałych
-- kluczach. specifications pozostaje opisem marketingowym/technicznym, którego
-- kluczy nie da się filtrować.
ALTER TABLE parts
    ADD COLUMN fit_attributes JSON NULL AFTER specifications;

-- Rama nie jest częścią wymienną między modelami: jest modelem. Cena ramy
-- przeszła na bike_models.frame_price_gross, więc grupa "frame" znika.
UPDATE bike_models m
SET m.frame_price_gross = COALESCE((
        SELECT MAX(p.gross_price)
        FROM model_parts mp
        JOIN parts p ON p.id = mp.part_id
        JOIN part_groups pg ON pg.id = p.group_id
        WHERE mp.model_id = m.id AND pg.slug = 'frame'
    ), 0.00);

DELETE mp FROM model_parts mp
JOIN parts p ON p.id = mp.part_id
JOIN part_groups pg ON pg.id = p.group_id
WHERE pg.slug = 'frame';

DELETE mpgs FROM model_part_group_settings mpgs
JOIN part_groups pg ON pg.id = mpgs.group_id
WHERE pg.slug = 'frame';

DELETE cp FROM category_parts cp
JOIN parts p ON p.id = cp.part_id
JOIN part_groups pg ON pg.id = p.group_id
WHERE pg.slug = 'frame';

DELETE p FROM parts p
JOIN part_groups pg ON pg.id = p.group_id
WHERE pg.slug = 'frame';

DELETE FROM part_groups WHERE slug = 'frame';

-- category_parts nie było używane w wycenie ani w konfiguratorze. Dostępność
-- części rozstrzyga wyłącznie model_parts, bo zgodność wynika z ramy i silnika,
-- a nie z kategorii marketingowej.
DROP TABLE category_parts;

-- Grupa rozliczana od wybranej pozycji potrzebuje jawnego trybu także wtedy,
-- gdy model nie ma wiersza ustawień. Domyślnie zostaje select_one.
ALTER TABLE model_part_group_settings
    MODIFY COLUMN selection_mode ENUM('fixed', 'select_one', 'optional') NOT NULL DEFAULT 'select_one';

-- Robocze koszty składania i narzut. Ceny części już zawierają marżę Rexor,
-- więc narzut modelu startuje z zera.
UPDATE bike_models SET assembly_price_gross = 1500.00 WHERE slug IN ('e82-wielichowo', 'e55-reference');

-- Atrybuty zgodności dla pozycji, przy których wymiar faktycznie decyduje.
UPDATE parts SET fit_attributes = JSON_OBJECT('shock_size', '230x60') WHERE sku IN ('shock-rs-deluxe-230x60', 'shock-fox-float-x-pe-230x60');
UPDATE parts SET fit_attributes = JSON_OBJECT('shock_size', NULL) WHERE sku = 'shock-rs-super-deluxe';
UPDATE parts SET fit_attributes = JSON_OBJECT('wheel_in', 29, 'axle_front', '15x110 Boost', 'travel_mm', 150) WHERE sku = 'fork-rs-35-silver-150';
UPDATE parts SET fit_attributes = JSON_OBJECT('wheel_in', 29, 'axle_front', '15x110 Boost', 'travel_mm', 160) WHERE sku = 'fork-fox-36-performance-160';
UPDATE parts SET fit_attributes = JSON_OBJECT('charge_voltage_v', 54.60) WHERE sku = 'charger-54-6v-5a';
UPDATE parts SET fit_attributes = JSON_OBJECT('charge_voltage_v', 58.80) WHERE sku = 'charger-58-8v';
UPDATE parts SET fit_attributes = JSON_OBJECT('motor_bus', 'Bluetooth') WHERE sku = 'motor-m560-750w-bt';
UPDATE parts SET fit_attributes = JSON_OBJECT('motor_bus', 'CAN') WHERE sku = 'motor-m620-can';
UPDATE parts SET fit_attributes = JSON_OBJECT('motor_bus', 'CAN') WHERE sku IN ('display-dpc245', 'display-dpc010', 'display-dpc080');
UPDATE parts SET fit_attributes = JSON_OBJECT('motor_bus', 'Bluetooth') WHERE sku = 'display-dpc030';
UPDATE parts SET fit_attributes = JSON_OBJECT('axle_rear', '12x148 Boost') WHERE sku IN ('wheels-dt-swiss-29', 'hub-rear-dt370-boost');
UPDATE parts SET fit_attributes = JSON_OBJECT('axle_front', '15x110 Boost') WHERE sku = 'hub-front-boost-15x110';
UPDATE parts SET fit_attributes = JSON_OBJECT('wheel_in', 29) WHERE sku = 'tires-schwalbe-johnny-watts-29';

-- Wymagania modeli. Silnik E82 jest sterowany po Bluetooth, E55 po CAN, więc
-- lista wyświetlaczy zawęża się sama.
UPDATE bike_models
SET fit_requirements = JSON_OBJECT('shock_size', '230x60', 'axle_rear', '12x148 Boost', 'axle_front', '15x110 Boost', 'wheel_in', 29, 'charge_voltage_v', 54.60, 'motor_bus', 'Bluetooth')
WHERE slug = 'e82-wielichowo';

UPDATE bike_models
SET fit_requirements = JSON_OBJECT('shock_size', '210x55', 'axle_rear', '12x148 Boost', 'axle_front', '15x110 Boost', 'wheel_in', 29, 'charge_voltage_v', 58.80, 'motor_bus', 'CAN')
WHERE slug = 'e55-reference';

-- Silnik i ładowarka są stałe dla modelu: klient ich nie wybiera, ale ich cena
-- wchodzi do sumy składników.
INSERT INTO model_part_group_settings (model_id, group_id, selection_mode, customer_part_allowed, customer_part_gross_price, helper_text)
SELECT m.id, pg.id, 'fixed', FALSE, 0.00, 'Element stały wariantu modelu; wchodzi w cenę składników.'
FROM bike_models m
JOIN part_groups pg ON pg.slug = 'charger'
WHERE m.slug IN ('e82-wielichowo', 'e55-reference')
ON DUPLICATE KEY UPDATE selection_mode = 'fixed';
