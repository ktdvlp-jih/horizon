# Docker 배포 (집 PC) — GitHub Actions + SSH

> `master` push → GitHub Actions → Tailscale → 집 PC SSH → `deploy-docker.ps1`

---

## 구조

```
[개발 PC] git push master
       ↓
[GitHub Actions]
  1. Tailscale 가입 (TAILSCALE_AUTHKEY)
  2. SSH → 집 PC (DEPLOY_HOST = Tailscale IP)
  3. scripts/deploy-docker.ps1
       ↓
[집 PC] git pull + docker compose up -d --build
       ↓
http://localhost:9080
```

**중요:** 집 PC Tailscale IP(`100.x.x.x`)는 인터넷에서 직접 안 됩니다.  
Workflow에 **Tailscale 단계**가 있어 GitHub Runner가 tailnet에 잠깐 붙은 뒤 SSH합니다. 공유기 포트포워딩 불필요.

---

## 1회 설정 (집 PC)

### 1) OpenSSH + Docker

```powershell
Get-Service sshd          # Running
docker compose ps         # db / ai / app
```

### 2) 배포용 SSH 키

**집 PC** 관리자 PowerShell:

```powershell
cd e:\workspace\horizon
Set-ExecutionPolicy -Scope Process Bypass -Force
.\scripts\setup-deploy-ssh.ps1
```

출력된 **private key 전체**를 복사해 둡니다 (`DEPLOY_SSH_KEY`).

### 3) Tailscale Auth Key

1. https://login.tailscale.com/admin/settings/keys
2. **Generate auth key**
   - Reusable: ✅ (여러 배포에 사용)
   - Ephemeral: ✅ (Runner 노드 자동 정리)
   - Tags: `tag:ci` (선택 — ACL 쓰는 경우)
3. 키 문자열 복사 → `TAILSCALE_AUTHKEY`

### 4) GitHub Secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret | 값 |
|--------|-----|
| `TAILSCALE_AUTHKEY` | 위에서 생성한 auth key |
| `DEPLOY_HOST` | `100.117.145.80` (`tailscale ip -4` on home PC) |
| `DEPLOY_USER` | `전일훈` |
| `DEPLOY_SSH_KEY` | `setup-deploy-ssh.ps1`이 출력한 **private key 전체** (BEGIN~END 포함) |

### 5) Workflow 커밋

`.github/workflows/deploy.yml` 이 레포에 있어야 합니다. `master`에 merge 후 첫 push로 테스트.

---

## 동작 확인

1. GitHub → **Actions** → **Deploy Docker (home PC)**
2. 집 PC:

```powershell
docker compose ps
curl http://localhost:9080/api/health
```

---

## 수동 배포 (Actions 없이)

```powershell
.\scripts\deploy-docker.ps1
```

---

## 트러블슈팅

| 증상 | 조치 |
|------|------|
| Tailscale step 실패 | `TAILSCALE_AUTHKEY` 만료/오타, Admin에서 새 키 |
| SSH timeout | 집 PC `sshd` Running, `DEPLOY_HOST` = 최신 `tailscale ip -4` |
| SSH permission denied | `setup-deploy-ssh.ps1` 재실행, `authorized_keys` 확인 |
| `git pull` 실패 | 집 PC repo에 `origin` remote, deploy key 또는 credential |
| Docker build 느림 | workflow `timeout-minutes: 45` — 필요 시 증가 |

### 집 PC Git 인증

Actions는 `git pull`만 실행합니다. 집 PC에 이미 clone·credential이 있어야 합니다.

- HTTPS: Windows Credential Manager에 GitHub 토큰 저장
- SSH: 집 PC에 GitHub deploy key 등록

---

## 관련 파일

| 파일 | 역할 |
|------|------|
| `.github/workflows/deploy.yml` | Actions workflow |
| `scripts/deploy-docker.ps1` | pull + compose rebuild |
| `scripts/setup-deploy-ssh.ps1` | 배포 SSH 키 1회 생성 |

---

## 대화 동기화

[SESSION_HANDOFF.md](SESSION_HANDOFF.md) · `docs/chat-exports/` — Export Transcript → commit → push
