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
