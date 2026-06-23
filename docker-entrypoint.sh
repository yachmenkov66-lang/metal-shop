#!/bin/sh
set -e

echo "[entrypoint] Применяю миграции БД (prisma migrate deploy)…"
npx prisma migrate deploy

echo "[entrypoint] Запуск: $*"
exec "$@"
