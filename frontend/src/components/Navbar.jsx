import React from 'react';
import { User as UserIcon, Activity } from 'lucide-react';

export default function Navbar({ user, onOpenLogin }) {
  return (
    <header style={{
      background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-light)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{
        maxWidth: '1140px',
        margin: '0 auto',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: 'var(--brand-black)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.95rem',
            borderRadius: '10px'
          }}>
            CA
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-black)', lineHeight: '1.2' }}>
              Concurrency Arena
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Flash-Sale & Eşzamanlı Rezervasyon Test Laboratuvarı
            </p>
          </div>
        </div>

        {/* User Button */}
        <div>
          {user ? (
            <button 
              onClick={onOpenLogin}
              className="btn-modern btn-white"
              style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            >
              <UserIcon size={14} color="var(--text-muted)" />
              <span style={{ fontWeight: 600 }}>{user.username}</span>
            </button>
          ) : (
            <button 
              onClick={onOpenLogin}
              className="btn-modern btn-black"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <UserIcon size={14} />
              <span>Giriş Yap</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
