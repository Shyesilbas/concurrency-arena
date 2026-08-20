package com.serhat.concurrencyarena.dto.response;

import java.time.OffsetDateTime;

public record ApiResponse<T>(
        boolean success,
        String message,
        T data,
        OffsetDateTime timestamp
) {
    public static <T> ApiResponse<T> ok(T data, String message) {
        return new ApiResponse<>(true, message, data, OffsetDateTime.now());
    }

    public static <T> ApiResponse<T> ok(T data) {
        return ok(data, "Operation Successful.");
    }
}