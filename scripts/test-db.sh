#!/usr/bin/env bash
# Applies all migrations to a fresh database and runs the access-control tests.
# Usage: DATABASE_URL=postgres://postgres@localhost:5432/postgres scripts/test-db.sh
set -euo pipefail
cd "$(dirname "$0")/.."
: "${DATABASE_URL:?Set DATABASE_URL to an empty Postgres server}"
DB_NAME="keyfly_test_$$"
psql "$DATABASE_URL" -qc "create database $DB_NAME" >/dev/null
trap 'psql "$DATABASE_URL" -qc "drop database if exists $DB_NAME" >/dev/null' EXIT
TEST_URL="${DATABASE_URL%/*}/$DB_NAME"
# Roles are cluster-wide; ignore "already exists" from the stub.
psql "$TEST_URL" -q -v ON_ERROR_STOP=0 -f supabase/tests/supabase_stub.sql 2>&1 | grep -v 'already exists' || true
for f in supabase/migrations/*.sql; do
  echo "→ $f"
  psql "$TEST_URL" -q -v ON_ERROR_STOP=1 --single-transaction -f "$f"
done
psql "$TEST_URL" -q -o /dev/null -v ON_ERROR_STOP=1 -f supabase/tests/rls.test.sql
