package com.horizon.disaster.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TyphoonScenarioParams(
        double maxWindMs,
        double windRadiusKm,
        double rainfallMm,
        List<TrackPoint> track
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TrackPoint(int hour, double latOffset, double lonOffset, double windMs) {
    }
}
