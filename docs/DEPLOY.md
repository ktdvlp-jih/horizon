# Docker 배포 (집 PC) — GitHub Actions + SSH

> **DB:** 집 PC Docker Postgres (클라oud DB 없음)  
> **개발:** 다른 PC에서 Tailscale SSH 터널 → [DEV_SETUP.md](DEV_SETUP.md)  
> **배포:** `master` push/merge → GitHub Actions → Tailscale → SSH → `deploy-docker-trigger.ps1` → 예약 작업 → `deploy-docker.ps1`  
> **데모:** trycloudflare (기존) → [CLOUDFLARE_TUNNEL.md](CLOUDFLARE_TUNNEL.md)

---

## 구조

```
[개발 PC] git push / master merge
       ↓
[GitHub Actions — 클라oud Runner]
  1. Tailscale 가입 (TAILSCALE_AUTHKEY)
  2. SSH → 집 PC Tailscale IP (DEPLOY_HOST)
  3. scripts/deploy-docker-trigger.ps1 → HorizonGitHubDeploy (예약 작업)
  4. scripts/deploy-docker.ps1
       ↓
[집 PC] git pull + docker compose up -d --build
       ↓
http://localhost:9080  (DB 컨테이너는 유지, app/ai 재빌드)
```

집 PC에 **Runner를 설치할 필요 없습니다.**  
GitHub 클라oud에서 SSH로 들어와 배포 스크립트만 실행합니다.

---

## 1회 설정 (집 PC)

### 1) Docker + DB

```powershell
cd e:\workspace\horizon
docker compose up -d --build
Get-Service sshd          # Running
```

### 2) 배포용 SSH 키

**집 PC — 관리자 PowerShell** (일반 창이 아님):

```powershell
cd e:\workspace\horizon
Set-ExecutionPolicy -Scope Process Bypass -Force
.\scripts\setup-deploy-ssh.ps1
```

Windows **관리자 계정**은 `~/.ssh/authorized_keys`가 아니라  
`C:\ProgramData\ssh\administrators_authorized_keys` 를 씁니다.  
스크립트가 자동 처리하며, 끝에 `[ok] SSH key auth works` 가 나와야 합니다.

출력된 **private key 전체** (`BEGIN`~`END`) → GitHub Secret `DEPLOY_SSH_KEY`.

### 3) Docker 배포 예약 작업 (SSH 세션용)

SSH로 직접 `docker compose build` 하면 **Docker Desktop credential 오류**가 납니다.  
**관리자 PowerShell**에서 1회:

```powershell
cd e:\workspace\horizon
.\scripts\setup-deploy-task.ps1
```

집 PC에 **Windows 로그인 상태**로 두면 Actions가 예약 작업으로 배포합니다.

### 4) Tailscale Auth Key

1. https://login.tailscale.com/admin/settings/keys
2. **Generate auth key** — Reusable ✅, Ephemeral ✅
3. `tskey-...` 복사

### 5) GitHub Secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret | 값 |
|--------|-----|
| `TAILSCALE_AUTHKEY` | `tskey-...` (BEGIN/END 없음) |
| `DEPLOY_HOST` | 집 PC `tailscale ip -4` (예: `100.117.145.80`) |
| `DEPLOY_USER` | Windows 로그인명 (예: `전일훈`) |
| `DEPLOY_SSH_KEY` | `setup-deploy-ssh.ps1` 출력 private key **전체** |

### 6) 집 PC git pull 인증

`deploy-docker.ps1`이 SSH 세션 안에서 `git pull` 합니다:

```powershell
cd e:\workspace\horizon
git pull origin master
```

HTTPS PAT 또는 deploy key 필요.

---

## 동작 확인

> Pipeline test: `master` push → Actions **Deploy Docker (home PC)** (2026-06-23)

1. `master` push 또는 Actions → **Deploy Docker (home PC)** → **Run workflow**
2. 집 PC:

```powershell
docker compose ps
curl http://localhost:9080/api/health
```

---

## 수동 배포

```powershell
.\scripts\deploy-docker.ps1
```

---

## 외부 데모 (기존)

```powershell
.\scripts\start_trycloudflare.bat
```

[CLOUDFLARE_TUNNEL.md](CLOUDFLARE_TUNNEL.md)

---

## 트러블슈팅

| 증상 | 조치 |
|------|------|
| Tailscale step 실패 | `TAILSCALE_AUTHKEY` 만료/오타 → 새 키 |
| SSH timeout | `sshd` Running, `DEPLOY_HOST` = 최신 Tailscale IP |
| SSH permission denied | **관리자 PowerShell**에서 `setup-deploy-ssh.ps1` → `[ok] SSH key auth works` 확인 |
| SSH permission denied (관리자) | 키 위치: `C:\ProgramData\ssh\administrators_authorized_keys` (not `~/.ssh`) |
| `git pull` 실패 | 집 PC GitHub 인증 |
| Docker build credential error | `setup-deploy-task.ps1` 실행 (예약 작업). 집 PC **로그인 상태** 유지 |
| AhnLab hosts 파일 변경 | Tailscale이 `C:\Windows\System32\drivers\etc\hosts` 갱신 — **Tailscale 예외 등록** (아래) |

### AhnLab / hosts 파일

| 어디 | hosts 변경 | 대응 |
|------|-----------|------|
| **GitHub Actions (클라oud)** | Tailscale step이 Linux runner `/etc/hosts` 수정 | **집 PC에서 할 일 없음** — 정상 |
| **집 PC (AhnLab 알림)** | Tailscale Windows가 MagicDNS용 hosts 갱신 | **Tailscale → 예외/허용** |

AhnLab V3:

1. **V3 → 설정 → 예외/신뢰** (또는 실시간 감시 예외)
2. 프로그램 추가: `C:\Program Files\Tailscale\tailscale.exe`
3. hosts 변경 알림 → **Tailscale 허용** / **기억하기**

Tailscale 앱에서 **Use Tailscale DNS settings** 끄면 hosts 갱신이 줄어듭니다 (배포는 IP `100.x` 사용 — DNS 불필요).

Tailscale 1.80+ 업데이트 권장 (불필요한 hosts 재작성 버그 수정).

---

## 다른 자동 배포 방안 (참고)

소스는 GitHub, 집 PC Docker — **master merge → 자동 배포** 목표는 같고 수단만 다릅니다.

| 방식 | 집 PC 설치 | GitHub Secrets | 비고 |
|------|-----------|----------------|------|
| **Actions + Tailscale SSH** ⭐ | sshd + Tailscale | 4개 | **현재 방식**. 공유기 포워딩 불필요 |
| Actions + 공인 IP SSH | sshd + 포트포워딩 22 | 3개 (Tailscale 키 없음) | ISP 22 차단 시 불안 |
| Self-hosted Runner | Runner 서비스 | 0개 | 집 PC에 Runner 상시 실행 |
| Webhook 리스너 | 작은 HTTP 서비스 | webhook secret 1개 | 집 PC가 push 알림 받고 pull (직접 구현) |
| 수동 | 없음 | 없음 | `deploy-docker.ps1` |

**추천:** 지금처럼 **Actions + Tailscale SSH** — GitHub에 코드만 두고, 집 PC는 Docker+sshd만 켜 두면 됩니다.

---

## 관련 파일

| 파일 | 역할 |
|------|------|
| `.github/workflows/deploy.yml` | Actions workflow |
| `scripts/deploy-docker.ps1` | pull + compose rebuild |
| `scripts/setup-deploy-ssh.ps1` | 배포 SSH 키 1회 생성 |
| `scripts/ssh-db-tunnel-tailscale.bat` | 개발 PC → 집 DB |

---

## 대화 동기화

[SESSION_HANDOFF.md](SESSION_HANDOFF.md) · `docs/chat-exports/`
