# 세션 핸드오프 (대화·맥락 동기화)

다른 PC에서 Horizon 작업을 이어갈 때 사용합니다. **코드는 Git**, **대화 맥락은 이 문서 + export**로 맞춥니다.

---

## 아키텍처 (2026-06-23 확정)

| 역할 | 방식 |
|------|------|
| **DB** | 집 PC Docker Postgres (`55432`) — 클라oud DB 없음 |
| **밖에서 개발** | Tailscale + `ssh-db-tunnel-tailscale.bat` → `localhost:55432` |
| **배포** | `master` merge → **GitHub Actions + Tailscale SSH** → `deploy-docker.ps1` |
| **데모 URL** | `start_trycloudflare.bat` / Cloudflare Tunnel (`9080`) |

GitHub Secrets 4개 필요 → [DEPLOY.md](DEPLOY.md). 집 PC Runner 설치 **불필요**.

---

## 빠른 시작 (새 PC)

```text
1. git pull
2. copy .env.dev.remote.example .env.dev  (API 키는 USB/비밀관리자로 복사)
3. Tailscale 설치 · 같은 계정 로그인
4. scripts\ssh-db-tunnel-tailscale.bat  (집 PC IP 확인)
5. bootRun + npm run dev  (docs/DEV_SETUP.md)
6. Cursor 새 Agent 채팅:
   @docs/SESSION_HANDOFF.md
   @docs/chat-exports/최신-export.md  (있으면)
   「이 대화 이어서 작업해줘」
```

---

## 현재 프로젝트 상태 (2026-06-23)

### 완료

| 영역 | 커밋/문서 |
|------|-----------|
| 도시 기후 설계자 MVP | `b550483` |
| 3대 재난 시뮬 + 태풍 시의회 UX | `457a55b`, `docs/DISASTER_SIM.md` |
| Cloudflare trycloudflare 데모 | `docs/CLOUDFLARE_TUNNEL.md` |
| 로컬 개발 (Docker 없이) + Tailscale DB | `docs/DEV_SETUP.md` |

### 개발 PC ↔ 집 PC DB

| 항목 | 값 |
|------|-----|
| Tailscale (집 PC) | `100.117.145.80` (변경될 수 있음 → `tailscale ip -4`) |
| SSH 사용자 | `전일훈` |
| DB 터널 | `localhost:55432` ← SSH ← 집 Docker Postgres |
| LAN IP (같은 Wi‑Fi) | `192.168.219.107` |
| 공인 IP | `49.165.27.19` (포트포워딩 대신 Tailscale 사용 중) |

### 로컬 포트 (개발 PC)

| 서비스 | 포트 |
|--------|------|
| Spring `bootRun` | 8080 |
| Vite (사용자) | 5173 |
| Vite (관리자) | 5174 |
| AI (로컬 Python) | 8000 |
| DB (터널 입구) | 55432 |

### 집 PC Docker (배포)

| 서비스 | 포트 |
|--------|------|
| app | 9080 |
| ai | 9800 |
| db | 55432 |

### 미완 / 다음 작업

- [x] `master` merge 시 집 PC Docker 자동 재빌드 — **GitHub Actions + Tailscale SSH** ([DEPLOY.md](DEPLOY.md))
- [ ] GitHub Secrets 4개 + Actions 첫 실행 확인
- [ ] 지진 30초 대피 UX, 해일 단면 UX
- [ ] Gemini LLM 실연동 (`.env` `OPENAI_*`)
- [ ] 기상청 API 실연동 (`HORIZON_KMA_API_KEY`)

### 서류 전략

- **깊게:** 도시 기후 설계자
- **증거 1개:** 태풍 시의회 (`/disaster?mode=typhoon`)
- **나머지 4체험:** 로드맵만

---

## 대화 동기화 방법

### 1) Export Transcript (확정)

1. Cursor → Export Transcript
2. `docs/chat-exports/2026-06-23-xxx.md` 저장
3. `git commit` + `push`
4. 다른 PC → `pull` → `@docs/chat-exports/...` + 「이어서 작업해줘」

### 2) SESSION_HANDOFF.md

IP·포트·다음 할 일만 짧게 유지. 변경 시 커밋.

### 3) SpecStory (선택)

[SpecStory](https://specstory.com) 확장 → `.specstory/` 자동 저장 → Git sync.

### 4) Cursor workspaceStorage (비추천)

`%APPDATA%\Cursor\User\workspaceStorage` — PC마다 workspace ID가 달라 불안정.

---

## 관련 문서

- [DEV_SETUP.md](DEV_SETUP.md) — 로컬 실행
- [DEPLOY.md](DEPLOY.md) — Docker 배포·자동 재빌드
- [TECH_STACK.md](TECH_STACK.md) — 기술 스택
- [cursor_project_tech_stack_integration.md](cursor_project_tech_stack_integration.md) — 전체 대화 export
