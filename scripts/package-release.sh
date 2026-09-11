#!/usr/bin/env bash

set -euo pipefail

project_root="$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)"
release_dir="$project_root/.deploy/release"
remote_env="$project_root/.env.remote"

if [[ ! -f "$remote_env" ]]; then
  echo "Brak $remote_env. Utwórz go na podstawie .env.production.example." >&2
  exit 1
fi

cd "$project_root"

STATIC_EXPORT=1 \
NEXT_PUBLIC_API_BASE_URL=/api \
API_BASE_URL=/api \
npm --prefix apps/web run build

if [[ ! -f apps/web/dist/client/index.html ]]; then
  echo "Build nie utworzył apps/web/dist/client/index.html." >&2
  exit 1
fi

rm -rf "$release_dir"
mkdir -p \
  "$release_dir/apps/api" \
  "$release_dir/database" \
  "$release_dir/public/media" \
  "$release_dir/scripts" \
  "$release_dir/storage/media" \
  "$release_dir/storage/backups"

rsync -a \
  --exclude='.assetsignore' \
  --exclude='.vite/' \
  --exclude='_headers' \
  apps/web/dist/client/ "$release_dir/"
rsync -a apps/api/public apps/api/src "$release_dir/apps/api/"
rsync -a database/schema.sql database/seed.sql database/migrations "$release_dir/database/"
rsync -a public/media/ "$release_dir/public/media/"
install -m 0644 scripts/migrate.php scripts/remote-migrate.php "$release_dir/scripts/"
install -m 0600 "$remote_env" "$release_dir/.env"
install -m 0644 deploy/public-html.htaccess "$release_dir/.htaccess"

tar -C "$release_dir" -czf "$project_root/.deploy/rexor-release.tar.gz" .
echo "Pakiet gotowy: $project_root/.deploy/rexor-release.tar.gz"
