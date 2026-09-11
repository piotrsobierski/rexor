-- Dziennik aktywności dla panelu admina: kto, co i kiedy zrobił. Obejmuje
-- konfiguracje klientów (wybór modelu), edycje w panelu admina (zmiana
-- parametrów) oraz każdą wymianę wiadomości z chatbotem.

CREATE TABLE activity_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(60) NOT NULL,
    actor_type ENUM('customer', 'admin', 'system') NOT NULL,
    -- E-mail admina albo e-mail klienta, jeśli już go znamy (np. przy
    -- zapisanej konfiguracji). NULL dla anonimowych zdarzeń (np. czat przed
    -- podaniem danych).
    actor_label VARCHAR(254) NULL,
    ip_address VARCHAR(45) NULL,
    -- Krótki, czytelny opis do listy bez rozwijania szczegółów.
    summary VARCHAR(500) NOT NULL,
    -- Pełny kontekst zdarzenia (np. zmienione pola, treść wiadomości i
    -- odpowiedzi czatbota).
    details JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_activity_log_created (created_at),
    INDEX idx_activity_log_event_type (event_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
