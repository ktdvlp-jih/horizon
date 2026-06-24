# AI 세션 이어하기 (Cursor 대화 맥락)

> **마지막 갱신:** 2026-06-25 · **Git:** `53cc5a2` (master)  
> **다른 PC:** `git pull` 후 Cursor에서 `@docs/AI_SESSION_HANDOFF.md` 를 첫 메시지에 붙여 대화를 이어갑니다.

---

## 1. 프로젝트 한 줄

**Horizon · 도시 기후 설계자** — 기상청 API허브 데이터 + 격자 설계 + 열섬·미세먼지·재난·농어업 4축 회복탄력성 + AI 코치.  
해커톤: URL 즉시 시연, 기상청 데이터 명시, 미연동은 코드/UI에 정직 표기 (`.cursor/rules/contest-constraints.mdc`).

---

## 2. 이번 세션에서 완료한 것

### KMA API 앱 연동 (백엔드 + 프론트)

| API | 상태 | 비고 |
|-----|------|------|
| ASOS 기온 | ✅ | `WeatherDataService` |
| 일사 묶음형 | ✅ | `-99.9` 결측 방어 |
| 황사 PM10 | ✅ | `AirQualityBaselineProvider` → `source: kma` |
| 태풍·지진 | ✅ | `ClimateDataService`, `/api/disaster/live` |
| ASOS 강수 | ✅ | `climate.rainfallMm` |
| 평년값 | ✅ | `sun_sfc_norm`, 농어업 렌즈 |
| 대기정체·자외선 | ✅ | 생활기상 V3 |
| 여름 체감온도 | ⚠️ | API OK, 발표 NO_DATA 시 null |
| Docker 데모 | ✅ | `http://localhost:9080` |

주요 신규: `ClimateDataService`, `ClimateContext`, `ClimateDataStrip`, `WeatherClimateController`.

### UI/UX · 문구

- **시뮬레이션 결과** 오타 수정 (`시뫤` → `시뮬`)
- **기준 대비** — ΔT/열섬 차이 대신 사용자 선택 표기
- **데스크톱 3열:** 팔레트 | 격자+회복탄력성 | **시뮬 결과 + AI 코치**
- **모바일 4탭:** 격자 · 타일 · 분석(회복탄력성) · **결과·코치**
- 튜토리얼: 다음 단계 시 **스크롤 + 모바일 탭 전환**
- `ResiliencePanel`에 **사용 순서** 접이식 안내

### Git (origin/master 반영됨)

```
53cc5a2 fix(designer): 시뮬레이션 결과를 AI 코치 위에 배치
d3c5850 feat(designer): 모바일 탭·3열 레이아웃 UI/UX
2a3b521 feat(kma): 기상청 API 연동·회복탄력성 안내·튜토리얼 스크롤
```

---

## 3. 회복탄력성 평가 — 사용 순서 (사용자 FAQ)

1. 격자에 타일 배치 → **0.5초 후** 자동 점수
2. **렌즈 탭**(열섬·미세먼지…) → 격자 색 변경
3. (선택) 재난 시나리오 → 재난 렌즈
4. **종합 점수** + 🤖 **통합 AI 코치** (ResiliencePanel)
5. ▶ **스트레스 테스트** (폭염→태풍→미세먼지→수확기)

상세: `README.md` 체험 순서 표, `docs/RESILIENCE_TEST_GUIDE.md`

---

## 4. 환경 · 실행

```powershell
copy .env.example .env   # HORIZON_KMA_API_KEY 필수
docker compose up -d --build
# http://localhost:9080
```

스모크: `/api/regions` → `climate.pm10Source: kma`, `/api/designs/evaluate` → `lenses.air.metrics.source: kma`

---

## 5. SpecStory · 대화 원본

| 파일 | 내용 |
|------|------|
| `.specstory/history/2026-06-17_15-28-01Z-project-tech-stack-integration.md` | **메인 장기 세션** (KMA·4축·UI 대화 대부분) |
| `.specstory/history/2026-06-24_11-36-41Z-chemical-management-system-development.md` | **최근 세션** (파일명은 SpecStory 자동 생성 — Horizon KMA·UI 작업 포함) |
| `.specstory/history/2026-06-23_07-16-07Z-project-tech-stack-integration.md` | 기술 스택·온보딩 |
| `.specstory/history/2026-06-23_06-37-44Z-work-history-retrieval-from-another-pc.md` | PC 간 작업 이어하기 |
| `.specstory/history/2026-06-20_18-03-54Z-프로젝트-심사-기준-적합성.md` | 심사 기준 |

Cursor SpecStory 확장 설치 시 `.specstory/history/` 아래 파일이 **대화 이력**입니다. `git pull`로 PC 간 동기화.

**Cursor 룰:** `.cursor/rules/contest-constraints.mdc` — 해커톤 공고 제약 (항상 적용). 레포에 포함되어 있어 clone/pull 시 다른 PC에서도 동일.

수동 Export: `docs/chat-exports/README.md`

---

## 6. 다음에 하면 좋은 것 (미완/선택)

- [ ] ASOS `region.source`가 `sample`일 때 기온도 KMA로 안정화 (캐시/시각)
- [ ] 배포 URL 고정 (Quick Tunnel 의존 지양 — 공고 제약)
- [ ] SenTa NO_DATA 시 UI 「발표 없음」 배지 (선택)
- [ ] `gradlew test` 로컬 환경 Gradle worker 이슈 시 CI 확인

---

## 7. 다른 PC에서 AI 대화 재개 예시

```
@docs/AI_SESSION_HANDOFF.md
@.specstory/history/2026-06-17_15-28-01Z-project-tech-stack-integration.md (최근 200줄)

master 53cc5a2 pull 완료. KMA 연동·UI 레이아웃까지 반영됐어.
[이어서 할 작업] …
```
