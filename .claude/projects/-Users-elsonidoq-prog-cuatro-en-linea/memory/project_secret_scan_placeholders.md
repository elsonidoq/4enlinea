---
name: project-secret-scan-placeholders
description: Secret-shaped strings in git history are all placeholders; security audit report location
metadata:
  type: project
---

**A `git log -S` scan for secrets turns up hits, but they are ALL placeholders — do NOT raise an alarm or rotate.** Verified 2026-07-07 across every commit that touched a secret-shaped string (`efb8723`, `476b365`, `acf7ae3`, `91529cc`, `e69b534`):

- The Supabase pooler connection string committed in the auto-memory file `.claude/.../memory/reference_supabase_connection.md` (added in `91529cc`) reads `postgresql://postgres.kxtqwsumojtexokrtlfp:PASSWORD@aws-1-us-west-2.pooler.supabase.com:5432/postgres` — the password literal is the **word `PASSWORD`**, and the service key is the literal `sb_secret_...`. Both are template text, not real.
- `whsec_...`, `sk-ant-...`, `sk_test_...` are all `.env.example` documentation placeholders.

**No secret in the repo or git history requires rotation.** The real `.env` lives only at `connect-four/server/.env` (gitignored, untracked, confirmed). Real high-value keys (`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, prod `STRIPE_*`) live only there and in the Railway env — none committed.

**NON-OBVIOUS:** the Supabase project ref `kxtqwsumojtexokrtlfp`, pooler host, and default admin email ARE in tracked files (`.claude/` memory is committed — 172 files) — recon detail, not secrets.

Full defensive review with all findings + a production verification checklist: **`docs/security_audit_fable.md`** (2026-07-07). Open items not yet fixed at audit time: vulnerable deps incl. `concurrently` mis-scoped as a prod dependency (pulls critical `shell-quote`); no `helmet`/security headers; `NODE_ENV=production` gates BOTH cookie `Secure` and `requireAdmin` (verify it's set on Railway); tracked 673 KB dev log `connect-four/log`. See [[project_boot_path_env_read_crash]], [[reference_supabase_connection]].
