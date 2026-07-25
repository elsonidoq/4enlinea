// Pure helpers for SagaScreen's lock-derivation logic, split into a plain .js module
// (not .jsx) so `node --test` can import it directly — mirrors the boardA11y.js /
// Board.jsx split (see tests/unit/boardA11y.test.js for the precedent and rationale).
// SagaScreen.jsx is the sole call site; this is not a new hook/abstraction layer.

/**
 * Computes WHY a lesson is locked, independent of node visual state.
 * `predecessor` = the lesson with the next-lower `order` in the full sorted list; null for the
 * lowest-order lesson (never order-locked).
 * @returns {'none' | 'tier' | 'order' | 'both'}
 */
export function deriveLockReason(lesson, lessons, progress, tier) {
  const tierLocked = lesson.free === false && tier !== 'paid';

  const sorted = lessons.slice().sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex(l => l.id === lesson.id);
  const predecessor = idx > 0 ? sorted[idx - 1] : null;
  const orderLocked = predecessor !== null &&
    !progress.some(p => p.lessonId === predecessor.id && p.status === 'complete');

  if (tierLocked && orderLocked) return 'both';
  if (tierLocked) return 'tier';
  if (orderLocked) return 'order';
  return 'none';
}

/**
 * Maps a LockReason to the tap action handleNodeTap should take.
 * @returns {'upgrade' | 'orderLock' | 'navigate'}
 */
export function dispatchLockAction(reason) {
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
 * @returns {'allowed' | 'upgrade' | 'orderLock'}
 */
export function deriveLessonAccess(lessonId, lessons, progress, tier) {
  const lesson = lessons.find(l => l.id === lessonId);
  if (!lesson) return 'allowed';

  const isDone = progress.some(p => p.lessonId === lessonId && p.status === 'complete');
  if (isDone) return 'allowed';

  const action = dispatchLockAction(deriveLockReason(lesson, lessons, progress, tier));
  return action === 'navigate' ? 'allowed' : action;
}
