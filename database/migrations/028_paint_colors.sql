-- Kolory lakieru jako osobny byt, wspólny dla rowerów i ram.
--
-- Dlaczego osobno, a nie kolumną w `bike_models` / `frames`: ta sama paleta
-- (np. Porsche Paint to Sample, 636 lakierów) ma być dostępna dla wielu
-- modeli i ram naraz. Trzymanie jej per produkt oznaczałoby kopiowanie
-- katalogu, a przypisywanie pojedynczych kolorów do modelu - 636 wierszy na
-- każdy model. Dlatego mapujemy na poziomie PALETY, nie koloru.
--
-- Dwie osie ceny, celowo rozdzielone:
--   * grupa części `paint` wycenia PROCES (robociznę): standard vs malowanie
--     na wybrany kolor. To zostaje bez zmian, w cenniku części.
--   * paleta/kolor wycenia DOSTĘP do lakieru: kolory fabryczne 0 zł,
--     Porsche/VW z dopłatą.
-- Spójność pilnuje `paint_palettes.requires_part_sku`: wybór koloru z palety
-- płatnej wymusza odpowiednią opcję procesu (patrz PaintService.php).
--
-- Decyzje właściciela: docs/PLAN_LAKIERY.md.

CREATE TABLE paint_palettes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    -- Marka, z której pochodzi paleta. NULL dla palety własnej Rexor.
    brand VARCHAR(160) NULL,
    -- 'factory' = kolory oferowane wprost przez Rexor, zwykle bez dopłaty.
    -- 'custom'  = paleta obcej marki, zwykle płatna.
    kind ENUM('factory', 'custom') NOT NULL DEFAULT 'custom',
    description VARCHAR(1000) NULL,
    -- Dopłata brutto za wybór KOLORU z tej palety. To cena sprzedaży, więc
    -- narzut modelu jej nie dotyczy - doliczana jest po narzucie, tak samo
    -- jak `model_price_adjustments`.
    price_gross DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    currency CHAR(3) NOT NULL DEFAULT 'PLN',
    -- SKU minimalnej opcji z grupy `paint`, jakiej wymaga kolor z tej palety.
    -- NULL = kolor nie wymusza niczego (paleta fabryczna).
    requires_part_sku VARCHAR(120) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE paint_colors (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    palette_id BIGINT UNSIGNED NOT NULL,
    -- Klucz naturalny importu. Kody lakierów potrafią się powtarzać w obrębie
    -- jednej marki (39 duplikatów w palecie Porsche), więc unikalny jest slug,
    -- nie kod.
    slug VARCHAR(180) NOT NULL,
    code VARCHAR(60) NULL,
    name VARCHAR(200) NOT NULL,
    -- Podgląd na ekranie, nie pomiar kolorymetryczny. Producenci nie publikują
    -- wartości sRGB, a lakiery efektowe zmieniają barwę z kątem patrzenia.
    hex CHAR(7) NOT NULL,
    finish ENUM('uni', 'metallic', 'pearl') NOT NULL DEFAULT 'uni',
    -- Nazwa grupy w palecie źródłowej ("Czerwienie", "Błękity") - sekcje w pickerze.
    group_name VARCHAR(120) NULL,
    -- Dodatkowe hasła do wyszukiwarki: nazwy niemieckie i pozostałe kody.
    search_alt VARCHAR(500) NULL,
    -- Nadpisuje `paint_palettes.price_gross` dla pojedynczego lakieru.
    price_gross_override DECIMAL(12,2) NULL,
    -- Zdjęcie auta w tym lakierze. Zależy WYŁĄCZNIE od koloru, więc siedzi tu,
    -- a nie w `paint_renders`. Domyślnie niepubliczne: materiały pobrane
    -- z zewnętrznych galerii służą jako referencja w panelu i wejście dla
    -- generatora renderów, a nie jako treść sklepu.
    reference_image_path VARCHAR(500) NULL,
    reference_source_url VARCHAR(1000) NULL,
    reference_is_public BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_paint_colors_slug (palette_id, slug),
    KEY idx_paint_colors_code (palette_id, code),
    CONSTRAINT fk_paint_colors_palette
        FOREIGN KEY (palette_id) REFERENCES paint_palettes(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dostępność palety dla modelu roweru. Osobne tabele dla modeli i ram zamiast
-- jednej z dwiema kolumnami NULL: klucz główny faktycznie chroni wtedy przed
-- duplikatem (UNIQUE w MySQL nie dedupikuje wierszy z NULL).
CREATE TABLE model_paint_palettes (
    model_id BIGINT UNSIGNED NOT NULL,
    palette_id BIGINT UNSIGNED NOT NULL,
    price_gross_override DECIMAL(12,2) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (model_id, palette_id),
    CONSTRAINT fk_model_paint_palettes_model
        FOREIGN KEY (model_id) REFERENCES bike_models(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_model_paint_palettes_palette
        FOREIGN KEY (palette_id) REFERENCES paint_palettes(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE frame_paint_palettes (
    frame_id BIGINT UNSIGNED NOT NULL,
    palette_id BIGINT UNSIGNED NOT NULL,
    price_gross_override DECIMAL(12,2) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (frame_id, palette_id),
    CONSTRAINT fk_frame_paint_palettes_frame
        FOREIGN KEY (frame_id) REFERENCES frames(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_frame_paint_palettes_palette
        FOREIGN KEY (palette_id) REFERENCES paint_palettes(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Render produktu w danym kolorze. W odróżnieniu od zdjęcia referencyjnego
-- zależy od PARY kolor + produkt: render ramy E55 nie pokazuje, jak ten sam
-- lakier wygląda na E82.
--
-- Ścieżka pliku zamiast `media_id`: to są setki obrazów generowanych maszynowo,
-- bez tekstu alternatywnego, podpisu i kolejności w galerii. Wiersz w `media`
-- nie wnosiłby tu nic poza kosztem, a wciągałby je w logikę sprzątania sierot.
-- Panel wgrywa render przez POST /admin/media i zapisuje zwróconą ścieżkę,
-- więc obie drogi (import zbiorczy i upload ręczny) trzymają to samo pole.
CREATE TABLE paint_renders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    color_id BIGINT UNSIGNED NOT NULL,
    model_id BIGINT UNSIGNED NULL,
    frame_id BIGINT UNSIGNED NULL,
    variant ENUM('standard', 'ultra') NOT NULL DEFAULT 'standard',
    image_path VARCHAR(500) NOT NULL,
    thumb_path VARCHAR(500) NULL,
    -- Skąd render pochodzi (model AI albo autor zdjęcia) - do podpisu i audytu.
    source VARCHAR(200) NULL,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_paint_renders_color (color_id),
    KEY idx_paint_renders_model (model_id, variant),
    KEY idx_paint_renders_frame (frame_id, variant),
    CONSTRAINT fk_paint_renders_color
        FOREIGN KEY (color_id) REFERENCES paint_colors(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_paint_renders_model
        FOREIGN KEY (model_id) REFERENCES bike_models(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_paint_renders_frame
        FOREIGN KEY (frame_id) REFERENCES frames(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Wybór lakieru w zapisanej konfiguracji. Migawka nazw i ceny, tak samo jak
-- `configuration_items`: zmiana cennika nie może przepisać historii.
CREATE TABLE configuration_paint (
    configuration_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    color_id BIGINT UNSIGNED NULL,
    palette_name_snapshot VARCHAR(160) NOT NULL,
    color_name_snapshot VARCHAR(200) NOT NULL,
    color_code_snapshot VARCHAR(60) NULL,
    color_hex_snapshot CHAR(7) NOT NULL,
    finish_snapshot VARCHAR(20) NOT NULL DEFAULT 'uni',
    gross_price_snapshot DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    render_path_snapshot VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_configuration_paint_configuration
        FOREIGN KEY (configuration_id) REFERENCES configurations(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_configuration_paint_color
        FOREIGN KEY (color_id) REFERENCES paint_colors(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Dane startowe
-- ---------------------------------------------------------------------------

-- Paleta fabryczna. Kolory i ich liczba są ROBOCZE - do zatwierdzenia przez
-- właściciela (docs/BRAKI_DANYCH.md). Dopłata 0 zł, bo to kolory w cenie.
INSERT INTO paint_palettes (slug, name, brand, kind, description, price_gross, requires_part_sku, sort_order)
VALUES
    ('rexor-standard', 'Kolory Rexor', NULL, 'factory', 'Kolory oferowane przez Rexor w cenie roweru.', 0.00, NULL, 10),
    ('porsche-pts', 'Porsche Paint to Sample', 'Porsche', 'custom', 'Pełna paleta Paint to Sample. Lakier mieszany na zamówienie, termin realizacji dłuższy niż dla kolorów standardowych.', 2500.00, 'paint-single-color', 20),
    ('volkswagen', 'Volkswagen', 'Volkswagen', 'custom', 'Klasyczne kolory Volkswagena, w tym paleta air-cooled.', 2500.00, 'paint-single-color', 30);

INSERT INTO paint_colors (palette_id, slug, code, name, hex, finish, group_name, sort_order)
SELECT p.id, v.slug, v.code, v.name, v.hex, v.finish, v.group_name, v.sort_order
FROM paint_palettes p
JOIN (
    SELECT 'carbon-raw' AS slug, NULL AS code, 'Surowy karbon' AS name, '#1A1A1C' AS hex, 'uni' AS finish, 'Czernie' AS group_name, 10 AS sort_order
    UNION ALL SELECT 'czarny-mat', NULL, 'Czarny matowy', '#141414', 'uni', 'Czernie', 20
    UNION ALL SELECT 'czarny-polysk', NULL, 'Czarny połysk', '#0B0B0D', 'uni', 'Czernie', 30
    UNION ALL SELECT 'bialy', NULL, 'Biały', '#F2F2EF', 'uni', 'Biele', 40
    UNION ALL SELECT 'antracyt', NULL, 'Antracyt', '#3A3D42', 'metallic', 'Szarości', 50
    UNION ALL SELECT 'czerwony', NULL, 'Czerwony', '#B4232A', 'uni', 'Czerwienie', 60
) AS v
WHERE p.slug = 'rexor-standard';

-- Palety dostępne w konfiguratorze. Modele dostają je wszystkie; wyłączenie
-- pojedynczej palety dla modelu to zmiana `is_active` w panelu.
INSERT INTO model_paint_palettes (model_id, palette_id, sort_order)
SELECT m.id, p.id, p.sort_order
FROM bike_models m
CROSS JOIN paint_palettes p
WHERE m.status <> 'archived';

-- Konfigurator prowadzi klienta do JEDNEGO koloru. Malowanie wielokolorowe,
-- wzory i przejścia wyceniamy indywidualnie, więc znika z listy wyborów
-- (zostaje w cenniku części i w panelu - to jest tylko ukrycie w konfiguratorze).
UPDATE model_parts mp
JOIN parts p ON p.id = mp.part_id
SET mp.is_customer_configurable = FALSE
WHERE p.sku = 'paint-custom-two-color';
