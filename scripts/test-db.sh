#!/usr/bin/env bash
# Lefuttatja a migrációkat és a jogosultsági teszteket egy üres Postgres adatbázison.
# Használat: DATABASE_URL=postgres://postgres@localhost:5432/postgres scripts/test-db.sh
set -euo pipefail
cd "$(dirname "$0")/.."
: "${DATABASE_URL:?Add meg a DATABASE_URL-t (üres teszt adatbázis)}"
DB_NAME="keyfly_test_$$"
ADMIN_URL="$DATABASE_URL"
psql "$ADMIN_URL" -qc "create database $DB_NAME" >/dev/null
trap 'psql "$ADMIN_URL" -qc "drop database if exists $DB_NAME" >/dev/null' EXIT
TEST_URL="${DATABASE_URL%/*}/$DB_NAME"
# A szerepkörök klaszter-szintűek; ha már léteznek, a stub hibáit átugorjuk.
psql "$TEST_URL" -q -v ON_ERROR_STOP=0 -f supabase/tests/supabase_stub.sql 2>&1 | grep -v 'already exists' || true
for f in supabase/migrations/*.sql; do
  echo "→ $f"
  psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f "$f"
done
psql "$TEST_URL" -q -o /dev/null -v ON_ERROR_STOP=1 -f supabase/tests/rls.test.sql
