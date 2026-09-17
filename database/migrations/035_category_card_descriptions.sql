-- Wyrównanie długości opisów startowych bez nadpisywania własnych treści.
UPDATE bike_categories SET short_description = 'Lekkie rowery do szybkiej jazdy po asfalcie i długich tras szosowych.'
WHERE slug = 'szosa' AND short_description = 'Lekkie rowery stworzone do szybkiej i efektywnej jazdy po asfalcie.';

UPDATE bike_categories SET short_description = 'Uniwersalne rowery na asfalt, szuter i długie wyprawy poza miasto.'
WHERE slug = 'gravel' AND short_description = 'Uniwersalne rowery na asfalt, szuter i dłuższe wyprawy.';

UPDATE bike_categories SET short_description = 'Wytrzymałe rowery na górskie szlaki i wymagające trasy terenowe.'
WHERE slug = 'mtb' AND short_description = 'Rowery do jazdy terenowej, górskiej i wymagających tras.';

UPDATE bike_categories SET short_description = 'Wygodne rowery do codziennych przejazdów i turystycznych wypraw.'
WHERE slug = 'miejski-turystyczny' AND short_description = 'Wygodne rowery do codziennych przejazdów i turystyki.';

UPDATE bike_categories SET short_description = 'Pojazdy z napędem ponad normy roweru elektrycznego (250 W / 25 km/h).'
WHERE slug = 'elektryczne' AND short_description = 'Napęd i wspomaganie powyżej norm roweru elektrycznego (250 W / 25 km/h).';

