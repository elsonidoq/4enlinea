---
name: project_migration_ledger_and_pooler
description: "schema_migrations filenames can collide with and diverge from what's on disk, and server-conventions' 'transaction pooler is forbidden' rationale is wrong — staging has applied migrations through 6543 for months"
metadata: 
  node_type: memory
  type: project
  modified: 2026-08-02T14:09:32.409Z
  originSessionId: 7169f717-895a-435c-ba5a-2ecedb316040
---

Before writing, numbering, or applying a migration — and **before calling a pooler port a deploy
blocker** — check these two things at the source. Both were got wrong in one session (spec 054).

**1. `schema_migrations` is a filename ledger, and its contents can diverge from `server/migrations/`.**
`migrate.js` tracks applied migrations by **filename**, not by number. Measured 2026-08-02: staging and
production both have `061_security_lints.sql` recorded as applied, but **that file is not on disk** —
the on-disk 061 is `061_correct_cols.sql`, which neither environment has. Two different migrations
share the number 061, and the on-disk one will run on the next deploy even though "061" looks applied.

Consequences: never infer "environment is up to date through NNN" from the highest number in the
ledger; never assume a number is free just because no other migration on disk uses it; and always
diff the ledger against `ls server/migrations/` per environment before a deploy, not just the counts.

```sql
SELECT filename, applied_at FROM schema_migrations ORDER BY applied_at DESC LIMIT 10;
```

**2. `docs/architecture/server-conventions.md` says the transaction pooler (port 6543) is FORBIDDEN
for `migrate.js`. Its stated reason is wrong, and staging has been on 6543 for months, successfully.**
The doc's rationale — "each statement may execute on a different backend connection" — describes
pgbouncer **statement** mode. In **transaction** mode a backend is pinned for the duration of an
explicit `BEGIN…COMMIT`, which is exactly what `migrate.js` issues, so multi-statement DDL
transactions work. Measured: staging's ledger shows five migrations applied through its 6543
connection, most recently `061_security_lints.sql` on 2026-07-30. Production is on 5432.

**How to apply:** the 5432 convention is still the documented MUST and worth converging on — but
treat a 6543 connection string as **convention drift, not a blocker**, and never report it as "this
deploy will fail" without checking the ledger first. The real transaction-mode limitations (prepared
statements, session state, `pg_dump`) aren't exercised by this runner.

**Why this matters beyond migrations:** the failure here was reporting a doc's *stated consequence*
as a measured fact. The doc said what should be true; one `SELECT` against the ledger said what was
true. When a doc asserts a failure mode, the doc is the claim — the database is the evidence. See
[[feedback_verify_at_the_source_layer]].

Related: [[reference_supabase_connection]], [[project_user_column_propagation]],
[[project_puzzle_attempt_outcome_traps]], [[feedback_implemented_vs_deployable]].
