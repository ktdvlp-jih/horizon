"""Unified multi-axis resilience coaching.

Evaluates one city design across heat / air / disaster / agriculture axes at
once, rewarding balance across axes (systemic thinking). Uses an LLM when
configured, otherwise a deterministic rule-based coach. Disaster feedback now
flows through this same path instead of a separate disaster coach.
"""
from __future__ import annotations

import logging

from app.schemas.coach import CoachResponse, ResilienceCoachRequest
from app.services.llm_service import (
    AXIS_LABELS_KO,
    LlmService,
    run_llm_resilience_coach,
)

logger = logging.getLogger("horizon.ai.resilience")

GRADE_LABELS = {
    "S": "S · 회복도시 마스터",
    "A": "A · 균형 잡힌 도시",
    "B": "B · 양호",
    "C": "C · 개선 필요",
    "D": "D · 취약",
}

LEARNING_POINT = (
    "한 축만 잘 만들면 다른 축이 무너집니다. 녹지·수변은 열섬과 미세먼지·농어업을 함께 돕고, "
    "배수·방조제·완충 녹지는 재난과 물 순환을 함께 지킵니다. "
    "가장 약한 축을 끌어올려 균형을 맞추는 것이 회복탄력성의 핵심입니다."
)


def _grade(score: int) -> str:
    if score >= 90:
        return GRADE_LABELS["S"]
    if score >= 75:
        return GRADE_LABELS["A"]
    if score >= 60:
        return GRADE_LABELS["B"]
    if score >= 45:
        return GRADE_LABELS["C"]
    return GRADE_LABELS["D"]


def rule_based_resilience(req: ResilienceCoachRequest) -> CoachResponse:
    score = int(round(max(0.0, min(100.0, req.resilienceScore))))
    axes = req.axisScores or {}

    strengths: list[str] = []
    weaknesses: list[str] = []
    suggestions: list[str] = []

    if axes:
        best = max(axes.items(), key=lambda kv: kv[1])
        worst = min(axes.items(), key=lambda kv: kv[1])
        best_label = AXIS_LABELS_KO.get(best[0], best[0])
        worst_label = AXIS_LABELS_KO.get(worst[0], worst[0])

        if best[1] >= 70:
            strengths.append(f"{best_label} 축이 {best[1]:.0f}점으로 강점입니다.")
        for key, value in axes.items():
            if value >= 75:
                label = AXIS_LABELS_KO.get(key, key)
                if label != best_label:
                    strengths.append(f"{label} 축도 {value:.0f}점으로 안정적입니다.")

        if worst[1] < 60:
            weaknesses.append(f"{worst_label} 축이 {worst[1]:.0f}점으로 가장 취약합니다.")
            suggestions.append(_axis_suggestion(worst[0]))

        # Second weakest, if also low.
        remaining = sorted(axes.items(), key=lambda kv: kv[1])
        if len(remaining) > 1 and remaining[1][1] < 55:
            label = AXIS_LABELS_KO.get(remaining[1][0], remaining[1][0])
            weaknesses.append(f"{label} 축도 {remaining[1][1]:.0f}점으로 보강이 필요합니다.")

    if req.balancePenalty >= 5:
        weaknesses.append(
            f"축 간 격차로 균형 패널티 -{req.balancePenalty:.0f}점이 적용됐습니다."
        )
        suggestions.append("강한 축은 유지하고 약한 축을 끌어올려 균형을 맞추세요.")
    elif axes and min(axes.values()) >= 65:
        strengths.append("모든 축이 고르게 높아 균형 잡힌 회복도시입니다.")

    if not strengths:
        strengths.append(f"종합 회복탄력성 {score}점 — 개선 여지가 있습니다.")
    if not weaknesses:
        weaknesses.append("극단적으로 약한 축은 없지만 더 끌어올릴 수 있습니다.")
    if not suggestions:
        suggestions.append("렌즈를 전환하며 붉은 구역에 대응 타일을 배치해 보세요.")

    return CoachResponse(
        score=score,
        grade=_grade(score),
        strengths=strengths[:3],
        weaknesses=weaknesses[:3],
        suggestions=suggestions[:3],
        learningPoint=LEARNING_POINT,
        source="rule",
    )


def _axis_suggestion(axis: str) -> str:
    return {
        "heat": "도로·건물 사이에 가로수·공원·수변을 더해 열섬을 식히세요.",
        "air": "배출원(공장·도로) 주변에 녹지완충(GREEN_BUFFER)·가로수를 배치해 미세먼지를 흡착하세요.",
        "disaster": "위험 구역에 방조제·배수로·대피소·고지를 배치해 재난 피해를 줄이세요.",
        "agriculture": "외곽 구역 배분(농지·보존림)과 도시 녹지·수자원을 늘려 작황·수자원을 확보하세요.",
    }.get(axis, "약한 축을 보강하는 타일을 추가해 보세요.")


class ResilienceCoachService:
    def __init__(self, llm: LlmService) -> None:
        self._llm = llm

    def coach(self, req: ResilienceCoachRequest) -> CoachResponse:
        logger.info(
            "Resilience coach region=%s composite=%.0f penalty=%.1f axes=%s",
            req.region,
            req.resilienceScore,
            req.balancePenalty,
            {k: round(v) for k, v in (req.axisScores or {}).items()},
        )
        baseline = rule_based_resilience(req)
        settings = req.coachSettings
        llm_enabled = True
        if settings and settings.llmEnabled is not None:
            llm_enabled = settings.llmEnabled

        if settings and settings.apiKey and llm_enabled:
            llm_result = run_llm_resilience_coach(req, baseline, settings)
            if llm_result is not None:
                return llm_result

        if self._llm.enabled and llm_enabled and (settings is None or not settings.apiKey):
            llm_result = self._llm.resilience(req, baseline)
            if llm_result is not None:
                return llm_result

        return baseline
