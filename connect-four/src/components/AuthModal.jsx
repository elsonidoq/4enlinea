import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/ProfileStore.jsx';
import { track } from '../lib/track.js';

export function AuthModal({ onClose, reason }) {
  const { t } = useTranslation();
  const { supabase } = useStore();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSend(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (authError) {
        setError(authError.message || t('auth.sendError'));
      } else {
        setSent(true);
        track('signup_initiated', { method: 'magic_link' });
      }
    } catch (err) {
      setError(t('auth.sendError'));
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    setEmail('');
    setSent(false);
  }

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose}></div>
      <div className="modal-card">
        {sent ? (
          <>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--eval-good-bg)',
              display: 'grid', placeItems: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--eval-good)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21, textAlign: 'center', margin: '0 0 8px' }}>
              {t('auth.checkInbox')}
            </h3>
            <p style={{ color: 'var(--ink-soft)', fontWeight: 600, fontSize: 14, margin: '0 0 18px', textAlign: 'center' }}>
              {t('auth.magicLinkSent')}
            </p>
            <button className="btn btn-ghost" onClick={handleBack} style={{ width: '100%' }}>
              {t('auth.dismiss')}
            </button>
          </>
        ) : (
          <>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--disc-green)',
              display: 'grid', placeItems: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21, textAlign: 'center', margin: '0 0 8px' }}>
              {t('auth.signIn')}
            </h3>
            <p style={{ color: 'var(--ink-soft)', fontWeight: 600, fontSize: 14, margin: '0 0 18px', textAlign: 'center' }}>
              {t('auth.subtitle')}
            </p>
            <form onSubmit={handleSend}>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(null); }}
                required
                placeholder="your@email.com"
                style={{
                  border: '1.5px solid var(--line)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  fontSize: 15,
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                  width: '100%',
                  marginBottom: 14,
                  boxSizing: 'border-box',
                }}
              />
              {error && (
                <p style={{ color: 'var(--eval-bad)', fontSize: 13, fontWeight: 600, margin: '0 0 10px', textAlign: 'center' }}>
                  {error}
                </p>
              )}
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
                {t('auth.continueWithEmail')}
              </button>
            </form>
            <button className="btn btn-ghost" onClick={onClose} style={{ marginTop: 8, width: '100%' }}>
              {t('auth.dismiss')}
            </button>
            {import.meta.env.DEV && (
              <button
                type="button"
                onClick={async () => {
                  const { error: e } = await supabase.auth.signInAnonymously();
                  if (!e) onClose();
                  else setError(e.message);
                }}
                style={{
                  marginTop: 8, width: '100%', padding: '10px 0',
                  borderRadius: 12, border: '1.5px dashed #aaa',
                  background: 'transparent', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 13,
                  color: 'var(--ink-soft)',
                }}
              >
                🛠 Dev: skip auth
              </button>
            )}
          </>
        )}
      </div>
    </>
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
      {showModal && <AuthModal onClose={() => setShowModal(false)} reason={message} />}
    </>
  );
}
