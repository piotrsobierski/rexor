-- Nazwany identyfikator ikony (z ustalonego zestawu presetów lucide-react)
-- wyświetlanej jako mały znaczek na karcie kategorii na stronie głównej.
-- Osobna kolumna od `icon_path` (ten drugi to ścieżka do wgranego pliku,
-- którego panel administracyjny i tak nigdy nie wystawiał do edycji).
ALTER TABLE bike_categories
    ADD COLUMN icon_key VARCHAR(60) NULL AFTER icon_path;
