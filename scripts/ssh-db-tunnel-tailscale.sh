#!/usr/bin/env bash
# SSH tunnel via Tailscale -> Ubuntu Docker Postgres
# Usage:
#   ./scripts/ssh-db-tunnel-tailscale.sh
#   ./scripts/ssh-db-tunnel-tailscale.sh 100.x.x.x
# Keep this terminal open while developing.

set -euo pipefail

TAILSCALE_IP="${1:-100.x.x.x}"
USER="${SSH_USER:-jeon}"

echo "=== Horizon DB tunnel (Tailscale) ==="
echo "User: ${USER}"
echo "Ubuntu: ${TAILSCALE_IP}"
echo "Forward: localhost:55432 -> ${TAILSCALE_IP} localhost:55432"
echo ""
echo ".env.dev: jdbc:postgresql://localhost:55432/horizon"
echo "Keep this window open."
echo ""

exec ssh -L 55432:localhost:55432 "${USER}@${TAILSCALE_IP}"
