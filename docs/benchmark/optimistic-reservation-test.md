# Benchmark Raporu 03: Optimistic Locking (@Version + Retry)

## 1. Testin Amaci ve Kapsami

Bu testin amaci; veritabaninda herhangi bir satir kilitleme (`SELECT ... FOR UPDATE`) yapmadan, JPA `@Version` alani ve uygulama seviyesinde `spring-retry` mekanizmasi kullanarak eszamanli rezervasyon isteklerini yonetmektir. 

Test, yuksek cakisma (high contention) ortaminda Optimistic Locking stratejisinin veri tutarliligini, retry maliyetini, gecikme (latency) artisini ve throughput degerlerini somut verilerle belgelemeyi hedefler.

---

## 2. Test Ortami ve Konfigurasyon Bilgileri

- **Test Tarihi:** 20 Agustos 2026
- **Uygulama:** Spring Boot 3.x / Java 21
- **Veritabani:** PostgreSQL 16 (Docker uzerinde)
- **Kilit Yontemi:** JPA `@Version` + Spring Retry (`@Retryable`)
- **Retry Konfigurasyonu:** Max 50 deneme, `backoff = @Backoff(delay = 20, maxDelay = 100, random = true)`
- **Yuk Testi Araci:** k6 (v0.x)
- **Senaryo Tipi:** Spike / Concurrent Burst (100 Virtual Users - VU tek seferde)
- **Baslangic Konser Kapasitesi:** 100
- **Baslangic Koltuk Kontenjani (`available_seats`):** 100
- **Talep Miktari:** Her istek icin 1 bilet (Toplam talep: 100 bilet)
- **Endpoint:** `POST /api/v1/bookings/optimistic`

---

## 3. k6 Yuk Testi Ciktisi (Raw Output)

```plaintext
          /\      Grafana   /‾‾/
     /\  /  \     |\  __   /  /
    /  \/    \    | |/ /  /   ‾‾\
   /          \   |   (  |  (‾)  |
  / __________ \  |_|\_\  \_____/

     execution: local
        script: k6/optimistic_booking_test.js
        output: -

     scenarios: (100.00%) 1 scenario, 100 max VUs, 1m0s max duration (incl. graceful stop):
              * race_condition_spike: 1 iterations for each of 100 VUs (maxDuration: 30s, gracefulStop: 30s)

  TOTAL RESULTS

    checks_total.......: 200    69.479184/s
    checks_succeeded...: 50.00% 100 out of 200
    checks_failed......: 50.00% 100 out of 200

    [✓] status is 200 (Success)
    [✗] status is 400 (Capacity Error)
      ↳  0% — [✓] 0 / [✗] 100

    HTTP
    http_req_duration..............: avg=1.68s min=626.07ms med=1.71s max=2.72s p(90)=2.4s  p(95)=2.51s
      { expected_response:true }...: avg=1.68s min=626.07ms med=1.71s max=2.72s p(90)=2.4s  p(95)=2.51s
    http_req_failed................: 0.00% 0 out of 100
    http_reqs......................: 100   34.739592/s

    EXECUTION
    iteration_duration.............: avg=1.81s min=758.69ms med=1.83s max=2.87s p(90)=2.52s p(95)=2.64s
    iterations.....................: 100   34.739592/s
    vus............................: 45    min=45       max=91 
    vus_max........................: 100   min=100      max=100

    NETWORK
    data_received..................: 44 kB 15 kB/s
    data_sent......................: 23 kB 8.0 kB/s

running (0m02.9s), 000/100 VUs, 100 complete and 0 interrupted iterations
race_condition_spike [======================================] 100 VUs  02.9s/30s  100/100 iters, 1 per VU
```

---

## 4. Veritabani Durumu ve Dogrulama Sorgulari

Test calistirildiktan sonra PostgreSQL uzerinde calistirilan dogrulama sorgulari ve ciktilari:

### Sorgu 1: Konser Tablosundaki Nihai Kontenjan ve Versiyon Durumu
```sql
SELECT id, name, artist, total_capacity, available_seats, version FROM concerts WHERE id = 1;
-- Beklenen ve Gerceklesen: available_seats = 0, version = 100
```

### Sorgu 2: Uretilen Toplam Bilet ve Siparis Sayisi
```sql
SELECT COUNT(*) AS total_tickets FROM tickets WHERE concert_id = 1;
-- Cikti: 100

SELECT COUNT(*) AS total_orders FROM orders WHERE concert_id = 1;
-- Cikti: 100
```

---

## 5. Karsilastirma Tablosu (3 Stratejinin Karsilastirmasi)

| Metrik / Parametre | 01 - Naive (Korumasiz) | 02 - Pessimistic Lock | 03 - Optimistic Lock (+Retry) |
| :--- | :--- | :--- | :--- |
| Kalan Koltuk (`available_seats`) | 89 (Tutarsiz) | 0 (Kusursuz) | 0 (Kusursuz) |
| Lost Update / Stok Kaybi | 89 Adet Kayip | 0 Adet Kayip | 0 Adet Kayip |
| Nihai Versiyon (`version`) | 0 | 0 | 100 |
| Ortalama Yanit Suresi (Avg) | 1.18s | 1.63s | 1.68s |
| Medyan Yanit Suresi (Med) | 1.15s | 1.65s | 1.71s |
| P90 Latency | 1.50s | 2.30s | 2.40s |
| P95 Latency | 1.53s | 2.39s | 2.51s |
| Maksimum Latency | 1.56s | 2.45s | 2.72s |
| Throughput (RPS) | 59.16 req/s | 38.70 req/s | 34.74 req/s |

---

## 6. Neden Boyle Oldu? (Teknik Kok Neden Analizi)

### Lock-Free Okuma ve Versiyon Kontrolu
Hicbir istek veritabaninda satiri kilitlemedi. Her transaction o anki `version` degeriyle satiri okudu. DB uzerindeki `UPDATE concerts SET available_seats = ?, version = version + 1 WHERE id = 1 AND version = ?` sorgusunda, araya baska bir thread girmisse `updated row count = 0` dondu ve Hibernate `ObjectOptimisticLockingFailureException` firlatti.

### Retry ve Jitter Maliyeti
Firlatilan exception Spring Retry tarafindan yakalandi. Istekler rastgele jitter bekleme sureleri (20ms - 100ms) vererek guncel veriyi tekrar okudu ve yeniden kaydetmeyi denedi. 100 biletin tamami basariyla satilana kadar arkada yuzlerce transaction retry dongusune girdi.

### Gecikme ve Kapasite Analizi (High Contention Etkisi)
Optimistic Locking dusuk cakismali (low contention) sistemlerde cok hizlidir. Ancak ayni anda tek bir kayit uzerine 100 istegin bindiği High Contention senaryosunda retry sayisi cok arttigi icin:
- P95 gecikme suresi **2.51s** ile test edilen en yuksek seviyeye cikti.
- Throughput **34.74 RPS** seviyesine gerileyerek Pessimistic stratejinin de gerisinde kaldi.
- Bunun sebebi CPU ve baglanti havuzunun basarisiz olan transaction'lari tekrar tekrar calistirmakla mesgul olmasidir.

---

## 7. Yorumlar ve Mimari Cikarimlar

- **Veri Tutarliligi:** Pessimistic Locking gibi Optimistic Locking de veri tutarliligini %100 sagladi, hicbir koltuk kaybolmadi ve bilet sayisi stogu asilmadi.
- **Senaryo Uygunlugu:** Optimistic Locking, ayni kayit uzerinde yogun eszamanli guncellemelerin oldugu (ornegin bilet satis spike'lari) senaryolarda yuksek retry maliyeti nedeniyle ideal degildir.
- **Siradaki Adim:** Iliskisel veritabani uzerindeki bu darbogazi tamamen kaldirmak amaciyla atomik bellek ici operasyonlar sunan Redis Lua Scripting / Distributed Lock veya Kafka Event-Driven Asynchronous Booking mimarisinin devreye alinmasi planlanmaktadir.
