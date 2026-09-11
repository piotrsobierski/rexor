-- "Oświetlenie, GPS i Shiftmix" było jednym, wymuszonym elementem (fixed)
-- w konfiguracji E55, łączącym trzy niepowiązane rzeczy w jedną pozycję z
-- opisem "elementy dostarcza klient" - niezrozumiałe i bezużyteczne w
-- konfiguratorze. Zastępujemy to dwiema osobnymi, opcjonalnymi kategoriami
-- (przednia/tylna lampka) z prawdziwymi produktami, które klient może
-- doklikać niezależnie od siebie.

-- Usuwamy starą, wymuszoną pozycję z konfiguracji E55 i dezaktywujemy część.
DELETE mp FROM model_parts mp
JOIN bike_models m ON m.id = mp.model_id
JOIN parts p ON p.id = mp.part_id
WHERE m.slug = 'e55-reference' AND p.sku = 'extras-lighting-gps-shiftmix';

UPDATE parts SET is_active = FALSE
WHERE sku = 'extras-lighting-gps-shiftmix';

-- Dwie nowe kategorie części: lampka przednia i tylna.
INSERT INTO part_groups (slug, name, description, sort_order, is_required)
VALUES
    ('front-light', 'Oświetlenie przednie', 'Lampka przednia - opcjonalny dodatek.', 151, FALSE),
    ('rear-light', 'Oświetlenie tylne', 'Lampka tylna - opcjonalny dodatek.', 152, FALSE)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO parts
    (group_id, sku, name, manufacturer, model, description, price_status, gross_price)
VALUES
    ((SELECT id FROM part_groups WHERE slug='front-light'), 'light-front-knog-blinder-e1300', 'Lampka przednia Knog Blinder E 1300', 'Knog', 'Blinder E 1300', NULL, 'fixed', 342.20),
    ((SELECT id FROM part_groups WHERE slug='rear-light'), 'light-rear-supernova-tl3-seatpost', 'Lampka tylna Supernova TL3 Mini Pro (obejma sztycy)', 'Supernova', 'TL3 Mini Pro', 'Montowana w obejmie sztycy siodła.', 'fixed', 400.00);

-- Przypisanie obu lampek jako opcjonalne dodatki do E82 i E55.
INSERT INTO model_parts (model_id, part_id, is_default, is_customer_configurable, sort_order)
SELECT m.id, p.id, FALSE, TRUE, 10
FROM bike_models m
JOIN parts p ON p.sku IN ('light-front-knog-blinder-e1300', 'light-rear-supernova-tl3-seatpost')
WHERE m.slug IN ('e82-wielichowo', 'e55-reference')
ON DUPLICATE KEY UPDATE is_customer_configurable = VALUES(is_customer_configurable);

INSERT INTO model_part_group_settings
    (model_id, group_id, selection_mode, customer_part_allowed, customer_part_gross_price, helper_text)
SELECT m.id, pg.id, 'optional', FALSE, 0.00, 'Opcjonalny dodatek - możesz go pominąć.'
FROM bike_models m
JOIN part_groups pg ON pg.slug IN ('front-light', 'rear-light')
WHERE m.slug IN ('e82-wielichowo', 'e55-reference')
ON DUPLICATE KEY UPDATE selection_mode = VALUES(selection_mode);
