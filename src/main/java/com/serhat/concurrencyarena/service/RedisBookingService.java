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
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RedisBookingService {

    private final StringRedisTemplate stringRedisTemplate;
    private final RedisScript<Long> stockDeductionScript;
    private final ConcertRepository concertRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final TicketRepository ticketRepository;
    private final OrderMapper orderMapper;

    private static final String STOCK_KEY_PREFIX = "concert:stock:";

    @PostConstruct
    public void initRedisStock() {
        stringRedisTemplate.opsForValue().set(STOCK_KEY_PREFIX + 1, "100");
        log.info("Concert 1 initial stock initialized in Redis: 100");
    }

    @Transactional
    public BookingResponse bookTicket(BookingRequest request) {
        log.info("Redis Lua reservation request. Concert ID: {}, Seats: {}", request.concertId(), request.seatCount());

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
            log.warn("Redis stock insufficient! Concert ID: {}", request.concertId());
            throw new InsufficientCapacityException("Insufficient seat capacity!");
        }

        // 2. DB'de versiyon cakismasina girmeden dogrudan atomik UPDATE
        concertRepository.decrementAvailableSeatsDirectly(request.concertId(), request.seatCount());

        Concert concertRef = concertRepository.getReferenceById(request.concertId());
        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.userId()));

        // 3. Siparis ve Bilet kayitlarini olustur
        Order order = Order.builder()
                .concert(concertRef)
                .user(user)
                .quantity(request.seatCount())
                .status(OrderStatus.COMPLETED)
                .idempotencyKey(request.idempotencyKey())
                .build();
        Order savedOrder = orderRepository.save(order);

        List<Ticket> tickets = new ArrayList<>();
        for (int i = 0; i < request.seatCount(); i++) {
            Ticket ticket = Ticket.builder()
                    .concert(concertRef)
                    .user(user)
                    .order(savedOrder)
                    .ticketCode(UUID.randomUUID().toString())
                    .build();
            tickets.add(ticketRepository.save(ticket));
        }

        log.info("Redis reservation completed. Order ID: {}", savedOrder.getId());
        return orderMapper.toResponse(savedOrder, tickets);
    }
}