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

### 1.8. Redis Lua Scripting Servisi & Benchmark Raporu
- Redis uzerinde atomik stok kontrolu ve dusumu yapan Lua scripti tabanli `RedisLuaBookingService` ve endpoint'i (`POST /api/v1/bookings/redis-lua`) yazildi.
- `k6/redis_booking_test.js` spike yuk testi kosturuldu (100 VU burst).
- **Rapor:** `docs/benchmark/redis-lua-reservation-test.md` olusturuldu (Throughput'un 42.34 RPS'e ciktigi, P95 gecikmesinin 2.17s'ye geriledigi ve sifir kilit beklemesi ile tam tutarlilik saglandigi belgelendi).

### 1.9. Kafka Event-Driven Asynchronous Booking Servisi & Benchmark Raporu
- Redis Lua ile atomik stok dusumu sonrasi olaylari Apache Kafka (`booking-events`) kuyruguna firlatan ve `202 Accepted` donen `KafkaBookingService` ile arka planda calisan `KafkaBookingConsumer` gelistirildi.
- `k6/kafka_booking_test.js` spike yuk testi kosturuldu (100 VU burst).
- **Rapor:** `docs/benchmark/kafka-reservation-test.md` olusturuldu (Throughput rekoru: **139.85 RPS**, Ortalama yanit suresi: **559.54 ms**, P95: **572.86 ms** ve toplam test suresi: **0.7s** ile tum zamanlarin en yuksek performansi elde edildi).

---

## 2. Benchmark Karşılaştırma Özeti (5 Stratejinin Büyük Tablosu)

| Metrik / Parametre | 01 - Naive | 02 - Pessimistic | 03 - Optimistic | 04 - Redis Lua | 05 - Kafka (Async Event-Driven) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **HTTP Durum Kodu** | 200 OK | 200 OK | 200 OK | 200 OK | **202 Accepted** |
| **Kalan Koltuk (`available_seats`)** | 89 (Tutarsiz) | 0 (Kusursuz) | 0 (Kusursuz) | 0 (Kusursuz) | **0 (Kusursuz)** |
| **Lost Update / Stok Kaybi** | 89 Adet Kayip | 0 Adet Kayip | 0 Adet Kayip | 0 Adet Kayip | **0 Adet Kayip** |
| **Ortalama Yanit Suresi (Avg)** | 1.18s | 1.63s | 1.68s | 1.45s | **559.54 ms** |
| **Medyan Yanit Suresi (Med)** | 1.15s | 1.65s | 1.71s | 1.46s | **561.64 ms** |
| **P90 Latency** | 1.50s | 2.30s | 2.40s | 2.10s | **571.70 ms** |
| **P95 Latency** | 1.53s | 2.39s | 2.51s | 2.17s | **572.86 ms** |
| **Maksimum Latency** | 1.56s | 2.45s | 2.72s | 2.24s | **587.99 ms** |
| **Throughput (RPS)** | 59.16 req/s | 38.70 req/s | 34.74 req/s | 42.34 req/s | **139.85 req/s** |
| **Toplam Test Suresi** | 1.7s | 2.6s | 2.9s | 2.4s | **0.7s (700 ms)** |

---

## 3. Yol Haritasi (Tamamlanma Durumu)

- [x] **Asama 1 (Naive Booking):** Korumasiz CRUD servisi ve Lost Update / Overselling tespiti.
- [x] **Asama 2 (Pessimistic Locking):** `SELECT ... FOR UPDATE` ile satir duzeyinde kilitleme ve gecikme analizi.
- [x] **Asama 3 (Optimistic Locking):** `@Version` + Spring Retry mekanizmasi ile lock-free cakisma yonetimi.
- [x] **Asama 4 (Redis Lua Scripting):** Atomik In-Memory stok dusumu ile DB kilitlerini ve retry darbogazlarini ortadan kaldirma.
- [x] **Asama 5 (Kafka Event-Driven Asynchronous Booking):** Non-blocking kuyruk mimarisi ile ultra yuksek throughput (139.85 RPS) ve dusuk gecikme (559 ms).
- [ ] **Asama 6 (Genel Karsilastirma & Mimari Rapor):** Tum stratejileri kapsayan buyuk mimari trade-off dokumanini ve README ozetini yayinlamak.