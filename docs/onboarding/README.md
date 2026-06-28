# Horizon 온보딩

> **처음 시작:** [SETUP.md](SETUP.md) — 집 PC · GitHub · 개발 PC · 배포 파이프라인 **순서대로**  
> **다른 PC에서 이어하기:** [SESSION_HANDOFF.md](SESSION_HANDOFF.md)

---

## 문서 맵

| 문서 | 대상 | 내용 |
|------|------|------|
| **[SETUP.md](SETUP.md)** | 전원 | **전체 온보딩** (1회 설정 + 매일 워크플로) |
| [DEV_SETUP.md](DEV_SETUP.md) | 개발 PC | 로컬 실행 (Spring/Vite/AI + Tailscale DB 터널) |
| [DEPLOY.md](DEPLOY.md) | Windows 집 PC · GitHub | Actions 자동 배포 (PowerShell · 예약 작업) |
| **[UBUNTU_SERVER_SETUP.md](UBUNTU_SERVER_SETUP.md)** | **Ubuntu 서버 (현행)** | Docker · DB · Self-hosted Runner · **§7 외부 URL** |
| [CLOUDFLARE_TUNNEL.md](CLOUDFLARE_TUNNEL.md) | Ubuntu · 집 PC | **Quick / Named Tunnel** (외부 웹 데모) |
| [SESSION_HANDOFF.md](SESSION_HANDOFF.md) | PC 전환 | IP·체크리스트·대화 동기화 |

프로젝트 문서: [../README.md](../README.md) · [MVP](../MVP.md) · [TECH_STACK](../template/TECH_STACK.md) · [template](../template/) · [DISASTER_SIM](../DISASTER_SIM.md)

---

## 아키텍처 (현행 · Ubuntu 서버)

```
개발 PC: git push/merge master
    → GitHub Actions (Self-hosted Runner on Ubuntu)
    → deploy-docker.sh → http://192.168.219.100:9080
외부 (현행): https://opt-birds-built-streets.trycloudflare.com (Quick · systemd)
외부 (예정): Named Tunnel → https://horizon-app.com (도메인 구매 후)
DB: Ubuntu Docker Postgres (내부만 · 외부 55432 개방 금지)
```

Windows 집 PC 파이프라인: [SETUP.md](SETUP.md) · [DEPLOY.md](DEPLOY.md)

---

## 스크립트 빠른 참조

| 스크립트 | PC | 용도 |
|----------|-----|------|
| `setup_openssh_tunnel.ps1` | 집 | OpenSSH 서버 (관리자, 1회) |
| `setup-deploy-ssh.ps1` | 집 | Actions 배포 SSH 키 (관리자, 1회) |
| `setup-deploy-task.ps1` | 집 | Docker 예약 작업 (관리자, 1회) |
| `setup-github-ssh.ps1` | 각 PC | Git push SSH 키 (1회/PC) |
| `setup-local-dev.ps1` | 개발 | Node/Python/npm (1회) |
| `ssh-db-tunnel-tailscale.sh` | macOS 개발 | DB 터널 (매일, 창 유지) |
| `ssh-db-tunnel-tailscale.bat` | Windows 개발 | DB 터널 (매일, 창 유지) |
| `deploy-docker.sh` | Ubuntu | Actions·수동 Docker 재배포 |

외부 URL 확인 (Ubuntu):

```bash
sudo journalctl -u cloudflared-quick -n 100 --no-pager \
  | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1
```

---

## chat-exports

[../chat-exports/README.md](../chat-exports/README.md) — Cursor 대화 export 동기화
