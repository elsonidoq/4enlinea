import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon.jsx';

// Spec 045 US3 (contracts/upgrade-flow-frontend.md, T023) — additive: onUpgrade now
// takes a plan ('monthly'|'annual') and two new uiState values exist
// ('activating'/'timeout'). The real post-payment return-flow poll (bounded-wait,
// [0,2,4,7,10]s) lives OUTSIDE this component in CheckoutReturnBanner.jsx — a full
// Stripe Checkout redirect is a full-page navigation, so any UpgradeModal instance
// that was open pre-checkout is gone by the time the user returns; that flow can't
// rely on this modal's local state surviving. `uiState`/`onUiStateChange` below are
// an optional controlled-mode escape hatch for a caller that DOES want to drive
// activating/timeout into a still-mounted modal (e.g. a resumed session) — no
// existing call site uses it today, so nothing here is a breaking change.
export function UpgradeModal({ onDismiss, onUpgrade, uiState: controlledUiState, onUiStateChange }) {
  const { t } = useTranslation();
  // idle | loading | success | activating | timeout
  const [internalUiState, setInternalUiState] = useState('idle');
  const uiState = controlledUiState ?? internalUiState;
  const setUiState = onUiStateChange ?? setInternalUiState;
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  async function handleUpgrade() {
    setUiState('loading');
    try {
      await onUpgrade?.(selectedPlan);
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
          margin: '0 0 20px', lineHeight: 1.45, textAlign: 'center',
        }}>
          {t('upgrade.body')}
        </p>

        {uiState === 'success' ? (
          <div style={{
            background: '#e3f7ea', borderRadius: 14, padding: '16px 18px',
            textAlign: 'center', color: '#1c8a4a',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
          }}>
            {t('upgrade.success')}
          </div>
        ) : uiState === 'activating' ? (
          <div style={{
            background: '#fdf0d9', borderRadius: 14, padding: '16px 18px',
            textAlign: 'center', color: '#8a5a1c',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
          }}>
            {t('upgrade.activating', 'Activating your subscription…')}
          </div>
        ) : uiState === 'timeout' ? (
          <div style={{
            background: '#fdf0d9', borderRadius: 14, padding: '16px 18px',
            textAlign: 'center', color: '#8a5a1c',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 10 }}>
              {t('upgrade.timeout', 'Payment received — still activating.')}
            </div>
            <button
              onClick={handleUpgrade}
              style={{
                padding: '8px 16px', borderRadius: 10, border: 'none',
                background: 'var(--disc-green)', color: '#fff',
                fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {t('upgrade.refresh', 'Refresh')}
            </button>
          </div>
        ) : (
          <>
            {/* Monthly / annual segmented toggle */}
            <div style={{
              display: 'flex', background: 'rgba(0,0,0,0.05)', borderRadius: 14,
              padding: 4, marginBottom: 14, gap: 4,
            }}>
              {['monthly', 'annual'].map((plan) => (
                <button
                  key={plan}
                  onClick={() => setSelectedPlan(plan)}
                  disabled={uiState === 'loading'}
                  aria-pressed={selectedPlan === plan}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 10, border: 'none',
                    fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14,
                    cursor: uiState === 'loading' ? 'not-allowed' : 'pointer',
                    background: selectedPlan === plan ? '#fff' : 'transparent',
                    color: selectedPlan === plan ? 'var(--ink)' : 'var(--ink-soft)',
                    boxShadow: selectedPlan === plan ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                    transition: 'background .15s',
                  }}
                >
                  {plan === 'monthly' ? t('upgrade.planMonthly', 'Monthly') : t('upgrade.planAnnual', 'Annual')}
                </button>
              ))}
            </div>

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
          </>
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
      </div>
    </>
  );
}
