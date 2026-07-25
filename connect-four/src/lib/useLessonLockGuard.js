// Client-side lock guard for the three lesson screens (ConceptScreen, SocraticScreen,
// CLChallengeScreen). Restores parity with SagaScreen's lock affordances on direct
// URLs (/concept/:id, /socratic/:id, /clchallenge/:id), which previously bypassed
// both the PRO tier lock and the sequential order lock (QA 2026-07-25, major).
//
// The decision itself is deriveLessonAccess (src/screens/sagaLock.js) — the same
// pure helpers SagaScreen.handleNodeTap uses, so the guard's rules cannot drift
// from the saga's. This hook only owns the data fetching (same inputs SagaScreen
// fetches: lessons list, progress, tier) and the redirect side effect.
//
// Semantics:
//  - 'checking' until the lessons list + progress + tier have all resolved — the
//    caller keeps showing its normal loading state (never flashes a paid lesson,
//    never locks out a legitimate user before tier has arrived).
//  - 'allowed' → render the lesson normally.
//  - 'blocked' → the hook has already redirected (goReplace) back to the saga,
//    passing lockAction so SagaScreen shows its existing affordance for the
//    reason: 'upgrade' → UpgradeModal, 'orderLock' → the order-lock toast.
//    goReplace (not go) so browser Back doesn't bounce through the locked URL.
//  - A failed lessons-list fetch is locked-safe: redirect to the saga (no modal)
//    rather than risk serving a paid lesson on a partial API outage.
//
// NOTE (residual, out of scope here): this is a CLIENT-side guard only.
// /api/lessons/:id still serves paid lesson content unauthenticated — the
// server-side entitlement change is an owner decision.
import { useState, useEffect } from 'react';
import { useStore } from '../store/ProfileStore.jsx';
import { deriveLessonAccess } from '../screens/sagaLock.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

/**
 * @param {string} lessonId
 * @param {(key: string, params?: object) => void} goReplace
 * @returns {'checking' | 'allowed' | 'blocked'}
 */
export function useLessonLockGuard(lessonId, goReplace) {
  const { store } = useStore();
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    if (!lessonId) {
      setStatus('allowed');
      return undefined;
    }

    let cancelled = false;
    setStatus('checking');

    Promise.all([
      fetch(`${API}/api/lessons`).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
      // Same defaults SagaScreen falls back to on store errors.
      store ? store.getLessonProgress().catch(() => []) : Promise.resolve([]),
      store
        ? store.getProfile().then(p => p?.tier ?? 'free').catch(() => 'free')
        : Promise.resolve('free'),
    ])
      .then(([lessons, progress, tier]) => {
        if (cancelled) return;
        const access = deriveLessonAccess(
          lessonId,
          Array.isArray(lessons) ? lessons : [],
          progress,
          tier,
        );
        if (access === 'allowed') {
          setStatus('allowed');
        } else {
          setStatus('blocked');
          goReplace('saga', { lockAction: access });
        }
      })
      .catch(err => {
        if (cancelled) return;
        console.error('[useLessonLockGuard] lessons fetch error:', err);
        setStatus('blocked');
        goReplace('saga');
      });

    return () => { cancelled = true; };
    // goReplace comes from Navigator's useCallback([], ...) — stable identity.
  }, [lessonId, store]); // eslint-disable-line react-hooks/exhaustive-deps

  return status;
}
