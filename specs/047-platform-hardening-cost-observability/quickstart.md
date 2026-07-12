# Quickstart: Verifying Epic 7 (Platform Hardening & Cost Observability)

This feature has two kinds of acceptance evidence: **local** (run these yourself, any time) and
**staging-only** (recorded as sign-off checkboxes in `staging_checks.md` under a new
`## Epic 7 — Platform Hardening & Cost Observability` heading — see spec FR-025 / Assumptions). Do not
mark a staging-only item done from local evidence.

## Local checks

### US1 — Dependency vulnerabilities
```bash
cd connect-four
npm audit --production        # expect 0 critical/high after fix
npm run test:fast              # must still pass after concurrently re-scope + audit fix
```

### US2/US3 — Headers, boot assertion, generic errors, debug-endpoint validation (local dev server)
```bash
cd connect-four && npm run dev   # or however the local server is started
curl -sI http://localhost:<port>/ | grep -iE 'content-security-policy|x-content-type-options|referrer-policy'
# frame-ancestors/HSTS won't show meaningfully over plain HTTP locally — those are staging-only (C1/C2)

# Debug endpoint rejects malformed movestring:
curl -s -X POST http://localhost:<port>/api/debug/classify-all -H 'Content-Type: application/json' \
  -d '{"moves":"not-a-movestring"}'   # expect 400, not a solver error

# Generic 500 body (pick any route with a reachable server error path in dev):
# response body must be {"error":"internal error"} or similar generic text, never a raw driver/db message
```

### US4 — Repo hygiene (fully local)
```bash
git status                                    # log, .DS_Store files should be gone from tracking
git log --oneline -1 -- connect-four/log      # confirms it was removed, not just edited
```

### US5 — LLM telemetry
```bash
# Trigger the deep-reveal path (requires a signed-in session + a real board):
curl -s -X POST http://localhost:<port>/api/explain-move-llm -H 'Content-Type: application/json' \
  -H 'Cookie: sb_access_token=...' -d '{"moveString":"...", "col": N}'
# then inspect llm_usage for a new row with endpoint='explain-move-llm', purpose='deep-reveal',
# model matching OPENAI_MODEL, non-null cost_usd

# Offline compute eval:
node server/scripts/compute.mjs --llm <input.jsonl>
# inspect llm_usage for endpoint='compute-eval', purpose='offline-eval', model matching EXPLAIN_MODEL
```
Query pattern (see memory `reference_supabase_connection.md` for the inline Node script pattern —
`cd connect-four`, parse `.env` manually, use `SUPABASE_SERVICE_ROLE_KEY`):
```js
const { data } = await supabase.from('llm_usage').select('*').order('created_at', { ascending: false }).limit(5);
```

## Staging-only checks (record in `staging_checks.md`)

Every item below traces to spec FR-025 and cannot be truthfully confirmed from local dev (real HTTPS
termination, real Railway proxy topology, real Supabase dashboard config, or a genuinely clean
signed-out cross-origin OAuth round-trip). Use `docs/security_audit_fable.md` §5 (C1–C12) as the
literal `curl`/dashboard commands — this quickstart only maps them to this feature's FRs:

| staging_checks.md item | Audit checklist ref | Spec ref |
|---|---|---|
| Security headers present on a live response | C1 | US2 AC2, SC-002 |
| HTTPS redirect; `.env`/`.git`/source-map 404s | C2, C4 | US2 AC5 |
| Cookie flags (`Secure; HttpOnly; SameSite=Lax`) on both tokens | C3 | US2 AC4 |
| `NODE_ENV=production` active (admin gate + boot assertion) | C5, C6 | US2 AC1, AC6 |
| XFF spoofing rejected on `requireLocalhost` endpoints | C7 | US3 AC1 |
| Live RLS denial (anon key, `blunders` table) | C8 | US4 AC3 |
| TTS storage bucket private (unsigned public URL → 4xx) | C9 | US4 AC3 |
| OAuth/magic-link redirect allowlist has no wildcard (dashboard) | C10 | US4 AC3 |
| Rate limiting effective behind the proxy (429s appear) | C11 | US4 AC4 |
| Deployed image has the `npm audit` fixes | C12 | US1 AC4, SC-001 |
| TTS/Google-OAuth smoke test with CSP active (error-reporting leg N/A — no error-reporting service is currently wired; see spec Deferred) | — (FR-005) | US2 AC3 |
| `llm_usage` survives a full deploy cycle with zero row loss | — (FR-021/SC-007) | US5 AC5 |

For each, follow the **What / Why staging / Expected / Source** format already established in
`staging_checks.md`'s "How to add checks" section (Epic 3 seeded the worked example).

## F10 regression guards (record, don't re-verify from scratch each time)

These positive controls were confirmed sound during planning (research.md §0 note on `requireAdmin`
double-gating is itself a strengthening of one of these) and must not be silently reintroduced as
regressions by future feature work:
- Service-role key stays server-only (no `createClient`/`SUPABASE_SERVICE_ROLE_KEY`/`sb_secret` under `src/`).
- RLS stays enabled deny-by-default on every user-data/backend table, including the new `llm_usage`.
- Solver invocations stay `spawn`/`spawnSync` with array args, never `shell: true`.
- No CORS middleware is added (same-origin API + SPA serving stays intact).
- No `dangerouslySetInnerHTML`/`innerHTML`/`eval`/`new Function` is introduced under `src/`.
- `tier` stays writable only by the Stripe webhook path.
- Stripe webhook signature verification (`stripe.webhooks.constructEvent`) stays in place on the raw body.
