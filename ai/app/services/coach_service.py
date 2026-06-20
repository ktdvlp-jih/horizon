"""Urban climate design coaching.

Produces a score and qualitative feedback from already-computed design metrics.
Uses an LLM when configured, otherwise a deterministic rule-based coach.
"""
from __future__ import annotations

import logging
from typing import Any

from app.schemas.coach import CoachRequest, CoachResponse, CoachSettings
from app.services.llm_service import LlmService, TILE_NAMES_KO, build_user_prompt, run_llm_coach

logger = logging.getLogger("horizon.ai.coach")

DEFAULT_RULE_WEIGHTS: dict[str, float] = {
    "baseScore": 50,
    "greenMultiplier": 60,
    "greenMax": 28,
    "waterMultiplier": 50,
    "waterMax": 12,
    "deltaTMultiplier": 4,
    "deltaTMax": 22,
    "imperviousMultiplier": 25,
    "imperviousMax": 18,
    "greenRatioThreshold": 0.30,
    "imperviousRatioThreshold": 0.60,
    "roadRatioThreshold": 0.35,
    "roadHighThreshold": 0.40,
    "buildingRatioThreshold": 0.50,
    "greenTilesLowThreshold": 0.10,
}

DEFAULT_GRADE_THRESHOLDS: dict[str, Any] = {
    "S": 90,
    "A": 75,
    "B": 60,
    "C": 45,
    "labels": {
        "S": "S · 쿨시티 마스터",
        "A": "A · 시원한 도시",
        "B": "B · 양호",
        "C": "C · 개선 필요",
        "D": "D · 열섬 위험",
    },
}

DEFAULT_LEARNING = (
    "알베도가 낮은 도로·건물은 햇빛을 흡수해 데워지고, "
    "공원·가로수·수변·습지·광장은 주변까지 식힙니다. "
    "보도는 도로보다 덜 뜨겁습니다."
)


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _weights(req: CoachRequest) -> dict[str, float]:
    w = dict(DEFAULT_RULE_WEIGHTS)
    if req.coachSettings and req.coachSettings.ruleWeights:
        for k, v in req.coachSettings.ruleWeights.items():
            if isinstance(v, (int, float)):
                w[k] = float(v)
    return w


def _grade(score: int, req: CoachRequest) -> str:
    thresholds = dict(DEFAULT_GRADE_THRESHOLDS)
    labels = dict(thresholds.get("labels", {}))
    if req.coachSettings and req.coachSettings.gradeThresholds:
        gt = req.coachSettings.gradeThresholds
        for key in ("S", "A", "B", "C"):
            if key in gt:
                thresholds[key] = int(gt[key])
        if "labels" in gt and isinstance(gt["labels"], dict):
            labels.update(gt["labels"])
    if score >= int(thresholds["S"]):
        return str(labels.get("S", "S"))
    if score >= int(thresholds["A"]):
        return str(labels.get("A", "A"))
    if score >= int(thresholds["B"]):
        return str(labels.get("B", "B"))
    if score >= int(thresholds["C"]):
        return str(labels.get("C", "C"))
    return str(labels.get("D", "D · 열섬 위험"))


def _count(req: CoachRequest, key: str) -> int:
    return int((req.tileCounts or {}).get(key, 0))


def _total_cells(req: CoachRequest) -> int:
    return max(req.gridSize * req.gridSize, 1)


def rule_based_coach(req: CoachRequest) -> CoachResponse:
    w = _weights(req)
    score = float(w["baseScore"])
    score += _clamp(req.greenRatio * w["greenMultiplier"], 0, w["greenMax"])
    score += _clamp(req.waterRatio * w["waterMultiplier"], 0, w["waterMax"])
    score += _clamp(-req.deltaT * w["deltaTMultiplier"], 0, w["deltaTMax"])
    score -= _clamp(req.imperviousRatio * w["imperviousMultiplier"], 0, w["imperviousMax"])
    score_int = int(round(_clamp(score, 0, 100)))

    total = _total_cells(req)
    road = _count(req, "ROAD")
    building = _count(req, "BUILDING")
    green_tiles = _count(req, "PARK") + _count(req, "TREE") + _count(req, "WETLAND")

    strengths: list[str] = []
    weaknesses: list[str] = []
    suggestions: list[str] = []

    green_thresh = w["greenRatioThreshold"]
    imperv_thresh = w["imperviousRatioThreshold"]
    road_thresh = w["roadRatioThreshold"]
    road_high = w["roadHighThreshold"]
    building_thresh = w["buildingRatioThreshold"]
    green_low = w["greenTilesLowThreshold"]

    if req.greenRatio >= green_thresh:
        strengths.append(f"녹지율 {req.greenRatio * 100:.0f}%로 증발산 냉각이 충분합니다.")
    else:
        weaknesses.append(f"녹지율이 {req.greenRatio * 100:.0f}%로 낮아 냉각 효과가 부족합니다.")
        suggestions.append("도로변과 건물 사이에 가로수나 공원을 추가해 그늘과 증발산을 늘리세요.")

    if req.waterRatio > 0 or _count(req, "WETLAND") > 0:
        strengths.append("수변·습지가 주변을 식혀 줍니다.")
    else:
        suggestions.append("수변 또는 습지를 배치하면 국지적으로 크게 냉각됩니다.")

    if req.imperviousRatio >= imperv_thresh:
        weaknesses.append(
            f"불투수면(건물·도로·보도 등)이 {req.imperviousRatio * 100:.0f}%로 높아 열을 저장합니다."
        )
        if road > total * road_thresh:
            suggestions.append("도로 일부를 보도·광장·공원으로 바꿔 열섬 띠를 끊어 보세요.")
        else:
            suggestions.append("건물 주변에 공원·가로수를 넣어 불투수면 열을 분산하세요.")

    if road > total * road_high:
        weaknesses.append(f"도로 비율이 높습니다({road * 100 // total}%). 아스팔트 열이 누적됩니다.")
        suggestions.append("넓은 도로 구간에 보도·광장·가로수를 섞어 보행 친화·냉각을 동시에 노려보세요.")

    if building > total * building_thresh and green_tiles < total * green_low:
        weaknesses.append("건물 밀집 구역에 녹지가 거의 없습니다.")
        suggestions.append("건물 사이 공원·습지·가로수로 냉각 통로를 만드세요.")

    if _count(req, "PLAZA") == 0 and req.imperviousRatio >= 0.5:
        suggestions.append("밝은 포장의 광장을 넣으면 반사로 국지 온도를 낮출 수 있습니다.")

    if req.deltaT < 0:
        strengths.append(f"기준 기온 대비 {abs(req.deltaT):.1f}°C 낮춘 시원한 설계입니다.")
    else:
        weaknesses.append(f"평균 표면온도가 기준보다 {req.deltaT:.1f}°C 높습니다.")

    if not suggestions:
        suggestions.append("최고온 지점 주변에 가로수·습지를 더해 핫스팟을 분산하세요.")

    learning = DEFAULT_LEARNING
    if req.coachSettings and req.coachSettings.learningPointDefault:
        learning = req.coachSettings.learningPointDefault

    return CoachResponse(
        score=score_int,
        grade=_grade(score_int, req),
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
        logger.info(
            "Coach request region=%s green=%.0f%% water=%.0f%% deltaT=%+.1f°C",
            req.region,
            req.greenRatio * 100,
            req.waterRatio * 100,
            req.deltaT,
        )
        baseline = rule_based_coach(req)
        settings = req.coachSettings
        llm_enabled = True
        if settings and settings.llmEnabled is not None:
            llm_enabled = settings.llmEnabled

        if settings and settings.apiKey and llm_enabled:
            llm_result = run_llm_coach(req, baseline, settings)
            if llm_result is not None:
                logger.info("Coach response source=llm score=%s", llm_result.score)
                return llm_result

        if self._llm.enabled and llm_enabled and (settings is None or not settings.apiKey):
            llm_result = self._llm.coach(req, baseline)
            if llm_result is not None:
                logger.info("Coach response source=llm score=%s", llm_result.score)
                return llm_result

        logger.info("Coach response source=rule score=%s", baseline.score)
        return baseline
