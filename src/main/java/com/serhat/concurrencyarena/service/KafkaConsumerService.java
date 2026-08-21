package com.serhat.concurrencyarena.service;

import com.serhat.concurrencyarena.config.KafkaConfig;
import com.serhat.concurrencyarena.entity.Concert;
import com.serhat.concurrencyarena.entity.Order;
import com.serhat.concurrencyarena.entity.OrderStatus;
import com.serhat.concurrencyarena.entity.Ticket;
import com.serhat.concurrencyarena.entity.User;
import com.serhat.concurrencyarena.event.BookingEvent;
import com.serhat.concurrencyarena.exception.ResourceNotFoundException;
import com.serhat.concurrencyarena.repository.ConcertRepository;
import com.serhat.concurrencyarena.repository.OrderRepository;
import com.serhat.concurrencyarena.repository.TicketRepository;
import com.serhat.concurrencyarena.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class KafkaConsumerService {

    private final ConcertRepository concertRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final TicketRepository ticketRepository;

    @Transactional
    @KafkaListener(topics = KafkaConfig.BOOKING_TOPIC, groupId = "booking-consumer-group")
    public void consumeBookingEvent(BookingEvent event) {
        log.info("Kafka reservation request is being processed. Tracking ID: {}, Concert: {}", event.trackingId(), event.concertId());

        // 1. DB'de versiyon cakismasina girmeden atomik UPDATE
        concertRepository.decrementAvailableSeatsDirectly(event.concertId(), event.seatCount());

        Concert concertRef = concertRepository.getReferenceById(event.concertId());
        User user = userRepository.findById(event.userId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + event.userId()));

        // 2. Siparis ve Bilet kayitlarini olustur
        Order order = Order.builder()
                .concert(concertRef)
                .user(user)
                .quantity(event.seatCount())
                .status(OrderStatus.COMPLETED)
                .idempotencyKey(event.idempotencyKey())
                .build();
        Order savedOrder = orderRepository.save(order);

        for (int i = 0; i < event.seatCount(); i++) {
            Ticket ticket = Ticket.builder()
                    .concert(concertRef)
                    .user(user)
                    .order(savedOrder)
                    .ticketCode(UUID.randomUUID().toString())
                    .build();
            ticketRepository.save(ticket);
        }

        log.info("Booked successfully by Kafka. Order ID: {}", savedOrder.getId());
    }
}