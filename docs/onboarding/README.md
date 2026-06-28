# Horizon 온보딩

> **처음 시작:** [SETUP.md](SETUP.md) — 역할별 문서로 바로 이동  
> **다른 PC에서 이어하기:** [SESSION_HANDOFF.md](SESSION_HANDOFF.md)

---

## 문서 맵

| 문서 | 대상 | 내용 |
|------|------|------|
| **[SETUP.md](SETUP.md)** | 전원 | **진입점** (역할별 링크) |
| **[UBUNTU_SERVER_SETUP.md](UBUNTU_SERVER_SETUP.md)** | **Ubuntu 서버 (현행)** | Docker · Self-hosted Runner · **§7 외부 URL · Tailscale** |
| [DEV_SETUP.md](DEV_SETUP.md) | Windows · macOS | 로컬 실행 + Tailscale DB 터널 |
| [SESSION_HANDOFF.md](SESSION_HANDOFF.md) | PC 전환 | IP·체크리스트·SpecStory·Cursor 룰 |

프로젝트 문서: [../README.md](../README.md) · [MVP](../MVP.md) · [TECH_STACK](../template/TECH_STACK.md)

---

## 아키텍처 (현행 · Ubuntu 서버)

```
개발 PC: git push/merge master
    → GitHub Actions (Self-hosted Runner on Ubuntu)
    → deploy-docker.sh → http://192.168.219.100:9080
외부 (현행): https://opt-birds-built-streets.trycloudflare.com (Quick · systemd)
외부 (예정): Named Tunnel → https://horizon-app.com
DB: Ubuntu Docker Postgres — Tailscale SSH 터널 (55432 인터넷 개방 금지)
```

---

## 스크립트 빠른 참조

| 스크립트 | PC | 용도 |
|----------|-----|------|
| `setup-github-ssh.ps1` | 각 PC | Git push SSH 키 (1회) |
| `setup-local-dev.ps1` | Windows | Node/Python/npm (1회) |
| `ssh-db-tunnel-tailscale.sh` | macOS | DB 터널 (매일) |
| `ssh-db-tunnel-tailscale.bat` | Windows | DB 터널 (매일) |
| `deploy-docker.sh` | Ubuntu | Actions·수동 Docker 재배포 |

외부 URL 확인 (Ubuntu):

```bash
sudo journalctl -u cloudflared-quick -n 100 --no-pager \
  | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1
```

---

## chat-exports

[../chat-exports/README.md](../chat-exports/README.md) — Cursor 대화 export (SpecStory 보조)
