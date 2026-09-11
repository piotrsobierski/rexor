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
