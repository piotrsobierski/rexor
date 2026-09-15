# Wdrożenie przez FTP na hosting PHP

Frontend jest eksportowany do statycznych plików. Jedynym backendem jest PHP
pod ścieżką `/api`; produkcja nie wymaga Node.js.

## Konfiguracja lokalna

Sekrety znajdują się wyłącznie w ignorowanych przez Git plikach:

- `.env.remote` — konfiguracja PHP i zdalnej bazy,
- `.deploy.env` — serwer i konto FTP oraz token migracji.

Szablony to `.env.production.example` i `.deploy.env.example`. Dla tego konta
katalog docelowy jest widoczny jako `/public_html`.

## Przygotowanie paczki bez wysyłania

```bash
npm run deploy:package
```

Wynik trafia do ignorowanego katalogu `.deploy/release` oraz archiwum
`.deploy/rexor-release.tar.gz`.

## Wysłanie i migracja

```bash
npm run deploy:dry-run
npm run deploy
```

Skrypt kolejno:

1. buduje statyczny frontend z adresem API `/api`,
2. wysyła paczkę do katalogu FTP,
3. uruchamia chronioną tokenem migrację przez HTTPS,
4. usuwa z serwera plik uruchamiający migrację,
5. sprawdza `/api/health`.

Pierwsze uruchomienie tworzy schemat, dane początkowe oraz wykonuje wszystkie
migracje. Kolejne wdrożenia wykonują tylko nowe migracje. Skrypt FTP nie usuwa
zdalnych plików ani wgranych mediów.

Host FTP należy brać z panelu lub z nazwy serwera źródłowego, nie z domeny
strony korzystającej z proxy Cloudflare.


## Lakiery a rozmiar paczki

`public/media/paints/renders/` waży ok. 57 MB (457 renderów ram w kolorach)
i wchodzi do paczki razem z resztą `public/media/`. To jednorazowy transfer -
kolejne wdrożenia rsync-ują tylko zmiany, ale pierwsze wgranie przez FTP potrwa
odpowiednio dłużej.

Zdjęcia referencyjne lakierów (`storage/paint-reference/`, ok. 66 MB) **wchodzą
do paczki**, ale nie do repozytorium - to cudze materiały z galerii Rennbow.
Na serwerze leżą poza katalogiem publicznym i serwuje je wyłącznie
`GET /api/admin/paint-reference/…` po zalogowaniu, a `reference_is_public`
zostaje `FALSE` (`docs/PLAN_LAKIERY.md`, decyzja 6). Bez nich w paczce
`paint_colors.reference_image_path` wskazywałby na nieistniejące pliki, więc
kafelek w panelu byłby pusty. Publikację na stronie sprzedażowej włącza
administrator świadomie, per kolor, po rozstrzygnięciu praw do zdjęć.

## Katalog lakierów jedzie migracją, nie importem

`import-paints.php` działa tylko lokalnie: wymaga Node.js i repozytorium
`e55-paint-to-sample`, więc nie uruchomi się na hostingu PHP. Nie da się go też
uruchomić z komputera przeciwko zdalnej bazie - DSN dev i produkcji wskazuje
nazwy hostów widoczne wyłącznie z serwera (`localhost` oraz `mysql8:3380`),
a zdalny dostęp do MySQL jest zamknięty.

Dlatego katalog (686 kolorów, 457 renderów, 664 referencje) jest zrzucony do
`database/migrations/029_paint_catalog.sql` i dociera na serwer tą samą drogą
co reszta schematu. Migracja wiąże kolory z paletami, a rendery z kolorami
i modelami **przez slug**, więc nie zależy od AUTO_INCREMENT na docelowej bazie.

Po dołożeniu nowych lakierów lokalnym importem generujemy **nową** migrację -
runner pilnuje sumy kontrolnej i odmówi wykonania zmienionego starego pliku.
