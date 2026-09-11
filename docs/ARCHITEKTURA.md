# Architektura wstępna

## Ocena proponowanego podejścia

React + Vite, PHP i MySQL to sensowny zestaw dla tego projektu i istniejącego hostingu. React obsłuży stan wieloetapowej konfiguracji, PHP zapewni API oraz panel administracyjny, a MySQL przechowa katalog, ceny, reguły i zapisane konfiguracje.

Istotne jest, aby produkcja nie wymagała uruchomionego serwera Node.js. Vite tworzy statyczny build, który Apache serwuje bezpośrednio.

## Przepływ

```text
Przeglądarka
  -> statyczna aplikacja React (`/`)
  -> żądania JSON do API PHP (`/api`)
  -> walidacja reguł i przeliczenie ceny na serwerze
  -> MySQL 8.0
```

Frontend może pokazywać cenę natychmiast, ale backend musi ponownie sprawdzać kompatybilność i sam obliczać ostateczną cenę. Nie wolno ufać cenie przesłanej przez przeglądarkę. Dopłata jest zawsze wynikiem `cena brutto wybranej części - cena brutto części domyślnej`, nigdy ręcznie przesłaną kwotą.

Po wysłaniu zapytania backend tworzy niezmienną migawkę konfiguracji, publiczny link tylko do odczytu, oddzielny link wznowienia edycji oraz wpis w kolejce wiadomości e-mail. Błąd SMTP nie cofa zapisu zapytania.

## Proponowana struktura katalogów po rozpoczęciu implementacji

```text
rexor-bike-configurator/
  apps/
    web/                 # React + TypeScript + Vite
    api/                 # PHP API i panel administracyjny
  database/
    migrations/
    seeds/
  assets/
    brand/
  docs/
  scripts/
```

## API - robocze moduły

- publiczny katalog modeli i opcji,
- sprawdzanie kompatybilności oraz wycena,
- zapis i odczyt konfiguracji przez bezpieczny identyfikator,
- utworzenie zapytania klienta,
- uwierzytelniony CRUD katalogu dla administratora,
- zarządzanie mediami.

Nie należy budować reguł konfiguratora wyłącznie w React. Jedno źródło prawdy dla zgodności i cen powinno działać po stronie backendu.

## Wdrożenie na home.pl

1. Lokalnie lub w CI uruchomić testy i `vite build`.
2. Umieścić wynik frontendu w katalogu publicznym domeny.
3. Umieścić publiczny punkt wejścia PHP pod `/api`, a kod i konfigurację w miarę możliwości poza katalogiem publicznym.
4. Ustawić dane dostępowe bazy poza repozytorium.
5. Wykonać migracje bazy kontrolowanym skryptem.
6. Włączyć certyfikat SSL i wymusić HTTPS.
7. Sprawdzić routing SPA w konfiguracji Apache (`.htaccess`) bez przechwytywania ścieżek `/api`.
8. Uruchomić `php scripts/migrate.php` w trybie podglądu, wykonać backup, a następnie zastosować zatwierdzone migracje przez `php scripts/startup.php`.

Dokładny mechanizm wdrożenia zależy od potwierdzenia SSH/SFTP i możliwości ustawienia katalogu dokumentów domeny.

Migracji nie uruchamiamy przy każdym żądaniu HTTP. Są osobnym, kontrolowanym krokiem wdrożenia wykonywanym z CLI/SSH/CI.

## Ryzyka do sprawdzenia wcześnie

- ograniczenia hostingu współdzielonego: czas wykonania, pamięć PHP, rozmiar uploadu i zadania CRON,
- sposób bezpiecznego przechowywania sekretów poza publicznym katalogiem,
- liczba i złożoność reguł kompatybilności,
- sposób generowania wizualizacji roweru,
- dostarczalność e-maili z zapytaniami,
- aktywacja SSL przed uruchomieniem logowania i formularzy.

## Rekomendacja dla pierwszej iteracji

Najpierw zbudować pionowy prototyp: jeden model roweru, 3-4 grupy opcji, kilka reguł wykluczających, aktualizacja ceny i zapis zapytania. Pozwoli to sprawdzić model danych oraz UX przed wprowadzaniem całego katalogu.
