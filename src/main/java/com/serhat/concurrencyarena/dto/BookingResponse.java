package com.serhat.concurrencyarena.dto;

import com.serhat.concurrencyarena.entity.OrderStatus;
import java.time.OffsetDateTime;
import java.util.List;

public record BookingResponse(
        Long orderId,
        Long concertId,
        String concertName,
        Long userId,
        Integer quantity,
        OrderStatus status,
        List<String> ticketCodes,
        OffsetDateTime createdAt
) {}