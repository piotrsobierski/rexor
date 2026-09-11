-- Opis wyświetlacza DPC 245 był notatką roboczą ("wybrany w konfiguracji
-- referencyjnej E55...") widoczną wprost w konfiguratorze przy tej opcji.
-- Część jest współdzielona między E82 i E55, więc opis nie powinien
-- odnosić się do jednego modelu ani do wewnętrznej notatki referencyjnej.
UPDATE parts
SET description = NULL
WHERE sku = 'display-dpc245';
