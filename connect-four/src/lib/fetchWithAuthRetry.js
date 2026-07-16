// Task 22 (finding 19): navigating straight to /settings and immediately saving triggers a
// session-refresh race — the client's first request can fire before the just-restored session
// is ready, so PUT /api/user/profile 401s even though the session is genuinely valid a moment
// later (memory project_app_qa_setup_gotchas: "session drops -> /api/auth/refresh"). The 401 is
// not a real auth failure, so it shouldn't surface as "Failed to save" on the very first
// attempt a user makes.
//
// This wraps a single fetch with exactly ONE transparent refresh-and-retry on a 401: call
// /api/auth/refresh, then retry the original request once. A second 401 (or a refresh failure)
// is a genuine auth problem and is surfaced as-is — never retried again (bounded, no loop).
//
// `fetchFn`/`refreshFn` are injectable so this is unit-testable without a real network/server.

const DEFAULT_REFRESH_URL_SUFFIX = '/api/auth/refresh';

/**
 * @param {string} url
 * @param {RequestInit} options - passed through to fetch as-is (credentials, method, body, ...)
 * @param {object} [opts]
 * @param {typeof fetch} [opts.fetchFn] - injectable fetch, defaults to global fetch
 * @param {string} [opts.apiBase] - API base URL prefix used to build the refresh request
 * @returns {Promise<Response>} the final response (post-retry if a retry happened)
 */
export async function fetchWithAuthRetry(url, options, { fetchFn = fetch, apiBase = '' } = {}) {
  const res = await fetchFn(url, options);
  if (res.status !== 401) return res;

  try {
    await fetchFn(`${apiBase}${DEFAULT_REFRESH_URL_SUFFIX}`, { method: 'POST', credentials: 'include' });
  } catch {
    // Refresh call itself failed (network error) — fall through and return the original 401;
    // do not retry further.
    return res;
  }

  return fetchFn(url, options);
}
