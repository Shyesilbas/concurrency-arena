# Pessimistic Reservation Test Raporu (SELECT FOR UPDATE)

## 1. Testin Amaci ve Kapsami

Bu testin amaci; Naive serviste gorulen Lost Update ve Race Condition anomalilerini engellemek uzere veritabani seviyesinde satir kilitleme (`SELECT ... FOR UPDATE` - `PESSIMISTIC_WRITE`) mekanizmasini devreye almak ve bu yontemin veri tutarliligi ile sistem gecikmesi (latency/throughput) uzerindeki etkilerini somut verilerle belgelemektir.

---

## 2. Test Ortami ve Konfigurasyon Bilgileri

- **Test Tarihi:** 20 Agustos 2026
- **Uygulama:** Spring Boot 3.x / Java 21
- **Veritabani:** PostgreSQL 16 (Docker uzerinde)
- **Kilit Yontemi:** JPA `LockModeType.PESSIMISTIC_WRITE`
- **Yuk Testi Araci:** k6 (v0.x)
- **Senaryo Tipi:** Spike / Concurrent Burst (100 Virtual Users - VU tek seferde)
- **Baslangic Konser Kapasitesi:** 100
- **Baslangic Koltuk Kontenjani (`available_seats`):** 100
- **Talep Miktari:** Her istek icin 1 bilet (Toplam talep: 100 bilet)
- **Endpoint:** `POST /api/v1/bookings/pessimistic`

---

## 3. k6 Yuk Testi Ciktisi (Raw Output)

```plaintext
          /\      Grafana   /‾‾/
     /\  /  \     |\  __   /  /
    /  \/    \    | |/ /  /   ‾‾\
   /          \   |   (  |  (‾)  |
  / __________ \  |_|\_\  \_____/

     execution: local
        script: k6/pessimistic_booking_test.js
        output: -

     scenarios: (100.00%) 1 scenario, 100 max VUs, 1m0s max duration (incl. graceful stop):
              * race_condition_spike: 1 iterations for each of 100 VUs (maxDuration: 30s, gracefulStop: 30s)

  TOTAL RESULTS

    checks_total.......: 200    77.402466/s
    checks_succeeded...: 50.00% 100 out of 200
    checks_failed......: 50.00% 100 out of 200

    [✓] status is 200 (Success)
    [✗] status is 400 (Capacity Error)
      ↳  0% — [✓] 0 / [✗] 100

    HTTP
    http_req_duration..............: avg=1.63s min=751.18ms med=1.65s max=2.45s p(90)=2.3s  p(95)=2.39s
      { expected_response:true }...: avg=1.63s min=751.18ms med=1.65s max=2.45s p(90)=2.3s  p(95)=2.39s
    http_req_failed................: 0.00% 0 out of 100
    http_reqs......................: 100   38.701233/s

    EXECUTION
    iteration_duration.............: avg=1.75s min=897.41ms med=1.79s max=2.56s p(90)=2.41s p(95)=2.5s 
    iterations.....................: 100   38.701233/s
    vus............................: 38    min=38       max=94 
    vus_max........................: 100   min=100      max=100

    NETWORK
    data_received..................: 44 kB 17 kB/s
    data_sent......................: 23 kB 9.0 kB/s

running (0m02.6s), 000/100 VUs, 100 complete and 0 interrupted iterations
race_condition_spike [======================================] 100 VUs  02.6s/30s  100/100 iters, 1 per VU
```

---

## 4. Veritabani Durumu ve Dogrulama Sorgulari

Test calistirildiktan sonra PostgreSQL uzerinde calistirilan sorgular ve ciktilari asagidadir:

### Sorgu 1: Konser Tablosundaki Nihai Kontenjan Durumu
```sql
SELECT id, name, artist, total_capacity, available_seats, version, created_at, updated_at 
FROM concerts 
WHERE id = 1;
```

**Sorgu 1 Ciktisi:**
```plaintext
1,Harbiye Acikhava Konseri,Tarkan,100,0,0,2026-08-20 11:07:04.586579 +00:00,2026-08-20 11:07:04.586579 +00:00
```

### Sorgu 2: Uretilen Toplam Bilet ve Siparis Sayisi
```sql
SELECT COUNT(*) AS total_tickets FROM tickets WHERE concert_id = 1;
-- Cikti: 100

SELECT COUNT(*) AS total_orders FROM orders WHERE concert_id = 1;
-- Cikti: 100
```

---

## 5. Sonuclarin Analizi ve Karsilastirma Tablosu

| Parametre | Beklenen Deger | Gerceklesen Deger | Durum |
| :--- | :--- | :--- | :--- |
| Gonderilen Toplam Istek | 100 | 100 | Isteklerin tamami islendi |
| HTTP 200 Donen Istek | 100 | 100 | Isteklerin tamami basarili |
| Basarili Siparis Sayisi (`orders`) | 100 | 100 | 100 siparis kaydi olusturuldu |
| Kesilen Bilet Sayisi (`tickets`) | 100 | 100 | 100 bilet kodu uretildi |
| Kalan Kontenjan (`available_seats`) | 0 | 0 | Kusursuz Tutarlilik |
| Stok Dusum Hatasi (Lost Update) | 0 adet kayip | 0 adet kayip | Race condition engellendi |

---

## 6. Naive vs. Pessimistic Karsilastirma Tablosu

| Metrik / Parametre | 01 - Naive (Korumasiz) | 02 - Pessimistic Lock | Fark / Maliyet |
| :--- | :--- | :--- | :--- |
| Kalan Koltuk (`available_seats`) | 89 (Tutarsiz) | 0 (Kusursuz) | Veri butunlugu saglandi |
| Lost Update / Stok Kaybi | 89 Adet Kayip | 0 Adet Kayip | Overselling onlendi |
| Ortalama Yanit Suresi (Avg) | 1.18s | 1.63s | +%38.1 Gecikme artisi |
| Medyan Yanit Suresi (Med) | 1.15s | 1.65s | +%43.4 Gecikme artisi |
| P90 Latency | 1.50s | 2.30s | +%53.3 Kuyruk bekleme suresi |
| P95 Latency | 1.53s | 2.39s | +%56.2 Kuyruk bekleme suresi |
| Maksimum Latency | 1.56s | 2.45s | Kilit kuyrugundaki son istek |
| Throughput (RPS) | 59.16 req/s | 38.70 req/s | -%34.5 Kapasite dususu |

---

## 7. Neden Boyle Oldu? (Teknik Kok Neden Analizi)

### Satir Duzeyinde Siralama (Serialization)
`findByIdWithPessimisticLock` metodu, JPA uzerinden PostgreSQL'e `SELECT ... FOR UPDATE` sorgusu gonderdi. Bu sorgu ile ilk erisen transaction konser satirina Exclusive Lock (X-Lock) koydu. Geriye kalan 99 transaction satir kilidi acilana kadar veritabani tarafindan bekletildi.

### Kusursuz Stok Dusumu
Kilitlenen satiri sirayla alan her transaction, kendisinden bir onceki transaction'in commit ettigi guncel `available_seats` degerini okudu (100 -> 99 -> 98 ... -> 0). Boylece hicbir thread digerinin yazdigi veriyi ezemedi.

### Gecikme ve Kapasite Maliyeti (Lock Contention)
Satir kilidi tum islemleri tek bir siraya zorladigi icin paralel islem kabiliyeti dustu. Isteklerin kuyrukta beklemesi, P95 gecikme suresini 1.53 saniyeden 2.39 saniyeye cikardi ve saniyede islenen istek sayisi (Throughput) 59.16 RPS'ten 38.70 RPS'e geriledi.

---

## 8. Yorumlar ve Mimari Cikarimlar

- **Veri Tutarliligi Guvence Altinda:** Pessimistic Locking, kritik stok yonetiminde Lost Update ve Overselling riskini tamamen ortadan kaldirir.
- **Olceklenebilirlik Siniri (Bottleneck):** Eszamanli istek sayisi ve bekleme suresi arttikca veritabani baglanti havuzu (HikariCP) tukenme riskiyle karsilasir ve veritabani CPU yuku artar.
- **Siradaki Adim:** Kilit bekleme maliyetini ortadan kaldirmak, okuma islemlerini serbest birakmak ve cakismalari yalnizca guncelleme aninda versiyon uzerinden yakalamak amaciyla Optimistic Locking (`@Version` + Retry Mekanizmasi) mimarisinin devreye alinmasi planlanmaktadir.
