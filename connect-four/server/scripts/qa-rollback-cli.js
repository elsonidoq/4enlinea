#!/usr/bin/env node
// server/scripts/qa-rollback-cli.js — CLI wrapper around
// qaAccountTools.js#resetQaAccount (spec 058, e2e-qa-enablement, research.md
// D2). Resets a QA test account's tier, Paddle linkage, and sandbox
// subscription state to a known-free baseline (FR-001/006).
//
// Usage: node server/scripts/qa-rollback-cli.js <userId> --yes
//
// FR-006: refuses to run without an explicit --yes flag — this cancels real
// (sandbox) Paddle subscriptions and is not something to run accidentally in
// a non-interactive context.
//
// Reads SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / PADDLE_API_KEY directly
// from process.env (no dotenv — see memory reference_supabase_connection.md;
// export them in the shell, or run via `node --env-file=server/.env` /
// equivalent).

import { createClient } from '@supabase/supabase-js';
import { Paddle, Environment } from '@paddle/paddle-node-sdk';
import { createQaAccountTools } from '../qaAccountTools.js';

const args = process.argv.slice(2);
const yes = args.includes('--yes');
const userId = args.find((a) => !a.startsWith('--'));

if (!userId) {
  console.error('Usage: node qa-rollback-cli.js <userId> --yes');
  process.exit(1);
}
if (!yes) {
  console.error('Refusing to run without --yes (this cancels real Paddle sandbox subscriptions).');
  console.error('Usage: node qa-rollback-cli.js <userId> --yes');
  process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}
if (!process.env.PADDLE_API_KEY) {
  console.error('PADDLE_API_KEY must be set (payments not configured).');
  process.exit(1);
}

const clientOpts = { auth: { persistSession: false, autoRefreshToken: false } };
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, clientOpts);
const authClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, clientOpts);

// Same sandbox/live derivation as server/index.js — from the key's own
// `_sdbx_` prefix, never NODE_ENV. Do not add a second construction site
// elsewhere; this is the CLI's own copy, mirroring index.js's, not a shared
// import, because index.js has no exported factory for this.
const paddleEnvironment = process.env.PADDLE_API_KEY.includes('_sdbx_') ? Environment.sandbox : Environment.production;
const paddleClient = new Paddle(process.env.PADDLE_API_KEY, { environment: paddleEnvironment });

const { resetQaAccount } = createQaAccountTools({ paddleClient, supabase, authClient });

try {
  const result = await resetQaAccount({ userId });
  console.log(`✓ reset ${userId} — canceled subscriptions: ${result.canceledSubscriptions.length ? result.canceledSubscriptions.join(', ') : '(none)'}`);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
