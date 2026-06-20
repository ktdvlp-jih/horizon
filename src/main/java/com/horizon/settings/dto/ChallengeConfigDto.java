package com.horizon.settings.dto;

public record ChallengeConfigDto(
        String id,
        String experienceId,
        String title,
        String description,
        String ruleType,
        Double threshold,
        String ruleParamsJson,
        boolean enabled,
        int sortOrder
) {
}
