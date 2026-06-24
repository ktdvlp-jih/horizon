package com.horizon.weather.dto;

/**
 * One ASOS hourly row from the 공공데이터포털 {@code getWthrDataList} API.
 *
 * @param hour          hour of day 0–23 (KST)
 * @param airTemp       air temperature {@code ta} (°C)
 * @param insolationMj  insolation {@code icsr} (MJ/m²)
 */
public record AsosObservation(int hour, double airTemp, double insolationMj) {
}
