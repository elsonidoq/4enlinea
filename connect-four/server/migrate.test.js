import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const MIGRATE_SCRIPT = 'server/migrate.js';
const PROJECT_DIR = path.resolve(__dirname, '..');

function getMigrationFiles() {
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
}

// ── T007: DATABASE_URL absent ─────────────────────────────────────────────────

describe('T007: DATABASE_URL absent', () => {
  it('exits 1 and prints error when DATABASE_URL is not set', () => {
    const env = { ...process.env };
    delete env.DATABASE_URL;

    const result = spawnSync('node', [MIGRATE_SCRIPT], {
      cwd: PROJECT_DIR,
      env,
      encoding: 'utf8',
    });

    assert.strictEqual(result.status, 1, `Expected exit code 1, got ${result.status}`);
    assert.ok(
      result.stderr.includes('DATABASE_URL environment variable is not set'),
      `stderr should contain the missing DATABASE_URL message, got: ${result.stderr}`
    );
  });
});

// ── T008: Idempotent normal run ───────────────────────────────────────────────

describe('T008: Idempotent normal run', () => {
  let pool;

  before(async () => {
    pool = new pg.Pool({ connectionString: DB_URL });
    await pool.query('DROP TABLE IF EXISTS schema_migrations');
    await pool.query(`CREATE TABLE schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    )`);
    const allFiles = getMigrationFiles();
    for (const f of allFiles) {
      await pool.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
        [f]
      );
    }
  });

  after(async () => {
    try {
      await pool.query('DROP TABLE IF EXISTS schema_migrations');
    } catch { /* ignore cleanup errors */ }
    try {
      await pool.end();
    } catch { /* ignore */ }
  });

  it('exits 0 and reports 0 pending migrations', () => {
    const result = spawnSync('node', [MIGRATE_SCRIPT], {
      cwd: PROJECT_DIR,
      env: { ...process.env, DATABASE_URL: DB_URL },
      encoding: 'utf8',
    });

    assert.strictEqual(result.status, 0, `Expected exit code 0, got ${result.status}. stderr: ${result.stderr}`);
    assert.ok(
      result.stdout.includes('0 pending migrations'),
      `stdout should mention 0 pending, got: ${result.stdout}`
    );
  });
});

// ── T009: Baseline then normal run ────────────────────────────────────────────

describe('T009: Baseline then normal run', () => {
  let pool;

  before(async () => {
    pool = new pg.Pool({ connectionString: DB_URL });
    await pool.query('DROP TABLE IF EXISTS schema_migrations');
  });

  after(async () => {
    try {
      await pool.query('DROP TABLE IF EXISTS schema_migrations');
    } catch { /* ignore */ }
    try {
      await pool.end();
    } catch { /* ignore */ }
  });

  it('baseline records all files, then normal reports 0 pending', () => {
    // Step 1: Run baseline
    const baseline = spawnSync('node', [MIGRATE_SCRIPT, '--baseline'], {
      cwd: PROJECT_DIR,
      env: { ...process.env, DATABASE_URL: DB_URL },
      encoding: 'utf8',
    });

    assert.strictEqual(
      baseline.status, 0,
      `Baseline exit code expected 0, got ${baseline.status}. stderr: ${baseline.stderr}`
    );
    assert.ok(
      baseline.stdout.includes('Baseline complete'),
      `Baseline stdout should contain "Baseline complete", got: ${baseline.stdout}`
    );

    // Step 2: Run normal mode
    const normal = spawnSync('node', [MIGRATE_SCRIPT], {
      cwd: PROJECT_DIR,
      env: { ...process.env, DATABASE_URL: DB_URL },
      encoding: 'utf8',
    });

    assert.strictEqual(
      normal.status, 0,
      `Normal exit code expected 0, got ${normal.status}. stderr: ${normal.stderr}`
    );
    assert.ok(
      normal.stdout.includes('0 pending migrations'),
      `Normal stdout should contain "0 pending migrations", got: ${normal.stdout}`
    );
  });
});

// ── T010: Migration failure causes rollback ───────────────────────────────────

describe('T010: Migration failure causes rollback', () => {
  let pool;
  const INVALID_FILENAME = '999_invalid_test.sql';
  const INVALID_FILE = path.join(MIGRATIONS_DIR, INVALID_FILENAME);

  before(async () => {
    pool = new pg.Pool({ connectionString: DB_URL });
    // Clean slate
    await pool.query('DROP TABLE IF EXISTS schema_migrations');
    await pool.query(`CREATE TABLE schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    )`);
    // Seed all existing filenames so only the invalid one is pending
    const allFiles = getMigrationFiles();
    for (const f of allFiles) {
      await pool.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
        [f]
      );
    }
    // Create invalid migration file on disk
    fs.writeFileSync(INVALID_FILE, 'CREATE TABLE $$INVALID$$');
  });

  after(async () => {
    // Clean up temp migration file (must happen even if test fails)
    try {
      if (fs.existsSync(INVALID_FILE)) {
        fs.unlinkSync(INVALID_FILE);
      }
    } catch { /* ignore */ }
    try {
      await pool.query('DROP TABLE IF EXISTS schema_migrations');
    } catch { /* ignore */ }
    try {
      await pool.end();
    } catch { /* ignore */ }
  });

  it('exits 1, reports failure, and does not record the failing file', async () => {
    const result = spawnSync('node', [MIGRATE_SCRIPT], {
      cwd: PROJECT_DIR,
      env: { ...process.env, DATABASE_URL: DB_URL },
      encoding: 'utf8',
    });

    assert.strictEqual(
      result.status, 1,
      `Expected exit code 1, got ${result.status}. stdout: ${result.stdout}`
    );
    assert.ok(
      result.stderr.includes('Migration'),
      `stderr should contain "Migration", got: ${result.stderr}`
    );
    assert.ok(
      result.stderr.includes('failed'),
      `stderr should contain "failed", got: ${result.stderr}`
    );

    // Verify the invalid file was NOT recorded (transaction was rolled back)
    const { rows } = await pool.query(
      'SELECT filename FROM schema_migrations WHERE filename = $1',
      [INVALID_FILENAME]
    );
    assert.strictEqual(
      rows.length, 0,
      `Expected 0 rows for ${INVALID_FILENAME} (rollback), got ${rows.length}`
    );
  });
});

// ── T016: Incremental migration ───────────────────────────────────────────────

describe('T016: Incremental migration', () => {
  let pool;
  const INCREMENT_FILENAME = '999_increment_test.sql';
  const INCREMENT_FILE = path.join(MIGRATIONS_DIR, INCREMENT_FILENAME);
  /** @type {Map<string, string>} */
  let originalTimestamps;
  /** @type {number} */
  let originalCount;

  before(async () => {
    pool = new pg.Pool({ connectionString: DB_URL });
    // Clean slate
    await pool.query('DROP TABLE IF EXISTS schema_migrations');
    await pool.query(`CREATE TABLE schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    )`);
    // Seed all existing filenames (NOT the increment file)
    const allFiles = getMigrationFiles();
    originalCount = allFiles.length;
    for (const f of allFiles) {
      await pool.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
        [f]
      );
    }
    // Capture original timestamps
    const { rows } = await pool.query(
      'SELECT filename, applied_at FROM schema_migrations ORDER BY filename'
    );
    originalTimestamps = new Map(
      rows.map(r => [r.filename, r.applied_at instanceof Date ? r.applied_at.toISOString() : String(r.applied_at)])
    );

    // Create the new valid migration file on disk
    fs.writeFileSync(INCREMENT_FILE, 'CREATE TABLE IF NOT EXISTS _test_increment (id int)');
  });

  after(async () => {
    // Clean up temp migration file (must happen even if test fails)
    try {
      if (fs.existsSync(INCREMENT_FILE)) {
        fs.unlinkSync(INCREMENT_FILE);
      }
    } catch { /* ignore */ }
    try {
      await pool.query('DROP TABLE IF EXISTS _test_increment');
      await pool.query('DROP TABLE IF EXISTS schema_migrations');
    } catch { /* ignore */ }
    try {
      await pool.end();
    } catch { /* ignore */ }
  });

  it('applies new migration, preserves existing rows', async () => {
    const result = spawnSync('node', [MIGRATE_SCRIPT], {
      cwd: PROJECT_DIR,
      env: { ...process.env, DATABASE_URL: DB_URL },
      encoding: 'utf8',
    });

    assert.strictEqual(
      result.status, 0,
      `Expected exit code 0, got ${result.status}. stderr: ${result.stderr}`
    );

    // Verify N+1 rows in schema_migrations
    const { rows } = await pool.query(
      'SELECT filename, applied_at FROM schema_migrations ORDER BY filename'
    );
    assert.strictEqual(
      rows.length,
      originalCount + 1,
      `Expected ${originalCount + 1} rows, got ${rows.length}`
    );

    // Verify all prior rows have unchanged timestamps
    for (const row of rows) {
      if (originalTimestamps.has(row.filename)) {
        const originalTs = originalTimestamps.get(row.filename);
        const currentTs = row.applied_at instanceof Date
          ? row.applied_at.toISOString()
          : String(row.applied_at);
        assert.strictEqual(
          currentTs, originalTs,
          `Timestamp changed for ${row.filename}: was ${originalTs}, now ${currentTs}`
        );
      }
    }

    // Verify the new file was recorded
    const newRow = rows.find(r => r.filename === INCREMENT_FILENAME);
    assert.ok(newRow, `Expected ${INCREMENT_FILENAME} to be in schema_migrations`);
  });
});
