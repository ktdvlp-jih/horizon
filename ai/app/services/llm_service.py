"""LLM integration for the AI coach.

Kept optional and defensive: any failure (missing key, network, bad JSON)
falls back to the rule-based result so the user experience never breaks.
"""
from __future__ import annotations

import json
import logging
import re

from app.config import Settings
from app.schemas.coach import CoachRequest, CoachResponse

logger = logging.getLogger("horizon.ai.llm")

SYSTEM_PROMPT = (
    "당신은 도시 기후 설계를 코칭하는 AI 도시 코치입니다. "
    "사용자가 설계한 도시의 지표를 보고 열섬 완화 관점에서 평가합니다. "
    "설명만 늘어놓지 말고, 사용자의 다음 행동을 이끄는 구체적이고 짧은 피드백을 줍니다. "
    "반드시 한국어로, 아래 JSON 스키마로만 응답하세요.\n"
    '{"score": int(0-100), "grade": str, "strengths": [str], '
    '"weaknesses": [str], "suggestions": [str], "learningPoint": str}'
)


class LlmService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = None
        if settings.llm_enabled:
            try:
                from openai import OpenAI

                kwargs = {"api_key": settings.openai_api_key}
                if settings.openai_base_url.strip():
                    kwargs["base_url"] = settings.openai_base_url
                self._client = OpenAI(**kwargs)
            except Exception as exc:  # noqa: BLE001
                logger.warning("OpenAI client init failed, using rule-based coach: %s", exc)
                self._client = None

    @property
    def enabled(self) -> bool:
        return self._client is not None

    @property
    def model(self) -> str:
        return self._settings.openai_model

    def coach(self, req: CoachRequest, fallback: CoachResponse) -> CoachResponse | None:
        if self._client is None:
            return None
        try:
            user_prompt = self._build_prompt(req)
            content = self._complete(SYSTEM_PROMPT, user_prompt)
            data = self._parse_json(content)
            if data is None:
                logger.warning("LLM returned no parseable JSON, falling back to rule-based")
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
            logger.warning("LLM coach failed, falling back to rule-based: %s", exc)
            return None

    def _complete(self, system_prompt: str, user_prompt: str) -> str:
        """Calls the chat API. Some OpenAI-compatible providers (e.g. Gemini)
        may reject response_format; retry once without it."""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        try:
            completion = self._client.chat.completions.create(
                model=self._settings.openai_model,
                messages=messages,
                temperature=0.6,
                response_format={"type": "json_object"},
            )
        except Exception as exc:  # noqa: BLE001
            logger.info("response_format unsupported (%s); retrying without it", exc)
            completion = self._client.chat.completions.create(
                model=self._settings.openai_model,
                messages=messages,
                temperature=0.6,
            )
        return completion.choices[0].message.content or ""

    @staticmethod
    def _parse_json(content: str) -> dict | None:
        """Robustly extracts a JSON object from an LLM response that may be
        wrapped in markdown code fences or surrounded by prose."""
        if not content or not content.strip():
            return None
        text = content.strip()
        # Strip ```json ... ``` / ``` ... ``` fences if present.
        fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL | re.IGNORECASE)
        if fence:
            text = fence.group(1).strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        # Fall back to the first {...} block found in the text.
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                return None
        return None

    @staticmethod
    def _build_prompt(req: CoachRequest) -> str:
        return (
            f"지역: {req.region}\n"
            f"기준 기온: {req.baseAirTemp}°C, 일사량(정규화): {req.solarLoad}\n"
            f"격자 크기: {req.gridSize}x{req.gridSize}\n"
            f"녹지율: {req.greenRatio:.2f}, 수면율: {req.waterRatio:.2f}, "
            f"불투수면율: {req.imperviousRatio:.2f}\n"
            f"평균 표면온도: {req.avgSurfaceTemp}°C (기준 대비 {req.deltaT:+.1f}°C), "
            f"최고 표면온도: {req.maxSurfaceTemp}°C\n"
            f"타일 구성: {req.tileCounts}\n"
            "위 설계를 평가하고 더 시원한 도시로 가기 위한 제안을 JSON으로 주세요."
        )
