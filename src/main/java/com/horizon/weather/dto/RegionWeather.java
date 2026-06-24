package com.horizon.weather.dto;

/**
 * Baseline weather for a region used as the simulation input.
 *
 * @param code        region code (e.g. "seoul")
 * @param name        display name (e.g. "서울")
 * @param baseAirTemp baseline air temperature (deg C)
 * @param solarLoad   normalized solar load 0..1 (derived from solar radiation)
 * @param source      "kma" when fetched live, "sample" when using built-in fallback
 * @param climate     live KMA extensions (PM10, 강수, 평년, 생활기상, 재난 피드)
 */
public record RegionWeather(
        String code,
        String name,
        double baseAirTemp,
        double solarLoad,
        String source,
        ClimateContext climate
) {
    public RegionWeather(String code, String name, double baseAirTemp, double solarLoad, String source) {
        this(code, name, baseAirTemp, solarLoad, source, ClimateContext.empty());
    }
}
