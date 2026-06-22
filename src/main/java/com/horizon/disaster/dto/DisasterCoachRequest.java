package com.horizon.disaster.dto;

import com.horizon.ai.dto.CoachSettingsDto;
import com.horizon.disaster.dto.DisasterMetrics;

public record DisasterCoachRequest(
        String mode,
        String regionName,
        String scenarioTitle,
        DisasterMetrics metrics,
        CoachSettingsDto coachSettings
) {
}
