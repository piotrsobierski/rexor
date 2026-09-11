# Gotowość do implementacji i produkcji

## Stan implementacji lokalnej

Pionowy przepływ MVP działa lokalnie: interfejs konfiguratora, przeliczenie ceny po stronie PHP, zapis MySQL, zapytanie w panelu i prywatna strona podsumowania. Wiadomość trafia obecnie do kolejki `email_outbox`; przed produkcją trzeba podłączyć i przetestować transport SMTP.

Założenia, które nie blokują startu:

- jedno konto/rola administratora w pierwszej wersji,
- trzy modele: E82, E55 i CFR707,
- części przypisywane ogólnie do kategorii i jawnie aktywowane per model,
- ceny wyłącznie brutto w PLN,
- brakująca treść i zdjęcia zastępowane kontrolowanymi placeholderami,
- CFR707 może początkowo mieć pusty katalog części i cenę „do uzupełnienia”.

## Wykonane lokalnie

- zainstalowano i uruchomiono PHP 8.5 oraz MySQL 8.0,
- sprawdzono składnię PHP, migrację bazową i preseed na pustej bazie,
- sprawdzono logowanie administratora, pobranie katalogu i zapis konfiguracji,
- wykonano produkcyjny build frontendu.

## Przed pierwszym wdrożeniem testowym

- przygotować `.env` bez umieszczania sekretów w Git,
- przetestować migracje na pustej bazie i na kopii ze starszym schematem,
- ustalić limity uploadu obrazów oraz generowanie wariantów WebP/AVIF.

## Przed produkcją na home.pl

- dostęp SSH/SFTP albo zatwierdzona alternatywna procedura wdrożenia,
- dane MySQL: host, port, nazwa bazy, użytkownik i hasło,
- aktywny SSL i wymuszenie HTTPS,
- docelowy adres odbiorcy zapytań, skrzynka nadawcza oraz dane SMTP,
- kopie zapasowe bazy i mediów z testem odtwarzania,
- finalne dane firmy, polityka prywatności, treści zgód i okres retencji zapytań,
- przynajmniej zdjęcia główne E82, E55, CFR707 oraz kategorii MTB i Gravel,
- zatwierdzone ceny wszystkich części i wartość rozliczeniowa „Dostarczam własną część”,
- test mobilny, dostępności, bezpieczeństwa logowania i formularza,
- produkcyjny dry-run migracji oraz backup bezpośrednio przed `--apply`.

## Może zostać uzupełnione później

- modele dla kategorii Szosa, Miejski i turystyczny oraz Rower elektryczny,
- rozbudowane opisy marketingowe,
- zakresy wzrostu użytkownika dla rozmiarów,
- komplet zdjęć wszystkich części,
- kilka ról administratorów,
- płatności, konto klienta, ERP, magazyn i wizualizacja 3D.
