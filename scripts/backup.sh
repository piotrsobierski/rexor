#!/usr/bin/env bash

set -euo pipefail

project_root="$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)"
env_file="${ENV_FILE:-$project_root/.env}"
mode="${1:---dry-run}"

if [ "$mode" != "--dry-run" ] && [ "$mode" != "--apply" ]; then
  echo "Użycie: ENV_FILE=.env scripts/backup.sh [--dry-run|--apply]" >&2
  exit 2
fi

read_env() {
  key="$1"
  fallback="$2"
  current="$(printenv "$key" 2>/dev/null || true)"
  if [ -n "$current" ]; then
    printf '%s' "$current"
    return
  fi
  if [ -f "$env_file" ]; then
    value="$(awk -F= -v wanted="$key" '$1 == wanted {sub(/^[^=]*=/, ""); print; exit}' "$env_file")"
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
    if [ -n "$value" ]; then
      printf '%s' "$value"
      return
    fi
  fi
  printf '%s' "$fallback"
}

db_host="$(read_env DB_HOST 127.0.0.1)"
db_port="$(read_env DB_PORT 3306)"
db_name="$(read_env DB_NAME '')"
db_user="$(read_env DB_USER '')"
db_password="$(read_env DB_PASSWORD '')"
media_dir="$(read_env MEDIA_DIR storage/media)"
backup_dir="$(read_env BACKUP_DIR storage/backups)"

case "$media_dir" in /*) ;; *) media_dir="$project_root/$media_dir" ;; esac
case "$backup_dir" in /*) ;; *) backup_dir="$project_root/$backup_dir" ;; esac

if [ -z "$db_name" ] || [ -z "$db_user" ]; then
  echo "BŁĄD: ustaw DB_NAME i DB_USER w $env_file lub środowisku." >&2
  exit 1
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
destination="$backup_dir/$timestamp"

echo "Backup Rexor: baza '$db_name' na $db_host:$db_port oraz media '$media_dir'."
echo "Katalog docelowy: $destination"

if [ "$mode" = "--dry-run" ]; then
  echo "Tryb podglądu: nic nie zapisano. Użyj --apply, aby wykonać backup."
  exit 0
fi

command -v mysqldump >/dev/null 2>&1 || { echo "BŁĄD: brak mysqldump." >&2; exit 1; }
command -v gzip >/dev/null 2>&1 || { echo "BŁĄD: brak gzip." >&2; exit 1; }
command -v tar >/dev/null 2>&1 || { echo "BŁĄD: brak tar." >&2; exit 1; }
[ -d "$media_dir" ] || { echo "BŁĄD: brak katalogu mediów: $media_dir" >&2; exit 1; }

mkdir -p "$destination"
credentials="$(mktemp)"
trap 'rm -f "$credentials"' EXIT HUP INT TERM
chmod 600 "$credentials"
{
  echo '[client]'
  printf 'host=%s\n' "$db_host"
  printf 'port=%s\n' "$db_port"
  printf 'user=%s\n' "$db_user"
  printf 'password=%s\n' "$db_password"
} > "$credentials"

mysqldump \
  --defaults-extra-file="$credentials" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --default-character-set=utf8mb4 \
  "$db_name" | gzip -9 > "$destination/database.sql.gz"

tar -C "$(dirname "$media_dir")" -czf "$destination/media.tar.gz" "$(basename "$media_dir")"

if command -v shasum >/dev/null 2>&1; then
  (cd "$destination" && shasum -a 256 database.sql.gz media.tar.gz > SHA256SUMS)
elif command -v sha256sum >/dev/null 2>&1; then
  (cd "$destination" && sha256sum database.sql.gz media.tar.gz > SHA256SUMS)
else
  echo "BŁĄD: brak shasum lub sha256sum; backup pozostawiono bez manifestu." >&2
  exit 1
fi

echo "Backup wykonany: $destination"
echo "Retencja nie jest usuwana automatycznie; podłączenie CRON i polityki kasowania nastąpi przy wdrożeniu."
