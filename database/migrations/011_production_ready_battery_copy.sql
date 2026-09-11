-- Nazwy i model ogniwa dwóch pakietów baterii nadal miały etykiety robocze
-- ("przykład E82/E55", "kod do potwierdzenia") widoczne w konfiguratorze
-- (name, short_label) lub w panelu admina (cell_model).

UPDATE model_batteries
SET name = 'Samsung 35E 13S6P'
WHERE code = 'e82-982wh';

UPDATE model_batteries
SET name = 'FEB 6500 14S4P'
WHERE code = 'e55-1310wh';

UPDATE model_batteries
SET cell_model = 'FEB 21700 6500 mAh'
WHERE cell_model = 'FEB 21700 6500 mAh - kod do potwierdzenia';
