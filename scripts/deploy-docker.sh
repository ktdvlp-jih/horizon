#!/usr/bin/env bash
# Ubuntu/Linux Docker 재배포 (git pull + compose rebuild)
# Usage: ./scripts/deploy-docker.sh
# GitHub Actions: SSH → this script directly (no Windows scheduled task)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STATUS_FILE="$ROOT/.deploy-status.json"
LOG_FILE="$ROOT/.deploy-last.log"

write_status() {
  local status="$1"
  local exit_code="${2:-0}"
  local message="${3:-}"
  printf '{"status":"%s","exitCode":%s,"message":"%s","updatedAt":"%s"}\n' \
    "$status" "$exit_code" "$message" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$STATUS_FILE"
}

wait_health() {
  local url="${1:-http://localhost:9080/api/health}"
  local timeout="${2:-120}"
  local interval="${3:-5}"
  local attempt=0
  local deadline=$((SECONDS + timeout))

  while (( SECONDS < deadline )); do
    attempt=$((attempt + 1))
    if curl -sf --max-time 15 "$url" >/dev/null 2>&1; then
      echo "[ok] Health check passed (attempt $attempt)"
      return 0
    fi
    echo "[wait] App starting... attempt $attempt"
    sleep "$interval"
  done
  return 1
}

write_status running 0 "deploy started"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== Horizon Docker deploy (Linux) ==="

echo "[1/3] git pull origin master"
git pull origin master

echo "[2/3] docker compose build"
docker compose build

echo "[3/3] docker compose up -d"
docker compose up -d

echo
docker compose ps
echo "App: http://localhost:9080/api/health"

echo "[4/4] Waiting for app health..."
if wait_health; then
  write_status success 0 "deploy completed"
  exit 0
fi

write_status failed 1 "health check failed"
exit 1
