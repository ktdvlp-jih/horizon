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
| **Git push** | SSH (`setup-github-ssh.ps1`) — PC마다 1회 |

---

## 새 PC 빠른 시작

### 개발 PC로 전환

```text
1. git clone / git pull
2. SETUP.md §4 — JDK/Node/Python/Tailscale
3. copy .env.dev.remote.example → .env.dev  (.env는 git 제외 → 수동 복사)
4. scripts\ssh-db-tunnel-tailscale.bat — Ubuntu Tailscale IP (§7-3 · DEV_SETUP.md)
5. setup-github-ssh.ps1 — GitHub SSH key 등록
6. 매일: 터널 → bootRun → npm run dev
```

### 집 PC로 전환

```text
1. git pull
2. copy .env.example → .env (최초)
3. docker compose up -d
4. SETUP.md §2 — sshd, deploy-ssh, deploy-task (1회)
5. SETUP.md §3 — GitHub Secrets (1회)
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

| | 개발 PC | 집 PC Docker |
|--|---------|--------------|
| App | 5173 | **9080** |
| Spring | 8080 | (내부 8080) |
| AI | 8000 | **9800** |
| DB | 55432 (터널) | **55432** |
| Admin | 5174 | `/admin` on 9080 |

---

## Cursor 대화 동기화

### SpecStory + Git (확정 — PC 간 채팅 이력)

1. 양쪽 PC에 **SpecStory** 확장 설치
2. 채팅은 `.specstory/history/*.md`에 **자동 저장**
3. PC 바꾸기 전:

```powershell
git add .specstory
git commit -m "SpecStory 채팅 이력 동기화"
git push
```

4. 다른 PC: `git pull`
5. SpecStory 패널 또는 `@.specstory/history/...` 로 이전 대화 참조

> `.specstory/statistics.json`만 `.gitignore`. **history는 commit 대상.**

### Export Transcript (보조)

1. Cursor → Export Transcript
2. `docs/chat-exports/YYYY-MM-DD-주제.md`
3. `git commit` + `push`

### 이 문서 (SESSION_HANDOFF)

IP·체크리스트 + **Agent 이어하기 맥락** 유지. 변경 시 commit.

---

## 현재 작업 맥락 (Agent 이어하기)

> **마지막 동기화:** 2026-06-24 · 집 PC 새벽 커밋 `4eb116a`~`38ac9cc` 반영  
> **구현 상태:** [RESILIENCE_DESIGN.md](../RESILIENCE_DESIGN.md) · [RESILIENCE_TEST_GUIDE.md](../RESILIENCE_TEST_GUIDE.md) 기준 **P1~P9 코드 반영 완료** — **수동 체험 테스트는 아직 미실시** (체크리스트 `[ ]` 전부 미확인)  
> **주의:** 4축 작업 SpecStory 채팅 파일 없음. 아래 + `RESILIENCE_*.md`를 @ 로 넘기면 Agent가 맥락을 잡을 수 있음.

### 완료 — 도시 기후 설계자 4축 통합 (M1~M5)

| 단계 | 커밋 | 내용 |
|------|------|------|
| 기획 | `4eb116a` | [RESILIENCE_DESIGN.md](../RESILIENCE_DESIGN.md) — 6개 병렬 → `/designer` 단일 메인 |
| M1 P1·P2 | `bc6be7d` | 다중 렌즈 평가 (열섬·미세먼지·재난·농어업), 종합 회복탄력성 점수 |
| M2 P3 | `5b1011a` | INDUSTRY 타일 + 미세먼지 렌즈 |
| M3 P4 | `aa39191` | 농어업 광역 레이어 (coarse zone) |
| M4 P5~P7 | `1712459`~`a070a85` | 시나리오 고정 가중치 · 레벨 시스템 · 스트레스 테스트 타임라인 |
| M5 P8~P9 | `bd420ae`~`2e45109` | 통합 AI 코치 · `/disaster` → `/designer` 리다이렉트 |
| 문서 | `d44ec49`~`38ac9cc` | [RESILIENCE_TEST_GUIDE.md](../RESILIENCE_TEST_GUIDE.md) · 튜토리얼 4축 반영 |

### 핵심 진입점

| 영역 | 경로 |
|------|------|
| UI | `/designer` → `ResiliencePanel` (렌즈·레벨·스트레스·코치) |
| 프론트 | `frontend/src/components/designer/ResiliencePanel.tsx`, `lib/levels.ts` |
| 백엔드 | `com.horizon.resilience.service.ResilienceScoring`, `ResilienceOrchestrator` |
| AI | `ai/app/services/resilience_coach_service.py` (없으면 rule 폴백) |
| 라우트 | `/disaster`, `/experiences/*` → `/designer` |

### Agent 이어하기 (새 채팅)

```text
@docs/onboarding/SESSION_HANDOFF.md
@docs/RESILIENCE_DESIGN.md
@docs/RESILIENCE_TEST_GUIDE.md
4축 회복탄력성 작업 이어서 해줘
```

개발 환경·Tailscale·배포 맥락은 `@.specstory/history/2026-06-23_07-16-07Z-project-tech-stack-integration.md` 참고.

### 다음 후보 (우선순위)

- [x] **KMA API 앱 연동** (PM10·평년·재난·생활기상) — `2a3b521` · 상세는 [AI_SESSION_HANDOFF.md](../AI_SESSION_HANDOFF.md)
- [x] **Designer UI/UX** (모바일 탭·시뮬+코치 스택) — `d3c5850`, `53cc5a2`
- [ ] **`RESILIENCE_TEST_GUIDE.md` §1~5 수동 체험** — 다른 PC에서 pull 후 Docker `:9080` 확인
- [ ] §7 빌드 스모크: `compileJava` · `npm run build` · AI `py_compile`
- [ ] 지진 30초 대피 UX, 쓰나미 프로필 UX (기존 백로그)
- [ ] Gemini LLM · KMA API 실연동 (현재 폴백/목 데이터)
- [ ] P1 격자·설계 스키마 단일화 아키텍처 (DESIGN §11)

---

## 체크리스트 (파이프라인 전체)

**집 PC**

- [ ] Docker + `.env` + health 9080
- [ ] Tailscale + IP 기록
- [ ] `setup-deploy-ssh.ps1` (관리자)
- [ ] `setup-deploy-task.ps1` (관리자)
- [ ] GitHub Secrets ×4
- [ ] Actions 성공 1회

**개발 PC**

- [ ] `.env.dev` + npm/pip
- [ ] `ssh-db-tunnel-tailscale.bat` 설정
- [ ] `setup-github-ssh.ps1`
- [ ] 터널 + bootRun + dev 동작

**배포**

- [ ] `master` push → Actions green

---

## 관련 문서

- **[AI_SESSION_HANDOFF.md](../AI_SESSION_HANDOFF.md)** — Cursor AI 대화·KMA/UI 작업 맥락 (SpecStory와 함께 사용)
- [SETUP.md](SETUP.md)
- [DEV_SETUP.md](DEV_SETUP.md)
- [DEPLOY.md](DEPLOY.md)
- [CLOUDFLARE_TUNNEL.md](CLOUDFLARE_TUNNEL.md)
