-- Bezpiecznik dla wdrożeń, na których wcześniejsza migracja oświetlenia
-- została pominięta lub ustawienie grupy zostało później zmienione w bazie.
-- Lampki są dodatkami: klient może wybrać jedną, obie albo żadnej.
UPDATE model_part_group_settings mpgs
JOIN part_groups pg ON pg.id = mpgs.group_id
SET mpgs.selection_mode = 'optional'
WHERE pg.slug IN ('front-light', 'rear-light');
