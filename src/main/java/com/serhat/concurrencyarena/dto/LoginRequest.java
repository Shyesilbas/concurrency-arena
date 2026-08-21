package com.serhat.concurrencyarena.dto;

public record LoginRequest(
        String email,
        String username
) {}
