import React from 'react';

const BENCHMARK_HISTORY = [
  {
    strategy: '01. Naive (Korumasız)',
    status: '200 OK',
    consistency: '89 Koltuk Kayıp (Lost Update)',
    avgLatency: '1.18s',
    p95Latency: '1.53s',
    throughput: '59.16 req/s',
    totalTime: '1.7s'
  },
  {
    strategy: '02. Pessimistic Lock',
    status: '200 OK',
    consistency: '0 Koltuk (Kusursuz)',
    avgLatency: '1.63s',
    p95Latency: '2.39s',
    throughput: '38.70 req/s',
    totalTime: '2.6s'
  },
  {
    strategy: '03. Optimistic Lock',
    status: '200 OK',
    consistency: '0 Koltuk (Kusursuz)',
    avgLatency: '1.68s',
    p95Latency: '2.51s',
    throughput: '34.74 req/s',
    totalTime: '2.9s'
  },
  {
    strategy: '04. Redis Lua Scripting',
    status: '200 OK',
    consistency: '0 Koltuk (Kusursuz)',
    avgLatency: '1.45s',
    p95Latency: '2.17s',
    throughput: '42.34 req/s',
    totalTime: '2.4s'
  },
  {
    strategy: '05. Kafka Event-Driven',
    status: '202 Accepted',
    consistency: '0 Koltuk (Kusursuz)',
    avgLatency: '0.55s (559 ms)',
    p95Latency: '0.57s (572 ms)',
    throughput: '139.85 req/s (Lider)',
    totalTime: '0.7s (700 ms)'
  }
];

export default function BenchmarkSummaryTable() {
  return (
    <div className="panel" style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-black)' }}>
          5 Eşzamanlılık Stratejisinin Büyük Kıyaslaması
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          100 VU Burst Spike yük altında elde edilen resmi k6 benchmark test raporlarının özeti.
        </p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: '0.85rem'
        }}>
          <thead>
            <tr style={{
              borderBottom: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              textTransform: 'uppercase'
            }}>
              <th style={{ padding: '10px 12px' }}>Strateji</th>
              <th style={{ padding: '10px 12px' }}>HTTP Yanıtı</th>
              <th style={{ padding: '10px 12px' }}>Veri Tutarlılığı</th>
              <th style={{ padding: '10px 12px' }}>Ortalama Süre</th>
              <th style={{ padding: '10px 12px' }}>P95 Gecikme</th>
              <th style={{ padding: '10px 12px' }}>Throughput</th>
              <th style={{ padding: '10px 12px' }}>Toplam Süre</th>
            </tr>
          </thead>
          <tbody>
            {BENCHMARK_HISTORY.map((row, idx) => {
              const isLeader = idx === 4;
              return (
                <tr
                  key={row.strategy}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    background: isLeader ? 'var(--bg-secondary)' : 'transparent',
                    fontWeight: isLeader ? 600 : 400
                  }}
                >
                  <td style={{ padding: '12px', color: 'var(--color-black)' }}>{row.strategy}</td>
                  <td style={{ padding: '12px' }}>
                    <span className="badge badge-outline">{row.status}</span>
                  </td>
                  <td style={{ padding: '12px', color: row.consistency.includes('Kayıp') ? '#dc2626' : 'var(--text-primary)' }}>
                    {row.consistency}
                  </td>
                  <td className="font-mono" style={{ padding: '12px' }}>{row.avgLatency}</td>
                  <td className="font-mono" style={{ padding: '12px' }}>{row.p95Latency}</td>
                  <td className="font-mono" style={{ padding: '12px', fontWeight: 700, color: 'var(--color-black)' }}>
                    {row.throughput}
                  </td>
                  <td className="font-mono" style={{ padding: '12px' }}>{row.totalTime}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
