package com.horizon.disaster.dto;

public record DisasterSummary(
        Long id,
        String name,
        DisasterMode mode,
        String regionCode,
        String scenarioId,
        double avgRisk,
        double maxRisk,
        String createdAt
) {
}
