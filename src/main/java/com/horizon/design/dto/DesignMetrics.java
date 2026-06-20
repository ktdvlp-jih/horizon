package com.horizon.design.dto;

import java.util.Map;

public record DesignMetrics(
        int gridSize,
        int totalCells,
        Map<String, Integer> tileCounts,
        double greenRatio,
        double imperviousRatio,
        double waterRatio,
        double baseAirTemp,
        double avgSurfaceTemp,
        double maxSurfaceTemp,
        double minSurfaceTemp,
        double deltaT
) {
}
