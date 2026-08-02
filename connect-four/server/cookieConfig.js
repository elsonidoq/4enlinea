// Shared cookie-shape constants/helpers for every first-party cookie this server
// sets (sb_access_token, sb_refresh_token, dc4_device_uuid). Extracted out of
// server/index.js so that other modules (e.g. deviceIdentity.js) can import the
// exact same cookie shape without importing index.js itself — index.js calls
// app.listen(...) unconditionally at module scope, so importing it from a test
// or from another server module would boot a real HTTP server as a side effect.

export function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

export const ACCESS_TOKEN_MAX_AGE = 3600_000; // 1 hour
export const REFRESH_TOKEN_MAX_AGE = 60 * 24 * 3600_000; // 60 days
