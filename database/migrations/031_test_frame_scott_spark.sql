-- Rama testowa: Scott Spark z konwersją elektryczną.
--
-- Po co: tabela `frames` była pusta, więc /ramy, /ramy/{slug} oraz seed
-- `frame_paint_palettes` z migracji 030 nie miały na czym zadziałać - nie dało
-- się sprawdzić ani listy, ani galerii, ani palet lakierów dla ramy.
--
-- Rama nie ma nic wspólnego z modelami w konfiguratorze: `frames` wiąże się
-- wyłącznie z `bike_categories`, więc Scott Spark istnieje bez modelu „Spark".
--
-- To dane testowe. Nazwa i slug mówią o tym wprost, żeby wpis rzucał się
-- w oczy, gdyby dojechał na produkcję. Usuwa go DELETE po slugu - `frame_media`
-- i `frame_paint_palettes` lecą kaskadą, zostają tylko wiersze `media`.

INSERT INTO frames (
    category_id, slug, name, manufacturer, short_description, description_html,
    specifications, price_gross, currency, paint_available, is_recommended,
    source_url, default_image_path, status, sort_order
)
SELECT
    c.id,
    'scott-spark-test',
    'Scott Spark (rama testowa)',
    'Scott',
    'Karbonowa rama full-suspension po konwersji na napęd elektryczny. Wpis testowy do sprawdzenia podstrony ramy.',
    '<h3>Rama testowa</h3><p>Ten wpis służy sprawdzeniu podstrony ramy: galerii, faktów, ceny i wyboru koloru lakieru. Zdjęcia pokadrowano z prywatnej konwersji Scotta Sparka na napęd <strong>CYC Motor</strong> z baterią w trójkącie ramy.</p><p>Nie jest to oferta handlowa.</p>',
    JSON_OBJECT('facts', JSON_ARRAY(
        'karbon, full suspension',
        'konwersja: silnik CYC Motor',
        'bateria w trójkącie ramy',
        'widelec RockShox Lyrik',
        'wpis testowy - nie oferta'
    )),
    6900.00,
    'PLN',
    TRUE,
    FALSE,
    NULL,
    '/media/frames/scott-spark/01-side.jpg',
    'published',
    900
FROM bike_categories c
WHERE c.slug = 'mtb'
  AND NOT EXISTS (SELECT 1 FROM frames f WHERE f.slug = 'scott-spark-test');

-- Zdjęcia leżą w repozytorium (`public/media/frames/scott-spark/` oraz kopia
-- w `apps/web/public/frames/`, tak jak zdjęcia modeli), więc jadą z paczką
-- wdrożeniową i nie wymagają wgrywania przez panel.

INSERT INTO media (storage_path, original_filename, mime_type, width_px, height_px, size_bytes, alt_text, caption)
SELECT '/media/frames/scott-spark/01-side.jpg', 'SPARK_SIDE.png', 'image/jpeg', 1448, 1086, 723006, 'Scott Spark po konwersji elektrycznej - widok z boku', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media WHERE storage_path = '/media/frames/scott-spark/01-side.jpg');

INSERT INTO frame_media (frame_id, media_id, role, sort_order)
SELECT f.id, me.id, 'default', 10
FROM frames f JOIN media me ON me.storage_path = '/media/frames/scott-spark/01-side.jpg'
WHERE f.slug = 'scott-spark-test'
  AND NOT EXISTS (SELECT 1 FROM frame_media fm WHERE fm.frame_id = f.id AND fm.media_id = me.id);

INSERT INTO media (storage_path, original_filename, mime_type, width_px, height_px, size_bytes, alt_text, caption)
SELECT '/media/frames/scott-spark/02-fork.jpg', 'SPARK_FORK.jpg', 'image/jpeg', 1600, 1199, 304794, 'Korona widelca z pokrętłami tłumienia HSC i LSC', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media WHERE storage_path = '/media/frames/scott-spark/02-fork.jpg');

INSERT INTO frame_media (frame_id, media_id, role, sort_order)
SELECT f.id, me.id, 'gallery', 20
FROM frames f JOIN media me ON me.storage_path = '/media/frames/scott-spark/02-fork.jpg'
WHERE f.slug = 'scott-spark-test'
  AND NOT EXISTS (SELECT 1 FROM frame_media fm WHERE fm.frame_id = f.id AND fm.media_id = me.id);

INSERT INTO media (storage_path, original_filename, mime_type, width_px, height_px, size_bytes, alt_text, caption)
SELECT '/media/frames/scott-spark/03-kokpit.jpg', 'SPARK_KOKPIT.jpg', 'image/jpeg', 1600, 1199, 327523, 'Kokpit: mostek Syncros, wyświetlacz napędu i lampa', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media WHERE storage_path = '/media/frames/scott-spark/03-kokpit.jpg');

INSERT INTO frame_media (frame_id, media_id, role, sort_order)
SELECT f.id, me.id, 'gallery', 30
FROM frames f JOIN media me ON me.storage_path = '/media/frames/scott-spark/03-kokpit.jpg'
WHERE f.slug = 'scott-spark-test'
  AND NOT EXISTS (SELECT 1 FROM frame_media fm WHERE fm.frame_id = f.id AND fm.media_id = me.id);

INSERT INTO media (storage_path, original_filename, mime_type, width_px, height_px, size_bytes, alt_text, caption)
SELECT '/media/frames/scott-spark/04-motor.jpg', 'SPARK_MOTOR.jpg', 'image/jpeg', 1600, 1199, 474181, 'Silnik CYC Motor z korbami i przekładnią przy suporcie', NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media WHERE storage_path = '/media/frames/scott-spark/04-motor.jpg');

INSERT INTO frame_media (frame_id, media_id, role, sort_order)
SELECT f.id, me.id, 'gallery', 40
FROM frames f JOIN media me ON me.storage_path = '/media/frames/scott-spark/04-motor.jpg'
WHERE f.slug = 'scott-spark-test'
  AND NOT EXISTS (SELECT 1 FROM frame_media fm WHERE fm.frame_id = f.id AND fm.media_id = me.id);

-- Seed palet z migracji 030 wykonał się, gdy nie było jeszcze żadnej ramy,
-- więc nową ramę trzeba dopiąć tutaj. Warunek jest ten sam: rama opublikowana
-- z włączonym lakierowaniem dostaje komplet aktywnych palet.
INSERT INTO frame_paint_palettes (frame_id, palette_id, sort_order)
SELECT f.id, pp.id, pp.sort_order
FROM frames f
JOIN paint_palettes pp ON pp.is_active = TRUE
WHERE f.slug = 'scott-spark-test' AND f.paint_available = TRUE
ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order);
