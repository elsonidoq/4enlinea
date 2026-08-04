// Pure helpers for SagaScreen's lock-derivation logic, split into a plain .js module
// (not .jsx) so `node --test` can import it directly — mirrors the boardA11y.js /
// Board.jsx split (see tests/unit/boardA11y.test.js for the precedent and rationale).
// SagaScreen.jsx is the sole call site; this is not a new hook/abstraction layer.

/**
 * Computes WHY a lesson is locked, independent of node visual state.
 * `predecessor` = the lesson with the next-lower `order` in the full sorted list; null for the
 * lowest-order lesson (never order-locked).
 * `authenticated` (FR-017 / OI-95) — defaults to `true` so every pre-existing caller that only
 * passes 4 args keeps its exact prior behavior. When `false` (a signed-out visitor), a lesson
 * that would otherwise be 'tier', 'order', or 'both' collapses to 'signin' instead — the caller
 * needs a Sign-in CTA, not an Upgrade/order-lock one, regardless of WHICH lock(s) apply. An
 * unlocked lesson ('none') is unaffected: a signed-out visitor can still take a free, unlocked
 * lesson without signing in.
 * @returns {'none' | 'tier' | 'order' | 'both' | 'signin'}
 */
export function deriveLockReason(lesson, lessons, progress, tier, authenticated = true) {
  const tierLocked = lesson.free === false && tier !== 'paid';

  const sorted = lessons.slice().sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex(l => l.id === lesson.id);
  const predecessor = idx > 0 ? sorted[idx - 1] : null;
  const orderLocked = predecessor !== null &&
    !progress.some(p => p.lessonId === predecessor.id && p.status === 'complete');

  if (!authenticated && (tierLocked || orderLocked)) return 'signin';
  if (tierLocked && orderLocked) return 'both';
  if (tierLocked) return 'tier';
  if (orderLocked) return 'order';
  return 'none';
}

/**
 * Maps a LockReason to the tap action handleNodeTap should take.
 * @returns {'upgrade' | 'orderLock' | 'navigate' | 'signin'}
 */
export function dispatchLockAction(reason) {
  if (reason === 'signin') return 'signin';
  if (reason === 'tier' || reason === 'both') return 'upgrade';
  if (reason === 'order') return 'orderLock';
  return 'navigate';
}

/**
 * Direct-URL guard decision for the lesson screens (concept/socratic/clchallenge).
 * Composes SagaScreen.handleNodeTap's exact rules so the guard can never drift from
 * the saga affordances:
 *   1. done short-circuit — a completed lesson is always accessible (matches handleNodeTap);
 *   2. otherwise deriveLockReason → dispatchLockAction.
 * An unknown lessonId returns 'allowed' — the screen's own /api/lessons/:id fetch
 * surfaces the not-found error; the guard only enforces locks.
 * `authenticated` (FR-017 / OI-95, defaults to `true` — see deriveLockReason) is threaded straight
 * through to deriveLockReason. Note the done-short-circuit runs BEFORE the auth check: a
 * signed-out visitor with local progress marking a lesson complete still gets 'allowed', same as
 * a signed-in user — completion, not sign-in state, is what the short-circuit is protecting.
 * @returns {'allowed' | 'upgrade' | 'orderLock' | 'signin'}
 */
export function deriveLessonAccess(lessonId, lessons, progress, tier, authenticated = true) {
  const lesson = lessons.find(l => l.id === lessonId);
  if (!lesson) return 'allowed';

  const isDone = progress.some(p => p.lessonId === lessonId && p.status === 'complete');
  if (isDone) return 'allowed';

  const action = dispatchLockAction(deriveLockReason(lesson, lessons, progress, tier, authenticated));
  return action === 'navigate' ? 'allowed' : action;
}
