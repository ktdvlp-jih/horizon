@echo off
chcp 65001 >nul
REM SSH tunnel -> DB server PC (전일훈, Docker Postgres :55432)
REM Keep this window open while developing.
REM
REM Same Wi-Fi:
REM   scripts\ssh-db-tunnel.bat
REM
REM Public IP (PowerShell — use argument, NOT "set HOST=..."):
REM   .\scripts\ssh-db-tunnel.bat 49.165.27.19
REM   .\scripts\ssh-db-tunnel-public.bat
REM
REM PowerShell env var (if you must):
REM   $env:HOST='49.165.27.19'; cmd /c '.\scripts\ssh-db-tunnel.bat'
REM
REM ISP blocks port 22:
REM   scripts\ssh-db-tunnel.bat 49.165.27.19 2222

if not "%~1"=="" set HOST=%~1
if not "%~2"=="" set SSH_PORT=%~2
if "%HOST%"=="" set HOST=192.168.219.107
if "%USER%"=="" set USER=전일훈
if "%SSH_PORT%"=="" set SSH_PORT=22

echo === Horizon DB SSH tunnel ===
echo User: %USER%
echo DB server: %HOST% (SSH %SSH_PORT%)
echo Forward: localhost:55432 -^> %HOST% localhost:55432
echo.
echo .env.dev should use: jdbc:postgresql://localhost:55432/horizon
echo.

ssh -p %SSH_PORT% -L 55432:localhost:55432 %USER%@%HOST%
