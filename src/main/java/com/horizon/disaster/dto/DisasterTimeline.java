package com.horizon.disaster.dto;

import com.horizon.weather.dto.RegionWeather;

import java.util.List;

public record DisasterTimeline(
        DisasterMode mode,
        RegionWeather region,
        ScenarioSummary scenario,
        int gridSize,
        double globalMin,
        double globalMax,
        String source,
        List<DisasterTimelineFrame> frames
) {
}
