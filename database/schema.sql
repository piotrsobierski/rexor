-- Roboczy schemat Rexor Bike Configurator dla MySQL 8.0.
-- Minimalizujemy granulację: elastyczne parametry techniczne trafiają do JSON,
-- a osobne kolumny dotyczą pól używanych w filtrowaniu i logice biznesowej.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE bike_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    short_description VARCHAR(500) NULL,
    description TEXT NULL,
    description_html MEDIUMTEXT NULL,
    description_document JSON NULL,
    default_image_path VARCHAR(500) NULL,
    icon_path VARCHAR(500) NULL,
    icon_key VARCHAR(60) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE bike_models (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT UNSIGNED NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    short_description VARCHAR(500) NULL,
    description TEXT NULL,
    description_html MEDIUMTEXT NULL,
    description_document JSON NULL,
    base_price DECIMAL(12,2) NULL,
    currency CHAR(3) NOT NULL DEFAULT 'PLN',
    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 23.00,
    prices_include_vat BOOLEAN NOT NULL DEFAULT TRUE,
    default_image_path VARCHAR(500) NULL,
    specifications JSON NULL,
    status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_models_category
        FOREIGN KEY (category_id) REFERENCES bike_categories(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE media (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    storage_path VARCHAR(500) NOT NULL UNIQUE,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    width_px INT UNSIGNED NULL,
    height_px INT UNSIGNED NULL,
    size_bytes BIGINT UNSIGNED NULL,
    alt_text VARCHAR(500) NULL,
    caption VARCHAR(1000) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Treści zwykłych podstron (np. Serwis) pozostają edytowalne przez WYSIWYG.
CREATE TABLE site_pages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    navigation_label VARCHAR(120) NOT NULL,
    excerpt VARCHAR(500) NULL,
    content_html MEDIUMTEXT NOT NULL,
    content_document JSON NULL,
    hero_image_path VARCHAR(500) NULL,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Złożone, rzadko filtrowane ustawienia motywu przechowujemy jako jeden dokument.
CREATE TABLE site_settings (
    setting_key VARCHAR(120) PRIMARY KEY,
    value JSON NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE category_media (
    category_id BIGINT UNSIGNED NOT NULL,
    media_id BIGINT UNSIGNED NOT NULL,
    role ENUM('default', 'gallery', 'description') NOT NULL DEFAULT 'gallery',
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (category_id, media_id),
    CONSTRAINT fk_category_media_category
        FOREIGN KEY (category_id) REFERENCES bike_categories(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_category_media_media
        FOREIGN KEY (media_id) REFERENCES media(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE model_media (
    model_id BIGINT UNSIGNED NOT NULL,
    media_id BIGINT UNSIGNED NOT NULL,
    role ENUM('default', 'gallery', 'description', 'geometry') NOT NULL DEFAULT 'gallery',
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (model_id, media_id),
    CONSTRAINT fk_model_media_model
        FOREIGN KEY (model_id) REFERENCES bike_models(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_model_media_media
        FOREIGN KEY (media_id) REFERENCES media(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rozmiar jest cechą modelu. Geometrię trzymamy jako JSON, żeby nie tworzyć
-- kilkudziesięciu rzadko używanych kolumn dla różnych typów ram.
CREATE TABLE model_sizes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    model_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(40) NOT NULL,
    label VARCHAR(120) NOT NULL,
    rider_height_min_cm SMALLINT UNSIGNED NULL,
    rider_height_max_cm SMALLINT UNSIGNED NULL,
    geometry JSON NOT NULL,
    source_url VARCHAR(500) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE KEY uq_model_size (model_id, code),
    CONSTRAINT fk_model_sizes_model
        FOREIGN KEY (model_id) REFERENCES bike_models(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Baterie są edytowane per model, ponieważ format i liczba ogniw wpływają
-- na napięcie, pojemność Ah oraz energię Wh i muszą pasować do ramy/silnika.
CREATE TABLE model_batteries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    model_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(200) NOT NULL,
    cell_format VARCHAR(20) NOT NULL,
    cell_manufacturer VARCHAR(160) NULL,
    cell_model VARCHAR(160) NULL,
    series_count SMALLINT UNSIGNED NOT NULL,
    parallel_count SMALLINT UNSIGNED NOT NULL,
    cell_capacity_ah DECIMAL(6,3) NOT NULL,
    nominal_voltage_v DECIMAL(6,2) NOT NULL,
    charge_voltage_v DECIMAL(6,2) NOT NULL,
    pack_capacity_ah DECIMAL(7,2) NOT NULL,
    nominal_energy_wh DECIMAL(9,2) NOT NULL,
    bms_continuous_a DECIMAL(7,2) NULL,
    gross_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    specifications JSON NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_battery_series CHECK (series_count > 0),
    CONSTRAINT chk_battery_parallel CHECK (parallel_count > 0),
    CONSTRAINT fk_model_batteries_model
        FOREIGN KEY (model_id) REFERENCES bike_models(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE part_groups (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    description TEXT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE parts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    group_id BIGINT UNSIGNED NOT NULL,
    sku VARCHAR(120) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    manufacturer VARCHAR(160) NULL,
    model VARCHAR(200) NULL,
    description TEXT NULL,
    specifications JSON NULL,
    price_status ENUM('fixed', 'quote') NOT NULL DEFAULT 'fixed',
    gross_price DECIMAL(12,2) NULL,
    currency CHAR(3) NOT NULL DEFAULT 'PLN',
    reference_market_price_gross DECIMAL(12,2) NULL,
    reference_price_source_url VARCHAR(1000) NULL,
    reference_price_checked_on DATE NULL,
    reference_price_notes VARCHAR(1000) NULL,
    image_path VARCHAR(500) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_parts_group
        FOREIGN KEY (group_id) REFERENCES part_groups(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE part_media (
    part_id BIGINT UNSIGNED NOT NULL,
    media_id BIGINT UNSIGNED NOT NULL,
    role ENUM('default', 'gallery', 'description') NOT NULL DEFAULT 'gallery',
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (part_id, media_id),
    CONSTRAINT fk_part_media_part
        FOREIGN KEY (part_id) REFERENCES parts(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_part_media_media
        FOREIGN KEY (media_id) REFERENCES media(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Część może być używana w wielu kategoriach, a kategoria może mieć wiele części.
CREATE TABLE category_parts (
    category_id BIGINT UNSIGNED NOT NULL,
    part_id BIGINT UNSIGNED NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (category_id, part_id),
    CONSTRAINT fk_category_parts_category
        FOREIGN KEY (category_id) REFERENCES bike_categories(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_category_parts_part
        FOREIGN KEY (part_id) REFERENCES parts(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cienka warstwa modelowa: dostępność, opcja domyślna i ewentualna cena
-- sprzedaży inna niż katalogowa. Dopłata nie jest zapisywana ręcznie:
-- API oblicza ją jako cena wybranej opcji minus cena domyślnej opcji.
CREATE TABLE model_parts (
    model_id BIGINT UNSIGNED NOT NULL,
    part_id BIGINT UNSIGNED NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_customer_configurable BOOLEAN NOT NULL DEFAULT TRUE,
    customer_supplied_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    customer_supplied_gross_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    gross_price_override DECIMAL(12,2) NULL,
    notes VARCHAR(1000) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (model_id, part_id),
    CONSTRAINT fk_model_parts_model
        FOREIGN KEY (model_id) REFERENCES bike_models(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_model_parts_part
        FOREIGN KEY (part_id) REFERENCES parts(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ustawienia całej grupy dla modelu: silnik może być stały, wyświetlacz wybieralny,
-- a przy widelcu lub damperze można dopuścić „część klienta” z własną ceną brutto.
CREATE TABLE model_part_group_settings (
    model_id BIGINT UNSIGNED NOT NULL,
    group_id BIGINT UNSIGNED NOT NULL,
    selection_mode ENUM('fixed', 'select_one', 'optional') NOT NULL DEFAULT 'select_one',
    customer_part_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    customer_part_gross_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    customer_part_label VARCHAR(160) NOT NULL DEFAULT 'Dostarczam własną część',
    helper_text VARCHAR(1000) NULL,
    PRIMARY KEY (model_id, group_id),
    CONSTRAINT fk_model_group_settings_model
        FOREIGN KEY (model_id) REFERENCES bike_models(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_model_group_settings_group
        FOREIGN KEY (group_id) REFERENCES part_groups(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Warunki dotyczące całego modelu/zamówienia, których nie należy udawać częściami.
CREATE TABLE model_price_adjustments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    model_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(120) NOT NULL,
    name VARCHAR(200) NOT NULL,
    adjustment_type ENUM('fixed', 'percentage', 'quote') NOT NULL,
    amount DECIMAL(12,2) NULL,
    currency CHAR(3) NULL,
    description VARCHAR(1000) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE KEY uq_model_price_adjustment (model_id, code),
    CONSTRAINT fk_price_adjustments_model
        FOREIGN KEY (model_id) REFERENCES bike_models(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE configurations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    public_id CHAR(26) NOT NULL UNIQUE,
    share_token_hash CHAR(64) NOT NULL UNIQUE,
    resume_token_hash CHAR(64) NOT NULL UNIQUE,
    source_configuration_id BIGINT UNSIGNED NULL,
    model_id BIGINT UNSIGNED NOT NULL,
    model_size_id BIGINT UNSIGNED NULL,
    model_battery_id BIGINT UNSIGNED NULL,
    status ENUM('draft', 'submitted', 'quoted', 'archived') NOT NULL DEFAULT 'draft',
    currency CHAR(3) NOT NULL DEFAULT 'PLN',
    base_price_gross_snapshot DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 23.00,
    gross_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    customer_email VARCHAR(254) NULL,
    customer_name VARCHAR(200) NULL,
    customer_phone VARCHAR(50) NULL,
    customer_notes TEXT NULL,
    snapshot JSON NOT NULL,
    consent_privacy_at TIMESTAMP NULL,
    share_created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_opened_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    submitted_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_configurations_model
        FOREIGN KEY (model_id) REFERENCES bike_models(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_configurations_size
        FOREIGN KEY (model_size_id) REFERENCES model_sizes(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_configurations_battery
        FOREIGN KEY (model_battery_id) REFERENCES model_batteries(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_configurations_source
        FOREIGN KEY (source_configuration_id) REFERENCES configurations(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migawka nazw i cen chroni historyczną konfigurację przed zmianą cennika.
CREATE TABLE configuration_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    configuration_id BIGINT UNSIGNED NOT NULL,
    part_id BIGINT UNSIGNED NULL,
    selection_type ENUM('catalog_part', 'customer_supplied') NOT NULL DEFAULT 'catalog_part',
    group_name_snapshot VARCHAR(160) NOT NULL,
    part_name_snapshot VARCHAR(200) NOT NULL,
    specification_snapshot VARCHAR(1000) NULL,
    gross_price_snapshot DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    gross_price_delta_snapshot DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_configuration_items_configuration
        FOREIGN KEY (configuration_id) REFERENCES configurations(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_configuration_items_part
        FOREIGN KEY (part_id) REFERENCES parts(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inquiries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    configuration_id BIGINT UNSIGNED NOT NULL UNIQUE,
    status ENUM('new', 'contacted', 'quoted', 'won', 'lost', 'archived') NOT NULL DEFAULT 'new',
    internal_notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_inquiries_configuration
        FOREIGN KEY (configuration_id) REFERENCES configurations(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admin_users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    display_name VARCHAR(160) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admin_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_user_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin_sessions_expiry (expires_at),
    CONSTRAINT fk_admin_sessions_user
        FOREIGN KEY (admin_user_id) REFERENCES admin_users(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Prosta kolejka zapewnia ponowienie wiadomości bez ponownego wysyłania formularza.
CREATE TABLE email_outbox (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    configuration_id BIGINT UNSIGNED NULL,
    recipient_email VARCHAR(254) NOT NULL,
    template_key VARCHAR(120) NOT NULL,
    payload JSON NOT NULL,
    status ENUM('pending', 'sending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
    attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    last_error VARCHAR(1000) NULL,
    available_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email_outbox_pending (status, available_at),
    CONSTRAINT fk_email_outbox_configuration
        FOREIGN KEY (configuration_id) REFERENCES configurations(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE compatibility_rules (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    rule_type ENUM('requires', 'excludes') NOT NULL,
    source_part_id BIGINT UNSIGNED NOT NULL,
    target_part_id BIGINT UNSIGNED NOT NULL,
    message VARCHAR(500) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    -- Różność części weryfikuje panel/API. MySQL 8.0 nie pozwala łączyć tego CHECK
    -- z referential actions użytymi przez oba klucze obce.
    CONSTRAINT fk_compatibility_source
        FOREIGN KEY (source_part_id) REFERENCES parts(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_compatibility_target
        FOREIGN KEY (target_part_id) REFERENCES parts(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
