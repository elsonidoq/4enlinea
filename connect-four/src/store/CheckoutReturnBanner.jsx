// Spec 050 US2 (Research §4/§11, contracts/paddle-api.md) — pure renderer of
// ../lib/checkoutReturnFlow.js's shared state.
//
// Mounted once at the app root (App.jsx's Navigator, inside ProfileStoreProvider),
// same placement as before the migration: the Paddle.js overlay can be opened
// from any screen, and any UpgradeModal instance that opened it may already be
// dismissed by the time confirmation resolves.
//
// This component owns NO network/confirmation logic — it does not read
// `transactionId`, does not call `verify-transaction`, and does not decide when
// a checkout started. `src/lib/useUpgradeCheckout.js`'s `checkout.completed`
// event handler is the SOLE WRITER of the shared state (Research §11); this
// component only subscribes and renders it (FR-005/SC-003: never a silent
// free-tier render while confirmation is pending).
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCheckoutReturnState, subscribeCheckoutReturn } from '../lib/checkoutReturnFlow.js';

export function CheckoutReturnBanner() {
  const { t } = useTranslation();
  const [state, setState] = useState(getCheckoutReturnState());

  useEffect(() => subscribeCheckoutReturn(setState), []);

  if (state === 'idle' || state === 'activated') return null;

  return (
    <div
      role="status"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        padding: '10px 16px', textAlign: 'center',
        background: state === 'failed' ? '#fdf0d9' : '#e3f7ea',
        color: state === 'failed' ? '#8a5a1c' : '#1c8a4a',
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      {state === 'confirming' && <span>{t('upgrade.activating', 'Activating your subscription…')}</span>}
      {state === 'failed' && <span>{t('upgrade.timeout', 'Payment received — still activating.')}</span>}
    </div>
  );
}
