import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/ProfileStore.jsx';
import { track } from '../lib/track.js';
import { clearReturnTo } from '../lib/postLoginReturn.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

export function AuthModal({ onClose, reason }) {
  const { t } = useTranslation();
  const { refetchSession } = useStore();
  const [devError, setDevError] = useState(null);

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
              // Task 21 fix (finding 18): this button COMPLETES sign-in (dev-only stand-in for
              // Google OAuth) — it must NOT clear a stashed post-login destination the way
              // handleDismiss does. Doing so silently discarded the import-offer accept's
              // stashReturnTo('settings') before App.jsx's session-effect could consume it,
              // stranding the user back on this screen after "signing in".
              //
              // fetch() only REJECTS on a network-level failure — a 400/503 from
              // /api/auth/anonymous resolves normally. A bare try/catch therefore made a failed
              // dev sign-in (e.g. local Supabase not running: 400 {"error":"fetch failed"})
              // indistinguishable from a successful one: the modal closed, refetchSession()
              // found no cookie, and the user stayed signed out with nothing on screen.
              setDevError(null);
              let failure = null;
              try {
                const res = await fetch(`${API}/api/auth/anonymous`, { method: 'POST', credentials: 'include' });
                if (!res.ok) {
                  const body = await res.json().catch(() => ({}));
                  failure = `${res.status} ${body.error || res.statusText}`;
                }
              } catch (err) {
                failure = err?.message || 'network error';
              }
              if (failure) {
                console.error('[dev skip-auth] POST /api/auth/anonymous failed:', failure);
                setDevError(`Dev sign-in failed: ${failure}. Is local Supabase running? (supabase start)`);
                return;
              }
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
        {import.meta.env.DEV && devError && (
          <p style={{ marginTop: 8, color: 'var(--danger, #c0392b)', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
            {devError}
          </p>
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
