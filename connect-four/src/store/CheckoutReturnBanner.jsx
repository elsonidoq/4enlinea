// Spec 045 US3 (T029, contracts/upgrade-flow-frontend.md) — handles the
// ?checkout=success | ?checkout=cancelled return from Stripe Checkout.
//
// Mounted once at the app root (App.jsx's Navigator, inside ProfileStoreProvider so
// useStore() works), NOT inside UpgradeModal: Checkout is a full-page redirect, so
// any UpgradeModal that was open before the user left is already gone by the time
// they land back here.
//
// Poll state machine lives in ../lib/checkoutReturnFlow.js (plain JS, unit-tested
// directly). This component supplies the real checkPaid (refetchSession +
// store.getProfile()) and renders the 3 states (FR-012/FR-013/SC-004):
//   polling  -> "activating your subscription…" banner (never the bare free screen)
//   resolved -> nothing (paid UI is just whatever screen the user is on, now paid)
//   timeout  -> "payment received — still activating" + manual refresh button
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from './ProfileStore.jsx';
import { runCheckoutPoll } from '../lib/checkoutReturnFlow.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

/** Synchronous activation fallback: confirm the just-completed Checkout Session
 * with the server so a dropped/delayed webhook can't strand a paying user at
 * "still activating". Best-effort — the poll (+ the webhook itself) still cover
 * activation if this fails, so we swallow errors. credentials:'include' for the
 * httpOnly-cookie auth (api-conventions.md). */
async function verifyCheckoutSession(sessionId) {
  if (!sessionId) return;
  try {
    await fetch(`${API}/api/stripe/verify-session`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
  } catch {
    /* ignore — poll + webhook remain as backstops */
  }
}

/** Strip `?checkout=...` from the URL while preserving path, other query params, and
 * the hash — App.jsx:31 relies on the hash surviving replaceState for the magic-link
 * OAuth callback flow, and that trap applies here too. */
function stripCheckoutParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete('checkout');
  url.searchParams.delete('session_id');
  const search = url.searchParams.toString();
  const newPath = url.pathname + (search ? `?${search}` : '') + window.location.hash;
  window.history.replaceState(window.history.state, '', newPath);
}

export function CheckoutReturnBanner() {
  const { t } = useTranslation();
  const { store, refetchSession } = useStore();
  const [state, setState] = useState('idle'); // idle | polling | activated | timeout
  const startedRef = useRef(false);
  // Always read the LATEST store/refetchSession from the poll's async closure —
  // refetchSession can swap the store instance (IndexedDBStore -> SupabaseStore)
  // mid-poll, and a stale closure would keep querying the wrong one.
  const storeRef = useRef(store);
  const refetchRef = useRef(refetchSession);
  useEffect(() => { storeRef.current = store; }, [store]);
  useEffect(() => { refetchRef.current = refetchSession; }, [refetchSession]);

  async function checkPaid() {
    await refetchRef.current?.();
    const currentStore = storeRef.current;
    if (!currentStore) return false;
    try {
      const profile = await currentStore.getProfile();
      return profile?.tier === 'paid';
    } catch {
      return false;
    }
  }

  function startPoll() {
    runCheckoutPoll({ checkPaid, onState: setState });
  }

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    const sessionId = params.get('session_id');
    if (!checkout) return;

    stripCheckoutParam();

    if (checkout === 'success') {
      // Confirm the session server-side FIRST (flips tier synchronously if the
      // webhook hasn't), THEN poll — so the first poll attempt already sees paid.
      verifyCheckoutSession(sessionId).finally(startPoll);
    }
    // 'cancelled': strip the param only — free tier, no banner, no error, retryable.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (state === 'idle' || state === 'activated') return null;

  return (
    <div
      role="status"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        padding: '10px 16px', textAlign: 'center',
        background: state === 'timeout' ? '#fdf0d9' : '#e3f7ea',
        color: state === 'timeout' ? '#8a5a1c' : '#1c8a4a',
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      {state === 'polling' && <span>{t('upgrade.activating', 'Activating your subscription…')}</span>}
      {state === 'timeout' && (
        <>
          <span>{t('upgrade.timeout', 'Payment received — still activating.')}</span>
          <button
            onClick={startPoll}
            style={{
              padding: '4px 12px', borderRadius: 8, border: 'none',
              background: 'var(--disc-green)', color: '#fff',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {t('upgrade.refresh', 'Refresh')}
          </button>
        </>
      )}
    </div>
  );
}
