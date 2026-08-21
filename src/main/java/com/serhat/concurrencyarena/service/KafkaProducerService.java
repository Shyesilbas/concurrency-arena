package com.serhat.concurrencyarena.service;

import com.serhat.concurrencyarena.config.KafkaConfig;
import com.serhat.concurrencyarena.dto.AsyncBookingResponse;
import com.serhat.concurrencyarena.dto.BookingRequest;
import com.serhat.concurrencyarena.event.BookingEvent;
import com.serhat.concurrencyarena.exception.InsufficientCapacityException;
import com.serhat.concurrencyarena.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class KafkaProducerService {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final StringRedisTemplate stringRedisTemplate;
    private final RedisScript<Long> stockDeductionScript;

    private static final String STOCK_KEY_PREFIX = "concert:stock:";

    public AsyncBookingResponse queueBooking(BookingRequest request) {
        String stockKey = STOCK_KEY_PREFIX + request.concertId();

        // 1. Redis uzerinde atomik stok kontrolu ve dusumu
        Long result = stringRedisTemplate.execute(
                stockDeductionScript,
                Collections.singletonList(stockKey),
                String.valueOf(request.seatCount())
        );

        if (result == null || result == -1) {
            throw new ResourceNotFoundException("Concert stock not found: " + request.concertId());
        }

        if (result == 0) {
            log.warn("Redis stock insufficient for Kafka producer! Concert ID: {}", request.concertId());
            throw new InsufficientCapacityException("Insufficient seat capacity!");
        }

        String trackingId = UUID.randomUUID().toString();

        BookingEvent event = new BookingEvent(
                request.concertId(),
                request.userId(),
                request.seatCount(),
                request.idempotencyKey(),
                trackingId
        );

        // 2. Mesajı Kafka'ya fırlat (Non-blocking)
        kafkaTemplate.send(KafkaConfig.BOOKING_TOPIC, String.valueOf(request.concertId()), event);
        log.info("Reservation request queued. Tracking ID: {}", trackingId);

        return new AsyncBookingResponse(trackingId, "PENDING", "Reservation request queued.");
    }
}