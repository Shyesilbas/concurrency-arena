package com.serhat.concurrencyarena.dto;

public record UserDto(
        Long id,
        String username,
        String email
) {}
