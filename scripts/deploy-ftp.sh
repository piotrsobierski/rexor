#!/usr/bin/env bash

set -euo pipefail

project_root="$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)"
deploy_env="${DEPLOY_ENV_FILE:-$project_root/.deploy.env}"
release_dir="$project_root/.deploy/release"
mode="${1:---apply}"

if [[ "$mode" != "--apply" && "$mode" != "--dry-run" ]]; then
  echo "Użycie: scripts/deploy-ftp.sh [--dry-run|--apply]" >&2
  exit 2
fi

if [[ ! -f "$deploy_env" ]]; then
  echo "Brak $deploy_env. Skopiuj .deploy.env.example i uzupełnij host FTP." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$deploy_env"
set +a

for name in DEPLOY_FTP_HOST DEPLOY_FTP_USER DEPLOY_FTP_PASSWORD DEPLOY_REMOTE_DIR DEPLOY_BASE_URL DEPLOY_MIGRATION_TOKEN; do
  if [[ -z "${!name:-}" ]]; then
    echo "Brak wymaganej zmiennej $name w $deploy_env." >&2
    exit 1
  fi
done

command -v lftp >/dev/null 2>&1 || { echo "Brak programu lftp." >&2; exit 1; }

"$project_root/scripts/package-release.sh"

mirror_dry_run=""
if [[ "$mode" == "--dry-run" ]]; then
  mirror_dry_run="--dry-run"
fi

# HTML wychodzi w drugim przebiegu, po tym jak wszystkie zasoby (JS/CSS/media)
# już wylądowały. Przy jednym równoległym mirrorze zdarzało się, że nowy
# index.html (z nowym hashem pliku JS) wgrywał się, zanim ten plik JS w pełni
# się wgrał - przeglądarka/CDN łapały wtedy 404 zwrócone jako HTML zamiast
# modułu JS, a Cloudflare potrafił to zbuforować na dni.
lftp 2>&1 <<LFTP | sed -E 's#ftp://[^/@]*@#ftp://***@#g'
set cmd:fail-exit yes
set ftp:ssl-allow yes
set ssl:verify-certificate yes
open -u "$DEPLOY_FTP_USER","$DEPLOY_FTP_PASSWORD" "ftp://$DEPLOY_FTP_HOST"
cd $DEPLOY_REMOTE_DIR
mirror --reverse $mirror_dry_run --parallel=4 --exclude-glob '*.html' "$release_dir" .
mirror --reverse $mirror_dry_run --parallel=4 "$release_dir" .
bye
LFTP

if [[ "$mode" == "--dry-run" ]]; then
  echo "Dry-run zakończony. Nie wysłano plików i nie uruchomiono migracji."
  exit 0
fi

migration_url="${DEPLOY_BASE_URL%/}/scripts/remote-migrate.php"
if ! curl --silent --show-error --fail --max-time 120 \
  --request POST \
  --header "X-Deploy-Token: $DEPLOY_MIGRATION_TOKEN" \
  "$migration_url"; then
  echo "Migracja zdalna nie powiodła się. Runner pozostaje chroniony tokenem; usuń go po diagnostyce." >&2
  exit 1
fi

lftp 2>&1 <<LFTP | sed -E 's#ftp://[^/@]*@#ftp://***@#g'
set cmd:fail-exit yes
set ftp:ssl-allow yes
set ssl:verify-certificate yes
open -u "$DEPLOY_FTP_USER","$DEPLOY_FTP_PASSWORD" "ftp://$DEPLOY_FTP_HOST"
cd $DEPLOY_REMOTE_DIR
rm scripts/remote-migrate.php
bye
LFTP

curl --silent --show-error --fail --max-time 20 "${DEPLOY_BASE_URL%/}/api/health"
echo
echo "Wdrożenie zakończone: ${DEPLOY_BASE_URL%/}"
