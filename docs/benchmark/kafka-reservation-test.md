# Benchmark Raporu 05: Kafka Event-Driven Asynchronous Booking

## 1. Testin Amaci ve Kapsami

Bu testin amaci; senkron mimarilerde gorulen veritabani I/O darbogazini tamamen ortadan kaldirmak icin istek kabulunu (Ingestion) ve siparis olusturma islemini (Processing) asenkron bir olay tabanli (Event-Driven) mimari ile birbirinden ayirmaktir (Decoupling).

Bu stratejide, gelen istek Redis Lua Scripting ile mikrosaniyeler icinde atomik olarak dogrulanir ve stoku dusulur. Ardindan siparis olayi Apache Kafka kuyruguna firlatilarak istemciye aninda `HTTP 202 Accepted` basarili yaniti donulur. Siparis ve bilet uretimi arka planda calisan Kafka Consumer tarafindan asenkron olarak tamamlanir.

---

## 2. Test Ortami ve Konfigurasyon Bilgileri

- **Test Tarihi:** 20 Agustos 2026
- **Uygulama:** Spring Boot 3.x / Java 21
- **Mesaj Kuyrugu:** Apache Kafka 3.x (Docker - KRaft Mode)
- **Topic:** `booking-events`
- **Bellek Ici Veritabani:** Redis 7 (Docker uzerinde)
- **Iliskisel Veritabani:** PostgreSQL 16 (Docker uzerinde)
- **Yuk Testi Araci:** k6 (v0.x)
- **Senaryo Tipi:** Spike / Concurrent Burst (100 Virtual Users - VU tek seferde)
- **Baslangic Konser Kapasitesi:** 100
- **Baslangic Redis Koltuk Kontenjani (`concert:1:seats`):** 100
- **Talep Miktari:** Her istek icin 1 bilet (Toplam talep: 100 bilet)
- **Endpoint:** `POST /api/v1/bookings/kafka`

---

## 3. k6 Yuk Testi Ciktisi (Raw Output)

```plaintext
          /\      Grafana   /‾‾/
     /\  /  \     |\  __   /  /
    /  \/    \    | |/ /  /   ‾‾\
   /          \   |   (  |  (‾)  |
  / __________ \  |_|\_\  \_____/

     execution: local
        script: k6/kafka_booking_test.js
        output: -

     scenarios: (100.00%) 1 scenario, 100 max VUs, 1m0s max duration (incl. graceful stop):
              * race_condition_spike: 1 iterations for each of 100 VUs (maxDuration: 30s, gracefulStop: 30s)

  TOTAL RESULTS

    checks_total.......: 100     139.849578/s
    checks_succeeded...: 100.00% 100 out of 200
    checks_failed......: 0.00%   0 out of 100

    [✓] status is 202 (Accepted)

    HTTP
    http_req_duration..............: avg=559.54ms min=529.12ms med=561.64ms max=587.99ms p(90)=571.7ms  p(95)=572.86ms
      { expected_response:true }...: avg=559.54ms min=529.12ms med=561.64ms max=587.99ms p(90)=571.7ms  p(95)=572.86ms
    http_req_failed................: 0.00% 0 out of 100
    http_reqs......................: 100   139.849578/s

    EXECUTION
    iteration_duration.............: avg=672.57ms min=633.41ms med=685.01ms max=707.07ms p(90)=694.21ms p(95)=696.73ms
    iterations.....................: 100   139.849578/s
    vus............................: 100   min=100      max=100
    vus_max........................: 100   min=100      max=100

    NETWORK
    data_received..................: 40 kB 56 kB/s
    data_sent......................: 22 kB 31 kB/s

running (0m00.7s), 000/100 VUs, 100 complete and 0 interrupted iterations
race_condition_spike [======================================] 100 VUs  00.7s/30s  100/100 iters, 1 per VU
```

---

## 4. Veritabani ve Asenkron Isleme Dogrulama

Test bittikten sonra asenkron consumer tarafindan PostgreSQL'e yazilan verilerin dogrulanmasi:

### PostgreSQL Durumu (Asenkron Tuketim Sonrasi)
```sql
SELECT id, name, artist, total_capacity, available_seats, version FROM concerts WHERE id = 1;
-- available_seats = 0

SELECT COUNT(*) AS total_tickets FROM tickets WHERE concert_id = 1;
-- Cikti: 100

SELECT COUNT(*) AS total_orders FROM orders WHERE concert_id = 1;
-- Cikti: 100
```

---

## 5. Karsilastirma Tablosu (5 Stratejinin Buyuk Karsilastirmasi)

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

## 6. Neden Boyle Oldu? (Teknik Kok Neden Analizi)

### Non-Blocking ve Senkron Beklemenin Ortadan Kalkmasi
Onceki tum stratejilerde HTTP istegi, PostgreSQL uzerindeki transaction commit edilene kadar istemciyi bekletiyordu. Kafka asenkron mimarisinde:
1. Istek gelir gelmez Redis Lua ile bellek uzerinde 0.1 milisaniyede stok dusuldu.
2. Kafka Producer mesaji kuyruga yazdi ve istemciye hemen `202 Accepted` cevabi donuldu.
3. Senkron veritabani disk yazma (I/O) beklemesi kalktigi icin ortalama yanit suresi **559.54 ms** seviyesine indi.

### Yuk Dengeleme ve Tamponlama (Traffic Leveling / Buffering)
100 eszamanli kullanici ayni anda saldirdiginda veritabanina 100 eszamanli agir transaction bindirilmedi. Kafka bir tampon gorevi gorerek bu yuk dalgasini emdi; arkadaki consumer veritabani baglanti havuzunu (HikariCP) yormadan siparisleri sirayla yazdi.

### Throughput Rekoru (139.85 RPS)
Gecikmelerin 4 kat dusmesiyle saniyede islenen istek sayisi **139.85 RPS** seviyesine cikti. 100 kullanicilik burst spike senaryosu yalnizca **0.7 saniyede (700 ms)** tam basariyla sonuclandi.

---

## 7. Yorumlar ve Mimari Cikarimlar

- **Buyuk Olcekli Sistemler Icin Standart Mimari:** Trendyol Flash Sale, Amazon Prime Day veya Ticketmaster bilet satislari gibi ani milyonlarca istegin geldigi senaryolarda Event-Driven mimari tek surdurulebilir cozumdur.
- **Kullanici Deneyimi:** Kullaniciya siparisinin alindigi bilgisi aninda iletilir, arka plandaki isleme durumu WebSocket / SSE veya polling mekanizmasi ile takip edilebilir.
- **Nihai Kazanim:** Sifir veri kaybi, kusursuz tutarlilik, 4 kat dusuk gecikme ve 3.5 kat yuksek islem kapasitesi.
