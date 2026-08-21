package com.serhat.concurrencyarena.repository;

import com.serhat.concurrencyarena.entity.Concert;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ConcertRepository extends JpaRepository<Concert, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Concert c WHERE c.id = :id")
    Optional<Concert> findByIdWithPessimisticLock(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Concert c SET c.availableSeats = c.availableSeats - :count WHERE c.id = :id")
    void decrementAvailableSeatsDirectly(@Param("id") Long id, @Param("count") int count);
}
