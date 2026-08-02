// Pure function backing GET /api/lessons/:id's entitlement-gated response
// shape (spec 053, T004). Extracted so the response shape can be
// unit-tested without booting the full Express app — see
// testing-conventions.md's "Test the real seam, never a copy of it" and the
// blunderDetailResponse.js precedent this follows.

/**
 * Build the public response for GET /api/lessons/:id from the full lesson
 * object and the requesting caller's entitlement.
 *
 * A free lesson, or any lesson requested by an entitled (paid) caller, is
 * returned unchanged. A paid lesson requested by an unentitled caller is
 * redacted to exactly { id, title, order, free, locked: true } — `slides`
 * (and every other lesson-content field) is absent from the object entirely,
 * not null and not an empty array. There is deliberately NO `authenticated`
 * field on this response (Decision 1, tasks.md T004/T005 — supersedes the
 * six-field shape shown in contracts/lessons.md, which is stale):
 * `authenticated` lives only on GET /api/user/entitlement, where FR-033's
 * session-lapse logic actually consumes it.
 *
 * Pure, synchronous — no DB/solver/network access.
 *
 * @param {object} lesson - full lesson object from getLesson(id, locale)
 * @param {{ entitled: boolean, authenticated: boolean }} entitlement
 * @returns {object} full lesson (unchanged) OR the redacted locked stub
 */
export function buildLessonResponse(lesson, entitlement) {
  if (lesson.free || entitlement.entitled) return lesson;
  return {
    id: lesson.id,
    title: lesson.title,
    order: lesson.order,
    free: lesson.free,
    locked: true,
  };
}
