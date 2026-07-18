// Spec 050 US2 (contracts/paddle-api.md, Research §9/§11) — shared checkout-start
// handler. Replaces the pre-migration full-page-redirect checkout flow with a
// client-side Paddle.js overlay (`Paddle.Checkout.open`) — the user never
// leaves the app (FR-003).
//
// All UpgradeModal call sites (PostSetSummaryScreen, SetPickerScreen, SagaScreen,
// SettingsScreen, DeepRevealPane) need the identical "start a Paddle Checkout
// and open the overlay" behavior. Extracted here so it lives in exactly one
// place — see contracts/paddle-api.md.
//
// credentials: 'include' — httpOnly-cookie auth (api-conventions.md); NEVER an
// Authorization header from the client.
import { useStore } from '../store/ProfileStore.jsx';
import { setCheckoutReturnState } from './checkoutReturnFlow.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

// Dispatched on the window when the Paddle overlay closes/errors without a
// completed payment, so any mounted UpgradeModal can reset its local
// 'loading' uiState back to 'idle' (see eventCallback below).
export const PADDLE_CHECKOUT_DISMISSED_EVENT = 'paddle:checkout-dismissed';

// initializePaddle must run at most once per page load (the SDK warns and
// refuses on a second call — paddle:checkout-web skill's "Common pitfalls").
// Module-level singleton promise guards that, and also registers the ONE
// eventCallback that owns checkout.completed handling for the whole app
// (Research §11: this handler is the sole owner of `transactionId` and the
// sole caller of /api/paddle/verify-transaction).
let paddlePromise = null;

async function getPaddle() {
  if (!paddlePromise) {
    paddlePromise = (async () => {
      const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
      if (!token) return null; // Paddle not configured — createCheckout also 503s.
      const { initializePaddle } = await import('@paddle/paddle-js');
      // Paddle.js defaults to PRODUCTION (the footgun CLAUDE.md and research.md
      // §9 both call out) — default to sandbox unless explicitly built for
      // production, matching this codebase's only frontend env convention
      // (import.meta.env.MODE / VITE_* — no NEXT_PUBLIC_*-style var exists).
      const environment = import.meta.env.MODE === 'production' ? 'production' : 'sandbox';
      return initializePaddle({
        token,
        environment,
        eventCallback: (event) => {
          if (event.name === 'checkout.completed') {
            handleCheckoutCompleted(event.data.transaction_id);
          } else if (event.name === 'checkout.closed' || event.name === 'checkout.error') {
            // Found in QA: UpgradeModal.jsx sets uiState to 'loading' before
            // opening the overlay and only ever leaves 'loading' via
            // checkout.completed. If the user closes the overlay without
            // paying (Edge Case, spec.md) — or Paddle itself can't open it
            // (OI-54) — no event reached the modal, so its "Become Pro"
            // button stayed disabled/stuck in 'loading' forever for the rest
            // of the session. Bounce a DOM event the modal listens for to
            // reset itself to 'idle'.
            window.dispatchEvent(new CustomEvent(PADDLE_CHECKOUT_DISMISSED_EVENT));
          }
        },
      });
    })();
  }
  return paddlePromise;
}

// Sole caller of /api/paddle/verify-transaction anywhere in the frontend
// (Research §11). Writes confirming -> activated|failed into
// checkoutReturnFlow.js's shared store; CheckoutReturnBanner.jsx only renders
// it. Never silently leaves the user on the free-tier UI while this resolves
// (FR-005/SC-003) — the store starts at 'confirming' the instant the event
// fires, before the network call even completes.
async function handleCheckoutCompleted(transactionId) {
  setCheckoutReturnState('confirming');
  try {
    const res = await fetch(`${API}/api/paddle/verify-transaction`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId }),
    });
    const result = res.ok ? await res.json() : { activated: false };
    setCheckoutReturnState(result.activated ? 'activated' : 'failed');
  } catch {
    setCheckoutReturnState('failed');
  }
}

/**
 * Returns an async (plan) => void handler suitable for UpgradeModal's onUpgrade prop.
 * Fetches a Paddle checkout config for the given plan and opens the Paddle.js
 * overlay in-app (no navigation away, FR-003). Throws on any non-2xx response
 * or when Paddle isn't configured, so callers (UpgradeModal's uiState machine)
 * can fall back to their error/idle state — same contract as before the
 * migration (FR-011: UpgradeModal's onUpgrade idle/loading/success contract is
 * unchanged).
 *
 * @param {string} [returnPathOverride] Relative path the Paddle checkout's
 *   successUrl should point back to. Defaults to the current screen's
 *   pathname. Callers on a SESSION_ONLY screen that can't be cold-booted
 *   (e.g. PostSetSummaryScreen at /summary) pass a cold-bootable path like
 *   '/setpicker' instead.
 */
export function useUpgradeCheckout(returnPathOverride) {
  const { session } = useStore();

  return async function handleUpgrade(plan) {
    const returnPath = returnPathOverride || window.location.pathname || '/';
    const res = await fetch(`${API}/api/paddle/create-checkout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, returnPath }),
    });
    if (!res.ok) throw new Error('checkout failed');
    // Server-returned values passed through verbatim — never client-recomputed
    // (contracts/paddle-api.md). The server returns a sanitized same-origin
    // RELATIVE path (open-redirect guard, sanitizeReturnPath); Paddle.js's
    // settings.successUrl requires an ABSOLUTE http(s):// URL and throws a
    // synchronous validation error otherwise ("[PADDLE BILLING] The value for
    // successUrl is not valid" — verified against the real SDK, not assumed).
    // Resolving against window.location.origin only makes it absolute — it
    // does not re-decide *which* path is safe; that decision stays server-side.
    const { priceId, customerEmail, successUrl } = await res.json();
    const absoluteSuccessUrl = new URL(successUrl, window.location.origin).toString();

    const paddle = await getPaddle();
    if (!paddle) throw new Error('checkout unavailable');

    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      // Paddle.js throws SYNCHRONOUSLY ("customer ID or email is required") when
      // `customer.email` is present but falsy (verified against the real SDK) —
      // req.user.email is always undefined today (OI-53), so passing
      // `customer: { email: customerEmail }` unconditionally threw on every
      // real checkout attempt, and UpgradeModal's onUpgrade catch{} swallowed
      // it silently (no overlay, no console error, no user-visible failure).
      // Omit `customer` entirely when there's no email so Paddle's own overlay
      // collects it instead — only include it when we actually have one.
      ...(customerEmail ? { customer: { email: customerEmail } } : {}),
      customData: { app_user_id: session?.user?.id },
      settings: { successUrl: absoluteSuccessUrl },
    });
  };
}
