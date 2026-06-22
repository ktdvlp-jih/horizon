@echo off
setlocal
chcp 65001 >nul
set CONTAINER=horizon-db-1
docker ps --filter "name=%CONTAINER%" --format "{{.Names}}" | findstr /x "%CONTAINER%" >nul
if errorlevel 1 (
  echo [ERROR] Docker container %CONTAINER% is not running.
  exit /b 1
)
echo Migrating region_config disaster columns ...
docker cp "%~dp0migrate_region_config_disaster.sql" %CONTAINER%:/tmp/migrate_region_config_disaster.sql
docker exec %CONTAINER% psql -U horizon -d horizon -v ON_ERROR_STOP=1 -f /tmp/migrate_region_config_disaster.sql
if errorlevel 1 exit /b 1
echo Done. /api/regions should work after refresh.
