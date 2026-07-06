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
