-- Prawdziwe zdjęcia kategorii zamiast pustej ikony na stronie głównej i
-- liście kategorii. Pliki: public/media/categories/*.jpg (serwowane przez
-- rozszerzoną trasę /media/categories/... z index.php). Źródło: Unsplash,
-- licencja Unsplash License (użycie komercyjne, bez wymogu podania autora) -
-- to zdjęcia zastępcze do czasu własnej sesji zdjęciowej, patrz
-- docs/PYTANIA_OTWARTE.md pkt 5.
UPDATE bike_categories SET default_image_path = '/media/categories/szosa.jpg' WHERE slug = 'szosa';
UPDATE bike_categories SET default_image_path = '/media/categories/gravel.jpg' WHERE slug = 'gravel';
UPDATE bike_categories SET default_image_path = '/media/categories/mtb.jpg' WHERE slug = 'mtb';
UPDATE bike_categories SET default_image_path = '/media/categories/miejski-turystyczny.jpg' WHERE slug = 'miejski-turystyczny';
UPDATE bike_categories SET default_image_path = '/media/categories/elektryczne.jpg' WHERE slug = 'elektryczne';
