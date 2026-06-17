# Apply database migrations

Migrations live in `connect-four/server/migrations/`. The runner is `connect-four/server/migrate.js`.
It reads `DATABASE_URL` from the `.env` file at `connect-four/server/.env`.

  cd connect-four/server

  # Apply all pending migrations
  node --env-file=.env migrate.js

  # Mark all migrations as applied without running SQL (fresh DB restore, etc.)
  node --env-file=.env migrate.js --baseline

The runner keeps a `schema_migrations` ledger table to track which files have been applied.
Each migration runs in its own transaction — if one fails, it rolls back and exits.

---

# Change tier from free to paid
  cd connect-four/server
  node --env-file=.env scripts/set-tier.js elsonidoq@gmail.com paid

  To revert: replace paid with free.
