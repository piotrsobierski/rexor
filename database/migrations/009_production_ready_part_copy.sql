-- Kilka nazw i opisów części zostało z etapu roboczego i było widoczne wprost
-- w konfiguratorze jako notatki wewnętrzne ("do potwierdzenia", "docelowo",
-- "cena robocza", "przykładowo"). Czyścimy je do wersji, które można pokazać
-- klientowi: usuwamy niepewne/niepotwierdzone fragmenty zamiast je zgadywać,
-- zostawiamy tylko potwierdzone specyfikacje.

UPDATE parts SET description = NULL
WHERE sku = 'frame-e82-m';

UPDATE parts SET description = NULL
WHERE sku = 'shock-rs-super-deluxe';

UPDATE parts SET description = NULL
WHERE sku = 'brakes-shimano-4p';

UPDATE parts SET description = NULL
WHERE sku = 'rotors-203-180';

UPDATE parts SET description = NULL
WHERE sku = 'rotors-magura-mdrp-220-180';

UPDATE parts SET description = NULL
WHERE sku = 'hub-rear-dt370-boost';

UPDATE parts SET description = NULL
WHERE sku = 'tires-schwalbe-johnny-watts-29';

UPDATE parts SET name = 'Maxxis 2.6', description = NULL
WHERE sku = 'tires-maxxis-2-6';

UPDATE parts SET description = NULL
WHERE sku = 'pedals-platform-mtb';

UPDATE parts SET name = 'Shimano Linkglide XT', description = NULL
WHERE sku = 'drivetrain-linkglide-xt';

UPDATE parts SET description = 'Wersja do pakietu 14S.'
WHERE sku = 'charger-58-8v';

UPDATE parts SET description = 'Do dwóch kolorów w wybranej kompozycji.'
WHERE sku = 'paint-custom-two-color';

-- Tekst pomocniczy grupy "Wyświetlacz" dla E55 odwoływał się do wewnętrznej
-- "konfiguracji referencyjnej" zamiast mówić wprost, która opcja jest domyślna.
UPDATE model_part_group_settings mpgs
JOIN bike_models m ON m.id = mpgs.model_id
JOIN part_groups pg ON pg.id = mpgs.group_id
SET mpgs.helper_text = 'Domyślnie wybrany wyświetlacz: DPC 245.'
WHERE m.slug = 'e55-reference' AND pg.slug = 'display';
