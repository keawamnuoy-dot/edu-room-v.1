#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ] && printf '%s' "$DATABASE_URL" | grep -Eq '^postgres(ql)?://'; then
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /var/www/html/api/schema.postgresql.sql >/dev/null
fi

exec "$@"
