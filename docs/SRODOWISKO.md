# Środowisko lokalne i produkcyjne

## Lokalnie — uruchomiony wariant natywny

Na maszynie developerskiej działają PHP 8.5.10 i MySQL 8.0.46. Baza `rexor_configurator` została utworzona, migracja bazowa oraz preseed zostały wykonane i sprawdzone integracyjnie.

```bash
brew services start mysql@8.0
php scripts/startup.php
php -S 127.0.0.1:8081 -t apps/api/public apps/api/public/index.php
```

W drugim terminalu:

```bash
cd apps/web
npm install
npm run dev
```

Adresy: frontend `http://localhost:3000`, API `http://localhost:8081/api`, panel `http://localhost:3000/admin`.

Kolejkę wiadomości przetwarza polecenie `php apps/api/scripts/process-email-outbox.php`. Lokalnie zapisuje ono treść do `storage/logs/mail.log`; na hostingu można ustawić `MAIL_TRANSPORT=mail` i wywoływać skrypt z CRON-a.

## Lokalnie — opcjonalny Docker

Przygotowano kontenery Apache/PHP 8.5 i MySQL 8.0. Nowa baza otrzymuje automatycznie schemat oraz preseed przy pierwszym utworzeniu wolumenu. Inicjalizacja zapisuje też sumę kontrolną migracji bazowej, dzięki czemu późniejszy runner migracji nie próbuje utworzyć tych samych tabel ponownie.

```bash
cp .env.local.example .env
docker compose up --build
```

Po uruchomieniu API odpowiada pod `http://localhost:8081`, a MySQL jest dostępny z hosta na porcie 3307. Dane MySQL pozostają w nazwanym wolumenie po restarcie.

Zmiana `schema.sql` lub `seed.sql` nie przebudowuje istniejącej bazy. Do kolejnych zmian używamy wersjonowanych migracji; preseed jest tylko dla nowej, pustej bazy.

Backup lokalnej bazy uruchamia się wewnątrz kontenera aplikacji, ponieważ nazwa hosta `db` działa w sieci Compose:

```bash
docker compose exec app scripts/backup.sh --apply
```

## Produkcja

`.env.production.example` dokumentuje wymagane ustawienia home.pl i SMTP. To tylko szablon: nie wpisujemy prawdziwych haseł do repozytorium. Produkcyjny `.env` ma pozostać poza katalogiem publicznym lub być chroniony zgodnie z możliwościami hostingu.

Nie zakładamy Dockera na home.pl. Produkcja otrzyma statyczny build React, kod PHP, katalog mediów i uruchomione przez CLI migracje.
