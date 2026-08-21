package com.serhat.concurrencyarena.controller;

import com.serhat.concurrencyarena.dto.ConcertDto;
import com.serhat.concurrencyarena.dto.response.ApiResponse;
import com.serhat.concurrencyarena.service.ConcertService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/concerts")
@RequiredArgsConstructor
public class ConcertController {

    private final ConcertService concertService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ConcertDto>>> getAllConcerts() {
        List<ConcertDto> concerts = concertService.getAllConcerts();
        return ResponseEntity.ok(ApiResponse.ok(concerts, "Concerts retrieved successfully."));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ConcertDto>> getConcertById(@PathVariable Long id) {
        ConcertDto concert = concertService.getConcertById(id);
        return ResponseEntity.ok(ApiResponse.ok(concert, "Concert retrieved successfully."));
    }

    @PostMapping("/{id}/reset")
    public ResponseEntity<ApiResponse<ConcertDto>> resetConcert(
            @PathVariable Long id,
            @RequestParam(defaultValue = "100") int capacity
    ) {
        ConcertDto concert = concertService.resetConcert(id, capacity);
        return ResponseEntity.ok(ApiResponse.ok(concert, "Concert state reset successfully."));
    }
}
