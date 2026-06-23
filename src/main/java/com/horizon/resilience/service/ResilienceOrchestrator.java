package com.horizon.resilience.service;

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
import com.horizon.weather.dto.RegionWeather;
import com.horizon.weather.service.WeatherDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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

    public EvaluateResponse evaluate(EvaluateRequest request) {
        RegionWeather region = weatherDataService.getRegion(request.regionCode());
        TileType[][] grid = DisasterGridHelper.parseGrid(request.grid());

        Map<String, LensResult> lenses = new LinkedHashMap<>();
        Map<String, Double> axisScores = new LinkedHashMap<>();

        SimulationResult heat = addHeatLens(region, request, lenses, axisScores);
        AirQualityEvaluator.Result air = addAirLens(request, grid, lenses, axisScores);
        DisasterMode disasterMode = addDisasterLens(request, lenses, axisScores);
        addAgricultureLens(request, heat, air, lenses, axisScores);

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

    private void addAgricultureLens(EvaluateRequest request, SimulationResult heat,
                                    AirQualityEvaluator.Result air,
                                    Map<String, LensResult> lenses, Map<String, Double> axisScores) {
        AgricultureLayerEvaluator.CityAggregate aggregate = new AgricultureLayerEvaluator.CityAggregate(
                heat.metrics().greenRatio(),
                heat.metrics().waterRatio(),
                heat.metrics().imperviousRatio(),
                air.metrics().avgPm(),
                heat.metrics().deltaT()
        );
        AgricultureMetrics metrics = agricultureLayerEvaluator.evaluate(request.zones(), aggregate);
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
}
