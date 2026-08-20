package com.serhat.concurrencyarena.service;

import com.serhat.concurrencyarena.dto.BookingRequest;
import com.serhat.concurrencyarena.dto.BookingResponse;
import com.serhat.concurrencyarena.entity.Concert;
import com.serhat.concurrencyarena.entity.Order;
import com.serhat.concurrencyarena.entity.OrderStatus;
import com.serhat.concurrencyarena.entity.Ticket;
import com.serhat.concurrencyarena.entity.User;
import com.serhat.concurrencyarena.exception.InsufficientCapacityException;
import com.serhat.concurrencyarena.exception.ResourceNotFoundException;
import com.serhat.concurrencyarena.mapper.OrderMapper;
import com.serhat.concurrencyarena.repository.ConcertRepository;
import com.serhat.concurrencyarena.repository.OrderRepository;
import com.serhat.concurrencyarena.repository.TicketRepository;
import com.serhat.concurrencyarena.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OptimisticBookingService {

    private final ConcertRepository concertRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final TicketRepository ticketRepository;
    private final OrderMapper orderMapper;

    // Versiyon uyuşmazlığında max 50 kez, rastgele aralıklarla (jitter) tekrar dene
    @Retryable(
            retryFor = {ObjectOptimisticLockingFailureException.class},
            maxAttempts = 50,
            backoff = @Backoff(delay = 20, maxDelay = 100, random = true)
    )
    @Transactional
    public BookingResponse bookTicket(BookingRequest request) {
        log.info("Optimistic reservation request taken. Concert ID: {}, Seats: {}", request.concertId(), request.seatCount());

        // Kilit yok, standart okuma (SELECT)
        Concert concert = concertRepository.findById(request.concertId())
                .orElseThrow(() -> new ResourceNotFoundException("Concert not found: " + request.concertId()));

        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.userId()));

        if (concert.getAvailableSeats() < request.seatCount()) {
            log.warn("Insufficient seats! Available: {}, Requested: {}", concert.getAvailableSeats(), request.seatCount());
            throw new InsufficientCapacityException("Insufficient seat capacity!");
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

        log.info("Optimistic reservation completed successfully. Order ID: {}", savedOrder.getId());
        return orderMapper.toResponse(savedOrder, tickets);
    }
}