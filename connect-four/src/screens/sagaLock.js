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
