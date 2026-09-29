-- Uwagi klienta z 29 września 2026 (patrz docs/DZIENNIK_ZMIAN.md).

-- 1. Baner na stronie kategorii jest opcjonalny i domyślnie ukryty - klient
--    po wejściu w kategorię ma od razu widzieć ofertę rowerów. Admin może go
--    włączyć per kategoria; wgrane zdjęcie zostaje w bazie.
ALTER TABLE bike_categories
    ADD COLUMN show_hero_image BOOLEAN NOT NULL DEFAULT FALSE AFTER hero_image_path;

UPDATE bike_categories SET show_hero_image = FALSE;

-- 2. Jedna wizualizacja lakieru na produkt. Dwa rendery (standard + ultra)
--    klient odbierał jako „dwa odcienie" tego samego koloru. Zostaje „ultra";
--    tam, gdzie była tylko wersja standard, awansujemy ją na ultra, żeby
--    kolor nie stracił wizualizacji. Pliki na dysku zostają nietknięte.
UPDATE paint_renders s
SET s.variant = 'ultra'
WHERE s.variant = 'standard'
  AND NOT EXISTS (
      SELECT 1 FROM (SELECT color_id, model_id, frame_id FROM paint_renders WHERE variant = 'ultra') u
      WHERE u.color_id = s.color_id AND u.model_id <=> s.model_id AND u.frame_id <=> s.frame_id
  );

DELETE FROM paint_renders WHERE variant = 'standard';

-- 3. Dwa teksty przy wyborze lakieru trafiły do edytowalnych tekstów strony
--    (copy.configurator). Klient chce je na razie ukryć, więc nadpisanie
--    ustawia pusty tekst - pusty = element nie jest wyświetlany.
INSERT IGNORE INTO site_settings (setting_key, value) VALUES ('copy', JSON_OBJECT());

UPDATE site_settings
SET value = JSON_MERGE_PATCH(value, JSON_OBJECT('configurator', JSON_OBJECT('paintSingleColorNote', '', 'paintPickHint', '')))
WHERE setting_key = 'copy';

-- 4. Kolejność grup w konfiguratorze ustawia teraz admin (strzałki
--    w zakładce Części). Na start lakierowanie idzie na początek - wcześniej
--    klient przewijał kilkanaście pozycji, zanim doszedł do koloru.
UPDATE part_groups SET sort_order = 5 WHERE slug = 'paint';
