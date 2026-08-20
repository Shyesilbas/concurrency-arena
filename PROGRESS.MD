# 🏟️ Concurrency Arena - Development Log & Roadmap

Bu döküman, bilet rezervasyon sistemindeki yarış durumlarını (race condition) simüle etmek, ölçümlemek ve dağıtık mimari çözümleriyle optimize etmek amacıyla yürütülen mühendislik adımlarını kayıt altına alır.

---

## 📌 1. Tamamlanan Adımlar

### 🧱 1.1. Altyapı & Ortam Kurulumu
- **Docker Compose:** PostgreSQL 16, Redis 7, Apache Kafka (KRaft modu) ve Kafka UI servisleri ayağa kaldırıldı.
- **Konfigürasyon:** `application.yml` dosyası ortam değişkenleri, JPA (`ddl-auto: validate`), Flyway ve Kafka ayarlarıyla yapılandırıldı.

### 🗄️ 1.2. Veritabanı Şeması & Versiyonlama (Flyway)
- **Kural:** Şema yönetimi tamamen Flyway'e devredildi, entity sınıfları yalın tutuldu.
- `V1__initial_schema.sql`: `users`, `concerts`, `orders`, `tickets` tabloları, foreign key ve optimistik kilit için `version` kolonu tanımlandı.
- `V2__seed_data.sql`: Test ve benchmark senaryoları için başlangıç kullanıcıları ve örnek konser kaydı eklendi.

### ☕ 1.3. JPA Entity & Mapping Katmanı
- `User`, `Concert`, `Order`, `Ticket` entity sınıfları yazıldı.
- DTO'lar Java **Record** mimarisiyle (`BookingRequest`, `BookingResponse`) tanımlandı.
- Harici kütüphane bağımlılığı yerine tam kontrol sağlayan el yazımı (hand-written) Spring bileşeni `OrderMapper` geliştirildi.

### 🛡️ 1.4. Global Hata Yönetimi & Standart API Formatı
- `ApiResponse<T>` ve `ErrorResponse` zarf (envelope) record'ları hazırlandı.
- Özel iş istisnaları (`ResourceNotFoundException`, `InsufficientCapacityException`, `ConcurrencyConflictException`) oluşturuldu.
- `@RestControllerAdvice` ile merkezi `GlobalExceptionHandler` devreye alındı.

### 🧨 1.5. Baseline (Naive) Servis
- Kilit mekanizması içermeyen, yarış durumuna açık `NaiveBookingService` ve REST endpoint'i (`POST /api/v1/bookings/naive`) yazıldı.

---

## 🎯 2. Yol Haritası (Sıradaki Aşamalar)

- [ ] **Aşama 1 (Yük Testi - Baseline):** `k6` scripti ile Naive servise eşzamanlı 100+ istek atıp **Lost Update / Overselling** durumunu ve eksiye düşen kontenjanı veritabanında somutlaştırmak.
- [ ] **Aşama 2 (Pessimistic Locking):** `SELECT ... FOR UPDATE` (`PESSIMISTIC_WRITE`) ile veritabanı satır kilitleme mekanizmasını kurmak ve yük altında tutarlılık/latency ölçmek.
- [ ] **Aşama 3 (Optimistic Locking):** `@Version` ile çakışma yakalama ve retry mekanizması tasarlamak.
- [ ] **Aşama 4 (Redis Distributed Lock):** Redisson / Lua Scripting ile veritabanına yük bindirmeden bellek içi kilitleme uygulamak.
- [ ] **Aşama 5 (Event-Driven / Kafka):** İstekleri asenkron kuyruğa alıp işleyen nihai yüksek ölçekli mimariyi kurmak.
- [ ] **Aşama 6 (Karşılaştırmalı Rapor):** Tüm yöntemlerin Throughput (RPS), P95/P99 Latency ve Error Rate metriklerini tablo halinde belgelemek.