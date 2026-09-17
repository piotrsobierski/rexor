#!/usr/bin/env bash
#
# Pobiera świeży zrzut bazy z QA (domyślnie) albo produkcji na ten komputer.
#
# Wyzwala scripts/remote-backup.php (token DEPLOY_BACKUP_TOKEN), który po
# stronie serwera odpala scripts/db-dump.php i zapisuje gzipowany SQL pod
# storage/backups/<znacznik-czasu>/database.sql.gz - .htaccess i tak blokuje
# ten katalog dla HTTP, więc pobranie idzie przez FTP (lftp, ten sam
# mechanizm co scripts/deploy-ftp.sh). Po udanym pobraniu zdalna kopia jest
# kasowana, żeby backupy nie zalegały na koncie hostingu.
#
# Użycie:
#   scripts/download-db-backup.sh            # QA (rexor.sobierski.com)
#   scripts/download-db-backup.sh --prod     # produkcja (rexorbikes.com)

set -euo pipefail

project_root="$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)"
target="qa"
if [[ "${1:-}" == "--prod" ]]; then
  target="prod"
elif [[ -n "${1:-}" ]]; then
  echo "Użycie: scripts/download-db-backup.sh [--prod]" >&2
  exit 2
fi

if [[ "$target" == "prod" ]]; then
  deploy_env="$project_root/.deploy.env.production"
else
  deploy_env="$project_root/.deploy.env"
fi

if [[ ! -f "$deploy_env" ]]; then
  echo "Brak $deploy_env." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$deploy_env"
set +a

for name in DEPLOY_FTP_HOST DEPLOY_FTP_USER DEPLOY_FTP_PASSWORD DEPLOY_REMOTE_DIR DEPLOY_BASE_URL DEPLOY_BACKUP_TOKEN; do
  if [[ -z "${!name:-}" ]]; then
    echo "Brak wymaganej zmiennej $name w $deploy_env." >&2
    exit 1
  fi
done

command -v lftp >/dev/null 2>&1 || { echo "Brak programu lftp." >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "Brak python3 (do sparsowania odpowiedzi JSON)." >&2; exit 1; }

echo "Wyzwalam zrzut bazy na $DEPLOY_BASE_URL..."
response="$(curl --silent --show-error --fail --max-time 300 \
  --request POST \
  --header "X-Deploy-Token: $DEPLOY_BACKUP_TOKEN" \
  "${DEPLOY_BASE_URL%/}/scripts/remote-backup.php")"

remote_relative_path="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["relativePath"])' "$response")"
remote_tables="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["tables"])' "$response")"
remote_rows="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["rows"])' "$response")"
remote_size_bytes="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["sizeBytes"])' "$response")"

echo "Zrzut gotowy na serwerze: $remote_relative_path ($remote_tables tabel, $remote_rows wierszy, $((remote_size_bytes / 1024)) KB)."

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
local_dir="$project_root/storage/backups/$target/$timestamp"
mkdir -p "$local_dir"
local_file="$local_dir/database.sql.gz"

echo "Pobieram przez FTP do $local_file..."
lftp 2>&1 <<LFTP | sed -E 's#ftp://[^/@]*@#ftp://***@#g'
set cmd:fail-exit yes
set ftp:ssl-allow yes
set ssl:verify-certificate yes
open -u "$DEPLOY_FTP_USER","$DEPLOY_FTP_PASSWORD" "ftp://$DEPLOY_FTP_HOST"
cd $DEPLOY_REMOTE_DIR
get "$remote_relative_path" -o "$local_file"
rm "$remote_relative_path"
rmdir "$(dirname "$remote_relative_path")"
bye
LFTP

if ! gzip -t "$local_file" 2>/dev/null; then
  echo "BŁĄD: pobrany plik nie jest poprawnym gzipem: $local_file" >&2
  exit 1
fi

echo "Backup zweryfikowany i pobrany: $local_file"
echo "Zdalna kopia usunięta z serwera."
