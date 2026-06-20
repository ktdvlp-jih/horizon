package com.horizon.auth.dto;

import java.time.LocalDateTime;

public record MeResponse(
        Long userId,
        String loginId,
        String userName,
        String email,
        String role,
        LocalDateTime lastLoginAt
) {
}
