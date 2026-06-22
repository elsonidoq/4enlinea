---
name: bug-supabase-js-session-contamination
description: "supabase-js auth.getUser(userToken) on a shared client poisons subsequent DB inserts — fix: separate authClient for all auth.* calls"
metadata:
  type: project
---

`auth.getUser(userToken)` in supabase-js v2 stores the user's JWT as the client's active session. Any subsequent `supabase.from(...).insert(...)` then runs with `Authorization: Bearer <userToken>`, causing PostgREST to execute as the `authenticated` postgres role instead of `service_role`. BYPASSRLS is skipped → RLS blocks the insert → error 42501.

**Symptoms:** blunder inserts fail with 42501 specifically when the import or analyze endpoint is reached by a logged-in user (whose token was validated by `loadUser` middleware). Direct node script inserts with the same key succeed.

**Fix (applied 2026-06-22):** Two separate supabase client instances initialized together in `server/index.js`:
- `supabase` — DB operations ONLY (`from()`, `rpc()`). Never call `auth.*` on this.
- `authClient` — auth operations ONLY (`getUser`, `refreshSession`, `signInAnonymously`). Contamination here is harmless because `authClient` is never used for DB writes.

Both are created with the same service role key and `{ auth: { persistSession: false, autoRefreshToken: false } }`.

**Why:** Separation means `loadUser` calling `authClient.auth.getUser(token)` cannot affect `supabase`'s request headers.

**How to apply:** Whenever adding new `auth.*` calls in server code, use `authClient`, not `supabase`. Any `from()` or `rpc()` call uses `supabase` only.
