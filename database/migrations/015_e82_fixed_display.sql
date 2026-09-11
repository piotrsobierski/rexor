-- Wyświetlacz DPC 030 jest fizycznie zintegrowany z górną rurą ramy E82
-- (patrz opis części) - to nie jest wybór klienta, tylko stały element
-- montowany przez producenta ramy. Grupa "Wyświetlacz" dla E82 była
-- błędnie ustawiona jako select_one z DPC 245 jako domyślnym, co
-- pozwalało klientowi wybrać wyświetlacz, którego rama fizycznie nie
-- obsługuje w tej konfiguracji.

UPDATE model_part_group_settings mpgs
JOIN bike_models m ON m.id = mpgs.model_id
JOIN part_groups pg ON pg.id = mpgs.group_id
SET mpgs.selection_mode = 'fixed',
    mpgs.helper_text = 'Wyświetlacz DPC 030 jest zintegrowany z ramą E82 i nie podlega zmianie.'
WHERE m.slug = 'e82-wielichowo' AND pg.slug = 'display';

UPDATE model_parts mp
JOIN bike_models m ON m.id = mp.model_id
JOIN parts p ON p.id = mp.part_id
SET mp.is_default = TRUE, mp.is_customer_configurable = FALSE
WHERE m.slug = 'e82-wielichowo' AND p.sku = 'display-dpc030';

DELETE mp FROM model_parts mp
JOIN bike_models m ON m.id = mp.model_id
JOIN parts p ON p.id = mp.part_id
WHERE m.slug = 'e82-wielichowo' AND p.sku = 'display-dpc245';
