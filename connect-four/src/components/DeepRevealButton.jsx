import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthModal } from './AuthModal.jsx';
import { PaywallModal } from './PaywallModal.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { track } from '../lib/track.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

export function DeepRevealButton({ moves, candidateCol, onReveal }) {
  const { t } = useTranslation();
  const { session } = useStore();
  const [showAuth, setShowAuth] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [deepReveal, setDeepReveal] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!session) {
      setShowAuth(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/explain-move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ moves, candidateCol, requestDeepReveal: true }),
      });

      if (res.status === 403) { setShowAuth(true); return; }
      if (res.status === 429) {
        setShowPaywall(true);
        track('paywall_viewed', { trigger: 'quota_exceeded' });
        return;
      }

      const data = await res.json();
      if (data.deepReveal) {
        setDeepReveal(data.deepReveal);
        onReveal?.(data.deepReveal);
        track('deep_reveal_viewed', { candidateCol });
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  if (deepReveal) {
    return (
      <div style={revealBox}>
        {deepReveal.patternTag && (
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 5 }}>
            {deepReveal.patternTag.replace(/_/g, ' ')}
          </div>
        )}
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text)' }}>{deepReveal.fullText}</p>
      </div>
    );
  }

  return (
    <>
      <button onClick={handleClick} disabled={loading} style={loading ? { ...btn, opacity: 0.6 } : btn}>
        {loading ? '…' : t('puzzle.seeWhy')}
      </button>
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        reason={t('auth.deepRevealGate')}
      />
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="quota_exceeded"
        session={session}
      />
    </>
  );
}

const btn = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  padding: '13px 20px',
  borderRadius: 'var(--radius-sm)',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  border: '1.5px solid var(--border)',
  background: 'transparent',
  color: 'var(--text)',
  fontFamily: 'inherit',
  marginTop: 8,
};

const revealBox = {
  padding: '12px 14px',
  background: 'var(--surface)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  borderLeft: '3px solid var(--teal)',
  marginTop: 8,
};
