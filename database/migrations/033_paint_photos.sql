-- Prawdziwe zdjęcie roweru w danym lakierze jako trzeci wariant obrazu.
--
-- Do tej pory `paint_renders` niosło wyłącznie wizualizacje komputerowe
-- (`standard`, `ultra`). Zdjęcie gotowego roweru jest mocniejszym dowodem
-- koloru niż jakikolwiek render, więc dostaje pierwszeństwo wszędzie tam,
-- gdzie pokazujemy jeden obraz: `photo` → `ultra` → `standard` → płaska
-- próbka `hex`.
--
-- Zostaje w tej samej tabeli, a nie w osobnej: zdjęcie ma dokładnie tę samą
-- kardynalność co render (para kolor × produkt), tę samą ścieżkę pliku, to
-- samo `is_public` i tę samą trasę serwującą. Osobna tabela byłaby kopią
-- schematu różniącą się nazwą.
--
-- Różnica jest jedna i siedzi w kodzie, nie w schemacie: renderów trzymamy
-- po jednym na wariant (kolejny upload podmienia poprzedni), a zdjęć wiele -
-- rower sfotografowany z kilku stron to kilka wierszy. Stąd `sort_order`:
-- przy jednym renderze na wariant kolejność nie miała czego porządkować.
ALTER TABLE paint_renders
    MODIFY COLUMN variant ENUM('standard', 'ultra', 'photo') NOT NULL DEFAULT 'standard',
    ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER source;

-- Lista zdjęć jednej pary kolor + produkt idzie po `sort_order`, więc indeksy
-- wariantu dostają je na końcu klucza.
ALTER TABLE paint_renders
    DROP INDEX idx_paint_renders_model,
    DROP INDEX idx_paint_renders_frame,
    ADD INDEX idx_paint_renders_model (model_id, variant, sort_order),
    ADD INDEX idx_paint_renders_frame (frame_id, variant, sort_order);
