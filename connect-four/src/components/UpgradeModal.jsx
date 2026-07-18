import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon.jsx';
import { usePaddlePrices, formatPrice, computeAnnualSavings } from '../lib/usePaddlePrices.js';
import { PADDLE_CHECKOUT_DISMISSED_EVENT } from '../lib/useUpgradeCheckout.js';

// Spec 045 US3 (contracts/upgrade-flow-frontend.md, T023) — additive: onUpgrade now
// takes a plan ('monthly'|'annual') and two new uiState values exist
// ('activating'/'timeout'). The real post-payment confirmation lives OUTSIDE this
// component in CheckoutReturnBanner.jsx, which is a pure renderer of
// checkoutReturnFlow.js's single-check store (idle/confirming/activated/failed —
// spec 050 collapsed the old bounded-wait poll model entirely). Even though the
// Paddle.js overlay checkout (spec 050) never navigates away from the app,
// `checkout.completed`'s verify-transaction call still resolves asynchronously
// after this modal may already have been dismissed; that flow can't rely on this
// modal's local state surviving. `uiState`/`onUiStateChange` below are
// an optional controlled-mode escape hatch for a caller that DOES want to drive
// activating/timeout into a still-mounted modal (e.g. a resumed session) — no
// existing call site uses it today, so nothing here is a breaking change.
export function UpgradeModal({ onDismiss, onUpgrade, uiState: controlledUiState, onUiStateChange }) {
  const { t, i18n } = useTranslation();
  const prices = usePaddlePrices();
  // idle | loading | success | activating | timeout
  const [internalUiState, setInternalUiState] = useState('idle');
  const uiState = controlledUiState ?? internalUiState;
  const setUiState = onUiStateChange ?? setInternalUiState;
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  // D3: derived from live prices — never hardcoded — so the badge can't drift
  // from Paddle. null (renders nothing) when prices haven't loaded yet, only
  // one plan is configured, currencies mismatch, or annual isn't actually a
  // saving.
  const savings = computeAnnualSavings(prices);

  async function handleUpgrade() {
    setUiState('loading');
    try {
      await onUpgrade?.(selectedPlan);
      // onUpgrade opens the Paddle.js checkout overlay (no page navigation), so
      // stay in 'loading' until the overlay's own flow resolves — never flash
      // "You're now Pro" before the user has actually paid. The real post-payment
      // 'success'/paid state is driven by CheckoutReturnBanner once
      // checkout.completed's verify-transaction call resolves.
    } catch {
      setUiState('idle');
    }
  }

  // Found in QA: closing the Paddle overlay (Edge Case, spec.md) or Paddle
  // failing to open it at all (OI-54) never fires checkout.completed, so
  // without this the 'loading' state set above never clears and "Become Pro"
  // stays disabled for the rest of the session. useUpgradeCheckout.js's
  // eventCallback dispatches this on checkout.closed/checkout.error.
  useEffect(() => {
    function handleDismissed() {
      if (uiState === 'loading') setUiState('idle');
    }
    window.addEventListener(PADDLE_CHECKOUT_DISMISSED_EVENT, handleDismissed);
    return () => window.removeEventListener(PADDLE_CHECKOUT_DISMISSED_EVENT, handleDismissed);
  }, [uiState]);

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
              {['monthly', 'annual'].map((plan) => {
                const priceLabel = prices ? formatPrice(prices[plan], i18n.language) : '';
                return (
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
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {plan === 'monthly' ? t('upgrade.planMonthly', 'Monthly') : t('upgrade.planAnnual', 'Annual')}
                      {plan === 'annual' && savings && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: '#fff',
                          background: 'var(--disc-green)', borderRadius: 6,
                          padding: '1px 6px',
                        }}>
                          {t('upgrade.saveBadge', { percent: savings.percent })}
                        </span>
                      )}
                    </span>
                    {priceLabel && (
                      <span style={{
                        fontSize: 12, fontWeight: 700,
                        color: selectedPlan === plan ? 'var(--disc-green)' : 'var(--ink-soft)',
                      }}>
                        {priceLabel}
                      </span>
                    )}
                    {plan === 'annual' && savings && (
                      <span style={{ fontSize: 11, color: selectedPlan === plan ? 'var(--ink-soft)' : 'var(--ink-faint)' }}>
                        {t('upgrade.perMonthEquivalent', { price: formatPrice(savings.perMonth, i18n.language) })}
                      </span>
                    )}
                  </button>
                );
              })}
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
