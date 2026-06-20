package com.horizon.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank(message = "아이디는 필수입니다.")
        @Size(min = 4, max = 50, message = "아이디는 4~50자여야 합니다.")
        String loginId,

        @NotBlank(message = "비밀번호는 필수입니다.")
        @Size(min = 4, max = 100, message = "비밀번호는 4~100자여야 합니다.")
        String password,

        @NotBlank(message = "이름은 필수입니다.")
        @Size(max = 100, message = "이름은 100자 이하여야 합니다.")
        String userName,

        @Size(max = 100, message = "이메일은 100자 이하여야 합니다.")
        String email
) {
}
