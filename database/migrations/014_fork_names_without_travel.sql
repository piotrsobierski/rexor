-- Skok widelca (travel_mm) jest już osobno zapisany w fit_attributes i
-- zależy od tego, do jakiej geometrii ramy widelec dobrano - nie jest
-- stałą cechą modelu widelca. Wpisanie konkretnego skoku wprost w nazwę
-- sugerowało, że dany widelec istnieje tylko w jednej wersji i utrudniało
-- traktowanie go jako wspólnego komponentu między modelami rowerów.
UPDATE parts SET name = 'FOX 36 Performance'
WHERE sku = 'fork-fox-36-performance-160';

UPDATE parts SET name = '35 Silver TK 29 Solo Air Tapered Boost'
WHERE sku = 'fork-rs-35-silver-150';
