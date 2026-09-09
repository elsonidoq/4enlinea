#!/usr/bin/env node
/**
 * check-webhook-fixture-drift — does Paddle still send what our fixtures assume?
 *
 * WHY THIS EXISTS (spec 058, the accepted residual gap in Settled decision 8)
 * --------------------------------------------------------------------------
 * Paddle cannot deliver a webhook to `localhost`, so the downgrade-lifecycle
 * fixtures under `webhook-fixtures/` are replayed locally by
 * `send-synthetic-webhook.js` rather than delivered by Paddle. Those payloads
 * were *harvested* from real sandbox notifications (never hand-authored), but
 * they are frozen at their harvest date. If Paddle changes its payload shape
 * afterwards, the local replay keeps passing while production quietly breaks —
 * the local test cannot see the drift, because the local test *is* the frozen
 * copy.
 *
 * Staging is where that becomes visible, because there Paddle delivers for
 * real. This script compares the shape our fixtures imply against the shape of
 * the events Paddle actually delivered to the target environment.
 *
 * THE COMPARISON IS ENTITY-vs-ENTITY, NOT FIXTURE-vs-ROW
 * ------------------------------------------------------
 * `payment_events.payload` does NOT store the raw wire payload. `handleWebhook`
 * stores `payload: event`, where `event` is the object returned by
 * `paddleClient.webhooks.unmarshal(...)` — the SDK's typed, camelCase
 * EventEntity (`paddleProcessor.js`, the `payment_events` insert). Our fixtures,
 * by contrast, are raw snake_case wire payloads.
 *
 * Comparing those two directly would be meaningless. So this script pushes the
 * fixture through the SAME unmarshal path the processor uses (signing it first,
 * because `unmarshal` verifies the signature) and compares the resulting entity
 * against the stored entity. Apples to apples.
 *
 * That also makes the check sensitive to the failure mode that matters most: if
 * Paddle renames a wire field, the SDK maps it to `undefined`, `JSON.stringify`
 * drops the key on its way into JSONB, and the key simply VANISHES from the
 * stored payload. A key-path diff catches that; a value diff would not.
 *
 * WHAT IT IS NOT
 * --------------
 * This is a shape check, not a semantic one. It compares the set of key paths,
 * deliberately ignoring values (ids, amounts and timestamps differ per event by
 * design and would make every run noisy). A field that keeps its name but
 * changes meaning is invisible here.
 *
 * It also compares ENTITY shapes, which means it only sees fields the installed
 * SDK actually maps. Verified empirically 2026-09-08: adding an unknown key to a
 * fixture's wire payload produced no entity key at all, because the SDK drops
 * wire fields it does not know about. So a brand-new Paddle field stays
 * invisible here until the SDK version that maps it is installed. What the check
 * DOES catch — and what it was built for — is a field we currently depend on
 * disappearing (proven in the same run: deleting `currency_code` from a fixture
 * surfaced immediately and exited 3).
 *
 * SAFETY
 * ------
 * READ-ONLY. It issues SELECTs and nothing else — there is no `--apply`, and no
 * code path in this file writes, updates or deletes anything. It is therefore
 * safe to point at production, and it needs no typed confirmation.
 *
 * EXIT CODES
 * ----------
 *   0  no drift (or nothing comparable yet — see `--require-all`)
 *   1  the check could not run (bad args, missing env file, unreachable DB)
 *   3  DRIFT FOUND — distinct on purpose, so a deploy step can gate on it
 *
 * USAGE
 *   node server/scripts/check-webhook-fixture-drift.mjs --env staging
 *   node server/scripts/check-webhook-fixture-drift.mjs --env production --require-all
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createHmac } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { Paddle, Environment } from '@paddle/paddle-node-sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, 'webhook-fixtures');

// Same refs fill-candidate-pools.mjs guards on — keep these in sync with that file.
const STAGING_REF = 'jkqilynpshutqcceopdn';
const PRODUCTION_REF = 'kxtqwsumojtexokrtlfp';

const ENVS = {
  local:      { file: '.env',            ref: null },
  staging:    { file: '.env.staging',    ref: STAGING_REF },
  production: { file: '.env.production', ref: PRODUCTION_REF },
};

// Which stored event a fixture should be compared against. `subscription.updated`
// covers BOTH the paused and past_due transitions, so event_type alone is not a
// selector — the status discriminates them.
const FIXTURES = [
  { file: 'subscription-updated-paused.json',   eventType: 'subscription.updated',  status: 'paused' },
  { file: 'subscription-canceled.json',         eventType: 'subscription.canceled', status: 'canceled' },
  // Absent as of 2026-09-08 — the sandbox dunning card would not decline (OI-158).
  // Listed so that this check starts covering it automatically once it is harvested.
  { file: 'subscription-updated-past-due.json', eventType: 'subscription.updated',  status: 'past_due' },
];

function printHelp() {
  console.log(`
check-webhook-fixture-drift — compare harvested webhook fixtures against the
events Paddle actually delivered to an environment.

READ-ONLY. Issues SELECTs only; never writes.

  --env NAME       REQUIRED. One of: local | staging | production. No default —
                   name the target. The env file's Supabase project ref must
                   match the environment named, or the script aborts.
  --require-all    Treat "no delivered event to compare against" as a FAILURE
                   (exit 3) rather than a skip. Use this once an environment has
                   genuinely received all three event types, so that a silently
                   empty ledger can never masquerade as a pass.
  --help, -h       Show this and exit 0.

Exit codes: 0 = no drift, 1 = could not run, 3 = drift found.

Examples:
  node server/scripts/check-webhook-fixture-drift.mjs --env staging
  node server/scripts/check-webhook-fixture-drift.mjs --env production --require-all
`);
}

// Parse .env manually — dotenv is not reliably available (project memory
// reference_supabase_connection.md).
function parseEnv(filePath) {
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
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

/**
 * Every key path in an object, as dotted strings, with array indices collapsed
 * to `[]` so a 1-item and a 3-item `items` array compare equal. Values are
 * ignored entirely — see the header's "shape check, not a semantic one".
 */
export function keyPaths(value, prefix = '', acc = new Set()) {
  if (Array.isArray(value)) {
    // Union across elements: a field present on only some array members still
    // counts as part of the shape, so a sparse sample doesn't report drift.
    for (const item of value) keyPaths(item, `${prefix}[]`, acc);
    return acc;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const next = prefix ? `${prefix}.${k}` : k;
      acc.add(next);
      keyPaths(v, next, acc);
    }
  }
  return acc;
}

/** The signature `unmarshal` expects, computed over the exact body string. */
function signatureHeader(secret, ts, rawBody) {
  const h1 = createHmac('sha256', secret).update(`${ts}:${rawBody}`).digest('hex');
  return `ts=${ts};h1=${h1}`;
}

/**
 * Push a raw wire fixture through the same unmarshal the processor uses, so we
 * end up holding the entity shape that WOULD have been stored for it.
 *
 * The secret here only has to agree with itself — we sign and verify with the
 * same value — so any non-empty secret works and none is printed.
 */
async function fixtureAsStoredEntity(paddle, fixture, secret) {
  const rawBody = JSON.stringify(fixture);
  const ts = Math.floor(Date.now() / 1000);
  const event = await paddle.webhooks.unmarshal(rawBody, secret, signatureHeader(secret, ts, rawBody));
  // Round-trip through JSON exactly as the supabase client does on its way into
  // JSONB — this is what drops `undefined`-valued keys, and dropping them is
  // precisely the drift signal we are looking for.
  return JSON.parse(JSON.stringify(event));
}

async function main() {
  const args = process.argv.slice(2);

  // --help is honoured BEFORE any required-arg validation, so the script is
  // always self-describing even when invoked wrong.
  if (args.includes('--help') || args.includes('-h')) { printHelp(); process.exit(0); }

  const envName = args[args.indexOf('--env') + 1];
  if (!args.includes('--env') || !ENVS[envName]) {
    console.error('ERROR: --env is required and must be one of: local | staging | production');
    console.error('Run with --help for usage.');
    process.exit(1);
  }
  const requireAll = args.includes('--require-all');

  const envPath = path.join(__dirname, '..', ENVS[envName].file);
  if (!fs.existsSync(envPath)) {
    console.error(`ERROR: env file not found at ${envPath}`);
    process.exit(1);
  }
  const env = parseEnv(envPath);
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(`ERROR: ${ENVS[envName].file} is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`);
    process.exit(1);
  }

  // Guard: the env file's project must actually be the environment named, so a
  // stale or mis-copied file can never silently point production at staging.
  const expectedRef = ENVS[envName].ref;
  if (expectedRef && !env.SUPABASE_URL.includes(expectedRef)) {
    console.error(`ABORT: --env ${envName} expects project ref ${expectedRef}, but ${ENVS[envName].file}'s SUPABASE_URL does not contain it.`);
    process.exit(1);
  }

  const secret = env.PADDLE_NOTIFICATION_WEBHOOK_SECRET;
  if (!secret) {
    console.error(`ERROR: ${ENVS[envName].file} is missing PADDLE_NOTIFICATION_WEBHOOK_SECRET (needed to unmarshal the fixture; never printed).`);
    process.exit(1);
  }

  // Environment is decided by the API key's own prefix, never NODE_ENV — the
  // same rule server/index.js follows.
  const paddleEnvironment = (env.PADDLE_API_KEY || '').includes('_sdbx_')
    ? Environment.sandbox
    : Environment.production;
  const paddle = new Paddle(env.PADDLE_API_KEY || 'unused-for-unmarshal', { environment: paddleEnvironment });

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  console.log(`check-webhook-fixture-drift — env=${envName} (read-only)\n`);

  let drifted = 0;
  let compared = 0;
  let skipped = 0;

  for (const spec of FIXTURES) {
    const fixturePath = path.join(FIXTURES_DIR, spec.file);
    const label = `${spec.eventType} (status=${spec.status})`;

    if (!fs.existsSync(fixturePath)) {
      console.log(`SKIP  ${label} — no fixture at webhook-fixtures/${spec.file}`);
      console.log('      (expected for subscription-updated-past-due until OI-158 is closed)\n');
      skipped++;
      continue;
    }

    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    // Newest delivered event of this type. `event_type` alone cannot separate
    // paused from past_due, so filter on the status inside the stored entity.
    const { data: rows, error } = await supabase
      .from('payment_events')
      .select('event_id, event_type, payload, created_at')
      .eq('event_type', spec.eventType)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      console.error(`ERROR: querying payment_events failed: ${error.message}`);
      process.exit(1);
    }

    const match = (rows || []).find((r) => r?.payload?.data?.status === spec.status);
    if (!match) {
      const msg = `${label} — no delivered event found in payment_events to compare against`;
      if (requireAll) {
        console.log(`FAIL  ${msg} (--require-all)\n`);
        drifted++;
      } else {
        console.log(`SKIP  ${msg}`);
        console.log('      (this environment has not received one yet — re-run after it has)\n');
        skipped++;
      }
      continue;
    }

    const expected = await fixtureAsStoredEntity(paddle, fixture, secret);
    const expectedPaths = keyPaths(expected);
    const actualPaths = keyPaths(match.payload);

    // Ignore the fields the sender substitutes per send, plus per-event
    // identifiers — their VALUES differ by design and their paths always exist.
    const missing = [...expectedPaths].filter((p) => !actualPaths.has(p)).sort();
    const added = [...actualPaths].filter((p) => !expectedPaths.has(p)).sort();

    compared++;
    if (missing.length === 0 && added.length === 0) {
      console.log(`OK    ${label} — shape matches the delivered event (${match.event_id}, ${match.created_at})\n`);
      continue;
    }

    drifted++;
    console.log(`DRIFT ${label} — compared against ${match.event_id} (${match.created_at})`);
    if (missing.length) {
      console.log('      Present in our fixture, ABSENT from what Paddle delivered:');
      for (const p of missing) console.log(`        - ${p}`);
      console.log('      A vanished key usually means Paddle renamed the wire field and the SDK');
      console.log('      now maps it to undefined — the exact silent break this check exists for.');
    }
    if (added.length) {
      console.log('      Present in what Paddle delivered, ABSENT from our fixture:');
      for (const p of added) console.log(`        + ${p}`);
      console.log('      Usually additive and harmless, but it means the fixture is stale.');
    }
    console.log('      Fix: re-harvest this fixture from a real notification (see webhook-fixtures/README.md).\n');
  }

  console.log(`— compared ${compared}, skipped ${skipped}, drifted ${drifted}`);
  if (drifted > 0) {
    console.log('\nDRIFT FOUND. The local replay in send-synthetic-webhook.js is testing a payload');
    console.log('shape Paddle no longer sends. Re-harvest before trusting a local downgrade run.');
    process.exit(3);
  }
  if (compared === 0) {
    console.log('\nNothing was actually compared. This is NOT a pass — it means the environment has');
    console.log('no delivered events of these types yet. Re-run with --require-all once it should.');
  } else {
    console.log('\nNo drift: every compared fixture still matches what Paddle delivers.');
  }
  process.exit(0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('ERROR:', err.message);
    process.exit(1);
  });
}
