package com.horizon.weather.dto;

/**
 * One hour of observed weather used to drive the real day-cycle animation.
 *
 * @param hour          hour of day (0-23, KST)
 * @param airTemp       observed air temperature (deg C, ASOS TA)
 * @param insolationMj  observed hourly insolation (MJ/m^2, solar package SI_HR)
 * @param solarLoad     normalized solar load 0..~1.3 derived from insolation
 */
public record HourlyObservation(
        int hour,
        double airTemp,
        double insolationMj,
        double solarLoad
) {
}
