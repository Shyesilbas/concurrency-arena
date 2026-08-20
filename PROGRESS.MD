# Concurrency Arena - Development Log & Roadmap

Bu dokuman, bilet rezervasyon sistemindeki yaris durumlarini (race condition) simule etmek, olcumlemek ve dagitik mimari cozumleriyle optimize etmek amaciyla yurutulen muhendislik adimlarini kayit altina alir.

---

## 1. Tamamlanan Adimlar

### 1.1. Altyapi & Ortam Kurulumu
- **Docker Compose:** PostgreSQL 16, Redis 7, Apache Kafka (KRaft modu) ve Kafka UI servisleri ayaga kaldirildi.
- **Konfigurasyon:** `application.yml` ortami degiskenleri, JPA (`ddl-auto: validate`), Flyway, Redis ve Kafka ayarlariyla yapilandirildi.
- **Build & Dependency Yönetimi:** Spring Boot 3.4.2, Java 21, Spring Retry, Spring AOP, Lombok ve Testcontainers bilesenleri standardize edildi.

### 1.2. Veritabani Semasi & Versiyonlama (Flyway)
- **Kural:** Sema yonetimi tamamen Flyway'e devredildi, entity siniflari yalin tutuldu.
- `V1__initial_schema.sql`: `users`, `concerts`, `orders`, `tickets` tablolari, foreign key iliskileri ve versiyonlama icin `version` kolonu tanimlandi.
- `V2__seed_data.sql`: Test ve benchmark senaryolari icin baslangic kullanicilari ve ornek konser kaydi eklendi.

### 1.3. JPA Entity & Repository & Mapping Katmani
- `User`, `Concert`, `Order`, `Ticket` entity siniflari hazirlandi.
- `ConcertRepository`, `OrderRepository`, `TicketRepository`, `UserRepository` katmanlari gelistirildi (`PESSIMISTIC_WRITE` kilit sorgusu dahil edildi).
- DTO'lar Java **Record** mimarisiyle (`BookingRequest`, `BookingResponse`) tanimlandi.
- El yazimi (hand-written) Spring bileseni `OrderMapper` gelistirildi.

### 1.4. Global Hata Yonetimi & Standart API Formati
- `ApiResponse<T>` ve `ErrorResponse` zarf (envelope) record'lari hazirlandi.
- Ozel is istisnalari (`ResourceNotFoundException`, `InsufficientCapacityException`, `ConcurrencyConflictException`) olusturuldu.
- `@RestControllerAdvice` ile merkezi `GlobalExceptionHandler` devreye alindi.

### 1.5. Baseline (Naive) Servis & Benchmark Raporu
- Kilit mekanizmasi icermeyen, yaris durumuna acik `NaiveBookingService` ve REST endpoint'i (`POST /api/v1/bookings/naive`) yazildi.
- `k6/naive_booking_test.js` spike yuk testi kosturuldu (100 VU burst).
- **Rapor:** `docs/benchmark/naive-reservation-test.md` olusturuldu (Lost Update ve 89 biletlik stok kaybi somut verilerle belgelendi).

### 1.6. Pessimistic Locking Servisi & Benchmark Raporu
- JPA `LockModeType.PESSIMISTIC_WRITE` (`SELECT ... FOR UPDATE`) kullanan `PessimisticBookingService` ve endpoint'i (`POST /api/v1/bookings/pessimistic`) yazildi.
- `k6/pessimistic_booking_test.js` spike yuk testi kosturuldu (100 VU burst).
- **Rapor:** `docs/benchmark/pessimistic-reservation-test.md` olusturuldu (%100 veri tutarliligi saglandi, ancak Throughput'un 59.16 RPS'ten 38.70 RPS'e dustugu ve P95 gecikmesinin 2.39s'ye ciktigi olculdu).

### 1.7. Optimistic Locking (@Version + Retry) Servisi & Benchmark Raporu
- JPA `@Version` kontrolu ve `spring-retry` (`@Retryable`, backoff jitter) tabanli `OptimisticBookingService` ve endpoint'i (`POST /api/v1/bookings/optimistic`) gelistirildi.
- `k6/optimistic_booking_test.js` spike yuk testi kosturuldu (100 VU burst).
- **Rapor:** `docs/benchmark/optimistic-reservation-test.md` olusturuldu (High Contention altinda retry maliyetinin gecikmeyi P95 2.51s'ye cikardigi ve Throughput'un 34.74 RPS'e geriledigi belgelendi).

---

## 2. Benchmark Karşılaştırma Özeti (İlk 3 Strateji)

| Metrik / Parametre | 01 - Naive (Korumasiz) | 02 - Pessimistic Lock | 03 - Optimistic Lock (+Retry) |
| :--- | :--- | :--- | :--- |
| Kalan Koltuk (`available_seats`) | 89 (Tutarsiz) | 0 (Kusursuz) | 0 (Kusursuz) |
| Lost Update / Stok Kaybi | 89 Adet Kayip | 0 Adet Kayip | 0 Adet Kayip |
| Nihai Versiyon (`version`) | 0 | 0 | 100 |
| Ortalama Yanit Suresi (Avg) | 1.18s | 1.63s | 1.68s |
| Medyan Yanit Suresi (Med) | 1.15s | 1.65s | 1.71s |
| P95 Latency | 1.53s | 2.39s | 2.51s |
| Throughput (RPS) | 59.16 req/s | 38.70 req/s | 34.74 req/s |

---

## 3. Yol Haritasi (Kalan Siradaki Asamalar)

- [ ] **Asama 4 (Redis Distributed Lock / Lua Scripting):** 
  - Redisson Distributed Lock ile kilitleme maliyetini incelemek.
  - Redis Atomic Lua Scripting (`DECRBY` / `EVAL`) ile veritabanina gitmeden ultra yuksek hizli (sub-millisecond) stok dusumu gerceklestirmek.
- [ ] **Asama 5 (Event-Driven / Kafka Asenkron Rezervasyon):**
  - Istekleri hemen kabul edip (`202 Accepted`) Kafka kuyruguna gonderen ve asenkron isleyen yapiyi kurmak.
- [ ] **Asama 6 (Genel Karsilastirma & Mimari Rapor):** Tum stratejileri iceren nihai performans tablosunu ve Trade-off analizini yayinlamak.