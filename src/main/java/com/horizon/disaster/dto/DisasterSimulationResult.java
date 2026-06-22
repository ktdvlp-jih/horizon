package com.horizon.disaster.dto;

import com.horizon.weather.dto.RegionWeather;

import java.util.List;

public record DisasterSimulationResult(
        DisasterMode mode,
        RegionWeather region,
        ScenarioSummary scenario,
        int gridSize,
        List<List<Double>> cellValues,
        DisasterMetrics metrics,
        double globalMin,
        double globalMax
) {
}
