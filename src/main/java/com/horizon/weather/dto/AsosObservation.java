package com.horizon.weather.dto;

/**
 * One ASOS hourly row from the 기상청 API허브 ASOS 시간자료({@code kma_sfctm2}).
 *
 * @param hour          hour of day 0–23 (KST)
 * @param airTemp       air temperature {@code ta} (°C)
 * @param insolationMj  insolation {@code icsr} (MJ/m²)
 */
public record AsosObservation(int hour, double airTemp, double insolationMj) {
}
