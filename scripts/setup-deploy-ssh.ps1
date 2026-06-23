# GitHub Actions → 집 PC SSH 배포 키 생성 (집 PC에서 1회 실행)
# Usage (PowerShell):
#   Set-ExecutionPolicy -Scope Process Bypass -Force
#   .\scripts\setup-deploy-ssh.ps1

$ErrorActionPreference = 'Stop'

$sshDir = Join-Path $env:USERPROFILE '.ssh'
$keyPath = Join-Path $sshDir 'horizon_deploy'
$pubPath = "$keyPath.pub"
$authKeys = Join-Path $sshDir 'authorized_keys'

if (-not (Test-Path $sshDir)) {
    New-Item -ItemType Directory -Path $sshDir | Out-Null
}

if (-not (Test-Path $keyPath)) {
    Write-Host "Generating deploy key: $keyPath" -ForegroundColor Cyan
    ssh-keygen -t ed25519 -f $keyPath -N '""' -C 'horizon-github-actions-deploy'
} else {
    Write-Host "Key already exists: $keyPath" -ForegroundColor Yellow
}

$pub = Get-Content $pubPath -Raw
if (Test-Path $authKeys) {
    $existing = Get-Content $authKeys -Raw
    if ($existing -notmatch [regex]::Escape($pub.Trim())) {
        Add-Content -Path $authKeys -Value $pub.Trim()
        Write-Host "[ok] Public key appended to authorized_keys" -ForegroundColor Green
    } else {
        Write-Host "[skip] Public key already in authorized_keys" -ForegroundColor Yellow
    }
} else {
    Set-Content -Path $authKeys -Value $pub.Trim() -Encoding utf8
    Write-Host "[ok] Created authorized_keys" -ForegroundColor Green
}

Write-Host @"

=== Next: GitHub Repository Secrets ===

Settings → Secrets and variables → Actions → New repository secret

| Secret name         | Value |
|---------------------|-------|
| TAILSCALE_AUTHKEY   | Tailscale Admin → Keys → Generate auth key (Reusable + Ephemeral) |
| DEPLOY_HOST         | 100.117.145.80  (집 PC: tailscale ip -4) |
| DEPLOY_USER         | 전일훈 |
| DEPLOY_SSH_KEY      | Paste ENTIRE private key below |

--- PRIVATE KEY (DEPLOY_SSH_KEY) --- copy until END ---
"@ -ForegroundColor Cyan

Get-Content $keyPath

Write-Host @"
--- END PRIVATE KEY ---

Test from another Tailscale device:
  ssh -i $keyPath $($env:USERNAME)@100.117.145.80

Then push to master → Actions tab → Deploy Docker workflow
"@ -ForegroundColor Green
