import React from 'react';
import { RotateCcw, Music } from 'lucide-react';

export default function ConcertCard({ concert, onReset, loading }) {
  if (!concert) return null;

  const total = concert.totalCapacity || 100;
  const available = concert.availableSeats !== undefined ? concert.availableSeats : 100;
  const percentage = Math.max(0, Math.min(100, Math.round((available / total) * 100)));
  const sold = total - available;

  return (
    <div className="card-soft" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'var(--bg-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--brand-black)'
          }}>
            <Music size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--brand-black)' }}>{concert.name}</h2>
              <span className="pill pill-dark">{concert.artist}</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Konser ID: #{concert.id} • DB Sürümü: {concert.version ?? 0}
            </p>
          </div>
        </div>

        {/* Quick Capacity Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '4px' }}>Stoku Ayarla:</span>
          <button
            onClick={() => onReset(1)}
            disabled={loading}
            className="btn-modern btn-white"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            1 Bilet
          </button>
          <button
            onClick={() => onReset(5)}
            disabled={loading}
            className="btn-modern btn-white"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            5 Bilet
          </button>
          <button
            onClick={() => onReset(100)}
            disabled={loading}
            className="btn-modern btn-black"
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            <RotateCcw size={13} />
            <span>100 Bilet (Sıfırla)</span>
          </button>
        </div>
      </div>

      {/* Progress Bar & Seat Counts */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Kalan Koltuk:</span>
          <span className="font-mono" style={{ fontWeight: 700, color: 'var(--brand-black)' }}>
            {available} / {total} Koltuk ({percentage}%)
          </span>
        </div>

        <div style={{
          width: '100%',
          height: '8px',
          background: 'var(--bg-subtle)',
          borderRadius: '9999px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${percentage}%`,
            background: 'var(--brand-black)',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>
      </div>

      {/* 4 Clean State Counters */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '12px',
        padding: '14px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-subtle)'
      }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>PostgreSQL Koltuk</span>
          <span className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-black)' }}>
            {available}
          </span>
        </div>

        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Redis Stok</span>
          <span className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-black)' }}>
            {concert.redisStock !== null && concert.redisStock !== undefined ? concert.redisStock : '-'}
          </span>
        </div>

        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Satılan Bilet</span>
          <span className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-black)' }}>
            {concert.totalTickets ?? sold}
          </span>
        </div>

        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Oluşan Sipariş</span>
          <span className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-black)' }}>
            {concert.totalOrders ?? sold}
          </span>
        </div>
      </div>
    </div>
  );
}
