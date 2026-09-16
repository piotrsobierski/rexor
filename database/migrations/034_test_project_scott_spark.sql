-- Realizacja testowa: konwersja Scott Sparka (ta sama rama co migracja 031).
--
-- Po co: tabela `projects` była pusta, więc /realizacje i /realizacje/{slug}
-- nie miały na czym zadziałać - nie dało się sprawdzić listy, filtrów
-- kategorii ani karty realizacji ze zdjęciami i spisem komponentów.
--
-- Zdjęcia są te same, co przy testowej ramie z migracji 031 - jadą z paczką
-- wdrożeniową (public/media/frames/scott-spark/), więc nie wymaga to
-- wgrywania niczego przez panel.
--
-- To dane testowe. Nazwa i slug mówią o tym wprost, żeby wpis rzucał się
-- w oczy, gdyby dojechał na produkcję. Usuwa go DELETE po slugu -
-- `project_media` leci kaskadą, zostają tylko wiersze `media`.

INSERT INTO projects (
    slug, title, short_description, content_html, specification,
    category_id, completed_at, cover_image_path, is_published, sort_order
)
SELECT
    'scott-spark-konwersja-test',
    'Scott Spark - konwersja elektryczna (wpis testowy)',
    'Karbonowy Scott Spark po konwersji na napęd elektryczny. Wpis testowy do sprawdzenia podstrony realizacji.',
    '<h3>Realizacja testowa</h3><p>Ten wpis służy sprawdzeniu podstrony realizacji: galerii, spisu komponentów i przypisania do kategorii. Zdjęcia pokadrowano z prywatnej konwersji Scotta Sparka na napęd <strong>CYC Motor</strong> z baterią w trójkącie ramy.</p><p>Nie jest to oferta handlowa.</p>',
    JSON_ARRAY(
        JSON_OBJECT('label', 'rama', 'value', 'Scott Spark, karbon, full suspension'),
        JSON_OBJECT('label', 'silnik', 'value', 'CYC Motor'),
        JSON_OBJECT('label', 'bateria', 'value', 'w trójkącie ramy'),
        JSON_OBJECT('label', 'widelec', 'value', 'RockShox Lyrik')
    ),
    c.id,
    '2026-06-01',
    '/media/frames/scott-spark/01-side.jpg',
    TRUE,
    900
FROM bike_categories c
WHERE c.slug = 'mtb'
  AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.slug = 'scott-spark-konwersja-test');

INSERT INTO project_media (project_id, media_id, role, sort_order)
SELECT p.id, me.id, 'cover', 10
FROM projects p JOIN media me ON me.storage_path = '/media/frames/scott-spark/01-side.jpg'
WHERE p.slug = 'scott-spark-konwersja-test'
  AND NOT EXISTS (SELECT 1 FROM project_media pm WHERE pm.project_id = p.id AND pm.media_id = me.id);

INSERT INTO project_media (project_id, media_id, role, sort_order)
SELECT p.id, me.id, 'gallery', 20
FROM projects p JOIN media me ON me.storage_path = '/media/frames/scott-spark/02-fork.jpg'
WHERE p.slug = 'scott-spark-konwersja-test'
  AND NOT EXISTS (SELECT 1 FROM project_media pm WHERE pm.project_id = p.id AND pm.media_id = me.id);

INSERT INTO project_media (project_id, media_id, role, sort_order)
SELECT p.id, me.id, 'gallery', 30
FROM projects p JOIN media me ON me.storage_path = '/media/frames/scott-spark/03-kokpit.jpg'
WHERE p.slug = 'scott-spark-konwersja-test'
  AND NOT EXISTS (SELECT 1 FROM project_media pm WHERE pm.project_id = p.id AND pm.media_id = me.id);

INSERT INTO project_media (project_id, media_id, role, sort_order)
SELECT p.id, me.id, 'gallery', 40
FROM projects p JOIN media me ON me.storage_path = '/media/frames/scott-spark/04-motor.jpg'
WHERE p.slug = 'scott-spark-konwersja-test'
  AND NOT EXISTS (SELECT 1 FROM project_media pm WHERE pm.project_id = p.id AND pm.media_id = me.id);
