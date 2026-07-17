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

## IndexedDB reset hangs sign-in silently (merged from `project_indexeddb_signin_hang`)

`indexedDB.deleteDatabase(name)` is **blocked** as long as ANY connection holds the DB open —
**including connections in other tabs**. A blocked delete stays pending, and any subsequent
`indexedDB.open(name)` queues behind it and **hangs indefinitely**. **Never use `deleteDatabase`
to reset local state — clear the object stores in place instead**: open the DB, then
`tx.objectStore(n).clear()` for each name in `db.objectStoreNames`, all in one readwrite
transaction (a clear needs no exclusive lock, so it never blocks).

Sign-in silently depends on that open: `ProfileStore.switchToSupabase` does
`await currentStore.migrateToSupabase(...)` **before** `setSession({ user })`, and
`migrateToSupabase` starts with `await this._db()` (the IndexedDB open promise). If that open
hangs, sign-in never completes client-side: the server session cookie is valid
(`GET /api/auth/session` → 200), but React `session` stays null and the UI stays signed-out —
with **NO console error** (the `try/catch` around migrate only catches rejections, not a hang).

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

## The `replaceState` hash-preservation fix is LOAD-BEARING (still, for OAuth)

`App.jsx`'s Navigator mount `useEffect` must preserve `window.location.hash`. It currently reads:
```js
window.history.replaceState({ screenKey: resolved, params: resolvedParams }, '',
  resolvedUrl + window.location.search + window.location.hash);   // App.jsx ~:56
```
A bare `replaceState(state, '', '/')` **strips the `#access_token=…` fragment** before GoTrue's async `_initialize()` can read it: the constructor's `initialize()` yields at `_acquireLock()`, React's commit phase runs the `useEffect` in between, and by the time the lock is acquired `parseParametersFromURL` sees no token → `callbackUrlType='none'` → session recovery silently skipped. Originally found via magic-link; **magic-link is gone but the OAuth callback leg uses the same `#access_token=` hash**, so this still applies. `window.location.search` is preserved for the same reason (`CheckoutReturnBanner` reads `session_id`). Don't "simplify" that line.

(Historical, now dead: the `signInWithOtp` + `emailRedirectTo` allowlist trap — `signInWithOtp`/`emailRedirectTo` no longer exist anywhere in `src/`.)

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
