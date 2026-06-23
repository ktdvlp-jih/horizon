# Horizon local dev setup (no Docker)
# Requires: JDK 21, Node.js, Python 3.12+, PostgreSQL 17
# Usage (PowerShell):
#   Set-ExecutionPolicy -Scope Process Bypass -Force
#   .\scripts\setup-local-dev.ps1
#   .\scripts\setup-local-dev.ps1 -PostgresPassword "your-postgres-password"

param(
    [string]$PostgresPassword = $env:POSTGRES_ADMIN_PASSWORD
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Refresh-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
                [System.Environment]::GetEnvironmentVariable('Path', 'User')
}

Refresh-Path

Write-Host "=== Horizon local dev setup (no Docker) ===" -ForegroundColor Cyan

# 1) Env files
if (-not (Test-Path ".env.dev")) {
    Copy-Item ".env.dev.example" ".env.dev"
    Write-Host "[ok] Created .env.dev from template" -ForegroundColor Green
} else {
    Write-Host "[skip] .env.dev already exists" -ForegroundColor Yellow
}

if (-not (Test-Path "frontend\.env")) {
    Copy-Item "frontend\.env.example" "frontend\.env"
    Write-Host "[ok] Created frontend/.env" -ForegroundColor Green
}

if (-not (Test-Path "ai\.env")) {
    Copy-Item "ai\.env.example" "ai\.env"
    Write-Host "[ok] Created ai/.env" -ForegroundColor Green
}

# 2) PostgreSQL horizon DB
$psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
if (-not (Test-Path $psql)) {
    $psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($psqlCmd) { $psql = $psqlCmd.Source }
}

if ($psql -and (Test-Path $psql)) {
    $env:PGPASSWORD = "horizon"
    & $psql -U horizon -h localhost -p 5432 -d horizon -c "SELECT 1;" 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[ok] PostgreSQL horizon DB reachable (5432)" -ForegroundColor Green
    } else {
        if (-not $PostgresPassword) {
            $secure = Read-Host "PostgreSQL 'postgres' user password (to create horizon DB)" -AsSecureString
            $PostgresPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
        }
        $env:PGPASSWORD = $PostgresPassword
        & $psql -U postgres -h localhost -p 5432 -d postgres -f "scripts\init-postgres-horizon.sql"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[!!] DB init failed. Run manually:" -ForegroundColor Red
            Write-Host "     psql -U postgres -h localhost -p 5432 -f scripts\init-postgres-horizon.sql"
            exit 1
        }
        Write-Host "[ok] Created horizon user + database" -ForegroundColor Green
    }
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
} else {
    Write-Host "[!!] psql not found. Install PostgreSQL 17 or add to PATH." -ForegroundColor Red
}

# 3) Node dependencies
Write-Host "`n=== npm install (frontend) ===" -ForegroundColor Cyan
Push-Location frontend
npm install
Pop-Location

if (Test-Path "frontend-admin\package.json") {
    Write-Host "`n=== npm install (frontend-admin) ===" -ForegroundColor Cyan
    Push-Location frontend-admin
    npm install
    Pop-Location
}

# 4) Python AI dependencies
Write-Host "`n=== Python AI dependencies ===" -ForegroundColor Cyan
$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) { $py = Get-Command py -ErrorAction SilentlyContinue }
if ($py) {
    Push-Location ai
    & $py.Name -m pip install --upgrade pip
    & $py.Name -m pip install -r requirements.txt
    Pop-Location
    Write-Host "[ok] AI packages installed" -ForegroundColor Green
} else {
    Write-Host "[!!] Python not found. Install Python 3.12+." -ForegroundColor Red
}

# 5) Gradle compile check
Write-Host "`n=== Gradle compile ===" -ForegroundColor Cyan
.\gradlew.bat compileJava --no-daemon

Write-Host "`n=== Done ===" -ForegroundColor Cyan
Write-Host @"

Start development (3 terminals):

  Terminal 1 — AI:
    cd ai
    python -m uvicorn app.main:app --reload --port 8000

  Terminal 2 — Backend:
    .\gradlew.bat bootRun

  Terminal 3 — Frontend:
    cd frontend
    npm run dev

URLs:
  App:   http://localhost:5173
  API:   http://localhost:8080/api/health
  Admin: cd frontend-admin && npm run dev  -> http://localhost:5174

Docker is NOT required locally. Push to master for remote Docker build.
"@
