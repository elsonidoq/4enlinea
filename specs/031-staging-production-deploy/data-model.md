# Data Model: Staging/Production Infrastructure & Deploy

## New Table: schema_migrations

This table is self-bootstrapped by `migrate.js` at startup. It is **not** a Supabase-managed table
and is **not** part of the numbered migration files (it is created by the runner itself before any
migrations run).

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename   TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT now()
);
```

### Fields

| Column | Type | Constraints | Description |
|---|---|---|---|
| `filename` | `TEXT` | `PRIMARY KEY` | Basename of the `.sql` file, e.g. `001_initial.sql`. Uniqueness enforced by PK. |
| `applied_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Timestamp when the migration was applied (or baseline-recorded). |

### Invariants

- `filename` is always the basename only (no path prefix, no directory).
- Rows are inserted inside the same database transaction as the migration SQL. A failed migration
  leaves no ledger row.
- `--baseline` mode inserts rows with `ON CONFLICT DO NOTHING`; `applied_at` defaults to the time
  of the baseline run, not the original migration application time.
- No RLS policies — this is a server-managed operational table, accessed only by the service-role
  key via `DATABASE_URL`.
- No foreign keys. This table has no relationships to user data tables.

### Access pattern

- **Write** (normal mode): `INSERT INTO schema_migrations (filename) VALUES ($1)` — once per
  applied migration, inside a transaction.
- **Write** (baseline mode): `INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`
  — once per file on disk, outside a per-file transaction (the whole baseline is one operation set).
- **Read**: `SELECT filename FROM schema_migrations` — once at startup, to compute the pending set.

### Scope note

This table is created in the default `public` schema of the connected Supabase project. It is
visible in the Supabase dashboard but should not be exposed via PostgREST (no RLS = blocked from
anon/authenticated PostgREST access by default if RLS is enabled on the project, which it is).

## No changes to existing tables

This epic adds no columns, no indexes, and no constraints to any existing tables.
No migration files are created as part of this epic (the `schema_migrations` table is
self-bootstrapped by `migrate.js`, not tracked in its own `.sql` file, since it must
exist before any `.sql` files can be processed).
