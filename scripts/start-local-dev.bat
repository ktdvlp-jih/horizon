@echo off
REM Start Horizon local stack (no Docker). Run init-postgres-horizon.bat first.
cd /d "%~dp0.."

echo Starting AI on :8000 ...
start "Horizon AI" cmd /k "cd /d %CD%\ai && python -m uvicorn app.main:app --reload --port 8000"

timeout /t 2 /nobreak >nul

echo Starting Spring Boot on :8080 ...
start "Horizon API" cmd /k "cd /d %CD% && gradlew.bat bootRun"

timeout /t 2 /nobreak >nul

echo Starting Frontend on :5173 ...
start "Horizon Frontend" cmd /k "cd /d %CD%\frontend && npm run dev"

echo.
echo Open http://localhost:5173
echo Admin: cd frontend-admin && npm run dev  -> http://localhost:5174
