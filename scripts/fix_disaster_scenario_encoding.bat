@echo off
setlocal
chcp 65001 >nul
set CONTAINER=horizon-db-1
docker ps --filter "name=%CONTAINER%" --format "{{.Names}}" | findstr /x "%CONTAINER%" >nul
if errorlevel 1 (
  echo [ERROR] Docker container %CONTAINER% is not running.
  exit /b 1
)
echo Fixing disaster_scenario Korean text (UTF-8) ...
docker cp "%~dp0fix_disaster_scenario_encoding.sql" %CONTAINER%:/tmp/fix_disaster_scenario_encoding.sql
docker exec %CONTAINER% psql -U horizon -d horizon -v ON_ERROR_STOP=1 -f /tmp/fix_disaster_scenario_encoding.sql
if errorlevel 1 exit /b 1
echo Done. Refresh the disaster page in your browser.
