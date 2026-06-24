package com.horizon.weather.dto;

import java.util.List;

/**
 * Live KMA baseline readings attached to a region (education-grade extensions).
 *
 * @param pm10                 background PM10 µg/m³ (황사 관측)
 * @param pm10Source           {@code kma} or {@code fallback}
 * @param rainfallMm           hourly precipitation mm (ASOS, may be null if missing)
 * @param rainfallSource       {@code kma} or null
 * @param normalTempC          monthly mean air temp °C (평년값)
 * @param normalSource         {@code kma} or null
 * @param uvIndex              current UV index forecast h0 (생활기상)
 * @param uvSource             {@code kma} or null
 * @param airStagnationIndex   대기정체지수 0–100
 * @param airStagnationSource  {@code kma} or null
 * @param sensibleTempC        summer sensible temp °C (SenTa, may be null)
 * @param sensibleTempSource   {@code kma} or null
 * @param typhoons             recent-season typhoon list (live ingest)
 * @param earthquakeAlerts     recent earthquake / tsunami alerts
 */
public record ClimateContext(
        Double pm10,
        String pm10Source,
        Double rainfallMm,
        String rainfallSource,
        Double normalTempC,
        String normalSource,
        Integer uvIndex,
        String uvSource,
        Integer airStagnationIndex,
        String airStagnationSource,
        Double sensibleTempC,
        String sensibleTempSource,
        List<LiveTyphoon> typhoons,
        List<LiveEarthquakeAlert> earthquakeAlerts
) {
    public static ClimateContext empty() {
        return new ClimateContext(
                null, null, null, null, null, null,
                null, null, null, null, null, null,
                List.of(), List.of());
    }
}
