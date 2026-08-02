// Spec 053 US5 (T058-T060, data-model.md "Preserved set results", OI-25) — the sessionStorage
// carrier that lets PostSetSummaryScreen.jsx survive a Paddle checkout round trip, INCLUDING a
// genuine full app restart, without losing the practice-set results the player was looking at.
//
// T059 investigation record: the ORIGINAL design pointed at checkoutReturnFlow.js's shared
// in-memory `state` (idle|confirming|activated|failed, no payload field) as the carrier — read at
// source, that variable re-initializes to 'idle' on every cold boot and was explicitly ruled
// out (it must not be widened with a payload field; see that file's own header comment on why).
// The "preferred" alternative from tasks.md — thread the nonce through
// `useUpgradeCheckout(returnPathOverride)`'s `returnPath` (sent to `POST
// /api/paddle/create-checkout`, e.g. `/setpicker?resultsNonce=...`) — was investigated and also
// REJECTED: confirmed at source (`src/lib/useUpgradeCheckout.js`'s `handleCheckoutCompleted`)
// that `successUrl` is deliberately never passed to `Paddle.Checkout.open()` — the overlay is
// closed in-place once `verify-transaction` resolves, and nothing else in the app ever navigates
// to a Paddle-supplied return URL. A nonce embedded in `returnPath` would be written to the
// server and then read by nothing on the way back — a carrier that looks plausible but is never
// read. CHOSEN INSTEAD (the "acceptable alternative"): this module's sessionStorage entry
// self-validates via a freshness timestamp only, with zero coupling to checkoutReturnFlow.js or
// any checkout returnPath. Do not reintroduce the returnPath/nonce coupling.

const KEY = 'pendingSetResults';

// Generous purchase-flow window (device unlock, app-switch, a slow bank auth step can all eat
// real wall-clock time) but bounded so a genuinely stale entry from an abandoned tab/session is
// never resurrected into an unrelated later summary screen.
export const PENDING_SET_RESULTS_MAX_AGE_MS = 30 * 60 * 1000;

/**
 * Persists the in-flight set results before a purchase starts (T058). Call this synchronously,
 * before `Paddle.Checkout.open()`.
 * @param {{ results: unknown[], category: string }} payload
 */
export function savePendingSetResults({ results, category }) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({
      nonce: crypto.randomUUID(),
      results,
      category,
      savedAt: Date.now(),
    }));
  } catch {
    // sessionStorage unavailable (private browsing quota, etc.) — non-fatal; the caller's
    // existing '/setpicker' fallback (FR-031) covers this on return, same as a missing entry.
  }
}

function readRaw() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed
      || typeof parsed !== 'object'
      || !Array.isArray(parsed.results)
      || typeof parsed.category !== 'string'
      || typeof parsed.savedAt !== 'number'
      || typeof parsed.nonce !== 'string'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isFresh(parsed, now) {
  const age = now - parsed.savedAt;
  return age >= 0 && age <= PENDING_SET_RESULTS_MAX_AGE_MS;
}

/**
 * Non-destructive freshness check — used by App.jsx's boot routing to decide whether a cold
 * boot should be allowed to land on `summary` at all (see that file's comment). Does NOT clear
 * the entry; PostSetSummaryScreen.jsx's own mount effect (readAndClearPendingSetResults) is the
 * sole consumer/clearer.
 * @param {number} [now]
 */
export function hasFreshPendingSetResults(now = Date.now()) {
  const parsed = readRaw();
  return parsed != null && isFresh(parsed, now);
}

/**
 * Reads, validates, and clears the persisted entry (T060 — FR-030). Returns `null` (and clears
 * any stale/invalid entry it finds) if there's nothing usable, so callers can fall straight
 * through to their existing fallback (FR-031) with no extra branching.
 * @param {number} [now]
 * @returns {{ results: unknown[], category: string } | null}
 */
export function readAndClearPendingSetResults(now = Date.now()) {
  const parsed = readRaw();
  clearPendingSetResults();
  if (parsed == null || !isFresh(parsed, now)) return null;
  return { results: parsed.results, category: parsed.category };
}

export function clearPendingSetResults() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // noop
  }
}
