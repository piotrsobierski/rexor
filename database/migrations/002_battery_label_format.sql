-- Etykiety pakietów mają używać polskiego formatu liczb, tak jak panel
-- administracyjny przy zapisie baterii. Backfill z migracji 001 zostawił
-- separatory angielskie.
UPDATE model_batteries
SET short_label = CONCAT(
        cell_format, ' · ', series_count, 'S', parallel_count, 'P · ',
        REPLACE(REPLACE(FORMAT(nominal_energy_wh, 1), ',', ' '), '.', ','), ' Wh'
    );
