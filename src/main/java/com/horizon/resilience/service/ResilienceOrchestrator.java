package com.horizon.resilience.service;

import com.horizon.ai.client.AiServiceClient;
import com.horizon.ai.dto.CoachResponse;
import com.horizon.ai.dto.ResilienceCoachRequest;
import com.horizon.common.exception.BusinessException;
import com.horizon.common.exception.ErrorCode;
import com.horizon.design.dto.SimulationResult;
import com.horizon.design.dto.TileType;
import com.horizon.design.service.SimulationEngine;
import com.horizon.disaster.dto.DisasterMode;
import com.horizon.disaster.dto.DisasterSimulateRequest;
import com.horizon.disaster.dto.DisasterSimulationResult;
import com.horizon.disaster.entity.DisasterScenario;
import com.horizon.disaster.service.DisasterGridHelper;
import com.horizon.disaster.service.DisasterScenarioService;
import com.horizon.disaster.service.DisasterSimulationService;
import com.horizon.resilience.agriculture.AgricultureLayerEvaluator;
import com.horizon.resilience.air.AirQualityEvaluator;
import com.horizon.resilience.dto.AgricultureMetrics;
import com.horizon.resilience.dto.EvaluateRequest;
import com.horizon.resilience.dto.EvaluateResponse;
import com.horizon.resilience.dto.LensResult;
import com.horizon.settings.service.AiCoachSettingsService;
import com.horizon.weather.dto.RegionWeather;
import com.horizon.weather.service.WeatherDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Evaluates one shared city grid across every available axis (lens) at once and
 * aggregates a composite resilience score. Reuses the existing heat-island and
 * disaster engines; air-quality and agriculture axes are added in later phases.
 */
@Service
@RequiredArgsConstructor
public class ResilienceOrchestrator {

    private final WeatherDataService weatherDataService;
    private final SimulationEngine simulationEngine;
    private final DisasterScenarioService scenarioService;
    private final DisasterSimulationService disasterSimulationService;
    private final AirQualityEvaluator airQualityEvaluator;
    private final AgricultureLayerEvaluator agricultureLayerEvaluator;
    private final ResilienceScoring scoring;
    private final ScenarioWeightsResolver weightsResolver;
    private final AiServiceClient aiServiceClient;
    private final AiCoachSettingsService aiCoachSettingsService;

    public EvaluateResponse evaluate(EvaluateRequest request) {
        RegionWeather region = weatherDataService.getRegion(request.regionCode());
        TileType[][] grid = DisasterGridHelper.parseGrid(request.grid());

        Map<String, LensResult> lenses = new LinkedHashMap<>();
        Map<String, Double> axisScores = new LinkedHashMap<>();

        SimulationResult heat = addHeatLens(region, request, lenses, axisScores);
        AirQualityEvaluator.Result air = addAirLens(request, grid, lenses, axisScores);
        DisasterMode disasterMode = addDisasterLens(request, lenses, axisScores);
        addAgricultureLens(request, region, heat, air, lenses, axisScores);

        int gridSize = heat.gridSize();
        ScenarioWeights weights = weightsResolver.resolve(request.scenarioId(), disasterMode);
        ResilienceScoring.Composite composite = scoring.composite(axisScores, weights);

        return new EvaluateResponse(
                region,
                gridSize,
                request.scenarioId(),
                lenses,
                axisScores,
                composite.resilienceScore(),
                composite.balancePenalty()
        );
    }

    private SimulationResult addHeatLens(RegionWeather region, EvaluateRequest request,
                                         Map<String, LensResult> lenses, Map<String, Double> axisScores) {
        SimulationResult heat = simulationEngine.simulate(region, request.grid());
        double min = heat.metrics().minSurfaceTemp();
        double max = heat.metrics().maxSurfaceTemp();
        double score = scoring.heatScore(heat.metrics());
        lenses.put("heat", new LensResult(
                "heat", "열섬", heat.surfaceTemps(), min, max, score, heat.metrics()));
        axisScores.put("heat", score);
        return heat;
    }

    private AirQualityEvaluator.Result addAirLens(EvaluateRequest request, TileType[][] grid,
                                                  Map<String, LensResult> lenses, Map<String, Double> axisScores) {
        AirQualityEvaluator.Result air = airQualityEvaluator.evaluate(request.regionCode(), grid);
        double score = scoring.airScore(air.metrics());
        lenses.put("air", new LensResult(
                "air", "미세먼지", air.heatmap(), air.min(), air.max(), score, air.metrics()));
        axisScores.put("air", score);
        return air;
    }

    private void addAgricultureLens(EvaluateRequest request, RegionWeather region, SimulationResult heat,
                                    AirQualityEvaluator.Result air,
                                    Map<String, LensResult> lenses, Map<String, Double> axisScores) {
        AgricultureLayerEvaluator.CityAggregate aggregate = new AgricultureLayerEvaluator.CityAggregate(
                heat.metrics().greenRatio(),
                heat.metrics().waterRatio(),
                heat.metrics().imperviousRatio(),
                air.metrics().avgPm(),
                heat.metrics().deltaT()
        );
        AgricultureMetrics metrics = agricultureLayerEvaluator.evaluate(
                request.zones(), aggregate, region.baseAirTemp(), region.climate());
        double score = scoring.agricultureScore(metrics);
        // Wide-area lens: no per-cell heatmap overlay.
        lenses.put("agriculture", new LensResult(
                "agriculture", "농어업", List.of(), 0.0, 0.0, score, metrics));
        axisScores.put("agriculture", score);
    }

    private DisasterMode addDisasterLens(EvaluateRequest request,
                                         Map<String, LensResult> lenses, Map<String, Double> axisScores) {
        if (request.scenarioId() == null || request.scenarioId().isBlank()) {
            return null;
        }
        DisasterScenario scenario = scenarioService.getRequired(request.scenarioId());
        DisasterSimulationResult disaster = disasterSimulationService.simulate(new DisasterSimulateRequest(
                scenario.getMode(),
                request.regionCode(),
                request.scenarioId(),
                request.grid(),
                request.date()
        ));
        double score = scoring.disasterScore(disaster.metrics());
        lenses.put("disaster", new LensResult(
                "disaster",
                "재난",
                disaster.cellValues(),
                disaster.globalMin(),
                disaster.globalMax(),
                score,
                disaster.metrics()));
        axisScores.put("disaster", score);
        return scenario.getMode();
    }

    /**
     * Unified AI coach over all axes. Evaluates the design, then asks the AI
     * service to coach the whole design (rewarding balance). Falls back to a
     * deterministic rule-based coach when the AI service is unreachable.
     */
    public CoachResponse coach(EvaluateRequest request) {
        EvaluateResponse ev = evaluate(request);

        String scenarioTitle = null;
        if (request.scenarioId() != null && !request.scenarioId().isBlank()) {
            scenarioTitle = scenarioService.getRequired(request.scenarioId()).getTitle();
        }

        Map<String, Object> lensMetrics = new LinkedHashMap<>();
        ev.lenses().forEach((kind, lens) -> lensMetrics.put(kind, lens.metrics()));
        if (ev.region().climate() != null) {
            lensMetrics.put("climate", ev.region().climate());
        }

        ResilienceCoachRequest coachRequest = new ResilienceCoachRequest(
                ev.region().name(),
                scenarioTitle,
                ev.axisScores(),
                ev.resilienceScore(),
                ev.balancePenalty(),
                lensMetrics,
                aiCoachSettingsService.getActiveDecrypted()
        );
        try {
            return aiServiceClient.resilienceCoach(coachRequest);
        } catch (BusinessException ex) {
            if (ex.getErrorCode() != ErrorCode.AI_SERVICE_ERROR) {
                throw ex;
            }
            return ruleFallback(ev);
        }
    }

    private CoachResponse ruleFallback(EvaluateResponse ev) {
        int score = (int) Math.round(Math.max(0, Math.min(100, ev.resilienceScore())));
        String grade = score >= 90 ? "S · 회복도시 마스터"
                : score >= 75 ? "A · 균형 잡힌 도시"
                : score >= 60 ? "B · 양호"
                : score >= 45 ? "C · 개선 필요"
                : "D · 취약";

        List<String> strengths = new ArrayList<>();
        List<String> weaknesses = new ArrayList<>();
        List<String> suggestions = new ArrayList<>();

        String worstKey = null;
        double worstVal = Double.POSITIVE_INFINITY;
        double bestVal = Double.NEGATIVE_INFINITY;
        String bestKey = null;
        for (Map.Entry<String, Double> e : ev.axisScores().entrySet()) {
            if (e.getValue() < worstVal) {
                worstVal = e.getValue();
                worstKey = e.getKey();
            }
            if (e.getValue() > bestVal) {
                bestVal = e.getValue();
                bestKey = e.getKey();
            }
        }
        if (bestKey != null && bestVal >= 70) {
            strengths.add(axisLabel(bestKey) + " 축이 " + Math.round(bestVal) + "점으로 강점입니다.");
        }
        if (worstKey != null && worstVal < 60) {
            weaknesses.add(axisLabel(worstKey) + " 축이 " + Math.round(worstVal) + "점으로 가장 취약합니다.");
            suggestions.add(axisSuggestion(worstKey));
        }
        if (ev.balancePenalty() >= 5) {
            weaknesses.add("축 간 격차로 균형 패널티 -" + Math.round(ev.balancePenalty()) + "점이 적용됐습니다.");
            suggestions.add("강한 축은 유지하고 약한 축을 끌어올려 균형을 맞추세요.");
        }
        if (strengths.isEmpty()) strengths.add("종합 회복탄력성 " + score + "점 — 개선 여지가 있습니다.");
        if (weaknesses.isEmpty()) weaknesses.add("극단적으로 약한 축은 없지만 더 끌어올릴 수 있습니다.");
        if (suggestions.isEmpty()) suggestions.add("렌즈를 전환하며 붉은 구역에 대응 타일을 배치해 보세요.");

        return new CoachResponse(
                score,
                grade,
                strengths,
                weaknesses,
                suggestions,
                "한 축만 잘 만들면 다른 축이 무너집니다. 가장 약한 축을 끌어올려 균형 잡힌 회복도시를 만드세요.",
                "rule"
        );
    }

    private String axisLabel(String key) {
        return switch (key) {
            case "heat" -> "열섬";
            case "air" -> "미세먼지";
            case "disaster" -> "재난 대응";
            case "agriculture" -> "농어업";
            default -> key;
        };
    }

    private String axisSuggestion(String key) {
        return switch (key) {
            case "heat" -> "도로·건물 사이에 가로수·공원·수변을 더해 열섬을 식히세요.";
            case "air" -> "배출원 주변에 녹지완충(GREEN_BUFFER)·가로수를 배치해 미세먼지를 흡착하세요.";
            case "disaster" -> "위험 구역에 방조제·배수로·대피소·고지를 배치해 재난 피해를 줄이세요.";
            case "agriculture" -> "외곽 구역 배분과 도시 녹지·수자원을 늘려 작황·수자원을 확보하세요.";
            default -> "약한 축을 보강하는 타일을 추가해 보세요.";
        };
    }
}
