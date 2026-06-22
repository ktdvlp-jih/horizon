package com.horizon.disaster.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.horizon.disaster.dto.DisasterMetrics;
import com.horizon.disaster.dto.DisasterMode;
import com.horizon.disaster.dto.DisasterTimeline;
import com.horizon.disaster.dto.DisasterTimelineFrame;
import com.horizon.disaster.dto.ScenarioSummary;
import com.horizon.disaster.dto.TyphoonScenarioParams;
import com.horizon.disaster.entity.DisasterScenario;
import com.horizon.design.dto.TileType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static com.horizon.disaster.service.DisasterGridHelper.*;

@Component
@RequiredArgsConstructor
public class TyphoonSimulationEngine {

    private final ObjectMapper objectMapper;

    public SimulationOutput simulate(DisasterScenario scenario, RegionContext region, TileType[][] grid) {
        TyphoonScenarioParams params = parseParams(scenario.getParamsJson());
        int rows = grid.length;
        int cols = grid[0].length;
        GridStats stats = gridStats(grid);

        TyphoonScenarioParams.TrackPoint point = params.track() != null && !params.track().isEmpty()
                ? params.track().getLast()
                : new TyphoonScenarioParams.TrackPoint(0, 0, 0, params.maxWindMs());

        double[][] values = computeRisk(region, grid, params, point, stats);
        return buildOutput(DisasterMode.TYPHOON, scenario, region, grid, values, stats);
    }

    public DisasterTimeline timeline(DisasterScenario scenario, RegionContext region, TileType[][] grid) {
        TyphoonScenarioParams params = parseParams(scenario.getParamsJson());
        GridStats stats = gridStats(grid);
        List<TyphoonScenarioParams.TrackPoint> track = params.track();
        if (track == null || track.isEmpty()) {
            track = List.of(new TyphoonScenarioParams.TrackPoint(0, 0, 0, params.maxWindMs()));
        }

        List<DisasterTimelineFrame> frames = new ArrayList<>();
        double globalMin = Double.POSITIVE_INFINITY;
        double globalMax = Double.NEGATIVE_INFINITY;

        for (int i = 0; i < track.size(); i++) {
            TyphoonScenarioParams.TrackPoint pt = track.get(i);
            double[][] values = computeRisk(region, grid, params, pt, stats);
            double min = minValue(values);
            double max = maxValue(values);
            globalMin = Math.min(globalMin, min);
            globalMax = Math.max(globalMax, max);
            frames.add(new DisasterTimelineFrame(
                    i,
                    "T+" + pt.hour() + "h",
                    (double) i / Math.max(1, track.size() - 1),
                    toList(values),
                    avgValue(values),
                    max,
                    countAffected(values)
            ));
        }

        ScenarioSummary summary = toSummary(scenario);
        return new DisasterTimeline(
                DisasterMode.TYPHOON,
                null,
                summary,
                grid.length,
                globalMin,
                globalMax,
                "scenario",
                frames
        );
    }

    private double[][] computeRisk(RegionContext region, TileType[][] grid,
                                   TyphoonScenarioParams params,
                                   TyphoonScenarioParams.TrackPoint point,
                                   GridStats stats) {
        int rows = grid.length;
        int cols = grid[0].length;
        double centerR = rows / 2.0 + point.latOffset() * rows;
        double centerC = cols / 2.0 + point.lonOffset() * cols;
        double windNorm = Math.min(1.0, point.windMs() / 55.0);
        double rainNorm = Math.min(1.0, params.rainfallMm() / 400.0);
        double radiusCells = Math.max(2.0, params.windRadiusKm() / 8.0);

        double[][] values = new double[rows][cols];
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                TileType tile = grid[r][c];
                double dist = Math.hypot(r - centerR, c - centerC);
                double windExp = windNorm * Math.exp(-dist / radiusCells);
                windExp *= (1.0 - windResistance(tile));

                double elev = cellElevation(region, rows, cols, r, c);
                double floodBase = rainNorm * stats.imperviousRatio() * (1.0 - elev / 15.0);
                floodBase = Math.max(0, floodBase - floodMitigation(tile));
                if (tile == TileType.DRAIN) {
                    floodBase *= 0.35;
                }

                double combined = Math.max(windExp, floodBase);
                if (tile == TileType.SHELTER) {
                    combined *= 0.5;
                }
                values[r][c] = clamp01(combined);
            }
        }
        return values;
    }

    private TyphoonScenarioParams parseParams(String json) {
        try {
            return objectMapper.readValue(json, TyphoonScenarioParams.class);
        } catch (Exception e) {
            return new TyphoonScenarioParams(45, 80, 300, List.of());
        }
    }

    static SimulationOutput buildOutput(DisasterMode mode, DisasterScenario scenario, RegionContext region,
                                        TileType[][] grid, double[][] values, GridStats stats) {
        int floodCells = 0;
        int windHigh = 0;
        int protectedCells = 0;
        for (int r = 0; r < grid.length; r++) {
            for (int c = 0; c < grid[0].length; c++) {
                double v = values[r][c];
                if (v >= 0.35) {
                    if (grid[r][c] == TileType.DRAIN || grid[r][c] == TileType.SEAWALL
                            || grid[r][c] == TileType.GREEN_BUFFER) {
                        protectedCells++;
                    }
                }
                if (v >= 0.5 && grid[r][c] != TileType.WATER) {
                    windHigh++;
                }
                if (v >= 0.45 && grid[r][c] != TileType.WATER && isCoastalRow(region, grid.length, r)) {
                    floodCells++;
                }
            }
        }
        double protectedRatio = stats.totalCells() == 0 ? 0 : (double) protectedCells / stats.totalCells();
        DisasterMetrics metrics = new DisasterMetrics(
                mode.name().toLowerCase(),
                grid.length,
                stats.totalCells(),
                stats.tileCounts(),
                countAffected(values),
                maxValue(values),
                avgValue(values),
                protectedRatio,
                (double) floodCells,
                (double) windHigh,
                null,
                null,
                null,
                null
        );
        return new SimulationOutput(toSummary(scenario), metrics, values);
    }

    static ScenarioSummary toSummary(DisasterScenario scenario) {
        return new ScenarioSummary(
                scenario.getId(),
                scenario.getMode(),
                scenario.getTitle(),
                scenario.getDescription(),
                scenario.getSourceEventId(),
                scenario.getRegionCode()
        );
    }

    static double clamp01(double v) {
        return Math.min(1.0, Math.max(0.0, v));
    }

    record SimulationOutput(ScenarioSummary scenario, DisasterMetrics metrics, double[][] cellValues) {
    }
}
