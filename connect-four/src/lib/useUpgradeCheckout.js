// Spec 045 US3 (contracts/upgrade-flow-frontend.md) — shared checkout-start handler.
//
// All 4 UpgradeModal call sites (PostSetSummaryScreen, SetPickerScreen, SagaScreen,
// DeepRevealPane) need the identical "start a Stripe Checkout session and navigate
// there" behavior. Extracted here so it lives in exactly one place rather than
// being duplicated 4x — see contracts/upgrade-flow-frontend.md.
//
// credentials: 'include' — httpOnly-cookie auth (api-conventions.md); NEVER an
// Authorization header from the client.
const API = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Returns an async (plan) => void handler suitable for UpgradeModal's onUpgrade prop.
 * Starts a Stripe Checkout session for the given plan and performs a full-page
 * navigation to the returned checkoutUrl. Throws on any non-2xx response so callers
 * (UpgradeModal's uiState machine) can fall back to their error/idle state.
 */
export function useUpgradeCheckout() {
  return async function handleUpgrade(plan) {
    const res = await fetch(`${API}/api/stripe/create-checkout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) throw new Error('checkout failed');
    const { checkoutUrl } = await res.json();
    window.location.href = checkoutUrl; // full navigation to Stripe Checkout
  };
}
