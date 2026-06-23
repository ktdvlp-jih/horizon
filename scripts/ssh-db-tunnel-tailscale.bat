@echo off
chcp 65001 >nul
REM SSH tunnel via Tailscale -> home PC Docker Postgres
REM Home PC Tailscale IP: 100.117.145.80 (update if it changes)
REM Keep this window open while developing.

set TAILSCALE_IP=100.117.145.80
if not "%~1"=="" set TAILSCALE_IP=%~1
if "%USER%"=="" set USER=전일훈

echo === Horizon DB tunnel (Tailscale) ===
echo User: %USER%
echo Home PC: %TAILSCALE_IP%
echo Forward: localhost:55432 -^> %TAILSCALE_IP% localhost:55432
echo.
echo .env.dev: jdbc:postgresql://localhost:55432/horizon
echo.

ssh -L 55432:localhost:55432 %USER%@%TAILSCALE_IP%
