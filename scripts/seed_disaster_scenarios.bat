@echo off
setlocal
chcp 65001 >nul
set CONTAINER=horizon-db-1
docker ps --filter "name=%CONTAINER%" --format "{{.Names}}" | findstr /x "%CONTAINER%" >nul
if errorlevel 1 (
  echo [ERROR] Docker container %CONTAINER% is not running.
  exit /b 1
)
echo Seeding disaster_scenario (UTF-8) ...
docker cp "%~dp0seed_disaster_scenarios.sql" %CONTAINER%:/tmp/seed_disaster_scenarios.sql
docker exec %CONTAINER% psql -U horizon -d horizon -v ON_ERROR_STOP=1 -f /tmp/seed_disaster_scenarios.sql
if errorlevel 1 exit /b 1
echo Done.
