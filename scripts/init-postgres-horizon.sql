-- Horizon local dev database (run as postgres superuser)
-- Usage: psql -U postgres -h localhost -p 5432 -f init-postgres-horizon.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'horizon') THEN
    CREATE ROLE horizon LOGIN PASSWORD 'horizon';
  ELSE
    ALTER ROLE horizon WITH LOGIN PASSWORD 'horizon';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'horizon') THEN
    CREATE DATABASE horizon OWNER horizon;
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE horizon TO horizon;
