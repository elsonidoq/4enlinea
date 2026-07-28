#!/usr/bin/env node
/**
 * backfill-lesson-progress.mjs — mark every lesson BEFORE a given lesson as
 * complete for one user, by upserting lesson_progress rows.
 *
 * Why this is needed: the app's unlock check (src/screens/sagaLock.js) is
 * pairwise — lesson L is locked unless its immediate predecessor (by the
 * numeric lesson-NN- filename prefix) has a lesson_progress row with a
 * non-null completed_at. Manually pointing a single row at a later lesson
 * (e.g. 'j-shape') does NOT unlock the lessons before it; each predecessor
 * needs its own completed row. This script writes all of them at once.
 *
 * Lesson ordering/ids are read directly from connect-four/lessons/*.json
 * (same source lessonLoader.js uses), not hardcoded.
 *
 * Usage:
 *   node server/scripts/backfill-lesson-progress.mjs --user <uuid> --up-to <lessonId> --env local|staging|production
 *   node server/scripts/backfill-lesson-progress.mjs --user <uuid> --up-to j-shape --env local --dry-run
 *   node server/scripts/backfill-lesson-progress.mjs --user <uuid> --all --env local
 *   node server/scripts/backfill-lesson-progress.mjs --help
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = path.join(__dirname, '..', '..', 'lessons');

const STAGING_REF = 'jkqilynpshutqcceopdn';
const PRODUCTION_REF = 'kxtqwsumojtexokrtlfp';

const ENV_FILES = {
  local: '.env',
  staging: '.env.staging',
  production: '.env.production',
};

function printHelp() {
  console.log(`
backfill-lesson-progress.mjs — mark every lesson BEFORE a given lesson as
complete for one user, by upserting lesson_progress rows (completed_at = now).

Why: the saga unlock check only looks at the IMMEDIATE PREDECESSOR lesson's
completion, not a "furthest lesson" pointer. Pointing one row at a later
lesson id does not unlock the lessons before it — this script backfills all
of them.

Options:
  --user <uuid>       Required. auth user id (lesson_progress.user_id).
  --up-to <lessonId>  Lesson id (e.g. j-shape). All lessons with a lower
                       order than this one are marked complete. The lesson
                       itself is NOT marked complete (only its predecessors)
                       — pass a later lesson id if you want it included too.
                       Exactly one of --up-to / --all is required.
  --all               Mark every lesson (the entire curriculum) complete.
                       Exactly one of --up-to / --all is required.
  --env <env>         Required. One of: local, staging, production.
                       Reads connect-four/server/${ENV_FILES.local} / ${ENV_FILES.staging} / ${ENV_FILES.production}.
  --dry-run           Report which lessons would be marked complete, then exit.
  --help, -h          Show this help.

Examples:
  node server/scripts/backfill-lesson-progress.mjs \\
    --user 34ceb30a-f778-461a-b845-be4015b71cf9 --up-to j-shape --env local
  node server/scripts/backfill-lesson-progress.mjs \\
    --user 34ceb30a-f778-461a-b845-be4015b71cf9 --all --env local
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

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Mirrors lessonLoader.js's ordering: numeric lesson-NN- filename prefix,
// id taken from the file's own `id` field (not derived from the filename).
function loadLessonOrder() {
  const files = fs.readdirSync(LESSONS_DIR).filter((f) => /^lesson-\d+-.*\.json$/.test(f));
  const lessons = files.map((filename) => {
    const raw = JSON.parse(fs.readFileSync(path.join(LESSONS_DIR, filename), 'utf8'));
    const orderMatch = filename.match(/^lesson-(\d+)-/);
    const order = orderMatch ? parseInt(orderMatch[1], 10) : 0;
    return { id: raw.id, order, filename };
  });
  lessons.sort((a, b) => a.order - b.order);
  return lessons;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const dryRun = args.includes('--dry-run');
  const all = args.includes('--all');
  const userIdx = args.indexOf('--user');
  const userId = userIdx !== -1 ? args[userIdx + 1] : undefined;
  const upToIdx = args.indexOf('--up-to');
  const upToLessonId = upToIdx !== -1 ? args[upToIdx + 1] : undefined;
  const envIdx = args.indexOf('--env');
  const envName = envIdx !== -1 ? args[envIdx + 1] : undefined;

  if (!userId || !envName || (!upToLessonId && !all) || (upToLessonId && all)) {
    console.error('ERROR: --user, --env, and exactly one of --up-to / --all are required.\n');
    printHelp();
    process.exit(1);
  }
  if (!Object.prototype.hasOwnProperty.call(ENV_FILES, envName)) {
    console.error(`ERROR: --env must be one of: ${Object.keys(ENV_FILES).join(', ')}`);
    process.exit(1);
  }

  const lessons = loadLessonOrder();
  let predecessors;
  if (all) {
    predecessors = lessons;
  } else {
    const target = lessons.find((l) => l.id === upToLessonId);
    if (!target) {
      console.error(`ERROR: no lesson with id '${upToLessonId}' found in ${LESSONS_DIR}`);
      console.error(`Known ids: ${lessons.map((l) => l.id).join(', ')}`);
      process.exit(1);
    }
    console.log(`Target lesson: ${target.id} (order=${target.order})`);
    predecessors = lessons.filter((l) => l.order < target.order);
  }
  if (predecessors.length === 0) {
    console.log(`Nothing to do.`);
    return;
  }

  console.log(`Lessons to mark complete (${predecessors.length}):`);
  for (const l of predecessors) console.log(`  - ${l.id} (order=${l.order})`);

  // ── Load & validate the env connection ──────────────────────────────────
  const envPath = path.join(__dirname, '..', ENV_FILES[envName]);
  if (!fs.existsSync(envPath)) {
    console.error(`ERROR: env file not found at ${envPath}`);
    process.exit(1);
  }
  const env = parseEnv(envPath);
  const supabaseUrl = env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error(`ERROR: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not both set in ${envPath}`);
    process.exit(1);
  }

  if (envName === 'production' && !supabaseUrl.includes(PRODUCTION_REF)) {
    console.error(`ABORT: --env production but ${envPath} does not point at the known production ref (${PRODUCTION_REF}).`);
    process.exit(1);
  }
  if (envName === 'staging' && !supabaseUrl.includes(STAGING_REF)) {
    console.error(`ABORT: --env staging but ${envPath} does not point at the known staging ref (${STAGING_REF}).`);
    process.exit(1);
  }
  if (envName === 'local' && !supabaseUrl.includes('127.0.0.1') && !supabaseUrl.includes('localhost')) {
    console.error(`ABORT: --env local but SUPABASE_URL (${supabaseUrl}) does not look local.`);
    process.exit(1);
  }

  console.log(`\nTarget env: ${envName} (${supabaseUrl})`);
  console.log(`Target user: ${userId}`);

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: userRow, error: userErr } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (userErr) {
    console.error(`ERROR: failed to look up user: ${userErr.message}`);
    process.exit(1);
  }
  if (!userRow) {
    console.error(`ERROR: no row in public.users with id ${userId}. Refusing to write orphaned lesson_progress rows.`);
    process.exit(1);
  }

  const { data: existingRows, error: existingErr } = await supabase
    .from('lesson_progress')
    .select('lesson_id, completed_at')
    .eq('user_id', userId)
    .in('lesson_id', predecessors.map((l) => l.id));
  if (existingErr) {
    console.error(`ERROR: failed to read existing lesson_progress: ${existingErr.message}`);
    process.exit(1);
  }
  const existingById = new Map((existingRows || []).map((r) => [r.lesson_id, r]));
  const alreadyComplete = predecessors.filter((l) => existingById.get(l.id)?.completed_at);
  const toWrite = predecessors.filter((l) => !existingById.get(l.id)?.completed_at);

  console.log(`\nAlready complete: ${alreadyComplete.length}`);
  console.log(`Will upsert completed_at for: ${toWrite.length}`);
  for (const l of toWrite) console.log(`  - ${l.id}`);

  if (dryRun) {
    console.log('\n[--dry-run] No changes made.');
    return;
  }
  if (toWrite.length === 0) {
    console.log('\nNothing to write.');
    return;
  }

  const answer = await ask(
    `\nUpsert completed_at for ${toWrite.length} lesson(s) for user ${userId} on ${envName}? Type "Yes" to confirm: `
  );
  if (answer !== 'Yes') {
    console.log('Aborted (confirmation not "Yes").');
    process.exit(1);
  }

  const nowIso = new Date().toISOString();
  const rows = toWrite.map((l) => ({ user_id: userId, lesson_id: l.id, completed_at: nowIso }));
  const { error: upsertErr } = await supabase
    .from('lesson_progress')
    .upsert(rows, { onConflict: 'user_id,lesson_id' });
  if (upsertErr) {
    console.error(`ERROR: upsert failed: ${upsertErr.message}`);
    process.exit(1);
  }

  console.log(`\n✅ Done. Marked ${toWrite.length} lesson(s) complete for user ${userId} on ${envName}.`);
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
