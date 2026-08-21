package com.serhat.concurrencyarena.service;

import com.serhat.concurrencyarena.dto.BookingRequest;
import com.serhat.concurrencyarena.dto.BookingResponse;
import com.serhat.concurrencyarena.entity.Concert;
import com.serhat.concurrencyarena.entity.Order;
import com.serhat.concurrencyarena.entity.OrderStatus;
import com.serhat.concurrencyarena.entity.Ticket;
import com.serhat.concurrencyarena.entity.User;
import com.serhat.concurrencyarena.mapper.OrderMapper;
import com.serhat.concurrencyarena.repository.ConcertRepository;
import com.serhat.concurrencyarena.repository.OrderRepository;
import com.serhat.concurrencyarena.repository.TicketRepository;
import com.serhat.concurrencyarena.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NaiveBookingService {

    private final ConcertRepository concertRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final TicketRepository ticketRepository;
    private final OrderMapper orderMapper;

    @Transactional
    public BookingResponse bookTicket(BookingRequest request) {
        log.info("Naive reservation request. Concert ID: {}, User ID: {}, Seat Count: {}",
                request.concertId(), request.userId(), request.seatCount());

        Concert concert = concertRepository.findById(request.concertId())
                .orElseThrow(() -> new ResourceNotFoundException("Concert not found: " + request.concertId()));

        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.userId()));

        // Concurrency-unsafe kontrol: Kilit olmadığı için eşzamanlı istekler aynı availableSeats değerini görür
        if (concert.getAvailableSeats() < request.seatCount()) {
            log.warn("Insufficient seats! Available: {}, Requested: {}", concert.getAvailableSeats(), request.seatCount());
            throw new InsufficientCapacityException("Insufficient seat availability!");
        }

        // Yarış durumunu (Race Condition) netleştirmek için yapay simülasyon gecikmesi
        try {
            Thread.sleep(10);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Operation interrupted", e);
        }

        concert.setAvailableSeats(concert.getAvailableSeats() - request.seatCount());
        concertRepository.save(concert);

        Order order = Order.builder()
                .concert(concert)
                .user(user)
                .quantity(request.seatCount())
                .status(OrderStatus.COMPLETED)
                .idempotencyKey(request.idempotencyKey())
                .build();
        Order savedOrder = orderRepository.save(order);

        List<Ticket> tickets = new ArrayList<>();
        for (int i = 0; i < request.seatCount(); i++) {
            Ticket ticket = Ticket.builder()
                    .concert(concert)
                    .user(user)
                    .order(savedOrder)
                    .ticketCode(UUID.randomUUID().toString())
                    .build();
            tickets.add(ticketRepository.save(ticket));
        }

        log.info("Reservation completed. Order ID: {}", savedOrder.getId());
        return orderMapper.toResponse(savedOrder, tickets);
    }
}