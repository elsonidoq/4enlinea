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
 * onboarding_status is 'not_encountered' — they reach onboarding only via
 * Settings "Replay intro" (FR-010).
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

/**
 * Screens that only make sense for an anonymous user. Reached by the first-run auto-route
 * above (and only that way — Settings "Replay intro" (FR-010) routes a signed-in user into
 * the onboarding *game*, not here), so a user who completes sign-in while standing on one
 * must be moved off it.
 */
export const ANONYMOUS_ONLY_SCREENS = new Set(['onboardingMission']);

/**
 * Decide whether a session that just transitioned falsy→truthy should route the user home.
 *
 * The auto-route effect deliberately never fires for a signed-in user, which left a gap: a
 * user who signed in from an anonymous-only screen's own AuthModal stayed on that screen with
 * no visible change, making a *successful* sign-in indistinguishable from a failed one. This
 * is the complement of that guard — it only fires on the session transition, so a signed-in
 * user navigating into onboarding on purpose (Replay intro) is unaffected.
 *
 * A stashed post-login destination always wins: FR-013's consumeReturnTo() remains the single
 * named consumption point, and this is only the fallback for when nothing was stashed.
 *
 * @param {{ screenKey: string, hasStashedDestination: boolean }} args
 * @returns {boolean}
 */
export function shouldRouteHomeAfterSignIn({ screenKey, hasStashedDestination }) {
  if (hasStashedDestination) return false;
  return ANONYMOUS_ONLY_SCREENS.has(screenKey);
}
