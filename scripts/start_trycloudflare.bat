@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0.."

echo [1/3] Docker Compose 재시작 ...
docker compose up -d --build --force-recreate
if errorlevel 1 exit /b 1

echo [2/3] 앱 기동 대기 ...
timeout /t 20 /nobreak >nul

echo [3/3] Cloudflare Quick Tunnel (9080) ...
echo.
echo   사용자: https://xxxx.trycloudflare.com/
echo   관리자: https://xxxx.trycloudflare.com/admin/
echo   (아래에 실제 URL이 출력됩니다)
echo.
cloudflared tunnel --url http://localhost:9080
