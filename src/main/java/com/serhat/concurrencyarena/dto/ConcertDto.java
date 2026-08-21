package com.serhat.concurrencyarena.dto;

public record ConcertDto(
        Long id,
        String name,
        String artist,
        Integer totalCapacity,
        Integer availableSeats,
        Integer redisStock,
        Long totalOrders,
        Long totalTickets,
        Long version
) {}
