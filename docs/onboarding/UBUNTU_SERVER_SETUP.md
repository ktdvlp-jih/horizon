# Ubuntu 서버 셋업 · Docker · GitHub Actions 파이프라인

> **대상:** Ubuntu 22.04.5 LTS · `192.168.219.100` · Ryzen 2200G / 16GB  
> **SSH 계정:** `jeon`  
> **상태 (2026-06-28):** A~D **완료** · **E-1 Quick Tunnel (systemd)** 운영 중  
> **다음:** **E-2** 도메인 구매 → [Named Tunnel §7-2](#7-2-named-tunnel-예정--고정-도메인)
> **관련:** 개발 PC — [DEV_SETUP.md](DEV_SETUP.md) · [SETUP.md](SETUP.md) (진입점)

### ⚠️ 공통 주의

- **`apt` · `ufw` · `systemctl` · Docker 설치** → 반드시 **`sudo`** 앞에 붙입니다.  
  `apt update` 만 치면 `Permission denied` 가 납니다.
- **`upgrade` 단독 명령은 없습니다.** → `sudo apt upgrade -y`
- Docker 명령(`docker compose …`)은 **`docker` 그룹 가입 후** sudo 없이 실행합니다.

---

## ☑ 설정 체크리스트

> **순서:** A → B → C → E-1 (Quick) → **E-2 (Named · 도메인)**  
> 신규 서버: [§12 전체 명령어](#12-전체-명령어-순서-복붙용--신규-서버)

### A. 서버 기본 — ✅ 완료

| ✅ | 할 일 |
|----|--------|
| ✅ | apt · Docker · git · ufw |
| ✅ | `docker` 그룹 · UFW 22·9080 |

### B. Horizon 앱 — ✅ 완료

| ✅ | 할 일 |
|----|--------|
| ✅ | SSH 키 `ubuntu-server-ktdvlp-jih` · clone `~/apps/horizon` |
| ✅ | `.env` · `docker compose up` · health OK |
| ✅ | Windows Docker DB → Ubuntu `pg_restore` (DB명 `horizon`) |
| ✅ | systemd `horizon.service` |

### C. 자동 배포 (Self-hosted Runner) — ✅ 완료

| ✅ | 할 일 |
|----|--------|
| ✅ | `deploy.yml` · `deploy-docker.sh` on master |
| ✅ | Runner `ubuntu-server` · `svc.sh install jeon` |
| ✅ | **`master` push/merge → Actions green** |

**배포 규칙:** `master`에 push 또는 merge될 때만 배포. feature 브랜치만 push하면 **배포 안 됨**.

**불필요:** Tailscale · GitHub PAT Secrets · `DEPLOY_*` Secrets

### D. (미사용) Tailscale + Cloud SSH Secrets

Self-hosted Runner 사용 시 **설정하지 않음**.

### E-1. 외부 URL — Quick Tunnel — ✅ 운영 중

| ✅ | 할 일 |
|----|--------|
| ✅ | `cloudflared` 설치 |
| ✅ | systemd `cloudflared-quick` · `enable` |
| ☐ | 재부팅 후 URL journal 확인 (Quick는 **URL 변경** 가능) |

**URL 확인 (명령):**

```bash
sudo systemctl is-active cloudflared-quick
sudo journalctl -u cloudflared-quick -n 100 --no-pager | grep trycloudflare
sudo journalctl -u cloudflared-quick -n 100 --no-pager \
  | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1
```

**기록 (2026-06-28):** `https://opt-birds-built-streets.trycloudflare.com` (터널 재시작 시 변경 → 위 명령 재실행)

상세: [§7-1](#7-1-quick-tunnel-현행--ubuntu)

### E-2. 외부 URL — Named Tunnel — ☐ **다음 (도메인 구매 후)**

| ☐ | 할 일 |
|----|------|
| ☐ | 도메인 (예: `horizon-app.com` · 가비아/카페24/Cloudflare) |
| ☐ | Cloudflare Zone · Named Tunnel · `.env` CORS |
| ☐ | `sudo systemctl disable --now cloudflared-quick` |
| ☐ | README·이력서 **고정 URL** 반영 |

상세: [§7-2](#7-2-named-tunnel-예정--고정-도메인) · 해커톤·포폴 **최종 제출** 전 전환 권장

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

**외부 데모 (Quick Tunnel · systemd)**

```text
✓ sudo systemctl is-active cloudflared-quick  → active
✓ journalctl … grep trycloudflare  → https://opt-birds-built-streets.trycloudflare.com (예)
✓ LTE에서 …/designer · …/api/health
```

> Docker **재빌드·배포**는 Quick URL **유지**. **터널·재부팅** 시 URL **변경** → journal 재확인.

---

## 0. 역할과 파이프라인

| 구성요소 | 역할 |
|----------|------|
| **Ubuntu 서버** (`192.168.219.100`) | Docker: Postgres + Spring + AI |
| **cloudflared-quick** (systemd) | Quick Tunnel → `*.trycloudflare.com` |
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
http://192.168.219.100:9080  (LAN)
    ↓
cloudflared-quick → https://opt-birds-built-streets.trycloudflare.com  (외부 · journal로 재확인)
```

> **Tailscale 없음:** Runner가 **Ubuntu 안**에서 돌므로 `192.168.219.100` SSH 경로 불필요.

| | Windows 집 PC | Ubuntu 서버 (현행) |
|--|---------------|-------------------|
| Docker | Docker Desktop | `docker-ce` + systemd |
| Actions | SSH → 예약 작업 → PowerShell | **Self-hosted Runner** → `deploy-docker.sh` |
| 배포 트리거 | `master` push | **`master` push/merge** |

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
# ① GitHub clone/pull 용 SSH 키
ssh-keygen -t ed25519 -C "ubuntu-server-ktdvlp-jih" -f ~/.ssh/ubuntu-server-ktdvlp-jih -N ""

cat ~/.ssh/ubuntu-server-ktdvlp-jih.pub
# → GitHub → Settings → SSH and GPG keys → Title: ubuntu-server-ktdvlp-jih

cat >> ~/.ssh/config << 'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/ubuntu-server-ktdvlp-jih
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config ~/.ssh/ubuntu-server-ktdvlp-jih

ssh -T git@github.com
```

```bash
mkdir -p ~/apps && cd ~/apps
git clone git@github.com:ktdvlp-jih/horizon.git
cd ~/apps/horizon
git checkout master
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

### 2-7. Windows Docker DB → Ubuntu 이전 (1회 · 완료 시 건너뛰기)

스키마는 Hibernate `ddl-auto: update`. **데이터**만 `pg_dump` / `pg_restore`.

**Windows:**

```powershell
docker compose up -d db
docker exec horizon-db-1 pg_dump -U horizon -d horizon -Fc -f /tmp/horizon.dump
docker cp horizon-db-1:/tmp/horizon.dump E:\backup\horizon.dump
scp E:\backup\horizon.dump jeon@192.168.219.100:~/horizon.dump
```

**Ubuntu:**

```bash
docker compose stop app ai
docker exec -i horizon-db-1 pg_restore -U horizon -d horizon --clean --if-exists --no-owner --no-acl < ~/horizon.dump
docker compose up -d
```

DB 이름 **`horizon`** · 볼륨 `horizon_horizon_db`는 Docker 디스크 저장 위치.

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

경로: `~/actions-runner` 권장 (현재 서버: `~/apps/horizon/actions-runner` 도 동작).

1. GitHub → **Settings → Actions → Runners → New self-hosted runner → Linux**
2. Download · `tar xzf` · **`./config.sh` 필수** (`Not configured` = config 생략)
3. **`./run.sh` 아님** — 서버 상시 운영:

```bash
cd ~/actions-runner   # 또는 actions-runner 설치 폴더
./config.sh --url https://github.com/ktdvlp-jih/horizon --token <REGISTRATION_TOKEN>
sudo ./svc.sh install jeon
sudo ./svc.sh start
sudo ./svc.sh status
```

- Registration token: 채팅·캡처 금지 → `.cursor/rules/secrets-handling.mdc`
- Runners 탭 **Idle**(녹색) · Actions **Succeeded**면 OK (UI 회색이어도 job 성공 시 정상)
- `./svc.sh stop`은 Runner Offline 유발 — 불필요 시만

**확인:** GitHub Runners · Actions `#34+` green · `journalctl` → `Listening for Jobs`

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

`master` **push** · **PR merge to master** · **Run workflow** 시 자동 배포.

---

### 6-1. 상태 점검 명령어 (Ubuntu · Windows)

한 번에 “설정·동작” 확인할 때 쓰는 명령 모음.

#### Ubuntu 서버 (`ssh jeon@192.168.219.100`)

```bash
# --- 시스템 ---
hostnamectl                    # OS 버전 (22.04 확인)
free -h                          # RAM
df -h /                          # 디스크
uptime

# --- Docker / Horizon ---
cd ~/apps/horizon
docker compose ps                # db · ai · app Running?
docker compose logs app --tail 30
curl -s http://localhost:9080/api/health | head -c 200

# --- DB (PostgreSQL) ---
docker exec horizon-db-1 psql -U horizon -d horizon -c "\dt"
docker exec horizon-db-1 psql -U horizon -d horizon -c "SELECT COUNT(*) FROM app_user;"

# --- .env (키 이름만 · 값은 출력 주의) ---
grep -E '^[A-Z_]+=' .env | cut -d= -f1 | sort
# KMA 키 설정 여부 (값 길이만)
grep HORIZON_KMA_API_KEY .env | awk -F= '{print length($2)}'

# --- 방화벽 ---
sudo ufw status

# --- cloudflared Quick Tunnel (systemd) ---
sudo systemctl is-active cloudflared-quick
sudo systemctl status cloudflared-quick --no-pager
sudo journalctl -u cloudflared-quick -n 100 --no-pager | grep trycloudflare
sudo journalctl -u cloudflared-quick -n 100 --no-pager \
  | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1
# 외부 health (URL 바뀌었으면 위 한 줄 결과로 교체)
curl -sI https://opt-birds-built-streets.trycloudflare.com/api/health

# --- systemd (재부팅 후 Docker 자동 기동) ---
systemctl is-enabled horizon
systemctl status horizon --no-pager

# --- GitHub Actions Runner ---
cd ~/apps/horizon/actions-runner   # 또는 ~/actions-runner
sudo ./svc.sh status
sudo journalctl -u actions.runner.ktdvlp-jih-horizon.ubuntu-server.service -n 20 --no-pager

# --- 마지막 배포 ---
cat ~/apps/horizon/.deploy-status.json 2>/dev/null || echo "아직 deploy 없음"
tail -20 ~/apps/horizon/.deploy-last.log 2>/dev/null

# --- Git 버전 ---
cd ~/apps/horizon && git log -1 --oneline && git remote -v
```

#### Windows 개발 PC (`E:\workspace\horizon`)

```powershell
# --- Docker (Windows DB 백업·레거시) ---
docker compose ps
docker volume ls | findstr horizon

# --- Git / 배포 트리거 ---
git status
git log -1 --oneline
git remote -v

# --- 로컬 .env 존재 (값은 채팅·캡처 금지) ---
Test-Path .env
Select-String -Path .env -Pattern '^HORIZON_KMA_API_KEY=' | ForEach-Object { $_.Line.Split('=')[0] }

# --- Ubuntu 서버 원격 헬스 (SSH) ---
ssh jeon@192.168.219.100 "curl -s http://localhost:9080/api/health"

# --- Ubuntu DB 터널 (DBeaver 등) ---
# ssh -L 55432:localhost:55432 jeon@192.168.219.100
# → localhost:55432 / DB horizon / user horizon
```

#### GitHub (브라우저 · 선택)

| 확인 | 위치 |
|------|------|
| Runner Idle/Busy | Repo → Settings → Actions → **Self-hosted runners** |
| 배포 성공 여부 | Repo → **Actions** → `Deploy Docker (Ubuntu self-hosted)` |
| 최신 커밋 | Repo → **Code** → `master` |

> **DEV_SETUP.md** — Windows·macOS 개발 PC + Tailscale DB 터널 ([§7-3](UBUNTU_SERVER_SETUP.md#7-3-db--회사외부-개발-pc-tailscale--ssh-터널) Ubuntu 서버 측).

---

## 7. 외부 접속

내부 IP `192.168.219.100`만으로는 **외부( LTE·심사 ) 접속 불가**.

| | **Quick Tunnel** (현행) | **Named Tunnel** (다음 · 포폴) |
|--|-------------------------|--------------------------------|
| URL | `https://xxxx.trycloudflare.com` | `https://horizon-app.com` 등 **고정** |
| URL 변경 | ❌ **재시작마다** | ✅ 동일 |
| 도메인 | 불필요 | 필요 |
| 용도 | **서버 상시 가동 + 임시 데모** | **이력서·해커톤 제출** |

### 7-1. Quick Tunnel (현행 · Ubuntu)

**systemd `cloudflared-quick`** — SSH 끊어도 유지.

**체크리스트**

| ✅/☐ | 작업 |
|------|------|
| ✅ | `cloudflared` 설치 |
| ✅ | systemd unit · `enable --now cloudflared-quick` |
| ☐ | LTE `/designer` · URL journal 기록 |

**1회 설치 + systemd (복붙):**

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
sudo dpkg -i /tmp/cloudflared.deb

which cloudflared   # ExecStart 경로와 동일하게

cd ~/apps/horizon
docker compose ps
curl -s http://localhost:9080/api/health

pkill -f 'cloudflared tunnel --url' || true

sudo tee /etc/systemd/system/cloudflared-quick.service << 'EOF'
[Unit]
Description=Cloudflare Quick Tunnel to Horizon :9080
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/cloudflared tunnel --url http://127.0.0.1:9080 --no-autoupdate
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared-quick
sudo journalctl -u cloudflared-quick -n 50 --no-pager | grep trycloudflare
```

**운영 · URL 확인**

```bash
sudo systemctl is-active cloudflared-quick
sudo journalctl -u cloudflared-quick -n 100 --no-pager | grep trycloudflare
sudo journalctl -u cloudflared-quick -n 100 --no-pager \
  | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1
curl -s http://localhost:9080/api/health
curl -sI https://opt-birds-built-streets.trycloudflare.com/api/health
```

| 명령 | 용도 |
|------|------|
| `grep trycloudflare` (journal) | 로그에서 URL 줄 보기 |
| `grep -oE … \| tail -1` | **현재 URL 한 줄** |
| `curl localhost:9080/api/health` | Docker (터널 무관) |
| `curl -sI https://…/api/health` | 외부 HTTPS 확인 |

**기록 (2026-06-28):** `https://opt-birds-built-streets.trycloudflare.com/designer`

| 명령 | 용도 |
|------|------|
| `sudo systemctl disable --now cloudflared-quick` | 중지 (Named 전환 전) |

**URL과 무관 (유지):** `git push` 배포 · `docker compose up --build`  
**URL 재시작·재부팅 후:** §7-1 journal URL 추출 명령 재실행.

**foreground 테스트만 (SSH 끊으면 종료):**

```bash
cloudflared tunnel --url http://localhost:9080 --no-autoupdate
```

**URL · Docker · 재시작**

| 이벤트 | Quick URL | Docker |
|--------|-----------|--------|
| `git push` 배포 · `docker compose up --build` | ✅ 유지 | 재빌드 |
| `systemctl restart cloudflared-quick` · Ubuntu 재부팅 | ⚠️ 변경 가능 | — |
| SSH만 끊음 (systemd) | ✅ 유지 | — |

**문제 해결**

| 증상 | 확인 |
|------|------|
| 502 | `docker compose ps` · `curl localhost:9080/api/health` |
| URL 모름 | `sudo journalctl -u cloudflared-quick -n 100 \| grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' \| tail -1` |
| Named CORS | `.env` `HORIZON_CORS_ORIGINS`에 `https://도메인` |

### 7-2. Named Tunnel (예정 · 고정 도메인)

도메인 구매 후 (예: `horizon-app.com`). **포폴·해커톤 제출용.**

| ☐ | 작업 |
|---|------|
| ☐ | 도메인 (가비아/카페24/Cloudflare · 예: `horizon-app.com`) |
| ☐ | `cloudflared tunnel login` → `create` → `route dns` |
| ☐ | `/etc/cloudflared/config.yml` → `http://localhost:9080` |
| ☐ | `.env` `HORIZON_CORS_ORIGINS`에 `https://도메인` |
| ☐ | Quick systemd 중지: `sudo systemctl disable --now cloudflared-quick` |

Ubuntu Named Tunnel 명령 전체: 아래 §8 요약.

### 7-3. DB — 회사·외부 개발 PC (Tailscale + SSH 터널)

**55432 인터넷 개방 ❌** · **Tailscale + SSH `-L`** 권장 (집 LAN이 아닌 회사 PC 등).

#### Ubuntu — Tailscale 1회 설정

```bash
# 1) 설치
curl -fsSL https://tailscale.com/install.sh | sh

# 2) 로그인 (브라우저 URL 출력 → 같은 계정으로 승인)
sudo tailscale up

# 3) 확인
tailscale status
tailscale ip -4          # 예: 100.x.x.x — 맥/Windows 스크립트에 기록
```

SSH는 이미 UFW `OpenSSH` 허용 상태면 추가 작업 없음.

```bash
sudo systemctl status ssh
sudo ufw status | grep 22
```

**Tailscale IP 메모:** `100.____________` (맥북·회사 PC와 **동일 Tailscale 계정**)

#### macOS (맥북) — 테스트·개발 PC

**1) Tailscale (1회)**

1. [tailscale.com/download](https://tailscale.com/download) → **macOS** 설치 (또는 App Store)
2. 메뉴바 Tailscale → **Log in** → **Ubuntu와 같은 계정**
3. Ubuntu가 목록에 **Connected** 인지 확인

**2) SSH 키 (최초 1회, 비밀번호 매번 안 치려면)**

```bash
# 맥북 터미널 — 아직 키 없으면
ssh-keygen -t ed25519 -C "mac-horizon-dev"   # Enter 연타 OK
ssh-copy-id jeon@100.x.x.x                   # Ubuntu tailscale ip -4
# 또는 LAN: ssh-copy-id jeon@192.168.219.100
```

**3) DB 터널 (개발할 때마다 · 터미널 1)**

```bash
cd ~/path/to/horizon
chmod +x scripts/ssh-db-tunnel-tailscale.sh
# scripts/ssh-db-tunnel-tailscale.sh 안의 100.x.x.x 를 Ubuntu IP로 바꾸거나:
./scripts/ssh-db-tunnel-tailscale.sh 100.x.x.x

# 직접:
ssh -L 55432:localhost:55432 jeon@100.x.x.x
```

창 **닫지 말 것** — 닫으면 DB 끊김.

**4) `.env.dev` (1회)**

```bash
cp .env.dev.remote.example .env.dev
# HORIZON_KMA_API_KEY 등 필요 값 채우기
```

**5) 앱 실행 (터미널 2·3)**

```bash
# 터미널 2 — Spring
./gradlew bootRun

# 터미널 3 — 프론트
cd frontend && npm install && npm run dev
```

브라우저: `http://localhost:5173` · DB: DBeaver `localhost:55432` / `horizon` / `horizon`

**6) 연결 테스트 (터널 연 후)**

```bash
nc -zv localhost 55432
# 또는
psql "postgresql://horizon:horizon@localhost:55432/horizon" -c 'select 1'
```

| 확인 | 명령 |
|------|------|
| Tailscale 본인 IP | `tailscale ip -4` (맥) |
| Ubuntu 보이는지 | `tailscale status` |
| SSH | `ssh jeon@100.x.x.x echo ok` |

#### Windows (회사·집 PC) — 개발 PC

상세: [DEV_SETUP.md](DEV_SETUP.md)

**1) Tailscale (1회 · PowerShell 관리자)**

```powershell
$ts = "C:\Program Files\Tailscale\tailscale.exe"
& $ts up
& $ts status
& $ts ip -4
```

Ubuntu와 **같은 계정** · Ubuntu `tailscale ip -4` 메모.

**2) SSH 키 (최초 1회)**

```powershell
ssh-keygen -t ed25519 -C "win-horizon-dev" -f "$env:USERPROFILE\.ssh\id_ed25519"
$ubuntuIp = "100.x.x.x"
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh jeon@${ubuntuIp} "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
ssh jeon@$ubuntuIp echo ok
```

**3) DB 터널 (개발할 때마다 · 터미널 1)**

```powershell
cd e:\workspace\horizon
.\scripts\ssh-db-tunnel-tailscale.bat 100.x.x.x
# 또는 bat 안 set TAILSCALE_IP=100.x.x.x 수정 후:
.\scripts\ssh-db-tunnel-tailscale.bat
```

창 **닫지 말 것**.

**4) `.env.dev` (1회)**

```powershell
copy .env.dev.remote.example .env.dev
```

**5) 앱 실행 (터미널 2·3·4)**

| # | 명령 |
|---|------|
| 2 | `cd ai` → `python -m uvicorn app.main:app --reload --port 8000` |
| 3 | `.\gradlew.bat bootRun` |
| 4 | `cd frontend` → `npm run dev` |

**6) 연결 테스트**

```powershell
Test-NetConnection localhost -Port 55432
```

| 확인 | 명령 |
|------|------|
| Tailscale | `& "C:\Program Files\Tailscale\tailscale.exe" status` |
| SSH | `ssh jeon@100.x.x.x echo ok` |

#### 같은 집 Wi‑Fi만 (Tailscale 없이 · Windows)

```powershell
ssh -L 55432:localhost:55432 jeon@192.168.219.100
```

앱·웹 데모에 DB URL 공개 **불필요**. Spring Docker는 내부 `db:5432` 사용.

---

## 8. Cloudflare Named Tunnel (Ubuntu 명령 요약)

**Quick Tunnel** → §7-1  
**Named Tunnel** → §7-2 · 아래

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

cloudflared tunnel login
cloudflared tunnel create horizon
cloudflared tunnel route dns horizon horizon-app.com

sudo tee /etc/cloudflared/config.yml << 'EOF'
tunnel: <TUNNEL_ID>
credentials-file: /home/jeon/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: horizon-app.com
    service: http://localhost:9080
  - service: http_status:404
EOF

sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

`.env`에 `HORIZON_CORS_ORIGINS=http://192.168.219.100:9080,https://horizon-app.com` 추가 후:

```bash
cd ~/apps/horizon
docker compose up -d app
```

---

## 9. (참고) Windows 집 PC → Ubuntu 전환 요약

| 항목 | Ubuntu (현행) |
|------|----------------|
| 앱 · DB | Docker on `192.168.219.100:9080` |
| DB 데이터 | Windows `pg_dump` → Ubuntu `horizon` |
| 배포 | Self-hosted Runner · `master` push |
| Tailscale / DEPLOY Secrets | **미사용** |
| 외부 URL (현행) | `https://opt-birds-built-streets.trycloudflare.com` (journal로 재확인) |
| 외부 URL (예정) | Named Tunnel → `https://horizon-app.com` (도메인 구매 후) |

---

## 10. 트러블슈팅

| 증상 | 원인 · 조치 |
|------|-------------|
| `Permission denied` on apt | **`sudo apt update`** 사용 |
| `upgrade: command not found` | **`sudo apt upgrade -y`** (`apt upgrade` 형태) |
| `docker: permission denied` | `sudo usermod -aG docker jeon` → **SSH 재접속** |
| `git clone` Permission denied | §2-3 SSH 키 · `~/.ssh/config` |
| Runner `Not configured` | `./config.sh` 먼저 ( `./run.sh` 전 ) |
| Runners 회색 · Actions green | UI 지연 가능 · `svc.sh status` · `Listening for Jobs` |
| Actions Queued forever | Runner `active`? · `sudo ./svc.sh start` |
| `./svc.sh: command not found` | **actions-runner 폴더**에서 실행 (horizon 아님) |
| UFW 후 SSH 끊김 | 콘솔에서 `sudo ufw allow OpenSSH` |
| 빌드 OOM | `free -h`, swap 추가, 다른 작업 중단 |
| health fail | `docker compose logs app --tail 100` |
| KMA sample/null | `.env` `HORIZON_KMA_API_KEY` 확인 → `docker compose up -d --build app` |

---

## 11. 관련 파일

| 파일 | 역할 |
|------|------|
| `compose.yaml` | Postgres + AI + Spring |
| `.env.example` | 환경 변수 템플릿 |
| `scripts/deploy-docker.sh` | Linux 배포 |
| `.github/workflows/deploy.yml` | GitHub Actions |
| `.cursor/rules/secrets-handling.mdc` | 토큰·키 채팅 금지 |

---

## 12. 전체 명령어 순서 (복붙용 · 신규 서버)

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

### 블록 6 — Self-hosted Runner (Tailscale 없음)

GitHub → Runners → New self-hosted runner → Linux (화면 명령 따름)

```bash
mkdir -p ~/actions-runner && cd ~/actions-runner
# curl + tar (GitHub 화면)

./config.sh --url https://github.com/ktdvlp-jih/horizon --token <REGISTRATION_TOKEN>
sudo ./svc.sh install jeon
sudo ./svc.sh start
```

---

**내부망 URL:** http://192.168.219.100:9080  
**외부 URL (현행, 2026-06-28):** https://opt-birds-built-streets.trycloudflare.com/designer  

**URL 확인:** `sudo journalctl -u cloudflared-quick -n 100 --no-pager | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1`  

**외부 URL (예정):** Named Tunnel → [§7-2](#7-2-named-tunnel-예정--고정-도메인)
