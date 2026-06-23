# 개발 PC 설정 (로컬 실행)

> **전체 순서:** [SETUP.md](SETUP.md) · **배포:** [DEPLOY.md](DEPLOY.md)

개발 PC에서는 **Spring + Vite + AI만 로컬** 실행하고, **DB는 집 PC Docker Postgres**에 Tailscale SSH 터널로 연결합니다.

---

## 전제

- [SETUP.md §4](SETUP.md#4-개발-pc-1회-설정-dev) 1회 설정 완료
- 집 PC: `docker compose up db -d` (또는 전체 스택) + `sshd` Running

---

## 사전 요구사항

| 도구 | 버전 |
|------|------|
| JDK | 21 |
| Node.js | 22+ |
| Python | 3.12+ |
| Tailscale | 최신 (집 PC와 **같은 계정**) |
| OpenSSH Client | Windows 기본 |

---

## 1회 설정

```powershell
cd e:\workspace\horizon

copy .env.dev.remote.example .env.dev
copy frontend\.env.example frontend\.env
copy ai\.env.example ai\.env

# 또는
.\scripts\setup-local-dev.ps1
```

### Tailscale + 터널 스크립트

1. Tailscale 로그인 (집 PC와 동일 계정)
2. 집 PC IP: `tailscale ip -4` → `HOME_TAILSCALE_IP`
3. `scripts\ssh-db-tunnel-tailscale.bat` 수정:

```bat
set TAILSCALE_IP=<HOME_TAILSCALE_IP>
set USER=<HOME_WINDOWS_USER>
```

### `.env.dev` 핵심

```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:55432/horizon
SPRING_DATASOURCE_USERNAME=horizon
SPRING_DATASOURCE_PASSWORD=<집 PC POSTGRES_PASSWORD>
HORIZON_AI_SERVICE_URL=http://localhost:8000
```

템플릿: [`.env.dev.remote.example`](../.env.dev.remote.example)

---

## 매일 실행 (4터미널)

**터널을 먼저 열고 창을 유지**합니다.

| # | 명령 |
|---|------|
| 1 | `.\scripts\ssh-db-tunnel-tailscale.bat` |
| 2 | `cd ai` → `python -m uvicorn app.main:app --reload --port 8000` |
| 3 | `.\gradlew.bat bootRun` |
| 4 | `cd frontend` → `npm run dev` |

관리자 (선택): `cd frontend-admin` → `npm run dev`

---

## 접속 URL

| 대상 | URL |
|------|-----|
| 사용자 앱 | http://localhost:5173 |
| API | http://localhost:8080/api/health |
| 관리자 | http://localhost:5174 |
| AI | http://localhost:8000/health |
| DBeaver | Host `localhost`, Port `55432`, DB/User `horizon` |

---

## 연결 확인

```powershell
# DB (터널 연 후)
$env:PGPASSWORD='<password>'
psql -h localhost -p 55432 -U horizon -d horizon -c "SELECT 1;"

# API
curl http://localhost:8080/api/health
```

---

## 대안

| 방식 | 스크립트 | 언제 |
|------|----------|------|
| Tailscale DB 터널 | `ssh-db-tunnel-tailscale.bat` | **권장** |
| 공유기 SSH | `ssh-db-tunnel-public.bat` | Tailscale 미사용 |
| 로컬 Docker DB | `.env.dev.example` + `docker compose up db -d` | 오프라인 단독 |

---

## 코드 → 배포

```powershell
git commit -am "변경"
git push origin master
```

→ [DEPLOY.md](DEPLOY.md) Actions 자동 배포

---

## 스크립트

| 파일 | 용도 |
|------|------|
| `setup-local-dev.ps1` | 1회: Node/Python/npm |
| `setup-github-ssh.ps1` | 1회: Git push SSH |
| `ssh-db-tunnel-tailscale.bat` | 매일: DB 터널 |
| `start-local-dev.bat` | AI+Spring+Frontend (터널 별도) |

---

## 다른 PC

[SESSION_HANDOFF.md](SESSION_HANDOFF.md) · [SETUP.md §9](SETUP.md#9-다른-pc에서-이어하기)
