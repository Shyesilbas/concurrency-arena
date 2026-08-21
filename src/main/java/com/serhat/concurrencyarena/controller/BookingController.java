package com.serhat.concurrencyarena.controller;

import com.serhat.concurrencyarena.dto.AsyncBookingResponse;
import com.serhat.concurrencyarena.dto.BookingRequest;
import com.serhat.concurrencyarena.dto.BookingResponse;
import com.serhat.concurrencyarena.dto.response.ApiResponse;
import com.serhat.concurrencyarena.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final NaiveBookingService naiveBookingService;
    private final PessimisticBookingService pessimisticBookingService;
    private final OptimisticBookingService optimisticBookingService;
    private final RedisBookingService redisBookingService;
    private final KafkaProducerService kafkaProducerService;

    @PostMapping("/naive")
    public ResponseEntity<ApiResponse<BookingResponse>> bookNaive(@RequestBody BookingRequest request) {
        BookingResponse response = naiveBookingService.bookTicket(request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Naive Ticket booked successfully."));
    }

    @PostMapping("/pessimistic")
    public ResponseEntity<ApiResponse<BookingResponse>> bookPessimistic(@RequestBody BookingRequest request) {
        BookingResponse response = pessimisticBookingService.bookTicket(request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Pessimistic Ticket booked successfully."));
    }

    @PostMapping("/optimistic")
    public ResponseEntity<ApiResponse<BookingResponse>> bookOptimistic(@RequestBody BookingRequest request) {
        BookingResponse response = optimisticBookingService.bookTicket(request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Optimistic Ticket booked successfully."));
    }

    @PostMapping("/redis")
    public ResponseEntity<ApiResponse<BookingResponse>> bookRedis(@RequestBody BookingRequest request) {
        BookingResponse response = redisBookingService.bookTicket(request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Redis Ticket booked successfully."));
    }

    @PostMapping("/kafka")
    public ResponseEntity<ApiResponse<AsyncBookingResponse>> bookKafka(@RequestBody BookingRequest request) {
        AsyncBookingResponse response = kafkaProducerService.queueBooking(request);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.ok(response, "Request queued successfully. Tracking ID: " + response.trackingId() + "."));
    }

}