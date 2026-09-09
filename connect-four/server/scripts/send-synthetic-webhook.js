#!/usr/bin/env node
// server/scripts/send-synthetic-webhook.js — spec 058 (e2e-qa-enablement) T016,
// research.md D6, FR-017/FR-018/FR-019.
//
// Loads a harvested Paddle webhook fixture from
// connect-four/server/scripts/webhook-fixtures/<name>.json, substitutes ONLY
// the closed allowlist (`data.customerId`/`data.customer_id`,
// `data.id`, `event_id`/`eventId`, `occurred_at`/`occurredAt`), re-signs it
// locally at send time, and POSTs it to this server's own
// POST /api/paddle/webhook — no tunnel, no Paddle webhook simulator (FR-019).
//
// `data.status` is explicitly NOT in the allowlist (FR-017) and this script
// never touches it — editing it would convert a harvested payload back into a
// hand-authored one for the exact field under test.
//
// Casing is deliberately NOT assumed. research.md D4 leaves open whether the
// real harvested JSON (produced by a later batch, T014/T015) uses snake_case
// (Paddle's wire format) or camelCase (something re-serialized through the
// SDK's typed accessors). This script probes for whichever form is actually
// present on the loaded fixture and substitutes that same key — it never
// writes a new key alongside an existing one of the other casing. If NEITHER
// form is found for a required field, it fails loudly (throws / exits
// non-zero) rather than silently no-op'ing (see NF11: a substitution that
// lands on a key the processor never reads still gets a 200
// `{ received: true, handled: true }` from the route — that "success" is the
// exact failure class this script exists to eliminate).
//
// Usage:
//   node --env-file=server/.env server/scripts/send-synthetic-webhook.js \
//     --fixture subscription-updated-paused --customer-id ctm_xxx [--subscription-id sub_xxx]
//
// Requires PADDLE_NOTIFICATION_WEBHOOK_SECRET in the environment (NOT
// PADDLE_WEBHOOK_SECRET — see connect-four/server/.env and
// server/index.js:2865). Never printed.
//
// API_PORT is read the same way server/index.js and vite.config.js derive it
// (env var first, then a self-derive shell-out to worktree-ports.sh) so this
// script is safe to run from inside a linked worktree without manually
// exporting anything, as long as `eval "$(./worktree-ports.sh)"` has been run
// (or the script self-derives it) in this shell.

import { readFileSync } from 'node:fs';
import { createHmac, randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { handleSelfDeriveFailure } from '../worktreePorts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURES_DIR = path.join(__dirname, 'webhook-fixtures');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}

/**
 * Find whichever of two casing variants of a key is present on `obj`.
 * Returns the present key name, or null if neither is present.
 * @param {object} obj
 * @param {string} camelKey
 * @param {string} snakeKey
 * @returns {string|null}
 */
function findPresentKey(obj, camelKey, snakeKey) {
  if (Object.prototype.hasOwnProperty.call(obj, camelKey)) return camelKey;
  if (Object.prototype.hasOwnProperty.call(obj, snakeKey)) return snakeKey;
  return null;
}

/**
 * Substitute the closed allowlist (FR-017) into a harvested fixture, casing-
 * agnostic. Mutates a deep clone — never the caller's object. Throws loudly
 * (does not silently no-op) if a required field is absent under either
 * casing, per T016's NF11 requirement.
 *
 * @param {object} fixture — the parsed, harvested Paddle notification event.
 * @param {{ customerId: string, subscriptionId?: string }} subs
 * @returns {object} the substituted event, ready to JSON.stringify verbatim.
 */
export function substituteFixture(fixture, { customerId, subscriptionId }) {
  if (!customerId) {
    throw new Error('send-synthetic-webhook: --customer-id is required');
  }
  const event = JSON.parse(JSON.stringify(fixture));

  const data = event.data;
  if (!data || typeof data !== 'object') {
    throw new Error(
      'send-synthetic-webhook: fixture has no top-level `data` object — unrecognized fixture shape, refusing to guess'
    );
  }

  // data.customerId / data.customer_id (required)
  // Only snake_case is a valid wire payload. The Paddle SDK unmarshals the
  // wire form and maps it itself (`this.customerId = subscription.customer_id`),
  // so substituting into a camelCase fixture yields `customerId: undefined`
  // downstream: writeTier's `.eq('paddle_customer_id', undefined)` matches zero
  // rows, Supabase reports no error on a zero-row UPDATE, and the webhook route
  // still answers 200 {received:true, handled:true} — a silent false success,
  // the exact NF11 failure class this script exists to make impossible. Reject
  // loudly instead. (Harvested fixtures are snake_case; see the fixtures README.)
  if (data.customerId !== undefined && data.customer_id === undefined) {
    throw new Error(
      'send-synthetic-webhook: fixture `data` is camelCase (`customerId`), but only a snake_case ' +
      'wire payload can be read by the Paddle SDK. A camelCase fixture would be silently ignored ' +
      'downstream and report a false success. Re-harvest the fixture from a real sandbox notification.'
    );
  }
  const custKey = findPresentKey(data, 'customerId', 'customer_id');
  if (!custKey) {
    throw new Error(
      'send-synthetic-webhook: fixture `data` has neither `customerId` nor `customer_id` — unrecognized ' +
      'fixture shape. Refusing to write a new key the processor will never read (see NF11).'
    );
  }
  data[custKey] = customerId;

  // data.id (required; subscription id under the fixture's own `data` object)
  if (!Object.prototype.hasOwnProperty.call(data, 'id')) {
    throw new Error('send-synthetic-webhook: fixture `data` has no `id` field — unrecognized fixture shape');
  }
  if (subscriptionId) {
    data.id = subscriptionId;
  }

  // event_id / eventId (top-level, required) — always re-stamped fresh
  // (NF12: payment_events.event_id is UNIQUE; a replayed literal id from the
  // fixture file would hit Postgres 23505 on the second+ invocation and
  // silently short-circuit to `{ handled: false, eventType: 'duplicate' }`
  // without ever reaching the tier-write code path).
  const eventIdKey = findPresentKey(event, 'eventId', 'event_id');
  if (!eventIdKey) {
    throw new Error(
      'send-synthetic-webhook: fixture has neither `event_id` nor `eventId` at the top level — unrecognized fixture shape'
    );
  }
  event[eventIdKey] = `evt_synthetic_${randomUUID()}`;

  // occurred_at / occurredAt (top-level, required)
  const occurredKey = findPresentKey(event, 'occurredAt', 'occurred_at');
  if (!occurredKey) {
    throw new Error(
      'send-synthetic-webhook: fixture has neither `occurred_at` nor `occurredAt` at the top level — unrecognized fixture shape'
    );
  }
  event[occurredKey] = new Date().toISOString();

  // `data.status` is deliberately NEVER touched here (FR-017).

  return event;
}

/**
 * Build the exact `Paddle-Signature` header value the SDK's
 * WebhooksValidator expects: `ts=<unixSeconds>;h1=<hex hmac-sha256>`, computed
 * over the literal string `${ts}:${rawBody}` — verified against
 * node_modules/@paddle/paddle-node-sdk/dist/cjs/notifications/helpers/webhooks-validator.js
 * and node-crypto.js's `computeHmac` (createHmac('sha256', secret).update(payload).digest('hex')).
 *
 * @param {string} secret
 * @param {number} timestampSeconds — Unix seconds, NOT milliseconds.
 * @param {string} rawBody — the exact byte-for-byte string that will be sent as the request body.
 * @returns {string}
 */
export function buildSignatureHeader(secret, timestampSeconds, rawBody) {
  const hmac = createHmac('sha256', secret).update(`${timestampSeconds}:${rawBody}`).digest('hex');
  return `ts=${timestampSeconds};h1=${hmac}`;
}

function resolveApiPort() {
  if (process.env.API_PORT) return process.env.API_PORT;
  if (process.env.PORT) return process.env.PORT;
  try {
    const scriptPath = path.join(__dirname, '..', '..', 'worktree-ports.sh');
    const output = execSync(scriptPath, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    for (const line of output.split('\n')) {
      const match = line.match(/^export (\w+)=(.+)$/);
      if (match && match[1] === 'API_PORT') return match[2];
    }
  } catch (err) {
    handleSelfDeriveFailure(err);
    console.warn('[worktree-ports] could not self-derive API_PORT, using default 3001:', err.message);
  }
  return '3001';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fixtureName = args.fixture;
  const customerId = args['customer-id'];
  const subscriptionId = args['subscription-id'];

  if (!fixtureName || typeof fixtureName !== 'string') {
    console.error('Usage: send-synthetic-webhook.js --fixture <name> --customer-id <paddleCustomerId> [--subscription-id <id>]');
    process.exit(1);
  }
  if (!customerId || typeof customerId !== 'string') {
    console.error('--customer-id is required');
    process.exit(1);
  }

  const secret = process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      'PADDLE_NOTIFICATION_WEBHOOK_SECRET is not set. Run this script with `node --env-file=server/.env` ' +
      '(the repo convention — see package.json\'s "server" script) or export it in the shell.'
    );
    process.exit(1);
  }

  const fixturePath = path.join(FIXTURES_DIR, `${fixtureName}.json`);
  let fixtureRaw;
  try {
    fixtureRaw = readFileSync(fixturePath, 'utf8');
  } catch (err) {
    console.error(`Could not read fixture "${fixturePath}": ${err.message}`);
    process.exit(1);
  }

  let fixture;
  try {
    fixture = JSON.parse(fixtureRaw);
  } catch (err) {
    console.error(`Fixture "${fixturePath}" is not valid JSON: ${err.message}`);
    process.exit(1);
  }

  const event = substituteFixture(fixture, { customerId, subscriptionId });
  // Serialize once. Sign THIS exact string — never re-serialize after signing.
  const rawBody = JSON.stringify(event);

  const apiPort = resolveApiPort();
  const url = `http://localhost:${apiPort}/api/paddle/webhook`;

  // Compute-and-send must complete within the SDK's 5-second validity window
  // (WebhooksValidator.MAX_VALID_TIME_DIFFERENCE) — sign as late as possible,
  // immediately before the fetch.
  const ts = Math.floor(Date.now() / 1000);
  const signatureHeader = buildSignatureHeader(secret, ts, rawBody);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Paddle-Signature': signatureHeader,
    },
    body: rawBody,
  });
  const responseText = await res.text();
  console.log(`POST ${url} -> ${res.status}`);
  console.log(responseText);
  if (!res.ok) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('send-synthetic-webhook failed:', err.message);
    process.exit(1);
  });
}
