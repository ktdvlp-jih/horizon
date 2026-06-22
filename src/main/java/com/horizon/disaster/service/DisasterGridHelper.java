package com.horizon.disaster.service;

import com.horizon.common.exception.BusinessException;
import com.horizon.common.exception.ErrorCode;
import com.horizon.design.dto.TileType;
import com.horizon.settings.entity.RegionConfig;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Shared grid parsing and region context for disaster simulation engines.
 */
public final class DisasterGridHelper {

    public static final int MAX_GRID = 24;
    private static final double RISK_THRESHOLD = 0.35;

    private DisasterGridHelper() {
    }

    public record RegionContext(
            String code,
            String name,
            double coastalExposure,
            int seismicZone,
            double[] elevationProfile
    ) {
    }

    public record GridStats(
            Map<String, Integer> tileCounts,
            int totalCells,
            double imperviousRatio,
            double greenRatio
    ) {
    }

    public static RegionContext regionContext(RegionConfig region) {
        double coastal = region.getCoastalExposure();
        int seismic = region.getSeismicZone();
        double[] elevation = parseElevationProfile(region.getElevationProfileJson(), coastal);
        return new RegionContext(region.getCode(), region.getName(), coastal, seismic, elevation);
    }

    public static TileType[][] parseGrid(List<List<String>> raw) {
        if (raw == null || raw.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Grid is empty");
        }
        int rows = raw.size();
        if (rows > MAX_GRID) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Grid exceeds max size " + MAX_GRID);
        }
        int cols = raw.getFirst().size();
        if (cols > MAX_GRID) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Grid exceeds max size " + MAX_GRID);
        }
        TileType[][] grid = new TileType[rows][cols];
        for (int r = 0; r < rows; r++) {
            List<String> row = raw.get(r);
            if (row.size() != cols) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, "Grid rows must be rectangular");
            }
            for (int c = 0; c < cols; c++) {
                grid[r][c] = TileType.fromString(row.get(c));
            }
        }
        return grid;
    }

    public static GridStats gridStats(TileType[][] grid) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        int total = 0;
        int impervious = 0;
        int green = 0;
        for (TileType[] row : grid) {
            for (TileType t : row) {
                total++;
                counts.merge(t.name(), 1, Integer::sum);
                if (t.isImpervious()) {
                    impervious++;
                }
                if (t.isGreen()) {
                    green++;
                }
            }
        }
        double impRatio = total == 0 ? 0 : (double) impervious / total;
        double greenRatio = total == 0 ? 0 : (double) green / total;
        return new GridStats(counts, total, impRatio, greenRatio);
    }

    public static double cellElevation(RegionContext region, int rows, int cols, int r, int c) {
        double[] profile = region.elevationProfile();
        if (profile == null || profile.length == 0) {
            double coastal = region.coastalExposure();
            return coastal * (1.0 - (double) r / Math.max(1, rows - 1)) * 10.0;
        }
        int idx = Math.min(profile.length - 1, (int) ((double) r / rows * profile.length));
        return profile[idx];
    }

    public static boolean isCoastalRow(RegionContext region, int rows, int r) {
        int coastalRows = Math.max(1, (int) Math.ceil(rows * region.coastalExposure()));
        return r < coastalRows;
    }

    public static double structuralFactor(TileType tile) {
        return switch (tile) {
            case BUILDING -> 0.35;
            case RETAINING, SEAWALL -> 0.75;
            case SHELTER, HIGH_GROUND -> 0.85;
            case PARK, TREE, GREEN_BUFFER, WETLAND -> 0.9;
            default -> 0.55;
        };
    }

    public static double windResistance(TileType tile) {
        return switch (tile) {
            case SEAWALL, RETAINING -> 0.85;
            case TREE, GREEN_BUFFER, PARK -> 0.7;
            case BUILDING -> 0.45;
            case SHELTER, HIGH_GROUND -> 0.65;
            default -> 0.35;
        };
    }

    public static double floodMitigation(TileType tile) {
        return switch (tile) {
            case DRAIN -> 0.85;
            case GREEN_BUFFER, WETLAND, PARK, TREE -> 0.55;
            case WATER -> 0.4;
            case SEAWALL -> 0.7;
            default -> 0.0;
        };
    }

    public static double tsunamiBarrier(TileType tile) {
        return switch (tile) {
            case SEAWALL -> 0.9;
            case RETAINING -> 0.6;
            case GREEN_BUFFER, WETLAND -> 0.45;
            case HIGH_GROUND, SHELTER -> 0.3;
            default -> 0.0;
        };
    }

    public static double countAffected(double[][] values) {
        int affected = 0;
        int total = 0;
        for (double[] row : values) {
            for (double v : row) {
                total++;
                if (v >= RISK_THRESHOLD) {
                    affected++;
                }
            }
        }
        return total == 0 ? 0 : (double) affected / total;
    }

    public static double maxValue(double[][] values) {
        double max = 0;
        for (double[] row : values) {
            for (double v : row) {
                max = Math.max(max, v);
            }
        }
        return max;
    }

    public static double avgValue(double[][] values) {
        double sum = 0;
        int n = 0;
        for (double[] row : values) {
            for (double v : row) {
                sum += v;
                n++;
            }
        }
        return n == 0 ? 0 : sum / n;
    }

    public static double minValue(double[][] values) {
        double min = Double.POSITIVE_INFINITY;
        for (double[] row : values) {
            for (double v : row) {
                min = Math.min(min, v);
            }
        }
        return min == Double.POSITIVE_INFINITY ? 0 : min;
    }

    public static List<List<Double>> toList(double[][] grid) {
        return java.util.Arrays.stream(grid)
                .map(row -> java.util.Arrays.stream(row).boxed().toList())
                .toList();
    }

    private static double[] parseElevationProfile(String json, double coastalExposure) {
        if (json == null || json.isBlank()) {
            return defaultProfile(coastalExposure);
        }
        try {
            String trimmed = json.trim();
            if (trimmed.startsWith("[")) {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                return mapper.readValue(trimmed, double[].class);
            }
        } catch (Exception ignored) {
            // fall through
        }
        return defaultProfile(coastalExposure);
    }

    private static double[] defaultProfile(double coastalExposure) {
        int steps = 5;
        double[] profile = new double[steps];
        for (int i = 0; i < steps; i++) {
            profile[i] = coastalExposure * 12.0 * (1.0 - (double) i / (steps - 1));
        }
        return profile;
    }
}
