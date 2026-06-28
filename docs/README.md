# Horizon 문서

> **처음 시작:** [onboarding/SETUP.md](onboarding/SETUP.md) — 집 PC · GitHub · 개발 PC · 배포 **순서대로**  
> **다른 프로젝트 이식:** [template/BOOTSTRAP.md](template/BOOTSTRAP.md)

---

## 템플릿 (다른 레포 이식)

| 문서 | 용도 |
|------|------|
| **[template/BOOTSTRAP.md](template/BOOTSTRAP.md)** | Agent 프롬프트 · 복사 파일 목록 |
| [template/TECH_STACK.md](template/TECH_STACK.md) | 스택·아키텍처·배포 파이프라인 상세 |
| [template/README.md](template/README.md) | 템플릿 폴더 안내 |

---

## 온보딩 (환경 설정 · 배포)

| 문서 | 용도 |
|------|------|
| **[onboarding/SETUP.md](onboarding/SETUP.md)** | 전체 1회 설정 + 매일 워크플로 |
| [onboarding/DEV_SETUP.md](onboarding/DEV_SETUP.md) | 개발 PC 로컬 실행 |
| [onboarding/DEPLOY.md](onboarding/DEPLOY.md) | GitHub Actions 자동 배포 |
| [onboarding/CLOUDFLARE_TUNNEL.md](onboarding/CLOUDFLARE_TUNNEL.md) | Quick / Named Tunnel · Ubuntu systemd |
| [onboarding/SESSION_HANDOFF.md](onboarding/SESSION_HANDOFF.md) | 다른 PC에서 이어하기 |
| **[AI_SESSION_HANDOFF.md](AI_SESSION_HANDOFF.md)** | **Cursor AI 대화 맥락·SpecStory 이어하기** |

온보딩 문서 전체 목록: [onboarding/README.md](onboarding/README.md)

---

## 프로젝트 · 기능

| 문서 | 용도 |
|------|------|
| [MVP.md](MVP.md) | 기획 · 데모 시나리오 |
| [RESILIENCE_DESIGN.md](RESILIENCE_DESIGN.md) | **통합 컨셉 기획서** (도시 회복탄력성 설계자) |
| [개발계획서_도시기후설계자.md](개발계획서_도시기후설계자.md) | **해커톤 예선 제출용 개발계획서 (양식2, 붙여넣기용 MD)** |
| [RESILIENCE_TEST_GUIDE.md](RESILIENCE_TEST_GUIDE.md) | **4축 통합 테스트·확인 체크리스트** (P1~P9) |
| [DISASTER_SIM.md](DISASTER_SIM.md) | 3대 재난 시뮬레이션 |

---

## 프롬프트 · 대화 기록

| 문서 | 용도 |
|------|------|
| [horizon_PROMPT.md](horizon_PROMPT.md) | 메인 앱 개발 프롬프트 |
| [login_PROMPT.md](login_PROMPT.md) | 로그인 프롬프트 |
| [chat-exports/README.md](chat-exports/README.md) | Cursor 대화 export 동기화 |

> 관리자 콘솔(`ROLE_ADMIN`, `/api/admin/**`)은 별도 Vite 앱 `frontend-admin/`(dev `:5174`)으로 구현되어 있습니다.
