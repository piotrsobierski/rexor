-- Cennik lakieru: kolor nie ma własnej ceny, płaci się za proces lakierowania.
--
-- Ustalenie właściciela: „Lakierowanie standardowe” to kolor producenta
-- (paleta Rexor, 0 zł), a „Lakierowanie jednokolorowe” (+800 zł) obejmuje
-- DOWOLNY kolor z obu palet niestandardowych. Wcześniejsze 2500 zł przy
-- palecie Porsche/Volkswagen było założeniem roboczym i podwajało koszt:
-- klient płacił raz za proces w grupie `paint`, drugi raz za paletę.
--
-- Oś „dopłata za kolor” zostaje w schemacie (paleta i kolor nadal mają
-- `price_gross` oraz `price_gross_override`) - służy rzadkim pigmentom
-- i przyszłym palettom premium. Dziś jest wyzerowana.
UPDATE paint_palettes SET price_gross = 0.00 WHERE slug IN ('porsche-pts', 'volkswagen');

-- Nadpisania per produkt z okresu testów nie mogą przywrócić starej ceny.
UPDATE model_paint_palettes SET price_gross_override = NULL WHERE price_gross_override IS NOT NULL;
UPDATE frame_paint_palettes SET price_gross_override = NULL WHERE price_gross_override IS NOT NULL;

-- Opisy opcji w konfiguratorze mają mówić wprost, co obejmują.
UPDATE parts SET description = 'Kolor z palety Rexor, w cenie roweru.'
WHERE sku = 'paint-standard';
UPDATE parts SET description = 'Dowolny kolor z palet Porsche Paint to Sample i Volkswagen.'
WHERE sku = 'paint-single-color';

UPDATE paint_palettes
SET description = 'Pełna paleta Paint to Sample. Lakier mieszany na zamówienie, termin realizacji dłuższy niż dla kolorów standardowych. Wymaga lakierowania jednokolorowego.'
WHERE slug = 'porsche-pts';
UPDATE paint_palettes
SET description = 'Klasyczne kolory Volkswagena, w tym paleta air-cooled. Wymaga lakierowania jednokolorowego.'
WHERE slug = 'volkswagen';

-- Ramy sprzedawane osobno też mają kolor. Migracja 028 zasiała dostępność
-- tylko dla modeli; tu domykamy ramy, dla których lakierowanie jest włączone.
INSERT INTO frame_paint_palettes (frame_id, palette_id, sort_order)
SELECT f.id, pp.id, pp.sort_order
FROM frames f
JOIN paint_palettes pp ON pp.is_active = TRUE
WHERE f.status = 'published' AND f.paint_available = TRUE
ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order);
