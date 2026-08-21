import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Export Single Test Result as PDF
 */
export function exportSingleTestPdf(result) {
  if (!result) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const isOversold = result.successCount > result.targetStockCapacity;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('CONCURRENCY ARENA - TEST RAPORU', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Tarih: ${new Date().toLocaleDateString()} ${result.timestamp} | Rapor Tipi: Tekli Strateji Testi`, 14, 24);

  // Divider
  doc.setDrawColor(200);
  doc.line(14, 27, 196, 27);

  // Summary Metadata
  doc.setFontSize(10);
  doc.setTextColor(30);

  const summaryData = [
    ['Test Edilen Strateji', result.strategyTitle],
    ['Satisa Acilan Toplam Bilet', `${result.targetStockCapacity} Bilet`],
    ['Yarisan Kullanici Sayisi (VU)', `${result.vuCount} Kullanici`],
    ['Basarili Bilet Alimi', `${result.successCount} Kullanici (${result.totalTicketsSold} Bilet)`],
    ['Veri Tutarliligi / Durum', isOversold ? 'CIFTE SATIS (OVERSELLING ANOMALISI)' : 'KUSURSUZ TUTARLILIK'],
    ['Throughput (Islem Kapasitesi)', `${result.throughputRps.toFixed(2)} req/s`],
    ['Ortalama Yanit Suresi (Avg)', `${result.avgMs.toFixed(1)} ms`],
    ['Medyan Sure (P50)', `${result.medMs.toFixed(1)} ms`],
    ['P95 Gecikme Suresi', `${result.p95Ms.toFixed(1)} ms`],
    ['Toplam Test Suresi', `${(result.totalTimeMs / 1000).toFixed(2)} saniye`]
  ];

  autoTable(doc, {
    startY: 32,
    head: [['Parametre / Metrik', 'Test Degeri']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 }
  });

  // User Execution Details Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Kullanici Bazli Islem Dokumu & Varis Sirasi', 14, doc.lastAutoTable.finalY + 12);

  const userRows = (result.userReports || []).map(u => [
    u.userLabel,
    u.sendTime,
    `${u.durationMs} ms`,
    u.status === 'ALINDI' ? 'BILET ALINDI' : 'KAPASITE DOLU',
    `HTTP ${u.httpCode}`,
    u.trackingId ? `Track: ${u.trackingId.substring(0, 10)}...` : u.message
  ]);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 16,
    head: [['Kullanici', 'Istek Zamani', 'Gecikme', 'Sonuc', 'HTTP Kodu', 'Sunucu Yaniti']],
    body: userRows,
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
    styles: { fontSize: 8, cellPadding: 2.5 }
  });

  doc.save(`concurrency-test-${result.strategyId}-${Date.now()}.pdf`);
}

/**
 * Export Batch Session Full Detailed Report (5 Strategies Summary + All 5 User Execution Logs)
 */
export function exportSessionComparisonPdf(sessionResults) {
  if (!sessionResults || sessionResults.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('CONCURRENCY ARENA - KAPSAMLI OTURUM RAPORU', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Tarih: ${new Date().toLocaleDateString()} | 5 Eszamanlilik Stratejisinin Genel Kiyaslamasi ve Detayli Kullanici Loglari`, 14, 24);

  // Divider
  doc.setDrawColor(200);
  doc.line(14, 27, 196, 27);

  const stock = sessionResults[0].targetStockCapacity;
  const vus = sessionResults[0].vuCount;

  doc.setFontSize(10);
  doc.setTextColor(30);
  doc.text(`Genel Test Parametreleri: ${stock} Bilet Kapasitesi vs. ${vus} Eszamanli Kullanici (VU)`, 14, 33);

  // 1. Comparison Summary Table
  const comparisonRows = sessionResults.map(r => {
    const isOversold = r.successCount > r.targetStockCapacity;
    return [
      r.strategyTitle,
      `${r.successCount} / ${r.targetStockCapacity}`,
      isOversold ? 'Cifte Satis (Overselling)' : 'Kusursuz Tutarlilik',
      `${r.throughputRps.toFixed(2)} req/s`,
      `${r.avgMs.toFixed(1)} ms`,
      `${r.p95Ms.toFixed(1)} ms`,
      `${(r.totalTimeMs / 1000).toFixed(2)}s`
    ];
  });

  autoTable(doc, {
    startY: 38,
    head: [['Strateji / Model', 'Satilan/Kota', 'Veri Tutarliligi', 'Throughput', 'Ort. Sure', 'P95 Gecikme', 'Toplam Sure']],
    body: comparisonRows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 3.5 }
  });

  // Architectural Notes Section
  let currentY = doc.lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Mimari Sonuclar & Cikarimlar', 14, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60);

  const notes = [
    '1. Naive: Kilit veya izolasyon olmadigindan Lost Update ve Cifte Satis (Overselling) yasanir.',
    '2. Pessimistic: SELECT FOR UPDATE satir kilidi ile %100 tutarlidir, siradaki istekler bekledigi icin latency yuksektir.',
    '3. Optimistic: High contention ortaminda JPA @Version cakisir ve 50x retry yukunden dolayi P95 tavan yapar.',
    '4. Redis Lua: Stok bellek uzerinde atomik dusuruldugunden DB kilitleri kalkar, yuksek Throughput saglanir.',
    '5. Kafka: Istekler 202 Accepted ile aninda kuyruga devredilir, boylece en yuksek Throughput ve en dusuk gecikme elde edilir.'
  ];

  currentY += 5;
  notes.forEach(note => {
    doc.text(note, 14, currentY);
    currentY += 4.5;
  });

  // 2. Individual Strategy Execution Logs (One full section for each strategy)
  sessionResults.forEach((stratResult, idx) => {
    doc.addPage(); // New page for each strategy detail

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`${idx + 1}. ${stratResult.strategyTitle} - Varis Sirasi & Kullanici Sonuclari`, 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100);
    doc.text(`Throughput: ${stratResult.throughputRps.toFixed(2)} req/s | Avg: ${stratResult.avgMs.toFixed(1)} ms | P95: ${stratResult.p95Ms.toFixed(1)} ms | Satilan: ${stratResult.successCount}/${stratResult.targetStockCapacity}`, 14, 24);

    doc.setDrawColor(220);
    doc.line(14, 26, 196, 26);

    const userRows = (stratResult.userReports || []).map(u => [
      u.userLabel,
      u.sendTime,
      `${u.durationMs} ms`,
      u.status === 'ALINDI' ? 'BILET ALINDI' : 'KAPASITE DOLU',
      `HTTP ${u.httpCode}`,
      u.trackingId ? `Track: ${u.trackingId.substring(0, 12)}...` : u.message
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Kullanici', 'Istek Zamani', 'Gecikme', 'Sonuc', 'HTTP Kodu', 'Sunucu Yaniti / Tracking']],
      body: userRows,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
      styles: { fontSize: 7.5, cellPadding: 2.2 },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 3) {
          if (data.cell.raw === 'BILET ALINDI') {
            data.cell.styles.textColor = [5, 150, 105]; // Green
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [225, 29, 72]; // Red
          }
        }
      }
    });
  });

  doc.save(`concurrency-full-session-report-${Date.now()}.pdf`);
}
