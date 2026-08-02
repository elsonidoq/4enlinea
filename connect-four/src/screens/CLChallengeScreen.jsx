import { useState, useEffect } from 'react';
import { ChallengeScreen } from './ChallengeScreen.jsx';
import { useLessonLockGuard } from '../lib/useLessonLockGuard.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

export function CLChallengeScreen({ go, goBack, goReplace, lessonId, lessonTitle, confirmationCategory, confirmationCount, confirmationChallenges }) {
  // Direct-URL lock guard (PRO tier + lesson order) — mirrors SagaScreen's rules.
  // Must clear before ANY challenge content renders or completion can be recorded
  // (QA 2026-07-25: a free user could complete a PRO lesson via /clchallenge/:id).
  const lockStatus = useLessonLockGuard(lessonId, goReplace);

  // When lessonTitle is absent (cold-boot via URL), fetch lesson data from the API.
  const [resolvedTitle, setResolvedTitle] = useState(lessonTitle || null);
  const [resolvedCategory, setResolvedCategory] = useState(confirmationCategory || null);
  const [resolvedCount, setResolvedCount] = useState(confirmationCount ?? null);
  const [resolvedChallenges, setResolvedChallenges] = useState(confirmationChallenges || null);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (lockStatus !== 'allowed') return;
    // No-op when lessonTitle is already present (normal navigation from lesson flow)
    if (lessonTitle) return;
    if (!lessonId) return;

    let cancelled = false;
    fetch(`${API}/api/lessons/${lessonId}`)
      .then(res => {
        if (!res.ok) throw new Error('not_found');
        return res.json();
      })
      .then(lesson => {
        if (cancelled) return;
        // Server-side entitlement gate (spec 053 US1): a locked stub has no
        // `confirmationCategory`/`confirmationChallenges` — this is the cold-boot path
        // reachable by a direct reload of a locked lesson's URL, not only in-app
        // navigation (client-side useLessonLockGuard above only catches the latter, on
        // stale/cached tier info). Redirect through the exact same affordance the guard
        // uses on a client-side block, rather than inventing a second locked-lesson UI.
        if (lesson.locked === true) {
          goReplace('saga', { lockAction: 'upgrade' });
          return;
        }
        setResolvedTitle(lesson.title);
        setResolvedCategory(lesson.confirmationCategory);
        setResolvedCount(lesson.confirmationCount);
        setResolvedChallenges(lesson.confirmationChallenges);
      })
      .catch(() => {
        if (!cancelled) setFetchError(true);
      });

    return () => { cancelled = true; };
    // goReplace comes from Navigator's useCallback([], ...) — stable identity (same
    // rationale as useLessonLockGuard.js), so including it here doesn't cause re-fetches.
  }, [lessonId, lessonTitle, lockStatus, goReplace]);

  // Locked-safe gate: show the loading state until the guard has decided, and keep
  // showing it after a 'blocked' redirect (this instance unmounts immediately).
  if (lockStatus !== 'allowed') {
    return <div>Loading…</div>;
  }

  if (fetchError) {
    return <div>Lesson not found.</div>;
  }

  if (!resolvedTitle) {
    return <div>Loading…</div>;
  }

  return (
    <ChallengeScreen
      go={go}
      goBack={goBack}
      goReplace={goReplace}
      lessonMode={true}
      lessonId={lessonId}
      lessonTitle={resolvedTitle}
      confirmationCategory={resolvedCategory}
      confirmationCount={resolvedCount}
      confirmationChallenges={resolvedChallenges}
    />
  );
}
