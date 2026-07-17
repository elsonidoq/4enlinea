// Spec 045 US3 (FR-015/R4, contracts/upgrade-flow-frontend.md) — bounded-wait poll
// state machine for the post-Stripe-Checkout return flow (?checkout=success).
//
// Pure logic, no DOM/React — kept importable by plain `node:test` (this repo's test
// runner can't parse JSX; see postLoginReturn.js for the same split rationale).
// The CheckoutReturnBanner component (src/store/CheckoutReturnBanner.jsx) supplies
// the real checkPaid (ProfileStore.refetchSession + store.getProfile()) and sleepFn
// (setTimeout); tests inject fakes.

// Absolute offsets, in seconds, from poll start (FR-015/R4): 5 attempts, ~10s budget.
export const POLL_SCHEDULE_SECONDS = [0, 2, 4, 7, 10];

/** Convert absolute offsets into the wait BEFORE each attempt (first is always 0). */
function deltasFromSchedule(schedule) {
  return schedule.map((t, i) => (i === 0 ? t : t - schedule[i - 1]));
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs the bounded-wait poll. Calls `onState` with one of:
 *   'polling'   — emitted once, immediately, before the first attempt
 *   'activated' — checkPaid() resolved truthy at some attempt
 *   'timeout'   — the schedule was exhausted without checkPaid() resolving truthy
 *
 * @param {Object} opts
 * @param {() => Promise<boolean>} opts.checkPaid - resolves true once tier === 'paid'
 * @param {(state: 'polling'|'activated'|'timeout') => void} [opts.onState]
 * @param {number[]} [opts.schedule] - absolute offsets in seconds (default POLL_SCHEDULE_SECONDS)
 * @param {(ms: number) => Promise<void>} [opts.sleepFn]
 * @returns {Promise<'activated'|'timeout'>}
 */
export async function runCheckoutPoll({
  checkPaid,
  onState,
  schedule = POLL_SCHEDULE_SECONDS,
  sleepFn = defaultSleep,
}) {
  onState?.('polling');
  const deltas = deltasFromSchedule(schedule);

  for (const deltaSec of deltas) {
    if (deltaSec > 0) await sleepFn(deltaSec * 1000);
    const paid = await checkPaid();
    if (paid) {
      onState?.('activated');
      return 'activated';
    }
  }

  onState?.('timeout');
  return 'timeout';
}
