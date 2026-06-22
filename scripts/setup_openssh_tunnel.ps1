# Horizon — 집 PC에서 Postgres(55432) 외부 SSH 터널용 OpenSSH 서버 설정
# PowerShell을 "관리자 권한"으로 실행한 뒤:
#   Set-ExecutionPolicy -Scope Process Bypass -Force
#   .\scripts\setup_openssh_tunnel.ps1

$ErrorActionPreference = 'Stop'

Write-Host "=== 1. OpenSSH Server 설치 ===" -ForegroundColor Cyan
$cap = Get-WindowsCapability -Online | Where-Object { $_.Name -like 'OpenSSH.Server*' }
if ($cap.State -ne 'Installed') {
    Add-WindowsCapability -Online -Name $cap.Name
} else {
    Write-Host "OpenSSH Server 이미 설치됨"
}

Write-Host "`n=== 2. sshd 서비스 시작·자동 시작 ===" -ForegroundColor Cyan
Set-Service -Name sshd -StartupType Automatic
Start-Service sshd

Write-Host "`n=== 3. 방화벽 (TCP 22) ===" -ForegroundColor Cyan
$ruleName = 'OpenSSH-Server-In-TCP'
if (-not (Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -Name $ruleName -DisplayName 'OpenSSH Server (sshd)' `
        -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
} else {
    Enable-NetFirewallRule -Name $ruleName
}

Write-Host "`n=== 4. 현재 PC 정보 ===" -ForegroundColor Cyan
$lan = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.PrefixOrigin -ne 'WellKnown'
} | Select-Object -First 1).IPAddress
$user = $env:USERNAME
Write-Host "  Windows 사용자: $user"
Write-Host "  LAN IP (공유기 포트포워딩 대상): $lan"
Write-Host "  Postgres (Docker): localhost:55432  (db=horizon user=horizon)"

Write-Host "`n=== 5. 공유기에서 할 일 (수동) ===" -ForegroundColor Yellow
Write-Host @"
  1. 공유기 관리 페이지 접속 (보통 http://192.168.0.1 또는 http://192.168.219.1)
  2. 포트포워딩 / NAT: 외부 TCP 22 -> $lan`:22
  3. 집 공인 IP 확인: https://ifconfig.me 또는 공유기 WAN IP
     (유동 IP면 DDNS 설정 권장)
"@

Write-Host "`n=== 6. 외부 PC에서 DB 접속 (SSH 터널) ===" -ForegroundColor Green
Write-Host @"
  # 터널 열기 (세션 유지)
  ssh -L 55432:localhost:55432 ${user}@<집_공인IP>

  # DBeaver / psql 은 로컬처럼 접속
  Host: localhost
  Port: 55432
  Database: horizon
  User: horizon
  Password: (.env 의 POSTGRES_PASSWORD)

  # 백그라운드 터널 (Linux/macOS)
  ssh -fN -L 55432:localhost:55432 ${user}@<집_공인IP>
"@

Write-Host "`n=== 7. 보안 권장 ===" -ForegroundColor Yellow
Write-Host @"
  - .env 의 POSTGRES_PASSWORD 를 horizon 이 아닌 강한 값으로 변경
  - Windows 로그인 비밀번호 강하게 설정
  - 가능하면 SSH 키 로그인 사용 (비밀번호 로그인 끄기)
  - 데모 끝나면 공유기 포트포워딩 22 제거
"@

Write-Host "`n완료. sshd 상태:" -ForegroundColor Green
Get-Service sshd | Format-Table Name, Status, StartType
