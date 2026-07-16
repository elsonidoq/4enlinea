/**
 * Pure function — no side effects, no Express dependency.
 * Builds the Supabase Google OAuth authorize URL.
 *
 * @param {string} supabaseUrl — e.g. https://xxx.supabase.co
 * @param {string} frontendUrl — absolute URL where Supabase redirects after consent
 * @returns {string} full authorize URL with provider=google and encoded redirect_to
 */
export function buildGoogleAuthorizeUrl(supabaseUrl, frontendUrl) {
  return `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(frontendUrl)}`;
}

/**
 * Pure function — no side effects, no Express dependency.
 * Resolves the access token to use for a request from the `Authorization`
 * header or the `sb_access_token` cookie.
 *
 * Guards against a specific client bug: a stale/broken caller sending the
 * literal string `"Bearer undefined"` (e.g. `` `Bearer ${session.access_token}` ``
 * when `session.access_token` is `undefined`). That header technically
 * `startsWith('Bearer ')`, so a naive `slice(7)` would resolve to the literal
 * string `'undefined'` and — critically — would SKIP the cookie fallback,
 * even though a perfectly valid `sb_access_token` cookie is sitting right
 * there. This project's auth is httpOnly-cookie-based (see
 * docs/architecture memory: credentials:'include', NOT Authorization
 * header) — a malformed/absent Authorization header must never shadow a
 * good cookie.
 *
 * @param {string|undefined} authHeader — raw `Authorization` header value
 * @param {{sb_access_token?: string}|undefined} cookies — parsed cookies (req.cookies)
 * @returns {string|undefined} the resolved token, or undefined if neither source has one
 */
export function resolveAuthToken(authHeader, cookies) {
  if (authHeader?.startsWith('Bearer ')) {
    const headerToken = authHeader.slice(7);
    if (headerToken && headerToken !== 'undefined' && headerToken !== 'null') {
      return headerToken;
    }
  }
  return cookies?.sb_access_token;
}
