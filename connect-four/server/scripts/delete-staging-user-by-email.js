#!/usr/bin/env node
/**
 * delete-staging-user-by-email.js — permanently delete a user (and every row
 * that links to them) from the STAGING database, keyed by login email.
 *
 * What it does, for every auth user matching --email (case-insensitive):
 *   1. Deletes dependent rows in: blunders, puzzle_attempts, session_stats,
 *      lesson_progress, tracks, games, papergames_games, challenge_sessions.
 *      (Some of these already CASCADE/SET NULL via FK when public.users is
 *      deleted — deleted explicitly anyway so nothing survives and so
 *      --dry-run can report accurate counts.)
 *   2. Deletes the public.users row.
 *   3. Deletes the auth.users row via the Supabase admin API (cascades to
 *      auth.identities/sessions/refresh_tokens internally).
 *
 * Safety:
 *   - Reads DATABASE_URL + SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY from
 *     connect-four/server/.env.staging ONLY.
 *   - Refuses to run unless the URL points at the known STAGING project ref.
 *   - Hard-refuses if the URL points at the PRODUCTION project ref.
 *   - Requires typing `Yes` (exact) TWICE at interactive prompts.
 *
 * Usage:
 *   node scripts/delete-staging-user-by-email.js --email you@example.com
 *   node scripts/delete-staging-user-by-email.js --email you@example.com --dry-run
 *   node scripts/delete-staging-user-by-email.js --help
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Known project refs (guard against ever touching prod) ────────────────────
const STAGING_REF = 'jkqilynpshutqcceopdn';
const PRODUCTION_REF = 'kxtqwsumojtexokrtlfp';
const ENV_PATH = path.join(__dirname, '..', '.env.staging');

// Tables with a user_id column that references (directly or transitively)
// public.users / auth.users. Deleted in child-first order.
const DEPENDENT_TABLES = [
  'blunders',
  'puzzle_attempts',
  'session_stats',
  'lesson_progress',
  'tracks',
  'games',
  'papergames_games',
  'challenge_sessions',
];

function printHelp() {
  console.log(`
delete-staging-user-by-email.js — permanently delete a user and every row
that links to them from the STAGING database, keyed by login email.

Deletes rows from: ${DEPENDENT_TABLES.join(', ')}, public.users, and the
auth.users record itself (via the Supabase admin API).

Target: connect-four/server/.env.staging  (project ref ${STAGING_REF})
Refuses to run against production (ref ${PRODUCTION_REF}).

Options:
  --email <email>   Required. Case-insensitive match against auth.users.email.
  --dry-run         Report what would be deleted, then exit. No changes.
  --help, -h        Show this help.

Without --dry-run, you must type "Yes" twice to proceed.
`);
}

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
  const emailIdx = args.indexOf('--email');
  const email = emailIdx !== -1 ? args[emailIdx + 1] : undefined;

  if (!email) {
    console.error('ERROR: --email <email> is required.\n');
    printHelp();
    process.exit(1);
  }

  // ── Load & validate the staging connection ─────────────────────────────
  if (!fs.existsSync(ENV_PATH)) {
    console.error(`ERROR: staging env file not found at ${ENV_PATH}`);
    process.exit(1);
  }
  const env = parseEnv(ENV_PATH);
  const dbUrl = env.DATABASE_URL;
  const supabaseUrl = env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!dbUrl || !supabaseUrl || !serviceKey) {
    console.error(`ERROR: DATABASE_URL / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not all set in ${ENV_PATH}`);
    process.exit(1);
  }

  // Safety guards — the whole point of this script is to NEVER hit prod.
  if (dbUrl.includes(PRODUCTION_REF) || supabaseUrl.includes(PRODUCTION_REF)) {
    console.error(`ABORT: env points at the PRODUCTION project ref (${PRODUCTION_REF}). Refusing.`);
    process.exit(1);
  }
  if (!dbUrl.includes(STAGING_REF) || !supabaseUrl.includes(STAGING_REF)) {
    console.error(`ABORT: env does not point at the expected STAGING project ref (${STAGING_REF}).`);
    console.error(`       DATABASE_URL: ${maskUrl(dbUrl)}`);
    console.error(`       SUPABASE_URL: ${supabaseUrl}`);
    console.error(`       Refusing to run against an unrecognized database.`);
    process.exit(1);
  }

  console.log('Target (STAGING):', maskUrl(dbUrl));

  const supabase = createClient(supabaseUrl, serviceKey);
  const pool = new pg.Pool({ connectionString: dbUrl });

  try {
    // Double-check the LIVE connection's identity matches staging, not just the string.
    const { rows: idRows } = await pool.query('SELECT current_database() AS db, current_user AS usr');
    const ident = idRows[0] || {};
    if (ident.usr && ident.usr.includes(PRODUCTION_REF)) {
      console.error(`ABORT: connected role (${ident.usr}) belongs to PRODUCTION. Refusing.`);
      process.exit(1);
    }
    console.log(`Connected: db=${ident.db} user=${ident.usr}`);

    // ── Find matching auth users by email (admin API — same pattern as set-tier.js) ──
    // listUsers() paginates; walk all pages to catch every match, in case of
    // more users than the default page size.
    const matches = [];
    let page = 1;
    const perPage = 200;
    for (;;) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error(`ABORT: listUsers failed: ${error.message}`);
        process.exit(1);
      }
      for (const u of data.users) {
        if (u.email && u.email.toLowerCase() === email.toLowerCase()) matches.push(u);
      }
      if (data.users.length < perPage) break;
      page += 1;
    }

    if (matches.length === 0) {
      console.log(`No auth user found with email: ${email}. Nothing to do.`);
      return;
    }

    console.log(`\nFound ${matches.length} matching auth user(s):`);
    for (const u of matches) console.log(`  - id=${u.id} email=${u.email} created_at=${u.created_at}`);

    // ── Report row counts per dependent table (and dry-run stop point) ─────
    const ids = matches.map((u) => u.id);
    console.log('\nRow counts to be deleted:');
    const counts = {};
    for (const table of DEPENDENT_TABLES) {
      const { rows } = await pool.query(
        `SELECT count(*)::int AS n FROM ${table} WHERE user_id = ANY($1::uuid[])`,
        [ids]
      );
      counts[table] = rows[0].n;
      console.log(`  - ${table}: ${counts[table]}`);
    }
    const { rows: userRows } = await pool.query(
      `SELECT count(*)::int AS n FROM public.users WHERE id = ANY($1::uuid[])`,
      [ids]
    );
    console.log(`  - public.users: ${userRows[0].n}`);
    console.log(`  - auth.users: ${ids.length}`);

    if (dryRun) {
      console.log('\n[--dry-run] No changes made.');
      return;
    }

    // ── Double confirmation ─────────────────────────────────────────────
    console.log(`\n⚠️  This will PERMANENTLY DELETE the user(s) above and all linked rows on STAGING.`);
    const c1 = await ask(`Type "Yes" to confirm you want to delete user(s) for ${email}: `);
    if (c1 !== 'Yes') {
      console.log('Aborted (first confirmation not "Yes").');
      process.exit(1);
    }
    const c2 = await ask('Are you absolutely sure? Type "Yes" again to proceed: ');
    if (c2 !== 'Yes') {
      console.log('Aborted (second confirmation not "Yes").');
      process.exit(1);
    }

    // ── Delete dependent rows + public.users in one transaction ───────────
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const table of DEPENDENT_TABLES) {
        await client.query(`DELETE FROM ${table} WHERE user_id = ANY($1::uuid[])`, [ids]);
      }
      await client.query(`DELETE FROM public.users WHERE id = ANY($1::uuid[])`, [ids]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // ── Delete the auth.users record itself (cascades identities/sessions) ─
    for (const u of matches) {
      const { error } = await supabase.auth.admin.deleteUser(u.id);
      if (error) {
        console.error(`WARNING: failed to delete auth user ${u.id}: ${error.message}`);
      }
    }

    console.log(`\n✅ Done. Deleted ${ids.length} user(s) for ${email} and all linked rows on STAGING.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
