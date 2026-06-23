# Horizon 전체 설정 가이드

> 집 PC Docker + Tailscale + GitHub Actions 자동 배포 + 개발 PC 원격 DB  
> **클라oud DB 없음 · 0원 · 공유기 포트포워딩 불필요**

다른 사용자/PC도 이 문서 **위에서부터 순서대로** 진행하면 동일한 환경을 구성할 수 있습니다.

---

## 0. 역할과 구조

### PC 역할

| PC | 역할 | 항상 켜 둘 것 |
|----|------|----------------|
| **집 PC (Home)** | Docker: Postgres + Spring + AI · 배포 대상 | Docker Desktop, Tailscale, Windows 로그인, `sshd` |
| **개발 PC (Dev)** | 코드 작성 · Spring/Vite/AI 로컬 실행 | Tailscale (DB 터널 시) |
| **GitHub** | 소스 · Actions 자동 배포 | — |

### 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│ 개발 PC                                                          │
│  git commit/push ──────────────────────────▶ GitHub             │
│  Spring :8080  Vite :5173  AI :8000 (로컬)                       │
│       │                                                          │
│       └── SSH 터널 localhost:55432 ──Tailscale──▶ 집 PC DB      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ GitHub Actions (클라oud)                                         │
│  Tailscale 가입 → SSH → deploy-docker-trigger.ps1               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 집 PC                                                            │
│  예약 작업 → git pull → docker compose build/up                  │
│  http://localhost:9080  (DB 컨테이너 유지, app/ai 재빌드)        │
│  trycloudflare → 외부 데모 URL                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 포트 요약

| 서비스 | 개발 PC (로컬) | 집 PC (Docker) |
|--------|----------------|----------------|
| 사용자 앱 | 5173 | **9080** |
| Spring API | 8080 | (컨테이너 8080→9080) |
| AI | 8000 | **9800** |
| Postgres | **55432** (터널 입구) | **55432** |
| 관리자 | 5174 | `/admin` on 9080 |

---

## 1. 공통 — 레포 클론

```powershell
git clone git@github.com:ktdvlp-jih/horizon.git e:\workspace\horizon
cd e:\workspace\horizon
```

SSH clone 설정: [7. Git push SSH 설정](#7-git-push-ssh-설정-개발-pc--집-pc-각-1회)

---

## 2. 집 PC 1회 설정 (Home)

> **관리자 PowerShell**이 필요한 단계는 반드시 **「관리자 권한으로 실행」** 으로 엽니다.

### 2-1. Docker + 환경 파일

```powershell
cd e:\workspace\horizon
copy .env.example .env
# .env 편집: POSTGRES_PASSWORD, JWT_SECRET 등 (git에 올리지 않음)

docker compose up -d --build
docker compose ps
curl http://localhost:9080/api/health   # 200
```

### 2-2. Tailscale

1. https://tailscale.com/download → 설치
2. 팀/개인 **동일 Tailscale 계정**으로 로그인 (개발 PC와 같아야 함)
3. IP 확인 (나중에 Secrets·터널에 사용):

```powershell
& "C:\Program Files\Tailscale\tailscale.exe" ip -4
# 예: 100.x.x.x  ← HOME_TAILSCALE_IP 로 기록
```

### 2-3. OpenSSH 서버

```powershell
Get-Service sshd   # Running 확인
```

`Stopped`면 **관리자 PowerShell**:

```powershell
cd e:\workspace\horizon
Set-ExecutionPolicy -Scope Process Bypass -Force
.\scripts\setup_openssh_tunnel.ps1
```

### 2-4. Actions 배포 SSH 키

**관리자 PowerShell**:

```powershell
cd e:\workspace\horizon
.\scripts\setup-deploy-ssh.ps1
```

- 끝에 **`[ok] SSH key auth works`** 확인
- 출력 **private key 전체** (`BEGIN`~`END`) → [3-2 GitHub Secrets](#3-2-github-secrets) `DEPLOY_SSH_KEY`

> Windows **관리자 계정**은 `~/.ssh/authorized_keys`가 아니라  
> `C:\ProgramData\ssh\administrators_authorized_keys` 를 사용합니다. 스크립트가 자동 처리합니다.

### 2-5. Docker 배포 예약 작업

SSH 세션에서 `docker compose build`를 직접 실행하면 credential 오류가 납니다.  
**관리자 PowerShell**:

```powershell
.\scripts\setup-deploy-task.ps1
```

테스트:

```powershell
schtasks /run /tn HorizonGitHubDeploy
# 1~2분 후
Get-Content e:\workspace\horizon\.deploy-status.json   # "status":"success"
```

### 2-6. GitHub pull 인증 (배포 시 git pull)

```powershell
git pull origin master
```

실패 시: GitHub PAT(`repo`)를 Windows 자격 증명 관리자에 저장하거나 SSH remote 사용.

### 2-7. Git push SSH (집 PC에서도 push할 경우)

[7. Git push SSH 설정](#7-git-push-ssh-설정-개발-pc--집-pc-각-1회)

**집 PC 1회 설정 체크리스트**

- [ ] `docker compose up -d` · `/api/health` 200
- [ ] Tailscale IP 기록 (`HOME_TAILSCALE_IP`)
- [ ] `sshd` Running
- [ ] `setup-deploy-ssh.ps1` → SSH key auth OK
- [ ] `setup-deploy-task.ps1` → schtasks 테스트 success
- [ ] `git pull origin master` OK

---

## 3. GitHub 1회 설정

### 3-1. Tailscale Auth Key

1. https://login.tailscale.com/admin/settings/keys
2. **Generate auth key** — Reusable ✅, Ephemeral ✅
3. `tskey-...` 복사

### 3-2. GitHub Secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret | 값 | 예시 |
|--------|-----|------|
| `TAILSCALE_AUTHKEY` | `tskey-...` (한 줄) | |
| `DEPLOY_HOST` | 집 PC `tailscale ip -4` | `100.x.x.x` |
| `DEPLOY_USER` | 집 PC Windows 로그인명 | |
| `DEPLOY_SSH_KEY` | `setup-deploy-ssh.ps1` private key **전체** | BEGIN~END |

### 3-3. Actions 테스트

**Actions → Deploy Docker (home PC) → Run workflow** (branch: `master`)

또는 아무 커밋 `master` push.

성공: 모든 step 초록 · 집 PC `.deploy-status.json` → `"success"`

상세 트러블슈팅: [DEPLOY.md](DEPLOY.md)

**GitHub 1회 설정 체크리스트**

- [ ] Secrets 4개 등록
- [ ] Actions Run workflow 성공

---

## 4. 개발 PC 1회 설정 (Dev)

### 4-1. 도구 설치

| 도구 | 버전 |
|------|------|
| JDK | 21 |
| Node.js | 22+ |
| Python | 3.12+ |
| Tailscale | 최신 |
| Git | 최신 |

일괄 (선택): `.\scripts\setup-local-dev.ps1`

### 4-2. 레포 + 환경

```powershell
git clone git@github.com:ktdvlp-jih/horizon.git e:\workspace\horizon
cd e:\workspace\horizon

copy .env.dev.remote.example .env.dev
copy frontend\.env.example frontend\.env
copy ai\.env.example ai\.env
```

`.env.dev`의 `SPRING_DATASOURCE_PASSWORD` = 집 PC `.env`의 `POSTGRES_PASSWORD`

```powershell
cd frontend; npm install; cd ..
cd frontend-admin; npm install; cd ..
cd ai; python -m pip install -r requirements.txt; cd ..
```

### 4-3. Tailscale

집 PC와 **같은 Tailscale 계정** 로그인.

### 4-4. DB 터널 스크립트 수정

`scripts\ssh-db-tunnel-tailscale.bat`:

```bat
set TAILSCALE_IP=<HOME_TAILSCALE_IP>
set USER=<HOME_WINDOWS_USER>
```

### 4-5. Git push SSH

[7. Git push SSH 설정](#7-git-push-ssh-설정-개발-pc--집-pc-각-1회)

**개발 PC 1회 설정 체크리스트**

- [ ] JDK/Node/Python/Tailscale
- [ ] `.env.dev` + npm/pip
- [ ] `ssh-db-tunnel-tailscale.bat` IP/USER 수정
- [ ] `setup-github-ssh.ps1` + GitHub SSH key 등록
- [ ] `git push origin master` OK

---

## 5. 매일 개발 (Dev PC)

**터널 창을 먼저 열고 닫지 않습니다.**

| # | 터미널 | 명령 |
|---|--------|------|
| 1 | DB 터널 | `.\scripts\ssh-db-tunnel-tailscale.bat` |
| 2 | AI | `cd ai` → `python -m uvicorn app.main:app --reload --port 8000` |
| 3 | Backend | `.\gradlew.bat bootRun` |
| 4 | Frontend | `cd frontend` → `npm run dev` |

| 접속 | URL |
|------|-----|
| 앱 | http://localhost:5173 |
| API | http://localhost:8080/api/health |
| 관리자 | http://localhost:5174 (`admin` / `admin1234`) |
| DBeaver | `localhost:55432` / DB·User `horizon` |

연결 확인:

```powershell
$env:PGPASSWORD='<POSTGRES_PASSWORD>'
psql -h localhost -p 55432 -U horizon -d horizon -c "SELECT 1;"
```

상세: [DEV_SETUP.md](DEV_SETUP.md)

---

## 6. 배포 (코드 반영)

```powershell
git add .
git commit -m "변경 내용"
git push origin master
```

→ GitHub Actions **Deploy Docker (home PC)** 자동 실행  
→ 집 PC Docker app/ai 재빌드 (DB 유지)

**집 PC 조건:** Windows **로그인** + Docker Desktop **실행 중**

수동 배포 (집 PC): `.\scripts\deploy-docker.ps1`

---

## 7. Git push SSH 설정 (개발 PC · 집 PC 각 1회)

OAuth(Cursor 기본)는 workflow 파일 push 시 `workflow` scope 오류가 납니다. **SSH push 권장.**

```powershell
cd e:\workspace\horizon
Set-ExecutionPolicy -Scope Process Bypass -Force
.\scripts\setup-github-ssh.ps1
```

1. 출력 **공개키** → https://github.com/settings/ssh/new
2. 테스트:

```powershell
ssh -T git@github.com
# Hi <username>! You've successfully authenticated...
```

3. push:

```powershell
git push origin master
```

> PC마다 **별도 키** 등록. `~/.ssh/config` BOM 오류 시 `setup-github-ssh.ps1` 재실행.

---

## 8. 외부 데모 URL (집 PC)

```powershell
docker compose up -d
.\scripts\start_trycloudflare.bat
```

터미널의 `https://xxx.trycloudflare.com` 공유 (재실행 시 URL 변경).

상세: [CLOUDFLARE_TUNNEL.md](CLOUDFLARE_TUNNEL.md)

---

## 9. 다른 PC에서 이어하기

1. `git pull`
2. [4. 개발 PC 1회 설정](#4-개발-pc-1회-설정-dev) (해당 PC만)
3. `.env` / `.env.dev` 는 git 제외 → USB·비밀관리자로 복사
4. [SESSION_HANDOFF.md](SESSION_HANDOFF.md) · Cursor export 참고

---

## 10. 트러블슈팅 요약

| 증상 | 문서 |
|------|------|
| Actions Tailscale/SSH 실패 | [DEPLOY.md](DEPLOY.md) |
| SSH permission denied (관리자) | `setup-deploy-ssh.ps1` **관리자** PowerShell |
| Docker credential / logon session | `setup-deploy-task.ps1` + 집 PC 로그인 유지 |
| DB 연결 실패 (개발 PC) | 터널 창 열림? `.env.dev` 비밀번호? |
| push workflow scope 오류 | [7. Git push SSH](#7-git-push-ssh-설정-개발-pc--집-pc-각-1회) |
| AhnLab hosts 알림 | Tailscale 예외 등록 — [DEPLOY.md](DEPLOY.md) |

---

## 11. 관련 문서

- [docs/README.md](README.md) — 문서 목록
- [DEV_SETUP.md](DEV_SETUP.md) — 개발 PC 상세
- [DEPLOY.md](DEPLOY.md) — 배포·Actions 상세
- [CLOUDFLARE_TUNNEL.md](CLOUDFLARE_TUNNEL.md) — 데모 URL
- [SESSION_HANDOFF.md](SESSION_HANDOFF.md) — PC 전환·맥락 동기화
