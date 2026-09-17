-- Ramy nie mają cennika konfiguratora (patrz 025_frames_and_projects.sql),
-- więc `frame_sizes` jest celowo minimalny: tylko oznaczenie i nazwa. Bez
-- dopłaty za rozmiar (rama ma jedną cenę) i bez wzrostu jeźdźca ani
-- geometrii per rozmiar - to już jest w `geometry_html` ramy, kto potrzebuje
-- szczegółów, przeczyta je tam. To tylko lista do wyboru zamiast wpisywania
-- rozmiaru ręcznie w formularzu zapytania o ramę.
CREATE TABLE frame_sizes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    frame_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(40) NOT NULL,
    label VARCHAR(120) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE KEY uq_frame_size (frame_id, code),
    CONSTRAINT fk_frame_sizes_frame
        FOREIGN KEY (frame_id) REFERENCES frames(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
