package com.serhat.concurrencyarena.dto;

public record AsyncBookingResponse(
        String trackingId,
        String status,
        String message
) {}