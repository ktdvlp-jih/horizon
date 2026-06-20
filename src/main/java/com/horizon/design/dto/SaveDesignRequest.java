package com.horizon.design.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SaveDesignRequest(
        @NotBlank(message = "설계 이름은 필수입니다.")
        @Size(max = 60, message = "설계 이름은 60자 이하여야 합니다.")
        String name,

        @NotBlank(message = "지역 코드는 필수입니다.")
        String regionCode,

        @NotEmpty(message = "그리드는 비어 있을 수 없습니다.")
        List<List<String>> grid
) {
}
