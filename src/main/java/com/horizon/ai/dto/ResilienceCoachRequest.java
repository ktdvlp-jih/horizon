package com.horizon.ai.dto;

import java.util.Map;

/**
 * Sent to the Python AI service ({@code POST /internal/v1/coach/resilience}).
 * Carries the multi-axis evaluation so the LLM can coach the design as a whole,
 * rewarding balance across axes.
 */
public record ResilienceCoachRequest(
        String region,
        String scenarioTitle,
        Map<String, Double> axisScores,
        double resilienceScore,
        double balancePenalty,
        Map<String, Object> lensMetrics,
        CoachSettingsDto coachSettings
) {
}
