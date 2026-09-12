-- Nowa kategoria "Pojazdy elektryczne": modele z silnikiem >250 W / >25 km/h
-- nie mogą być nazywane "rowerem elektrycznym" (wymóg zgodności), więc
-- dostają własną kategorię zamiast pozostawania w MTB. E82 i E55 (Bafang
-- M560/M620, oba > 250 W) przenoszą się tam w całości - użytkownik może
-- to później zmienić w panelu (zakładka Modele, pole Kategoria).
INSERT INTO bike_categories
    (slug, name, short_description, description, default_image_path, sort_order, is_published)
VALUES
    ('elektryczne', 'Pojazdy elektryczne', 'Napęd i wspomaganie powyżej norm roweru elektrycznego (250 W / 25 km/h).',
     'Modele w tej kategorii przekraczają parametry silnika i prędkości definiujące rower elektryczny (EPAC) w obowiązujących przepisach, dlatego nie są oferowane jako rowery elektryczne. Przed zakupem sprawdź lokalne przepisy dotyczące dopuszczenia takiego pojazdu do ruchu.',
     '/media/categories/mtb.webp', 35, TRUE);

UPDATE bike_categories SET description_html = CONCAT('<p>', description, '</p>') WHERE slug = 'elektryczne';

UPDATE bike_models SET category_id = (SELECT id FROM bike_categories WHERE slug = 'elektryczne')
WHERE slug IN ('e82', 'e55');

-- Szkielety stron dla stopki - treść to ogólny, redakcyjny placeholder
-- (nie porada prawna) z polami [do uzupełnienia] w miejscu danych firmy.
-- Publikowane od razu na prośbę klienta - do poprawienia w panelu (zakładka
-- Strony) zanim ktoś potraktuje treść jako ostateczną.
INSERT INTO site_pages
    (slug, title, navigation_label, excerpt, content_html, is_published)
VALUES
    ('regulamin', 'Regulamin', 'Regulamin', 'Warunki korzystania z konfiguratora i zakupu roweru Rexor.',
     '<p><em>Szkielet do uzupełnienia przez administratora - nie stanowi porady prawnej. Uzupełnij dane w nawiasach kwadratowych i skonsultuj treść z prawnikiem przed publikacją.</em></p><h2>1. Postanowienia ogólne</h2><p>Niniejszy regulamin określa zasady korzystania z konfiguratora rowerów oraz składania zapytań ofertowych za pośrednictwem serwisu [nazwa serwisu], którego administratorem jest [nazwa firmy], [adres], NIP: [NIP], e-mail: [e-mail kontaktowy].</p><h2>2. Konfigurator i zapytania ofertowe</h2><p>Zapisanie konfiguracji roweru i przesłanie danych kontaktowych nie stanowi zawarcia umowy sprzedaży, lecz zapytanie ofertowe. Ostateczna cena, dostępność oraz zgodność techniczna wybranych elementów są potwierdzane indywidualnie przez [nazwa firmy].</p><h2>3. Ceny</h2><p>Ceny prezentowane w konfiguratorze są cenami brutto i mają charakter orientacyjny do czasu potwierdzenia zamówienia.</p><h2>4. Reklamacje</h2><p>Reklamacje można zgłaszać na adres e-mail [e-mail kontaktowy]. [Opisz tryb i termin rozpatrywania reklamacji.]</p><h2>5. Postanowienia końcowe</h2><p>W sprawach nieuregulowanych niniejszym regulaminem zastosowanie mają przepisy prawa polskiego.</p>',
     TRUE),
    ('polityka-prywatnosci', 'Polityka prywatności', 'Polityka prywatności', 'Zasady przetwarzania danych osobowych w serwisie.',
     '<p><em>Szkielet do uzupełnienia przez administratora - nie stanowi porady prawnej. Uzupełnij dane w nawiasach kwadratowych i skonsultuj treść z prawnikiem/IOD przed publikacją.</em></p><h2>1. Administrator danych</h2><p>Administratorem danych osobowych jest [nazwa firmy], [adres], NIP: [NIP], e-mail: [e-mail kontaktowy].</p><h2>2. Zakres i cel przetwarzania</h2><p>Dane podane w formularzu konfiguratora (imię i nazwisko, e-mail, telefon, treść wiadomości) przetwarzane są w celu przygotowania i przekazania oferty oraz kontaktu w tej sprawie, na podstawie zgody i uzasadnionego interesu administratora.</p><h2>3. Okres przechowywania</h2><p>[Podaj okres przechowywania danych, np. do czasu przedawnienia roszczeń lub wycofania zgody.]</p><h2>4. Prawa osoby, której dane dotyczą</h2><p>Przysługuje Ci prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia oraz wniesienia sprzeciwu, a także skargi do Prezesa UODO.</p><h2>5. Kontakt</h2><p>W sprawach dotyczących danych osobowych napisz na [e-mail kontaktowy].</p>',
     TRUE),
    ('kontakt', 'Kontakt', 'Kontakt', 'Dane kontaktowe i rejestrowe Rexor Bikes.',
     '<p><em>Uzupełnij dane w nawiasach kwadratowych prawdziwymi danymi firmy przed publikacją.</em></p><h2>Dane firmy</h2><ul><li>Nazwa: [nazwa firmy]</li><li>Adres: [adres]</li><li>NIP: [NIP]</li><li>REGON: [REGON]</li></ul><h2>Kontakt</h2><ul><li>Telefon: [numer telefonu]</li><li>E-mail: [adres e-mail]</li><li>Godziny kontaktu: [np. pon.-pt. 9:00-17:00]</li></ul>',
     TRUE);
