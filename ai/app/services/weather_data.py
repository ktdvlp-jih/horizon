"""pandas-based weather series analysis for the /analyze endpoint."""
from __future__ import annotations

import pandas as pd

from app.schemas.analyze import AnalyzeRequest, AnalyzeResponse


def analyze_series(req: AnalyzeRequest) -> AnalyzeResponse:
    if not req.series:
        return AnalyzeResponse(
            summary="분석할 시계열 데이터가 없습니다.",
            insights=[],
            stats={},
            confidence=0.0,
        )

    frame = pd.DataFrame({k: pd.Series(v, dtype="float64") for k, v in req.series.items()})
    stats: dict[str, dict[str, float]] = {}
    insights: list[str] = []

    for column in frame.columns:
        col = frame[column].dropna()
        if col.empty:
            continue
        stats[column] = {
            "mean": round(float(col.mean()), 2),
            "min": round(float(col.min()), 2),
            "max": round(float(col.max()), 2),
            "std": round(float(col.std(ddof=0)), 2),
        }
        if len(col) >= 2:
            trend = float(col.iloc[-1] - col.iloc[0])
            direction = "상승" if trend > 0 else "하강" if trend < 0 else "유지"
            insights.append(f"{column}: 기간 중 {abs(trend):.1f} {direction} (평균 {stats[column]['mean']}).")

    summary = f"{req.region} 지역 {len(frame.columns)}개 지표를 {len(frame)}개 시점으로 분석했습니다."
    return AnalyzeResponse(summary=summary, insights=insights, stats=stats, confidence=0.7)
