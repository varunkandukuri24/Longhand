#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

git pull
docker compose -f docker-compose.prod.yml up -d --build
docker image prune -f

echo "Deploy complete"
