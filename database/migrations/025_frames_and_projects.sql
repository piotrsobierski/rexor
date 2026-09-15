-- Ramy sprzedawane osobno i zrealizowane projekty Rexor.
--
-- Rama jest celowo osobnym bytem niż `bike_models`: model jest wpięty w
-- cennik konfiguratora (model_parts, model_sizes, model_batteries,
-- przeliczanie ceny bazowej), a rama to pozycja katalogowa z własną ceną.
-- Trzymanie ramy jako "modelu bez konfiguratora" oznaczałoby NULL-e i
-- warunki w całej wycenie. Kategorie są wspólne z rowerami
-- (`bike_categories`), żeby filtr na /ramy i /rowery pokazywał tę samą listę.
--
-- Realizacje są bliżej `site_pages` niż `bike_models` - redagowana strona ze
-- zdjęciami i spisem użytych komponentów, bez cennika i konfiguracji.
--
-- Decyzje właściciela: docs/PLAN_RAMY_REALIZACJE.md.

CREATE TABLE frames (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT UNSIGNED NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    manufacturer VARCHAR(160) NULL,
    short_description VARCHAR(500) NULL,
    description_html MEDIUMTEXT NULL,
    description_document JSON NULL,
    -- Geometria jako tekst sformatowany ręcznie w WYSIWYG albo wklejona
    -- grafika producenta (rola media 'geometry'). Nie budujemy
    -- strukturalnego edytora tabel geometrii - patrz plan, decyzja 5.
    geometry_html MEDIUMTEXT NULL,
    specifications JSON NULL,
    -- NULL = "wymaga wyceny". Rama ma własną, definiowalną cenę brutto.
    price_gross DECIMAL(12,2) NULL,
    currency CHAR(3) NOT NULL DEFAULT 'PLN',
    paint_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
    -- Link do oferty producenta (np. carbonda.com), z której rama została
    -- przepisana - tylko dla administratora, nie publikujemy go na stronie.
    source_url VARCHAR(500) NULL,
    default_image_path VARCHAR(500) NULL,
    status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_frames_category
        FOREIGN KEY (category_id) REFERENCES bike_categories(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE frame_media (
    frame_id BIGINT UNSIGNED NOT NULL,
    media_id BIGINT UNSIGNED NOT NULL,
    role ENUM('default', 'gallery', 'description', 'geometry') NOT NULL DEFAULT 'gallery',
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (frame_id, media_id),
    CONSTRAINT fk_frame_media_frame
        FOREIGN KEY (frame_id) REFERENCES frames(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_frame_media_media
        FOREIGN KEY (media_id) REFERENCES media(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE projects (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    short_description VARCHAR(500) NULL,
    content_html MEDIUMTEXT NULL,
    content_document JSON NULL,
    -- Spis komponentów jako lista par w kolejności wprowadzonej w panelu:
    -- [{"label": "silnik", "value": "M620 CAN"}, ...]. Dokładnie forma
    -- tabelki, którą Rexor prowadzi dla każdego składu.
    specification JSON NULL,
    -- Opcjonalna; gdy ustawiona, realizacja wpada pod filtr kategorii.
    -- ON DELETE SET NULL, bo usunięcie kategorii nie może skasować realizacji.
    category_id BIGINT UNSIGNED NULL,
    completed_at DATE NULL,
    cover_image_path VARCHAR(500) NULL,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_projects_category
        FOREIGN KEY (category_id) REFERENCES bike_categories(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE project_media (
    project_id BIGINT UNSIGNED NOT NULL,
    media_id BIGINT UNSIGNED NOT NULL,
    role ENUM('cover', 'gallery', 'description') NOT NULL DEFAULT 'gallery',
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (project_id, media_id),
    CONSTRAINT fk_project_media_project
        FOREIGN KEY (project_id) REFERENCES projects(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_project_media_media
        FOREIGN KEY (media_id) REFERENCES media(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Kategoria zbiorcza dla ram i realizacji, które nie mieszczą się w
-- istniejących kategoriach rowerowych (słownik jest wspólny - decyzja 1).
INSERT INTO bike_categories (slug, name, short_description, sort_order, is_published)
VALUES ('inne', 'Inne', 'Ramy i realizacje spoza pozostałych kategorii.', 90, TRUE);
