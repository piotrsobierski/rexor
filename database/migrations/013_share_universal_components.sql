-- Część komponentów jest fizycznie uniwersalna (montuje się przez standardowe
-- wymiary - UDH, obejma kierownicy, standard hamulca, bus silnika Bafang - a
-- nie przez geometrię konkretnej ramy) i nie ma powodu, dla którego miałaby
-- być dostępna tylko w jednym z modeli. Dodajemy brakujące skrzyżowania jako
-- opcje (nie domyślne), zostawiając bez zmian to, co faktycznie jest
-- przypisane do konkretnej ramy/silnika:
--   - silnik i ładowarka (różna moc/napięcie na model),
--   - damper (rama E55 ma wymiar 210x55, żaden katalogowy damper go nie ma -
--     stąd tylko "część klienta" dla E55; katalogowe dampery 230x60 zostają
--     wyłącznie dla E82),
--   - tarcze/piasty (sparowane z konkretnym zestawem kół na model),
--   - wyświetlacz DPC 030 (zintegrowany fizycznie z górną rurą ramy E82 -
--     nie pasuje do E55).

-- Napęd: Linkglide XT (dziś tylko E55) -> też dla E82.
-- Deore M5100 i CUES U6000 (dziś tylko E82) -> też dla E55.
INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, sort_order)
SELECT m.id, p.id, FALSE, TRUE, 20
FROM bike_models m
JOIN parts p ON p.sku = 'drivetrain-linkglide-xt'
WHERE m.slug = 'e82-wielichowo'
ON DUPLICATE KEY UPDATE is_customer_configurable = VALUES(is_customer_configurable);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, sort_order)
SELECT m.id, p.id, FALSE, TRUE, 20
FROM bike_models m
JOIN parts p ON p.sku IN ('drivetrain-deore-m5100-11', 'drivetrain-cues-u6000-10')
WHERE m.slug = 'e55-reference'
ON DUPLICATE KEY UPDATE is_customer_configurable = VALUES(is_customer_configurable);

-- Gripy: obie wersje dostępne w obu modelach.
INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, sort_order)
SELECT m.id, p.id, FALSE, TRUE, 10
FROM bike_models m
JOIN parts p ON p.sku = 'grips-wrist-support'
WHERE m.slug = 'e82-wielichowo'
ON DUPLICATE KEY UPDATE is_customer_configurable = VALUES(is_customer_configurable);

INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, sort_order)
SELECT m.id, p.id, FALSE, TRUE, 10
FROM bike_models m
JOIN parts p ON p.sku = 'grips-odi-rogue-v21'
WHERE m.slug = 'e55-reference'
ON DUPLICATE KEY UPDATE is_customer_configurable = VALUES(is_customer_configurable);

-- Opony Schwalbe: dziś tylko E82 -> też dla E55.
INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, sort_order)
SELECT m.id, p.id, FALSE, TRUE, 10
FROM bike_models m
JOIN parts p ON p.sku = 'tires-schwalbe-johnny-watts-29'
WHERE m.slug = 'e55-reference'
ON DUPLICATE KEY UPDATE is_customer_configurable = VALUES(is_customer_configurable);

-- Hamulce Shimano 4-tłoczkowe: dziś tylko E82 -> też dla E55.
INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, sort_order)
SELECT m.id, p.id, FALSE, TRUE, 10
FROM bike_models m
JOIN parts p ON p.sku = 'brakes-shimano-4p'
WHERE m.slug = 'e55-reference'
ON DUPLICATE KEY UPDATE is_customer_configurable = VALUES(is_customer_configurable);

-- Widelec RockShox 35 Silver (150 mm, Boost, 29") - dziś tylko E82 -> też dla
-- E55 jako opcja obok domyślnego FOX 36.
INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, sort_order)
SELECT m.id, p.id, FALSE, TRUE, 20
FROM bike_models m
JOIN parts p ON p.sku = 'fork-rs-35-silver-150'
WHERE m.slug = 'e55-reference'
ON DUPLICATE KEY UPDATE is_customer_configurable = VALUES(is_customer_configurable);

-- Wyświetlacze DPC 010 i DPC 080 NIE są tu dodawane do E82: oba wymagają
-- magistrali CAN (fit_attributes.motor_bus = 'CAN'), a E82 ma dziś
-- przypisane wyłącznie silniki Bluetooth (M510, M560 500 W BT) - dodanie
-- tych wyświetlaczy stworzyłoby opcję niezgodną z żadnym silnikiem modelu.
