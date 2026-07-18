// Spec 050 US2 (Research §4/§11, contracts/paddle-api.md) — pure state store for
// the post-Paddle-Checkout confirmation flow.
//
// Collapsed from the pre-migration bounded-wait poll state machine
// ([0,2,4,7,10]s schedule, POLL_SCHEDULE_SECONDS) to single-check states: the
// Paddle.js overlay model has no return-URL round-trip to poll against —
// `checkout.completed` already tells the client synchronously that payment
// succeeded, so the remaining job is exactly one `verify-transaction` call.
//
// Pure logic, no DOM/React, no fetch — kept importable by plain `node:test`
// (this repo's test runner can't parse JSX; see postLoginReturn.js for the
// same split rationale). `src/lib/useUpgradeCheckout.js`'s `checkout.completed`
// event handler is the SOLE WRITER of this store (it owns `transactionId` and
// is the sole caller of `POST /api/paddle/verify-transaction`, Research §11);
// `src/store/CheckoutReturnBanner.jsx` is a pure reader/renderer — it must
// never call `setCheckoutReturnState` itself.

/** @typedef {'idle'|'confirming'|'activated'|'failed'} CheckoutReturnState */

let state = /** @type {CheckoutReturnState} */ ('idle');
const listeners = new Set();

/** Current state — 'idle' until a checkout.completed event starts a confirmation. */
export function getCheckoutReturnState() {
  return state;
}

/**
 * Sets the shared state and notifies subscribers. Only
 * `useUpgradeCheckout.js`'s `checkout.completed` handler should call this.
 * @param {CheckoutReturnState} next
 */
export function setCheckoutReturnState(next) {
  state = next;
  listeners.forEach((fn) => fn(state));
}

/**
 * Subscribes to state changes. Returns an unsubscribe function.
 * @param {(state: CheckoutReturnState) => void} fn
 */
export function subscribeCheckoutReturn(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Test-only: resets the singleton store to 'idle' between test cases. */
export function resetCheckoutReturnState() {
  state = 'idle';
}
