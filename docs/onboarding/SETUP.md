# Horizon 설정 가이드 (진입점)

> **현행 (2026-06):** Ubuntu Docker + Self-hosted Runner + Cloudflare Quick Tunnel  
> Windows 집 PC 파이프라인은 **레거시** — [UBUNTU_SERVER_SETUP.md §9](UBUNTU_SERVER_SETUP.md#9-참고-windows-집-pc--ubuntu-전환-요약)

---

## 어디서 시작?

| 역할 | 문서 |
|------|------|
| **Ubuntu 서버** (Docker · 배포 · 외부 URL · Tailscale) | **[UBUNTU_SERVER_SETUP.md](UBUNTU_SERVER_SETUP.md)** |
| **개발 PC** (Windows · macOS · Tailscale DB 터널) | **[DEV_SETUP.md](DEV_SETUP.md)** |
| **PC 전환 · Cursor 대화 · SpecStory** | **[SESSION_HANDOFF.md](SESSION_HANDOFF.md)** |

---

## 아키텍처 (현행)

```
개발 PC: Spring :8080 · Vite :5173 · AI :8000 (로컬)
         └── SSH 터널 localhost:55432 ──Tailscale──▶ Ubuntu Docker Postgres

git push master → GitHub Actions (Self-hosted Runner on Ubuntu)
                → deploy-docker.sh → http://192.168.219.100:9080

외부 데모: Cloudflare Quick Tunnel (*.trycloudflare.com) · systemd cloudflared-quick
```

| 서비스 | 개발 PC (로컬) | Ubuntu (Docker) |
|--------|----------------|-----------------|
| 사용자 앱 | 5173 | **9080** |
| Spring API | 8080 | (컨테이너→9080) |
| AI | 8000 | **9800** |
| Postgres | **55432** (터널) | **55432** |

---

## 공통 — 레포 클론

```powershell
git clone git@github.com:ktdvlp-jih/horizon.git e:\workspace\horizon
cd e:\workspace\horizon
```

```bash
git clone git@github.com:ktdvlp-jih/horizon.git ~/apps/horizon
cd ~/apps/horizon
```

Git push SSH (PC마다 1회): `scripts\setup-github-ssh.ps1` (Windows)

---

## Cursor 룰 · 대화 이력

| 경로 | 용도 |
|------|------|
| `.cursor/rules/contest-constraints.mdc` | 해커톤 공고 제약 (항상 적용) |
| `.cursor/rules/secrets-handling.mdc` | PAT·SSH 키·토큰 커밋·채팅 금지 |
| `.specstory/history/*.md` | SpecStory 대화 이력 (`git pull`로 PC 간 동기화) |

---

## 문서 맵

전체 목록: [README.md](README.md) · [docs/README.md](../README.md)
