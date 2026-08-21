# Benchmark Raporu 04: Redis Lua Scripting (Atomic In-Memory Stock Management)

## 1. Testin Amaci ve Kapsami

Bu testin amaci; veritabani seviyesindeki kilit bekleme (`SELECT ... FOR UPDATE`) ve yuksek cakisma ortamindaki retry firtinasi (`@Version` + `@Retryable`) darbogazlarini ortadan kaldirmak amaciyla, stok kontrolu ve dusumunu bellek ici (In-Memory) Redis katmaninda atomik bir Lua scripti ile gerceklestirmektir. 

Test, Redis Lua Scripting yonteminin veri tutarliligi, gecikme (latency), throughput ve veritabanini asiri yukten koruma (traffic shielding) uzerindeki etkilerini somut verilerle belgelemeyi hedefler.

---

## 2. Test Ortami ve Konfigurasyon Bilgileri

- **Test Tarihi:** 20 Agustos 2026
- **Uygulama:** Spring Boot 3.x / Java 21
- **Bellek Ici Veritabani:** Redis 7 (Docker uzerinde)
- **Iliskisel Veritabani:** PostgreSQL 16 (Docker uzerinde)
- **Eszamanlilik Yontemi:** Redis Atomic Lua Scripting (`EVAL` / `DECRBY`)
- **Yuk Testi Araci:** k6 (v0.x)
- **Senaryo Tipi:** Spike / Concurrent Burst (100 Virtual Users - VU tek seferde)
- **Baslangic Konser Kapasitesi:** 100
- **Baslangic Redis Koltuk Kontenjani (`concert:1:seats`):** 100
- **Talep Miktari:** Her istek icin 1 bilet (Toplam talep: 100 bilet)
- **Endpoint:** `POST /api/v1/bookings/redis-lua`

---

## 3. k6 Yuk Testi Ciktisi (Raw Output)

```plaintext
          /\      Grafana   /‾‾/
     /\  /  \     |\  __   /  /
    /  \/    \    | |/ /  /   ‾‾\
   /          \   |   (  |  (‾)  |
  / __________ \  |_|\_\  \_____/

     execution: local
        script: k6/redis_booking_test.js
        output: -

     scenarios: (100.00%) 1 scenario, 100 max VUs, 1m0s max duration (incl. graceful stop):
              * race_condition_spike: 1 iterations for each of 100 VUs (maxDuration: 30s, gracefulStop: 30s)

  TOTAL RESULTS

    checks_total.......: 200    84.678235/s
    checks_succeeded...: 50.00% 100 out of 200
    checks_failed......: 50.00% 100 out of 200

    [✓] status is 200 (Success)
    [✗] status is 400 (Capacity Error)
      ↳  0% — [✓] 0 / [✗] 100

    HTTP
    http_req_duration..............: avg=1.45s min=632.04ms med=1.46s max=2.24s p(90)=2.1s  p(95)=2.17s
      { expected_response:true }...: avg=1.45s min=632.04ms med=1.46s max=2.24s p(90)=2.1s  p(95)=2.17s
    http_req_failed................: 0.00% 0 out of 100
    http_reqs......................: 100   42.339118/s

    EXECUTION
    iteration_duration.............: avg=1.56s min=741.73ms med=1.57s max=2.34s p(90)=2.21s p(95)=2.28s
    iterations.....................: 100   42.339118/s
    vus............................: 27    min=27       max=86 
    vus_max........................: 100   min=100      max=100

    NETWORK
    data_received..................: 43 kB 18 kB/s
    data_sent......................: 22 kB 9.4 kB/s

running (0m02.4s), 000/100 VUs, 100 complete and 0 interrupted iterations
race_condition_spike [======================================] 100 VUs  02.4s/30s  100/100 iters, 1 per VU
```

---

## 4. Veritabani ve Redis Durumu Dogrulama

Test tamamlandiktan sonra Redis ve PostgreSQL uzerinde yapilan kontroller:

### Redis Kontrolu (Kalan Kontenjan)
```bash
redis-cli GET concert:1:seats
# Cikti: "0"
```

### PostgreSQL Kontrolu (Uretilen Toplam Bilet ve Siparis Sayisi)
```sql
SELECT id, name, artist, total_capacity, available_seats, version FROM concerts WHERE id = 1;
-- available_seats = 0

SELECT COUNT(*) AS total_tickets FROM tickets WHERE concert_id = 1;
-- Cikti: 100

SELECT COUNT(*) AS total_orders FROM orders WHERE concert_id = 1;
-- Cikti: 100
```

---

## 5. Karsilastirma Tablosu (4 Stratejinin Karsilastirmasi)

| Metrik / Parametre | 01 - Naive (Korumasiz) | 02 - Pessimistic Lock | 03 - Optimistic (+Retry) | 04 - Redis Lua Scripting |
| :--- | :--- | :--- | :--- | :--- |
| **Kalan Koltuk (`available_seats`)** | 89 (Tutarsiz) | 0 (Kusursuz) | 0 (Kusursuz) | **0 (Kusursuz)** |
| **Lost Update / Stok Kaybi** | 89 Adet Kayip | 0 Adet Kayip | 0 Adet Kayip | **0 Adet Kayip** |
| **Ortalama Yanit Suresi (Avg)** | 1.18s | 1.63s | 1.68s | **1.45s** |
| **Medyan Yanit Suresi (Med)** | 1.15s | 1.65s | 1.71s | **1.46s** |
| **P90 Latency** | 1.50s | 2.30s | 2.40s | **2.10s** |
| **P95 Latency** | 1.53s | 2.39s | 2.51s | **2.17s** |
| **Maksimum Latency** | 1.56s | 2.45s | 2.72s | **2.24s** |
| **Throughput (RPS)** | 59.16 req/s | 38.70 req/s | 34.74 req/s | **42.34 req/s** |
| **Toplam Test Suresi** | 1.7s | 2.6s | 2.9s | **2.4s** |

---

## 6. Neden Boyle Oldu? (Teknik Kok Neden Analizi)

### Atomik ve Lock-Free Bellek Operasyonu
Redis tek is parcacikli (single-threaded) bir olay dongusunde calisir. Gonderilen Lua scripti, "stok kontrolu" ve "stok dusumu" islemlerini bellek uzerinde atomik olarak yurutur. Script tamamlanana kadar araya hicbir komut giremedigi icin:
- Veritabani uzerinde satir kilitleme (`SELECT ... FOR UPDATE`) beklemesi yasanmadi.
- Optimistic locking'de gorulen retry donguleri ve JPA version ezilme istisnalari ortadan kalkti.

### Performans ve Gecikme Gelisimi
- **Throughput Artisi:** Saniyede islenen istek sayisi **42.34 RPS** seviyesine cikarak tutarli DB stratejilerini geride birakti (Pessimistic'e gore +%9.4, Optimistic'e gore +%21.8 artis).
- **P95 Latency Dususu:** DB kilit kuyrugu ve retry beklemesi olmamasi sayesinde P95 suresi **2.17s** seviyesine indi.

### Kalan Darbogaz: Senkron Veritabani Yazimi (RDBMS I/O)
Redis stok kontrolunu mikrosaniyeler icinde tamamlamasina ragmen, basarili olan isteklerin PostgreSQL uzerine senkron olarak `tickets` ve `orders` kayitlarini atmasi sistemdeki ana bekleme suresini olusturmustur.

---

## 7. Yorumlar ve Mimari Cikarimlar

- **Veritabanini Koruma (Traffic Shielding):** Kapasite asildigi anda gelen istekler Redis uzerinde mikrosaniyeler icinde elenir ve veritabanina gereksiz sorgu yuku bindirilmez.
- **Siradaki Adim:** Senkron veritabani yazma darbogazini tamamen asmak icin istekleri hemen kabul edip (`202 Accepted`) siparis uretimini arka plana devreden **Kafka Event-Driven Asynchronous Booking** mimarisinin devreye alinmasi planlanmaktadir.
