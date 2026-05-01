import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const API = import.meta.env.VITE_API_BASE_URL || '';

export function PaywallModal({ isOpen, onClose, trigger, session }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleUpgrade(plan) {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan }),
      });
      const { checkoutUrl } = await res.json();
      if (checkoutUrl) window.location.href = checkoutUrl;
    } catch {
      // Stripe not yet wired — show placeholder
    } finally {
      setLoading(false);
    }
  }

  const description =
    trigger === 'quota_exceeded' ? t('paywall.quotaExhausted') :
    trigger === 'coach_access'   ? t('paywall.coachGate') :
    null;

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <button style={closeBtn} onClick={onClose}>✕</button>
        <h2 style={{ marginTop: 0 }}>{t('paywall.title')}</h2>
        {description && <p style={{ color: '#cbd5e0' }}>{description}</p>}
        <ul style={{ color: '#cbd5e0', paddingLeft: 20 }}>
          {t('paywall.benefits', { returnObjects: true }).map((b, i) => (
            <li key={i} style={{ marginBottom: 8 }}>{b}</li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            style={planBtn}
            onClick={() => handleUpgrade('monthly')}
            disabled={loading || !session}
          >
            {t('paywall.monthly')}
          </button>
          <button
            style={{ ...planBtn, background: '#2b6cb0' }}
            onClick={() => handleUpgrade('annual')}
            disabled={loading || !session}
          >
            {t('paywall.annual')}
            <span style={{ display: 'block', fontSize: 11, opacity: 0.8 }}>{t('paywall.annualNote')}</span>
          </button>
        </div>
        {!session && (
          <p style={{ color: '#fc8181', marginTop: 12, fontSize: 13 }}>
            Sign in first to upgrade.
          </p>
        )}
      </div>
    </div>
  );
}

const overlay = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000,
};
const modal = {
  background: '#1a202c',
  color: '#fff',
  borderRadius: 12,
  padding: 32,
  maxWidth: 420,
  width: '90%',
  position: 'relative',
};
const closeBtn = {
  position: 'absolute', top: 12, right: 16,
  background: 'none', border: 'none', color: '#fff',
  fontSize: 18, cursor: 'pointer',
};
const planBtn = {
  flex: 1, padding: '12px 8px', borderRadius: 8,
  background: '#2d3748', color: '#fff', border: '1px solid #4a5568',
  cursor: 'pointer', fontWeight: 600, fontSize: 15,
};
