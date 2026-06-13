import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── T002: Validate DATABASE_URL ──────────────────────────────────────────────

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const migrationsDir = path.join(__dirname, 'migrations');
const isBaseline = process.argv.includes('--baseline');

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDiskFiles() {
  return fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
}

async function getLedgerSet(client) {
  const result = await client.query('SELECT filename FROM schema_migrations');
  return new Set(result.rows.map(r => r.filename));
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // T003: Self-bootstrap the ledger table (runs first, in both modes)
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    )`
  );

  const diskFiles = getDiskFiles();

  if (isBaseline) {
    // ── T005: Baseline mode ──────────────────────────────────────────────────
    // Record all filenames without executing any migration SQL.
    const client = await pool.connect();
    try {
      for (const filename of diskFiles) {
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
          [filename]
        );
      }
    } finally {
      client.release();
    }
    console.log(`Baseline complete: ${diskFiles.length} file(s) recorded in schema_migrations.`);
    return;
  }

  // ── T004: Normal mode ──────────────────────────────────────────────────────
  const client = await pool.connect();
  let ledgerSet;
  try {
    ledgerSet = await getLedgerSet(client);
  } finally {
    client.release();
  }

  const pending = diskFiles.filter(f => !ledgerSet.has(f));

  if (pending.length === 0) {
    console.log('0 pending migrations. Nothing to apply.');
    return;
  }

  const applied = [];
  for (const filename of pending) {
    const filePath = path.join(migrationsDir, filename);
    const sql = fs.readFileSync(filePath, 'utf8');

    const migrationClient = await pool.connect();
    try {
      await migrationClient.query('BEGIN');
      await migrationClient.query(sql);
      await migrationClient.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [filename]
      );
      await migrationClient.query('COMMIT');
      applied.push(filename);
    } catch (err) {
      await migrationClient.query('ROLLBACK');
      console.error(`ERROR: Migration ${filename} failed. Transaction rolled back.`);
      console.error(err.message);
      process.exit(1);
    } finally {
      migrationClient.release();
    }
  }

  console.log(`Applied ${applied.length} migration(s): ${applied.join(', ')}`);
}

// ── T006: pool.end() in finally for clean shutdown ───────────────────────────

main()
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });
