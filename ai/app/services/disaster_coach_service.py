"""Disaster response coaching (typhoon, earthquake, tsunami)."""
from __future__ import annotations

from app.schemas.coach import CoachResponse, DisasterCoachRequest


def disaster_coach(req: DisasterCoachRequest) -> CoachResponse:
    m = req.metrics
    mode = req.mode.lower()
    affected_pct = int(round(m.affectedRatio * 100))
    protected_pct = int(round(m.protectedRatio * 100))
    avg_pct = int(round(m.avgRisk * 100))
    max_pct = int(round(m.maxRisk * 100))

    score = max(0, min(100, 100 - int(m.affectedRatio * 70) - int(m.maxRisk * 20) + int(m.protectedRatio * 15)))
    grade = "S" if score >= 90 else "A" if score >= 75 else "B" if score >= 60 else "C" if score >= 45 else "D"

    strengths: list[str] = []
    weaknesses: list[str] = []
    suggestions: list[str] = []

    if m.protectedRatio >= 0.2:
        strengths.append(f"대응 시설·완충 타일로 보호율 {protected_pct}%를 확보했습니다.")
    if m.affectedRatio <= 0.25:
        strengths.append(f"위험 영역이 {affected_pct}%로 낮게 유지됩니다.")

    if mode == "typhoon":
        learning = "태풍 대응은 강풍·호우·침수를 동시에 줄이는 배수로, 녹지 완충, 방조제, 대피소 배치가 핵심입니다."
        if (m.floodCells or 0) > m.totalCells * 0.3:
            weaknesses.append("저지대 침수 위험 셀이 많습니다.")
            suggestions.append("침수 위험 구역에 배수(DRAIN)와 녹지 완충(GREEN_BUFFER)을 추가하세요.")
        if (m.windHighCells or 0) > m.totalCells * 0.25:
            weaknesses.append("강풍 노출 구역이 넓습니다.")
            suggestions.append("방조제(SEAWALL)와 가로수·공원으로 풍속 영향을 줄이세요.")
        suggestions.append("대피소(SHELTER)를 도시 중심과 해안 사이에 배치하세요.")
    elif mode == "earthquake":
        learning = "지진 대응은 내진·옥외 대피 공간·취약 건물 밀집 완화, 30초 내 대피 동선 확보가 중요합니다."
        if (m.collapseRiskCells or 0) > m.totalCells * 0.2:
            weaknesses.append("붕괴 위험 셀이 많습니다.")
            suggestions.append("건물 밀집 구역에 옹벽(RETAINING)과 대피소(SHELTER)를 배치하세요.")
        evac = m.evacWithin3MinRatio or 0
        if evac < 0.7:
            weaknesses.append(f"대피 가능 비율이 {int(evac * 100)}%로 낮습니다.")
            suggestions.append("공원·대피소·고지(HIGH_GROUND)를 연결해 대피 동선을 확보하세요.")
        else:
            strengths.append(f"대피 동선 커버리지 {int(evac * 100)}%")
    else:
        learning = "해일 대응은 방조제·고지대·해안 녹지로 침수 깊이를 줄이고, ETA 전 고지 대피가 핵심입니다."
        if (m.inundatedCells or 0) > m.totalCells * 0.3:
            weaknesses.append("침수 예상 셀이 많습니다.")
            suggestions.append("해안가에 방조제(SEAWALL)와 습지·녹지 완충을 배치하세요.")
        if (m.highGroundCoverage or 0) < 0.1:
            weaknesses.append("고지·대피 공간이 부족합니다.")
            suggestions.append("HIGH_GROUND와 SHELTER 타일을 내륙 고지에 배치하세요.")

    if not strengths:
        strengths.append(f"{req.scenarioTitle} 시나리오 기준 평균 위험 {avg_pct}% — 개선 여지가 있습니다.")
    if not weaknesses:
        weaknesses.append(f"최대 위험 {max_pct}% — 극한 구역을 추가로 완화할 수 있습니다.")
    if not suggestions:
        suggestions.append("위험 히트맵에서 붉은 구역 주변에 대응 타일을 배치해 보세요.")

    return CoachResponse(
        score=score,
        grade=grade,
        strengths=strengths[:3],
        weaknesses=weaknesses[:3],
        suggestions=suggestions[:3],
        learningPoint=learning,
        source="rule",
    )
