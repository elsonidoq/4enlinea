import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/ProfileStore.jsx';
import { track } from '../lib/track.js';
import { clearReturnTo } from '../lib/postLoginReturn.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

export function AuthModal({ onClose, reason }) {
  const { t } = useTranslation();
  const { refetchSession } = useStore();

  function handleDismiss() {
    clearReturnTo();
    onClose();
  }

  return (
    <>
      <div className="sheet-backdrop" onClick={handleDismiss}></div>
      <div className="modal-card">
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
          {reason || t('auth.subtitle')}
        </p>
        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={() => {
            track('signup_initiated', { method: 'google' });
            // full-page nav: in dev, Vite proxy doesn't cover navigation, so target Express directly.
            // In prod/staging, same origin works — Express serves both SPA and API.
            const oauthBase = import.meta.env.DEV ? 'http://localhost:3001' : API;
            window.location.href = `${oauthBase}/api/auth/oauth/google`;
          }}
        >
          {t('auth.continueWithGoogle')}
        </button>
        <button className="btn btn-ghost" onClick={handleDismiss} style={{ marginTop: 8, width: '100%' }}>
          {t('auth.dismiss')}
        </button>
        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={async () => {
              clearReturnTo();
              try {
                await fetch(`${API}/api/auth/anonymous`, { method: 'POST', credentials: 'include' });
              } catch { /* ignore */ }
              onClose();
              refetchSession();
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
