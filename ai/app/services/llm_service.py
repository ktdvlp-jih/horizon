"""LLM integration for the AI coach."""
from __future__ import annotations

import json
import logging
import re

from app.config import Settings
from app.schemas.coach import CoachRequest, CoachResponse, CoachSettings

logger = logging.getLogger("horizon.ai.llm")

TILE_NAMES_KO = {
    "BUILDING": "건물",
    "ROAD": "도로",
    "BARE": "맨땅",
    "PARK": "공원",
    "TREE": "가로수",
    "WATER": "수변",
    "SIDEWALK": "보도",
    "WETLAND": "습지",
    "PLAZA": "광장",
}

SYSTEM_PROMPT = (
    "당신은 도시 기후 설계를 코칭하는 AI 도시 코치입니다. "
    "사용자가 설계한 도시의 지표와 타일 구성을 보고 열섬 완화 관점에서 평가합니다. "
    "사용 가능한 타일: 건물, 도로, 맨땅, 공원, 가로수, 수변, 보도, 습지, 광장. "
    "도로·건물은 덥고, 녹지·수변·습지·가로수는 시원합니다. 보도·광장은 도로보다 덜 뜨겁습니다. "
    "설명만 늘어놓지 말고, 사용자의 다음 행동을 이끄는 구체적이고 짧은 피드백을 줍니다. "
    "타일 이름은 반드시 한국어로 씁니다. "
    "반드시 한국어로, 아래 JSON 스키마로만 응답하세요.\n"
    '{"score": int(0-100), "grade": str, "strengths": [str], '
    '"weaknesses": [str], "suggestions": [str], "learningPoint": str}'
)


class LlmService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = None
        if settings.llm_enabled:
            self._client = _create_client(settings.openai_api_key, settings.openai_base_url)

    @property
    def enabled(self) -> bool:
        return self._client is not None

    @property
    def model(self) -> str:
        return self._settings.openai_model

    def coach(self, req: CoachRequest, fallback: CoachResponse) -> CoachResponse | None:
        if self._client is None:
            return None
        return run_llm_coach(req, fallback, None, self._client, self._settings.openai_model, 0.6)


def _create_client(api_key: str, base_url: str):
    if not api_key or not api_key.strip():
        return None
    try:
        from openai import OpenAI

        kwargs = {"api_key": api_key.strip()}
        if base_url and base_url.strip():
            kwargs["base_url"] = base_url.strip()
        return OpenAI(**kwargs)
    except Exception as exc:  # noqa: BLE001
        logger.warning("OpenAI client init failed: %s", exc)
        return None


def run_llm_coach(
    req: CoachRequest,
    fallback: CoachResponse,
    settings: CoachSettings | None,
    client=None,
    default_model: str | None = None,
    default_temperature: float = 0.6,
) -> CoachResponse | None:
    if client is None and settings:
        if not settings.apiKey or not settings.llmEnabled:
            return None
        client = _create_client(settings.apiKey, settings.baseUrl or "")
    if client is None:
        return None

    system_prompt = SYSTEM_PROMPT
    model = default_model or "gpt-4o-mini"
    temperature = default_temperature
    if settings:
        if settings.systemPrompt:
            system_prompt = settings.systemPrompt
        if settings.model:
            model = settings.model
        if settings.temperature is not None:
            temperature = settings.temperature

    try:
        logger.info("LLM coach call model=%s region=%s", model, req.region)
        user_prompt = build_user_prompt(req)
        content = _complete(client, system_prompt, user_prompt, model, temperature)
        data = _parse_json(content)
        if data is None:
            return None
        return CoachResponse(
            score=int(data.get("score", fallback.score)),
            grade=str(data.get("grade", fallback.grade)),
            strengths=list(data.get("strengths", fallback.strengths))[:3],
            weaknesses=list(data.get("weaknesses", fallback.weaknesses))[:3],
            suggestions=list(data.get("suggestions", fallback.suggestions))[:3],
            learningPoint=str(data.get("learningPoint", fallback.learningPoint)),
            source="llm",
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("LLM coach failed: %s", exc)
        return None


def _complete(client, system_prompt: str, user_prompt: str, model: str, temperature: float) -> str:
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    try:
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            response_format={"type": "json_object"},
        )
    except Exception as exc:  # noqa: BLE001
        logger.info("response_format unsupported (%s); retrying without it", exc)
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
        )
    return completion.choices[0].message.content or ""


def _parse_json(content: str) -> dict | None:
    if not content or not content.strip():
        return None
    text = content.strip()
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL | re.IGNORECASE)
    if fence:
        text = fence.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return None
    return None


def _format_tile_counts(counts: dict[str, int]) -> str:
    if not counts:
        return "없음"
    parts = []
    for key, n in sorted(counts.items(), key=lambda x: -x[1]):
        if n <= 0:
            continue
        label = TILE_NAMES_KO.get(key, key)
        parts.append(f"{label} {n}칸")
    return ", ".join(parts) if parts else "없음"


def build_user_prompt(req: CoachRequest) -> str:
    settings = req.coachSettings
    if settings and settings.userPromptTemplate:
        template = settings.userPromptTemplate
        tiles = _format_tile_counts(req.tileCounts)
        replacements = {
            "{region}": req.region,
            "{baseAirTemp}": str(req.baseAirTemp),
            "{solarLoad}": str(req.solarLoad),
            "{gridSize}": str(req.gridSize),
            "{greenRatio}": f"{req.greenRatio:.2f}",
            "{waterRatio}": f"{req.waterRatio:.2f}",
            "{imperviousRatio}": f"{req.imperviousRatio:.2f}",
            "{avgSurfaceTemp}": str(req.avgSurfaceTemp),
            "{maxSurfaceTemp}": str(req.maxSurfaceTemp),
            "{deltaT}": f"{req.deltaT:+.1f}",
            "{tileCounts}": tiles,
        }
        result = template
        for k, v in replacements.items():
            result = result.replace(k, v)
        return result

    tiles = _format_tile_counts(req.tileCounts)
    return (
        f"지역: {req.region}\n"
        f"기준 기온: {req.baseAirTemp}°C, 일사량(정규화): {req.solarLoad}\n"
        f"격자 크기: {req.gridSize}x{req.gridSize}\n"
        f"녹지율: {req.greenRatio:.2f}, 수면·습지율: {req.waterRatio:.2f}, "
        f"불투수면율: {req.imperviousRatio:.2f}\n"
        f"평균 표면온도: {req.avgSurfaceTemp}°C (기준 대비 {req.deltaT:+.1f}°C), "
        f"최고 표면온도: {req.maxSurfaceTemp}°C\n"
        f"타일 구성: {tiles}\n"
        "위 설계를 평가하고 더 시원한 도시로 가기 위한 제안을 JSON으로 주세요."
    )
