package com.serhat.concurrencyarena.event;

import java.io.Serializable;

public record BookingEvent(
        Long concertId,
        Long userId,
        int seatCount,
        String idempotencyKey,
        String trackingId
) implements Serializable {}