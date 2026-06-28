# Ubuntu 서버 셋업 · Docker · GitHub Actions 파이프라인

> **대상:** Ubuntu 22.04.5 LTS · `192.168.219.100` · Ryzen 2200G / 16GB  
> **SSH 계정:** `jeon` (아래 명령은 이 계정 기준. 다른 계정이면 `jeon` → 본인 계정명으로 바꿀 것)  
> **목표:** Horizon Docker 전체 스택 + `master` push → GitHub Actions 자동 배포  
> **관련:** Windows 집 PC — [SETUP.md](SETUP.md) · [DEPLOY.md](DEPLOY.md)

### ⚠️ 공통 주의

- **`apt` · `ufw` · `systemctl` · Docker 설치** → 반드시 **`sudo`** 앞에 붙입니다.  
  `apt update` 만 치면 `Permission denied` 가 납니다.
- **`upgrade` 단독 명령은 없습니다.** → `sudo apt upgrade -y`
- Docker 명령(`docker compose …`)은 **`docker` 그룹 가입 후** sudo 없이 실행합니다.

---

## ☑ 지금 서버에서 설정할 것 (체크리스트)

> **순서:** A → B → C → D → (나중에) E  
> 상세 설명·전체 복붙 블록: [§11 전체 명령어 순서](#11-전체-명령어-순서-복붙용)

### A. 서버 기본

| ☐ | 할 일 | 확인 |
|---|--------|------|
| ☐ | `sudo apt update && sudo apt upgrade -y` | 에러 없음 |
| ☐ | Docker + Compose plugin 설치 | `docker compose version` |
| ☐ | `sudo usermod -aG docker jeon` 후 **SSH 재접속** | `docker ps` (sudo 없이) |
| ☐ | git · curl · ufw 설치 | `git --version` · `curl --version` |
| ☐ | UFW 22·9080 허용 | `sudo ufw status` |

### B. Horizon 앱

| ☐ | 할 일 | 확인 |
|---|--------|------|
| ☐ | GitHub용 SSH 키 생성 · 공개키 등록 | `ssh -T git@github.com` → `Hi …!` |
| ☐ | `~/apps/horizon` 클론 | `ls ~/apps/horizon/compose.yaml` |
| ☐ | `.env` 작성 (KMA 키·비밀번호·JWT) | `test -f ~/apps/horizon/.env` |
| ☐ | `docker compose up -d --build` | 15~30분 |
| ☐ | 헬스체크 | `curl -s http://localhost:9080/api/health` |
| ☐ | 내부망 접속 | `http://192.168.219.100:9080/designer` |
| ☐ | (권장) systemd 자동 기동 | `systemctl is-enabled horizon` |

### C. 자동 배포 — Self-hosted Runner (Tailscale **불필요**)

| ☐ | 할 일 | 확인 |
|---|--------|------|
| ☐ | `deploy-docker.sh` · `deploy.yml` → **master push** | GitHub에 파일 있음 |
| ☐ | Ubuntu `git pull` + `chmod +x scripts/deploy-docker.sh` | 서버에 스크립트 있음 |
| ☐ | GitHub **Self-hosted Runner** Ubuntu 등록 | Settings → Actions → Runners **1 idle** |
| ☐ | Runner 서비스 기동 (`jeon`, `docker` 그룹) | `sudo ./svc.sh status` |
| ☐ | `master` push → Actions green | `.deploy-status.json` success |

> **GitHub PAT(토큰)** 은 이 방식에 **필수 아님** — `git pull`은 서버 SSH 키(`ubuntu-server-ktdvlp-jih`) 사용.

### D. (구 방식 · 사용 안 함) Tailscale + SSH Secrets

Cloud runner → 사설 IP 접속용. **Self-hosted Runner 쓰면 C만 하면 됨.**

| Secret | 비고 |
|--------|------|
| `TAILSCALE_AUTHKEY` 등 | **불필요** |

### E. 외부 URL (해커톤 · 나중에)

| ☐ | Cloudflare Named Tunnel · CORS | [§7](#7-외부-데모-url-해커톤--cloudflare) |
| ☐ | Quick Tunnel 지양 | 공고 제약 |

### 완료 기준

**내부망 데모**

```text
✓ http://192.168.219.100:9080/designer
✓ curl http://192.168.219.100:9080/api/health  → HTTP 200
✓ climate.pm10Source: kma (KMA 키 정상 시)
```

**자동 배포**

```text
✓ git push master → Actions 성공
✓ cat ~/apps/horizon/.deploy-status.json  → "status":"success"
```

---

## 0. 역할과 파이프라인

| 구성요소 | 역할 |
|----------|------|
| **Ubuntu 서버** (`192.168.219.100`) | Docker: Postgres + Spring + AI |
| **개발 PC** | 코드 · `git push` |
| **GitHub Actions** | Ubuntu **Self-hosted Runner** → `deploy-docker.sh` |

```
개발 PC  git push master (또는 PR → master merge)
    ↓
GitHub (워크플로 트리거)
    ↓
Ubuntu Self-hosted Runner (같은 서버에서 실행)
    bash /home/jeon/apps/horizon/scripts/deploy-docker.sh
    → git pull → docker compose build → up -d → health
    ↓
http://192.168.219.100:9080
```

> **Tailscale 없음:** Runner가 **Ubuntu 안**에서 돌므로 `192.168.219.100` SSH 경로 불필요.

| | Windows 집 PC | Ubuntu 서버 |
|--|---------------|-------------|
| Docker | Docker Desktop | `docker-ce` + systemd |
| Actions | SSH → 예약 작업 → PowerShell | SSH → bash 직접 |
| GUI 로그인 | 필수 | **불필요** |

---

## 1. 사양 · 포트

- **CPU:** Ryzen 2200G (4C) — 빌드 15~30분, 운영 충분
- **RAM:** 16GB
- **OS:** Ubuntu 22.04.5 LTS

| 포트 | 용도 |
|------|------|
| 22 | SSH |
| **9080** | Horizon 웹·API |
| 9800 | AI (디버그, 보통 Spring 경유) |
| 55432 | Postgres (원격 DB 접속 시만 개방) |

---

## 2. Ubuntu 1회 설정

### 접속

```bash
ssh jeon@192.168.219.100
```

---

### 2-1. 시스템 · Docker · Git

```bash
# ① 패키지 목록 갱신 + 업그레이드 (sudo 필수)
sudo apt update && sudo apt upgrade -y

# ② 기본 도구
sudo apt install -y ca-certificates curl gnupg git ufw

# ③ Docker 공식 GPG 키
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# ④ Docker apt 저장소 추가
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# ⑤ Docker 설치
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# ⑥ 현재 사용자(jeon)를 docker 그룹에 추가
sudo usermod -aG docker jeon
```

**⑦ SSH 끊고 다시 접속** (그룹 반영):

```bash
exit
ssh jeon@192.168.219.100
```

**⑧ 확인** (이제 sudo 없이):

```bash
docker --version
docker compose version
docker ps
```

---

### 2-2. 방화벽 (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 9080/tcp
# sudo ufw allow 55432/tcp   # 다른 PC에서 DB 직접 접속할 때만

sudo ufw enable
# "Command may disrupt existing ssh connections" → y

sudo ufw status
```

---

### 2-3. GitHub SSH 키 + 레포 클론

> **순서:** 키 생성 → GitHub 등록 → clone (clone 전에 키 필요)

```bash
# ① GitHub clone/pull 용 SSH 키 (Enter 3번 — 비밀번호 없음)
ssh-keygen -t ed25519 -C "horizon-ubuntu-jeon" -f ~/.ssh/id_ed25519 -N ""

# ② 공개키 출력 → GitHub 웹에 붙여넣기
#    GitHub → 우상단 프로필 → Settings → SSH and GPG keys → New SSH key
cat ~/.ssh/id_ed25519.pub

# ③ 연결 테스트
ssh -T git@github.com
# "Hi ktdvlp-jih! You've successfully authenticated..." → OK

# ④ 레포 클론
mkdir -p ~/apps && cd ~/apps
git clone git@github.com:ktdvlp-jih/horizon.git
cd ~/apps/horizon
git checkout master
git pull origin master
```

---

### 2-4. `.env` 작성

```bash
cd ~/apps/horizon
cp .env.example .env
nano .env
```

**반드시 설정할 항목**

| 변수 | 값 |
|------|-----|
| `HORIZON_KMA_API_KEY` | 기상청 API허브 authKey (**필수**) |
| `POSTGRES_PASSWORD` | `horizon` 대신 **강한 비밀번호** |
| `JWT_SECRET` | **긴 랜덤 문자열** |
| `HORIZON_CORS_ORIGINS` | `http://192.168.219.100:9080` |

**삭제하거나 비울 항목**

| 변수 | 이유 |
|------|------|
| `SPRING_DATASOURCE_URL` | Docker compose가 `db:5432`로 자동 설정 |

**선택 (AI LLM 코치)**

| 변수 | 설명 |
|------|------|
| `OPENAI_API_KEY` | Gemini/OpenAI 키 |
| `OPENAI_BASE_URL` | Gemini: `https://generativelanguage.googleapis.com/v1beta/openai/` |
| `OPENAI_MODEL` | 예: `gemini-2.5-flash` |

저장: `nano` → `Ctrl+O` Enter → `Ctrl+X`

---

### 2-5. 최초 빌드 · 기동

```bash
cd ~/apps/horizon
chmod +x scripts/deploy-docker.sh
docker compose up -d --build
```

> 첫 빌드 **15~30분** (Gradle + npm × 2). `docker compose logs -f app` 으로 진행 확인.

**검증**

```bash
docker compose ps
curl -s http://localhost:9080/api/health
curl -s http://localhost:9080/api/regions | head -c 400
```

**브라우저 (같은 내부망 PC):** http://192.168.219.100:9080/designer

---

### 2-6. 부팅 시 자동 기동 (systemd, 권장)

```bash
sudo tee /etc/systemd/system/horizon.service << 'EOF'
[Unit]
Description=Horizon Docker Compose
Requires=docker.service
After=docker.service network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/jeon/apps/horizon
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0
User=jeon
Group=docker

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable horizon
sudo systemctl start horizon
sudo systemctl status horizon
```

---

## 3. 자동 배포 — Self-hosted Runner (Tailscale **없이**)

### 왜 Tailscale / PAT만으로는 안 되나?

| 방법 | 문제 |
|------|------|
| GitHub **클라oud** runner | `192.168.219.100` **접속 불가** (사설 IP) → Tailscale 또는 공인 IP 필요 |
| **PAT(토큰)만** | push **트리거·배포 실행** 기능 없음 → `git pull` 인증용일 뿐 |
| **Self-hosted Runner** ✅ | Runner가 **Ubuntu 안**에서 돌아서 `localhost`로 바로 배포 |

```
push master → GitHub → Ubuntu Runner → deploy-docker.sh
```

**필요한 것:** GitHub 레포 + Ubuntu Runner + 서버 SSH 키(`git pull`) + Docker  
**불필요:** Tailscale, DEPLOY_* Secrets, GitHub PAT(Secrets)

---

### 3-1. 개발 PC — workflow · 스크립트 push (1회)

로컬에 아직 없으면 master에 반영:

```powershell
cd E:\workspace\horizon
git add .github/workflows/deploy.yml scripts/deploy-docker.sh
git commit -m "ci: Ubuntu Self-hosted Runner 자동 배포"
git push origin master
```

---

### 3-2. Ubuntu — deploy 스크립트 받기 (1회)

```bash
cd ~/apps/horizon
git pull origin master
chmod +x scripts/deploy-docker.sh
./scripts/deploy-docker.sh --help 2>/dev/null || true
```

---

### 3-3. Ubuntu — Self-hosted Runner 설치 (1회)

GitHub → **Repo → Settings → Actions → Runners → New self-hosted runner → Linux**  
화면에 나온 **Download · Configure · Run** 명령을 Ubuntu에서 실행.

요약 (버전·토큰은 GitHub 화면 값 사용):

```bash
mkdir -p ~/actions-runner && cd ~/actions-runner

# GitHub 페이지에서 복사한 curl -o ... tar.gz && tar xzf ... 실행

./config.sh --url https://github.com/ktdvlp-jih/horizon --token <REGISTRATION_TOKEN>
# Runner name: ubuntu-server  /  labels: (기본)  /  work folder: _work (기본)

sudo ./svc.sh install jeon
sudo ./svc.sh start
sudo ./svc.sh status
```

> **주의:** `~/apps/horizon/actions-runner` 처럼 **레포 안**에 두지 말 것.  
> Download 후 **`./config.sh` 필수** — `Not configured` = config.sh 생략.  
> Registration token은 채팅·캡처 금지 → `.cursor/rules/secrets-handling.mdc`

**확인:** GitHub Runners 탭에 **Idle** (녹색) runner 1대.

> `jeon`이 `docker` 그룹에 있어야 `deploy-docker.sh`의 `docker compose` 동작.

---

### 3-4. Workflow (`.github/workflows/deploy.yml`)

```yaml
jobs:
  deploy:
    runs-on: self-hosted
    steps:
      - run: bash /home/jeon/apps/horizon/scripts/deploy-docker.sh
      - run: curl -sf http://localhost:9080/api/health
```

`master` **push** · **merge** · **Run workflow** 시 실행.

---

### 3-5. deploy-docker.sh 동작

1. `git pull origin master` (SSH 키 `ubuntu-server-ktdvlp-jih`)
2. `docker compose build` → `up -d`
3. `/api/health` 대기 → `.deploy-status.json`

---

## 4. (구 방식 · 생략) Tailscale + SSH Secrets

Cloud runner가 사설망 SSH 할 때만 사용. **Self-hosted Runner 쓰면 §4 불필요.**

---

## 5. GitHub PAT(토큰)은 언제 쓰나?

| 용도 | Self-hosted 배포 |
|------|------------------|
| `git pull` SSH | **서버 SSH 키** (이미 등록됨) ✅ |
| `git pull` HTTPS | PAT를 비밀번호 대신 사용 (선택) |
| Actions Secrets | **Self-hosted면 불필요** |
| `gh` CLI · API | PAT 사용 |

**보유 PAT는 git HTTPS용으로 두면 되고, 자동 배포 Secrets에는 넣지 않아도 됩니다.**

---

## 6. 일일 워크플로

**개발 PC**

```powershell
git add .
git commit -m "..."
git push origin master
```

**Ubuntu 서버 확인**

```bash
cd ~/apps/horizon
cat .deploy-status.json
tail -30 .deploy-last.log
docker compose ps
curl -s http://localhost:9080/api/health
```

**수동 배포**

```bash
cd ~/apps/horizon
./scripts/deploy-docker.sh
```

---

## 7. 외부 데모 URL (해커톤 · Cloudflare)

내부 IP만으로 심사 불가. **Named Tunnel + 고정 도메인** 권장.  
Quick Tunnel(`trycloudflare.com`)은 **불안정 → 지양**.

상세: [CLOUDFLARE_TUNNEL.md](CLOUDFLARE_TUNNEL.md)

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

cloudflared tunnel login
cloudflared tunnel create horizon
cloudflared tunnel route dns horizon app.example.com

sudo tee /etc/cloudflared/config.yml << 'EOF'
tunnel: <TUNNEL_ID>
credentials-file: /home/jeon/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: app.example.com
    service: http://localhost:9080
  - service: http_status:404
EOF

sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

`.env`에 `HORIZON_CORS_ORIGINS=http://192.168.219.100:9080,https://app.example.com` 추가 후:

```bash
cd ~/apps/horizon
docker compose up -d app
```

---

## 8. Windows → Ubuntu 마이그레이션

- [ ] `curl http://localhost:9080/api/health` OK
- [ ] Tailscale · `tailscale ip -4` 기록
- [ ] Secrets 4~5개 (`DEPLOY_USER=jeon`)
- [ ] `master` push → Actions green
- [ ] (선택) Cloudflare · CORS
- [ ] (선택) Windows 집 PC Actions Secrets 비활성화

---

## 9. 트러블슈팅

| 증상 | 원인 · 조치 |
|------|-------------|
| `Permission denied` on apt | **`sudo apt update`** 사용 |
| `upgrade: command not found` | **`sudo apt upgrade -y`** (`apt upgrade` 형태) |
| `docker: permission denied` | `sudo usermod -aG docker jeon` → **SSH 재접속** |
| `git clone` Permission denied | [§2-3](#2-3-github-ssh-키--레po-클론) SSH 키 먼저 |
| Actions SSH timeout | `DEPLOY_HOST` = Tailscale IP, `sudo systemctl status ssh` |
| Actions permission denied | `authorized_keys` · `chmod 600` · `DEPLOY_USER=jeon` |
| UFW 후 SSH 끊김 | 콘솔에서 `sudo ufw allow OpenSSH` |
| 빌드 OOM | `free -h`, swap 추가, 다른 작업 중단 |
| health fail | `docker compose logs app --tail 100` |
| KMA sample/null | `.env` `HORIZON_KMA_API_KEY` 확인 → `docker compose up -d --build app` |

---

## 10. 관련 파일

| 파일 | 역할 |
|------|------|
| `compose.yaml` | Postgres + AI + Spring |
| `.env.example` | 환경 변수 템플릿 |
| `scripts/deploy-docker.sh` | Linux 배포 |
| `.github/workflows/deploy.yml` | GitHub Actions |
| `.cursor/rules/contest-constraints.mdc` | 해커톤 제약 |

---

## 11. 전체 명령어 순서 (복붙용)

> **한 블록씩** 실행. `jeon@192.168.219.100` SSH 접속 후.

### 블록 1 — 시스템 + Docker

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg git ufw

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker jeon
```

→ **`exit` 후 SSH 재접속**

```bash
ssh jeon@192.168.219.100
docker compose version
```

### 블록 2 — 방화벽

```bash
sudo ufw allow OpenSSH
sudo ufw allow 9080/tcp
sudo ufw enable
sudo ufw status
```

### 블록 3 — GitHub 키 + clone

```bash
ssh-keygen -t ed25519 -C "horizon-ubuntu-jeon" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

→ **출력된 공개키를 GitHub → Settings → SSH keys 에 등록**

```bash
ssh -T git@github.com
mkdir -p ~/apps && cd ~/apps
git clone git@github.com:ktdvlp-jih/horizon.git
cd ~/apps/horizon
git checkout master
git pull origin master
```

### 블록 4 — .env + 빌드

```bash
cd ~/apps/horizon
cp .env.example .env
nano .env
```

→ KMA 키·POSTGRES_PASSWORD·JWT_SECRET·CORS 입력 · `SPRING_DATASOURCE_URL` 삭제

```bash
chmod +x scripts/deploy-docker.sh
docker compose up -d --build
docker compose ps
curl -s http://localhost:9080/api/health
```

### 블록 5 — systemd (선택)

```bash
sudo tee /etc/systemd/system/horizon.service << 'EOF'
[Unit]
Description=Horizon Docker Compose
Requires=docker.service
After=docker.service network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/jeon/apps/horizon
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0
User=jeon
Group=docker

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable horizon
sudo systemctl start horizon
```

### 블록 6 — Tailscale + Actions SSH 키

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
tailscale ip -4

mkdir -p ~/.ssh && chmod 700 ~/.ssh
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys ~/.ssh/github_deploy
cat ~/.ssh/github_deploy
```

→ **private key → GitHub Secret `DEPLOY_SSH_KEY`**  
→ **`tailscale ip -4` → Secret `DEPLOY_HOST`**  
→ **`DEPLOY_USER` = `jeon`**

---

**내부망 URL:** http://192.168.219.100:9080  
**Tailscale URL:** http://100.x.x.x:9080  
**외부 URL:** Cloudflare Named Tunnel 설정 후
