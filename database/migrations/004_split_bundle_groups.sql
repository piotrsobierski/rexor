-- Grupy "cockpit" i "wheels" były workami na kilka osobnych komponentów:
-- siodło, sztycę, kierownicę, gripy, mostek i pedały oznaczono w jednym modelu
-- jako sześć pozycji domyślnych tej samej grupy. Przy cenie liczonej jako
-- różnica wobec pozycji domyślnej było to niewidoczne (wszystkie dopłaty
-- wynosiły 0). Przy cenie liczonej jako suma składników grupa wnosi tylko
-- jedną pozycję, więc rower gubił około 1380 zł osprzętu kokpitu.
--
-- Jedna grupa = jeden wybór klienta = jedna pozycja w cenie.

INSERT INTO part_groups (slug, name, description, sort_order, is_required) VALUES
    ('saddle', 'Siodło', NULL, 111, TRUE),
    ('seatpost', 'Sztyca', 'Sztyca regulowana albo stała.', 112, TRUE),
    ('handlebar', 'Kierownica', NULL, 113, TRUE),
    ('grips', 'Gripy', NULL, 114, TRUE),
    ('stem', 'Mostek', NULL, 115, TRUE),
    ('pedals', 'Pedały', NULL, 116, FALSE),
    ('hub-front', 'Piasta przednia', 'Dla modeli rozliczanych po piastach, a nie po komplecie kół.', 91, FALSE),
    ('hub-rear', 'Piasta tylna', 'Dla modeli rozliczanych po piastach, a nie po komplecie kół.', 92, FALSE);

UPDATE parts SET group_id = (SELECT id FROM part_groups WHERE slug = 'saddle') WHERE sku = 'saddle-gel';
UPDATE parts SET group_id = (SELECT id FROM part_groups WHERE slug = 'seatpost') WHERE sku = 'dropper-31-6-170';
UPDATE parts SET group_id = (SELECT id FROM part_groups WHERE slug = 'handlebar') WHERE sku = 'handlebar-alu-760-780-9';
UPDATE parts SET group_id = (SELECT id FROM part_groups WHERE slug = 'grips') WHERE sku IN ('grips-odi-rogue-v21', 'grips-wrist-support');
UPDATE parts SET group_id = (SELECT id FROM part_groups WHERE slug = 'stem') WHERE sku = 'stem-short-mtb-black';
UPDATE parts SET group_id = (SELECT id FROM part_groups WHERE slug = 'pedals') WHERE sku = 'pedals-platform-mtb';
UPDATE parts SET group_id = (SELECT id FROM part_groups WHERE slug = 'hub-front') WHERE sku = 'hub-front-boost-15x110';
UPDATE parts SET group_id = (SELECT id FROM part_groups WHERE slug = 'hub-rear') WHERE sku = 'hub-rear-dt370-boost';

-- Grupa kokpitu zostaje bez części, więc znika razem z ustawieniami modeli.
DELETE mpgs FROM model_part_group_settings mpgs
JOIN part_groups pg ON pg.id = mpgs.group_id
WHERE pg.slug = 'cockpit';

DELETE FROM part_groups WHERE slug = 'cockpit';
