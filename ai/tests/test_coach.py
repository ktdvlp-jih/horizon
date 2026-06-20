from app.schemas.coach import CoachRequest
from app.services.coach_service import rule_based_coach


def _request(green: float, water: float, impervious: float, delta: float) -> CoachRequest:
    return CoachRequest(
        region="서울",
        baseAirTemp=33.5,
        solarLoad=0.86,
        gridSize=10,
        greenRatio=green,
        imperviousRatio=impervious,
        waterRatio=water,
        avgSurfaceTemp=33.5 + delta,
        maxSurfaceTemp=40.0,
        deltaT=delta,
        tileCounts={},
    )


def test_green_design_scores_higher_than_concrete():
    cool = rule_based_coach(_request(green=0.5, water=0.1, impervious=0.2, delta=-4.0))
    hot = rule_based_coach(_request(green=0.0, water=0.0, impervious=0.95, delta=3.0))
    assert cool.score > hot.score
    assert cool.source == "rule"
    assert cool.suggestions


def test_score_bounds():
    extreme = rule_based_coach(_request(green=1.0, water=1.0, impervious=0.0, delta=-15.0))
    assert 0 <= extreme.score <= 100
