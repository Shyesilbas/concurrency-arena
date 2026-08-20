package com.serhat.concurrencyarena.dto.response;

import java.time.OffsetDateTime;
import java.util.List;

public record ErrorResponse(
        int status,
        String errorCode,
        String message,
        List<String> details,
        OffsetDateTime timestamp
) {
    public static ErrorResponse of(int status, String errorCode, String message) {
        return new ErrorResponse(status, errorCode, message, List.of(), OffsetDateTime.now());
    }

    public static ErrorResponse of(int status, String errorCode, String message, List<String> details) {
        return new ErrorResponse(status, errorCode, message, details, OffsetDateTime.now());
    }
}