package com.horizon.design.service;

import com.horizon.common.exception.BusinessException;
import com.horizon.common.exception.ErrorCode;
import com.horizon.design.dto.DesignMetrics;
import com.horizon.design.dto.SimulationResult;
import com.horizon.design.dto.SimulationTimeline;
import com.horizon.design.dto.TileType;
import com.horizon.design.dto.TimelineFrame;
import com.horizon.weather.dto.HourlyObservation;
import com.horizon.weather.dto.RegionWeather;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Deterministic, education-grade urban heat-island model.
 *
 * <p>This is an approximation tuned for "action -> visible result" feedback,
 * not a physically exact thermal solver. See docs/MVP.md section 5.</p>
 */
@Component
public class SimulationEngine {

    private static final double SOLAR_FACTOR = 14.0;
    private static final double NEIGHBOR_HEAT_FACTOR = 0.35;
    private static final double NEIGHBOR_COOLING_FACTOR = 0.35;
    private static final int MAX_GRID = 24;

    /** Hours of day sampled for the animation timeline. */
    private static final int[] TIMELINE_HOURS = {6, 8, 10, 12, 14, 16, 18, 20};
    /** Half-amplitude of the diurnal air-temperature swing (deg C). Educational approximation. */
    private static final double DIURNAL_AIR_AMPLITUDE = 4.0;

    public SimulationResult simulate(RegionWeather region, List<List<String>> rawGrid) {
        TileType[][] grid = parseGrid(rawGrid);
        int rows = grid.length;

        double[][] temps = cellTempGrid(grid, region);
        Stats stats = stats(temps);

        DesignMetrics metrics = buildMetrics(grid, region, stats.avg(), stats.max(), stats.min());
        return new SimulationResult(region, rows, toList(temps), metrics);
    }

    /**
     * Builds a day-cycle timeline by scaling the region's solar load with a
     * bell-shaped daytime curve and nudging the baseline air temperature with a
     * diurnal swing (coolest near dawn, warmest mid-afternoon). Each hour reuses
     * the same cell model so the heatmap evolves consistently during playback.
     */
    public SimulationTimeline simulateTimeline(RegionWeather region, List<List<String>> rawGrid, String date) {
        TileType[][] grid = parseGrid(rawGrid);
        int rows = grid.length;

        List<TimelineFrame> frames = new ArrayList<>(TIMELINE_HOURS.length);
        double globalMin = Double.POSITIVE_INFINITY;
        double globalMax = Double.NEGATIVE_INFINITY;

        for (int hour : TIMELINE_HOURS) {
            double solarIntensity = solarIntensity(hour);
            double airTemp = round(region.baseAirTemp() + diurnalAirDelta(hour));
            RegionWeather hourly = new RegionWeather(
                    region.code(),
                    region.name(),
                    airTemp,
                    region.solarLoad() * solarIntensity,
                    region.source()
            );

            double[][] temps = cellTempGrid(grid, hourly);
            Stats stats = stats(temps);
            globalMin = Math.min(globalMin, stats.min());
            globalMax = Math.max(globalMax, stats.max());

            frames.add(new TimelineFrame(
                    hour,
                    String.format("%02d:00", hour),
                    round(solarIntensity * 100.0) / 100.0,
                    airTemp,
                    toList(temps),
                    stats.avg(),
                    stats.max(),
                    stats.min(),
                    round(stats.avg() - airTemp)
            ));
        }

        return new SimulationTimeline(region, rows, round(globalMin), round(globalMax), "modeled", date, frames);
    }

    /**
     * Builds the timeline from real observed hourly data (KMA): each frame uses
     * the measured air temperature and insolation-derived solar load for that
     * hour. {@code solarIntensity} is the insolation normalized against the day's
     * peak, used for the sky tint / display.
     */
    public SimulationTimeline simulateTimeline(RegionWeather region, List<List<String>> rawGrid,
                                               List<HourlyObservation> observations, String date) {
        TileType[][] grid = parseGrid(rawGrid);
        int rows = grid.length;

        double peakInsolation = observations.stream()
                .mapToDouble(HourlyObservation::insolationMj)
                .max()
                .orElse(0.0);
        if (peakInsolation <= 0.0) {
            peakInsolation = 1.0;
        }

        List<TimelineFrame> frames = new ArrayList<>(observations.size());
        double globalMin = Double.POSITIVE_INFINITY;
        double globalMax = Double.NEGATIVE_INFINITY;

        for (HourlyObservation obs : observations) {
            RegionWeather hourly = new RegionWeather(
                    region.code(),
                    region.name(),
                    obs.airTemp(),
                    obs.solarLoad(),
                    region.source()
            );
            double[][] temps = cellTempGrid(grid, hourly);
            Stats stats = stats(temps);
            globalMin = Math.min(globalMin, stats.min());
            globalMax = Math.max(globalMax, stats.max());

            double intensity = Math.round((obs.insolationMj() / peakInsolation) * 100.0) / 100.0;
            frames.add(new TimelineFrame(
                    obs.hour(),
                    String.format("%02d:00", obs.hour()),
                    intensity,
                    round(obs.airTemp()),
                    toList(temps),
                    stats.avg(),
                    stats.max(),
                    stats.min(),
                    round(stats.avg() - obs.airTemp())
            ));
        }

        return new SimulationTimeline(region, rows, round(globalMin), round(globalMax), "observed", date, frames);
    }

    /** Bell-shaped daytime solar curve: 0 before 06h / after 18h, peak at noon. */
    private double solarIntensity(int hour) {
        if (hour <= 6 || hour >= 18) {
            return 0.0;
        }
        return Math.max(0.0, Math.sin(Math.PI * (hour - 6) / 12.0));
    }

    /** Diurnal air swing: minimum near 05h, maximum near 15h. */
    private double diurnalAirDelta(int hour) {
        return DIURNAL_AIR_AMPLITUDE * Math.sin(Math.PI * (hour - 9) / 12.0);
    }

    private double[][] cellTempGrid(TileType[][] grid, RegionWeather region) {
        int rows = grid.length;
        int cols = grid[0].length;
        double[][] temps = new double[rows][cols];
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                temps[r][c] = round(cellTemperature(grid, r, c, region));
            }
        }
        return temps;
    }

    private Stats stats(double[][] temps) {
        double sum = 0.0;
        double max = Double.NEGATIVE_INFINITY;
        double min = Double.POSITIVE_INFINITY;
        int count = 0;
        for (double[] row : temps) {
            for (double t : row) {
                sum += t;
                max = Math.max(max, t);
                min = Math.min(min, t);
                count++;
            }
        }
        return new Stats(round(sum / count), round(max), round(min));
    }

    private record Stats(double avg, double max, double min) {
    }

    private double cellTemperature(TileType[][] grid, int r, int c, RegionWeather region) {
        TileType tile = grid[r][c];
        double base = region.baseAirTemp();
        double solar = SOLAR_FACTOR * (1.0 - tile.albedo()) * region.solarLoad();
        double cooling = tile.selfCooling();

        double neighborHeat = 0.0;
        double neighborCooling = 0.0;
        int[][] offsets = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        for (int[] off : offsets) {
            int nr = r + off[0];
            int nc = c + off[1];
            if (nr < 0 || nc < 0 || nr >= grid.length || nc >= grid[0].length) {
                continue;
            }
            TileType n = grid[nr][nc];
            neighborHeat += n.emittedHeat() * NEIGHBOR_HEAT_FACTOR;
            neighborCooling += n.selfCooling() * NEIGHBOR_COOLING_FACTOR;
        }

        return base + solar - cooling + neighborHeat - neighborCooling;
    }

    private DesignMetrics buildMetrics(TileType[][] grid, RegionWeather region,
                                       double avg, double max, double min) {
        int rows = grid.length;
        int cols = grid[0].length;
        int total = rows * cols;

        Map<String, Integer> counts = new LinkedHashMap<>();
        for (TileType type : TileType.values()) {
            counts.put(type.name(), 0);
        }
        int green = 0;
        int impervious = 0;
        int water = 0;
        for (TileType[] row : grid) {
            for (TileType tile : row) {
                counts.merge(tile.name(), 1, Integer::sum);
                if (tile.isGreen()) green++;
                if (tile.isImpervious()) impervious++;
                if (tile.isWater()) water++;
            }
        }

        return new DesignMetrics(
                rows,
                total,
                counts,
                ratio(green, total),
                ratio(impervious, total),
                ratio(water, total),
                region.baseAirTemp(),
                avg,
                max,
                min,
                round(avg - region.baseAirTemp())
        );
    }

    private TileType[][] parseGrid(List<List<String>> rawGrid) {
        if (rawGrid == null || rawGrid.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "그리드가 비어 있습니다.");
        }
        int rows = rawGrid.size();
        int cols = rawGrid.get(0).size();
        if (cols == 0) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "그리드 열이 비어 있습니다.");
        }
        if (rows > MAX_GRID || cols > MAX_GRID) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "그리드 크기는 최대 " + MAX_GRID + "x" + MAX_GRID + " 입니다.");
        }
        TileType[][] grid = new TileType[rows][cols];
        for (int r = 0; r < rows; r++) {
            List<String> row = rawGrid.get(r);
            if (row.size() != cols) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, "모든 행의 열 수가 같아야 합니다.");
            }
            for (int c = 0; c < cols; c++) {
                grid[r][c] = TileType.fromString(row.get(c));
            }
        }
        return grid;
    }

    private List<List<Double>> toList(double[][] temps) {
        List<List<Double>> out = new ArrayList<>(temps.length);
        for (double[] row : temps) {
            List<Double> r = new ArrayList<>(row.length);
            for (double v : row) {
                r.add(v);
            }
            out.add(r);
        }
        return out;
    }

    private double ratio(int part, int total) {
        return total == 0 ? 0.0 : Math.round((double) part / total * 1000.0) / 1000.0;
    }

    private double round(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
