"""Urban climate design coaching.

Produces a score and qualitative feedback from already-computed design metrics.
Uses an LLM when configured, otherwise a deterministic rule-based coach so the
demo always works (graceful degradation).
"""
from __future__ import annotations

from app.schemas.coach import CoachRequest, CoachResponse
from app.services.llm_service import LlmService


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _grade(score: int) -> str:
    if score >= 90:
        return "S · 쿨시티 마스터"
    if score >= 75:
        return "A · 시원한 도시"
    if score >= 60:
        return "B · 양호"
    if score >= 45:
        return "C · 개선 필요"
    return "D · 열섬 위험"


def rule_based_coach(req: CoachRequest) -> CoachResponse:
    score = 50.0
    score += _clamp(req.greenRatio * 60.0, 0, 28)
    score += _clamp(req.waterRatio * 50.0, 0, 12)
    score += _clamp(-req.deltaT * 4.0, 0, 22)  # cooling below baseline is good
    score -= _clamp(req.imperviousRatio * 25.0, 0, 18)
    score_int = int(round(_clamp(score, 0, 100)))

    strengths: list[str] = []
    weaknesses: list[str] = []
    suggestions: list[str] = []

    if req.greenRatio >= 0.3:
        strengths.append(f"녹지율 {req.greenRatio * 100:.0f}%로 증발산 냉각이 충분합니다.")
    else:
        weaknesses.append(f"녹지율이 {req.greenRatio * 100:.0f}%로 낮아 냉각 효과가 부족합니다.")
        suggestions.append("도로변과 건물 사이에 가로수(TREE)를 추가해 그늘과 증발산을 늘리세요.")

    if req.waterRatio > 0:
        strengths.append(f"수변 {req.waterRatio * 100:.0f}%가 주변을 식혀 줍니다.")
    else:
        suggestions.append("도시 중심에 작은 수변(WATER)을 배치하면 국지적으로 크게 냉각됩니다.")

    if req.imperviousRatio >= 0.6:
        weaknesses.append(
            f"불투수면(건물·도로)이 {req.imperviousRatio * 100:.0f}%로 높아 열을 저장합니다."
        )
        suggestions.append("연속된 아스팔트 도로 일부를 공원(PARK)으로 바꿔 열섬 띠를 끊으세요.")

    if req.deltaT < 0:
        strengths.append(f"기준 기온 대비 {abs(req.deltaT):.1f}°C 낮춘 시원한 설계입니다.")
    else:
        weaknesses.append(f"평균 표면온도가 기준보다 {req.deltaT:.1f}°C 높습니다.")

    if not suggestions:
        suggestions.append("최고온 지점 주변에 가로수를 더해 핫스팟을 분산하세요.")

    learning = (
        "알베도가 낮은 아스팔트는 햇빛을 흡수해 데워지고, 식생·물은 증발산으로 "
        "주변까지 식힙니다. 녹지·수변의 배치가 열섬 완화의 핵심입니다."
    )

    return CoachResponse(
        score=score_int,
        grade=_grade(score_int),
        strengths=strengths[:3],
        weaknesses=weaknesses[:3],
        suggestions=suggestions[:3],
        learningPoint=learning,
        source="rule",
    )


class CoachService:
    def __init__(self, llm: LlmService) -> None:
        self._llm = llm

    def coach(self, req: CoachRequest) -> CoachResponse:
        baseline = rule_based_coach(req)
        if not self._llm.enabled:
            return baseline
        llm_result = self._llm.coach(req, baseline)
        return llm_result or baseline
