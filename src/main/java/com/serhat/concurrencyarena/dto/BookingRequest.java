package com.serhat.concurrencyarena.dto;

import java.io.Serializable;

public record BookingRequest(
        Long concertId,
        Long userId,
        Integer seatCount,
        String idempotencyKey
) implements Serializable {}