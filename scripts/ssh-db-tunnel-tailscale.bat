@echo off
chcp 65001 >nul
REM SSH tunnel via Tailscale -> Ubuntu Docker Postgres
REM Ubuntu: tailscale ip -4  (update TAILSCALE_IP below)
REM Usage: ssh-db-tunnel-tailscale.bat [100.x.x.x]
REM Keep this window open while developing.

set TAILSCALE_IP=100.x.x.x
if not "%~1"=="" set TAILSCALE_IP=%~1
if not defined SSH_USER set SSH_USER=jeon

echo === Horizon DB tunnel (Tailscale) ===
echo User: %SSH_USER%
echo Ubuntu: %TAILSCALE_IP%
echo Forward: localhost:55432 -^> %TAILSCALE_IP% localhost:55432
echo.
echo .env.dev: jdbc:postgresql://localhost:55432/horizon
echo.

ssh -L 55432:localhost:55432 %SSH_USER%@%TAILSCALE_IP%
