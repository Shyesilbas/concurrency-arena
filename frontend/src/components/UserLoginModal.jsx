import React, { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../api/client';

export default function UserLoginModal({ isOpen, onClose, onLogin, user }) {
  const [email, setEmail] = useState(user ? user.email : 'shyesilbas@gmail.com');
  const [username, setUsername] = useState(user ? user.username : 'serhat_yesilbas');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.loginUser(email, username);
      if (res.ok && res.data) {
        onLogin(res.data);
        onClose();
      } else {
        setErrorMsg(res.message || 'Giriş yapılamadı.');
      }
    } catch (err) {
      console.warn('Backend login fallback to local user session:', err);
      onLogin({
        id: user ? user.id : 1,
        email: email,
        username: username || email.split('@')[0]
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }}>
      <div className="card-soft" style={{
        width: '100%',
        maxWidth: '400px',
        padding: '28px',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)'
          }}
        >
          <X size={18} />
        </button>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--brand-black)' }}>
            Kullanıcı Bilgileri
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Yük testlerinde istek sahibi olarak kullanılacak e-posta adresi.
          </p>
        </div>

        {errorMsg && (
          <div style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            background: '#fff1f2',
            color: '#e11d48',
            fontSize: '0.8rem',
            marginBottom: '16px'
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
              E-Posta Adresi
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="shyesilbas@gmail.com"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-surface)',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
              Kullanıcı Adı (Opsiyonel)
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="serhat_yesilbas"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-surface)',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-modern btn-black"
            style={{ width: '100%', padding: '10px', marginTop: '6px' }}
          >
            {loading ? 'Kaydediliyor...' : 'Kaydet ve Devam Et'}
          </button>
        </form>
      </div>
    </div>
  );
}
