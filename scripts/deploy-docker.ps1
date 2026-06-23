# 집 PC Docker 재배포 (git pull + compose rebuild)
# Usage: .\scripts\deploy-docker.ps1

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "=== Horizon Docker deploy ===" -ForegroundColor Cyan

Write-Host "[1/3] git pull origin master" -ForegroundColor Yellow
git pull origin master
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[2/3] docker compose build" -ForegroundColor Yellow
docker compose build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[3/3] docker compose up -d" -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nDone." -ForegroundColor Green
docker compose ps
Write-Host "App: http://localhost:9080/api/health"
