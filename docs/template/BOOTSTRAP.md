# 프로젝트 부트스트랩 · Horizon 스택 이식

> **용도:** 새 레포에 Horizon과 **동일한 기술 스택 + 인프라**를 입힐 때, Cursor Agent에게 붙여 넣을 프롬프트.  
> **상세 스택:** [TECH_STACK.md](TECH_STACK.md) · **환경 설정:** [../onboarding/SETUP.md](../onboarding/SETUP.md) · **목록:** [README.md](README.md)

---

## 1. 다른 Agent에게 이렇게 시작 (짧은 버전)

`{…}` 만 새 프로젝트 값으로 바꿔 붙이세요.

```
@docs/template/BOOTSTRAP.md @docs/template/TECH_STACK.md @docs/onboarding/SETUP.md

Horizon 레포(git@github.com:ktdvlp-jih/horizon.git)와 **동일한 기술 스택 + 인프라 패턴**으로
새 프로젝트 `{PROJECT_NAME}` 을 부트스트랩해줘.

- 워크스페이스: `{WORKSPACE_PATH}`  (예: e:\workspace\myapp)
- GitHub: `{GITHUB_REPO}`  (예: git@github.com:org/myapp.git)
- DB/앱 slug: `{PROJECT_SLUG}`  (postgres DB명·compose 볼륨·Java 패키지 등)
- 도메인: {DOMAIN_DESCRIPTION}

Horizon의 scripts/, .github/workflows/deploy.yml, docs/onboarding/, docs/template/ 구조를 복사·치환해.
Self-hosted Runner 금지 — Tailscale + GitHub Actions SSH + Windows 예약 작업 패턴 유지.
BOOTSTRAP.md §2 상세 지시와 §3 완료 기준까지 순서대로 진행해.
```

---

## 2. Agent용 상세 지시 (복사용)

```
## 참조 구현
- 기준 레포: Horizon (git@github.com:ktdvlp-jih/horizon.git)
- 패턴 원형: price-tracker (Spring monolith + React SPA)
- 문서: docs/template/TECH_STACK.md, docs/template/BOOTSTRAP.md, docs/onboarding/

## 프로젝트 정보 (치환)
- 이름: {PROJECT_NAME}
- slug: {PROJECT_SLUG}
- 설명: {DOMAIN_DESCRIPTION}
- 로컬 경로: {WORKSPACE_PATH}
- GitHub: {GITHUB_REPO}

## 스택 (버전 고정)
- Backend: Java 21, Spring Boot 3.5, Gradle 8 (Kotlin DSL), PostgreSQL 17
  - Spring Web, Data JPA, Validation, Spring Security 6 + JWT (로그인 필요 시)
  - QueryDSL 5 (jakarta), MapStruct, Lombok
  - RestClient + Java HttpClient
  - @Scheduled, SSE
- Frontend: React 19, TypeScript 6, Vite 8, Tailwind CSS 4
  - TanStack React Query 5, React Router 7, Axios, AG Grid, Recharts, shadcn 스타일
- AI: Python 3.12, FastAPI, Uvicorn, Pydantic v2, LangChain, openai
- Infra: Docker Compose (postgres:17 + Temurin 21 + python:3.12-slim)

## Monorepo
- 루트 Spring + frontend/ + frontend-admin/(선택) + ai/
- React → Spring /api → Python /internal/v1 (프론트는 Python 직접 호출 금지)
- ApiResponse<T>, BaseEntity, BusinessException, open-in-view: false

## 포트 (Horizon과 동일)
| | 로컬 dev | Docker (집 PC) |
|--|----------|----------------|
| Spring | 8080 | 9080 |
| AI | 8000 | 9800 |
| Postgres | 55432 | 55432 |
| Vite | 5173, 5174 | dist → Spring |

## 환경 파일
- .env.example → .env (Docker, git 제외)
- .env.dev.remote.example → .env.dev (Tailscale DB 터널 + bootRun)
- .env.dev.example (로컬 Docker DB)
- bootRun: profile=dev, .env.dev 우선

## 개발 워크플로
1. 집 PC: docker compose up -d
2. 개발 PC: Tailscale + ssh-db-tunnel-tailscale.bat
3. bootRun + uvicorn :8000 + npm run dev
4. git push master → Actions 배포

## 배포 파이프라인 (필수 이식)
Self-hosted Runner 사용 안 함.

Horizon에서 복사 후 {WORKSPACE_PATH}, {PROJECT_SLUG} 치환:
- .github/workflows/deploy.yml
- scripts/deploy-docker.ps1
- scripts/deploy-docker-trigger.ps1
- scripts/setup-deploy-task.ps1 (-WindowStyle Hidden)
- scripts/setup-deploy-ssh.ps1
- scripts/setup_openssh_tunnel.ps1
- scripts/setup-github-ssh.ps1
- scripts/ssh-db-tunnel-tailscale.bat (+ .ps1)
- scripts/setup-local-dev.ps1
- scripts/start_trycloudflare.bat (선택)

GitHub Secrets: TAILSCALE_AUTHKEY, DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY

docs/template/ 전체 + docs/onboarding/ + docs/README.md + docs/chat-exports/README.md

## 대화 동기화 (선택)
- SpecStory → .specstory/history/ (Cloud Sync Off, git commit)
- docs/chat-exports/ — Export Transcript

## 타임존
Asia/Seoul

## 하지 말 것
- 클라oud DB — 집 PC Docker Postgres만
- Self-hosted Runner
- SSH에서 docker compose build 직접 (→ 예약 작업)
- WebFlux, open-in-view: true, Redis/Kafka/Celery (초기)

## 완료 기준
- compose up → :9080/api/health 200
- dev: 터널 + bootRun + npm run dev
- master push → Actions green
- docs/onboarding/SETUP.md 체크리스트 완료
```

---

## 3. Horizon에서 복사할 파일 목록

| 분류 | 경로 |
|------|------|
| **템플릿** | `docs/template/` **(이 폴더 전체)** |
| Workflow | `.github/workflows/deploy.yml` |
| 배포·SSH | `scripts/deploy-docker*.ps1`, `setup-deploy-*.ps1`, `setup_openssh_tunnel.ps1` |
| Git·개발 | `scripts/setup-github-ssh.ps1`, `setup-local-dev.ps1`, `ssh-db-tunnel-tailscale.*` |
| 데모 | `scripts/start_trycloudflare.bat` |
| Docker | `compose.yaml`, `Dockerfile`, `ai/Dockerfile` |
| Env 템플릿 | `.env.example`, `.env.dev.example`, `.env.dev.remote.example` |
| 온보딩 | `docs/onboarding/*`, `docs/README.md`, `docs/chat-exports/README.md` |

**치환할 값:** Java 패키지명, `POSTGRES_DB`, compose 볼륨명, workflow/script 내 `e:\workspace\horizon`, 예약 작업명, GitHub repo URL.

---

## 4. 집 PC 1회 설정 (이식 후)

[../onboarding/SETUP.md §2](../onboarding/SETUP.md#2-집-pc-1회-설정-home) 순서:

1. `docker compose up -d --build`
2. Tailscale + `setup_openssh_tunnel.ps1`
3. `setup-deploy-ssh.ps1` → GitHub Secret `DEPLOY_SSH_KEY`
4. `setup-deploy-task.ps1`
5. GitHub Secrets 4개 등록

---

*Horizon 검증 파이프라인 기준 · 2026-06-23*
