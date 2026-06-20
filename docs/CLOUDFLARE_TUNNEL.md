# Cloudflare Tunnel 가이드

Horizon은 외부 데모 노출에 **Cloudflare Tunnel**을 사용합니다.  
현재는 계정/도메인 없이도 동작하는 **Quick Tunnel**을 사용 중이며, 고정 도메인이 필요할 때 **Named Tunnel**로 전환할 수 있습니다.

## 현재: Quick Tunnel (임시 URL)

별도 Cloudflare 계정·도메인 없이 즉시 공개 URL을 발급합니다.

```powershell
# Docker Compose 앱이 9080에서 실행 중일 때
cloudflared tunnel --url http://localhost:9080
```

- 매 실행마다 `*.trycloudflare.com` URL이 바뀝니다.
- 프로덕션/장기 운영에는 부적합합니다.
- Horizon `WebConfig`는 `https://*.trycloudflare.com` CORS를 허용합니다.

## Named Tunnel (고정 도메인) 전환 절차

### 사전 준비

1. [Cloudflare](https://dash.cloudflare.com/) 계정 생성
2. 사용할 도메인을 Cloudflare에 **Zone**으로 추가 (네임서버 위임)
3. [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) 설치

### 1. Cloudflare 로그인

```powershell
cloudflared tunnel login
```

브라우저에서 Zone을 선택하면 `~/.cloudflared/cert.pem`이 생성됩니다.

### 2. 터널 생성

```powershell
cloudflared tunnel create horizon
```

`~/.cloudflared/<TUNNEL_ID>.json` 자격 증명 파일이 생성됩니다.

### 3. DNS 라우팅

```powershell
cloudflared tunnel route dns horizon app.example.com
```

`app.example.com`을 실제 서브도메인으로 바꿉니다.

### 4. 설정 파일

`~/.cloudflared/config.yml` 예시:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: C:\Users\<USER>\.cloudflared\<TUNNEL_ID>.json

ingress:
  - hostname: app.example.com
    service: http://localhost:9080
  - service: http_status:404
```

Docker Compose와 함께 쓸 때는 `localhost:9080` 대신 호스트에서 접근 가능한 앱 포트를 지정합니다.

### 5. 터널 실행

```powershell
cloudflared tunnel run horizon
```

Windows 서비스로 등록하려면:

```powershell
cloudflared service install
cloudflared tunnel run horizon
```

### 6. Horizon CORS 업데이트

`.env`에 고정 도메인을 추가합니다.

```env
HORIZON_CORS_ORIGINS=https://app.example.com,http://localhost:5173
```

Docker 재배포:

```powershell
docker compose up -d --build
```

## Docker Compose + Named Tunnel (권장 패턴)

`compose.yaml`에 `cloudflared` 서비스를 추가할 수 있습니다.

```yaml
  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel run
    environment:
      TUNNEL_TOKEN: ${CLOUDFLARE_TUNNEL_TOKEN}
    depends_on:
      - app
    restart: unless-stopped
```

Cloudflare Zero Trust 대시보드에서 터널을 생성하고 **Tunnel Token**을 발급받아 `.env`에 `CLOUDFLARE_TUNNEL_TOKEN`으로 설정하면 `config.yml` 없이도 운영할 수 있습니다.

Ingress 대상은 Docker 내부 서비스명을 사용합니다.

```yaml
# Zero Trust 대시보드 Public Hostname 설정
# Service: http://app:8080
```

## 보안 체크리스트 (외부 공개 시)

- `JWT_SECRET`을 충분히 긴 랜덤 값으로 변경
- 데모 admin 시드(`HORIZON_AUTH_SEED_ADMIN=false`) 비활성화
- `.env`의 API 키·DB 비밀번호를 기본값에서 변경
- HTTPS는 Cloudflare가 종단에서 제공 (터널 → Cloudflare Edge → 사용자)

## 문제 해결

| 증상 | 확인 |
|-----------|------|
| 502 Bad Gateway | `app` 컨테이너 헬스, ingress URL(`http://app:8080`) |
| CORS 오류 | `HORIZON_CORS_ORIGINS`에 실제 접속 도메인 포함 |
| 로그인 401 | JWT_SECRET이 compose 재시작 후에도 동일한지 확인 |

## 참고

- [Cloudflare Tunnel 문서](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- [Named Tunnel 설정](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel/)
