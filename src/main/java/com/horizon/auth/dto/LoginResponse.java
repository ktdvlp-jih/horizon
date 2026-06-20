package com.horizon.auth.dto;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        Long userId,
        String userName,
        String role
) {
}
