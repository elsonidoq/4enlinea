// server/authRefresh.js
//
// Shared refresh-token exchange logic used by both POST /api/auth/refresh and
// GET /api/auth/session (auto-refresh-on-expiry, see spec 045 US2 / FR-004).
//
// FR-002a note: this project's Supabase GoTrue instance was empirically confirmed
// (specs/045-account-session-checkout/research.md R1, 2026-07-11) to NOT enforce
// refresh-token rotation-with-reuse-detection — a refresh token remains usable even
// after a newer one has been issued from it, and concurrent same-token refreshes both
// succeed independently. No single-flight de-dup Map is needed; this is intentionally
// undone. See authRefresh.test.mjs for the regression test covering this.

/**
 * Factory: builds an attemptRefresh(refreshToken) function bound to a given authClient.
 * Keeping authClient injected (rather than imported as a module singleton) makes this
 * unit-testable with a mock.
 *
 * @param {{ authClient: { auth: { refreshSession: Function } } }} deps
 * @returns {(refreshToken: string) => Promise<{ accessToken: string, refreshToken: string } | null>}
 */
export function createAttemptRefresh({ authClient }) {
  /**
   * Attempts to exchange a refresh token for a new session.
   * Returns null on any failure (invalid/expired/revoked/error) — the caller decides
   * the HTTP response (401 + cookie-clear, etc.).
   */
  return async function attemptRefresh(refreshToken) {
    if (!refreshToken) return null;
    try {
      const { data, error } = await authClient.auth.refreshSession({ refresh_token: refreshToken });
      if (error || !data?.session) return null;
      return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    } catch {
      return null;
    }
  };
}
