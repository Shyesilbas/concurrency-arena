package com.serhat.concurrencyarena;

import org.springframework.boot.SpringApplication;

public class TestConcurrencyArenaApplication {

    public static void main(String[] args) {
        SpringApplication.from(ConcurrencyArenaApplication::main).with(TestcontainersConfiguration.class).run(args);
    }

}
