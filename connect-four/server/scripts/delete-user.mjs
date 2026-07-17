#!/usr/bin/env node
// Delete all data for a user identified by email.
// Saves a JSON snapshot of all their rows BEFORE deleting anything.
//
// Usage (from connect-four/):
//   node --env-file=server/.env server/scripts/delete-user.mjs <email>

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const [email] = process.argv.slice(2);
if (!email) {
  console.error('Usage: node --env-file=server/.env server/scripts/delete-user.mjs <email>');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ── 1. Resolve user ──────────────────────────────────────────────────────────

const { data: { users: authUsers }, error: listErr } = await supabase.auth.admin.listUsers();
if (listErr) { console.error('auth.admin.listUsers:', listErr.message); process.exit(1); }

const authUser = authUsers.find(u => u.email === email);
if (!authUser) { console.error(`No auth user found with email: ${email}`); process.exit(1); }

const userId = authUser.id;
console.log(`Found user: ${userId} <${email}>`);

// Get device_uuid from public.users (needed for tables that store it instead of user_id)
const { data: profile, error: profileErr } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();
if (profileErr) { console.error('users lookup:', profileErr.message); process.exit(1); }

const deviceUuid = profile.device_uuid;
console.log(`device_uuid: ${deviceUuid ?? '(none)'}`);

// ── 2. Snapshot ───────────────────────────────────────────────────────────────

async function fetchAll(table, filter) {
  const q = supabase.from(table).select('*');
  for (const [col, val] of Object.entries(filter)) q.eq(col, val);
  const { data, error } = await q;
  if (error) { console.error(`snapshot ${table}:`, error.message); return []; }
  return data ?? [];
}

async function fetchByDeviceOrUser(table) {
  // Tables that have both user_id and device_uuid — union both sets.
  const byUser = userId
    ? (await supabase.from(table).select('*').eq('user_id', userId)).data ?? []
    : [];
  const byDevice = deviceUuid
    ? (await supabase.from(table).select('*').eq('device_uuid', deviceUuid)).data ?? []
    : [];
  // Deduplicate by id
  const seen = new Set();
  return [...byUser, ...byDevice].filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
}

console.log('\nSnapshoting data…');

const snapshot = {
  captured_at: new Date().toISOString(),
  email,
  user_id: userId,
  device_uuid: deviceUuid,
  auth_user: authUser,
  users: [profile],
  session_stats:      await fetchAll('session_stats',      { user_id: userId }),
  lesson_progress:    await fetchAll('lesson_progress',    { user_id: userId }),
  challenge_sessions: await fetchAll('challenge_sessions', { user_id: userId }),
  blunders:           await fetchAll('blunders',           { user_id: userId }),
  games:              await fetchByDeviceOrUser('games'),
  papergames_games:   userId ? (await supabase.from('papergames_games').select('*').eq('user_id', userId)).data ?? [] : [],
  puzzle_attempts:    await fetchByDeviceOrUser('puzzle_attempts'),
  tracks:             userId ? (await supabase.from('tracks').select('*').eq('user_id', userId)).data ?? [] : [],
};

const safeName = email.replace(/[^a-z0-9]/gi, '_');
const outPath = resolve(`user_snapshot_${safeName}_${Date.now()}.json`);
writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
console.log(`\nSnapshot saved → ${outPath}`);

// Print counts
for (const [key, val] of Object.entries(snapshot)) {
  if (Array.isArray(val)) console.log(`  ${key}: ${val.length} row(s)`);
}

// ── 3. Confirm ───────────────────────────────────────────────────────────────

const readline = await import('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const answer = await new Promise(res => rl.question('\nProceed with deletion? [yes/N] ', res));
rl.close();

if (answer.trim().toLowerCase() !== 'yes') {
  console.log('Aborted. No data was deleted.');
  process.exit(0);
}

// ── 4. Delete (FK-safe order) ─────────────────────────────────────────────────
// Delete SET-NULL tables explicitly first, then auth.users which cascades the rest.

console.log('\nDeleting…');

async function del(table, col, val, label) {
  if (!val) { console.log(`  skip ${label} (no ${col})`); return; }
  const { error, count } = await supabase.from(table).delete({ count: 'exact' }).eq(col, val);
  if (error) { console.error(`  ERROR deleting ${label}:`, error.message); }
  else console.log(`  deleted ${label}: ${count} row(s)`);
}

// Tables with device_uuid: delete by both user_id and device_uuid
async function delByBoth(table) {
  if (userId) {
    const { error, count } = await supabase.from(table).delete({ count: 'exact' }).eq('user_id', userId);
    if (error) console.error(`  ERROR deleting ${table} by user_id:`, error.message);
    else console.log(`  deleted ${table} (by user_id): ${count} row(s)`);
  }
  if (deviceUuid) {
    const { error, count } = await supabase.from(table).delete({ count: 'exact' }).eq('device_uuid', deviceUuid);
    if (error) console.error(`  ERROR deleting ${table} by device_uuid:`, error.message);
    else console.log(`  deleted ${table} (by device_uuid): ${count} row(s)`);
  }
}

// blunders reference papergames_games with SET NULL — delete blunders first so
// papergames_games rows can be removed cleanly.
await del('blunders',           'user_id',  userId,     'blunders');
await del('papergames_games',   'user_id',  userId,     'papergames_games');
await delByBoth('games');
await delByBoth('puzzle_attempts');
await del('tracks',             'user_id',  userId,     'tracks');

// Deleting the auth user cascades to:
//   public.users → session_stats, lesson_progress, blunders (already gone)
//   challenge_sessions (CASCADE from auth.users)
const { error: deleteAuthErr } = await supabase.auth.admin.deleteUser(userId);
if (deleteAuthErr) {
  console.error('ERROR deleting auth user:', deleteAuthErr.message);
  process.exit(1);
}
console.log('  deleted auth.users + cascades (public.users, session_stats, lesson_progress, challenge_sessions)');

console.log('\nDone. All data for', email, 'has been deleted.');
