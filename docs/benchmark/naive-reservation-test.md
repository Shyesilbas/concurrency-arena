# Naive Reservation Test Raporu (Race Condition & Lost Update)

## 1. Testin Amaci ve Kapsami

Bu testin amaci; herhangi bir veritabani kilit mekanizmasi (Pessimistic Locking), versiyon kontrolu (Optimistic Locking) veya dagitik kilit/kuyruk yapisi (Redis, Kafka) barindirmayan standart bir CRUD servisinin yuksek eszamanli (concurrent) istekler altindaki davranisini olcmektir. 

Test, cok sayida istemcinin ayni paylasimli kaynaga (stok/kontenjan) ayni anda erismesi durumunda olusan yaris durumunu (Race Condition) ve veri kaybi anomalilerini (Lost Update) somut verilerle belgelemeyi hedefler.

---

## 2. Test Ortami ve Konfigurasyon Bilgileri

- **Test Tarihi:** 20 Agustos 2026
- **Uygulama:** Spring Boot 3.x / Java 21
- **Veritabani:** PostgreSQL 16 (Docker uzerinde)
- **Yuk Testi Araci:** k6 (v0.x)
- **Senaryo Tipi:** Spike / Concurrent Burst (100 Virtual Users - VU tek seferde)
- **Baslangic Konser Kapasitesi:** 100
- **Baslangic Koltuk Kontenjani (`available_seats`):** 100
- **Talep Miktari:** Her istek icin 1 bilet (Toplam talep: 100 bilet)
- **Endpoint:** `POST /api/v1/bookings/naive`

---

## 3. k6 Yuk Testi Ciktisi (Raw Output)

```plaintext
          /\      Grafana   /‾‾/
     /\  /  \     |\  __   /  /
    /  \/    \    | |/ /  /   ‾‾\
   /          \   |   (  |  (‾)  |
  / __________ \  |_|\_\  \_____/

     execution: local
        script: k6/naive_booking_test.js
        output: -

     scenarios: (100.00%) 1 scenario, 100 max VUs, 1m0s max duration (incl. graceful stop):
              * race_condition_spike: 1 iterations for each of 100 VUs (maxDuration: 30s, gracefulStop: 30s)

  TOTAL RESULTS

    checks_total.......: 200    118.327722/s
    checks_succeeded...: 50.00% 100 out of 200
    checks_failed......: 50.00% 100 out of 200

    [✓] status is 200 (Success)
    [✗] status is 400 (Capacity Error)
      ↳  0% — [✓] 0 / [✗] 100

    HTTP
    http_req_duration..............: avg=1.18s min=799.96ms med=1.15s max=1.56s p(90)=1.5s  p(95)=1.53s
      { expected_response:true }...: avg=1.18s min=799.96ms med=1.15s max=1.56s p(90)=1.5s  p(95)=1.53s
    http_req_failed................: 0.00% 0 out of 100
    http_reqs......................: 100   59.163861/s

    EXECUTION
    iteration_duration.............: avg=1.3s  min=901.9ms  med=1.26s max=1.67s p(90)=1.62s p(95)=1.65s
    iterations.....................: 100   59.163861/s
    vus............................: 90    min=90       max=90
    vus_max........................: 100   min=100      max=100

    NETWORK
    data_received..................: 43 kB 25 kB/s
    data_sent......................: 22 kB 13 kB/s

running (0m01.7s), 000/100 VUs, 100 complete and 0 interrupted iterations
race_condition_spike [======================================] 100 VUs  01.7s/30s  100/100 iters, 1 per VU
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
1,Harbiye Acikhava Konseri,Tarkan,100,89,0,2026-08-20 11:07:04.586579 +00:00,2026-08-20 11:07:04.586579 +00:00
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
| HTTP 200 Donen Istek | 100 | 100 | Isteklerin tamami basarili gorundu |
| Basarili Siparis Sayisi (`orders`) | 100 | 100 | 100 siparis kaydi olusturuldu |
| Kesilen Bilet Sayisi (`tickets`) | 100 | 100 | 100 bilet kodu uretildi |
| Kalan Kontenjan (`available_seats`) | 0 | 89 | Tutarsiz (-89 bilet farki) |
| Stok Dusum Hatasi (Lost Update) | 0 adet kayip | 89 adet kayip | Kritik anomali tespit edildi |

---

## 6. Neden Boyle Oldu? (Teknik Kok Neden Analizi)

### Transaction Izolasyonu ve Okuma Zamani (Read-Modify-Write Race)
`NaiveBookingService` icerisinde calisan transaction'lar su adimlari takip etmistir:
1. `Thread-A` konser kaydini okudu (`available_seats = 100`).
2. `Thread-B`, `Thread-C` ... `Thread-N` ayni anda konser kaydini okudu (`available_seats = 100`).
3. Tum thread'ler Java belleginde `availableSeats - 1` islemini yapti ve sonucu 99 (veya yakin degerler) olarak hesapladi.
4. Ilk commit yapan thread veritabanindaki degeri 99 yapti.
5. Hemen ardindan gelen thread'ler, kendi hesapladiklari 99 degerini veritabanina tekrar yazarak bir onceki transaction'larin yaptigi degisiklikleri ezdi (Lost Update).

### Kilit Yoklugu
Sorgularda `SELECT ... FOR UPDATE` (Pessimistic Lock) kullanilmadigi icin PostgreSQL, gelen okuma isteklerinin birbirini beklemesine izin vermedi; transaction'lar tamamen eszamanli olarak ayni satiri guncelledi.

### Versiyon Kontrolunun Pasif Olmasi
Entity seviyesinde Hibernate `@Version` anotasyonu devre disi birakildigi icin, eszamanli ezmeler veritabani tarafindan tespit edilemedi ve `ObjectOptimisticLockingFailureException` firlatilmadi.

---

## 7. Yorumlar ve Mimari Cikarimlar

- **Uygulama Seviyesi Kontroller Yetersizdir:** Java kodunda yer alan `if (concert.getAvailableSeats() < request.seatCount())` sarti eszamanli yuk altinda hicbir koruma saglamaz. Kontrol aninda veri gecerli olsa bile, guncelleme aninda bayatlamis (stale) hale gelmektedir.
- **Sahte Basari Yanilsamasi:** Sistem tum istemcilere HTTP 200 basarili yaniti donmus ve 100 kisiyi bilet sahibi yapmistir. Ancak veritabaninda kalan koltuk 89 olarak gorundugunden, sistem sonraki 89 kisiye daha ayni koltuklari satmaya devam edecek ve buyuk bir Overselling (Cifte Satis) krizine yol acacaktir.
- **Siradaki Adim:** Bu yaris durumunu ortadan kaldirmak icin veritabaninda satir kilitleme stratejisini (`SELECT ... FOR UPDATE` - Pessimistic Write Lock) devreye almak, ardindan tutarliligi ve gecikme (latency) artisini olcmek.
