#!/usr/bin/env bash

set -euo pipefail

schema_checksum="$(sha256sum /docker-entrypoint-initdb.d/001-schema.sql | awk '{print $1}')"

docker_process_sql --database="$MYSQL_DATABASE" <<SQL
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(190) PRIMARY KEY,
    checksum CHAR(64) NOT NULL,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (version, checksum)
VALUES ('000_base_schema', '${schema_checksum}');
SQL
