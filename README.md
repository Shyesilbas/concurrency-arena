# Concurrency Arena

Yuksek eszamanlilik (high concurrency) ve flash-sale senaryolarinda veri tutarliligi, kilit stratejileri ve dagitik kuyruk mimarilerini test etmek, kiyaslamak ve gorsellestirmek amaciyla gelistirilmis acik kaynakli bir benchmark ve laboratuvar projesidir.

Proje; ayni anda binlerce kullanicinin sinirli sayidaki konser biletini satin almaya calistigi gercek dunya senaryolarini 5 farkli eszamanlilik stratejisiyle simule eder.

---

## Mimari ve Stratejiler

Sistemde ayni bilet yarisi senaryosu icin 5 farkli yaklasim uygulanmis ve benchmark edilmistir:

1. **01. Naive (Korumasiz):**
   - Herhangi bir kilit mekanizmasi veya versiyonlama icermez.
   - Eszamanli istekler ayni stok degerini okur.
   - **Sonuc:** Lost Update ve Cifte Satis (Overselling) anomalisi yasanir.

2. **02. Pessimistic Lock (Veritabani Duzeyinde Kilit):**
   - PostgreSQL uzerinde `SELECT ... FOR UPDATE` ile satir duzeyinde exclusive kilit uygulanir.
   - **Sonuc:** Veri tutarliligi yuzde yuz saglanir ancak siradaki istekler kilit bekledigi icin gecikme (latency) artar.

3. **03. Optimistic Lock (Lock-Free Versiyon Kontrolu):**
   - JPA `@Version` alani ve Spring Retry (exponential backoff jitter) kullanilir.
   - Kayit kilitlenmeden okunur, guncelleme aninda versiyon cakismasi olursa transaction tekrar denenir.
   - **Sonuc:** Dusuk cakismada hizlidir; yuksek yogunlukta (high contention) retry maliyeti nedeniyle P95 gecikmesi yukselir.

4. **04. Redis Lua Scripting (Bellek Ici Atomik Dusum):**
   - Stok sayaci Redis bellek katmaninda tutulur ve Lua scripti ile tek-thread atomik olarak dusurulur.
   - **Sonuc:** Veritabani uzerinden kilit yukunu kaldirarak mikrosaniyeler icinde yuksek throughput saglar.

5. **05. Kafka Event-Driven (Asenkron Ingestion & Kuyruk):**
   - Istekler giriste Redis Lua ile atomik olarak dogrulanir, ardindan Kafka uzerine `booking-events` topic'ine iletilir ve istemciye aninda `HTTP 202 Accepted` donulur.
   - Arka planda calisan consumer grubu bilet ve siparis kayitlarini veritabanina asenkron olarak yazar.
   - **Sonuc:** En yuksek islem kapasitesi (Throughput) ve en dusuk yanit suresi elde edilir.

---

## Teknoloji Yigini

- **Backend:** Java 21, Spring Boot 3.4.2, Spring Data JPA, Spring Kafka, Spring Data Redis
- **Veritabani:** PostgreSQL 16
- **Cache & Scripting:** Redis 7 (Alpine), Lua Scripting
- **Mesaj Kuyrugu:** Apache Kafka (KRaft Mode)
- **Frontend:** React 19, Vite, Lucide React, jsPDF, jsPDF-AutoTable
- **Yuk Testi:** Grafana k6, Tarayici ici Burst Simulator

---

## Kurulum ve Calistirma Adimlari

Projeyi yerel gelistirme ortaminda calistirmak icin asagidaki adimlari sirasiyla uygulayiniz.

### 1. Gereksinimler

- JDK 21 veya uzeri
- Node.js 18 veya uzeri
- Docker ve Docker Compose
- Git

### 2. Depoyu Klonlama

```bash
git clone https://github.com/Shyesilbas/concurrency-arena.git
cd concurrency-arena
```

### 3. Altyapiyi Ayaga Kaldirma (Docker Compose)

PostgreSQL, Redis ve Kafka servislerini baslatmak icin:

```bash
docker compose up -d
```

Servislerin saglik durumunu kontrol etmek icin:

```bash
docker compose ps
```

### 4. Backend Uygulamasini Baslatma

Spring Boot uygulamasini calistirmak icin:

```bash
./mvnw spring-boot:run
```

Uygulama varsayilan olarak `http://localhost:8080` portunda baslayacaktir.

### 5. Frontend Dashboard'u Baslatma

Yeni bir terminal sekmesinde `frontend` dizinine gecip bagimliliklari yukleyiniz ve dev sunucusunu calistiriniz:

```bash
cd frontend
npm install
npm run dev
```

Frontend arayuzune tarayicinizdan erisebilirsiniz:
`http://localhost:5173`

---

## Test ve Kullanim Senaryolari

### Arayuz Uzerinden Test (Dashboard)

1. `http://localhost:5173` adresine gidiniz.
2. Konser karti uzerinden satisa acilacak bilet adedini belirleyiniz (`1 Bilet`, `5 Bilet`, `100 Bilet`).
3. Yarisacak kullanici sayisini (VU) ayarlayiniz (Orn: 100 Kullanici).
4. Stratejilerden birini secip **"Secili Modu Test Et"** butonuna basabilir veya tum stratejileri ayni sartlarda kiyaslamak icin **"5'li Test Oturumu Baslat"** butonunu kullanabilirsiniz.
5. Sonuclari tablo uzerinden inceleyebilir ve **"Raporu PDF Indir"** butonuyla detayli rapor alabilirsiniz.

### k6 ile Komut Satirindan Yuk Testi

Komut satirindan izole k6 yuk testleri calistirmak icin:

```bash
# Naive Testi
k6 run k6/naive_booking_test.js

# Pessimistic Lock Testi
k6 run k6/pessimistic_booking_test.js

# Optimistic Lock Testi
k6 run k6/optimistic_booking_test.js

# Redis Lua Testi
k6 run k6/redis_booking_test.js

# Kafka Asenkron Testi
k6 run k6/kafka_booking_test.js
```

---

## Benchmark Sonuclari Ozeti (100 VU / 100 Bilet)

| Strateji | Throughput (req/s) | P95 Gecikme | Lost Update / Satis Durumu | Veri Tutarliligi |
| :--- | :--- | :--- | :--- | :--- |
| **01. Naive** | 59.16 req/s | 1.53 s | 89 Bilet Kayip (Lost Update) | Tutarsiz |
| **02. Pessimistic Lock** | 38.70 req/s | 2.39 s | 0 Kayip (100 Bilet Satildi) | Tam Tutarlı |
| **03. Optimistic Lock** | 34.74 req/s | 2.51 s | 0 Kayip (100 Bilet Satildi) | Tam Tutarlı |
| **04. Redis Lua Scripting** | 42.34 req/s | 2.17 s | 0 Kayip (100 Bilet Satildi) | Tam Tutarlı |
| **05. Kafka Event-Driven** | 139.85 req/s | 572.86 ms | 0 Kayip (100 Bilet Satildi) | Tam Tutarlı |

---
