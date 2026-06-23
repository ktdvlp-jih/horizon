package com.horizon.resilience.dto;

/**
 * Air-quality (particulate matter) metrics for one city design.
 *
 * @param gridSize    grid side length
 * @param totalCells  total cells
 * @param baselinePm  regional background PM concentration (µg/m³)
 * @param avgPm       grid-average PM concentration (µg/m³)
 * @param maxPm       worst-cell PM concentration (µg/m³)
 * @param minPm       cleanest-cell PM concentration (µg/m³)
 * @param sourceCells number of emission-source cells (industry/road/...)
 * @param sinkCells   number of absorption cells (trees/green buffer/...)
 * @param sourceRatio source cells / total
 * @param sinkRatio   sink cells / total
 * @param source      baseline data source: "airkorea" (live) or "fallback"
 */
public record AirQualityMetrics(
        int gridSize,
        int totalCells,
        double baselinePm,
        double avgPm,
        double maxPm,
        double minPm,
        int sourceCells,
        int sinkCells,
        double sourceRatio,
        double sinkRatio,
        String source
) {
}
