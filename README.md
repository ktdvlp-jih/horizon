# Horizon · 도시 기후 설계자 (Urban Climate Designer)

> AI와 실시간 기상 데이터로 **도시 열섬을 직접 설계하고 완화**하는 인터랙티브 웹앱.
> 사용자가 격자에 건물·도로·공원·나무·물을 칠하면 표면 온도 히트맵이 실시간으로 바뀌고,
> AI 도시 코치가 설계를 평가·코칭한다.

기획 배경과 아이디어 선정 근거는 [docs/MVP.md](docs/MVP.md), 기술 스택·템플릿은 [docs/template/TECH_STACK.md](docs/template/TECH_STACK.md) 참고.

**온보딩 (집 PC · 개발 PC · 배포 파이프라인):** **[docs/onboarding/SETUP.md](docs/onboarding/SETUP.md)** ← **여기서 시작**

| 문서 | 용도 |
|------|------|
| [docs/onboarding/SETUP.md](docs/onboarding/SETUP.md) | 전체 1회 설정 + 매일 워크플로 |
| [docs/onboarding/DEV_SETUP.md](docs/onboarding/DEV_SETUP.md) | 개발 PC 로컬 실행 |
| [docs/onboarding/DEPLOY.md](docs/onboarding/DEPLOY.md) | GitHub Actions 자동 배포 |
| [docs/onboarding/CLOUDFLARE_TUNNEL.md](docs/onboarding/CLOUDFLARE_TUNNEL.md) | 외부 데모 URL |
| [docs/onboarding/SESSION_HANDOFF.md](docs/onboarding/SESSION_HANDOFF.md) | 다른 PC에서 이어하기 |

---

## 아키텍처

```
frontend/      (Vite :5173, 사용자)  ──/api──▐
frontend-admin/ (Vite :5174, 관리자) ──/api──┼──▶  Spring Boot 3.5  ──/internal/v1──▶  Python FastAPI (AI 코치)
                                              │            │
                                              │            ▼
                                              │      PostgreSQL 17
                                              └── ADMIN JWT → /api/admin/**
```

- **프론트는 Python을 직접 호출하지 않는다.** 모든 AI 요청은 Spring `/api`를 경유한다.
- **Spring**: 시뮬레이션 엔진, 인증/CORS, DB 영속화, 기상 API 수집, AI 오케스트레이션.
- **Python**: AI 도시 코치(LLM), pandas 기반 시계열 분석. LLM 키 미설정 시 규칙 기반으로 자동 폴백.

### 핵심 기능 3개 (MVP)
1. 인터랙티브 격자 설계 + 실시간 열섬 히트맵 (`/api/designs/simulate`)
2. 실제 기상 데이터 기반 시뮬레이션 (지역 baseline, 기상청 API + 샘플 폴백)
3. AI 도시 코치 (`/api/designs/coach` → FastAPI `/internal/v1/coach`)

---

## 빠른 시작

> **처음이면 [docs/onboarding/SETUP.md](docs/onboarding/SETUP.md) 를 순서대로 진행하세요.**

### 사전 요구사항

- **로컬 개발 (권장):** JDK 21, Node 22+, Python 3.12+, Tailscale, OpenSSH Client
- **Docker 배포 (집 PC):** Docker Desktop, `compose.yaml`

### 1) 로컬 개발 — Docker 없이, 집 PC DB (Tailscale)

코드는 이 PC, DB는 집 PC Docker Postgres. 상세: **[docs/onboarding/DEV_SETUP.md](docs/onboarding/DEV_SETUP.md)**

```powershell
# 최초 1회
copy .env.dev.remote.example .env.dev
cd frontend && npm install && cd ..
cd ai && python -m pip install -r requirements.txt && cd ..

# 매일 — 터미널 1: DB 터널 (창 유지)
.\scripts\ssh-db-tunnel-tailscale.bat

# 터미널 2: AI
cd ai && python -m uvicorn app.main:app --reload --port 8000

# 터미널 3: Backend (.env.dev 자동 로드)
.\gradlew.bat bootRun

# 터미널 4: Frontend
cd frontend && npm run dev   # http://localhost:5173
```

| 대상 | 접속 |
|------|------|
| 앱 | http://localhost:5173 |
| API | http://localhost:8080 |
| 관리자 | `cd frontend-admin && npm run dev` → http://localhost:5174 |
| DBeaver | `localhost:55432` / `horizon` / `horizon` (터널 연 후) |

### 2) 로컬 개발 — 이 PC Docker DB

```powershell
copy .env.dev.example .env.dev
docker compose up db -d
.\gradlew.bat bootRun
cd frontend && npm run dev
```

### 3) Docker 전체 실행 (집 PC 배포·데모)

```powershell
copy .env.example .env
docker compose up -d --build
# 앱: http://localhost:9080
```

자동 재빌드: **[docs/onboarding/DEPLOY.md](docs/onboarding/DEPLOY.md)** (`master` merge → GitHub Actions + Tailscale SSH)

### 4) 외부 데모 (Cloudflare Tunnel)

```powershell
docker compose up -d
cloudflared tunnel --url http://localhost:9080
```

[docs/onboarding/CLOUDFLARE_TUNNEL.md](docs/onboarding/CLOUDFLARE_TUNNEL.md) 참고.

---

## 환경 파일

| 용도 | 파일 | 설명 |
|------|------|------|
| 로컬 + 집 DB (Tailscale) | `.env.dev` ← `.env.dev.remote.example` | `localhost:55432` 터널 |
| 로컬 + 이 PC PG/Docker | `.env.dev` ← `.env.dev.example` | `localhost:5432` 또는 `55432` |
| Docker Compose | `.env` ← `.env.example` | 집 PC `9080` / `9800` / `55432` |

---

## 환경 변수

루트 [.env.example](.env.example) 참고. 핵심:

| 변수 | 설명 |
|------|------|
| `HORIZON_AI_SERVICE_URL` | Spring → AI 서비스 URL (로컬 `http://localhost:8000`, Docker `http://ai:8000`) |
| `HORIZON_KMA_API_KEY` | 기상자료개방포털 키. **미설정 시 내장 샘플 기상 데이터로 동작** |
| `OPENAI_API_KEY` | LLM 키. **미설정 시 규칙 기반 코치로 동작** |
| `OPENAI_MODEL` | 기본 모델 (예: `gpt-4o-mini`) |

키가 하나도 없어도 앱은 완전히 동작한다(graceful degradation).

---

## API 요약

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/health` | 백엔드 + AI 헬스 |
| GET | `/api/regions` | 지역별 baseline 기상 |
| POST | `/api/designs/simulate` | 격자 → 표면온도 히트맵 + 지표 |
| POST | `/api/designs/coach` | AI 도시 코치 평가 |
| POST | `/api/designs` | 설계 저장 |
| GET | `/api/designs/leaderboard` | 가장 시원한 설계 순위 |

---

## 1분 데모 시나리오

1. (0:00) `서울` 선택 → 콘크리트 기본 도시, 히트맵 빨강, 평균 ~47°C.
2. (0:20) 가로수(🌳)·수변(💧)으로 재설계 → 히트맵이 파랑으로, 평균 급락.
3. (0:40) **AI 코치에게 평가받기** → 점수·강약점·개선 제안 표시.
4. (0:55) 제안 반영 → 점수 상승, "기준 대비 −6°C" 확인.

핵심 메시지: *"내가 설계를 바꾸니 도시의 더위가 실제로 바뀐다."*

---

## 테스트

```powershell
.\gradlew.bat test          # 백엔드
cd frontend; npm run lint   # 프론트 타입체크
cd ai; uv run pytest        # AI (또는 pip 환경에서 pytest)
```
