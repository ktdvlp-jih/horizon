package com.horizon.ai.dto;

import java.util.Map;

/**
 * Sent to the Python AI service ({@code POST /internal/v1/coach}).
 * Carries the already-computed design metrics so the LLM can evaluate the design.
 */
public record CoachRequest(
        String region,
        double baseAirTemp,
        double solarLoad,
        int gridSize,
        double greenRatio,
        double imperviousRatio,
        double waterRatio,
        double avgSurfaceTemp,
        double maxSurfaceTemp,
        double deltaT,
        Map<String, Integer> tileCounts,
        CoachSettingsDto coachSettings
) {
}
