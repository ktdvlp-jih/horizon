# 기술 스택 선정 문서

> **용도:** 새 프로젝트를 Cursor로 부트스트랩할 때 이 문서 전체를 컨텍스트로 붙여 넣으세요.  
> **기준 프로젝트:** `price-tracker` (패턴) · **대상 프로젝트:** `horizon` (기상 데이터 + AI)  
> **작성일:** 2026-06-18

---

## 1. 프로젝트 성격

| 항목 | 내용 |
|------|------|
| 유형 | 풀스택 웹 애플리케이션 + AI 서비스 (Monorepo) |
| 백엔드 | REST API + 스케줄러 + 외부 API 연동 + AI 오케스트레이션 |
| 프론트엔드 | SPA (관리/조회 UI, 테이블·차트, AI 인사이트 표시) |
| AI | Python 마이크로서비스 (LLM·데이터 분석·추론) |
| 배포 | 로컬 개발 / Docker Compose / Cloudflare Tunnel(선택) |
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
           · Cloudflare Tunnel (외부 데모, 선택)
```
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
- **역할:** `USER`, `ADMIN` (`app_user.role`). 관리 API는 `/api/admin/**` + `hasRole('ADMIN')` — [admin_PROMPT.md](admin_PROMPT.md)
- **CORS:** `HORIZON_CORS_ORIGINS` (쉼표 구분, 예: `http://localhost:5173,http://localhost:5174`) + `https://*.trycloudflare.com` 패턴 허용

### 3.10 스케줄러

- Spring `@Scheduled` (크론 표현식, `Asia/Seoul`)
- 장시간 작업: 백그라운드 Job 엔티티 + 폴링 API
- 실시간 진행률: **SSE** (`/api/**/stream`) — `SseEmitter` + 인터셉터

### 3.11 정적 파일 / SPA 서빙

- 이미지: `storage/images` → `/files/images/**` 로 서빙
- 프로덕션 SPA: `HORIZON_SERVE_FRONTEND=true` 시 `frontend/dist`를 Spring Boot에서 서빙 (단일 포트 배포용)

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

**관리자 앱** (`frontend-admin/`, dev 포트 **5174** — [admin_PROMPT.md](admin_PROMPT.md)로 구현)

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

### 6.3 포트 규칙 (로컬·Docker 동시 실행 가능)

| 환경 | API (Spring) | AI (FastAPI) | PostgreSQL (호스트) | Vite dev |
|------|--------------|--------------|---------------------|----------|
| 로컬 개발 | `8080` | `8000` | `5432` (PC PG) / `55432` (Docker DB) | 사용자 `5173`, 관리자 `5174` |
| Docker | `9080` | `9800` | `55432` | — (dist 빌드 후 Spring 서빙) |

### 6.4 실행 방식 4가지

1. **로컬 개발 (전체):** `gradlew bootRun` + `uvicorn` (ai) + `npm run dev` (frontend `:5173`, frontend-admin `:5174`)
2. **로컬 개발 (AI 제외):** Spring + Vite만 — AI 미기동 시 해당 API graceful degrade
3. **Docker 전체:** `docker compose up` (DB + Spring + AI, 프론트 prod 빌드)
4. **외부 데모:** Cloudflare Tunnel + `HORIZON_SERVE_FRONTEND=true`

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

---

## 7. 백엔드 패키지 구조

```
com.{company}.{project}/
├── HorizonApplication.java
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

## 9. Cursor 부트스트랩 프롬프트 (복사용)

아래 블록을 새 Cursor 채팅에 그대로 붙여 넣으세요.

---

```
이 프로젝트는 아래 기술 스택·구조를 따릅니다. price-tracker와 동일한 패턴 + AI 서비스로 초기 세팅해 주세요.

## 스택
- Backend: Java 21, Spring Boot 3.5, Gradle 8 (Kotlin DSL), PostgreSQL 17
  - Spring Web, Data JPA, Validation
  - QueryDSL 5 (jakarta), MapStruct, Lombok
  - RestClient + Java HttpClient (외부 API, AI 서비스)
  - @Scheduled 크론, SSE 스트림 (장시간 작업·LLM 스트리밍)
- Frontend: React 19, TypeScript 6, Vite 8, Tailwind CSS 4
  - TanStack React Query 5, React Router 7, Axios
  - AG Grid Community, Recharts, Radix/shadcn 스타일 UI
- AI: Python 3.12, FastAPI, Uvicorn, uv, Pydantic v2
  - httpx, pandas, NumPy, LangChain, openai
  - scikit-learn, xarray (선택)
- Infra: Docker Compose (postgres:17 + eclipse-temurin:21 + python:3.12-slim), .env 기반 설정

## 구조
- Monorepo: 루트 백엔드 + frontend/ + ai/
- 백엔드 패키지: config, common, {domain}/, ai/(client|dto), crawler, scheduler
- AI 패키지: app/(routers|services|schemas|core), pyproject.toml
- API 응답: ApiResponse<T> 래퍼, PageResponse<T> 페이징
- 예외: BusinessException + ErrorCode + GlobalExceptionHandler
- Entity: BaseEntity (createdAt, updatedAt), open-in-view: false
- 프론트: api/, hooks/, pages/, components/ui/, types/, lib/
- Axios apiClient + X-API-Key 인터셉터
- 연동: React → Spring /api → Python /internal/v1 (프론트는 Python 직접 호출 금지)

## 포트
- 로컬: API 8080, AI 8000, Vite 5173, PG 5432 또는 Docker PG 55432
- Docker: API 9080, AI 9800, PG 55432
- Vite proxy: /api, /files → 백엔드

## 배포 옵션
1. gradlew bootRun + uvicorn (ai) + npm run dev
2. docker compose up (frontend dist 빌드 후 Spring SPA 서빙)
3. Cloudflare Tunnel + SERVE_FRONTEND=true

## 타임존
Asia/Seoul (JPA, Jackson, 스케줄러)

## 하지 말 것
- Spring Security 전체 도입 (API Key 인터셉터만)
- WebFlux
- open-in-view: true
- 프론트에 UI 프레임워크 추가 (MUI, Ant Design 등) — Tailwind + shadcn 스타일 유지
- 프론트에서 LLM API Key 사용 또는 Python 직접 호출
- Celery / Redis / Kafka (초기)

프로젝트명: Horizon
도메인 설명: AI와 실시간 기상 데이터로 탐험하는 인터랙티브 웹앱
```

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

### 인프라
- [ ] `compose.yaml` — postgres:17 + app + ai
- [ ] `Dockerfile` — 멀티스테이지 Temurin 21
- [ ] `.env.example` — 포트·DB·API Key·AI·LLM 변수
- [ ] `README.md` — 4가지 실행 방식 문서화

---

## 11. 참고 명령어

```powershell
# 백엔드
.\gradlew bootRun

# AI 서비스 (로컬)
cd ai
uv sync
uv run uvicorn app.main:app --reload --port 8000

# 프론트 (개발)
cd frontend
npm install
npm run dev

# 프론트 (프로덕션 빌드)
npm run build

# Docker 전체
docker compose up --build

# 테스트
.\gradlew test
cd ai && uv run pytest
cd frontend && npm run lint
```

---

*이 문서는 `price-tracker` 저장소의 실제 구현을 기준으로 하며, Horizon 프로젝트용 AI 스택을 확장하였습니다.*
