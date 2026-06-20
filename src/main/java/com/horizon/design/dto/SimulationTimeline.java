package com.horizon.design.dto;

import com.horizon.weather.dto.RegionWeather;

import java.util.List;

/**
 * A full day-cycle timeline of heat simulation frames for the climate animation.
 *
 * <p>{@code globalMin}/{@code globalMax} are computed across every frame so the
 * heatmap color scale stays stable during playback (no per-frame flicker).</p>
 *
 * @param region    region baseline used for the simulation
 * @param gridSize  grid edge length
 * @param globalMin coolest surface temperature across all frames (deg C)
 * @param globalMax hottest surface temperature across all frames (deg C)
 * @param source    "observed" when built from real KMA hourly data, "modeled" when synthetic
 * @param date      ISO date (yyyy-MM-dd) the timeline represents
 * @param frames    ordered time-of-day frames
 */
public record SimulationTimeline(
        RegionWeather region,
        int gridSize,
        double globalMin,
        double globalMax,
        String source,
        String date,
        List<TimelineFrame> frames
) {
}
