package com.horizon.admin.dto;

import com.horizon.ai.dto.CoachResponse;

public record AdminAiCoachTestRequest(
        boolean useSavedSettings,
        SampleMetrics sampleMetrics
) {
    public record SampleMetrics(
            String region,
            double baseAirTemp,
            double solarLoad,
            int gridSize,
            double greenRatio,
            double waterRatio,
            double imperviousRatio,
            double avgSurfaceTemp,
            double maxSurfaceTemp,
            double deltaT,
            java.util.Map<String, Integer> tileCounts
    ) {
    }

    public record AdminAiCoachTestResponse(
            long latencyMs,
            String source,
            CoachResponse coachResponse
    ) {
    }
}
