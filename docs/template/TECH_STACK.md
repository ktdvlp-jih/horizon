# 기술 스택 · 프로젝트 템플릿

> **용도:** 새 프로젝트를 Cursor로 부트스트랩하거나, **다른 레포에 동일 스택·인프라를 이식**할 때 이 문서(특히 **§9 프롬프트**)를 Agent 컨텍스트로 붙이세요.  
> **기준 구현:** [Horizon](https://github.com/ktdvlp-jih/horizon) (`price-tracker` 패턴 + AI + Tailscale 배포)  
> **작성일:** 2026-06-18 · **인프라 갱신:** 2026-06-23

> **폴더:** [README.md](README.md) · **Agent 프롬프트:** [BOOTSTRAP.md](BOOTSTRAP.md)

**다른 프로젝트 이식:** `@docs/template/BOOTSTRAP.md` + `@docs/template/TECH_STACK.md` + `@docs/onboarding/SETUP.md`

---

## 1. 프로젝트 성격

| 항목 | 내용 |
|------|------|
| 유형 | 풀스택 웹 애플리케이션 + AI 서비스 (Monorepo) |
| 백엔드 | REST API + 스케줄러 + 외부 API 연동 + AI 오케스트레이션 |
| 프론트엔드 | SPA (관리/조회 UI, 테이블·차트, AI 인사이트 표시) |
| AI | Python 마이크로서비스 (LLM·데이터 분석·추론) |
| 배포 | 로컬 개발 (Docker 없이) / 집 PC Docker Compose / **Tailscale + GitHub Actions SSH 배포** / Cloudflare Tunnel(선택) |
| 타임존 | `Asia/Seoul` 고정 |

---

## 2. 기술 스택 요약

```
Backend  : Java 21 · Spring Boot 3.5 · Gradle 8 (Kotlin DSL) · PostgreSQL 17
           · Spring Data JPA · QueryDSL 5 · MapStruct · Lombok
Frontend : React 19 · TypeScript 6 · Vite 8 · Tailwind CSS 4
           · TanStack React Query 5 · React Router 7 · Axios
           · AG Grid Community · Recharts · Radix UI (shadcn 스타일)
AI       : Python 3.12 · FastAPI · Uvicorn · uv (패키지 관리)
           · Pydantic v2 · httpx · pandas · NumPy
           · LangChain · OpenAI SDK (LLM 연동)
           · scikit-learn (분류·예측, 선택) · xarray (기상 NetCDF, 선택)
Infra    : Docker · Docker Compose · Eclipse Temurin 21 · python:3.12-slim
           · Tailscale (원격 DB SSH 터널 + Actions→집 PC SSH)
           · GitHub Actions (ubuntu + tailscale/github-action + appleboy/ssh-action)
           · Windows 예약 작업 (Docker credential 우회, -WindowStyle Hidden)
           · Cloudflare Tunnel (외부 데모, 선택)
           · SpecStory / docs/chat-exports (Cursor 대화 git 동기화, 선택)
```

---

## 3. 백엔드

### 3.1 핵심 버전

| 기술 | 버전 | 비고 |
|------|------|------|
| Java | **21** (LTS) | Records, Virtual Thread 대비, Temurin JDK/JRE |
| Spring Boot | **3.5.0** | Jakarta EE 기반 |
| Gradle | **8.10.2** | Kotlin DSL (`build.gradle.kts`) |
| PostgreSQL | **17** | Docker 이미지 `postgres:17` |
| QueryDSL | **5.1.0** | `jakarta` classifier |
| MapStruct | **1.5.5.Final** | Entity ↔ DTO 매핑 |
| Lombok | BOM 관리 | `@Getter`, `@Builder` 등 |

### 3.2 Spring Boot Starter

```kotlin
// build.gradle.kts dependencies 기준
implementation("org.springframework.boot:spring-boot-starter-web")
implementation("org.springframework.boot:spring-boot-starter-data-jpa")
implementation("org.springframework.boot:spring-boot-starter-validation")
runtimeOnly("org.postgresql:postgresql")
testImplementation("org.springframework.boot:spring-boot-starter-test")
```

**의도적으로 사용하지 않는 것**
- Spring Security (전체 프레임워크) → 단순 API Key 인터셉터로 대체
- Spring WebFlux → 동기 RestClient + Java HttpClient
- Redis / Kafka → 단일 PostgreSQL로 충분한 규모

### 3.3 HTTP 클라이언트

- **Java `HttpClient`** (JDK 내장) + **Spring `RestClient`**
- 외부 API(GraphQL, 기상 Open API 등) 호출용
- **AI 서비스** (`ai/` FastAPI) 내부 호출용 — `AiServiceClient` 전용 `RestClient` Bean
- `JdkClientHttpRequestFactory`로 연결

### 3.4 JPA / DB 설정

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: update          # 개발·소규모 운영. 프로덕션은 Flyway/Liquibase 검토
    open-in-view: false         # 필수
    properties:
      hibernate:
        format_sql: true
        jdbc:
          time_zone: Asia/Seoul
  jackson:
    time-zone: Asia/Seoul
    serialization:
      write-dates-as-timestamps: false
```

- **Auditing:** `@CreatedDate`, `@LastModifiedDate` → `BaseEntity` 추상 클래스
- **네이밍:** DB 컬럼 `snake_case` (`created_at`, `updated_at`)

### 3.5 QueryDSL

- `querydsl-apt` annotation processor로 Q클래스 생성
- 복잡한 검색·필터·페이징은 `*RepositoryCustom` + `*RepositoryImpl` 패턴
- 생성 경로: `build/generated/sources/annotationProcessor/java/main`

### 3.6 MapStruct

- `*Mapper` 인터페이스 (`@Mapper(componentModel = "spring")`)
- Lombok과 함께 쓸 때 `lombok-mapstruct-binding` 필수

### 3.7 API 응답 규약

모든 REST 응답은 공통 래퍼 사용:

```java
public record ApiResponse<T>(
    boolean success,
    T data,
    ErrorPayload error,      // { code, message }
    LocalDateTime timestamp
) {}
```

- 성공: `ApiResponse.ok(data)`
- 실패: `GlobalExceptionHandler`에서 `ApiResponse.error(...)` 반환
- 페이징: `PageResponse<T>` (content, page, size, totalElements, totalPages)

### 3.8 예외 처리

- `BusinessException` + `ErrorCode` enum
- `@RestControllerAdvice` → `GlobalExceptionHandler`

### 3.9 인증 / CORS

- **JWT (현재):** Spring Security 6 + Access/Refresh Token — [login_PROMPT.md](login_PROMPT.md) 기준 구현됨
- **역할:** `USER`, `ADMIN` (`app_user.role`). 관리 API는 `/api/admin/**` + `hasRole('ADMIN')` (관리자 앱 `frontend-admin/`)
- **CORS:** `HORIZON_CORS_ORIGINS` (쉼표 구분, 예: `http://localhost:5173,http://localhost:5174`) + `https://*.trycloudflare.com` 패턴 허용

### 3.10 스케줄러

- Spring `@Scheduled` (크론 표현식, `Asia/Seoul`)
- 장시간 작업: 백그라운드 Job 엔티티 + 폴링 API
- 실시간 진행률: **SSE** (`/api/**/stream`) — `SseEmitter` + 인터셉터

### 3.11 정적 파일 / SPA 서빙

- 이미지: `storage/images` → `/files/images/**` 로 서빙
- 프로덕션 SPA: `HORIZON_SERVE_FRONTEND=true` 시 `frontend/dist`를 Spring Boot에서 서빙 (단일 포트 배포용)

### 3.12 외부 데이터 출처 (Horizon)

| 축/용도 | 출처 | 엔드포인트 | 인증 |
|---------|------|-----------|------|
| 기온·강수 | 기상청 API허브 ASOS 시간자료 | `kma_sfctm2.php` (TA·RN) | `authKey` |
| 일사량 | 기상청 API허브 일사 묶음형 | `nph-sun_sfc_sts_pkg` (SI) | `authKey` |
| 황사 PM10 | 기상청 API허브 | `dst_pm10_hr.php` | `authKey` |
| 태풍·지진 | 기상청 API허브 | 재난·태풍 엔드포인트 | `authKey` |

- **모든 기상·재난 데이터는 [기상청 API허브](https://apihub.kma.go.kr)(`authKey`) 단일 출처로 통일.** 공공데이터포털(`data.go.kr`, `serviceKey`)·기상자료개방포털 경로는 사용하지 않음.
- 키(`HORIZON_KMA_API_KEY`) 미설정·호출 실패 시 → 지역별 baseline 샘플로 graceful fallback.

---

## 4. 프론트엔드

### 4.1 핵심 버전

| 기술 | 버전 | 용도 |
|------|------|------|
| React | **19** | UI |
| TypeScript | **~6.0** | 타입 안전 |
| Vite | **8** | 빌드·HMR |
| Tailwind CSS | **4** | 스타일 (`@tailwindcss/vite` 플러그인) |
| TanStack React Query | **5** | 서버 상태·캐시 |
| React Router | **7** | SPA 라우팅 |
| Axios | **1.x** | HTTP 클라이언트 |
| AG Grid Community | **35** | 데이터 테이블 |
| Recharts | **3** | 가격·통계 차트 |
| Radix UI | slot 등 | 접근성 기반 UI primitive |
| Lucide React | latest | 아이콘 |

### 4.2 UI 패턴

- **shadcn/ui 스타일** (라이브러리 직접 설치 X, 컴포넌트 복사 방식)
  - `class-variance-authority` + `clsx` + `tailwind-merge` → `cn()` 유틸 (`@/lib/utils`)
  - `components/ui/button.tsx`, `components/ui/card.tsx` 등
- **레이아웃:** `Layout` + `Outlet` (React Router nested routes)

### 4.3 디렉터리 구조

**사용자 앱** (`frontend/`, dev 포트 **5173**)

```
frontend/src/
├── api/           # designApi.ts, authApi.ts, client.ts …
├── components/    # Layout, designer/*, ui/*
├── context/       # AuthContext
├── hooks/
├── lib/           # grid, tiles, apiBase, authStorage
├── pages/         # Home, Designer, Login, Signup, MyDesigns
├── types/
├── App.tsx
└── main.tsx
```

**관리자 앱** (`frontend-admin/`, dev 포트 **5174**)

```
frontend-admin/src/
├── api/           # adminApi.ts, authApi.ts, client.ts
├── components/    # AdminLayout, AdminRoute, ui/*
├── context/       # AuthContext (ADMIN role 가드)
├── pages/         # Dashboard, Users, AiCoach, Designs, Regions, System
└── …
```

### 4.4 API 클라이언트

```typescript
// api/client.ts
export const apiClient = axios.create({
  baseURL: apiUrl('/api'),
  headers: { 'Content-Type': 'application/json' },
})
// 요청 인터셉터: X-API-Key 자동 첨부
// 응답 인터셉터: 401 → notifyUnauthorized()
```

- `apiUrl()`: `VITE_API_BASE_URL` 기반 URL 조합 (빈 값이면 Vite 프록시 사용)
- `assetUrl()`: `/files/...` 상대 경로 → 절대 URL 변환

### 4.5 React Query 기본값

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})
```

- 커스텀 훅 패턴: `hooks/useProducts.ts` → `useQuery` / `useMutation` 래핑

### 4.6 Vite 개발 서버

- 포트: **5173**
- 프록시: `/api`, `/files` → `VITE_DEV_API_TARGET` (기본 `http://localhost:8080`)
- SSE 스트림: `proxyRes` 헤더 조정 (`cache-control`, `x-accel-buffering`)
- Path alias: `@` → `./src`

### 4.7 환경 변수 (frontend/.env)

| 변수 | 설명 |
|------|------|
| `VITE_API_BASE_URL` | API 베이스 (빈 값 = Vite 프록시) |
| `VITE_DEV_API_TARGET` | dev 프록시 대상 (Docker API: `http://localhost:9080`) |
| `VITE_REQUIRE_API_KEY` | `true` 시 API Key 입력 게이트 표시 |
| `VITE_API_KEY` | 개발용 고정 키 (선택) |

---

## 5. AI 서비스

### 5.1 아키텍처 원칙

```
React (5173)  →  Spring Boot (8080)  →  Python FastAPI (8000)
                      ↓
                 PostgreSQL (17)
```

- **프론트는 Python을 직접 호출하지 않음** — 모든 AI 요청은 Spring `/api/**` 경유
- **Spring**: 인증, DB 영속화, Job·SSE, 기상 API 수집, AI 결과 캐싱·가공
- **Python**: LLM 호출, 시계열·기상 데이터 분석, 임베딩·분류 등 AI 전용 연산
- **연동 방식**
  - 짧은 작업 (요약·단일 추론, ~30초): Spring `RestClient` → FastAPI 동기 호출
  - 긴 작업 (대량 분석·배치): Spring Job 엔티티 + 폴링/SSE (기존 스케줄러 패턴 재사용)
  - LLM 스트리밍: FastAPI `StreamingResponse` → Spring SSE 프록시 → React

### 5.2 핵심 버전

| 기술 | 버전 | 비고 |
|------|------|------|
| Python | **3.12** | LTS 계열, `python:3.12-slim` Docker 이미지 |
| FastAPI | **0.115+** | 비동기 REST, OpenAPI 자동 생성 |
| Uvicorn | **0.34+** | ASGI 서버 (`uvicorn[standard]`) |
| uv | latest | 패키지·가상환경 관리 (`pyproject.toml`) |
| Pydantic | **v2** | 요청/응답 스키마, FastAPI 내장 |
| httpx | **0.28+** | 비동기 HTTP (외부 LLM·기상 API 호출) |
| pandas | **2.2+** | 시계열·표 데이터 가공 |
| NumPy | **2.x** | 수치 연산 |
| LangChain | **0.3+** | LLM 체인·프롬프트·도구 오케스트레이션 (선택) |
| langchain-openai | latest | OpenAI / 호환 API 연동 |
| openai | **1.x** | OpenAI SDK (LangChain 없이 직접 호출 시) |
| scikit-learn | **1.6+** | 분류·회귀·이상 탐지 (선택) |
| xarray | **2025.x** | NetCDF·GRIB 등 기상 격자 데이터 (선택) |

**의도적으로 사용하지 않는 것 (초기)**
- Celery / Redis / Kafka → Spring Job + PostgreSQL로 충분
- Django / Flask → FastAPI 단일 선택 (비동기·OpenAPI)
- 프론트에서 LLM API Key 직접 사용 → 키는 Python·Spring 서버에만 보관

### 5.3 pyproject.toml 의존성 (기준)

```toml
[project]
name = "horizon-ai"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.34",
    "pydantic>=2.0",
    "pydantic-settings>=2.0",
    "httpx>=0.28",
    "pandas>=2.2",
    "numpy>=2.0",
    "langchain>=0.3",
    "langchain-openai>=0.3",
    "openai>=1.0",
]

[project.optional-dependencies]
ml = ["scikit-learn>=1.6"]
weather = ["xarray>=2025.1", "netCDF4>=1.7"]
dev = ["pytest>=8.0", "pytest-asyncio>=0.24", "ruff>=0.9"]
```

### 5.4 디렉터리 구조

```
ai/
├── app/
│   ├── main.py              # FastAPI 앱, lifespan, CORS (내부 전용)
│   ├── config.py            # pydantic-settings (환경 변수)
│   ├── routers/             # HTTP 엔드포인트
│   │   ├── health.py        # GET /health
│   │   ├── analyze.py       # 데이터 분석·인사이트
│   │   └── chat.py          # LLM 대화·요약 (스트리밍 지원)
│   ├── services/            # 비즈니스·AI 로직
│   │   ├── llm_service.py   # LangChain / OpenAI 호출
│   │   ├── weather_data.py  # 기상 데이터 전처리
│   │   └── insight.py       # 인사이트 생성 파이프라인
│   ├── schemas/             # Pydantic 요청/응답 모델
│   └── core/
│       └── exceptions.py    # HTTPException 래핑
├── tests/
├── pyproject.toml
├── Dockerfile
└── .env.example
```

### 5.5 API 규약 (Python 내부 API)

- **베이스 경로:** `/internal/v1` (외부 노출 최소화, Docker 내부·로컬만 접근)
- **헬스체크:** `GET /health` → `{ "status": "ok" }`
- **요청/응답:** Pydantic 모델, JSON only
- **에러:** FastAPI `HTTPException` + 공통 `{ "detail": "...", "code": "..." }`
- **타임아웃:** Spring `RestClient` 측 connect/read timeout 명시 (LLM 호출 기본 60~120초)

```python
# 예: 분석 요청 스키마
class AnalyzeRequest(BaseModel):
    dataset_id: str
    metrics: list[str]
    prompt_context: str | None = None

class AnalyzeResponse(BaseModel):
    summary: str
    insights: list[str]
    confidence: float | None = None
```

### 5.6 Spring ↔ AI 연동

**설정 (`application.yml`)**

```yaml
horizon:
  ai:
    base-url: ${HORIZON_AI_SERVICE_URL:http://localhost:8000}
    connect-timeout: 5s
    read-timeout: 120s
```

**백엔드 패키지:** `ai/` (Java) — `AiServiceClient`, `AiRequest`/`AiResponse` DTO

```java
// AiServiceClient — RestClient 주입
public AnalyzeResult analyze(AnalyzeCommand command) {
    return aiRestClient.post()
        .uri("/internal/v1/analyze")
        .body(command)
        .retrieve()
        .body(AnalyzeResult.class);
}
```

- AI API Key(`OPENAI_API_KEY` 등)는 **Python 서비스 환경 변수에만** 설정
- Spring은 AI 서비스 URL만 알면 됨 (내부 네트워크)
- LLM 스트리밍: Spring Controller에서 `SseEmitter`로 FastAPI 스트림 중계

### 5.7 LLM·기상 데이터 활용 패턴 (Horizon)

| 용도 | 구현 위치 | 예시 |
|------|-----------|------|
| 기상 API 수집·저장 | Spring (`crawler/`) | 기상청 Open API, NASA GPM |
| 시계열 집계·정규화 | Python (`pandas`) | 일별 평균, 이상값 제거 |
| 자연어 인사이트 | Python (`LangChain` + LLM) | "이번 주 강수 패턴 요약" |
| 대화형 탐험 UI | React → Spring → Python | 사용자 질의 → 컨텍스트 + LLM |
| 배치 분석 | Spring `@Scheduled` → Python | 야간 데이터 요약 Job |
| (선택) 벡터 검색 | PostgreSQL `pgvector` | 과거 시나리오 RAG |

### 5.8 환경 변수 (ai/.env)

| 변수 | 설명 |
|------|------|
| `OPENAI_API_KEY` | OpenAI API 키 (또는 호환 API 키) |
| `OPENAI_BASE_URL` | 호환 API 엔드포인트 (선택, Ollama·Azure 등) |
| `OPENAI_MODEL` | 기본 모델 (예: `gpt-4o-mini`) |
| `HORIZON_AI_LOG_LEVEL` | 로그 레벨 (기본 `info`) |
| `HORIZON_AI_CORS_ORIGINS` | CORS (기본 비활성, Spring 경유만 허용) |

---

## 6. 인프라 / 배포

### 6.1 Docker Compose 서비스

| 서비스 | 이미지 | 호스트 포트 | 컨테이너 포트 |
|--------|--------|-------------|---------------|
| `db` | `postgres:17` | `55432` | `5432` |
| `app` | 멀티스테이지 빌드 (Temurin 21) | `9080` | `8080` |
| `ai` | `./ai` 멀티스테이지 빌드 | `9800` | `8000` |

- 볼륨: `horizon_db` (PG 데이터), `./storage/images`, `./frontend/dist`
- healthcheck: `pg_isready`, `app` → Spring Actuator 또는 `/api/health`, `ai` → `GET /health`
- `app`은 `ai:8000`으로 내부 DNS 접근 (`HORIZON_AI_SERVICE_URL=http://ai:8000`)

### 6.2 Dockerfile

**Spring Boot (`Dockerfile`)**

```
Stage 1: eclipse-temurin:21-jdk  → ./gradlew bootJar
Stage 2: eclipse-temurin:21-jre  → java -jar app.jar
```

**AI 서비스 (`ai/Dockerfile`)**

```
Stage 1: python:3.12-slim  → uv sync --frozen
Stage 2: python:3.12-slim  → uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 6.3 포트 규칙

| 환경 | API (Spring) | AI (FastAPI) | PostgreSQL (호스트) | Vite dev |
|------|--------------|--------------|---------------------|----------|
| **로컬 개발 (권장)** | `8080` | `8000` (로컬 Python) | `55432` via **Tailscale SSH 터널** → 집 Docker DB | `5173`, `5174` |
| 로컬 + 이 PC Docker DB | `8080` | `8000` | `55432` (compose `db` only) | `5173`, `5174` |
| 로컬 + 이 PC PostgreSQL | `8080` | `8000` | `5432` | `5173`, `5174` |
| Docker (집 PC 배포) | `9080` | `9800` | `55432` | — (dist → Spring `/`, `/admin`) |

### 6.4 실행 방식

1. **로컬 개발 + 원격 DB (권장):** Tailscale + `ssh-db-tunnel-tailscale.bat` → `bootRun` + 로컬 `uvicorn` + `npm run dev` — [SETUP.md](../onboarding/SETUP.md) · [DEV_SETUP.md](../onboarding/DEV_SETUP.md)
2. **로컬 개발 (이 PC DB):** `docker compose up db -d` 또는 로컬 PG + `.env.dev.example`
3. **Docker 전체 (집 PC):** `docker compose up -d --build` — [SETUP.md](../onboarding/SETUP.md) · [DEPLOY.md](../onboarding/DEPLOY.md)
4. **외부 데모:** Cloudflare Quick Tunnel + `HORIZON_SERVE_FRONTEND=true`

### 6.4.1 Tailscale DB 터널

```
[개발 PC]  localhost:55432 ──SSH──► [집 PC Tailscale IP] localhost:55432 (Docker db)
           bootRun / DBeaver              docker compose db
```

- 스크립트: `scripts/ssh-db-tunnel-tailscale.bat`
- `.env.dev`: `SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:55432/{db}` (템플릿: `.env.dev.remote.example`)
- 공유기 포트포워딩 불필요

### 6.6 배포 파이프라인 (집 PC · 0원)

```
[개발 PC] git push master
       ↓
[GitHub Actions ubuntu-latest]
  1. tailscale/github-action@v2  (TAILSCALE_AUTHKEY)
  2. appleboy/ssh-action → deploy-docker-trigger.ps1
       ↓
[집 PC Windows]
  예약 작업 HorizonGitHubDeploy (-WindowStyle Hidden)
  → deploy-docker.ps1 (git pull + docker compose build/up + health retry)
       ↓
http://localhost:9080/api/health
```

| 구성요소 | 파일 |
|----------|------|
| Workflow | `.github/workflows/deploy.yml` |
| SSH 트리거 | `scripts/deploy-docker-trigger.ps1` |
| 실제 배포 | `scripts/deploy-docker.ps1` |
| 예약 작업 등록 | `scripts/setup-deploy-task.ps1` (관리자, 1회) |
| 배포 SSH 키 | `scripts/setup-deploy-ssh.ps1` (관리자, 1회) |
| OpenSSH 서버 | `scripts/setup_openssh_tunnel.ps1` (관리자, 1회) |
| Git push SSH | `scripts/setup-github-ssh.ps1` (PC마다 1회) |
| DB 터널 (개발) | `scripts/ssh-db-tunnel-tailscale.bat` |

**GitHub Secrets (4):** `TAILSCALE_AUTHKEY`, `DEPLOY_HOST` (집 PC Tailscale IP), `DEPLOY_USER`, `DEPLOY_SSH_KEY`

**집 PC 유지 조건:** Windows 로그인 · Docker Desktop · Tailscale · `sshd` Running

**Self-hosted Runner 사용 안 함** — SSH로 트리거만 하고 Docker는 interactive session 예약 작업에서 실행 (credential 오류 방지).

상세: [SETUP.md](../onboarding/SETUP.md) · [DEPLOY.md](../onboarding/DEPLOY.md)

### 6.7 Cursor 대화 동기화 (선택)

| 방식 | 경로 | 용도 |
|------|------|------|
| SpecStory 확장 | `.specstory/history/*.md` | 채팅 자동 저장 → git sync (Cloud Sync 불필요) |
| Export Transcript | `docs/chat-exports/` | 중요 세션 수동 export |
| 핸드오프 | `docs/onboarding/SESSION_HANDOFF.md` | IP·체크리스트만 짧게 |

---

### 6.5 환경 변수 (.env)

| 변수 | 설명 |
|------|------|
| `POSTGRES_DB/USER/PASSWORD` | DB 접속 정보 |
| `POSTGRES_PORT` | 호스트 DB 포트 (기본 `55432`) |
| `APP_PORT` | Docker API 호스트 포트 (기본 `9080`) |
| `SPRING_DATASOURCE_URL` | JDBC URL (로컬 Docker DB 시 override) |
| `HORIZON_API_KEY` | API Key (선택) |
| `HORIZON_SERVE_FRONTEND` | SPA 서빙 여부 |
| `HORIZON_CORS_ORIGINS` | CORS 허용 origin |
| `HORIZON_CRON` | 스케줄러 크론 |
| `HORIZON_ZONE` | 스케줄러 타임존 |
| `HORIZON_AI_SERVICE_URL` | Spring → AI 서비스 URL (로컬 `http://localhost:8000`, Docker `http://ai:8000`) |
| `AI_PORT` | Docker AI 호스트 포트 (기본 `9800`) |
| `OPENAI_API_KEY` | LLM API 키 (ai 서비스에 전달) |
| `OPENAI_MODEL` | 기본 LLM 모델 (예: `gpt-4o-mini`) |
| `JWT_SECRET` | JWT 서명 (로그인 사용 시) |

---

## 7. 백엔드 패키지 구조

```
com.{company}.{project}/
├── {Project}Application.java
├── config/              # WebConfig, QuerydslConfig, RestClientConfig, AiClientConfig, FrontendSpaConfig
├── common/
│   ├── entity/          # BaseEntity
│   ├── exception/       # BusinessException, ErrorCode, GlobalExceptionHandler
│   └── response/        # ApiResponse, PageResponse
├── {domain}/            # weather, scenario, insight …
│   ├── controller/
│   ├── service/
│   ├── repository/      # JpaRepository + Custom/Impl
│   ├── entity/
│   ├── dto/
│   └── mapper/        # MapStruct
├── ai/                  # Python AI 서비스 클라이언트 (RestClient)
│   ├── client/          # AiServiceClient
│   └── dto/             # AnalyzeCommand, InsightResult …
├── crawler/             # 외부 API 클라이언트 (기상청, NASA 등)
└── scheduler/           # @Scheduled, Job 엔티티, SSE 스트림
```

**레이어 규칙**
- Controller → Service → Repository (단방향)
- DTO는 API 경계에서만 사용, Entity는 Service 이하
- 외부 API 응답은 `crawler/{source}/dto/`에 격리
- AI 호출은 Service → `ai/client/AiServiceClient` 경유 (Controller에서 Python 직접 호출 금지)

---

## 8. 선정 이유 (의사결정 기록)

| 결정 | 이유 |
|------|------|
| Java 21 + Spring Boot 3.5 | LTS, Records, 성숙한 생태계, JPA·스케줄러 내장 |
| PostgreSQL | JSON·시계열 이력·안정성, Docker 공식 이미지 |
| QueryDSL | 타입 안전 동적 쿼리, JPA와 자연스러운 통합 |
| MapStruct | 컴파일 타임 매핑, 런타임 리플렉션 없음 |
| React 19 + Vite 8 | 빠른 HMR, 최신 React 기능 |
| TanStack Query | 서버 상태 캐시·폴링·에러 재시도 표준화 |
| Tailwind 4 + shadcn 스타일 | 빠른 UI 구축, 디자인 시스템 유연성 |
| AG Grid | 대량 데이터 테이블 (정렬·필터·가상 스크롤) |
| Docker Compose | 로컬·운영 환경 일치, DB 격리 |
| JWT + Spring Security 6 | Access/Refresh, `USER`/`ADMIN` 역할, 관리자 `/api/admin/**` |
| Python + FastAPI (별도 서비스) | AI·데이터 과학 생태계, Spring과 역할 분리 |
| LangChain + OpenAI SDK | LLM 체인·프롬프트 관리와 직접 호출 모두 지원 |
| pandas + xarray | 표·격자 기상 데이터 가공에 적합 |
| Spring → AI RestClient | API Key 보호, 단일 진입점, Job·SSE 패턴 재사용 |

---

## 9. Cursor 부트스트랩 · 다른 프로젝트 이식

**전용 문서:** [BOOTSTRAP.md](BOOTSTRAP.md) — Agent 프롬프트·복사 파일 목록·완료 기준

### 9.1 한 줄로 시작 (복사용)

```
@docs/template/BOOTSTRAP.md @docs/template/TECH_STACK.md @docs/onboarding/SETUP.md

Horizon(git@github.com:ktdvlp-jih/horizon.git)과 동일 스택·인프라로 `{PROJECT_NAME}` 부트스트랩.
경로 `{WORKSPACE_PATH}`, GitHub `{GITHUB_REPO}`, slug `{PROJECT_SLUG}`.
BOOTSTRAP.md §2·§3 순서대로. Self-hosted Runner 금지.
```

상세는 **[BOOTSTRAP.md](BOOTSTRAP.md)** · **[README.md](README.md)** 참고.

---

## 10. 초기 생성 체크리스트

### 백엔드
- [ ] `build.gradle.kts` — Spring Boot 3.5, Java 21, QueryDSL, MapStruct, Lombok
- [ ] `application.yml` — datasource, JPA, Jackson timezone
- [ ] `BaseEntity`, `ApiResponse`, `PageResponse`, `GlobalExceptionHandler`
- [ ] `QuerydslConfig`, `WebConfig` (CORS, 정적 파일)
- [ ] `RestClientConfig` (HttpClient), `AiClientConfig` (AI 서비스 전용 RestClient)
- [ ] `ai/client/AiServiceClient` — Python FastAPI 호출
- [ ] 도메인 패키지 1개 이상 (CRUD 예시)

### AI 서비스
- [ ] `ai/pyproject.toml` — FastAPI, uvicorn, pandas, LangChain, openai
- [ ] `app/main.py`, `app/config.py` (pydantic-settings)
- [ ] `routers/health.py`, `routers/analyze.py`
- [ ] `services/llm_service.py` — LLM 호출 래퍼
- [ ] `ai/Dockerfile` — python:3.12-slim 멀티스테이지
- [ ] `ai/.env.example` — OPENAI_API_KEY, OPENAI_MODEL

### 프론트엔드
- [ ] `npm create vite@latest frontend -- --template react-ts`
- [ ] Tailwind 4 (`@tailwindcss/vite`), path alias `@`
- [ ] React Query, React Router, Axios 설치
- [ ] `api/client.ts`, `lib/apiBase.ts`, `lib/utils.ts`
- [ ] `App.tsx` — Provider + Router 조립
- [ ] `components/ui/button.tsx` (shadcn 스타일)

### 인프라 · 배포 파이프라인
- [ ] `compose.yaml` — postgres:17 + app + ai (포트 55432/9080/9800)
- [ ] `Dockerfile`, `ai/Dockerfile` — 멀티스테이지
- [ ] `.env.example`, `.env.dev.example`, `.env.dev.remote.example`
- [ ] `.github/workflows/deploy.yml` — Tailscale + SSH
- [ ] `scripts/deploy-docker.ps1`, `deploy-docker-trigger.ps1`
- [ ] `scripts/setup-deploy-task.ps1`, `setup-deploy-ssh.ps1`, `setup_openssh_tunnel.ps1`
- [ ] `scripts/setup-github-ssh.ps1`, `ssh-db-tunnel-tailscale.bat`
- [ ] `docs/template/` — TECH_STACK, BOOTSTRAP, README
- [ ] `docs/onboarding/` — SETUP, DEV_SETUP, DEPLOY, SESSION_HANDOFF
- [ ] `README.md` — onboarding/SETUP.md 링크

---

## 11. 참고 명령어

```powershell
# === 로컬 개발 (Tailscale DB, 권장) ===
.\scripts\ssh-db-tunnel-tailscale.bat    # 터미널 1 — 창 유지
cd ai && python -m uvicorn app.main:app --reload --port 8000
.\gradlew.bat bootRun
cd frontend && npm run dev

# === 집 PC Docker 배포 ===
.\scripts\deploy-docker.ps1
# 또는: git pull origin master && docker compose up -d --build

# === 테스트 ===
.\gradlew test
cd ai && python -m pytest
cd frontend && npm run lint
```

상세: [SETUP.md](../onboarding/SETUP.md) · [DEV_SETUP.md](../onboarding/DEV_SETUP.md) · [DEPLOY.md](../onboarding/DEPLOY.md) · [SESSION_HANDOFF.md](../onboarding/SESSION_HANDOFF.md)

---

*기준: `price-tracker` 패턴 · Horizon 검증 인프라 · [BOOTSTRAP.md](BOOTSTRAP.md)로 다른 레포 이식*
