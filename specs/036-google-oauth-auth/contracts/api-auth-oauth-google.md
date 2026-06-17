# Contract: GET /api/auth/oauth/google

**Spec**: 036-google-oauth-auth  
**Status**: New endpoint

## Route

```
GET /api/auth/oauth/google
```

## Description

Stateless redirect endpoint that initiates the Google OAuth flow. Issues a `302 Found` redirect to Supabase's OAuth authorize endpoint with the Google provider and the app's frontend URL as the callback target.

No session is created. No token is processed. This endpoint is a pure redirect.

## Auth

No authentication required. The global `loadUser` middleware runs (as it does on all routes), but `req.user` is not checked — this endpoint must be accessible to anonymous users.

## Route Comment (required — FR-003)

```js
// GET /api/auth/oauth/google — redirect to Supabase Google OAuth
```

## Implementation

```js
app.get('/api/auth/oauth/google', (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Auth not configured' });
  const redirectTo = process.env.FRONTEND_URL || 'http://localhost:5173';
  const authorizeUrl = `${process.env.SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
  res.redirect(authorizeUrl);
});
```

**Important**: `encodeURIComponent` is required on `redirectTo`. `FRONTEND_URL` is an absolute URL containing `://`, which must be percent-encoded or Supabase will reject or mis-parse the redirect target.

## Response

| Status | Condition | Body |
|--------|-----------|------|
| `302 Found` | Normal | `Location: https://<supabase-ref>.supabase.co/auth/v1/authorize?provider=google&redirect_to=<encoded-frontend-url>` |
| `503 Service Unavailable` | `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` not set | `{ "error": "Auth not configured" }` |

## Environment Variables Used

| Variable | Required | Source |
|----------|----------|--------|
| `SUPABASE_URL` | Yes | Existing server env var |
| `FRONTEND_URL` | Yes (fallback: `http://localhost:5173`) | Existing server env var |

No new environment variables.

## Client-Side Usage

```js
// In AuthModal.jsx — full-page navigation, not fetch()
window.location.href = `${API}/api/auth/oauth/google`;
```

A `fetch()` call to this endpoint would NOT work — the redirect must be followed by the browser to navigate to Google's consent screen.

## Return Leg (unchanged)

After the user completes Google's consent screen, Supabase redirects to `FRONTEND_URL` with `#access_token=…` in the URL hash. `ProfileStore.checkSession` detects the hash and calls `POST /api/auth/callback` to exchange the token for httpOnly cookies. This path is auth-method agnostic and requires no changes.

## Removed Endpoint

`POST /api/auth/magic-link` (lines 176–199 of `server/index.js`) is removed entirely. No replacement is provided. Requests to this path will return `404` after deployment.
