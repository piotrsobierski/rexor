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

- `041_client_feedback_hero_render_copy_order.sql` (29 września 2026) -
  `bike_categories.show_hero_image` (domyślnie ukryty baner), usunięcie
  wariantu renderu `standard` (awans na `ultra`, gdy ultra brak), puste
  nadpisania `copy.configurator.paintPickHint`/`paintSingleColorNote`
  oraz „Lakierowanie” na początku kolejności grup. Wykonana lokalnie na
  MySQL 8.0.
- `033_paint_photos.sql` (16 września 2026) - dokłada wariant `photo` do
  `paint_renders.variant` oraz kolumnę `sort_order` (kolejność ujęć), a indeksy
  wariantu rozszerza o tę kolumnę. Zdjęcie realnego roweru ma pierwszeństwo
  przed wizualizacją: `photo` → `ultra` → `standard`. Wykonana lokalnie na
  MySQL 8.0.
- `032_rename_porsche_palette.sql` (16 września 2026) - zmienia nazwę palety
  `porsche-pts` z „Porsche Paint to Sample" na „Porsche" (slug bez zmian).
  Wykonana lokalnie na MySQL 8.0.
- `031_test_frame_scott_spark.sql` (16 września 2026) - **dane testowe**: rama
  „Scott Spark (rama testowa)" w kategorii MTB wraz z czterema zdjęciami
  i kompletem palet lakierów. Tabela `frames` była pusta na dev i produkcji,
  więc ani `/ramy`, ani seed `frame_paint_palettes` z migracji 030 nie miały na
  czym zadziałać. Rama nie wiąże się z żadnym modelem - `frames` ma tylko
  relację do `bike_categories`. Przed wdrożeniem na produkcję wpis trzeba
  usunąć albo przestawić na `draft`: `DELETE FROM frames WHERE slug =
  'scott-spark-test'` (kaskada sprząta `frame_media` i `frame_paint_palettes`).
  Wykonana lokalnie na MySQL 8.0.
- `029_paint_catalog.sql` (16 września 2026) - pełny katalog: 686 kolorów,
  457 renderów i 664 ścieżki zdjęć referencyjnych. Dane jadą migracją, bo
  `import-paints.php` potrzebuje Node.js i repozytorium `e55-paint-to-sample`,
  których na hostingu nie ma. Wiązania idą po slugach, nie po ID, więc plik
  jest niezależny od `AUTO_INCREMENT` na docelowej bazie. Wykonana lokalnie na
  MySQL 8.0.
- `030_paint_pricing_and_frames.sql` (16 września 2026) - zeruje `price_gross`
  palet Porsche i Volkswagen oraz nadpisania per produkt. Obowiązujący cennik:
  „Lakierowanie standardowe" to kolor producenta, „Lakierowanie jednokolorowe"
  (+800 zł) obejmuje dowolny kolor z obu palet, więc kolor nie może dokładać
  drugiej opłaty. Migracja dopisuje też opisy opcji i zasiewa
  `frame_paint_palettes` dla ram z `paint_available = TRUE` - migracja 028
  zasiała dostępność tylko dla modeli. Wykonana lokalnie na MySQL 8.0.
- `028_paint_colors.sql` (15 września 2026) - tabele `paint_palettes`,
  `paint_colors`, `model_paint_palettes`, `frame_paint_palettes`,
  `paint_renders` i `configuration_paint`, paleta fabryczna Rexor oraz palety
  Porsche Paint to Sample i Volkswagen. Migracja wyłącza też
  `paint-custom-two-color` z listy wyborów klienta (`is_customer_configurable`),
  bo konfigurator prowadzi do jednego koloru. Dane lakierów wciąga osobno
  `apps/api/scripts/import-paints.php` - import jest idempotentny i domyślnie
  tylko pokazuje, co zrobi. Wykonana lokalnie na MySQL 8.0.
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
