package com.horizon.design.dto;

import java.time.LocalDateTime;
import java.util.List;

/** My-designs list entry including grid for thumbnail preview. */
public record DesignListItem(
        Long id,
        String name,
        String regionCode,
        int gridSize,
        double avgSurfaceTemp,
        double deltaT,
        double greenRatio,
        List<List<String>> grid,
        LocalDateTime createdAt
) {
}
