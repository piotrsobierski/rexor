-- "e82-wielichowo" i "e55-reference" to nazwy robocze projektu (miejscowość
-- referencyjnego zamówienia / typ zamówienia), które przeciekły do publicznych
-- URL-i i danych. Klientowi i adresom stron ma pokazywać się po prostu "e82"
-- i "e55" - reszta danych wiąże się z modelem przez model_id, nie przez slug,
-- więc to jedyna zmiana potrzebna po stronie bazy.

UPDATE bike_models SET slug = 'e82' WHERE slug = 'e82-wielichowo';
UPDATE bike_models SET slug = 'e55' WHERE slug = 'e55-reference';
