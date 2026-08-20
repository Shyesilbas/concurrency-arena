package com.serhat.concurrencyarena.controller;

import com.serhat.concurrencyarena.dto.BookingRequest;
import com.serhat.concurrencyarena.dto.BookingResponse;
import com.serhat.concurrencyarena.dto.response.ApiResponse;
import com.serhat.concurrencyarena.service.NaiveBookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final NaiveBookingService naiveBookingService;

    @PostMapping("/naive")
    public ResponseEntity<ApiResponse<BookingResponse>> bookNaive(@RequestBody BookingRequest request) {
        BookingResponse response = naiveBookingService.bookTicket(request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Ticket booked successfully."));
    }
}