package com.horizon.resilience.service;

import com.horizon.design.dto.SimulationResult;
import com.horizon.design.dto.TileType;
import com.horizon.design.service.SimulationEngine;
import com.horizon.disaster.dto.DisasterSimulateRequest;
import com.horizon.disaster.dto.DisasterSimulationResult;
import com.horizon.disaster.entity.DisasterScenario;
import com.horizon.disaster.service.DisasterGridHelper;
import com.horizon.disaster.service.DisasterScenarioService;
import com.horizon.disaster.service.DisasterSimulationService;
import com.horizon.resilience.air.AirQualityEvaluator;
import com.horizon.resilience.dto.EvaluateRequest;
import com.horizon.resilience.dto.EvaluateResponse;
import com.horizon.resilience.dto.LensResult;
import com.horizon.weather.dto.RegionWeather;
import com.horizon.weather.service.WeatherDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
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
    private final ResilienceScoring scoring;
    private final ScenarioWeightsResolver weightsResolver;

    public EvaluateResponse evaluate(EvaluateRequest request) {
        RegionWeather region = weatherDataService.getRegion(request.regionCode());
        TileType[][] grid = DisasterGridHelper.parseGrid(request.grid());

        Map<String, LensResult> lenses = new LinkedHashMap<>();
        Map<String, Double> axisScores = new LinkedHashMap<>();

        int gridSize = addHeatLens(region, request, lenses, axisScores);
        addAirLens(request, grid, lenses, axisScores);
        addDisasterLens(request, lenses, axisScores);

        ScenarioWeights weights = weightsResolver.resolve(request.scenarioId());
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

    private int addHeatLens(RegionWeather region, EvaluateRequest request,
                            Map<String, LensResult> lenses, Map<String, Double> axisScores) {
        SimulationResult heat = simulationEngine.simulate(region, request.grid());
        double min = heat.metrics().minSurfaceTemp();
        double max = heat.metrics().maxSurfaceTemp();
        double score = scoring.heatScore(heat.metrics());
        lenses.put("heat", new LensResult(
                "heat", "열섬", heat.surfaceTemps(), min, max, score, heat.metrics()));
        axisScores.put("heat", score);
        return heat.gridSize();
    }

    private void addAirLens(EvaluateRequest request, TileType[][] grid,
                            Map<String, LensResult> lenses, Map<String, Double> axisScores) {
        AirQualityEvaluator.Result air = airQualityEvaluator.evaluate(request.regionCode(), grid);
        double score = scoring.airScore(air.metrics());
        lenses.put("air", new LensResult(
                "air", "미세먼지", air.heatmap(), air.min(), air.max(), score, air.metrics()));
        axisScores.put("air", score);
    }

    private void addDisasterLens(EvaluateRequest request,
                                 Map<String, LensResult> lenses, Map<String, Double> axisScores) {
        if (request.scenarioId() == null || request.scenarioId().isBlank()) {
            return;
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
    }
}
