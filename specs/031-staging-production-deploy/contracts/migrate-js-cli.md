# CLI Contract: server/migrate.js

## Invocation

```bash
# Normal mode — apply pending migrations
node server/migrate.js

# Baseline mode — seed ledger with existing filenames, apply nothing
node server/migrate.js --baseline
```

Must be run from `connect-four/` (the Railway project root), or from any directory where
`server/migrations/` resolves correctly relative to the script's `__dirname`.

## Environment

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Must use session-mode pooler (port 5432) with `sslmode=require`. Example: `postgresql://postgres.[ref]:[pw]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require` |

If `DATABASE_URL` is absent: exits 1 immediately with a human-readable error. No database connection is attempted.

## Modes

### Normal mode (default)

1. Creates `schema_migrations` table if it does not exist.
2. Reads all `.sql` filenames from `server/migrations/`, sorted alphabetically.
3. Reads all `filename` values from `schema_migrations`.
4. Computes `pending = disk_files − ledger_set`.
5. For each pending file in alphabetical order:
   - Wraps in a `BEGIN … COMMIT` transaction.
   - Executes the file's SQL.
   - Inserts `filename` into `schema_migrations`.
   - On error: `ROLLBACK`, prints error message identifying the failing file, exits 1.
6. Prints summary, exits 0.

### Baseline mode (`--baseline`)

1. Creates `schema_migrations` table if it does not exist.
2. Reads all `.sql` filenames from `server/migrations/`, sorted alphabetically.
3. For each filename: `INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`.
4. Prints count of rows recorded, exits 0.

No SQL from migration files is executed in this mode.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success (normal: 0+ migrations applied; baseline: filenames recorded) |
| 1 | Failure — any of: `DATABASE_URL` absent, connection error, migration SQL error, file read error |

## stdout contract

- Normal mode, 0 pending: `"0 pending migrations. Nothing to apply."`
- Normal mode, N applied: `"Applied N migration(s): [filename1], [filename2], ..."`
- Baseline mode: `"Baseline complete: N file(s) recorded in schema_migrations."`
- Progress lines (optional): one line per applied migration for observability.

## stderr contract

- `DATABASE_URL` absent: `"ERROR: DATABASE_URL environment variable is not set."` → exit 1
- Migration failure: `"ERROR: Migration [filename] failed. Transaction rolled back.\n[error message]"` → exit 1
- Any other fatal error: descriptive message → exit 1

## Idempotency guarantees

- Running in normal mode with no pending files: no-op, exit 0.
- Running `--baseline` twice: no-op on second run (ON CONFLICT DO NOTHING), exit 0.
- Running normal mode after `--baseline`: 0 pending files, exit 0.

## Integration with Railway start command

Railway start command: `node server/migrate.js && node server/index.js`

- Shell `&&` ensures `index.js` starts only if `migrate.js` exits 0.
- A non-zero exit from `migrate.js` (migration failure, missing DATABASE_URL) causes Railway to
  report a deploy failure without starting the HTTP server.
