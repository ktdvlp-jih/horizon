# 로컬 개발 환경 (Docker 없이)

> **권장 워크플로:** 이 PC에서 코드 작성 → Git push → `master` 병합 시 **집 PC Docker 자동 재빌드**  
> 로컬에서는 Spring + Vite + AI만 실행하고, DB는 **집 PC Docker Postgres**에 Tailscale SSH 터널로 연결합니다.

---

## 사전 요구사항

| 도구 | 버전 | 용도 |
|------|------|------|
| JDK | 21 | `gradlew bootRun` |
| Node.js | 22+ | `frontend`, `frontend-admin` |
| Python | 3.12+ | `ai` FastAPI |
| Tailscale | 최신 | 집 PC ↔ 개발 PC VPN (공유기 포트포워딩 불필요) |
| OpenSSH Client | Windows 기본 | DB SSH 터널 |

집 PC에는 **Docker Compose** (`compose.yaml`)로 `db` / `ai` / `app`이 실행 중이어야 합니다.

---

## 최초 1회 설정

```powershell
cd e:\workspace\horizon

# 환경 파일
copy .env.dev.remote.example .env.dev
copy frontend\.env.example frontend\.env
copy ai\.env.example ai\.env

# 의존성 (scripts\setup-local-dev.ps1 로 일괄 가능)
cd frontend && npm install && cd ..
cd frontend-admin && npm install && cd ..
cd ai && python -m pip install -r requirements.txt && cd ..
```

### Tailscale

1. **집 PC**·**개발 PC** 모두 [Tailscale](https://tailscale.com/download) 설치, **같은 계정** 로그인
2. 집 PC에서 IP 확인: `tailscale ip -4` (예: `100.117.145.80`)
3. `scripts\ssh-db-tunnel-tailscale.bat` 의 `TAILSCALE_IP`가 집 PC IP와 일치하는지 확인

### 집 PC (DB 서버)

```powershell
docker compose up db -d          # 최소 DB만 (개발 시)
# 또는
docker compose up -d --build     # 전체 스택 (배포/데모)

Get-Service sshd                 # Running
```

---

## 매일 개발 실행 (4터미널)

**터널을 먼저 열고 창을 유지**합니다. 닫으면 DB 연결이 끊깁니다.

### 터미널 1 — DB SSH 터널 (Tailscale)

```powershell
cd e:\workspace\horizon
.\scripts\ssh-db-tunnel-tailscale.bat
# 또는: ssh -L 55432:localhost:55432 전일훈@100.117.145.80
```

### 터미널 2 — AI (로컬 Python)

```powershell
cd e:\workspace\horizon\ai
python -m uvicorn app.main:app --reload --port 8000
```

### 터미널 3 — Backend (Spring)

```powershell
cd e:\workspace\horizon
.\gradlew.bat bootRun
```

`bootRun`은 `.env.dev`를 자동 로드합니다 (`SPRING_PROFILES_ACTIVE=dev`).

### 터미널 4 — Frontend

```powershell
cd e:\workspace\horizon\frontend
npm run dev
```

### (선택) 관리자 콘솔

```powershell
cd e:\workspace\horizon\frontend-admin
npm run dev
```

---

## 접속 URL

| 대상 | URL / 접속 정보 |
|------|-----------------|
| 사용자 앱 | http://localhost:5173 |
| 관리자 | http://localhost:5174 (`admin` / `admin1234`) |
| API 헬스 | http://localhost:8080/api/health |
| AI 헬스 | http://localhost:8000/health |
| **DBeaver** | Host `localhost`, Port `55432`, DB `horizon`, User/Pass `horizon` |

DBeaver·Spring 모두 **터널이 열린 상태**에서 `localhost:55432`로 접속합니다. Tailscale IP로 Postgres에 직접 붙지 않습니다.

---

## `.env.dev` 핵심 (원격 DB)

```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:55432/horizon
SPRING_DATASOURCE_USERNAME=horizon
SPRING_DATASOURCE_PASSWORD=horizon
HORIZON_AI_SERVICE_URL=http://localhost:8000
```

템플릿: [`.env.dev.remote.example`](../.env.dev.remote.example)

---

## 연결 확인

```powershell
# DB (터널 연 후)
$env:PGPASSWORD='horizon'
psql -h localhost -p 55432 -U horizon -d horizon -c "SELECT 1;"

# API
curl http://localhost:8080/api/health
```

---

## 대안 실행 방식

| 방식 | 언제 |
|------|------|
| [Tailscale SSH 터널](../scripts/ssh-db-tunnel-tailscale.bat) | **권장** — 밖에서 집 Docker DB 사용 |
| [공유기 포트포워딩 + SSH](../scripts/ssh-db-tunnel-public.bat) | Tailscale 미사용 시 |
| `docker compose up db -d` (이 PC) | 로컬 Docker DB, `.env.dev.example` (5432) |
| `docker compose up --build` (집 PC) | 배포·외부 데모 — [DEPLOY.md](DEPLOY.md) |

---

## 스크립트 요약

| 스크립트 | 설명 |
|----------|------|
| `scripts/setup-local-dev.ps1` | Node/Python/npm 초기 설정 |
| `scripts/ssh-db-tunnel-tailscale.bat` | Tailscale 경유 DB 터널 |
| `scripts/ssh-db-tunnel-public.bat` | 공인 IP SSH 터널 |
| `scripts/start-local-dev.bat` | AI+Spring+Frontend 로컬 기동 (터널 별도) |
| `scripts/deploy-docker.ps1` | 집 PC Docker 재빌드 (배포) |

---

## 다른 PC에서 작업 이어가기

[SESSION_HANDOFF.md](SESSION_HANDOFF.md) · `docs/chat-exports/` 참고.
