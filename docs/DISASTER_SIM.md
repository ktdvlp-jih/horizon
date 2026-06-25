# 3대 재난 시뮬레이션 (Disaster Response)

> **현행 상태:** 재난(태풍·지진·해일)은 **메인 `/designer`의 「재난」 렌즈**로 통합되었습니다. 통합 컨셉은 [RESILIENCE_DESIGN.md](RESILIENCE_DESIGN.md) 참고.
> - 레거시 단독 허브 라우트 `/disaster`(및 `mode=typhoon` 등)는 **`/designer`로 리다이렉트**됩니다.
> - 백엔드 재난 API(`/api/disaster/*`)와 시뮬레이션 엔진은 **보존**되며, 아래 모델·API 설명은 그대로 유효합니다.
> - 태풍 구역 플래너(`TyphoonDisasterView`)는 격자 통합 대상이 아니라 보존만 합니다.

태풍·지진·해일을 격자 설계 + 위험 히트맵 + AI 코치로 체험합니다.

## UX (현행: `/designer` 재난 렌즈)

- 메인 `/designer` → 「회복탄력성 평가」 카드에서 **재난 시나리오** 선택 → **재난 렌즈** 활성화
- 실제 사례 **시나리오** 선택 → 격자에 **대응 타일** 배치 → **위험 히트맵** + 스트레스 테스트 타임라인 → **AI 코치**

## API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/disaster/scenarios?mode=typhoon` | 시나리오 목록 |
| POST | `/api/disaster/simulate` | 단일 스냅샷 |
| POST | `/api/disaster/simulate/timeline` | 타임라인 |
| POST | `/api/disaster/coach` | AI 코치 |
| POST | `/api/disaster/designs` | 저장 (로그인) |

외부 데이터 (선택):

- **KMA APIhub**: 태풍 목록/베스트트랙, 지진·지진해일 (`KmaDisasterClient`)
- **재난안전데이터**: 대피 POI (`SafetyDataClient` — MVP는 시드·격자 대피소)

API 키 없을 때: DB 시드 시나리오 6건으로 데모 가능.

## 교육용 모델 (근사)

정밀 수치예보·피해 산정이 **아닙니다**. 행동→결과 체감용입니다.

### 태풍

- 입력: 궤적 포인트, 최대풍속, 강수, 격자 타일
- 출력: `windExposure`, `floodDepth` → 0~1 위험

### 지진

- 입력: 규모, 진원 offset, 토질, 지진대
- 출력: `collapseRisk`, BFS 대피 커버
- 타임라인: 0~30초

### 해일

- 입력: 원발 규모, 파고, ETA, 해안 노출(`coastalExposure`)
- 출력: 침수 깊이 proxy, 고지·방조제 완화
- 타임라인: ETA 진행

## 타일

기존 도시 타일 + `SEAWALL`, `DRAIN`, `GREEN_BUFFER`, `SHELTER`, `RETAINING`, `HIGH_GROUND`

## 챌린지 experienceId

- `typhoon`, `earthquake`, `tsunami` (탭별)

## 금지 UX (Horizon 원칙)

- 태풍 경로 지도만 보여주기
- 재난 뉴스 재생만 하기
- AI가 설명만 하는 챗봇

→ **반드시 격자 설계 + 위험 변화 + 코치**가 핵심 루프.

## 1분 데모

1. `/designer` → 「회복탄력성 평가」 재난 시나리오에서 **태풍(매미)** 선택 → 재난 렌즈
2. 기본 BUILDING/ROAD 도시 → 위험 40%+
3. SEAWALL, DRAIN, SHELTER 배치 → 15%대
4. AI 코치 → 배수·대피 제안

## 관련 코드

- Backend: `com.horizon.disaster.*`
- Frontend: `DisasterDesignerPage`, `disasterApi.ts`
- Admin: `/disaster-scenarios`
