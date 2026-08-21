import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { exportSingleTestPdf } from '../utils/pdfExport';

export default function MetricsPanel({ lastResult }) {
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  if (!lastResult) {
    return (
      <div className="card-soft" style={{ padding: '32px', textAlign: 'center' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
          Henüz Test Çalıştırılmadı
        </h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Yukarıdan bir mod seçip testi başlattığınızda yarışın gerçek zamanlı dökümü burada listelenecektir.
        </p>
      </div>
    );
  }

  const isOversold = lastResult.successCount > lastResult.targetStockCapacity;

  const filteredReports = (lastResult.userReports || []).filter(u => {
    if (filter === 'SUCCESS' && u.status !== 'ALINDI') return false;
    if (filter === 'FAIL' && u.status === 'ALINDI') return false;
    if (searchTerm && !u.userLabel.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Summary Card */}
      <div className="card-soft" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--brand-black)' }}>
                Yarış Sonucu Özeti
              </h3>
              <span className={isOversold ? 'pill pill-danger' : 'pill pill-success'}>
                {isOversold ? 'Çifte Satış (Overselling Anomalisi)' : 'Kusursuz Veri Tutarlılığı'}
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {lastResult.targetStockCapacity} adet bilet için {lastResult.vuCount} eşzamanlı kullanıcı yarıştı.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => exportSingleTestPdf(lastResult)}
              className="btn-modern btn-white"
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              title="Bu testin sonucunu ve kullanıcı listesini PDF olarak indirir"
            >
              <Download size={14} />
              <span>Raporu PDF İndir</span>
            </button>
            <span className="pill pill-dark font-mono">
              {lastResult.strategyTitle} • {lastResult.timestamp}
            </span>
          </div>
        </div>

        {/* KPI Mini Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px'
        }}>
          {/* Stock / Sold */}
          <div style={{ padding: '16px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              BİLET STOKU / SATILAN
            </span>
            <div className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: isOversold ? '#e11d48' : 'var(--brand-black)' }}>
              {lastResult.successCount} / {lastResult.targetStockCapacity} <span style={{ fontSize: '0.8rem' }}>Bilet</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: isOversold ? '#e11d48' : 'var(--text-muted)' }}>
              {isOversold ? `Fazladan ${lastResult.successCount - lastResult.targetStockCapacity} bilet satıldı!` : 'Stok aşımı yok.'}
            </span>
          </div>

          {/* Throughput */}
          <div style={{ padding: '16px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              THROUGHPUT
            </span>
            <div className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--brand-black)' }}>
              {lastResult.throughputRps.toFixed(2)} <span style={{ fontSize: '0.8rem' }}>req/s</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Toplam: {(lastResult.totalTimeMs / 1000).toFixed(2)}s
            </span>
          </div>

          {/* Avg Latency */}
          <div style={{ padding: '16px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              ORTALAMA SÜRE
            </span>
            <div className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--brand-black)' }}>
              {lastResult.avgMs.toFixed(1)} <span style={{ fontSize: '0.8rem' }}>ms</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Medyan: {lastResult.medMs.toFixed(1)} ms
            </span>
          </div>

          {/* P95 Latency */}
          <div style={{ padding: '16px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              P95 GECİKME
            </span>
            <div className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--brand-black)' }}>
              {lastResult.p95Ms.toFixed(1)} <span style={{ fontSize: '0.8rem' }}>ms</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              P90: {lastResult.p90Ms.toFixed(1)} ms
            </span>
          </div>
        </div>
      </div>

      {/* 2. Detailed Table Card */}
      <div className="card-soft" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand-black)' }}>
              Kullanıcıların Varış Sırası & Sonuçları
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Sunucuya ilk varan istekler bileti kapar, sonrakiler kapasiteye takılır.
            </p>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="User ara (#1)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface)'
              }}
            />
            <button
              onClick={() => setFilter('ALL')}
              className={`btn-modern ${filter === 'ALL' ? 'btn-black' : 'btn-white'}`}
              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
            >
              Tümü ({lastResult.vuCount})
            </button>
            <button
              onClick={() => setFilter('SUCCESS')}
              className={`btn-modern ${filter === 'SUCCESS' ? 'btn-black' : 'btn-white'}`}
              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
            >
              Kapanlar ({lastResult.successCount})
            </button>
            <button
              onClick={() => setFilter('FAIL')}
              className={`btn-modern ${filter === 'FAIL' ? 'btn-black' : 'btn-white'}`}
              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
            >
              Kalanlar ({lastResult.failCount})
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ maxHeight: '380px', overflowY: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)' }}>
              <tr style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Kullanıcı</th>
                <th style={{ padding: '12px 14px' }}>İstek Anı</th>
                <th style={{ padding: '12px 14px' }}>Gecikme</th>
                <th style={{ padding: '12px 14px' }}>Sonuç</th>
                <th style={{ padding: '12px 14px' }}>HTTP Kodu</th>
                <th style={{ padding: '12px 14px' }}>Sunucu Mesajı / Tracking</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((u) => {
                const isSuccess = u.status === 'ALINDI';
                return (
                  <tr key={u.userLabel} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--brand-black)' }}>
                      {u.userLabel}
                    </td>
                    <td className="font-mono" style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                      {u.sendTime}
                    </td>
                    <td className="font-mono" style={{ padding: '12px 14px' }}>
                      {u.durationMs} ms
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className={isSuccess ? 'pill pill-success' : 'pill pill-danger'}>
                        {isSuccess ? 'BİLET ALINDI' : 'KAPASİTE DOLU'}
                      </span>
                    </td>
                    <td className="font-mono" style={{ padding: '12px 14px' }}>
                      HTTP {u.httpCode}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                      {u.trackingId ? (
                        <span className="font-mono" style={{ fontSize: '0.75rem' }}>Track: {u.trackingId.substring(0, 8)}...</span>
                      ) : (
                        u.message
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
