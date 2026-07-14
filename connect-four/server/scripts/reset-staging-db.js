#!/usr/bin/env node
/**
 * reset-staging-db.js — wipe ALL data from the STAGING database.
 *
 * What it does:
 *   TRUNCATE every table in the `public` schema (CASCADE, RESTART IDENTITY),
 *   EXCEPT `schema_migrations`. Schema/structure and applied-migration history
 *   are preserved, so the app runs immediately with no re-migration.
 *
 * Safety:
 *   - Reads DATABASE_URL from connect-four/server/.env.staging ONLY.
 *   - Refuses to run unless the URL points at the known STAGING project ref.
 *   - Hard-refuses if the URL points at the PRODUCTION project ref.
 *   - Requires typing `Yes` (exact) TWICE at interactive prompts.
 *
 * Usage:
 *   node scripts/reset-staging-db.js            # interactive, double-confirm
 *   node scripts/reset-staging-db.js --dry-run  # list what WOULD be truncated
 *   node scripts/reset-staging-db.js --help
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Known project refs (guard against ever touching prod) ────────────────────
const STAGING_REF = 'jkqilynpshutqcceopdn';
const PRODUCTION_REF = 'kxtqwsumojtexokrtlfp';
const ENV_PATH = path.join(__dirname, '..', '.env.staging');
const KEEP_TABLES = new Set(['schema_migrations']);

function printHelp() {
  console.log(`
reset-staging-db.js — wipe ALL data from the STAGING database.

TRUNCATEs every table in the public schema (CASCADE, RESTART IDENTITY),
except schema_migrations. Schema and migration history are preserved.

Target: connect-four/server/.env.staging  (project ref ${STAGING_REF})
Refuses to run against production (ref ${PRODUCTION_REF}).

Options:
  --dry-run   List the tables that would be truncated, then exit. No changes.
  --help,-h   Show this help.

Without --dry-run, you must type "Yes" twice to proceed.
`);
}

// Parse .env manually — dotenv is not reliably available (see project memory).
function parseEnv(filePath) {
  const out = {};
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function maskUrl(url) {
  return url.replace(/(:\/\/[^:]+:)[^@]+(@)/, '$1****$2');
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }
  const dryRun = args.includes('--dry-run');

  // ── Load & validate the staging connection string ─────────────────────────
  if (!fs.existsSync(ENV_PATH)) {
    console.error(`ERROR: staging env file not found at ${ENV_PATH}`);
    process.exit(1);
  }
  const env = parseEnv(ENV_PATH);
  const dbUrl = env.DATABASE_URL;
  if (!dbUrl) {
    console.error(`ERROR: DATABASE_URL not set in ${ENV_PATH}`);
    process.exit(1);
  }

  // Safety guards — the whole point of this script is to NEVER hit prod.
  if (dbUrl.includes(PRODUCTION_REF)) {
    console.error(`ABORT: DATABASE_URL points at the PRODUCTION project ref (${PRODUCTION_REF}). Refusing.`);
    process.exit(1);
  }
  if (!dbUrl.includes(STAGING_REF)) {
    console.error(`ABORT: DATABASE_URL does not point at the expected STAGING project ref (${STAGING_REF}).`);
    console.error(`       Got: ${maskUrl(dbUrl)}`);
    console.error(`       Refusing to run against an unrecognized database.`);
    process.exit(1);
  }

  console.log('Target (STAGING):', maskUrl(dbUrl));

  const pool = new pg.Pool({ connectionString: dbUrl });
  try {
    // Double-check the LIVE connection's identity matches staging, not just the string.
    const { rows: idRows } = await pool.query('SELECT current_database() AS db, inet_server_addr() AS host, current_user AS usr');
    const ident = idRows[0] || {};
    if (ident.usr && ident.usr.includes(PRODUCTION_REF)) {
      console.error(`ABORT: connected role (${ident.usr}) belongs to PRODUCTION. Refusing.`);
      process.exit(1);
    }
    console.log(`Connected: db=${ident.db} user=${ident.usr}`);

    // Enumerate tables to truncate.
    const { rows } = await pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );
    const allTables = rows.map((r) => r.tablename);
    const toTruncate = allTables.filter((t) => !KEEP_TABLES.has(t));

    if (allTables.length === 0) {
      console.log('No tables found in public schema. Nothing to do.');
      return;
    }

    console.log(`\nTables in public schema: ${allTables.length}`);
    console.log(`Preserving: ${allTables.filter((t) => KEEP_TABLES.has(t)).join(', ') || '(none present)'}`);
    console.log(`Will TRUNCATE ${toTruncate.length} table(s):`);
    for (const t of toTruncate) console.log(`  - ${t}`);

    if (toTruncate.length === 0) {
      console.log('\nNothing to truncate. Done.');
      return;
    }

    if (dryRun) {
      console.log('\n[--dry-run] No changes made.');
      return;
    }

    // ── Double confirmation ───────────────────────────────────────────────
    console.log('\n⚠️  This will PERMANENTLY DELETE all rows from the tables above on STAGING.');
    const c1 = await ask('Type "Yes" to confirm you want to wipe the STAGING database: ');
    if (c1 !== 'Yes') {
      console.log('Aborted (first confirmation not "Yes").');
      process.exit(1);
    }
    const c2 = await ask('Are you absolutely sure? Type "Yes" again to proceed: ');
    if (c2 !== 'Yes') {
      console.log('Aborted (second confirmation not "Yes").');
      process.exit(1);
    }

    // Single TRUNCATE statement across all tables — atomic, resolves FKs via CASCADE.
    const quoted = toTruncate.map((t) => `"${t}"`).join(', ');
    const sql = `TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`;
    console.log('\nTruncating...');
    await pool.query(sql);
    console.log(`✅ Done. Wiped ${toTruncate.length} table(s) on STAGING. Schema and schema_migrations preserved.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
