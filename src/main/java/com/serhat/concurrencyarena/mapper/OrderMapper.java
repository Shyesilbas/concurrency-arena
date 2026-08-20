package com.serhat.concurrencyarena.mapper;

import com.serhat.concurrencyarena.dto.BookingResponse;
import com.serhat.concurrencyarena.entity.Order;
import com.serhat.concurrencyarena.entity.Ticket;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Component
public class OrderMapper {

    public BookingResponse toResponse(Order order, List<Ticket> tickets) {
        if (order == null) {
            return null;
        }

        List<String> ticketCodes = (tickets == null || tickets.isEmpty())
                ? Collections.emptyList()
                : tickets.stream()
                .map(Ticket::getTicketCode)
                .toList();

        return new BookingResponse(
                order.getId(),
                order.getConcert() != null ? order.getConcert().getId() : null,
                order.getConcert() != null ? order.getConcert().getName() : null,
                order.getUser() != null ? order.getUser().getId() : null,
                order.getQuantity(),
                order.getStatus(),
                ticketCodes,
                order.getCreatedAt()
        );
    }
}