# 집 PC Docker 재배포 (git pull + compose rebuild)
# Usage: .\scripts\deploy-docker.ps1
# GitHub Actions: deploy-docker-trigger.ps1 -> scheduled task -> this script

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$StatusFile = Join-Path $Root '.deploy-status.json'
$LogFile = Join-Path $Root '.deploy-last.log'

function Write-DeployStatus {
    param([string]$Status, [int]$ExitCode = 0, [string]$Message = '')
    @{
        status    = $Status
        exitCode  = $ExitCode
        message   = $Message
        updatedAt = (Get-Date).ToUniversalTime().ToString('o')
    } | ConvertTo-Json -Compress | Set-Content -Path $StatusFile -Encoding UTF8
}

function Wait-AppHealth {
    param(
        [string]$Url = 'http://localhost:9080/api/health',
        [int]$TimeoutSec = 120,
        [int]$IntervalSec = 5
    )
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    $attempt = 0
    while ((Get-Date) -lt $deadline) {
        $attempt++
        try {
            $r = Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec 15
            if ($r.StatusCode -eq 200) {
                Write-Host "[ok] Health check passed (attempt $attempt)" -ForegroundColor Green
                return
            }
        } catch {
            Write-Host "[wait] App starting... attempt $attempt ($($_.Exception.Message))" -ForegroundColor Yellow
        }
        Start-Sleep -Seconds $IntervalSec
    }
    throw "Health check failed after ${TimeoutSec}s"
}

Write-DeployStatus -Status 'running' -Message 'deploy started'
Start-Transcript -Path $LogFile -Force | Out-Null

try {
    Write-Host "=== Horizon Docker deploy ===" -ForegroundColor Cyan

    Write-Host "[1/3] git pull origin master" -ForegroundColor Yellow
    git pull origin master
    if ($LASTEXITCODE -ne 0) { throw "git pull failed with exit $LASTEXITCODE" }

    Write-Host "[2/3] docker compose build" -ForegroundColor Yellow
    docker compose build
    if ($LASTEXITCODE -ne 0) { throw "docker compose build failed with exit $LASTEXITCODE" }

    Write-Host "[3/3] docker compose up -d" -ForegroundColor Yellow
    docker compose up -d
    if ($LASTEXITCODE -ne 0) { throw "docker compose up failed with exit $LASTEXITCODE" }

    Write-Host "`nDone." -ForegroundColor Green
    docker compose ps
    Write-Host "App: http://localhost:9080/api/health"
    Write-Host "[4/4] Waiting for app health..." -ForegroundColor Yellow
    Wait-AppHealth

    Write-DeployStatus -Status 'success' -Message 'deploy completed'
    exit 0
}
catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-DeployStatus -Status 'failed' -ExitCode 1 -Message $_.Exception.Message
    exit 1
}
finally {
    Stop-Transcript | Out-Null
}
