-- "Ustawienie produkcji ramy E82" był placeholderem przeniesionym ze starego
-- arkusza (historycznie +100 USD), którego nigdy nie zamieniono na realną
-- cenę - w praktyce dokładał do każdej wyceny E82 nic nie znaczącą notatkę
-- "wymaga ustalenia z obsługą". Produkcja E82 jest już ustandaryzowana
-- (patrz migracje 013-015), więc dopłata "ustawienia produkcji" nie ma
-- dłużej uzasadnienia.

DELETE mpa FROM model_price_adjustments mpa
JOIN bike_models m ON m.id = mpa.model_id
WHERE m.slug = 'e82-wielichowo' AND mpa.code = 'e82-production-setup';
