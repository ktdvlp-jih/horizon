package com.horizon.disaster.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record EarthquakeScenarioParams(
        double magnitude,
        double depthKm,
        double epicenterLatOffset,
        double epicenterLonOffset,
        String soilType
) {
}
