# Horizon 온보딩

> **처음 시작:** [SETUP.md](SETUP.md) — 집 PC · GitHub · 개발 PC · 배포 파이프라인 **순서대로**  
> **다른 PC에서 이어하기:** [SESSION_HANDOFF.md](SESSION_HANDOFF.md)

---

## 문서 맵

| 문서 | 대상 | 내용 |
|------|------|------|
| **[SETUP.md](SETUP.md)** | 전원 | **전체 온보딩** (1회 설정 + 매일 워크플로) |
| [DEV_SETUP.md](DEV_SETUP.md) | 개발 PC | 로컬 실행 (Spring/Vite/AI + Tailscale DB 터널) |
| [DEPLOY.md](DEPLOY.md) | 집 PC · GitHub | Actions 자동 배포 · Secrets · 트러블슈팅 |
| [CLOUDFLARE_TUNNEL.md](CLOUDFLARE_TUNNEL.md) | 집 PC | 외부 데모 URL (trycloudflare) |
| [SESSION_HANDOFF.md](SESSION_HANDOFF.md) | PC 전환 | IP·체크리스트·대화 동기화 |

프로젝트 문서: [../README.md](../README.md) · [MVP](../MVP.md) · [TECH_STACK](../TECH_STACK.md) · [DISASTER_SIM](../DISASTER_SIM.md)

---

## 아키텍처 (한 줄)

```
개발 PC: 코드 + Spring/Vite/AI (로컬) ──Tailscale SSH 터널──▶ 집 PC Postgres
git push master ──▶ GitHub Actions ──▶ 집 PC Docker 재빌드 (9080)
외부 데모: trycloudflare ──▶ 집 PC 9080
```

**DB:** 집 PC Docker Postgres만 (클라oud DB 없음) · **비용:** 0원 (Tailscale 무료 tier)

---

## 스크립트 빠른 참조

| 스크립트 | PC | 용도 |
|----------|-----|------|
| `setup_openssh_tunnel.ps1` | 집 | OpenSSH 서버 (관리자, 1회) |
| `setup-deploy-ssh.ps1` | 집 | Actions 배포 SSH 키 (관리자, 1회) |
| `setup-deploy-task.ps1` | 집 | Docker 예약 작업 (관리자, 1회) |
| `setup-github-ssh.ps1` | 각 PC | Git push SSH 키 (1회/PC) |
| `setup-local-dev.ps1` | 개발 | Node/Python/npm (1회) |
| `ssh-db-tunnel-tailscale.bat` | 개발 | DB 터널 (매일, 창 유지) |
| `deploy-docker.ps1` | 집 | 수동 Docker 재배포 |
| `start_trycloudflare.bat` | 집 | 외부 데모 URL |

---

## chat-exports

[../chat-exports/README.md](../chat-exports/README.md) — Cursor 대화 export 동기화
