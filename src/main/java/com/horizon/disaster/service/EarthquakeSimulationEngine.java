package com.horizon.disaster.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.horizon.disaster.dto.DisasterMetrics;
import com.horizon.disaster.dto.DisasterMode;
import com.horizon.disaster.dto.DisasterTimeline;
import com.horizon.disaster.dto.DisasterTimelineFrame;
import com.horizon.disaster.dto.EarthquakeScenarioParams;
import com.horizon.disaster.entity.DisasterScenario;
import com.horizon.design.dto.TileType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

import static com.horizon.disaster.service.DisasterGridHelper.*;
import static com.horizon.disaster.service.TyphoonSimulationEngine.*;

@Component
@RequiredArgsConstructor
public class EarthquakeSimulationEngine {

    private static final int[] TIMELINE_SECONDS = {0, 5, 10, 15, 20, 25, 30};

    private final ObjectMapper objectMapper;

    public TyphoonSimulationEngine.SimulationOutput simulate(DisasterScenario scenario,
                                                             RegionContext region, TileType[][] grid) {
        EarthquakeScenarioParams params = parseParams(scenario.getParamsJson());
        GridStats stats = gridStats(grid);
        double[][] values = computeRisk(region, grid, params, 1.0, stats);
        return buildEarthquakeOutput(scenario, region, grid, values, stats, params);
    }

    public DisasterTimeline timeline(DisasterScenario scenario, RegionContext region, TileType[][] grid) {
        EarthquakeScenarioParams params = parseParams(scenario.getParamsJson());
        GridStats stats = gridStats(grid);

        List<DisasterTimelineFrame> frames = new ArrayList<>();
        double globalMin = Double.POSITIVE_INFINITY;
        double globalMax = Double.NEGATIVE_INFINITY;

        for (int i = 0; i < TIMELINE_SECONDS.length; i++) {
            int sec = TIMELINE_SECONDS[i];
            double amp = sec <= 15 ? 1.0 : Math.max(0.2, 1.0 - (sec - 15) / 20.0);
            double[][] values = computeRisk(region, grid, params, amp, stats);
            double min = minValue(values);
            double max = maxValue(values);
            globalMin = Math.min(globalMin, min);
            globalMax = Math.max(globalMax, max);
            frames.add(new DisasterTimelineFrame(
                    i,
                    sec + "초",
                    sec / 30.0,
                    toList(values),
                    avgValue(values),
                    max,
                    countAffected(values)
            ));
        }

        return new DisasterTimeline(
                DisasterMode.EARTHQUAKE,
                null,
                toSummary(scenario),
                grid.length,
                globalMin,
                globalMax,
                "scenario",
                frames
        );
    }

    private double[][] computeRisk(RegionContext region, TileType[][] grid,
                                   EarthquakeScenarioParams params, double amplitude,
                                   GridStats stats) {
        int rows = grid.length;
        int cols = grid[0].length;
        double epicR = rows / 2.0 + params.epicenterLatOffset() * rows;
        double epicC = cols / 2.0 + params.epicenterLonOffset() * cols;
        double mmiBase = Math.min(1.0, (params.magnitude() - 4.0) / 4.0);
        double soilFactor = "soft".equalsIgnoreCase(params.soilType()) ? 1.25 : 1.0;
        double zoneFactor = 0.7 + region.seismicZone() * 0.08;

        double[][] values = new double[rows][cols];
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                TileType tile = grid[r][c];
                double dist = Math.hypot(r - epicR, c - epicC);
                double shaking = mmiBase * soilFactor * zoneFactor * amplitude
                        * Math.exp(-dist / (rows * 0.45));
                double collapse = shaking * (1.0 - structuralFactor(tile));
                if (tile == TileType.BUILDING && stats.imperviousRatio() > 0.5) {
                    collapse *= 1.15;
                }
                if (tile == TileType.SHELTER || tile == TileType.HIGH_GROUND) {
                    collapse *= 0.4;
                }
                values[r][c] = clamp01(collapse);
            }
        }
        return values;
    }

    private TyphoonSimulationEngine.SimulationOutput buildEarthquakeOutput(
            DisasterScenario scenario, RegionContext region, TileType[][] grid,
            double[][] values, GridStats stats, EarthquakeScenarioParams params) {
        int collapseCells = 0;
        int evacOk = 0;
        int totalNonShelter = 0;
        int rows = grid.length;
        int cols = grid[0].length;

        boolean[][] shelterReachable = bfsShelterReachability(grid);

        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (values[r][c] >= 0.45) {
                    collapseCells++;
                }
                if (grid[r][c] != TileType.SHELTER && grid[r][c] != TileType.WATER) {
                    totalNonShelter++;
                    if (shelterReachable[r][c]) {
                        evacOk++;
                    }
                }
            }
        }

        double evacRatio = totalNonShelter == 0 ? 1.0 : (double) evacOk / totalNonShelter;
        DisasterMetrics metrics = new DisasterMetrics(
                DisasterMode.EARTHQUAKE.name().toLowerCase(),
                rows,
                stats.totalCells(),
                stats.tileCounts(),
                countAffected(values),
                maxValue(values),
                avgValue(values),
                evacRatio,
                null,
                null,
                (double) collapseCells,
                evacRatio,
                null,
                null
        );
        return new TyphoonSimulationEngine.SimulationOutput(toSummary(scenario), metrics, values);
    }

    private boolean[][] bfsShelterReachability(TileType[][] grid) {
        int rows = grid.length;
        int cols = grid[0].length;
        boolean[][] reachable = new boolean[rows][cols];
        java.util.ArrayDeque<int[]> queue = new java.util.ArrayDeque<>();

        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] == TileType.SHELTER || grid[r][c] == TileType.HIGH_GROUND
                        || grid[r][c] == TileType.PARK) {
                    reachable[r][c] = true;
                    queue.add(new int[]{r, c});
                }
            }
        }

        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!queue.isEmpty()) {
            int[] cur = queue.poll();
            for (int[] d : dirs) {
                int nr = cur[0] + d[0];
                int nc = cur[1] + d[1];
                if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || reachable[nr][nc]) {
                    continue;
                }
                TileType t = grid[nr][nc];
                if (t == TileType.BUILDING && structuralFactor(t) < 0.5) {
                    continue;
                }
                reachable[nr][nc] = true;
                queue.add(new int[]{nr, nc});
            }
        }
        return reachable;
    }

    private EarthquakeScenarioParams parseParams(String json) {
        try {
            return objectMapper.readValue(json, EarthquakeScenarioParams.class);
        } catch (Exception e) {
            return new EarthquakeScenarioParams(5.4, 9.0, 0.1, 0.1, "soft");
        }
    }
}
