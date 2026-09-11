#!/usr/bin/env bash

set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
api_pid=""

cleanup() {
  if [[ -n "$api_pid" ]] && kill -0 "$api_pid" 2>/dev/null; then
    kill "$api_pid" 2>/dev/null || true
    wait "$api_pid" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM
cd "$project_root"

php scripts/startup.php

if curl --silent --fail --max-time 2 http://127.0.0.1:8081/api/health >/dev/null; then
  echo "API PHP już działa pod http://127.0.0.1:8081."
else
  PHP_CLI_SERVER_WORKERS="${PHP_CLI_SERVER_WORKERS:-4}" \
    php -c docker/php/php.ini -S 127.0.0.1:8081 \
    -t apps/api/public apps/api/public/index.php &
  api_pid="$!"

  for _ in {1..20}; do
    if curl --silent --fail --max-time 1 http://127.0.0.1:8081/api/health >/dev/null; then
      break
    fi
    sleep 0.25
  done

  if ! curl --silent --fail --max-time 2 http://127.0.0.1:8081/api/health >/dev/null; then
    echo "Nie udało się uruchomić API PHP na porcie 8081." >&2
    exit 1
  fi
fi

npm --prefix apps/web run dev:web
