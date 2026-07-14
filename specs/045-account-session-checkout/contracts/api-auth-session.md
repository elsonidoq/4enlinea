# Contract: Session persistence & silent refresh endpoints

All three endpoints already exist (`server/index.js`). This contract documents the **behavior change**
only — request/response shapes are unchanged except where noted.

## `POST /api/auth/refresh` (existing, `:257`)

> **SUPERSEDED (OI-6, 2026-07-12):** The server-side de-dup / coalescing behavior
> described below was never built. `research.md` R1 empirically found GoTrue does
> not enforce refresh-token rotation-with-reuse-detection, so `attemptRefresh` has
> no single-flight Map. Authoritative current behavior:
> `docs/architecture/server-conventions.md` ("No de-dup Map — documented absence")
> and `connect-four/server/authRefresh.js`. See OI-5 for the re-verification path.

**Unchanged request/response.** Behavior change (FR-002a): concurrent calls presenting the **same**
`sb_refresh_token` cookie value are coalesced server-side — only the first triggers
`authClient.auth.refreshSession()`; subsequent concurrent callers await and receive the same result
(same new cookies set, or the same failure). Calls with *different* refresh-token values (different
users, or a value already rotated past) are never coalesced together.

Extracted into a shared helper so `GET /api/auth/session` (below) can reuse the same logic:
```js
async function attemptRefresh(refreshToken) → Promise<{ accessToken, refreshToken } | null>
```
- Returns `null` on any failure (invalid/expired/revoked refresh token) — caller decides the HTTP
  response (401 + cookie clear).
- De-duplication lives inside `attemptRefresh`, keyed by the `refreshToken` argument.

**Cookie TTL change** (FR-001): `REFRESH_TOKEN_MAX_AGE` changes from `7 * 24 * 3600_000` to
`60 * 24 * 3600_000` (60 days). `ACCESS_TOKEN_MAX_AGE` (1h) is unchanged.

## `GET /api/auth/session` (existing, `:290`) — behavior change (FR-004, FR-005)

**Request**: unchanged (no body/params; reads `sb_access_token` + `sb_refresh_token` cookies).

**New processing order**:
1. If `sb_access_token` cookie absent → check `sb_refresh_token`. If also absent, `401 { error: 'Not authenticated' }` (no cookies to clear). If present, go to step 3 (attempt refresh) instead of failing immediately — an expired/absent access token with a valid refresh token must not read as signed-out.
2. If `sb_access_token` present, validate via `authClient.auth.getUser(token)`.
   - Valid → proceed as today: fetch profile, `200 { user: { id, tier } }`.
   - Invalid/expired → go to step 3.
3. **New**: call `attemptRefresh(sb_refresh_token cookie value)`.
   - Success → set new cookies (same as `POST /api/auth/refresh`), then re-run the profile fetch and
     return `200 { user: { id, tier } }` — the caller of `GET /api/auth/session` never sees the
     intermediate failure; the response looks identical to "was already signed in."
   - Failure (refresh token itself invalid/expired/revoked, or absent) → clear both cookies (existing
     behavior), `401 { error: 'Token invalid' }`.

**Response shape**: unchanged (`{ user: { id, tier } }` on success, `{ error }` on 401/503). No new
fields — the frontend (`ProfileStore.checkSession`) requires zero changes to consume the improved
behavior (see `research.md` R7).

**In-flight sign-in guard (FR-007)**: this endpoint is not called during the OAuth hash-callback branch
of `ProfileStore.checkSession` (that branch returns early after `POST /api/auth/callback` succeeds) — no
interaction with the `App.jsx:31` hash-preservation logic; unchanged as read from current code.

**Verification is not purely read-only**: `tasks.md` T013 empirically re-confirms this by observing the
actual OAuth-return flow after the `GET /api/auth/session` auto-refresh change lands, not just by
re-reading the code above. If that check finds the two branches DO conflict in practice (e.g., a
race where `checkSession`'s non-hash branch fires `GET /api/auth/session` before the hash-callback branch
has run, auto-refreshing/rotating cookies out from under an in-flight OAuth exchange), a client-side
ordering guard in `ProfileStore.checkSession` (e.g., checking for a pending hash-callback before issuing
the `GET /api/auth/session` call) is IN SCOPE for T010/T013 to add — FR-007 is not left as a verify-only
requirement with no remediation path if a conflict is actually observed.

## `POST /api/auth/callback`, `POST /api/auth/signout`, `POST /api/auth/anonymous` (existing)

No behavior change. Their cookie-set calls pick up the new `REFRESH_TOKEN_MAX_AGE` value automatically
(all four cookie-set sites reference the same module-level constant).
