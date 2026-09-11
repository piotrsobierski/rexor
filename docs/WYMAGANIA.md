# Wymagania wstępne

Dokument opisuje roboczy zakres konfiguratora rowerów. Panel administracyjny dostarcza wyłącznie informacji o środowisku; nie definiuje funkcji produktu.

## Cel produktu

Umożliwić klientowi zbudowanie poprawnej konfiguracji roweru Rexor, zobaczenie ceny i podsumowania oraz przekazanie konfiguracji do firmy. Administrator ma zarządzać ofertą bez edycji kodu.

## Założenia nadrzędne

- Projektujemy **mobile-first**: podstawowy przepływ musi być wygodny na telefonie, a szersze widoki są jego rozwinięciem.
- Konfigurator i panel administracyjny są osobnymi interfejsami, korzystającymi z tego samego API i danych.
- Model danych ma pozostać możliwie prosty. Dodajemy pole lub osobną encję dopiero wtedy, gdy odpowiada realnej potrzebie biznesowej.
- Kategorie, modele, części, ceny, zdjęcia, opisy i podstawowe reguły mają być edytowane w panelu, a nie w kodzie.
- Nazwa kategorii jest zwykłym edytowalnym polem; slug może być aktualizowany kontrolowanie z zachowaniem przekierowania starego adresu.
- Kategorie oraz modele powinny mieć opis użyteczny również dla przyszłego agenta AI, wyszukiwarki i generowania treści.
- Hierarchia danych: `kategoria -> model roweru -> dostępne części/opcje`.
- Wszystkie ceny prezentowane i edytowane jako kwoty brutto w PLN. Ewentualne kwoty historyczne w innych walutach nie są automatycznie doliczane bez przeliczenia lub indywidualnej wyceny.
- Rexor E82 występuje wyłącznie z silnikiem Bafang M560 750 W; silnik jest cechą stałą modelu.

## Role

- klient odwiedzający konfigurator bez logowania,
- administrator zarządzający katalogiem, cenami i regułami,
- opcjonalnie handlowiec obsługujący zapisane zapytania.

## Zakres MVP - klient

1. Wybór bazowego modelu roweru.
2. Konfiguracja w kolejnych kategoriach, np. rozmiar ramy, kolor, napęd, hamulce, koła, opony, siodełko i dodatki.
3. Pokazywanie tylko dostępnych i zgodnych opcji.
4. Bieżąca aktualizacja ceny oraz czytelne wskazanie dopłat liczonych automatycznie z cen brutto części.
5. Podsumowanie kompletnej konfiguracji.
6. Walidacja wymaganych wyborów i informacja o konflikcie części.
7. Na końcu klient podaje co najmniej imię i adres e-mail; telefon oraz uwagi są opcjonalne.
8. Zapis pełnej migawki konfiguracji, nazw, cen brutto, rozmiaru, baterii i wybranych opcji.
9. Wygenerowanie trudnego do odgadnięcia linku do strony podsumowania konfiguracji.
10. Wygenerowanie osobnego bezpiecznego linku pozwalającego ponownie otworzyć konfigurator z dokładnie tymi wyborami.
11. Wysłanie klientowi wiadomości e-mail z podsumowaniem oraz linkami do podglądu i kontynuowania konfiguracji.
12. Utworzenie zapytania ofertowego widocznego w panelu administracyjnym.
13. Formularz kontaktowy ze zgodami i potwierdzeniem przyjęcia zapytania.
14. Poprawne działanie na telefonie i komputerze.

## Zakres MVP - panel administracyjny

1. Bezpieczne logowanie administratora.
2. Dodawanie, edytowanie, ukrywanie i porządkowanie kategorii rowerów.
3. Edycja nazwy, opisu, slugu oraz domyślnego zdjęcia każdej kategorii.
4. Edycja opisów kategorii i modeli w edytorze WYSIWYG z nagłówkami, listami, linkami oraz obrazami osadzanymi z biblioteki mediów.
5. Zarządzanie modelami rowerów należącymi do kategorii.
6. Zarządzanie częściami, wariantami, cenami brutto, zdjęciami oraz statusem dostępności. Administrator nie wpisuje osobnej dopłaty: wynika ona z różnicy cen opcji.
7. Przypisywanie jednej części do wielu kategorii rowerów.
8. Zarządzanie rozmiarami i geometrią ramy dla każdego modelu.
9. Zarządzanie wariantami baterii dla modelu: format i model ogniwa, układ S/P, liczba ogniw, napięcie, Ah, Wh, napięcie ładowania i BMS.
10. Określanie, które elementy są stałe dla modelu (np. silnik), a które klient może wybrać (np. wyświetlacz).
11. Dopuszczenie opcji „Dostarczam własną część” per element/grupa wraz z edytowalną korektą ceny; bez osobnego globalnego rabatu.
12. Definiowanie reguł kompatybilności lub niedozwolonych połączeń.
13. Ustalanie kolejności kroków i opcji.
14. Podgląd zapisanych konfiguracji i zapytań klientów.
15. Eksport lub czytelny wydruk specyfikacji konfiguracji - do decyzji, czy potrzebny w MVP.
16. Zarządzanie zdjęciem głównym i galerią kategorii, modeli oraz części: dodawanie, podmiana, usuwanie, kadrowanie/wybór punktu centralnego, kolejność, podpis i tekst alternatywny.
17. Edycja globalnego motywu kolorystycznego przez niewielki zestaw semantycznych kolorów; zmiana ma obejmować wszystkie ekrany.
18. Edycja zwykłych podstron, w tym Serwisu, przez ten sam WYSIWYG z obrazami.

## Model danych - pierwszy szkic

- `bike_categories` - edytowalne kategorie, opisy i domyślne zdjęcia,
- `bike_models` - modele bazowe przypisane do kategorii i cena startowa,
- `model_sizes` - rozmiary i geometria ramy,
- `model_batteries` - edytowalne konfiguracje baterii per model,
- `option_groups` - kategorie wyboru,
- `parts` - części/warianty i ich ceny sprzedaży brutto,
- `model_parts` - opcje dostępne dla konkretnego modelu oraz ewentualne nadpisanie ceny,
- `compatibility_rules` - zależności i wykluczenia,
- `configurations` - zapisane konfiguracje, cena i status,
- `configuration_items` - wybrane elementy konfiguracji,
- `inquiries` - dane kontaktowe i obsługa zapytania,
- `email_outbox` - kolejka potwierdzeń e-mail z ponowieniami po błędzie,
- `admin_users` - konta panelu administracyjnego,
- `media` - zdjęcia i pozostałe zasoby katalogowe.
- `category_media` / `model_media` / `part_media` - zdjęcie główne, galerie, obrazy w opisie i diagramy geometrii.
- `site_pages` - edytowalne podstrony, m.in. Serwis,
- `site_settings` - globalne ustawienia, w tym semantyczne kolory motywu.

Cenę i nazwy wybranych opcji utrwalamy jako migawkę w konfiguracji. Dzięki temu późniejsza zmiana cennika nie zmieni historycznej wyceny.

Cena konfiguracji jest liczona po stronie API jako suma składników: rama z dopłatą rozmiaru, bateria, ceny wybranych części we wszystkich grupach modelu, cena składania i narzut modelu. Cena „od” modelu jest wyliczana tą samą formułą dla wyborów domyślnych i zapisywana wyłącznie przez serwer. Dopłata widoczna przy opcji to różnica wobec pozycji domyślnej w jej grupie i służy tylko prezentacji: nie przechowujemy jej jako niezależnej wartości ani nie sumujemy. Szczegóły w `docs/CENY_I_DOPLATY.md`.

„Dostarczam własną część” jest specjalnym typem wyboru, a nie fikcyjnym produktem. Zwykle ma cenę części 0 zł, więc system sam odejmuje cenę części domyślnej. Panel pozwala dopuścić tę możliwość osobno dla danej pozycji/modelu i w razie potrzeby ustawić inną wartość rozliczeniową.

Tokenów z linków nie przechowujemy w bazie otwartym tekstem. Baza zawiera wyłącznie ich skróty SHA-256. Link podglądu jest tylko do odczytu, a osobny link wznowienia daje możliwość dalszej edycji.

## Wymagania jakościowe

- Mobile-first z docelowym minimum szerokości 320 px bez przewijania poziomego.
- Główne akcje i podsumowanie ceny dostępne bez precyzyjnego celowania; pola dotykowe minimum około 44 x 44 px.
- HTTPS na całej stronie przed uruchomieniem produkcyjnym.
- Hasła administratorów haszowane algorytmem zapewnianym przez PHP (`password_hash`).
- Zapytania do bazy parametryzowane; brak danych dostępowych w repozytorium.
- Walidacja po stronie frontendu i obowiązkowa ponowna walidacja w API.
- Ochrona logowania, formularzy i zapisu zapytań przed nadużyciami oraz CSRF odpowiednio do sposobu uwierzytelnienia.
- Kopie zapasowe bazy i przesłanych mediów oraz przetestowane odtwarzanie.
- Responsywność od małych ekranów, obsługa klawiatury i czytelne komunikaty błędów.
- Optymalizacja zdjęć (WebP/AVIF oraz rozsądne rozmiary), ponieważ przestrzeń jest współdzielona.
- Podstawowe logowanie błędów bez zapisywania haseł i nadmiarowych danych osobowych.
- HTML z edytora WYSIWYG oczyszczany na backendzie według listy dozwolonych elementów i atrybutów; zakaz skryptów, ramek i zdarzeń `on*`.
- Upload obrazów z kontrolą MIME, rozszerzenia, rozmiaru i wymiarów, losową nazwą pliku oraz generowaniem zoptymalizowanych wariantów.
- Linki konfiguracji generowane z kryptograficznie losowego tokenu; możliwość ustawienia okresu ważności i unieważnienia przez administratora.
- Wysłanie e-maila obsługiwane przez kolejkę/outbox, aby chwilowy błąd SMTP nie powodował utraty zapytania.
- Zgodność formularzy i retencji danych z ustalonymi obowiązkami prywatności/RODO.

## Poza MVP

- płatności online i pełny koszyk,
- konta klientów,
- integracja z magazynem lub ERP,
- wizualizacja 3D i generowanie realistycznego obrazu każdego wariantu,
- wiele języków i walut,
- zaawansowane raporty sprzedażowe.

Te elementy można dodać później, ale każdy z nich istotnie rozszerza model danych, integracje i zakres testów.

## Pytania do właściciela projektu

1. Czy wybór ma zmieniać jedynie listę/specyfikację, czy również obraz roweru?
2. Jak złożone są reguły kompatybilności: proste wykluczenia czy zależności wielu elementów?
3. Czy wszystkie ceny brutto mają być widoczne publicznie?
4. Jak długo mają działać link podglądu i link wznowienia konfiguracji?
5. Kto otrzymuje zapytanie i z jakiego adresu ma być wysyłane potwierdzenie?
6. Czy panel ma obsługiwać kilka ról i kilku administratorów?
7. Skąd będą pochodzić zdjęcia produktów, opisy oraz dane początkowe?
8. Czy potrzebne są wersje językowe inne niż polska?

## Kryterium gotowości do implementacji

Można rozpocząć implementację pionowego prototypu już teraz. Otwarte pytania nie blokują szkieletu, ale muszą zostać zamknięte przed publikacją produkcyjną.
