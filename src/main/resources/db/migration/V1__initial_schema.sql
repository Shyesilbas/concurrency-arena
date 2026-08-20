CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

Create table concerts(
id BIGSERIAL primary key,
name varchar(255) not null,
artist varchar(255) not null,
total_capacity int not null,
available_seat int not null,
version BIGINT default 0,
created at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
updated at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders(
id BIGSERIAL primary key,
user_id BIGINT NOT NULL,
concert_id BIGINT not null,
user_id varchar(100) not null,
quantity int not null,
status varchar(50) not null,
idempotency_key varchar(255) unique,
created_at timestamp with time zone default current_timestamp,
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
    CONSTRAINT fk_tickets_order FOREIGN KEY (order_id) REFERENCES orders (id),
    CONSTRAINT fk_tickets_concert FOREIGN KEY (concert_id) REFERENCES concerts (id),
    CONSTRAINT fk_tickets_user FOREIGN KEY (user_id) REFERENCES users (id)
);

