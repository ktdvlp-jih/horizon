# Cloudflare Tunnel — 외부 데모 URL

> **Ubuntu 서버 (현행):** [UBUNTU_SERVER_SETUP.md §7](UBUNTU_SERVER_SETUP.md#7-외부-접속)
> **Windows 집 PC (레거시):** [SETUP.md §8](SETUP.md#8-외부-데모-url-집-pc) · `cloudflared tunnel --url http://localhost:9080`

집 Ubuntu Docker(`:9080`)를 **인터넷에서 HTTPS로** 쓰려면 Cloudflare Tunnel을 씁니다.

## 로드맵 (Horizon)

| 단계 | 방식 | URL | 상태 |
|------|------|-----|------|
| **1 · 현행** | Quick Tunnel + **systemd** `cloudflared-quick` | `https://opt-birds-built-streets.trycloudflare.com` (예 · 터널 재시작 시 변경) | Ubuntu 상시 가동 · SSH 끊어도 유지 |
| **2 · 예정** | **Named Tunnel** + 본인 도메인 (가비아/카페24 등) | `https://horizon-app.com` (예) | 도메인 구매 후 §2 |

---

## Quick Tunnel vs Named Tunnel

| | **Quick Tunnel** | **Named Tunnel** |
|--|------------------|------------------|
| **URL** | `https://xxxx.trycloudflare.com` | `https://horizon-app.com` (본인 도메인) |
| **URL 고정** | ❌ **프로세스 재시작마다 변경** | ✅ **항상 동일** |
| **도메인 구매** | ❌ 불필요 (0원) | ✅ 필요 (연 1~2만 원) |
| **Cloudflare 계정** | ❌ 불필요 | ✅ 필요 (+ 도메인 Zone) |
| **설정** | 명령 **한 줄** | `login` · `create` · DNS · systemd |
| **공유기 포트포워딩** | ❌ 불필요 | ❌ 불필요 |
| **HTTPS** | ✅ 자동 | ✅ 자동 |
| **용도** | **지금·테스트·서버 상시 가동 중 임시 데모** | **포폴·해커톤·이력서 고정 URL** |
| **해커톤 공고** | △ URL 변경·불안정 → **지양** (`.cursor/rules/contest-constraints.mdc`) | ✅ 권장 |

**현재 단계:** Quick Tunnel · systemd `cloudflared-quick` (§1)  
**다음 단계:** 도메인 구매 → Named Tunnel (§2) · Quick 서비스 중지

---

## 1. Quick Tunnel (현행 · Ubuntu)

도메인·Cloudflare 로그인 **없이** 집 Docker `:9080`을 밖에 노출합니다.  
**운영:** `systemd` 서비스 `cloudflared-quick` — SSH 종료·로그아웃 후에도 터널 유지.

### 1-1. cloudflared 설치 (1회)

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
sudo dpkg -i /tmp/cloudflared.deb
cloudflared --version
```

### 1-2. 앱 기동 확인

```bash
cd ~/apps/horizon
docker compose ps
curl -s http://localhost:9080/api/health
```

### 1-3. 터널 실행 — systemd (현행 · 권장)

```bash
which cloudflared
# 예: /usr/local/bin/cloudflared — 아래 ExecStart 와 동일하게

cd ~/apps/horizon
docker compose ps
curl -s http://localhost:9080/api/health

# foreground 터널이 있으면 종료
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
```

> `ExecStart=` 경로 = **`which cloudflared` 결과** (서버마다 `/usr/local/bin` 또는 `/usr/bin`).

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared-quick
sudo systemctl status cloudflared-quick --no-pager

sudo journalctl -u cloudflared-quick -n 50 --no-pager | grep trycloudflare
```

- **데모:** `https://opt-birds-built-streets.trycloudflare.com/designer`
- **헬스:** `https://opt-birds-built-streets.trycloudflare.com/api/health`
- LTE(휴대폰 데이터)로 **내부망이 아닌지** 확인

**일상 URL 확인:**

```bash
sudo systemctl is-active cloudflared-quick
sudo journalctl -u cloudflared-quick -n 100 --no-pager | grep trycloudflare
sudo journalctl -u cloudflared-quick -n 100 --no-pager \
  | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1
curl -s http://localhost:9080/api/health
curl -sI https://opt-birds-built-streets.trycloudflare.com/api/health
```

> **현재 URL (2026-06-28):** `https://opt-birds-built-streets.trycloudflare.com` — 터널 재시작 후 **URL 한 줄 추출** 명령 재실행.

**중지:** `sudo systemctl disable --now cloudflared-quick`

### 1-4. 터널 실행 — foreground (테스트만)

SSH 끊으면 **종료**됩니다. 상시 운영은 §1-3 systemd 사용.

```bash
cd ~/apps/horizon
which cloudflared || sudo dpkg -i /tmp/cloudflared.deb
curl -s http://localhost:9080/api/health
cloudflared tunnel --url http://localhost:9080 --no-autoupdate
```

### 1-5. CORS

앱·프론트를 **같은 9080**에서 서빙하므로 Quick Tunnel URL로 접속 시 **same-origin** — 별도 CORS 설정 **보통 불필요**.  
백엔드는 `https://*.trycloudflare.com` 패턴을 이미 허용 (`WebConfig`).

### 1-6. URL 유지 · Docker · 재시작

| 이벤트 | Quick Tunnel URL | Docker 앱 |
|--------|------------------|-----------|
| `git push` → **deploy** · `docker compose up --build` | ✅ **그대로** | 재빌드·재기동 |
| **`systemctl restart cloudflared-quick`** | ⚠️ **바뀔 수 있음** | 영향 없음 |
| **Ubuntu 재부팅** | ⚠️ systemd가 다시 띄움 → **새 URL** | `horizon.service`로 기동 |
| SSH만 끊음 (systemd 사용) | ✅ **그대로** | — |

재부팅·터널 재시작 후: 위 **§1-3 URL 확인** 명령 재실행.

### 1-3a. 현재 URL · 도메인 확인 (치트시트)

| 확인 | 명령 |
|------|------|
| 터널 active? | `sudo systemctl is-active cloudflared-quick` |
| 로그·URL | `sudo journalctl -u cloudflared-quick -n 100 --no-pager \| grep trycloudflare` |
| URL 한 줄 | `sudo journalctl -u cloudflared-quick -n 100 --no-pager \| grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' \| tail -1` |
| Docker health | `curl -s http://localhost:9080/api/health` |
| 외부 health | `curl -sI https://opt-birds-built-streets.trycloudflare.com/api/health` |

**기록 (2026-06-28):** `https://opt-birds-built-streets.trycloudflare.com` — Named Tunnel 전환 전까지 journal로 재확인.

### 1-7. nohup (대안)

systemd 대신 SSH만 끊어도 유지 (재부oot 시 **수동** 재실행). §1-3 권장.

```bash
pkill -f 'cloudflared tunnel --url' || true
nohup cloudflared tunnel --url http://127.0.0.1:9080 --no-autoupdate > ~/cloudflared-quick.log 2>&1 &
grep -o 'https://[^ ]*trycloudflare.com' ~/cloudflared-quick.log | tail -1
```

### 1-8. Windows (레거시)

```powershell
cd e:\workspace\horizon
docker compose up -d
cloudflared tunnel --url http://localhost:9080 --no-autoupdate
```

---

## 2. Named Tunnel (다음 · 고정 도메인)

포폴·해커톤 제출용. **본인 도메인** + Cloudflare Zone 필요.

### 2-1. 사전 준비

1. [Cloudflare](https://dash.cloudflare.com/) 계정 (또는 가비아/카페24 도메인 → Cloudflare Add site + NS 변경)
2. 도메인 Zone **Active**
3. Ubuntu `cloudflared` 설치 (§1-1과 동일)

### 2-2. Ubuntu 명령

`horizon-app.com`을 실제 도메인으로 바꿉니다.

```bash
cloudflared tunnel login
cloudflared tunnel create horizon
cloudflared tunnel list                    # TUNNEL_ID 메모
cloudflared tunnel route dns horizon horizon-app.com

sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/jeon/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: horizon-app.com
    service: http://localhost:9080
  - service: http_status:404
```

```bash
chmod 600 ~/.cloudflared/<TUNNEL_ID>.json
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

### 2-3. CORS · 앱 재기동

`~/apps/horizon/.env`:

```env
HORIZON_CORS_ORIGINS=http://192.168.219.100:9080,https://horizon-app.com
```

```bash
cd ~/apps/horizon && docker compose up -d app
```

### 2-4. Quick → Named 전환 시

1. Quick Tunnel systemd 사용 중이면: `sudo systemctl disable --now cloudflared-quick`
2. Named Tunnel `cloudflared` 서비스 기동
3. `.env` CORS에 **고정 https 도메인** 추가
4. README·이력서 URL을 **고정 도메인**으로 교체

---

## 3. Docker Compose + Tunnel Token (Named · 선택)

Zero Trust 대시보드에서 Tunnel Token 발급 후 `compose.yaml`에 `cloudflared` 서비스 추가 가능.  
상세: [Cloudflare Remote Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel/)

---

## 4. 보안 (외부 공개 시)

- `JWT_SECRET` — 충분히 긴 랜덤 값
- `HORIZON_AUTH_SEED_ADMIN=false` (공개 데모)
- `POSTGRES_PASSWORD` — 기본값에서 변경
- Quick Tunnel URL은 **임의 공개** — 민감 데모·admin 노출 주의

---

## 5. 문제 해결

| 증상 | 확인 |
|------|------|
| 502 Bad Gateway | `docker compose ps` · `curl localhost:9080/api/health` |
| URL을 모르겠음 | `sudo journalctl -u cloudflared-quick -n 100 \| grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' \| tail -1` |
| CORS (Named) | `HORIZON_CORS_ORIGINS`에 실제 `https://도메인` |
| 로그인 401 | `JWT_SECRET` compose 재시작 후에도 동일한지 |

---

## 참고

- [Cloudflare Tunnel 문서](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- [Named Tunnel 설정](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel/)
