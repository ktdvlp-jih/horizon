package com.horizon.disaster.dto;

public record ScenarioSummary(
        String id,
        DisasterMode mode,
        String title,
        String description,
        String sourceEventId,
        String regionCode
) {
}
