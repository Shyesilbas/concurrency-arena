package com.serhat.concurrencyarena.service;

import com.serhat.concurrencyarena.dto.ConcertDto;
import com.serhat.concurrencyarena.entity.Concert;
import com.serhat.concurrencyarena.exception.ResourceNotFoundException;
import com.serhat.concurrencyarena.repository.ConcertRepository;
import com.serhat.concurrencyarena.repository.OrderRepository;
import com.serhat.concurrencyarena.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConcertService {

    private final ConcertRepository concertRepository;
    private final OrderRepository orderRepository;
    private final TicketRepository ticketRepository;
    private final StringRedisTemplate stringRedisTemplate;

    private static final String STOCK_KEY_PREFIX = "concert:stock:";

    @Transactional(readOnly = true)
    public List<ConcertDto> getAllConcerts() {
        return concertRepository.findAll().stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public ConcertDto getConcertById(Long id) {
        Concert concert = concertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Concert not found with id: " + id));
        return mapToDto(concert);
    }

    @Transactional
    public ConcertDto resetConcert(Long id, int resetCapacity) {
        Concert concert = concertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Concert not found with id: " + id));

        // 1. Delete all existing tickets and orders for clean slate
        ticketRepository.deleteAll();
        orderRepository.deleteAll();

        // 2. Reset concert availableSeats and version
        concert.setAvailableSeats(resetCapacity);
        concert.setTotalCapacity(resetCapacity);
        concert.setVersion(0L);
        Concert saved = concertRepository.save(concert);

        // 3. Reset Redis in-memory stock
        stringRedisTemplate.opsForValue().set(STOCK_KEY_PREFIX + id, String.valueOf(resetCapacity));

        log.info("Concert {} reset successfully to capacity: {}", id, resetCapacity);
        return mapToDto(saved);
    }

    private ConcertDto mapToDto(Concert concert) {
        String redisStockStr = stringRedisTemplate.opsForValue().get(STOCK_KEY_PREFIX + concert.getId());
        Integer redisStock = redisStockStr != null ? Integer.parseInt(redisStockStr) : null;
        long totalOrders = orderRepository.count();
        long totalTickets = ticketRepository.count();

        return new ConcertDto(
                concert.getId(),
                concert.getName(),
                concert.getArtist(),
                concert.getTotalCapacity(),
                concert.getAvailableSeats(),
                redisStock,
                totalOrders,
                totalTickets,
                concert.getVersion()
        );
    }
}
