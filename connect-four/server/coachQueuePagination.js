// Pure helpers for GET /api/coach/queue pagination.
// Extracted per spec 041 (Past Games & Mistakes: Server Data Integrity), User Story 1,
// contracts/coach-queue-pagination.md § Query params.
//
// Kept server-only (not isomorphic with src/lib/coachQueuePagination.js) because it deals with
// raw Express `req.query` string parsing/validation, which is a server concern; the client's
// page-to-completion loop guard (shouldContinuePaging) is a distinct, purely client-side
// concern and lives in src/lib/coachQueuePagination.js. Keep both files' JSDoc in sync if the
// pagination contract changes.

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const DEFAULT_OFFSET = 0;

/**
 * Parse and validate `limit`/`offset` query params for GET /api/coach/queue.
 *
 * @param {Record<string, unknown>} query - e.g. req.query
 * @returns {{ limit: number, offset: number } | { error: string }}
 */
export function parseQueuePaginationParams(query) {
  const limitRaw = query?.limit;
  const offsetRaw = query?.offset;

  let limit = DEFAULT_LIMIT;
  if (limitRaw !== undefined && limitRaw !== null) {
    const n = Number(limitRaw);
    if (!Number.isInteger(n) || n < 1 || n > MAX_LIMIT) {
      return { error: 'invalid limit' };
    }
    limit = n;
  }

  let offset = DEFAULT_OFFSET;
  if (offsetRaw !== undefined && offsetRaw !== null) {
    const n = Number(offsetRaw);
    if (!Number.isInteger(n) || n < 0) {
      return { error: 'invalid offset' };
    }
    offset = n;
  }

  return { limit, offset };
}
