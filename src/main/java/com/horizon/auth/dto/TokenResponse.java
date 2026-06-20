package com.horizon.auth.dto;

public record TokenResponse(
        String accessToken,
        String refreshToken
) {
}
