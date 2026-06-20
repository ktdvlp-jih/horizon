package com.horizon.design.dto;

import com.horizon.weather.dto.RegionWeather;

import java.util.List;

public record SimulationResult(
        RegionWeather region,
        int gridSize,
        List<List<Double>> surfaceTemps,
        DesignMetrics metrics
) {
}
