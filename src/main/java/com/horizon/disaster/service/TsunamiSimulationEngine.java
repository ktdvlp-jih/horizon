package com.horizon.disaster.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.horizon.disaster.dto.DisasterMetrics;
import com.horizon.disaster.dto.DisasterMode;
import com.horizon.disaster.dto.DisasterTimeline;
import com.horizon.disaster.dto.DisasterTimelineFrame;
import com.horizon.disaster.dto.TsunamiScenarioParams;
import com.horizon.disaster.entity.DisasterScenario;
import com.horizon.design.dto.TileType;
import com.horizon.weather.dto.ClimateContext;
import com.horizon.weather.service.ClimateInfluenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

import static com.horizon.disaster.service.DisasterGridHelper.*;
import static com.horizon.disaster.service.TyphoonSimulationEngine.*;

@Component
@RequiredArgsConstructor
public class TsunamiSimulationEngine {

    private final ObjectMapper objectMapper;
    private final ClimateInfluenceService climateInfluence;

    public TyphoonSimulationEngine.SimulationOutput simulate(DisasterScenario scenario,
                                                             RegionContext region, TileType[][] grid,
                                                             ClimateContext climate) {
        TsunamiScenarioParams params = climateInfluence.blendTsunami(parseParams(scenario.getParamsJson()), climate);
        String liveSource = climateInfluence.hasLiveTsunamiBlend(climate) ? "kma" : null;
        GridStats stats = gridStats(grid);
        double[][] values = computeInundation(region, grid, params, 1.0);
        return buildTsunamiOutput(scenario, region, grid, values, stats, liveSource);
    }

    public DisasterTimeline timeline(DisasterScenario scenario, RegionContext region, TileType[][] grid,
                                     ClimateContext climate) {
        TsunamiScenarioParams params = climateInfluence.blendTsunami(parseParams(scenario.getParamsJson()), climate);
        int steps = 8;
        List<DisasterTimelineFrame> frames = new ArrayList<>();
        double globalMin = Double.POSITIVE_INFINITY;
        double globalMax = Double.NEGATIVE_INFINITY;

        for (int i = 0; i < steps; i++) {
            double progress = (double) (i + 1) / steps;
            double[][] values = computeInundation(region, grid, params, progress);
            double min = minValue(values);
            double max = maxValue(values);
            globalMin = Math.min(globalMin, min);
            globalMax = Math.max(globalMax, max);
            int minutes = (int) (params.etaMinutes() * progress);
            frames.add(new DisasterTimelineFrame(
                    i,
                    "ETA +" + minutes + "분",
                    progress,
                    toList(values),
                    avgValue(values),
                    max,
                    countAffected(values)
            ));
        }

        return new DisasterTimeline(
                DisasterMode.TSUNAMI,
                null,
                toSummary(scenario),
                grid.length,
                globalMin,
                globalMax,
                "scenario",
                frames
        );
    }

    private double[][] computeInundation(RegionContext region, TileType[][] grid,
                                         TsunamiScenarioParams params, double progress) {
        int rows = grid.length;
        int cols = grid[0].length;
        double waveAtCoast = params.waveHeightM() * params.runupFactor()
                * Math.min(1.0, params.sourceMagnitude() / 9.0);

        double[][] values = new double[rows][cols];
        int maxReachRow = (int) Math.ceil(rows * region.coastalExposure() * progress * 1.2);
        maxReachRow = Math.min(rows, Math.max(1, maxReachRow));

        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                TileType tile = grid[r][c];
                if (r >= maxReachRow) {
                    values[r][c] = 0;
                    continue;
                }
                double elev = cellElevation(region, rows, cols, r, c);
                if (tile == TileType.HIGH_GROUND) {
                    elev += 5.0;
                }
                double barrier = tsunamiBarrier(tile);
                double effectiveWave = waveAtCoast * (1.0 - barrier) * (1.0 - (double) r / rows);
                double depth = Math.max(0, effectiveWave - elev * 0.15);
                if (tile == TileType.SHELTER && depth > 0) {
                    depth *= 0.35;
                }
                values[r][c] = clamp01(depth / Math.max(0.5, waveAtCoast));
            }
        }
        return values;
    }

    private TyphoonSimulationEngine.SimulationOutput buildTsunamiOutput(
            DisasterScenario scenario, RegionContext region, TileType[][] grid,
            double[][] values, GridStats stats, String liveSource) {
        int inundated = 0;
        int highGround = 0;
        for (int r = 0; r < grid.length; r++) {
            for (int c = 0; c < grid[0].length; c++) {
                if (values[r][c] >= 0.35) {
                    inundated++;
                }
                if (grid[r][c] == TileType.HIGH_GROUND || grid[r][c] == TileType.SHELTER) {
                    highGround++;
                }
            }
        }
        double highGroundCoverage = stats.totalCells() == 0 ? 0 : (double) highGround / stats.totalCells();
        DisasterMetrics metrics = new DisasterMetrics(
                DisasterMode.TSUNAMI.name().toLowerCase(),
                grid.length,
                stats.totalCells(),
                stats.tileCounts(),
                countAffected(values),
                maxValue(values),
                avgValue(values),
                highGroundCoverage,
                null,
                null,
                null,
                null,
                (double) inundated,
                highGroundCoverage,
                liveSource
        );
        return new TyphoonSimulationEngine.SimulationOutput(toSummary(scenario), metrics, values);
    }

    private TsunamiScenarioParams parseParams(String json) {
        try {
            return objectMapper.readValue(json, TsunamiScenarioParams.class);
        } catch (Exception e) {
            return new TsunamiScenarioParams(9.0, 8.0, 90, 35, 1.2);
        }
    }
}
