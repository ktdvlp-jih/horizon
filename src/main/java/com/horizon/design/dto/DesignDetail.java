package com.horizon.design.dto;

import java.time.LocalDateTime;
import java.util.List;

/** Full saved design including grid for load/edit in the designer. */
public record DesignDetail(
        Long id,
        String name,
        String regionCode,
        int gridSize,
        List<List<String>> grid,
        double avgSurfaceTemp,
        double deltaT,
        double greenRatio,
        String experienceId,
        String scenarioId,
        String metricsJson,
        LocalDateTime createdAt
) {
}
