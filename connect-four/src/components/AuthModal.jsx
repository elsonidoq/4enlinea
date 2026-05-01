import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/ProfileStore.jsx';
import { track } from '../lib/track.js';

export function AuthModal({ isOpen, onClose, reason }) {
  const { t } = useTranslation();
  const { supabase } = useStore();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSend(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await supabase.auth.signInWithOtp({ email });
      setSent(true);
      track('signup_initiated', { method: 'magic_link' });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <button style={closeBtn} onClick={onClose}>✕</button>
        {reason && <p style={{ color: '#90cdf4', marginTop: 0 }}>{reason}</p>}
        {sent ? (
          <p>{t('auth.checkEmail')}</p>
        ) : (
          <form onSubmit={handleSend}>
            <h2 style={{ marginTop: 0 }}>{t('auth.signIn')}</h2>
            <label style={{ display: 'block', marginBottom: 8 }}>{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={inputStyle}
              placeholder="you@example.com"
            />
            <button type="submit" disabled={loading} style={btnStyle}>
              {t('auth.sendLink')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function AuthGate({ children, message }) {
  const { session } = useStore();
  const [showModal, setShowModal] = useState(false);

  if (session) return children;

  return (
    <>
      <div onClick={() => setShowModal(true)} style={{ cursor: 'pointer' }}>
        {children}
      </div>
      <AuthModal isOpen={showModal} onClose={() => setShowModal(false)} reason={message} />
    </>
  );
}

const overlay = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000,
};
const modal = {
  background: '#1a202c', color: '#fff',
  borderRadius: 12, padding: 32,
  maxWidth: 380, width: '90%', position: 'relative',
};
const closeBtn = {
  position: 'absolute', top: 12, right: 16,
  background: 'none', border: 'none', color: '#fff',
  fontSize: 18, cursor: 'pointer',
};
const inputStyle = {
  width: '100%', padding: '10px 12px',
  borderRadius: 8, border: '1px solid #4a5568',
  background: '#2d3748', color: '#fff',
  fontSize: 15, marginBottom: 16, boxSizing: 'border-box',
};
const btnStyle = {
  width: '100%', padding: '12px',
  borderRadius: 8, background: '#3182ce',
  color: '#fff', border: 'none',
  cursor: 'pointer', fontWeight: 600, fontSize: 15,
};
