import React, { useState } from 'react';
import { Award, Download, ChevronRight, Eye } from 'lucide-react';
import { exportSessionComparisonPdf } from '../utils/pdfExport';

export default function SessionComparisonTable({ sessionResults, onSelectStrategyDetail, selectedDetailId }) {
  if (!sessionResults || sessionResults.length === 0) return null;

  return (
    <div className="card-soft" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--brand-black)' }}>
            Oturum Karşılaştırma Raporu (5 Strateji Canlı Sonuçları)
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Herhangi bir stratejinin üzerine tıklayarak veya "İncele" butonuna basarak o testin kullanıcı dökümünü aşağıda açabilirsiniz.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => exportSessionComparisonPdf(sessionResults)}
            className="btn-modern btn-black"
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            title="5 stratejinin karşılaştırma tablosunu ve mimari notlarını PDF olarak indirir"
          >
            <Download size={14} />
            <span>Oturum Raporunu PDF İndir</span>
          </button>
          <span className="pill pill-dark">
            Tamamlandı ({sessionResults.length} Strateji)
          </span>
        </div>
      </div>

      {/* Interactive Session Table */}
      <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: '0.85rem'
        }}>
          <thead>
            <tr style={{
              background: 'var(--bg-subtle)',
              borderBottom: '1px solid var(--border-light)',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              textTransform: 'uppercase'
            }}>
              <th style={{ padding: '12px 14px' }}>Strateji</th>
              <th style={{ padding: '12px 14px' }}>Satılan / Kota</th>
              <th style={{ padding: '12px 14px' }}>Veri Tutarlılığı</th>
              <th style={{ padding: '12px 14px' }}>Throughput (RPS)</th>
              <th style={{ padding: '12px 14px' }}>Ortalama Süre</th>
              <th style={{ padding: '12px 14px' }}>P95 Gecikme</th>
              <th style={{ padding: '12px 14px' }}>Toplam Süre</th>
              <th style={{ padding: '12px 14px', textAlign: 'right' }}>Kullanıcı Detayı</th>
            </tr>
          </thead>
          <tbody>
            {sessionResults.map((r, idx) => {
              const isOversold = r.successCount > r.targetStockCapacity;
              const isFastest = idx === 4;
              const isSelected = selectedDetailId === r.strategyId;

              return (
                <tr
                  key={r.strategyId}
                  onClick={() => onSelectStrategyDetail && onSelectStrategyDetail(r)}
                  style={{
                    borderBottom: '1px solid var(--border-light)',
                    background: isSelected 
                      ? 'rgba(15, 23, 42, 0.05)' 
                      : (isFastest ? '#f0fdf4' : 'transparent'),
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--brand-black)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isFastest && <Award size={15} color="#059669" />}
                      <span>{r.strategyTitle}</span>
                    </div>
                  </td>

                  <td className="font-mono" style={{ padding: '12px 14px', fontWeight: 700, color: isOversold ? '#e11d48' : 'var(--brand-black)' }}>
                    {r.successCount} / {r.targetStockCapacity} Bilet
                  </td>

                  <td style={{ padding: '12px 14px' }}>
                    <span className={isOversold ? 'pill pill-danger' : 'pill pill-success'}>
                      {isOversold ? 'Çifte Satış (Overselling)' : 'Kusursuz Tutarlılık'}
                    </span>
                  </td>

                  <td className="font-mono" style={{ padding: '12px 14px', fontWeight: 800, color: isFastest ? '#059669' : 'var(--brand-black)' }}>
                    {r.throughputRps.toFixed(2)} req/s
                  </td>

                  <td className="font-mono" style={{ padding: '12px 14px' }}>
                    {r.avgMs.toFixed(1)} ms
                  </td>

                  <td className="font-mono" style={{ padding: '12px 14px' }}>
                    {r.p95Ms.toFixed(1)} ms
                  </td>

                  <td className="font-mono" style={{ padding: '12px 14px' }}>
                    {(r.totalTimeMs / 1000).toFixed(2)}s
                  </td>

                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStrategyDetail && onSelectStrategyDetail(r);
                      }}
                      className={`btn-modern ${isSelected ? 'btn-black' : 'btn-white'}`}
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      <Eye size={12} />
                      <span>{isSelected ? 'Görüntüleniyor' : 'İncele'}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
