-- Baner na stronie kategorii (21:9) używał tego samego zdjęcia co miniatura
-- karty na stronie głównej (4:3), tylko przyciętego przez CSS - stąd brzydkie
-- kadrowanie na banerze przy zdjęciach niepasujących proporcją. Osobna
-- kolumna pozwala adminowi wgrać dedykowane, szerokie zdjęcie na baner.
ALTER TABLE bike_categories
    ADD COLUMN hero_image_path VARCHAR(500) NULL AFTER default_image_path;

ALTER TABLE category_media
    MODIFY COLUMN role ENUM('default', 'hero', 'gallery', 'description') NOT NULL DEFAULT 'gallery';

-- Na start kopiujemy obecne zdjęcie karty jako baner, żeby strony kategorii
-- nie zostały bez obrazka, dopóki admin nie wgra dedykowanego zdjęcia.
UPDATE bike_categories SET hero_image_path = default_image_path WHERE hero_image_path IS NULL;
