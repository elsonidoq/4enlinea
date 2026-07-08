// Pure helper for paging GET /api/coach/queue to completion on the client.
// Extracted per spec 041 (Past Games & Mistakes: Server Data Integrity), User Story 1,
// contracts/coach-queue-pagination.md § Consumers that MUST page to completion.
//
// Kept client-only (not isomorphic with server/coachQueuePagination.js) — this is a pure
// loop-guard for consumers accumulating pages client-side, distinct from the server's
// req.query parsing/validation concern. Keep both files' JSDoc in sync if the pagination
// contract changes.

/**
 * Dual guard for "page to completion" loops against GET /api/coach/queue (FR-003a).
 *
 * MUST NOT rely on `accumulated === total` alone: if a row is deleted mid-session (see spec 041
 * Edge Cases), `total` can shift and become permanently unreachable, spinning the loop forever.
 * A page shorter than `limit` is also a definitive "no more pages" signal, independent of `total`.
 *
 * @param {{ pageLength: number, limit: number, accumulated: number, total: number }} args
 *   - pageLength: number of rows returned by the just-fetched page
 *   - limit: the page size requested
 *   - accumulated: total rows accumulated across all pages fetched so far (including this one)
 *   - total: the server-reported true total for the current filter set
 * @returns {boolean} true if another page should be fetched, false to stop.
 */
export function shouldContinuePaging({ pageLength, limit, accumulated, total }) {
  const isLastPage = pageLength < limit;
  const reachedTotal = accumulated === total;
  return !(isLastPage || reachedTotal);
}
