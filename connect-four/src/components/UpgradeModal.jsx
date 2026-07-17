import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon.jsx';

export function UpgradeModal({ onDismiss, onUpgrade }) {
  const { t } = useTranslation();
  const [uiState, setUiState] = useState('idle'); // idle | loading | success

  async function handleUpgrade() {
    setUiState('loading');
    try {
      await onUpgrade?.();
      setUiState('success');
    } catch {
      setUiState('idle');
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onDismiss}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(30,26,20,0.34)', zIndex: 50,
          animation: 'fade .25s',
        }}
      />

      {/* Bottom sheet */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 51,
        background: '#fff', colorScheme: 'light', borderRadius: '28px 28px 0 0',
        padding: '8px 20px 36px',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
        animation: 'slideUp .34s cubic-bezier(.2,.9,.3,1.05)',
      }}>
        {/* Grab handle */}
        <div style={{ width: 40, height: 5, borderRadius: 3, background: '#e2ddd2', margin: '4px auto 18px' }} />

        {/* Icon */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: '#fdf0d9', display: 'grid', placeItems: 'center',
          margin: '0 auto 14px',
        }}>
          <Icon name="star" size={26} color="#d6892a" />
        </div>

        {/* Heading */}
        <h3 style={{
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21,
          color: 'var(--ink)', textAlign: 'center', margin: '0 0 8px',
        }}>
          {t('upgrade.heading')}
        </h3>

        <p style={{
          color: 'var(--ink-soft)', fontWeight: 600, fontSize: 14,
          margin: '0 0 12px', lineHeight: 1.45, textAlign: 'center',
        }}>
          {t('upgrade.body')}
        </p>

        <p style={{
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18,
          color: 'var(--ink)', textAlign: 'center', margin: '0 0 20px',
        }}>
          {t('upgrade.price')}
        </p>

        {uiState === 'success' ? (
          <div style={{
            background: '#e3f7ea', borderRadius: 14, padding: '16px 18px',
            textAlign: 'center', color: '#1c8a4a',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
          }}>
            {t('upgrade.success')}
          </div>
        ) : (
          <button
            onClick={handleUpgrade}
            disabled={uiState === 'loading'}
            style={{
              width: '100%', padding: '15px 22px', borderRadius: 16, border: 'none',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
              cursor: uiState === 'loading' ? 'not-allowed' : 'pointer',
              background: uiState === 'loading' ? '#c7c2b8' : 'var(--disc-green)',
              color: '#fff',
              boxShadow: uiState === 'loading' ? 'none' : '0 6px 0 #228245',
              transition: 'background .15s',
              marginBottom: 8,
            }}
          >
            {t('upgrade.cta')}
          </button>
        )}

        <button
          onClick={onDismiss}
          style={{
            width: '100%', padding: '12px', borderRadius: 14, border: 'none',
            background: 'rgba(0,0,0,0.05)', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14,
            color: 'var(--ink-soft)',
            marginTop: uiState === 'success' ? 10 : 0,
          }}
        >
          {t('upgrade.dismiss')}
        </button>

        <p style={{
          color: 'var(--ink-soft)', fontWeight: 500, fontSize: 12,
          textAlign: 'center', margin: '12px 0 0', lineHeight: 1.4,
        }}>
          {t('upgrade.tax')}
        </p>

        <p style={{
          textAlign: 'center', margin: '8px 0 0', fontSize: 12, fontWeight: 600,
        }}>
          <a href="/pricing" style={{ color: 'var(--ink-soft)', textDecoration: 'none' }}>{t('upgrade.links_pricing')}</a>
          <span style={{ color: 'var(--ink-soft)', opacity: 0.5, margin: '0 8px' }}>·</span>
          <a href="/terms" style={{ color: 'var(--ink-soft)', textDecoration: 'none' }}>{t('upgrade.links_terms')}</a>
          <span style={{ color: 'var(--ink-soft)', opacity: 0.5, margin: '0 8px' }}>·</span>
          <a href="/refunds" style={{ color: 'var(--ink-soft)', textDecoration: 'none' }}>{t('upgrade.links_refunds')}</a>
        </p>
      </div>
    </>
  );
}
