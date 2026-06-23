# SSH tunnel to remote Horizon Postgres (Docker on another PC)
# Usage:
#   .\scripts\ssh-db-tunnel.ps1                    # LAN 192.168.219.107
#   .\scripts\ssh-db-tunnel.ps1 -Public             # 공인 IP 49.165.27.19
#   .\scripts\ssh-db-tunnel.ps1 -SshHost 49.165.27.19 -Port 2222

param(
    [string]$SshHost = '192.168.219.107',
    [string]$User = '전일훈',
    [switch]$Public,
    [int]$Port = 22,
    [int]$LocalPort = 55432,
    [int]$RemotePort = 55432
)

if ($Public) {
    $SshHost = '49.165.27.19'
}

$ErrorActionPreference = 'Stop'

Write-Host "=== Horizon DB SSH tunnel ===" -ForegroundColor Cyan
Write-Host "Remote: ${User}@${SshHost}:${Port}"
Write-Host "Forward: localhost:${LocalPort} -> remote localhost:${RemotePort}"
Write-Host ""
Write-Host "Keep this window open while developing." -ForegroundColor Yellow
Write-Host ".env.dev: jdbc:postgresql://localhost:${LocalPort}/horizon" -ForegroundColor Yellow
Write-Host ""

ssh -p $Port -L "${LocalPort}:localhost:${RemotePort}" "${User}@${SshHost}"
