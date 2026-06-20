package com.horizon.design.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record SimulateRequest(
        @NotBlank(message = "지역 코드는 필수입니다.")
        String regionCode,

        @NotEmpty(message = "그리드는 비어 있을 수 없습니다.")
        List<List<String>> grid,

        /** Optional ISO date (yyyy-MM-dd) for the day-cycle timeline; defaults to yesterday. */
        String date
) {
}
