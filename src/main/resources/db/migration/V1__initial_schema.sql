CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE concerts (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    total_capacity INT NOT NULL,
    available_seats INT NOT NULL,
    version BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_concerts_available_seats CHECK (available_seats >= 0)
);

CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    concert_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    idempotency_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_orders_concert FOREIGN KEY (concert_id) REFERENCES concerts(id)
);

CREATE TABLE tickets (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    concert_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    ticket_code VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tickets_order FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_tickets_concert FOREIGN KEY (concert_id) REFERENCES concerts(id),
    CONSTRAINT fk_tickets_user FOREIGN KEY (user_id) REFERENCES users(id)
);