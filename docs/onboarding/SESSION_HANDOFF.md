# PC 전환 · 맥락 동기화

> **처음 설정:** [SETUP.md](SETUP.md) · **문서 목록:** [README.md](README.md)

---

## 대화·코드 복원 (2026-06-17 SpecStory 세션)

> **대화 본문:** `.specstory/history/2026-06-17_15-28-01Z-project-tech-stack-integration.md` (약 44k줄 · Cursor Session `35737e04`)  
> **요약 인덱스:** 이 파일. SpecStory @ 한 개가 **전체 채팅 복원**의 기준.

| 항목 | 값 |
|------|-----|
| **코드 베이스 (재개)** | `rebuild/ddda1fc-baseline` · `ddda1fc` |
| **현재 로컬 브랜치** | `master` (`3699536`) — 작업 전 `rebuild/ddda1fc-baseline` checkout 권장 |
| **무시** | `experiment/threejs-city-model` (3D·미기후 실험 — 폐기) |

### Agent 첫 메시지 (복원 후)

```text
@.specstory/history/2026-06-17_15-28-01Z-project-tech-stack-integration.md
@docs/onboarding/SESSION_HANDOFF.md

2026-06-17 SpecStory 세션 맥락으로 이어서. 코드는 ddda1fc 기준.
```

---

### 세션에서 확정한 것 (기억할 결정)

**제품·카피**

| 항목 | 확정 |
|------|------|
| 프로젝트명 | **도시 기후 설계자** |
| 한 줄 | 기상청 데이터로 도시를 설계하고, 열섬·대기·재난을 검증하는 AI 웹 체험 |
| 대상 | 중·고등, 기후·재난·환경 교육 (교사 시연 가능) |
| 학습 목표 | 여러 환경 문제를 동시에 견디는 **균형 잡힌 도시 설계** |
| 대외 카피 | 열섬·**대기**·재난 중심 (앱 안에는 미세먼지·농어업 렌즈 유지) |
| INDUSTRY 타일 | **경제 축 아님** — 대기·오염 트레이드오프 (공장=PM↑) |
| 4축 | 코드·앱에 4축 유지, 시연·1페이지는 **열섬 입문 → 단계 확장** |

**기술·인프라 (세션 후반)**

| 항목 | 상태 |
|------|------|
| Ubuntu Docker `:9080` | 앱·DB |
| Self-hosted Runner | `master` push → `deploy-docker.sh` |
| Quick Tunnel | `cloudflared-quick` **systemd** 권장 (SSH 끊어도 유지) |
| Named Tunnel | 예정 (`horizon-app.com`) — 포폴용 고정 URL |
| 개발 DB | Tailscale + SSH `-L 55432` → Ubuntu Postgres |
| 문서 | `SETUP` → `UBUNTU_SERVER_SETUP` / `DEV_SETUP` / `SESSION_HANDOFF` (중복 MD 정리됨) |

**KMA (ddda1fc 시점)**

| API | 상태 |
|-----|------|
| ASOS 기온·일사·강수 | ✅ API허브 |
| 황사 PM10 | ✅ |
| 태풍·지진 | ✅ |
| 4축 회복탄력성 P1~P9 | ✅ 코드 반영 |

---

### 세션 마지막까지 한 일 (SpecStory tail)

1. KMA API허브·4축·Designer UI/UX·캠페인 Lv1~10·튜토리얼·모바일 탭
2. Cloudflare Quick vs Named Tunnel 문서화 · **systemd / nohup** 가이드 (커서 ~38996)
3. Cursor 룰(`secrets-handling`, `contest-constraints`) · SpecStory git 동기화
4. `tmp-smoke-eval.json` 삭제 · `.gitignore` 처리
5. SpecStory = 대화 본문, SESSION_HANDOFF = 요약 인덱스 역할 확정

---

### 다음 우선순위 (세션에서 정리된 TODO)

1. **`RESILIENCE_TEST_GUIDE.md` §1~5** 수동 체험 (`/designer` 게스트 → 렌즈 → AI 코치)
2. **개발계획서 제출** — `docs/개발계획서_도시기후설계자.md` → 공고 양식2
3. **시연 URL** — Quick Tunnel systemd URL journal 확인 · 심사용 Named Tunnel 검토
4. **배포·잔여** — evaluate 401, 미커밋 정리, Docker 재빌드 후 `source: kma` 확인
5. **air-2 공장 미션** · PM10·재난 라이브 안정화 (계획서·UI 문구 일치)

---

### 세션 주요 토픽 타임라인 (참고)

| 구간 | 주제 |
|------|------|
| 초반 | INDUSTRY=경제? · 4축·프로젝트명·출품 카피 |
| 중반 | KMA API 신청·연동 · PM10 · 다음 플랜 |
| 중후반 | Designer UX · 튜토리얼 · 모바일 · 401 수정 |
| 후반 | Ubuntu 배포 · Quick/Named Tunnel · Tailscale DB · SpecStory PC 동기화 |

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
5. **대화 이어가기** — 아래 §「SpecStory로 이어가기」 참고

> `.specstory/statistics.json`만 `.gitignore`. **history·`.cursor/rules`는 commit 대상.**

### SpecStory로 이어가기 (권장 · 대화 본문)

**맞습니다.** `@SESSION_HANDOFF.md`만으로는 **요약**만 넘기는 것이고, **실제 대화 전체**는 `.specstory/history/*.md`에 있습니다.

| 방법 | 설명 |
|------|------|
| **A. SpecStory 패널** | Cursor 사이드바 SpecStory → `git pull` 후 목록에서 세션 클릭 → 「Continue」/해당 채팅 열기 |
| **B. @ 파일 첨부** | 새 Agent 채팅 첫 메시지에 `@.specstory/history/2026-06-17_15-28-01Z-project-tech-stack-integration.md` |
| **C. SESSION_HANDOFF** | 파일이 길 때 **요약·IP·체크리스트**만 빠르게 넘길 때 (선택) |

**다른 PC 워크플로 (Windows 회사 PC 예):**

```powershell
git pull
# SpecStory 확장 설치되어 있으면 history 자동 인식
```

새 채팅:

```text
@.specstory/history/2026-06-17_15-28-01Z-project-tech-stack-integration.md

git pull 완료. Tailscale DB 터널 테스트 이어서 해줘.
```

`SESSION_HANDOFF.md`는 **SpecStory 대체가 아님** — IP·아키텍처·할 일 목록 **인덱스**. 긴 SpecStory 파일(수 MB)을 Agent에 통째로 @ 할 때 토큰이 크면 **SESSION_HANDOFF + 최근 SpecStory 파일** 조합을 쓰면 됩니다.

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

**권장 (SpecStory):**

```text
@.specstory/history/2026-06-17_15-28-01Z-project-tech-stack-integration.md

git pull 완료. [이어서 할 작업] …
```

**짧은 맥락만 (선택):**

```text
@docs/onboarding/SESSION_HANDOFF.md

git pull 완료. Windows Tailscale DB 터널 테스트해줘.
```

---

## 현재 작업 맥락

> **마지막 동기화:** 2026-06-29 · **대화** SpecStory `2026-06-17_15-28-01Z` · **코드** `ddda1fc` (`rebuild/ddda1fc-baseline`)

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
