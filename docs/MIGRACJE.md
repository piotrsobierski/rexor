# Migracje danych i schematu

Migracje są obowiązkowym elementem wdrożenia, gdy zmienia się struktura bazy albo istniejące dane wymagają transformacji. Nie uruchamiamy `seed.sql` automatycznie na produkcji.

## Mechanizm

- `database/schema.sql` jest migracją bazową dla pustej bazy.
- Kolejne migracje trafiają do `database/migrations/` jako numerowane pliki, np. `001_add_model_gallery.sql`.
- `scripts/migrate.php` zapisuje wykonane wersje i sumy SHA-256 w tabeli `schema_migrations`.
- Zmieniona suma wykonanej migracji zatrzymuje proces. Raz wykonanych plików nie edytujemy; poprawkę dodajemy jako nową migrację.
- Blokada `GET_LOCK` uniemożliwia jednoczesne uruchomienie dwóch wdrożeń.
- Domyślny tryb jest tylko podglądem. Zmiany wymagają flagi `--apply`.
- Produkcja dodatkowo wymaga `MIGRATION_ALLOW_PRODUCTION=1`.

## Uruchomienie

```bash
cp .env.example .env
php scripts/migrate.php
php scripts/migrate.php --apply
```

Skrót wdrożeniowy `php scripts/startup.php` uruchamia migracje z `--apply`. Skrypt jest tylko dla CLI/SSH/CI i nigdy nie może być publicznym endpointem WWW.

## Zasady bezpieczeństwa

1. Przed produkcyjną migracją wykonać i sprawdzić backup bazy oraz mediów przez `scripts/backup.sh --apply`.
2. Najpierw uruchomić podgląd oraz migrację na kopii/stagingu.
3. Duże transformacje danych wykonywać partiami i tak, aby można je było bezpiecznie wznowić.
4. Rozdzielać zmianę schematu, backfill danych i usuwanie starej kolumny na osobne wdrożenia.
5. Preferować zmiany kompatybilne wstecz: najpierw dodać nowe pole, potem wdrożyć kod, na końcu usunąć stare.
6. Nie zakładać pełnej transakcyjności DDL MySQL - wiele operacji `ALTER/CREATE` wykonuje implicit commit.
7. Migracja danych powinna sprawdzać liczbę rekordów przed i po oraz zapisywać błędy bez ujawniania danych osobowych.

## Wykonane zmiany schematu poza migracją bazową

- `025_frames_and_projects.sql` (15 września 2026) - tabele `frames`,
  `frame_media`, `projects`, `project_media` oraz kategoria `inne`
  w `bike_categories`. Kategorie ram są wspólne z rowerami, więc migracja nie
  tworzy własnego słownika. Wykonana lokalnie na MySQL 8.0.

`database/schema.sql` nie jest utrzymywany równolegle z migracjami - nie ma
w nim m.in. `admin_login_attempts` (017), `ai_rate_limit_hits` (018) ani
`activity_log` (019). Pusta baza i tak dostaje komplet tabel, bo
`migrationFiles()` uruchamia `schema.sql` jako `000_base_schema`, a zaraz po
nim wszystkie pliki z `database/migrations/`. Nowych tabel nie dopisujemy
więc do `schema.sql`, żeby nie tworzyć drugiego, rozjeżdżającego się źródła
prawdy.

Migracja bazowa i preseed zostały wykonane integracyjnie 11 września 2026 na lokalnym PHP 8.5.10 i MySQL 8.0.46. Kolejne zmiany schematu muszą już trafiać do nowych, numerowanych plików zamiast modyfikowania wykonanej migracji produkcyjnej.
