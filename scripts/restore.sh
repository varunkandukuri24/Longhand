#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

if [ "${1:-}" = "" ]; then
  echo "Usage: scripts/restore.sh <backup.sql.gz>" >&2
  exit 1
fi

backup="$1"
if [ ! -f "$backup" ]; then
  echo "File not found: $backup" >&2
  exit 1
fi

printf "Restore %s into the production database? This replaces all data. [y/N] " "$backup"
read -r answer
case "$answer" in
  y|Y|yes|YES) ;;
  *)
    echo "Aborted"
    exit 1
    ;;
esac

# shellcheck disable=SC1091
if [ -f .env.production ]; then
  set -a
  # Prefer the compose env file when present.
  . ./.env.production
  set +a
elif [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

if [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "POSTGRES_PASSWORD is not set" >&2
  exit 1
fi

gunzip -c "$backup" | docker compose -f docker-compose.prod.yml exec -T db \
  env PGPASSWORD="$POSTGRES_PASSWORD" \
  psql -U longhand -d longhand

echo "Restore complete"
