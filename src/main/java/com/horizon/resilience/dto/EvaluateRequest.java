package com.horizon.resilience.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * Multi-lens evaluation request for the unified Urban Climate Designer.
 *
 * <p>A single city grid is evaluated across every available axis at once.
 * Optional fields enable axes that require extra context (disaster scenario,
 * agriculture coarse zones).</p>
 *
 * @param regionCode  target region code
 * @param grid        shared tile grid (same model as the heat-island designer)
 * @param scenarioId  optional disaster scenario id; enables the disaster lens
 * @param date        optional ISO date used by weather-driven axes
 * @param zones       optional agriculture coarse-zone allocation (P4)
 */
public record EvaluateRequest(
        @NotBlank(message = "지역 코드는 필수입니다.")
        String regionCode,

        @NotEmpty(message = "그리드는 비어 있을 수 없습니다.")
        List<List<String>> grid,

        String scenarioId,

        String date,

        AgricultureZones zones
) {
}
