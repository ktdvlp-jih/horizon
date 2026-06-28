# PC 전환 · 맥락 동기화

> **처음 설정:** [SETUP.md](SETUP.md) · **문서 목록:** [README.md](README.md)

---

## 아키텍처 (확정 · 2026-06)

| 역할 | 방식 |
|------|------|
| **앱 · DB** | Ubuntu Docker `192.168.219.100:9080` |
| **배포** | `master` push → Self-hosted Runner → `deploy-docker.sh` |
| **외부 데모 (현행)** | `https://opt-birds-built-streets.trycloudflare.com` · `cloudflared-quick` |
| **외부 데모 (예정)** | Named Tunnel → `horizon-app.com` |
| **개발 DB** | Tailscale + SSH `-L 55432` → Ubuntu Postgres |
| **Git push** | SSH (`setup-github-ssh.ps1`) — PC마다 1회 |

---

## 새 PC 빠른 시작

### 개발 PC로 전환 (Windows · macOS)

```text
1. git clone / git pull
2. DEV_SETUP.md — Tailscale · SSH · .env.dev
3. scripts\ssh-db-tunnel-tailscale.bat (Win) 또는 ssh-db-tunnel-tailscale.sh (Mac)
4. setup-github-ssh.ps1 — GitHub SSH key (1회)
5. 매일: 터널 → bootRun → npm run dev
```

### Ubuntu 서버

```text
1. git pull
2. UBUNTU_SERVER_SETUP.md — Docker · Runner · §7 외부 URL
```

---

## 환경 값 기록 (팀/본인용 — 아래 수정 후 commit)

> **민감 정보(비밀번호·키)는 적지 마세요.** IP·사용자명만.

| 항목 | 값 |
|------|-----|
| GitHub repo | `ktdvlp-jih/horizon` |
| Ubuntu Tailscale IP | `100.x.x.x` (Ubuntu: `tailscale ip -4`) |
| Ubuntu SSH 사용자 | `jeon` |
| Ubuntu LAN IP (참고) | `192.168.219.100` |
| SSH 터널 DB | `localhost:55432` → Ubuntu Docker Postgres |

### 포트

| | 개발 PC | Ubuntu Docker |
|--|---------|---------------|
| App | 5173 | **9080** |
| Spring | 8080 | (내부 8080) |
| AI | 8000 | **9800** |
| DB | 55432 (터널) | **55432** |
| Admin | 5174 | `/admin` on 9080 |

---

## Cursor 대화 동기화

### SpecStory + Git (PC 간 채팅 이력)

1. 양쪽 PC에 **SpecStory** 확장 설치
2. 채팅은 `.specstory/history/*.md`에 **자동 저장**
3. PC 바꾸기 전:

```powershell
git add .specstory .cursor/rules
git commit -m "SpecStory·Cursor 룰 동기화"
git push
```

4. 다른 PC: `git pull`
5. SpecStory 패널 또는 `@.specstory/history/...` 로 이전 대화 참조

> `.specstory/statistics.json`만 `.gitignore`. **history·`.cursor/rules`는 commit 대상.**

### SpecStory 파일 안내

| 파일 | 내용 |
|------|------|
| `2026-06-17_15-28-01Z-project-tech-stack-integration.md` | **메인 장기 세션** (KMA·4축·UI·인프라) |
| `2026-06-23_07-16-07Z-project-tech-stack-integration.md` | 기술 스택·온보딩 이어하기 |
| `2026-06-23_06-37-44Z-work-history-retrieval-from-another-pc.md` | PC 간 작업 이어하기 |
| `2026-06-24_11-36-41Z-chemical-management-system-development.md` | 최근 세션 (Tailscale·터널·문서) |
| `2026-06-20_18-03-54Z-프로젝트-심사-기준-적합성.md` | 심사 기준 |

### Cursor 룰

| 파일 | 용도 |
|------|------|
| `.cursor/rules/contest-constraints.mdc` | 해커톤 공고 제약 (항상 적용) |
| `.cursor/rules/secrets-handling.mdc` | PAT·SSH 키·토큰 커밋·채팅 금지 |

수동 Export: `docs/chat-exports/README.md`

---

## Agent 이어하기 (새 채팅)

```text
@docs/onboarding/SESSION_HANDOFF.md
@.specstory/history/2026-06-17_15-28-01Z-project-tech-stack-integration.md

git pull 완료. [이어서 할 작업] …
```

---

## 현재 작업 맥락

> **마지막 동기화:** 2026-06-28 · Ubuntu Self-hosted Runner · Quick Tunnel · Tailscale DB 터널 문서화

### KMA API 연동 (완료)

| API | 상태 |
|-----|------|
| ASOS 기온·일사·강수 | ✅ |
| 황사 PM10 | ✅ `source: kma` |
| 태풍·지진 | ✅ |
| 평년·생활기상 | ✅ |
| 여름 체감온도 | ⚠️ NO_DATA 시 null |

### 4축 회복탄력성 (코드 반영 완료 · 수동 테스트 미실시)

상세: [RESILIENCE_DESIGN.md](../RESILIENCE_DESIGN.md) · [RESILIENCE_TEST_GUIDE.md](../RESILIENCE_TEST_GUIDE.md)

```text
@docs/onboarding/SESSION_HANDOFF.md
@docs/RESILIENCE_DESIGN.md
@docs/RESILIENCE_TEST_GUIDE.md
4축 회복탄력성 작업 이어서 해줘
```

### 다음 후보

- [x] KMA API · Designer UI/UX
- [x] Ubuntu 배포 · Quick Tunnel · Tailscale dev 문서
- [ ] `RESILIENCE_TEST_GUIDE.md` §1~5 수동 체험
- [ ] Named Tunnel + 고정 도메인 (`horizon-app.com`)
- [ ] Windows 회사 PC Tailscale DB 터널 실제 테스트

---

## 체크리스트

**Ubuntu**

- [ ] Docker + `.env` + health 9080
- [ ] Self-hosted Runner Idle
- [ ] `cloudflared-quick` active · 외부 URL journal 기록
- [ ] `sudo tailscale up` · `tailscale ip -4` 기록

**개발 PC**

- [ ] `.env.dev` + npm/pip
- [ ] Tailscale (Ubuntu와 같은 계정)
- [ ] `ssh-db-tunnel-tailscale.bat` / `.sh` IP 설정
- [ ] `setup-github-ssh.ps1`
- [ ] 터널 + bootRun + dev 동작

**배포**

- [ ] `master` push → Actions green

---

## 관련 문서

- [SETUP.md](SETUP.md) — 진입점
- [DEV_SETUP.md](DEV_SETUP.md) — Windows·macOS 개발 PC
- [UBUNTU_SERVER_SETUP.md](UBUNTU_SERVER_SETUP.md) — 서버·배포·외부 URL·Tailscale
