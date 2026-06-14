import { useState, useEffect } from 'react';
import { ChallengeScreen } from './ChallengeScreen.jsx';

const API = import.meta.env.VITE_API_BASE_URL || '';

export function CLChallengeScreen({ go, goBack, goReplace, lessonId, lessonTitle, confirmationCategory, confirmationCount, confirmationChallenges }) {
  // When lessonTitle is absent (cold-boot via URL), fetch lesson data from the API.
  const [resolvedTitle, setResolvedTitle] = useState(lessonTitle || null);
  const [resolvedCategory, setResolvedCategory] = useState(confirmationCategory || null);
  const [resolvedCount, setResolvedCount] = useState(confirmationCount ?? null);
  const [resolvedChallenges, setResolvedChallenges] = useState(confirmationChallenges || null);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
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
        setResolvedTitle(lesson.title);
        setResolvedCategory(lesson.confirmationCategory);
        setResolvedCount(lesson.confirmationCount);
        setResolvedChallenges(lesson.confirmationChallenges);
      })
      .catch(() => {
        if (!cancelled) setFetchError(true);
      });

    return () => { cancelled = true; };
  }, [lessonId, lessonTitle]);

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
