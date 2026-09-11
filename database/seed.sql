-- Dane przykładowe do prototypu. Nie są zatwierdzonym cennikiem produkcyjnym.
SET NAMES utf8mb4;

INSERT INTO bike_categories
    (slug, name, short_description, description, default_image_path, sort_order, is_published)
VALUES
    ('szosa', 'Szosa', 'Lekkie rowery stworzone do szybkiej i efektywnej jazdy po asfalcie.', 'Rowery szosowe stawiają na niską masę, aerodynamiczną pozycję i sprawne pokonywanie długich dystansów po utwardzonych drogach. Kategoria nie ma jeszcze przypisanych modeli.', '/media/categories/szosa.webp', 10, TRUE),
    ('gravel', 'Gravel', 'Uniwersalne rowery na asfalt, szuter i dłuższe wyprawy.', 'Gravel łączy szybkość roweru szosowego z większą stabilnością, miejscem na szersze opony i mocowaniami przydatnymi w turystyce. Nadaje się na asfalt, drogi szutrowe i lekkie trasy terenowe.', '/media/categories/gravel.webp', 20, TRUE),
    ('mtb', 'MTB', 'Rowery do jazdy terenowej, górskiej i wymagających tras.', 'Kategoria MTB obejmuje rowery projektowane z myślą o przyczepności, kontroli i wytrzymałości poza asfaltem. Pierwsze modele Rexor bazują na pełnozawieszonych ramach elektrycznych DengFu E82 i E55.', '/media/categories/mtb.webp', 30, TRUE),
    ('miejski-turystyczny', 'Miejski i turystyczny', 'Wygodne rowery do codziennych przejazdów i turystyki.', 'Rowery miejskie i turystyczne koncentrują się na komforcie, praktycznej pozycji, niezawodności oraz możliwości montażu bagażnika, błotników i oświetlenia. Kategoria nie ma jeszcze przypisanych modeli.', '/media/categories/miejski-turystyczny.webp', 40, TRUE),
    ('elektryczny', 'Rower elektryczny', 'Rowery ze wspomaganiem elektrycznym do różnych zastosowań.', 'Kategoria dla przyszłych modeli elektrycznych, które nie należą do bardziej szczegółowej kategorii MTB. Parametry baterii, zasięg i zgodny silnik będą określane na poziomie modelu.', '/media/categories/elektryczny.webp', 50, TRUE);

UPDATE bike_categories
SET description_html = CONCAT('<p>', description, '</p>')
WHERE description IS NOT NULL;

INSERT INTO site_pages
    (slug, title, navigation_label, excerpt, content_html, is_published)
VALUES
    ('serwis', 'Serwis rowerów Rexor', 'Serwis', 'Diagnostyka, regulacja i opieka nad rowerem przed sezonem oraz po wymagających trasach.', '<h2>Rower gotowy na kolejny kilometr</h2><p>Serwisujemy rowery Rexor, układy elektryczne oraz osprzęt mechaniczny. Każde zgłoszenie zaczynamy od oględzin i potwierdzenia zakresu prac.</p><h3>Zakres obsługi</h3><ul><li>diagnostyka napędu i instalacji elektrycznej,</li><li>regulacja hamulców, napędu i zawieszenia,</li><li>kontrola baterii, połączeń i oprogramowania,</li><li>przeglądy okresowe i przygotowanie do sezonu.</li></ul><p>Termin i koszt ustalamy indywidualnie po poznaniu modelu oraz objawów.</p>', TRUE);

INSERT INTO site_settings (setting_key, value)
VALUES ('theme', JSON_OBJECT(
    'background', '#f8f9f6',
    'foreground', '#171817',
    'surface', '#ffffff',
    'muted', '#eff1ed',
    'accent', '#d9ff43',
    'accentForeground', '#111111',
    'border', '#dfe2dc'
));

INSERT INTO bike_models
    (category_id, slug, name, short_description, description, base_price, currency, vat_rate, prices_include_vat, specifications, status, sort_order)
VALUES
    ((SELECT id FROM bike_categories WHERE slug = 'mtb'), 'e82-wielichowo', 'Rexor E82', 'Pełnozawieszony elektryczny rower enduro na karbonowej ramie DengFu E82.', 'Model roboczy bazuje na referencyjnym zamówieniu Wielichowo z okresu luty-kwiecień 2026. Rama ma 170 mm skoku. W modelu Rexor jedynym silnikiem jest Bafang M560 750 W; klient wybiera m.in. wyświetlacz.', 15000.00, 'PLN', 23.00, TRUE, JSON_OBJECT('frame_manufacturer', 'DengFu', 'frame_model', 'E82', 'frame_material', 'Toray T700/T800 carbon', 'frame_travel_mm', 170, 'selected_motor', 'Bafang M560 750 W', 'display_options', JSON_ARRAY('DPC 030','DPC 245'), 'order_type', 'reference'), 'draft', 10),
    ((SELECT id FROM bike_categories WHERE slug = 'mtb'), 'e55-reference', 'Rexor E55', 'Pełnozawieszony elektryczny rower MTB na karbonowej ramie DengFu E55.', 'Model roboczy bazuje na referencyjnym zamówieniu z okresu lipiec-wrzesień 2026. Rama jest przeznaczona do silnika Bafang M620. W konfiguracji Rexor obowiązuje jeden wariant: łącznik 70 mm i damper 210x55.', 16500.00, 'PLN', 23.00, TRUE, JSON_OBJECT('frame_manufacturer', 'DengFu', 'frame_model', 'E55', 'frame_material', 'Toray T700/T800 carbon', 'frame_travel_mm', 150, 'manufacturer_compatible_motors', JSON_ARRAY('Bafang M620 52 V 1000 W UART/CAN'), 'selected_motor', 'Bafang M620 CAN', 'rear_shock_size', '210x55', 'linkage_mm', 70, 'display_options', JSON_ARRAY('DPC 010','DPC 080','DPC 245'), 'deposit_reference_pln', 1000, 'order_type', 'reference'), 'draft', 20),
    ((SELECT id FROM bike_categories WHERE slug = 'gravel'), 'cfr707', 'Rexor CFR707', 'Karbonowy gravel na ramie Carbonda CFR707 do jazdy szutrowej, wyprawowej i mieszanej.', 'Rama Carbonda CFR707 z mieszanki włókien T700/T800, zintegrowanym prowadzeniem przewodów, suportem BSA 68 mm, mocowaniem hamulców Flat Mount, hakiem UDH oraz mocowaniami bagażnika i błotników.', NULL, 'PLN', 23.00, TRUE, JSON_OBJECT('frame_manufacturer', 'Carbonda', 'frame_model', 'CFR707', 'frame_material', 'T700/T800 carbon', 'frame_weight_m_g', 1300, 'fork_weight_g', 590, 'max_tire_700c_mm', 50, 'max_tire_650b_in', 2.1), 'draft', 30);

UPDATE bike_models
SET description_html = CONCAT('<p>', description, '</p>')
WHERE description IS NOT NULL;

UPDATE bike_models
SET default_image_path = CASE slug
    WHEN 'e82-wielichowo' THEN '/media/models/e82/01.jpg'
    WHEN 'e55-reference' THEN '/media/models/e55/01.jpg'
    WHEN 'cfr707' THEN '/media/models/cfr707/01.png'
    ELSE default_image_path
END
WHERE slug IN ('e82-wielichowo', 'e55-reference', 'cfr707');

INSERT INTO media
    (storage_path, original_filename, mime_type, width_px, height_px, size_bytes, alt_text)
VALUES
    ('/media/models/e82/01.jpg', 'e82s-l1600.jpg', 'image/jpeg', 1600, 1066, 230775, 'Rexor E82 - widok całego roweru z boku'),
    ('/media/models/e82/02.jpg', 'e82s-l1600-2.jpg', 'image/jpeg', 1600, 1066, 218074, 'Rexor E82 - zdjęcie modelu 2'),
    ('/media/models/e82/03.jpg', 'e82s-l1600-3.jpg', 'image/jpeg', 1600, 1066, 272947, 'Rexor E82 - zdjęcie modelu 3'),
    ('/media/models/e82/04.jpg', 'e82s-l1600-4.jpg', 'image/jpeg', 1600, 1066, 245384, 'Rexor E82 - zdjęcie modelu 4'),
    ('/media/models/e82/05.jpg', 'e82s-l1600-5.jpg', 'image/jpeg', 1600, 1066, 187645, 'Rexor E82 - zdjęcie modelu 5'),
    ('/media/models/e55/01.jpg', 'e55s-l1600.jpg', 'image/jpeg', 1600, 1066, 235548, 'Rexor E55 - widok całego roweru z boku'),
    ('/media/models/e55/02.jpg', 'e55s-l1600-2.jpg', 'image/jpeg', 1600, 1066, 133576, 'Rexor E55 - zdjęcie modelu 2'),
    ('/media/models/e55/03.jpg', 'e55s-l1600-3.jpg', 'image/jpeg', 1600, 1066, 141542, 'Rexor E55 - zdjęcie modelu 3'),
    ('/media/models/e55/04.jpg', 'e55s-l1600-4.jpg', 'image/jpeg', 1600, 1066, 195962, 'Rexor E55 - zdjęcie modelu 4'),
    ('/media/models/cfr707/01.png', 'cfr707145ff797-97a8-4af4-bedd-df50f1971bba.png', 'image/png', 1448, 1086, 1510124, 'Rexor CFR707 - przykładowy kompletny rower gravel z boku'),
    ('/media/models/cfr707/02.jpg', 'cfr-707-01.jpg', 'image/jpeg', 1200, 680, 42110, 'Rama CFR707 - zdjęcie producenta 1'),
    ('/media/models/cfr707/03.jpg', 'cfr-707-02.jpg', 'image/jpeg', 1200, 680, 37616, 'Rama CFR707 - zdjęcie producenta 2'),
    ('/media/models/cfr707/04.jpg', 'cfr-707-03.jpg', 'image/jpeg', 1200, 680, 24730, 'Rama CFR707 - zdjęcie producenta 3'),
    ('/media/models/cfr707/05.jpg', 'cfr-707-05.jpg', 'image/jpeg', 1200, 680, 43030, 'Rama CFR707 - zdjęcie producenta 5');

INSERT INTO model_media (model_id, media_id, role, sort_order)
SELECT m.id, media.id,
       IF(media.storage_path = m.default_image_path, 'default', 'gallery'),
       CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(media.storage_path, '.', 1), '/', -1) AS UNSIGNED) * 10
FROM bike_models m
JOIN media ON media.storage_path LIKE CONCAT('/media/models/',
    CASE m.slug
        WHEN 'e82-wielichowo' THEN 'e82'
        WHEN 'e55-reference' THEN 'e55'
        WHEN 'cfr707' THEN 'cfr707'
    END,
    '/%')
WHERE m.slug IN ('e82-wielichowo', 'e55-reference', 'cfr707');

INSERT INTO model_sizes
    (model_id, code, label, geometry, source_url, sort_order)
VALUES
    ((SELECT id FROM bike_models WHERE slug='e82-wielichowo'), 'S', 'S (widoczny tylko w tabeli geometrii)', JSON_OBJECT('top_tube_mm',563,'reach_mm',435,'stack_mm',606,'seat_tube_mm',400,'chainstay_mm',455,'head_angle_deg',64,'seat_angle_deg',77,'bb_drop_mm',12,'bb_height_mm',360,'wheelbase_mm',1224,'head_tube_mm',110,'fork_length_mm',590,'rear_travel_mm',171), 'https://www.dengfubike.com/products/e82-frame-motor-battery-kit', 10),
    ((SELECT id FROM bike_models WHERE slug='e82-wielichowo'), 'M', 'M / 17 cali', JSON_OBJECT('top_tube_mm',595,'reach_mm',450,'stack_mm',624,'seat_tube_mm',440,'chainstay_mm',455,'head_angle_deg',64,'seat_angle_deg',77,'bb_drop_mm',12,'bb_height_mm',360,'wheelbase_mm',1253,'head_tube_mm',120,'fork_length_mm',590,'rear_travel_mm',171), 'https://www.dengfubike.com/products/e82-frame-motor-battery-kit', 20),
    ((SELECT id FROM bike_models WHERE slug='e82-wielichowo'), 'L', 'L / 19 cali', JSON_OBJECT('top_tube_mm',618,'reach_mm',485,'stack_mm',624,'seat_tube_mm',480,'chainstay_mm',455,'head_angle_deg',64,'seat_angle_deg',77,'bb_drop_mm',12,'bb_height_mm',360,'wheelbase_mm',1282,'head_tube_mm',130,'fork_length_mm',590,'rear_travel_mm',171), 'https://www.dengfubike.com/products/e82-frame-motor-battery-kit', 30),
    ((SELECT id FROM bike_models WHERE slug='e82-wielichowo'), 'XL', 'XL / 21 cali', JSON_OBJECT('top_tube_mm',648,'reach_mm',510,'stack_mm',638,'seat_tube_mm',520,'chainstay_mm',455,'head_angle_deg',64,'seat_angle_deg',77,'bb_drop_mm',12,'bb_height_mm',360,'wheelbase_mm',1314,'head_tube_mm',135,'fork_length_mm',590,'rear_travel_mm',171), 'https://www.dengfubike.com/products/e82-frame-motor-battery-kit', 40),
    ((SELECT id FROM bike_models WHERE slug='e55-reference'), 'M', 'M / 17 cali', JSON_OBJECT('top_tube_mm',609,'reach_mm',459,'stack_mm',573,'seat_tube_mm',440,'chainstay_mm',478,'head_angle_deg',64,'seat_angle_deg',77,'bb_drop_mm',-20,'wheelbase_mm',1283,'head_tube_mm',125,'fork_offset_mm',51,'handlebar_mm',800,'stem_mm',45), 'https://www.dengfubike.com/products/e55-frame', 10),
    ((SELECT id FROM bike_models WHERE slug='e55-reference'), 'L', 'L / 19 cali', JSON_OBJECT('top_tube_mm',632,'reach_mm',481,'stack_mm',573,'seat_tube_mm',480,'chainstay_mm',478,'head_angle_deg',64,'seat_angle_deg',77,'bb_drop_mm',-20,'wheelbase_mm',1307,'head_tube_mm',130,'fork_offset_mm',51,'handlebar_mm',800,'stem_mm',45), 'https://www.dengfubike.com/products/e55-frame', 20),
    ((SELECT id FROM bike_models WHERE slug='cfr707'), 'XS', 'XS / 450 mm', JSON_OBJECT('seat_tube_mm',450,'seat_angle_deg',74.5,'top_tube_mm',525.3,'head_tube_mm',120,'head_angle_deg',70,'fork_length_mm',400,'fork_offset_mm',50,'wheelbase_mm',1029.5,'front_center_mm',604.2,'chainstay_mm',435,'bb_drop_mm',70,'reach_mm',375,'stack_mm',542), 'https://carbonda.com/upload/download/CFR-707/CFR-707-Geometry.pdf', 10),
    ((SELECT id FROM bike_models WHERE slug='cfr707'), 'S', 'S / 470 mm', JSON_OBJECT('seat_tube_mm',470,'seat_angle_deg',73.5,'top_tube_mm',545.3,'head_tube_mm',135,'head_angle_deg',70.3,'fork_length_mm',400,'fork_offset_mm',50,'wheelbase_mm',1037.2,'front_center_mm',611.8,'chainstay_mm',435,'bb_drop_mm',70,'reach_mm',380,'stack_mm',558), 'https://carbonda.com/upload/download/CFR-707/CFR-707-Geometry.pdf', 20),
    ((SELECT id FROM bike_models WHERE slug='cfr707'), 'M', 'M / 490 mm', JSON_OBJECT('seat_tube_mm',490,'seat_angle_deg',73.5,'top_tube_mm',560,'head_tube_mm',150,'head_angle_deg',70.5,'fork_length_mm',400,'fork_offset_mm',50,'wheelbase_mm',1050.7,'front_center_mm',625.3,'chainstay_mm',435,'bb_drop_mm',70,'reach_mm',390.4,'stack_mm',572.7), 'https://carbonda.com/upload/download/CFR-707/CFR-707-Geometry.pdf', 30),
    ((SELECT id FROM bike_models WHERE slug='cfr707'), 'L', 'L / 510 mm', JSON_OBJECT('seat_tube_mm',510,'seat_angle_deg',73.5,'top_tube_mm',576.5,'head_tube_mm',170,'head_angle_deg',72,'fork_length_mm',400,'fork_offset_mm',50,'wheelbase_mm',1052.8,'front_center_mm',627.4,'chainstay_mm',435,'bb_drop_mm',70,'reach_mm',400,'stack_mm',596), 'https://carbonda.com/upload/download/CFR-707/CFR-707-Geometry.pdf', 40),
    ((SELECT id FROM bike_models WHERE slug='cfr707'), 'XL', 'XL / 530 mm', JSON_OBJECT('seat_tube_mm',530,'seat_angle_deg',73.5,'top_tube_mm',595.4,'head_tube_mm',190,'head_angle_deg',72.5,'fork_length_mm',400,'fork_offset_mm',50,'wheelbase_mm',1066.7,'front_center_mm',641.3,'chainstay_mm',435,'bb_drop_mm',70,'reach_mm',412,'stack_mm',619), 'https://carbonda.com/upload/download/CFR-707/CFR-707-Geometry.pdf', 50),
    ((SELECT id FROM bike_models WHERE slug='cfr707'), 'XXL', 'XXL / 560 mm', JSON_OBJECT('seat_tube_mm',560,'seat_angle_deg',73.5,'top_tube_mm',615,'head_tube_mm',210,'head_angle_deg',72.5,'fork_length_mm',400,'fork_offset_mm',50,'wheelbase_mm',1086.8,'front_center_mm',661.2,'chainstay_mm',435,'bb_drop_mm',70,'reach_mm',426,'stack_mm',638), 'https://carbonda.com/upload/download/CFR-707/CFR-707-Geometry.pdf', 60);

INSERT INTO model_batteries
    (model_id, name, cell_format, cell_manufacturer, cell_model, series_count, parallel_count, cell_capacity_ah, nominal_voltage_v, charge_voltage_v, pack_capacity_ah, nominal_energy_wh, bms_continuous_a, gross_price, specifications, is_default)
VALUES
    ((SELECT id FROM bike_models WHERE slug='e82-wielichowo'), 'Samsung 35E 13S6P - przykład E82', '18650', 'Samsung SDI', 'INR18650-35E', 13, 6, 3.500, 46.80, 54.60, 21.00, 982.80, NULL, 2400.00, JSON_OBJECT('cell_count',78,'manufacturer_pack_label','48 V / 21 Ah / 1008 Wh','cell_min_capacity_ah',3.35,'status','example_to_confirm'), TRUE),
    ((SELECT id FROM bike_models WHERE slug='e55-reference'), 'FEB 6500 14S4P - przykład E55', '21700', 'Far East Battery', 'FEB 21700 6500 mAh - kod do potwierdzenia', 14, 4, 6.500, 50.40, 58.80, 26.00, 1310.40, 60.00, 3000.00, JSON_OBJECT('cell_count',56,'status','custom_example_to_confirm','note','Pojemność różni się od standardowego pakietu DengFu 52 V / 20 Ah / 1040 Wh.'), TRUE);

INSERT INTO part_groups (slug, name, description, sort_order, is_required) VALUES
    ('motor', 'Silnik', 'Silnik i sterowanie napędu elektrycznego.', 10, TRUE),
    ('frame', 'Rama', 'Rama, rozmiar i wariant konstrukcyjny.', 20, TRUE),
    ('charger', 'Ładowarka', 'Ładowarka dopasowana do pakietu.', 40, TRUE),
    ('fork', 'Amortyzator przedni', NULL, 50, TRUE),
    ('shock', 'Damper', NULL, 60, TRUE),
    ('brakes', 'Hamulce', NULL, 70, TRUE),
    ('rotors', 'Tarcze hamulcowe', NULL, 80, TRUE),
    ('wheels', 'Koła i piasty', NULL, 90, TRUE),
    ('tires', 'Opony', NULL, 100, TRUE),
    ('cockpit', 'Kokpit i kontakt', 'Kierownica, mostek, gripy, siodło, sztyca i pedały.', 110, TRUE),
    ('drivetrain', 'Napęd mechaniczny', 'Kaseta, przerzutka, manetka i łańcuch.', 120, TRUE),
    ('display', 'Wyświetlacz', NULL, 130, FALSE),
    ('paint', 'Lakierowanie', NULL, 140, FALSE),
    ('extras', 'Dodatki', NULL, 150, FALSE);

INSERT INTO parts
    (group_id, sku, name, manufacturer, model, description, specifications, price_status, gross_price)
VALUES
    ((SELECT id FROM part_groups WHERE slug='motor'), 'motor-m560-750w-bt', 'Silnik M560 750W ze sterownikiem Bluetooth', NULL, 'M560', NULL, JSON_OBJECT('power_w', 750, 'controller', 'Bluetooth'), 'fixed', 4300),
    ((SELECT id FROM part_groups WHERE slug='motor'), 'motor-m620-can', 'Silnik M620 CAN', NULL, 'M620 CAN', NULL, JSON_OBJECT('bus', 'CAN'), 'fixed', 5200),
    ((SELECT id FROM part_groups WHERE slug='frame'), 'frame-e82-m', 'Rama E82, rozmiar M', NULL, 'E82', 'Rama wskazana jako wycofana z produkcji; geometria i pełna specyfikacja nieznane.', JSON_OBJECT('size', 'M'), 'fixed', 4500),
    ((SELECT id FROM part_groups WHERE slug='frame'), 'frame-e55-19', 'Rama E55, rozmiar 19', NULL, 'E55', NULL, JSON_OBJECT('size', '19', 'shock_link_mm', 70, 'shock_size', '210x55'), 'fixed', 4800),
    ((SELECT id FROM part_groups WHERE slug='charger'), 'charger-54-6v-5a', 'Ładowarka 5 A, 54,6 VDC', NULL, NULL, NULL, JSON_OBJECT('voltage_v', 54.6, 'current_a', 5), 'fixed', 350),
    ((SELECT id FROM part_groups WHERE slug='charger'), 'charger-58-8v', 'Ładowarka 58,8 VDC', NULL, NULL, 'Wersja poprawiona dla pakietu 14S.', JSON_OBJECT('voltage_v', 58.8), 'fixed', 350),
    ((SELECT id FROM part_groups WHERE slug='fork'), 'fork-rs-35-silver-150', '35 Silver TK 29 Solo Air 150 Tapered Boost', 'RockShox', '35 Silver TK', NULL, JSON_OBJECT('wheel_in', 29, 'travel_mm', 150, 'air', TRUE, 'boost', TRUE), 'fixed', 1000),
    ((SELECT id FROM part_groups WHERE slug='fork'), 'fork-fox-36-performance-160', 'FOX 36 Performance 160 mm', 'FOX', '36 Performance', NULL, JSON_OBJECT('travel_mm', 160), 'fixed', 2000),
    ((SELECT id FROM part_groups WHERE slug='shock'), 'shock-rs-deluxe-230x60', 'RockShox Deluxe 230x60', 'RockShox', 'Deluxe', NULL, JSON_OBJECT('size', '230x60'), 'fixed', 1000),
    ((SELECT id FROM part_groups WHERE slug='shock'), 'shock-fox-float-x-pe-230x60', 'FOX Float X Performance Elite 230x60', 'FOX', 'Float X Performance Elite', NULL, JSON_OBJECT('size', '230x60'), 'fixed', 1600),
    ((SELECT id FROM part_groups WHERE slug='shock'), 'shock-rs-super-deluxe', 'RockShox Super Deluxe', 'RockShox', 'Super Deluxe', 'Dokładny wariant i wymiar do potwierdzenia.', NULL, 'fixed', 1600),
    ((SELECT id FROM part_groups WHERE slug='brakes'), 'brakes-shimano-4p', 'Hamulce Shimano 4-tłoczkowe', 'Shimano', NULL, 'Dokładny model do potwierdzenia.', JSON_OBJECT('pistons', 4), 'fixed', 1000),
    ((SELECT id FROM part_groups WHERE slug='brakes'), 'brakes-magura-mt5', 'Hamulce Magura MT5', 'Magura', 'MT5', 'Cztery tłoczki, klamka 2-palcowa; dla E55 z Shiftmix.', JSON_OBJECT('pistons', 4, 'lever', '2-finger'), 'fixed', 1300),
    ((SELECT id FROM part_groups WHERE slug='rotors'), 'rotors-203-180', 'Tarcze 203/180 mm', NULL, NULL, 'Magura lub Shimano - zasada wyboru do potwierdzenia.', JSON_OBJECT('front_mm', 203, 'rear_mm', 180), 'fixed', 300),
    ((SELECT id FROM part_groups WHERE slug='rotors'), 'rotors-magura-mdrp-220-180', 'Magura MDR-P 220/180 mm', 'Magura', 'MDR-P', 'Przedni wymiar znormalizowany do finalnej korekty 220 mm.', JSON_OBJECT('front_mm', 220, 'rear_mm', 180), 'fixed', 450),
    ((SELECT id FROM part_groups WHERE slug='wheels'), 'wheels-dt-swiss-29', 'Koła 29 cali DT Swiss ze wzmocnionymi szprychami', 'DT Swiss', NULL, NULL, JSON_OBJECT('wheel_in', 29), 'fixed', 1800),
    ((SELECT id FROM part_groups WHERE slug='wheels'), 'hub-rear-dt370-boost', 'Piasta tylna DT Swiss 370 Boost', 'DT Swiss', '370', 'Zmieniona z DT Swiss 350 Classic.', JSON_OBJECT('axle', '12x148 Boost', 'driver', 'Shimano HG Steel Linkglide', 'holes', 32), 'fixed', 700),
    ((SELECT id FROM part_groups WHERE slug='wheels'), 'hub-front-boost-15x110', 'Piasta przednia 15x110 Boost', NULL, NULL, NULL, JSON_OBJECT('axle', '15x110 Boost'), 'fixed', 300),
    ((SELECT id FROM part_groups WHERE slug='tires'), 'tires-schwalbe-johnny-watts-29', 'Schwalbe Johnny Watts 29', 'Schwalbe', 'Johnny Watts', 'Docelowo całkowicie czarna wersja Classic-Skin.', JSON_OBJECT('wheel_in', 29, 'quantity', 2), 'fixed', 300),
    ((SELECT id FROM part_groups WHERE slug='tires'), 'tires-maxxis-2-6', 'Maxxis 2.6 - wariant do potwierdzenia', 'Maxxis', NULL, 'W danych występuje DHR 2.6 oraz zapis DHR DFR; wymaga potwierdzenia kompletu przód/tył.', JSON_OBJECT('width_in', 2.6, 'quantity', 2), 'fixed', 500),
    ((SELECT id FROM part_groups WHERE slug='cockpit'), 'saddle-gel', 'Siodło żelowe', NULL, NULL, NULL, NULL, 'fixed', 150),
    ((SELECT id FROM part_groups WHERE slug='cockpit'), 'dropper-31-6-170', 'Sztyca regulowana 31.6, skok 170 mm', NULL, NULL, 'Sterowanie z kierownicy.', JSON_OBJECT('diameter_mm', 31.6, 'travel_mm', 170), 'fixed', 700),
    ((SELECT id FROM part_groups WHERE slug='cockpit'), 'handlebar-alu-760-780-9', 'Kierownica aluminiowa 760-780 mm / 9°', NULL, NULL, 'Finalna szerokość E82: 760 mm; E55: 780 mm.', JSON_OBJECT('backsweep_deg', 9, 'color', 'black'), 'fixed', 200),
    ((SELECT id FROM part_groups WHERE slug='cockpit'), 'grips-odi-rogue-v21', 'Gripy ODI Rogue v2.1', 'ODI', 'Rogue v2.1', NULL, NULL, 'fixed', 130),
    ((SELECT id FROM part_groups WHERE slug='cockpit'), 'grips-wrist-support', 'Gripy z podparciem nadgarstka', NULL, NULL, NULL, NULL, 'fixed', 130),
    ((SELECT id FROM part_groups WHERE slug='cockpit'), 'stem-short-mtb-black', 'Krótki mostek MTB, czarny', NULL, NULL, NULL, NULL, 'fixed', 150),
    ((SELECT id FROM part_groups WHERE slug='cockpit'), 'pedals-platform-mtb', 'Pedały platformowe MTB', NULL, NULL, 'Przykładowo Dartmoor.', NULL, 'fixed', 200),
    ((SELECT id FROM part_groups WHERE slug='drivetrain'), 'drivetrain-deore-m5100-11', 'Grupa Shimano Deore M5100 11-rzędowa', 'Shimano', 'Deore M5100', 'Manetka 11-rz., łańcuch 11-rz., kaseta CS-M5100 11-51T i przerzutka RD-M5100 SGS.', JSON_OBJECT('speeds', 11, 'cassette', 'CS-M5100 11-51T', 'derailleur', 'RD-M5100 SGS'), 'fixed', 800),
    ((SELECT id FROM part_groups WHERE slug='drivetrain'), 'drivetrain-cues-u6000-10', 'Grupa Shimano CUES U6000 10-rzędowa', 'Shimano', 'CUES U6000', 'Kaseta CS-LG400 Linkglide 11-48T i przerzutka RD-U6000.', JSON_OBJECT('speeds', 10, 'cassette', 'CS-LG400 11-48T', 'derailleur', 'RD-U6000'), 'fixed', 1050),
    ((SELECT id FROM part_groups WHERE slug='drivetrain'), 'drivetrain-linkglide-xt', 'Shimano Linkglide XT - wariant do potwierdzenia', 'Shimano', 'Linkglide XT', 'Dokładne symbole podzespołów i zakres kasety wymagają potwierdzenia.', NULL, 'fixed', 1300),
    ((SELECT id FROM part_groups WHERE slug='display'), 'display-dpc010', 'Wyświetlacz Bafang DPC 010', 'Bafang', 'DPC 010', NULL, NULL, 'fixed', 450),
    ((SELECT id FROM part_groups WHERE slug='display'), 'display-dpc030', 'Wyświetlacz Bafang DPC 030', 'Bafang', 'DPC 030', 'Wariant zintegrowany z górną rurą, oferowany przez producenta ramy E82.', NULL, 'fixed', 500),
    ((SELECT id FROM part_groups WHERE slug='display'), 'display-dpc080', 'Wyświetlacz Bafang DPC 080', 'Bafang', 'DPC 080', NULL, NULL, 'fixed', 450),
    ((SELECT id FROM part_groups WHERE slug='display'), 'display-dpc245', 'Wyświetlacz Bafang DPC 245', 'Bafang', 'DPC 245', 'Wybrany w konfiguracji referencyjnej E55 i oferowany przez producenta dla E82.', NULL, 'fixed', 399),
    ((SELECT id FROM part_groups WHERE slug='paint'), 'paint-standard', 'Lakierowanie standardowe', NULL, NULL, 'Standardowe wykończenie modelu.', NULL, 'fixed', 0),
    ((SELECT id FROM part_groups WHERE slug='paint'), 'paint-single-color', 'Lakierowanie jednokolorowe', NULL, NULL, NULL, NULL, 'fixed', 800),
    ((SELECT id FROM part_groups WHERE slug='paint'), 'paint-custom-two-color', 'Lakierowanie indywidualne', NULL, NULL, 'Przykładowo dwa kolory; cena robocza jest środkiem historycznego zakresu 1000-1200 zł.', NULL, 'fixed', 1100),
    ((SELECT id FROM part_groups WHERE slug='extras'), 'extras-lighting-gps-shiftmix', 'Oświetlenie, GPS i Shiftmix', NULL, NULL, 'W konfiguracji E55 elementy dostarcza klient.', NULL, 'fixed', 1000);

-- Wszystkie obecne części pochodzą z konfiguracji modeli e-MTB.
INSERT INTO category_parts (category_id, part_id, sort_order)
SELECT c.id, p.id, 0
FROM bike_categories c
CROSS JOIN parts p
WHERE c.slug = 'mtb';

-- Domyślna konfiguracja E82.
INSERT INTO model_parts (model_id, part_id, is_default, notes)
SELECT m.id, p.id, TRUE, 'W cenie bazowej według konfiguracji referencyjnej.'
FROM bike_models m
JOIN parts p ON p.sku IN (
    'motor-m560-750w-bt', 'frame-e82-m', 'charger-54-6v-5a',
    'fork-rs-35-silver-150', 'shock-rs-deluxe-230x60', 'brakes-shimano-4p', 'rotors-203-180',
    'wheels-dt-swiss-29', 'tires-schwalbe-johnny-watts-29', 'saddle-gel', 'dropper-31-6-170',
    'handlebar-alu-760-780-9', 'grips-odi-rogue-v21', 'stem-short-mtb-black',
    'pedals-platform-mtb', 'drivetrain-deore-m5100-11'
)
WHERE m.slug = 'e82-wielichowo';

INSERT INTO model_parts (model_id, part_id, is_default, notes)
SELECT m.id, p.id, FALSE, 'Opcja/dopłata dla E82 - dane robocze.'
FROM bike_models m
JOIN parts p ON p.sku IN (
    'brakes-magura-mt5', 'drivetrain-cues-u6000-10', 'shock-fox-float-x-pe-230x60',
    'shock-rs-super-deluxe', 'fork-fox-36-performance-160', 'tires-maxxis-2-6',
    'paint-single-color', 'paint-custom-two-color', 'display-dpc030', 'display-dpc245'
)
WHERE m.slug = 'e82-wielichowo';

INSERT INTO model_parts (model_id, part_id, is_default, notes)
SELECT m.id, p.id, TRUE, 'Standardowe lakierowanie jest punktem odniesienia dla dopłat.'
FROM bike_models m
JOIN parts p ON p.sku = 'paint-standard'
WHERE m.slug = 'e82-wielichowo';

-- Konfiguracja E55. Widelec i damper klienta są ustawieniem grupy, nie sztuczną częścią.
INSERT INTO model_parts (model_id, part_id, is_default, notes)
SELECT m.id, p.id, TRUE, 'Konfiguracja referencyjna E55; szczegóły wymagają zatwierdzenia.'
FROM bike_models m
JOIN parts p ON p.sku IN (
    'motor-m620-can', 'frame-e55-19', 'charger-58-8v', 'brakes-magura-mt5',
    'rotors-magura-mdrp-220-180', 'hub-rear-dt370-boost', 'hub-front-boost-15x110',
    'tires-maxxis-2-6', 'saddle-gel', 'dropper-31-6-170', 'handlebar-alu-760-780-9',
    'grips-wrist-support', 'stem-short-mtb-black', 'pedals-platform-mtb',
    'drivetrain-linkglide-xt', 'extras-lighting-gps-shiftmix'
)
WHERE m.slug = 'e55-reference';

INSERT INTO model_parts (model_id, part_id, is_default, notes)
SELECT m.id, p.id, p.sku = 'paint-standard', 'Opcje lakierowania E55.'
FROM bike_models m
JOIN parts p ON p.sku IN ('paint-standard', 'paint-single-color', 'paint-custom-two-color')
WHERE m.slug = 'e55-reference';

INSERT INTO model_parts (model_id, part_id, is_default, notes)
SELECT m.id, p.id, p.sku = 'display-dpc245', 'DPC 245 wybrano w konfiguracji referencyjnej.'
FROM bike_models m
JOIN parts p ON p.sku IN ('display-dpc010', 'display-dpc080', 'display-dpc245')
WHERE m.slug = 'e55-reference';

UPDATE model_parts mp
JOIN bike_models m ON m.id = mp.model_id
JOIN parts p ON p.id = mp.part_id
SET mp.is_default = (p.sku = 'display-dpc245')
WHERE m.slug = 'e82-wielichowo'
  AND p.sku IN ('display-dpc030', 'display-dpc245');

-- Silnik i rama są stałymi cechami modelu, a nie wyborem klienta.
UPDATE model_parts mp
JOIN bike_models m ON m.id = mp.model_id
JOIN parts p ON p.id = mp.part_id
SET mp.is_customer_configurable = FALSE
WHERE m.slug IN ('e82-wielichowo', 'e55-reference')
  AND p.sku IN ('motor-m560-750w-bt', 'motor-m620-can', 'frame-e82-m', 'frame-e55-19');

-- Dopuszczenie części klienta jest ustawieniem konkretnej pozycji modelu.
-- Jej wartość 0 zł daje dopłatę równą minus cenie części domyślnej.
UPDATE model_parts mp
JOIN bike_models m ON m.id = mp.model_id
JOIN parts p ON p.id = mp.part_id
SET mp.customer_supplied_allowed = TRUE,
    mp.customer_supplied_gross_price = 0.00
WHERE m.slug = 'e82-wielichowo'
  AND p.sku IN ('fork-rs-35-silver-150', 'shock-rs-deluxe-230x60', 'brakes-shimano-4p', 'pedals-platform-mtb', 'saddle-gel');

INSERT INTO model_part_group_settings
    (model_id, group_id, selection_mode, customer_part_allowed, customer_part_gross_price, helper_text)
VALUES
    ((SELECT id FROM bike_models WHERE slug='e82-wielichowo'), (SELECT id FROM part_groups WHERE slug='motor'), 'fixed', FALSE, 0.00, 'Silnik jest przypisany do wariantu modelu; klient wybiera wyświetlacz.'),
    ((SELECT id FROM bike_models WHERE slug='e82-wielichowo'), (SELECT id FROM part_groups WHERE slug='display'), 'select_one', FALSE, 0.00, 'Dostępne wyświetlacze zależą od silnika i instalacji ramy.'),
    ((SELECT id FROM bike_models WHERE slug='e55-reference'), (SELECT id FROM part_groups WHERE slug='motor'), 'fixed', FALSE, 0.00, 'Rama E55 jest przeznaczona do Bafang M620.'),
    ((SELECT id FROM bike_models WHERE slug='e55-reference'), (SELECT id FROM part_groups WHERE slug='display'), 'select_one', FALSE, 0.00, 'W konfiguracji referencyjnej wybrano DPC 245.'),
    ((SELECT id FROM bike_models WHERE slug='e55-reference'), (SELECT id FROM part_groups WHERE slug='fork'), 'select_one', TRUE, 0.00, 'Dla części klienta dopłata jest liczona jako 0 zł minus cena domyślnego widelca.'),
    ((SELECT id FROM bike_models WHERE slug='e55-reference'), (SELECT id FROM part_groups WHERE slug='shock'), 'select_one', TRUE, 0.00, 'Jedyny zgodny wymiar to 210x55. Dla części klienta dopłata wynosi 0 zł minus cena domyślnego dampera.');

-- Przykładowe ceny rynkowe służą do kontroli danych roboczych, nie do
-- automatycznego wyliczania ceny sprzedaży ani dopłaty.
UPDATE parts
SET reference_market_price_gross = 616.00,
    reference_price_source_url = 'https://bikecenter.pl/p138113%2Cmagura-mt5-1-finger-hc-hamulce-tarczowe-zestaw-przod-i-tyl-4-tloczki.html',
    reference_price_checked_on = '2026-09-11',
    reference_price_notes = 'Zestaw przód i tył, wariant 1-finger HC; konfiguracja Rexor wspomina klamkę 2-palcową.'
WHERE sku = 'brakes-magura-mt5';

UPDATE parts
SET reference_market_price_gross = 144.36,
    reference_price_source_url = 'https://www.ceneo.pl/139397753',
    reference_price_checked_on = '2026-09-11',
    reference_price_notes = 'Cena jednej opony 29x2.60 z porównywarki; cena części w konfiguratorze dotyczy kompletu dwóch.'
WHERE sku = 'tires-schwalbe-johnny-watts-29';

UPDATE parts
SET reference_market_price_gross = 399.00,
    reference_price_source_url = 'https://tosabikes.com/produkt/wyswietlacz-lcd-dp-c245-can/',
    reference_price_checked_on = '2026-09-11',
    reference_price_notes = 'Wyświetlacz DPC 245 CAN z Bluetooth.'
WHERE sku = 'display-dpc245';

INSERT INTO model_price_adjustments
    (model_id, code, name, adjustment_type, amount, currency, description)
VALUES
    ((SELECT id FROM bike_models WHERE slug='e82-wielichowo'), 'e82-production-setup', 'Ustawienie produkcji ramy E82', 'quote', NULL, NULL, 'Historycznie wskazano +100 USD. W produkcie nie mieszamy walut; dopłata pozostaje indywidualną wyceną.');
