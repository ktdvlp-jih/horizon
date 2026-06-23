package com.horizon.resilience.air;

import com.horizon.design.dto.TileType;
import com.horizon.resilience.dto.AirQualityMetrics;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Deterministic, education-grade particulate-matter (PM) model over the shared
 * city grid. Industry/road cells emit PM; trees and green buffers absorb it; a
 * single diffusion pass spreads concentrations to neighbors. This mirrors the
 * "action → visible result" philosophy of the heat-island engine rather than a
 * physically exact dispersion solver.
 */
@Component
@RequiredArgsConstructor
public class AirQualityEvaluator {

    private final AirQualityBaselineProvider baselineProvider;

    private static final double DIFFUSION = 0.45;

    public Result evaluate(String regionCode, TileType[][] grid) {
        int rows = grid.length;
        int cols = grid[0].length;
        AirQualityBaselineProvider.Baseline baseline = baselineProvider.baseline(regionCode);
        double base = baseline.pm();

        double[][] raw = new double[rows][cols];
        int sources = 0;
        int sinks = 0;
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                TileType tile = grid[r][c];
                double emit = emission(tile);
                if (emit > 0) sources++;
                if (absorption(tile) > 0) sinks++;
                raw[r][c] = base + emit;
            }
        }

        double[][] pm = new double[rows][cols];
        double sum = 0;
        double max = Double.NEGATIVE_INFINITY;
        double min = Double.POSITIVE_INFINITY;
        int[][] offsets = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                double neighborSum = 0;
                double neighborAbsorb = 0;
                int n = 0;
                for (int[] off : offsets) {
                    int nr = r + off[0];
                    int nc = c + off[1];
                    if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) {
                        continue;
                    }
                    neighborSum += raw[nr][nc];
                    neighborAbsorb += absorption(grid[nr][nc]);
                    n++;
                }
                double neighborAvg = n == 0 ? raw[r][c] : neighborSum / n;
                double diffused = (1 - DIFFUSION) * raw[r][c] + DIFFUSION * neighborAvg;
                double absorbed = absorption(grid[r][c]) + 0.3 * neighborAbsorb;
                double value = Math.max(base * 0.35, diffused - absorbed);
                value = round(value);
                pm[r][c] = value;
                sum += value;
                max = Math.max(max, value);
                min = Math.min(min, value);
            }
        }

        int total = rows * cols;
        AirQualityMetrics metrics = new AirQualityMetrics(
                rows,
                total,
                round(base),
                round(sum / total),
                round(max),
                round(min),
                sources,
                sinks,
                ratio(sources, total),
                ratio(sinks, total),
                baseline.source()
        );
        return new Result(toList(pm), round(min), round(max), metrics);
    }

    /** PM emission contribution (µg/m³) of a tile. */
    private double emission(TileType tile) {
        return switch (tile) {
            case INDUSTRY -> 62.0;
            case ROAD -> 28.0;
            case BUILDING -> 10.0;
            case BARE -> 6.0;
            case PLAZA, SIDEWALK -> 4.0;
            default -> 0.0;
        };
    }

    /** PM absorption / deposition capacity (µg/m³) of a tile. */
    private double absorption(TileType tile) {
        return switch (tile) {
            case TREE -> 18.0;
            case GREEN_BUFFER -> 14.0;
            case PARK -> 10.0;
            case WETLAND -> 9.0;
            case WATER -> 6.0;
            default -> 0.0;
        };
    }

    private double ratio(int part, int total) {
        return total == 0 ? 0.0 : Math.round((double) part / total * 1000.0) / 1000.0;
    }

    private double round(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    private List<List<Double>> toList(double[][] grid) {
        List<List<Double>> out = new ArrayList<>(grid.length);
        for (double[] row : grid) {
            List<Double> r = new ArrayList<>(row.length);
            for (double v : row) {
                r.add(v);
            }
            out.add(r);
        }
        return out;
    }

    public record Result(List<List<Double>> heatmap, double min, double max, AirQualityMetrics metrics) {
    }
}
