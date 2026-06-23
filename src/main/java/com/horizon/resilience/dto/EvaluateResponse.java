package com.horizon.resilience.dto;

import com.horizon.weather.dto.RegionWeather;

import java.util.Map;

/**
 * Aggregated multi-lens evaluation of one city design.
 *
 * @param region         resolved region weather baseline
 * @param gridSize       grid side length
 * @param scenarioId     disaster scenario id used (null when no disaster lens)
 * @param lenses         per-axis results keyed by axis kind
 * @param axisScores     axis kind -> normalized score 0..100
 * @param resilienceScore weighted composite resilience score 0..100
 * @param balancePenalty penalty applied for imbalance across axes (>= 0)
 */
public record EvaluateResponse(
        RegionWeather region,
        int gridSize,
        String scenarioId,
        Map<String, LensResult> lenses,
        Map<String, Double> axisScores,
        double resilienceScore,
        double balancePenalty
) {
}
