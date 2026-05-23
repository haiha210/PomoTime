#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATION_FILE="${PROJECT_ROOT}/src-tauri/migrations/0001_init_postgres.sql"

if [[ ! -f "$MIGRATION_FILE" ]]; then
  echo "Migration file not found: $MIGRATION_FILE"
  exit 1
fi

if ! docker compose ps postgres >/dev/null 2>&1; then
  echo "PostgreSQL container is not available. Run: npm run db:up"
  exit 1
fi

cat "$MIGRATION_FILE" | docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U pomotime -d pomotime

echo "Migration applied successfully"
