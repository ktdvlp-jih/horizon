# 집 PC Docker 배포 (GitHub Actions)

> **전체 순서:** [SETUP.md](SETUP.md) · **개발 PC:** [DEV_SETUP.md](DEV_SETUP.md)

`master` push/merge → GitHub Actions → Tailscale → SSH → 집 PC Docker 자동 재빌드

---

## 구조

```
[개발 PC] git push master
       ↓
[GitHub Actions]
  1. Tailscale 가입 (TAILSCALE_AUTHKEY)
  2. SSH → 집 PC (DEPLOY_HOST = Tailscale IP)
  3. deploy-docker-trigger.ps1 → 예약 작업 HorizonGitHubDeploy
  4. deploy-docker.ps1 (git pull + docker compose build/up)
       ↓
http://localhost:9080
```

- 집 PC **Self-hosted Runner 불필요**
- DB 컨테이너는 유지, **app/ai만** 재빌드
- 배포는 예약 작업으로 **백그라운드** 실행 (`-WindowStyle Hidden`) — PowerShell 창이 뜨지 않음

---

## 1회 설정 (집 PC)

[SETUP.md §2](SETUP.md#2-집-pc-1회-설정-home) 와 동일. 요약:

| # | 작업 | 스크립트 | 권한 |
|---|------|----------|------|
| 1 | Docker + `.env` | `docker compose up -d --build` | — |
| 2 | Tailscale | `tailscale ip -4` | — |
| 3 | OpenSSH | `setup_openssh_tunnel.ps1` | 관리자 |
| 4 | 배포 SSH 키 | `setup-deploy-ssh.ps1` | **관리자** |
| 5 | Docker 예약 작업 | `setup-deploy-task.ps1` | **관리자** |
| 6 | git pull | `git pull origin master` | — |

### GitHub Secrets (4개)

Repo → **Settings → Secrets → Actions**

| Secret | 값 |
|--------|-----|
| `TAILSCALE_AUTHKEY` | https://login.tailscale.com/admin/settings/keys → `tskey-...` |
| `DEPLOY_HOST` | 집 PC `tailscale ip -4` |
| `DEPLOY_USER` | Windows 로그인명 |
| `DEPLOY_SSH_KEY` | `setup-deploy-ssh.ps1` 출력 private key 전체 (BEGIN~END) |

---

## 동작 확인

```powershell
# Actions: Run workflow 또는 master push

# 집 PC
Get-Content e:\workspace\horizon\.deploy-status.json
curl http://localhost:9080/api/health
docker compose ps
```

---

## 수동 배포

```powershell
cd e:\workspace\horizon
.\scripts\deploy-docker.ps1
```

---

## 집 PC 유지 조건 (Actions 성공 필수)

- Windows **로그인** 상태 (예약 작업이 interactive session 필요)
- **Docker Desktop** 실행 중
- **Tailscale** 연결
- **`sshd`** Running

---

## 트러블슈팅

| 증상 | 조치 |
|------|------|
| Tailscale step 실패 | `TAILSCALE_AUTHKEY` 재발급 |
| SSH timeout | `DEPLOY_HOST` = 최신 Tailscale IP, `sshd` Running |
| SSH permission denied | **관리자** PowerShell → `setup-deploy-ssh.ps1` → `[ok] SSH key auth works` |
| 관리자 계정 SSH | 키 위치: `C:\ProgramData\ssh\administrators_authorized_keys` |
| `git pull` 실패 | 집 PC GitHub PAT 또는 SSH remote |
| Docker credential / logon session | `setup-deploy-task.ps1` 미설정 또는 PC 잠금/로그아웃 |
| Deploy OK but health fail (로컬) | Spring 기동 대기 — `deploy-docker.ps1` 재시도 (재시도 로직 내장) |
| 예약 작업 옵션 변경 후 동작 이상 | **관리자** → `setup-deploy-task.ps1` 재실행 |
| Actions Queued forever | 집 PC 꺼짐 / Tailscale 끊김 |

### AhnLab / hosts 파일

| 위치 | 설명 |
|------|------|
| GitHub Actions (Linux) | Tailscale step이 runner `/etc/hosts` 수정 — **정상**, 집 PC 조치 불필요 |
| 집 PC AhnLab | Tailscale이 `hosts` 갱신 — **Tailscale.exe 예외 등록** |

1. AhnLab → 예외/신뢰 → `C:\Program Files\Tailscale\tailscale.exe`
2. (선택) Tailscale → **Use Tailscale DNS settings** 끄기 (배포는 IP 사용)

---

## 관련 파일

| 파일 | 역할 |
|------|------|
| `.github/workflows/deploy.yml` | Actions workflow |
| `scripts/deploy-docker-trigger.ps1` | SSH → 예약 작업 트리거 |
| `scripts/deploy-docker.ps1` | pull + compose rebuild + health |
| `scripts/setup-deploy-ssh.ps1` | 배포 SSH 키 |
| `scripts/setup-deploy-task.ps1` | 예약 작업 등록 (`-WindowStyle Hidden`) |

---

## 외부 데모

[CLOUDFLARE_TUNNEL.md](CLOUDFLARE_TUNNEL.md) — `start_trycloudflare.bat`
