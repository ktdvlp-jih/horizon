# 개발 PC 설정 (로컬 실행)

> **전체 순서:** [SETUP.md](SETUP.md) · **Ubuntu 서버:** [UBUNTU_SERVER_SETUP.md](UBUNTU_SERVER_SETUP.md) §7-3  
> **배포:** Ubuntu Self-hosted Runner — [UBUNTU_SERVER_SETUP.md §3](UBUNTU_SERVER_SETUP.md#3-자동-배포--self-hosted-runner-tailscale-없이)

개발 PC(Windows · macOS)에서는 **Spring + Vite + AI만 로컬** 실행하고, **DB는 Ubuntu Docker Postgres**에 Tailscale SSH 터널로 연결합니다.

```
[개발 PC] localhost:55432 ──SSH -L──► [Ubuntu Tailscale 100.x.x.x] ──► Docker Postgres
```

---

## 전제

| 항목 | 확인 |
|------|------|
| Ubuntu | Docker `horizon-db-1` Up · `sshd` · **Tailscale** (`sudo tailscale up`) |
| 개발 PC | JDK 21 · Node 22+ · Python 3.12+ · **Tailscale (Ubuntu와 같은 계정)** |
| DB 포트 | Ubuntu 호스트 **55432** (인터넷 개방 ❌) |

Ubuntu Tailscale IP 확인 (서버 SSH):

```bash
tailscale ip -4    # 예: 100.x.x.x — 아래 스크립트·문서에 기록
```

---

## OS별 가이드

| OS | 문서 |
|----|------|
| **Windows** (회사·집 PC) | 아래 [Windows 1회 설정](#windows-1회-설정) · [매일 실행](#매일-실행-windows) |
| **macOS** (맥북) | [UBUNTU_SERVER_SETUP.md §7-3 macOS](UBUNTU_SERVER_SETUP.md#macos-맥북--테스트개발-pc) |
| Ubuntu (서버) | [UBUNTU_SERVER_SETUP.md §7-3](UBUNTU_SERVER_SETUP.md#7-3-db--회사외부-개발-pc-tailscale--ssh-터널) |

---

## Windows — 1회 설정

### 1) Tailscale (명령어)

PowerShell **관리자**:

```powershell
# 설치 후 CLI (경로 고정)
$ts = "C:\Program Files\Tailscale\tailscale.exe"

# 로그인 — URL 출력 → 브라우저에서 Ubuntu와 **같은 계정** 승인
& $ts up

# 확인
& $ts status
& $ts ip -4
```

Ubuntu가 목록에 **active** 인지 확인. IP는 Ubuntu에서 `tailscale ip -4` 값 사용.

### 2) SSH 키 (최초 1회)

PowerShell:

```powershell
# 키 없으면 생성
if (-not (Test-Path "$env:USERPROFILE\.ssh\id_ed25519")) {
  ssh-keygen -t ed25519 -C "win-horizon-dev" -f "$env:USERPROFILE\.ssh\id_ed25519"
}

# Ubuntu Tailscale IP — 본인 값으로 변경
$ubuntuIp = "100.x.x.x"

# 공개키 등록 (비밀번호 1회)
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh jeon@${ubuntuIp} "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

# 테스트
ssh jeon@$ubuntuIp echo ok
```

같은 집 LAN만: `$ubuntuIp = "192.168.219.100"`

### 3) 레포 · env

```powershell
cd e:\workspace\horizon   # clone 경로에 맞게

git pull

copy .env.dev.remote.example .env.dev
copy frontend\.env.example frontend\.env
copy ai\.env.example ai\.env

# 또는 Node/Python 1회
.\scripts\setup-local-dev.ps1
```

`.env.dev` — `HORIZON_KMA_API_KEY` 등 필요 값 채우기. DB URL은 템플릿 그대로:

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:55432/horizon
SPRING_DATASOURCE_USERNAME=horizon
SPRING_DATASOURCE_PASSWORD=horizon
HORIZON_AI_SERVICE_URL=http://localhost:8000
```

템플릿: [`.env.dev.remote.example`](../../.env.dev.remote.example)

### 4) DB 터널 스크립트

`scripts\ssh-db-tunnel-tailscale.bat` — **Ubuntu Tailscale IP**만 수정:

```bat
set TAILSCALE_IP=100.x.x.x
set SSH_USER=jeon
```

또는 IP 인자로:

```powershell
.\scripts\ssh-db-tunnel-tailscale.bat 100.x.x.x
```

PowerShell 대안: `.\scripts\ssh-db-tunnel-tailscale.ps1 -TailscaleIp 100.x.x.x -User jeon`

### 5) Git push SSH (PC마다 1회)

```powershell
.\scripts\setup-github-ssh.ps1
```

---

## 매일 실행 (Windows)

**터널을 먼저 열고 창을 유지**합니다.

| # | 터미널 | 명령 |
|---|--------|------|
| 1 | DB 터널 | `.\scripts\ssh-db-tunnel-tailscale.bat` |
| 2 | AI | `cd ai` → `python -m uvicorn app.main:app --reload --port 8000` |
| 3 | Spring | `.\gradlew.bat bootRun` |
| 4 | Frontend | `cd frontend` → `npm run dev` |

관리자 (선택): `cd frontend-admin` → `npm run dev`

---

## 접속 URL

| 대상 | URL |
|------|-----|
| 사용자 앱 | http://localhost:5173 |
| API | http://localhost:8080/api/health |
| 관리자 | http://localhost:5174 |
| AI | http://localhost:8000/health |
| DBeaver | Host `localhost`, Port `55432`, DB/User `horizon`, Password `horizon` |

---

## 연결 확인 (Windows)

```powershell
# DB (터널 연 후)
Test-NetConnection -ComputerName localhost -Port 55432

# psql 있으면
$env:PGPASSWORD='horizon'
psql -h localhost -p 55432 -U horizon -d horizon -c "SELECT 1;"

# API (bootRun 후)
curl http://localhost:8080/api/health
```

---

## 대안

| 방식 | 스크립트 / 명령 | 언제 |
|------|-----------------|------|
| Tailscale DB 터널 | `ssh-db-tunnel-tailscale.bat` | **권장** (회사·외부) |
| LAN SSH 터널 | `ssh -L 55432:localhost:55432 jeon@192.168.219.100` | 같은 집 Wi‑Fi |
| 로컬 Docker DB | `.env.dev.example` + `docker compose up db -d` | 오프라인 단독 |

---

## 코드 → 배포

```powershell
git commit -am "변경"
git push origin master
```

→ Ubuntu Self-hosted Runner → `deploy-docker.sh` — [UBUNTU_SERVER_SETUP.md §3](UBUNTU_SERVER_SETUP.md#3-자동-배포--self-hosted-runner-tailscale-없이)

---

## 스크립트

| 파일 | OS | 용도 |
|------|-----|------|
| `setup-local-dev.ps1` | Windows | 1회: Node/Python/npm |
| `setup-github-ssh.ps1` | Windows | 1회: Git push SSH |
| `ssh-db-tunnel-tailscale.bat` | Windows | 매일: DB 터널 |
| `ssh-db-tunnel-tailscale.ps1` | Windows | bat와 동일 (PowerShell) |
| `ssh-db-tunnel-tailscale.sh` | macOS | 매일: DB 터널 |
| `start-local-dev.bat` | Windows | AI+Spring+Frontend (터널 별도) |

---

## 다른 PC

[SESSION_HANDOFF.md](SESSION_HANDOFF.md) · [UBUNTU_SERVER_SETUP.md §7-3](UBUNTU_SERVER_SETUP.md#7-3-db--회사외부-개발-pc-tailscale--ssh-터널)

---

## 문제 해결 (Windows)

| 증상 | 조치 |
|------|------|
| Ubuntu 안 보임 | Ubuntu `sudo tailscale up` · **같은 Tailscale 계정** |
| SSH timeout | `& "C:\Program Files\Tailscale\tailscale.exe" status` · IP 재확인 |
| 55432 refused | Ubuntu `docker compose ps` · `horizon-db-1` Up |
| `%USERNAME%`으로 SSH 시도 | bat에서 `SSH_USER=jeon` 사용 (Windows `USER` 변수와 혼동 주의) |
| 회사 보안 SW | Tailscale·SSH(22) 예외 — IT에 mesh VPN + SSH 용도 설명 |
