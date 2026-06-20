package com.horizon.admin.dto;

import java.time.LocalDateTime;

public record AdminDesignSummary(
        Long id,
        String name,
        String regionCode,
        double avgSurfaceTemp,
        double deltaT,
        double greenRatio,
        Long ownerId,
        String ownerLoginId,
        boolean visibleOnLeaderboard,
        LocalDateTime deletedAt,
        LocalDateTime createdAt
) {
}
