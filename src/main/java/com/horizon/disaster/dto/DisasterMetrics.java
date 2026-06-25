package com.horizon.disaster.dto;

import java.util.Map;

public record DisasterMetrics(
        String mode,
        int gridSize,
        int totalCells,
        Map<String, Integer> tileCounts,
        double affectedRatio,
        double maxRisk,
        double avgRisk,
        double protectedRatio,
        Double floodCells,
        Double windHighCells,
        Double collapseRiskCells,
        Double evacWithin3MinRatio,
        Double inundatedCells,
        Double highGroundCoverage,
        /** {@code kma} when live feeds adjusted scenario intensity; otherwise null. */
        String liveSource
) {
}
