// Epic 8 — Onboarding Experience, US2 (T027, research.md R5).
//
// Pure, store-agnostic gate factory used by GameScreen.jsx to implement
// FR-005 ("set onboarding_status to 'seen' the first time the user plays a
// move of their own in the onboarding sparring game"). Extracted out of
// GameScreen.jsx so it is unit-testable with plain `node --test` — this
// repo's test runner cannot parse JSX (see onboardingRouting.js's header for
// the same documented constraint/pattern).
//
// This is a simple engagement signal ("a move was played"), NOT
// aha/coach-reaction detection (research.md R5 / spec.md Assumptions):
// useGameBoard.js itself is unmodified and knows nothing about onboarding.
// GameScreen calls the returned gate function immediately before delegating
// to the hook's real handleColumnClick, on every column click; the gate
// itself decides (and enforces) that the profile write only ever fires once.

/**
 * Creates a one-shot "seen" gate for the onboarding sparring game.
 *
 * The returned function is idempotent per gate instance: only the first call
 * while `onboarding` is true fires `updateProfile({ onboarding_status: 'seen' })`
 * (fire-and-forget — errors are swallowed so this never blocks the
 * move/coach-reaction render the user is watching, Constitution V). A
 * closure-held flag stands in for the "local movePlayed ref" the task
 * describes — it never triggers a re-render and never re-fires.
 *
 * @param {{ onboarding: boolean, updateProfile: (patch: object) => Promise<any> }} args
 * @returns {() => boolean} call on every human move; returns true the one
 *   time it actually fires the write, false every other time (including all
 *   calls when `onboarding` is falsy).
 */
export function createOnboardingSeenGate({ onboarding, updateProfile }) {
  let moved = false;
  return function markOnboardingMovePlayed() {
    if (!onboarding || moved) return false;
    moved = true;
    Promise.resolve()
      .then(() => updateProfile({ onboarding_status: 'seen' }))
      .catch(() => {});
    return true;
  };
}
