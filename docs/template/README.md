# 프로젝트 템플릿 (다른 레포 이식용)

> Horizon에서 검증된 **기술 스택 + 인프라 패턴**을 새 프로젝트에 그대로 입힐 때 사용합니다.  
> **이 폴더 전체**를 새 레포 `docs/template/`에 복사하거나, Agent에게 Horizon 레포 경로를 참조하게 하면 됩니다.

---

## 문서 맵

| 문서 | 용도 |
|------|------|
| **[BOOTSTRAP.md](BOOTSTRAP.md)** | **Agent 프롬프트** — 복사해서 붙여 넣기 (시작은 §1) |
| [TECH_STACK.md](TECH_STACK.md) | 스택 버전·아키텍처·패키지 구조·배포 파이프라인 상세 |

환경 설정(집 PC·개발 PC·Actions): [../onboarding/SETUP.md](../onboarding/SETUP.md)

---

## 다른 프로젝트에 쓰는 방법

### A. Cursor Agent (권장)

새 레포 채팅에 [BOOTSTRAP.md §1](BOOTSTRAP.md#1-다른-agent에게-이렇게-시작-짧은-버전) 블록 붙이기.

```
@docs/template/BOOTSTRAP.md @docs/template/TECH_STACK.md @docs/onboarding/SETUP.md
```

Horizon 레포를 참조할 때는 `@docs/template/...` 경로를 Horizon clone 기준으로 맞추면 됩니다.

### B. 폴더 복사

Horizon에서 아래를 새 프로젝트로 복사한 뒤 `{PROJECT_SLUG}`, `{WORKSPACE_PATH}` 치환:

| 복사 대상 | 비고 |
|-----------|------|
| `docs/template/` | 이 폴더 전체 |
| `docs/onboarding/` | SETUP·DEPLOY 등 (프로젝트명 치환) |
| `scripts/` | deploy·tailscale·setup-* |
| `.github/workflows/deploy.yml` | 경로 치환 |
| `compose.yaml`, `Dockerfile`, `ai/Dockerfile` | |
| `.env.example`, `.env.dev*.example` | |

상세 목록: [BOOTSTRAP.md §3](BOOTSTRAP.md#3-horizon에서-복사할-파일-목록)

---

## 아키텍처 (한 줄)

```
개발 PC: Spring/Vite/AI 로컬 ──Tailscale SSH 터널──▶ 집 PC Postgres
git push master ──▶ GitHub Actions ──▶ 집 PC Docker 재빌드 (:9080)
```

**DB:** 집 PC Docker만 · **비용:** 0원 · **Runner:** Self-hosted 사용 안 함

---

## Horizon 프로젝트 문서

| 문서 | 용도 |
|------|------|
| [../MVP.md](../MVP.md) | Horizon 기획 (템플릿 아님) |
| [../onboarding/](../onboarding/) | 실제 PC 설정 가이드 |
| [../README.md](../README.md) | docs 전체 목록 |
