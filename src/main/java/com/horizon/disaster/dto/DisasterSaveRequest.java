package com.horizon.disaster.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record DisasterSaveRequest(
        @NotNull DisasterMode mode,
        @NotBlank String name,
        @NotBlank String regionCode,
        @NotBlank String scenarioId,
        @NotNull List<List<String>> grid
) {
}
