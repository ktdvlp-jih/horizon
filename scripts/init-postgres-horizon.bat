@echo off
setlocal
cd /d "%~dp0.."

set PSQL="C:\Program Files\PostgreSQL\17\bin\psql.exe"
if not exist %PSQL% (
  where psql >nul 2>&1 || (
    echo psql not found. Install PostgreSQL 17.
    exit /b 1
  )
  set PSQL=psql
)

echo PostgreSQL 'postgres' superuser password is required once to create horizon DB.
echo.
%PSQL% -U postgres -h localhost -p 5432 -d postgres -f scripts\init-postgres-horizon.sql
if errorlevel 1 (
  echo.
  echo Failed. Check postgres password and that PostgreSQL service is running.
  exit /b 1
)

echo.
echo Done. horizon / horizon @ localhost:5432
echo Test: set PGPASSWORD=horizon && %PSQL% -U horizon -h localhost -p 5432 -d horizon -c "SELECT 1;"
