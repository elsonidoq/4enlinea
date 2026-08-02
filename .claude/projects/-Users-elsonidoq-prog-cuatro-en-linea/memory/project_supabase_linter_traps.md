---
name: project_supabase_linter_traps
description: Reading the Supabase database linter — which findings are real and which are working-as-intended for this project
metadata: 
  node_type: memory
  type: project
  originSessionId: 1526aa79-582a-4684-911b-a27e1a4cad86
  modified: 2026-07-30T13:45:43.815Z
---

Two traps when triaging Supabase database-linter (database advisor) output here.

**1. `auth_allow_anonymous_sign_ins` (0012) is working-as-intended — do NOT "fix" it.**
The lint fires on policies granted to the `authenticated` role, not just `anon`, because
Supabase anonymous sign-ins hand out `authenticated`. This project enables them
(`supabase/config.toml`: `enable_anonymous_sign_ins = true`; `server/index.js`
`POST /api/auth/anonymous` → `signInAnonymously`, behind the AuthModal "Dev: skip auth"
button). Proof it is about `authenticated` and not `anon`: `games_select_own` is already
`TO authenticated` (`037_games_rls.sql`) and is still flagged. Every flagged policy is
already scoped by `auth.uid() = user_id`, so a guest sees only its own rows. The lint's
suggested remediation (an `is_anonymous is false` guard) would break guest play.

**2. Tables created by `migrate.js` bootstrap escape every RLS/grant sweep.**
`public.schema_migrations` is created by `migrate.js` itself (`CREATE TABLE IF NOT EXISTS`,
before any migration runs), so it was never covered by the `010`/`012`/`040` RLS-and-grants
migrations. Found 2026-07-29: on **production** RLS was off and `anon` held
SELECT/INSERT/UPDATE/DELETE/TRUNCATE; `GET /rest/v1/schema_migrations` with the publishable
key that ships in the frontend bundle returned HTTP 200 and the ledger. That is a write
primitive, not a leak — deleting ledger rows makes the next deploy replay non-idempotent
migrations. Staging had RLS on already; only prod tripped the lint. Fixed by
`061_security_lints.sql`.

**Why the REVOKE there is load-bearing:** TRUNCATE is *not* subject to row level security,
so `ENABLE ROW LEVEL SECURITY` alone would have left the `anon` TRUNCATE grant exploitable.
RLS-with-no-policies is not a complete substitute for revoking grants.

**Verifying a `SECURITY DEFINER` trigger-function change:** revoking `EXECUTE ... FROM PUBLIC`
on `public.handle_new_user()` does not break `on_auth_user_created` — Postgres checks EXECUTE
at `CREATE TRIGGER` time, not at fire time (verified on local 2026-07-29: anonymous sign-in
still produced the `public.users` row after the revoke). The failure mode if it ever does
break is silent — signup succeeds, `public.users` row is simply missing — so probe it with a
real sign-in and count rows, never by reading code. See [[project_auth_flow_traps]].

Still open, not schema: leaked-password protection is a dashboard Auth toggle.
