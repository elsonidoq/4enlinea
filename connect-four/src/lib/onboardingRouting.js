// Epic 8 — Onboarding Experience, US1 (T018, research.md R3).
//
// Pure decision logic for the first-run auto-route effect, extracted out of
// Navigator (App.jsx) so it is unit-testable with plain `node --test` — this
// repo's test runner cannot parse JSX (see src/lib/postLoginReturn.js's header
// note for the same constraint/pattern). App.jsx's Navigator effect calls
// shouldAutoRouteToOnboarding(...) and, if true, calls
// go('game', ONBOARDING_GAME_PARAMS) + track('onboarding_started', ...).

/** Route params for the onboarding sparring game (FR-002/FR-003, research.md R4). */
export const ONBOARDING_GAME_PARAMS = { difficulty: 'easy', side: 'first', onboarding: true };

/**
 * Decide whether the anonymous first-run auto-route effect should fire.
 *
 * Settled decision (B3/D1, spec.md Assumptions): anonymous-only. A signed-in
 * user (truthy `session`) is NEVER auto-routed, even if their account's
 * onboarding_status is 'not_encountered'.
 *
 * Since 2026-08-04 there is NO manual re-entry point: Settings' "Replay intro" (FR-010) was
 * removed at the owner's request, so this auto-route is the only path into onboarding.
 *
 * `onboardingStatus` of `null`/`undefined` is treated identically to
 * `'not_encountered'` at every read site (spec.md Assumptions).
 *
 * @param {{ sessionChecked: boolean, session: object|null, onboardingStatus: string|null|undefined }} args
 * @returns {boolean}
 */
export function shouldAutoRouteToOnboarding({ sessionChecked, session, onboardingStatus }) {
  if (!sessionChecked || session) return false;
  return onboardingStatus === 'not_encountered' || onboardingStatus == null;
}
