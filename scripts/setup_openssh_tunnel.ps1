# Horizon - OpenSSH Server setup for Postgres SSH tunnel (port 55432)
# Run PowerShell as Administrator:
#   Set-ExecutionPolicy -Scope Process Bypass -Force
#   cd e:\workspace\horizon
#   .\scripts\setup_openssh_tunnel.ps1

$ErrorActionPreference = 'Stop'

Write-Host '=== 1. OpenSSH Server install ===' -ForegroundColor Cyan
$cap = Get-WindowsCapability -Online | Where-Object { $_.Name -like 'OpenSSH.Server*' }
if (-not $cap) {
    throw 'OpenSSH.Server capability not found on this Windows edition.'
}
if ($cap.State -ne 'Installed') {
    Add-WindowsCapability -Online -Name $cap.Name
} else {
    Write-Host 'OpenSSH Server already installed.'
}

Write-Host ''
Write-Host '=== 2. sshd service (auto start) ===' -ForegroundColor Cyan
Set-Service -Name sshd -StartupType Automatic
Start-Service sshd

Write-Host ''
Write-Host '=== 3. Firewall TCP 22 ===' -ForegroundColor Cyan
$ruleName = 'OpenSSH-Server-In-TCP'
if (-not (Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -Name $ruleName -DisplayName 'OpenSSH Server (sshd)' `
        -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 | Out-Null
} else {
    Enable-NetFirewallRule -Name $ruleName | Out-Null
}

Write-Host ''
Write-Host '=== 4. This PC ===' -ForegroundColor Cyan
$lan = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
        $_.IPAddress -notlike '127.*' -and
        $_.IPAddress -notlike '169.254.*' -and
        $_.PrefixOrigin -ne 'WellKnown'
    } | Select-Object -First 1).IPAddress
$user = $env:USERNAME
Write-Host "  Windows user : $user"
Write-Host "  LAN IP       : $lan  (router port-forward target)"
Write-Host '  Postgres     : localhost:55432  (db=horizon user=horizon)'

Write-Host ''
Write-Host '=== 5. Router (manual) ===' -ForegroundColor Yellow
Write-Host '  1. Open router admin (often http://192.168.0.1 or http://192.168.219.1)'
Write-Host "  2. Port forward: external TCP 22 -> ${lan}:22"
Write-Host '  3. Check public IP: https://ifconfig.me (use DDNS if IP changes)'

Write-Host ''
Write-Host '=== 6. Remote PC - SSH tunnel then DB ===' -ForegroundColor Green
Write-Host "  ssh -L 55432:localhost:55432 ${user}@YOUR_PUBLIC_IP"
Write-Host '  Then connect DBeaver to localhost:55432 (db=horizon, user=horizon)'
Write-Host '  Password: POSTGRES_PASSWORD in .env'

Write-Host ''
Write-Host '=== 7. Security ===' -ForegroundColor Yellow
Write-Host '  - Change POSTGRES_PASSWORD in .env (not the default)'
Write-Host '  - Use a strong Windows login password'
Write-Host '  - Prefer SSH key login; remove port-forward when done'

Write-Host ''
Write-Host 'Done. sshd status:' -ForegroundColor Green
Get-Service sshd | Format-Table Name, Status, StartType -AutoSize
