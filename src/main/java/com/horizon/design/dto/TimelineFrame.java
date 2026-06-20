package com.horizon.design.dto;

import java.util.List;

/**
 * One time-of-day snapshot of the urban heat simulation used by the animation player.
 *
 * @param hour           hour of day (0-23) this frame represents
 * @param label          display label (e.g. "14:00")
 * @param solarIntensity normalized solar intensity 0..1 for this hour
 * @param airTemp        diurnally adjusted baseline air temperature for this hour (deg C)
 * @param surfaceTemps   per-cell surface temperatures for this hour
 * @param avgSurfaceTemp average surface temperature this hour (deg C)
 * @param maxSurfaceTemp hottest cell this hour (deg C)
 * @param minSurfaceTemp coolest cell this hour (deg C)
 * @param deltaT         avg surface minus baseline air temperature
 */
public record TimelineFrame(
        int hour,
        String label,
        double solarIntensity,
        double airTemp,
        List<List<Double>> surfaceTemps,
        double avgSurfaceTemp,
        double maxSurfaceTemp,
        double minSurfaceTemp,
        double deltaT
) {
}
