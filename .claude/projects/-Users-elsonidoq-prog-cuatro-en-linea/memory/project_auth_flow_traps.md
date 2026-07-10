---
name: project-auth-flow-traps
description: "Auth flow traps — supabase-js session contamination (two clients), magic-link hash race + redirect allowlist, Google OAuth state encoding, gating a CTA never gates its screen"
metadata: 
  node_type: memory
  type: project
  originSessionId: f8ef0c49-540c-4eaf-ba3e-1bf42b296545
---

Consolidated auth-flow gotchas (supabase-js client separation, magic link, Google OAuth).

## Gating a CTA does NOT gate the destination screen (open limitation)

There is **no route-level auth guard** anywhere in the app. Every screen key in `URL_MAP` is
reachable while signed out (`SESSION_ONLY_SCREENS` is a cold-boot-state guard, not an auth guard).
So making a card open `AuthModal` instead of navigating leaves the screen itself reachable by
bookmark, browser Back, refresh, or a shared link.

**Live instance:** `/pastGames` renders an inert "Sign in to see your past games" empty state with
no sign-in control. Spec 043 gates the Home card but *accepts this as a known limitation* — its
SC-004 is deliberately scoped to the gated-CTA paths. Do not "fix" the spec by asserting
zero-dead-ends for direct navigation; the cheapest real fix is a sign-in affordance on that empty
state.

**Also:** the OAuth return leg always lands on `FRONTEND_URL` = site root `/`, never the origin
screen. "Sign in from screen X → still on X" is false; the user is on Home. Returning them
anywhere else requires stashing the destination before the redirect and consuming it after reload.

**How to apply:** when gating any feature behind auth, check what its screen renders to a
signed-out visitor who arrives directly — the gate on the entry point tells you nothing.
See `docs/architecture/frontend-conventions.md` § Auth Integration.

## (merged from `bug_supabase_js_session_contamination` — supabase-js auth.getUser(userToken) on a shared client poisons subsequent DB inserts — fix: separate authClient for all auth.* calls)

`auth.getUser(userToken)` in supabase-js v2 stores the user's JWT as the client's active session. Any subsequent `supabase.from(...).insert(...)` then runs with `Authorization: Bearer <userToken>`, causing PostgREST to execute as the `authenticated` postgres role instead of `service_role`. BYPASSRLS is skipped → RLS blocks the insert → error 42501.

**Symptoms:** blunder inserts fail with 42501 specifically when the import or analyze endpoint is reached by a logged-in user (whose token was validated by `loadUser` middleware). Direct node script inserts with the same key succeed.

**Fix (applied 2026-06-22):** Two separate supabase client instances initialized together in `server/index.js`:
- `supabase` — DB operations ONLY (`from()`, `rpc()`). Never call `auth.*` on this.
- `authClient` — auth operations ONLY (`getUser`, `refreshSession`, `signInAnonymously`). Contamination here is harmless because `authClient` is never used for DB writes.

Both are created with the same service role key and `{ auth: { persistSession: false, autoRefreshToken: false } }`.

**Why:** Separation means `loadUser` calling `authClient.auth.getUser(token)` cannot affect `supabase`'s request headers.

**How to apply:** Whenever adding new `auth.*` calls in server code, use `authClient`, not `supabase`. Any `from()` or `rpc()` call uses `supabase` only.


---

## (merged from `bug_supabase_trigger_not_firing` — Supabase GoTrue doesn't fire on_auth_user_created trigger — public.users rows never auto-created)

The `on_auth_user_created` trigger on `auth.users` exists, is enabled, and has correct SQL — but Supabase GoTrue's internal user creation bypasses user-defined triggers. Result: new auth users have no corresponding `public.users` row, causing FK violations on any table that references `public.users`.

**Why:** Discovered 2026-06-13 when all 10 production auth users had no `public.users` row. Direct INSERT into `public.users` works; the trigger just never fires.

**How to apply:**
- Never rely on this trigger to provision `public.users` rows.
- The `loadUser` middleware (index.js) now auto-creates the row on first authenticated request:
  ```js
  if (!profile) {
    await supabase.from('users').insert({ id: data.user.id })...
  }
  ```
- When setting up a fresh Supabase project, backfill manually:
  ```sql
  INSERT INTO public.users (id) SELECT id FROM auth.users ON CONFLICT (id) DO NOTHING;
  ```

---

## (merged from `project_magic_link_auth_race` — Auth magic link fails because Navigator mount useEffect clears)

## Root cause

`App.jsx` Navigator's mount `useEffect` calls `window.history.replaceState(state, '', '/')` which strips the `#access_token=...` hash fragment before GoTrueClient's async `_initialize()` can process it.

The race:
1. Module-level `createClient()` → GoTrueClient constructor calls `initialize()` → yields at async lock acquisition
2. React commits → `useEffect` runs synchronously → `replaceState(state, '', '/')` → hash destroyed
3. GoTrueClient acquires lock → `parseParametersFromURL(window.location.href)` → no `access_token` → `callbackUrlType = 'none'` → skips session recovery

**Why**: `_initialize()` is async and yields at `_acquireLock()`. React's commit phase runs before the lock is acquired, so the `useEffect` fires in between.

## Fix

Changed `replaceState` to preserve `window.location.hash`:
```js
window.history.replaceState({...}, '', resolvedUrl + window.location.hash);
```

The GoTrueClient then finds the hash, processes it, and clears it with `window.location.hash = ''` (its normal post-processing behavior).

## Related

- `bug_service_worker_stale_cache` — the second bug that prevented auth from working (SW served stale index.html before the JS could even run)
- File: `connect-four/src/App.jsx` line 29


---

## (merged from `bug_auth_magic_link_redirect` — Magic link emails stopped arriving after adding emailRedirectTo — Supabase rejects unlisted redirect URLs silently)

`AuthModal.jsx` passes `emailRedirectTo: window.location.origin` to `supabase.auth.signInWithOtp`. Supabase rejects requests where the redirect URL is not on the project's allowlist (Auth → URL Configuration → Redirect URLs), and returns an error — but the `handleSend` catch block silently swallows it, so no email is sent and the UI shows no feedback.

**Why:** Added on 2026-05-31 to fix magic links always redirecting to localhost. The fix was correct in intent but broke sending because the URL wasn't allowlisted.

**How to apply:** Before using `emailRedirectTo`, ensure the target URL is in the Supabase allowlist. Also consider surfacing auth errors to the user instead of swallowing them silently.

**Status:** Will be closed by Spec 036 (Epic 7) FR-018 checklist item — adding `FRONTEND_URL` to the Supabase Auth redirect URL allowlist for both staging and production environments. This is a pre-deploy gate in that spec's infrastructure checklist.

---

## (merged from `project_spec036_google_oauth` — Google OAuth auth — gotchas and invariants)

**Google OAuth auth** replaces magic-link. Magic-link is gone; no email+password.

**Key invariants:**
- `GET /api/auth/oauth/google` 302-redirects to Supabase. The frontend button does `window.location.href` (NOT `fetch()`).
- The callback leg (`#access_token=` hash → `POST /api/auth/callback` → httpOnly cookies) — `ProfileStore.checkSession` handles Google OAuth identically to the old magic-link path.
- `encodeURIComponent` on `redirect_to` is load-bearing — raw `://` breaks Supabase URL parsing.
- Client-side `supabase.auth.signInWithOAuth()` is impossible — Spec 030 removed the client-side Supabase SDK. All auth is server-mediated via httpOnly cookies.

**i18n:** Magic-link keys (`sendLink`, `checkEmail`, `continueWithEmail`, `checkInbox`, `magicLinkSent`, `sendError`, `email`) are removed. `auth.continueWithGoogle` added. Keep `auth.deepRevealGate` (used by `DeepRevealPane.jsx`).

**DeepRevealPane.jsx trap:** If `reason` is passed as a raw slug string (e.g. `reason="deep_reveal"`) to `AuthModal`, it renders literally on screen. Must use `reason={t('auth.deepRevealGate')}`.

**Infrastructure (pre-deploy gate):** Google Cloud Console OAuth credential + Supabase provider enable + redirect URL allowlist — one set per environment. Must complete before deploying each environment.
