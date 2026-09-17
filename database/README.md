# Baza danych

- `schema.sql` - roboczy schemat MySQL 8.0.
- `seed.sql` - preseed: przykładowe kategorie, trzy modele, geometrie, baterie i części na podstawie przekazanych konfiguracji oraz danych producentów.

Seed służy do prototypowania. Wszystkie policzalne dane cenowe są zapisane jako ceny brutto, ale nie są zatwierdzonym cennikiem produkcyjnym. Dopłaty wynikają z różnicy cen części, nie są osobnymi danymi. Przed użyciem na produkcji trzeba potwierdzić niejasności z `docs/BRAKI_DANYCH.md`.

Seed nie jest uruchamiany przez automatyczny mechanizm migracji i nie wolno wykonywać go na bazie produkcyjnej z istniejącymi danymi.

Uruchomienie na pustej bazie:

```bash
mysql -u USER -p DATABASE < database/schema.sql
mysql -u USER -p DATABASE < database/seed.sql
```

Docelowo ręczne pliki SQL zostaną zastąpione wersjonowanymi migracjami wybranego narzędzia PHP.

W środowisku lokalnym kontener MySQL wykonuje `schema.sql`, następnie `seed.sql` i zapisuje sumę kontrolną migracji bazowej tylko przy tworzeniu nowego wolumenu. Nie nadpisuje danych przy kolejnych uruchomieniach.

## NIE edytuj `schema.sql` na żywej bazie — to zatwierdzona migracja `000_base_schema`

`scripts/migrate.php` traktuje `database/schema.sql` jako już wykonaną migrację
`000_base_schema` i przy każdym wdrożeniu porównuje jej **sumę kontrolną pliku**
z tą zapisaną w tabeli `schema_migrations` przy pierwszym uruchomieniu na danym
środowisku. Każda zmiana treści `schema.sql` po tym fakcie (nawet dopisanie
jednej kolumny) zmienia sumę kontrolną i wywala **każdy kolejny deploy** błędem:

```
BŁĄD: Wykonana migracja 000_base_schema została zmieniona. Dodaj nową migrację zamiast edytować starą.
```

To się już raz zdarzyło (2026-09-17, dodawanie `bike_categories.icon_key`):
zmiana w `schema.sql` przeszła code review i typecheck bez ostrzeżenia, ale
`npm run deploy` wysłał już nowy frontend/backend przez FTP i dopiero **wtedy**
migracja zdalna odpadła z 500 — więc kod trafił na serwer bez pasującej kolumny
w bazie, aż do naprawy. `scripts/remote-migrate.php` też zostaje wtedy
niewykasowany na serwerze (kasowanie jest krokiem PO udanej migracji), co jest
ryzykiem samo w sobie (chroniony tokenem, ale lepiej go tam nie zostawiać).

**Zasada:** każda zmiana struktury bazy (nowa kolumna, tabela, indeks) na
środowisku, które już ma dane, idzie WYŁĄCZNIE jako nowy plik w
`database/migrations/NNN_opis.sql` (kolejny wolny numer). `schema.sql` można
zmieniać tylko wtedy, gdy jednocześnie zmienia się definicja bazowa dla
zupełnie nowej instalacji (świadomie, z pełną wiadomością, że to nie dotyczy
już wdrożonych środowisk) — w praktyce niemal nigdy w tym projekcie.
