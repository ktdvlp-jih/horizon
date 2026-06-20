package com.horizon.common.response;

import java.time.LocalDateTime;

public record ApiResponse<T>(
        boolean success,
        T data,
        ErrorPayload error,
        LocalDateTime timestamp
) {
    public record ErrorPayload(String code, String message) {
    }

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null, LocalDateTime.now());
    }

    public static <T> ApiResponse<T> error(String code, String message) {
        return new ApiResponse<>(false, null, new ErrorPayload(code, message), LocalDateTime.now());
    }
}
