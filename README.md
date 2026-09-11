# Rexor Bike Configurator

Konfigurator rowerów Rexor dla domeny `rexorbikes.com`.

Repozytorium zawiera działający frontend, konfigurator, panel administracyjny, API PHP, schemat i preseed MySQL oraz skrypty migracji i backupu.

## Założony kierunek

- frontend: React + TypeScript + Vite,
- backend: PHP 8.5, API JSON,
- baza danych: MySQL 8.0,
- hosting produkcyjny: istniejący Hosting Biznes home.pl z Apache,
- wdrożenie: statyczny build frontendu oraz API PHP na jednym hostingu.

Taki zestaw technologii pasuje do ograniczeń widocznych w panelu i wystarczy dla konfiguratora katalogowego, panelu administracyjnego oraz zapisu konfiguracji lub zapytań ofertowych.

## Dokumentacja

- [Dostępne technologie](docs/TECHNOLOGIE.md)
- [Wymagania wstępne](docs/WYMAGANIA.md)
- [Architektura](docs/ARCHITEKTURA.md)
- [Kierunek wizualny i UX](docs/WYGLAD_I_UX.md)
- [Braki danych i pytania](docs/BRAKI_DANYCH.md)
- [Dane referencyjne i cennik roboczy](docs/DANE_REFERENCYJNE.md)
- [Modele, geometria i baterie](docs/MODELE.md)
- [Zasady prowadzenia projektu](docs/ZASADY_PROJEKTU.md)
- [Dziennik zmian](docs/DZIENNIK_ZMIAN.md)
- [Migracje bazy i danych](docs/MIGRACJE.md)
- [Ceny i automatyczne dopłaty](docs/CENY_I_DOPLATY.md)
- [Zapis, linki i e-mail konfiguracji](docs/PRZEPLYW_KONFIGURACJI.md)
- [Środowisko lokalne i konfiguracja](docs/SRODOWISKO.md)
- [Backup bazy i mediów](docs/BACKUPY.md)
- [Gotowość do implementacji i produkcji](docs/GOTOWOSC_DO_WDROZENIA.md)
- [Materiały marki](assets/brand/README.md)

## Dane startowe

- [Schemat MySQL](database/schema.sql)
- [Przykładowy seed](database/seed.sql)
- [Zdjęcia modeli](public/media/models/README.md)

## Uruchomienie lokalne (bez Dockera)

```bash
brew services start mysql@8.0
php scripts/startup.php
php -S 127.0.0.1:8081 -t apps/api/public apps/api/public/index.php

cd apps/web
npm install
npm run dev
```

Frontend działa pod `http://localhost:3000`, API pod `http://localhost:8081/api`, a panel pod `http://localhost:3000/admin`. Lokalne konto demonstracyjne: `admin@rexor.local`; hasło ustawia się poleceniem `php apps/api/scripts/create-admin.php EMAIL HASŁO`.

## Aktualny zakres

- strona główna oraz podstrony Rowery, Ramy, Części i Serwis,
- konfigurator E82 i E55 z ceną brutto wyliczaną ponownie przez API,
- galerie ze strzałkami, formularz kontaktowy i prywatne linki podsumowania,
- panel do edycji nazw, cen, zdjęć, strony Serwis i kolorów motywu,
- CFR707 jako przygotowany model bez aktywnego cennika części.
