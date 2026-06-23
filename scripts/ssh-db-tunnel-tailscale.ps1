# SSH tunnel via Tailscale -> home PC Docker Postgres
# Usage: .\scripts\ssh-db-tunnel-tailscale.ps1
#        .\scripts\ssh-db-tunnel-tailscale.ps1 -TailscaleIp 100.117.145.80

param(
    [string]$TailscaleIp = '100.117.145.80',
    [string]$User = '전일훈'
)

Write-Host "=== Horizon DB tunnel (Tailscale) ===" -ForegroundColor Cyan
Write-Host "Home PC: ${User}@${TailscaleIp}"
Write-Host "Forward: localhost:55432 -> remote localhost:55432"
Write-Host "Keep this window open." -ForegroundColor Yellow
Write-Host ""

ssh -L 55432:localhost:55432 "${User}@${TailscaleIp}"
