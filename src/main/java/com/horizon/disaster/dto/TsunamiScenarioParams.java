package com.horizon.disaster.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TsunamiScenarioParams(
        double sourceMagnitude,
        double waveHeightM,
        double approachBearingDeg,
        int etaMinutes,
        double runupFactor
) {
}
