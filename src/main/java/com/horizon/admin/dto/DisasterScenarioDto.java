package com.horizon.admin.dto;

import com.horizon.disaster.dto.DisasterMode;

public record DisasterScenarioDto(
        String id,
        DisasterMode mode,
        String title,
        String description,
        String sourceEventId,
        String paramsJson,
        String regionCode,
        boolean enabled,
        int sortOrder
) {
}
