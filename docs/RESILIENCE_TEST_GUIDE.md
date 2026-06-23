# 도시 기후 설계자 — 4축 통합 테스트 가이드

[RESILIENCE_DESIGN.md](RESILIENCE_DESIGN.md) 기반으로 구현된 P1~P9를 직접 확인하기 위한 체크리스트입니다.
각 항목을 체험하며 `[ ]`를 `[x]`로 바꿔가며 검증하세요.

---

## 0. 실행

로컬 개발 모드 (3개 서비스). 자세한 내용은 [onboarding/SETUP.md](onboarding/SETUP.md) 참고.

| # | 서비스 | 명령 | 주소 |
|---|--------|------|------|
| 1 | DB | `docker compose up -d db` (또는 기존 PostgreSQL) | - |
| 2 | AI | `cd ai` → `python -m uvicorn app.main:app --reload --port 8000` | http://localhost:8000/health |
| 3 | Backend | `.\gradlew.bat bootRun` | http://localhost:8080/api/health |
| 4 | Frontend | `cd frontend` → `npm run dev` | http://localhost:5173 |

> AI 서비스를 끄고도 테스트할 수 있습니다. 통합 코치는 AI가 없으면 **규칙 기반(rule)** 으로 자동 폴백합니다.

빌드만 검증하려면:
- 백엔드: `.\gradlew.bat compileJava`
- 프론트: `cd frontend` → `npm run build`
- AI: `cd ai` → `python -m py_compile app/main.py app/routers/coach.py app/services/resilience_coach_service.py`

---

## 1. M1 — 다중 렌즈 평가 기반 (P1·P2)

화면: `/designer` 좌측 하단 **「회복탄력성 평가」** 카드

- [ ] 디자이너에서 타일을 칠하면 잠시 후 「회복탄력성 평가」 카드에 **종합 회복탄력성** 점수가 표시된다.
- [ ] 축별 점수 막대(열섬·미세먼지 등)가 보인다.
- [ ] 렌즈 탭에서 **열섬 / 미세먼지** 를 누르면 격자 히트맵 색이 축에 맞게 바뀐다.
  - 열섬 = 파랑→빨강(온도), 미세먼지 = 청록→보라(PM)
- [ ] 가로수·공원·수변을 늘리면 **열섬 점수**가 올라간다.

### API 빠른 확인 (PowerShell)
```powershell
$grid = @(@('ROAD','BUILDING','TREE'),@('ROAD','PARK','WATER'),@('BUILDING','TREE','PARK'))
$body = @{ regionCode='seoul'; grid=$grid } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri http://localhost:8080/api/designs/evaluate -Method Post -Body $body -ContentType 'application/json'
```
- [ ] 응답에 `lenses.heat`, `lenses.air`, `lenses.agriculture` 와 `resilienceScore`, `balancePenalty`, `axisScores` 가 있다.

---

## 2. M2 — 미세먼지 축 (P3)

- [ ] 타일 팔레트에 **🏭 공장(INDUSTRY)** 타일이 있다.
- [ ] 공장을 여러 칸 칠하고 **미세먼지** 렌즈로 보면 공장 주변이 진한 보라색(PM 높음)으로 보인다.
- [ ] 공장 주변에 **녹지완충(GREEN_BUFFER)·가로수**를 두르면 미세먼지 점수가 올라간다.
- [ ] (AI 끔 상태) 미세먼지가 많은 설계는 종합 점수가 내려간다.

---

## 3. M3 — 농어업 광역 레이어 (P4)

화면: 렌즈 탭에서 **🌾 농어업** 선택

- [ ] 농어업 렌즈를 누르면 **외곽 광역 구역 배분** 슬라이더(농지/어장/보존림/영농형 태양광)가 나온다.
- [ ] 슬라이더를 조절하면 잠시 후 **작황·어획·수자원·탄소** 세부 지표가 갱신된다.
- [ ] 도시에 녹지·수변을 늘리면 농어업 지표(특히 작황·수자원)가 좋아진다.
- [ ] 화면 하단에 **장기 기후 가정 +N.N°C** 가 표시된다.
- [ ] 농어업 렌즈는 격자 히트맵 오버레이가 없다(광역 레이어이므로 점수·지표로만 표시).

---

## 4. M4 — 점수·레벨·스트레스 (P5·P6·P7)

### 4-1. 시나리오 고정 가중치 (P5)
- [ ] 「회복탄력성 평가」 카드의 **재난 시나리오** 드롭다운에서 태풍 시나리오를 고른다.
- [ ] **재난** 렌즈가 활성화되고 격자에 위험 히트맵(초록→빨강)이 보인다.
- [ ] 재난 시나리오를 골랐을 때와 안 골랐을 때 **종합 점수가 달라진다**(재난 가중치 반영).
- [ ] 축 간 격차가 크면 **⚖️ 균형 패널티** 문구가 표시된다.

### 4-2. 시나리오 레벨 (P6)
화면: 「회복탄력성 평가」 카드 상단 **트랙 탭 + 레벨 목록**

- [ ] 트랙(도시 기후 입문/맑은 하늘/재난 대비/지속가능 도농) 탭을 전환할 수 있다.
- [ ] Lv.1을 누르면 목표 설명과 진행도(`현재점수 / 목표점수`)가 표시된다.
- [ ] 목표 점수를 달성하면 **🎉 클리어** 메시지가 뜨고 다음 레벨 🔒이 해금된다.
- [ ] 잠긴 레벨(🔒)은 클릭되지 않는다.
- [ ] **이어받기(carry-over)** 레벨(Lv.2 등)을 시작하면 이전 레벨에서 만든 설계 격자가 불러와진다.
- [ ] 새로고침해도 완료한 레벨이 유지된다(localStorage).

### 4-3. 스트레스 테스트 (P7)
화면: 「회복탄력성 평가」 카드 **「스트레스 테스트 ▶ 시작」**

- [ ] ▶ 시작을 누르면 **폭염 → 태풍 → 미세먼지 → 수확기** 단계가 순서대로 진행된다.
- [ ] 단계마다 활성 렌즈/히트맵이 자동으로 바뀐다.
- [ ] 현재 충격 단계 안내 문구가 표시되고, ■ 중지로 멈출 수 있다.

---

## 5. M5 — 통합 코치·정리 (P8·P9)

### 5-1. 통합 AI 코치 (P8)
화면: 「회복탄력성 평가」 카드 **「🤖 통합 AI 코치 받기」** 버튼

- [ ] 버튼을 누르면 강점/약점/제안/학습 포인트가 표시된다.
- [ ] AI 서비스가 켜져 있으면 우측에 **AI**, 꺼져 있으면 **규칙** 으로 표기된다(둘 다 동작).
- [ ] 가장 약한 축을 끌어올리라는 식의 **균형(트레이드오프)** 메시지가 나온다.

API 확인:
```powershell
$grid = @(@('ROAD','BUILDING','TREE'),@('ROAD','PARK','WATER'),@('BUILDING','TREE','PARK'))
$body = @{ regionCode='seoul'; grid=$grid } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri http://localhost:8080/api/designs/coach/resilience -Method Post -Body $body -ContentType 'application/json'
```
- [ ] `score`, `grade`, `strengths`, `weaknesses`, `suggestions`, `learningPoint`, `source` 가 반환된다.

### 5-2. 홈·라우트 정리 (P9)
- [ ] 홈(`/`)에 **「하나의 도시, 네 개의 축」** 섹션(열섬·미세먼지·재난·농어업 카드)이 보인다.
- [ ] 홈에 더 이상 별도의 「3대 재난 대응 설계자」 카드가 없다(메인에 흡수됨).
- [ ] 주소창에 `/disaster` 를 입력하면 **`/designer` 로 리다이렉트**된다.
- [ ] `/experiences/urban-climate`, `/experiences/disaster-response` 도 `/designer` 로 이동한다.

---

## 6. 알려진 제약 / 참고

- **에어코리아 PM**: 실시간 연동 대신 지역별 폴백 상수 사용(`AirQualityBaselineProvider`). 실연동 시 이 클래스만 교체하면 됨.
- **농어업·레벨 영속화**: 우선 localStorage 기반. DB 영속화는 후순위.
- **태풍 구역 플래너(`TyphoonDisasterView`)**: 격자 통합 대상이 아니라 보존만 함(라우트는 `/designer`로 흡수).
- **레거시 API**: `/api/designs/simulate`, `/api/disaster/*` 는 전환기 동안 유지(기존 기능 보존).
- 모델은 모두 **교육용 근사**이며 물리적으로 정확한 해석기가 아님.

---

## 7. 종료 체크

- [ ] 백엔드 `compileJava` 통과
- [ ] 프론트 `npm run build` 통과
- [ ] 위 1~5 시나리오 화면 동작 확인
