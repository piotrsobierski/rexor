-- Dodanie wariantów silników do bazy danych
-- Umożliwia wybór między różnymi wersjami silników (M560 750W Bluetooth, M560 500W, M510 250W, M620 CAN/UART)

INSERT INTO parts
    (group_id, sku, name, manufacturer, model, description, fit_attributes, price_status, gross_price)
VALUES
    ((SELECT id FROM part_groups WHERE slug='motor'), 'motor-m510-250w', 'Silnik Bafang M510 250 W / 95 Nm', 'Bafang', 'M510', 'Moc znamionowa 250 W, moment 95 Nm. Lekka jednostka zgodna z normą EPAC / EN 15194 na drogi publiczne.', JSON_OBJECT('motor_bus', 'Bluetooth'), 'fixed', 3700.00),
    ((SELECT id FROM part_groups WHERE slug='motor'), 'motor-m560-500w-bt', 'Silnik Bafang M560 500 W (Bluetooth)', 'Bafang', 'M560', 'Moc 500 W, zintegrowany sterownik Bluetooth.', JSON_OBJECT('motor_bus', 'Bluetooth'), 'fixed', 4100.00),
    ((SELECT id FROM part_groups WHERE slug='motor'), 'motor-m560-750w-can', 'Silnik Bafang M560 750 W (CAN)', 'Bafang', 'M560', 'Moc 750 W, magistrala CAN do wyświetlaczy cyfrowych CAN.', JSON_OBJECT('motor_bus', 'CAN'), 'fixed', 4300.00),
    ((SELECT id FROM part_groups WHERE slug='motor'), 'motor-m620-uart', 'Silnik Bafang M620 1000 W (UART)', 'Bafang', 'M620', 'Moc 1000 W, tradycyjna magistrala UART.', JSON_OBJECT('motor_bus', 'UART'), 'fixed', 4600.00)
ON DUPLICATE KEY UPDATE name = VALUES(name), gross_price = VALUES(gross_price);

-- Aktualizacja wymagań E82, aby dopuszczać silniki z magistralą Bluetooth i CAN
UPDATE bike_models
SET fit_requirements = JSON_SET(fit_requirements, '$.motor_bus', JSON_ARRAY('Bluetooth', 'CAN'))
WHERE slug = 'e82-wielichowo';

-- Przypisanie wariantów silników do modelu Rexor E82 (M510 i M560)
INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, customer_supplied_allowed, customer_supplied_gross_price, gross_price_override, notes, sort_order)
SELECT
    (SELECT id FROM bike_models WHERE slug='e82-wielichowo'),
    p.id,
    FALSE,
    TRUE,
    FALSE,
    0.00,
    NULL,
    'Opcjonalny wariant silnika dla E82',
    10
FROM parts p
WHERE p.sku IN ('motor-m510-250w', 'motor-m560-500w-bt', 'motor-m560-750w-can')
ON DUPLICATE KEY UPDATE is_customer_configurable = TRUE;
