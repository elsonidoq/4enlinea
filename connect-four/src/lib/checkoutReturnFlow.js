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
  // Snapshot before iterating: a listener may call resetCheckoutReturnState()
  // synchronously (see subscribeCheckoutReturn's doc) while this forEach is
  // still running — without the snapshot, later listeners in the same pass
  // would read the already-reset `state` instead of the value just broadcast.
  const snapshot = state;
  listeners.forEach((fn) => fn(snapshot));
}

/**
 * Subscribes to state changes and immediately replays the CURRENT state to
 * the new listener before returning. Found in QA (2026-07-18): a component's
 * subscription effect can (re)mount after `checkout.completed` already fired
 * — e.g. `UpgradeModal.jsx`'s 5 call sites subscribe once on mount with no
 * dependency on whether a checkout is in flight — and without this replay,
 * that listener silently misses the one-shot 'activated'/'failed' broadcast
 * forever (the tier still flips server-side via the webhook/verifyTransaction
 * call, which don't depend on any UI listener, so the account still ends up
 * Pro — but the modal never learns about it and never auto-dismisses,
 * matching the reported "stuck in idle" bug exactly). See docs/open_issues.md
 * OI-59 (now resolved) for the failure this fixes.
 *
 * Note this WILL immediately invoke `fn('idle')` if nothing is in flight —
 * harmless for every current consumer (they only act on 'activated'/'failed'),
 * but worth knowing if a future consumer treats 'idle' as meaningful on
 * receipt rather than as a no-op default.
 *
 * Returns an unsubscribe function.
 * @param {(state: CheckoutReturnState) => void} fn
 */
export function subscribeCheckoutReturn(fn) {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

/**
 * Resets the store to 'idle'. Call this once a subscriber has consumed a
 * terminal 'activated'/'failed' state (updated its own local UI) so the
 * shared singleton doesn't keep replaying that same stale outcome to some
 * later, unrelated subscriber (e.g. a completely different upgrade attempt
 * opened much later) via subscribeCheckoutReturn's immediate-replay above.
 * Also used directly by tests to reset the singleton between cases.
 */
export function resetCheckoutReturnState() {
  state = 'idle';
}
