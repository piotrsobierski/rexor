#!/usr/bin/env bash
#
# Pełne lustro katalogu produktowego (modele, ramy, malowania, realizacje +
# ich media) z produkcji (rexorbikes.com) do QA (rexor.sobierski.com).
#
# UWAGA: to NADPISUJE katalog produktowy na QA danymi z prod (TRUNCATE +
# INSERT z dokładnymi ID źródła - zobacz scripts/catalog-tables.php). Wszelkie
# dane testowe stworzone tylko na QA (modele/ramy/kategorie spoza prod) oraz
# istniejące na QA configurations/inquiries, które wskazują na katalogowe ID
# nadpisywane przez ten sync, zostaną utracone albo osierocone. Świadoma
# decyzja projektowa - QA ma być zwierciadłem prod dla treści katalogowych,
# a nie osobnym środowiskiem z własnym katalogiem.
#
# Poza zakresem (nietykane): admin_users, activity_log, site_pages,
# site_settings, configurations/configuration_items/configuration_paint,
# inquiries, email_outbox.
#
# Wymaga: lokalnego MySQL bez hasła na roocie (do jednorazowego, tymczasowego
# odtworzenia zrzutu prod - patrz docs/, sekcja o testowaniu migracji na
# bazie jednorazowej), lftp, curl, php, mysql, gzip.
#
# Użycie:
#   scripts/sync-catalog-prod-to-qa.sh            # podgląd (nic nie wysyła)
#   scripts/sync-catalog-prod-to-qa.sh --apply

set -euo pipefail

project_root="$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)"
mode="${1:---dry-run}"

if [[ "$mode" != "--dry-run" && "$mode" != "--apply" ]]; then
  echo "Użycie: scripts/sync-catalog-prod-to-qa.sh [--dry-run|--apply]" >&2
  exit 2
fi

for name in curl lftp php mysql gunzip; do
  command -v "$name" >/dev/null 2>&1 || { echo "Brak programu $name." >&2; exit 1; }
done

prod_env="$project_root/.deploy.env.production"
qa_env="$project_root/.deploy.env"
[[ -f "$prod_env" ]] || { echo "Brak $prod_env." >&2; exit 1; }
[[ -f "$qa_env" ]] || { echo "Brak $qa_env." >&2; exit 1; }

read_var() {
  local file="$1" key="$2"
  awk -F= -v wanted="$key" '$1 == wanted {sub(/^[^=]*=/, ""); print; exit}' "$file" \
    | sed -E 's/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/'
}

PROD_FTP_HOST="$(read_var "$prod_env" DEPLOY_FTP_HOST)"
PROD_FTP_USER="$(read_var "$prod_env" DEPLOY_FTP_USER)"
PROD_FTP_PASSWORD="$(read_var "$prod_env" DEPLOY_FTP_PASSWORD)"
PROD_REMOTE_DIR="$(read_var "$prod_env" DEPLOY_REMOTE_DIR)"
PROD_BASE_URL="$(read_var "$prod_env" DEPLOY_BASE_URL)"
PROD_BACKUP_TOKEN="$(read_var "$prod_env" DEPLOY_BACKUP_TOKEN)"

QA_FTP_HOST="$(read_var "$qa_env" DEPLOY_FTP_HOST)"
QA_FTP_USER="$(read_var "$qa_env" DEPLOY_FTP_USER)"
QA_FTP_PASSWORD="$(read_var "$qa_env" DEPLOY_FTP_PASSWORD)"
QA_REMOTE_DIR="$(read_var "$qa_env" DEPLOY_REMOTE_DIR)"
QA_BASE_URL="$(read_var "$qa_env" DEPLOY_BASE_URL)"
QA_SYNC_TOKEN="$(read_var "$qa_env" DEPLOY_CATALOG_SYNC_TOKEN)"

for pair in "PROD_FTP_HOST:$PROD_FTP_HOST" "PROD_BASE_URL:$PROD_BASE_URL" "PROD_BACKUP_TOKEN:$PROD_BACKUP_TOKEN" \
            "QA_FTP_HOST:$QA_FTP_HOST" "QA_BASE_URL:$QA_BASE_URL" "QA_SYNC_TOKEN:$QA_SYNC_TOKEN"; do
  name="${pair%%:*}"; value="${pair#*:}"
  [[ -n "$value" ]] || { echo "Brak wymaganej zmiennej $name." >&2; exit 1; }
done

if [[ "$mode" == "--dry-run" ]]; then
  echo "Tryb podglądu: pobiorę i pokażę co ZOSTAŁOBY zsynchronizowane, nic nie wyślę na QA."
fi

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT
tmp_db="rexor_catalog_sync_tmp_$$"

echo "== 1/6 Wyzwalam świeży zrzut bazy na prod ($PROD_BASE_URL)..."
response="$(curl --silent --show-error --fail --max-time 300 \
  --request POST \
  --header "X-Deploy-Token: $PROD_BACKUP_TOKEN" \
  "${PROD_BASE_URL%/}/scripts/remote-backup.php")"
remote_relative_path="$(php -r '$d=json_decode($argv[1],true); echo $d["relativePath"];' "$response")"

echo "== 2/6 Pobieram zrzut przez FTP..."
dump_gz="$work_dir/database.sql.gz"
lftp 2>&1 <<LFTP | sed -E 's#ftp://[^/@]*@#ftp://***@#g'
set cmd:fail-exit yes
set ftp:ssl-allow yes
set ssl:verify-certificate yes
open -u "$PROD_FTP_USER","$PROD_FTP_PASSWORD" "ftp://$PROD_FTP_HOST"
cd $PROD_REMOTE_DIR
get "$remote_relative_path" -o "$dump_gz"
rm "$remote_relative_path"
rmdir "$(dirname "$remote_relative_path")"
bye
LFTP

gunzip -c "$dump_gz" > "$work_dir/database.sql"

echo "== 3/6 Buduję SQL katalogu (TRUNCATE + INSERT z ID prod)..."
php "$project_root/scripts/extract-catalog-sql.php" "$work_dir/database.sql" > "$work_dir/catalog-sync.sql"

echo "== 4/6 Ładuję zrzut prod do jednorazowej lokalnej bazy $tmp_db (żeby wypisać listę plików media)..."
mysql -u root -e "DROP DATABASE IF EXISTS \`$tmp_db\`; CREATE DATABASE \`$tmp_db\` CHARACTER SET utf8mb4;"
mysql -u root "$tmp_db" < "$work_dir/database.sql"
mysql -u root -N "$tmp_db" -e "SELECT storage_path FROM media;" > "$work_dir/media-paths-all.txt"
mysql -u root -e "DROP DATABASE \`$tmp_db\`;"

# Tylko /uploads/... ma fizyczną kopię pod storage/media (patrz komentarz w
# MediaLinkService::deleteOrphanMedia) - /media/... to statyczny zasób z
# public/media, wspólny dla obu środowisk przez sam build, nie przez FTP.
grep '^/uploads/' "$work_dir/media-paths-all.txt" | sed 's#^/uploads/##' > "$work_dir/media-paths.txt" || true

media_count="$(wc -l < "$work_dir/media-paths.txt" | tr -d ' ')"
echo "   $media_count plików media (spod /uploads/) do zmirrorowania."

if [[ "$mode" == "--dry-run" ]]; then
  echo "== Podgląd zakończony =="
  echo "Tabele katalogu: $(php -r 'require $argv[1]; echo implode(", ", catalogTables());' "$project_root/scripts/catalog-tables.php")"
  echo "Plik SQL: $(wc -l < "$work_dir/catalog-sync.sql" | tr -d ' ') linii"
  echo "Media: $media_count plików"
  echo "Uruchom z --apply, żeby faktycznie wysłać na QA."
  exit 0
fi

echo "== 5/6 Pobieram storage/media/ (pliki spod /uploads/) z prod i wgrywam na QA..."
# Cały storage/media (nie tylko pliki z media-paths.txt) - to jedyne co tam
# jest (preseed mieszka w public/media, wspólnym z buildem, nie w storage/media),
# a lftp `mirror` sam tworzy katalogi po drodze bez błędu przy istniejących
# (w przeciwieństwie do ręcznego `mkdir -p` per plik, które się na tym wywala).
if [[ "$media_count" -gt 0 ]]; then
  mkdir -p "$work_dir/media"
  lftp 2>&1 <<LFTP | sed -E 's#ftp://[^/@]*@#ftp://***@#g'
set cmd:fail-exit yes
set ftp:ssl-allow yes
set ssl:verify-certificate yes
set mirror:parallel-transfer-count 4
open -u "$PROD_FTP_USER","$PROD_FTP_PASSWORD" "ftp://$PROD_FTP_HOST"
cd $PROD_REMOTE_DIR
mirror storage/media "$work_dir/media"
bye
LFTP

  lftp 2>&1 <<LFTP | sed -E 's#ftp://[^/@]*@#ftp://***@#g'
set cmd:fail-exit yes
set ftp:ssl-allow yes
set ssl:verify-certificate yes
set mirror:parallel-transfer-count 4
open -u "$QA_FTP_USER","$QA_FTP_PASSWORD" "ftp://$QA_FTP_HOST"
cd $QA_REMOTE_DIR
mirror -R "$work_dir/media" storage/media
bye
LFTP
fi

echo "== 6/6 Wgrywam catalog-sync.sql na QA i wykonuję go zdalnie..."
lftp 2>&1 <<LFTP | sed -E 's#ftp://[^/@]*@#ftp://***@#g'
set cmd:fail-exit yes
set ftp:ssl-allow yes
set ssl:verify-certificate yes
open -u "$QA_FTP_USER","$QA_FTP_PASSWORD" "ftp://$QA_FTP_HOST"
cd $QA_REMOTE_DIR
mkdir -p storage/tmp
put "$work_dir/catalog-sync.sql" -o storage/tmp/catalog-sync.sql
bye
LFTP

sync_response="$(curl --silent --show-error --fail --max-time 120 \
  --request POST \
  --header "X-Deploy-Token: $QA_SYNC_TOKEN" \
  "${QA_BASE_URL%/}/scripts/remote-catalog-sync.php")"
echo "Odpowiedź QA: $sync_response"

if php -r 'exit(json_decode($argv[1], true)["ok"] ?? false ? 0 : 1);' "$sync_response"; then
  echo "Katalog produktowy na QA zsynchronizowany z prod."
else
  echo "BŁĄD: QA zgłosiło niepowodzenie synchronizacji." >&2
  exit 1
fi
