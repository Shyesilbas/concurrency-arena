package com.serhat.concurrencyarena.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {

    public static final String BOOKING_TOPIC = "concert-booking-topic";

    @Bean
    public NewTopic bookingTopic() {
        return TopicBuilder.name(BOOKING_TOPIC)
                .partitions(1) // Sıralı ve tutarlı stok düşümü için tek partition
                .replicas(1)
                .build();
    }
}