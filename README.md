# Horizon · 도시 기후 설계자 (Urban Climate Designer)

> AI와 실시간 기상 데이터로 **도시 열섬을 직접 설계하고 완화**하는 인터랙티브 웹앱.
> 사용자가 격자에 건물·도로·공원·나무·물을 칠하면 표면 온도 히트맵이 실시간으로 바뀌고,
> AI 도시 코치가 설계를 평가·코칭한다.

기획 배경과 아이디어 선정 근거는 [docs/MVP.md](docs/MVP.md), 기술 스택은 [docs/TECH_STACK.md](docs/TECH_STACK.md) 참고.

---

## 아키텍처

```
React 19 (Vite)  ──/api──▶  Spring Boot 3.5  ──/internal/v1──▶  Python FastAPI (AI 코치)
                                  │
                                  ▼
                            PostgreSQL 17
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

### 사전 요구사항
- JDK 21, Node 22+, Docker (PostgreSQL/AI 실행용)

### 1) 로컬 개발 (권장)

```powershell
# 1. DB (Docker)
docker run -d --name horizon-db -e POSTGRES_DB=horizon -e POSTGRES_USER=horizon `
  -e POSTGRES_PASSWORD=horizon -p 55432:5432 postgres:17

# 2. AI 서비스 (Docker; 로컬 Python 불필요)
docker build -t horizon-ai:dev ./ai
docker run -d --name horizon-ai -p 8000:8000 horizon-ai:dev

# 3. 백엔드 (Spring Boot)
$env:SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:55432/horizon"
$env:HORIZON_AI_SERVICE_URL="http://localhost:8000"
.\gradlew.bat bootRun

# 4. 프론트엔드 (새 터미널)
cd frontend
npm install
npm run dev   # http://localhost:5173
```

> AI 서비스를 로컬 Python으로 직접 실행하려면(uv 설치 시):
> `cd ai; uv sync; uv run uvicorn app.main:app --reload --port 8000`
> (uv 미설치 시 `pip install -r requirements.txt` 후 동일하게 실행)

### 2) Docker 전체 실행

```powershell
copy .env.example .env   # 필요 시 값 수정 (LLM 키 등)
docker compose up --build
# 앱: http://localhost:9080  (Spring이 SPA + API를 단일 포트로 서빙)
# AI: http://localhost:9800,  DB: localhost:55432
```

### 3) 외부 데모 (Cloudflare Tunnel)

```powershell
# docker compose 로 app(9080)을 띄운 뒤
cloudflared tunnel --url http://localhost:9080
# 출력되는 https://*.trycloudflare.com URL을 심사위원에게 공유
```

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
