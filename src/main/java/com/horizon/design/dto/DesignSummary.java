package com.horizon.design.dto;

import java.time.LocalDateTime;

public record DesignSummary(
        Long id,
        String name,
        String regionCode,
        int gridSize,
        double avgSurfaceTemp,
        double deltaT,
        double greenRatio,
        LocalDateTime createdAt
) {
}
