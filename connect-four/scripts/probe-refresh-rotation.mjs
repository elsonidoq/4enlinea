// OI-5: re-run the FR-002a refresh-token rotation probe against a REAL
// email/OAuth session. The original check (research.md R1, 2026-07-11) only
// tested anonymous sessions (signInAnonymously); a real email/password session
// was never exercised. This decides whether the deliberate no-de-dup-Map design
// in server/authRefresh.js is safe, or whether the TTL-bounded single-flight
// Map must be built (plan Task F2).
//
// Usage (from connect-four/, with a REAL test account's credentials):
//   node --env-file=server/.env scripts/probe-refresh-rotation.mjs <email> <password>
//
// Env: SUPABASE_URL (required). Apikey: SUPABASE_ANON_KEY if set, else
// SUPABASE_SERVICE_ROLE_KEY (this env has only the service-role key; it is a
// valid apikey for auth calls — fine for a local, non-shipped probe).
//
// Interpretation:
//   both calls OK  -> GoTrue does NOT rotate-with-reuse-detection -> NO de-dup
//                     Map needed. Record in server-conventions.md + close OI-5.
//   second call ERROR (refresh_token_already_used) -> rotation IS enforced ->
//                     build the de-dup Map (Task F2).
import { createClient } from '@supabase/supabase-js';

const [email, password] = process.argv.slice(2);
if (!email || !password || email === '--help' || email === '-h') {
  console.error(
    'usage: node --env-file=server/.env scripts/probe-refresh-rotation.mjs <email> <password>\n' +
      '  Runs two concurrent refreshSession() calls presenting the SAME refresh token\n' +
      '  from a REAL signed-in session, to detect refresh-token rotation-with-reuse-detection.',
  );
  process.exit(email === '--help' || email === '-h' ? 0 : 2);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('missing SUPABASE_URL and/or an apikey (SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(2);
}

const client = createClient(url, key, { auth: { persistSession: false } });
const { data: signIn, error: signInErr } = await client.auth.signInWithPassword({ email, password });
if (signInErr) {
  console.error('sign-in failed:', signInErr.message);
  process.exit(1);
}
const refreshToken = signIn.session.refresh_token;

// Fire two concurrent refreshes presenting the SAME refresh token from two clients.
const c1 = createClient(url, key, { auth: { persistSession: false } });
const c2 = createClient(url, key, { auth: { persistSession: false } });
const [r1, r2] = await Promise.all([
  c1.auth.refreshSession({ refresh_token: refreshToken }),
  c2.auth.refreshSession({ refresh_token: refreshToken }),
]);
console.log('call1:', r1.error ? `ERROR ${r1.error.message}` : 'OK');
console.log('call2:', r2.error ? `ERROR ${r2.error.message}` : 'OK');
const bothOk = !r1.error && !r2.error;
console.log(
  bothOk
    ? 'RESULT: no rotation-with-reuse-detection (real session) — NO de-dup Map needed (close OI-5).'
    : 'RESULT: rotation detected (refresh_token_already_used) — BUILD the de-dup Map (plan Task F2).',
);
process.exit(0);
