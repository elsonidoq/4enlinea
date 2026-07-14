# Research: Platform Hardening & Cost Observability

All line numbers below were re-confirmed against `feature/polish` on 2026-07-11 (per spec Non-obvious
fact: "line numbers will drift, re-confirm at planning time"). Corrections to the epic/audit's stated
line numbers or premises are marked **CORRECTION**.

## §0 — Seam re-confirmation summary

| Audit citation | Current location | Status |
|---|---|---|
| `index.js:208` cookie `secure` | `cookieOpts()` at `index.js:215–221`, `secure: process.env.NODE_ENV === 'production'` at line 219 | **drifted (~11 lines), semantics unchanged** |
| `adminAuth.js:2` `requireAdmin` NODE_ENV bypass | `adminAuth.js:1–9`, bypass check is line 2: `if (process.env.NODE_ENV !== 'production') return next();` | confirmed |
| `index.js:2763` `requireLocalhost` | `index.js:2822–2827` | **drifted (~60 lines), logic unchanged** (checks `req.ip` against 3 loopback forms) |
| Lesson CRUD "guarded only by `requireAdmin`, no localhost check" (F2) | `app.get('/api/admin/lessons', requireLocalhost, requireAdmin, ...)` at `index.js:750`, and all `/api/admin/*` routes (761, 775, 790, 803, 817, 563–751 range) | **CORRECTION — audit is stale.** Every `/api/admin/*` route already carries **both** `requireLocalhost` AND `requireAdmin` on `feature/polish`. F2's "admin write endpoints become world-open if NODE_ENV unset" is **not fully true today**: `requireAdmin`'s NODE_ENV bypass alone cannot open these routes because `requireLocalhost` still gates on `req.ip`. F2 remains valid only for the **cookie `Secure`** half; the "admin gate opens" half is already mitigated by defense-in-depth (`requireLocalhost` always applies regardless of `NODE_ENV`). FR-006's boot assertion is still worth adding for the cookie-security half and as defense against a future admin route added without the localhost gate, but the severity framing (F2 = "High — a single missing env var opens every admin endpoint") should be corrected to "High for cookies, Low/redundant for admin routes given current gating."|
| `index.js:2720` debug endpoint, "no validation" (F8) | `/api/debug/classify-all` at `index.js:2779–2816`. Has an **inline** localhost check (duplicated from `requireLocalhost`, not the shared middleware) at lines 2780–2783. **No `MOVES_RE` validation** before `solver.query(ms)` at line 2786 — F8 confirmed still open. | confirmed, drifted ~60 lines |
| Canonical movestring regex | `const MOVES_RE = /^[0-6]{0,42}$/;` at `index.js:133` | confirmed — reuse this constant in the debug endpoint fix (FR-011), do not inline a second copy |
| `~53` raw `err.message` 500 sites | `grep -c 'res.status(500).json({ error: err.message })` (+ `e.message` variant) in `index.js` = **38** on `feature/polish` | **drifted count** (53 → 38); still "many," same fix (FR-010) |
| `defaultCallLLM` (`mechanismExplainer.mjs`) | `mechanismExplainer.mjs:29–51`. Called from `explainMove` handler via the injected-or-default pattern at line 106: `callLLM ?? ((p) => defaultCallLLM(p, { model, apiKey: process.env.OPENAI_API_KEY }))`. `model` here is `OPENAI_MODEL`. | confirmed |
| `callLLM` (`llmCoachHelpers.js`) | `llmCoachHelpers.js:184–209`. Reads `OPENAI_API_KEY`/`OPENAI_MODEL` directly. Only caller on `feature/polish`: `tests/scripts/run_eval.mjs:27` (import) → used at lines 212, 235 for first/retry LLM calls. | confirmed; **the epic's "invoked from `run_eval.mjs`" premise holds** |
| `compute.mjs`'s own OpenAI fetch | **CORRECTION — not a bare inline fetch call as implied; it is a named local function** `callExplainLLM` at `scripts/compute.mjs:266–292`, structurally near-identical to `defaultCallLLM` (same `useJsonFormat` retry-on-`response_format`-rejection logic, same `max_completion_tokens: 4000`). It is **not exported**; called from `runLlm()` at line 375. Reads `EXPLAIN_MODEL` (module-level `model` var, set at `compute.mjs:120` from `--model` CLI flag or `process.env.EXPLAIN_MODEL`) and `process.env.OPENAI_API_KEY` directly (not passed as params, unlike `defaultCallLLM`). | Because `callExplainLLM` and `defaultCallLLM` are near-duplicates, the unification (FR-017) is a straightforward "replace `compute.mjs`'s local copy with a call to the shared helper" — not a redesign. |
| Anthropic path | `index.js:193–195` (client init, gated on `ANTHROPIC_API_KEY`), `composeExplanation` at `index.js:474–...`, `anthropic.messages.create` at `index.js:499` | confirmed, **untouched per FR-024** |
| OpenAI TTS | `index.js:3691–3780` (`GET /api/user/tts/deep-reveal`), synthesis via `synthesizeStream` from `./ttsProvider.js` (dynamically imported at call time), **not** a raw `fetch` at `index.js:3760` as the epic's line citation suggested — the actual OpenAI HTTP call lives inside `ttsProvider.js`, not inline in `index.js`. | **CORRECTION — location, not scope.** Out-of-scope either way per FR-024; noted only so nobody hunts for it at the wrong line during implementation. |
| `concurrently` mis-scoped | `connect-four/package.json` — confirmed present under `"dependencies"`, absent from `"devDependencies"` | confirmed |
| `helmet` dependency | Absent from `connect-four/package.json` entirely (not just unused) — must be added as a new dependency | confirmed |
| `.DS_Store` gitignore (F7) | **CORRECTION — root `.gitignore` (`/Users/elsonidoq/prog/cuatro_en_linea/.gitignore`) ALREADY contains `.DS_Store`** (added since the audit ran). What remains is only the `git rm --cached` half of F7 — 3 already-tracked files (`.claude/.DS_Store`, `docs/external_references/.DS_Store`, `docs/mvp/mockup/.DS_Store`) need untracking; no `.gitignore` edit is needed. | FR-013 scope narrows to `git rm --cached` only for this item |
| `connect-four/log` tracked (F6) | Confirmed still tracked; `connect-four/.gitignore` has `*.log`/`logs` but not the literal filename `log` | confirmed, fix as specced |
| `.claude/` tracked file count (F9) | **CORRECTION — 146 files, not 172** (audit's count has drifted as memory/skills content changed) | count only; decision scope unchanged |
| Rate limiting (`index.js:88–94`, F4-adjacent) | `rateLimit()` factory at `index.js:84`, `app.set('trust proxy', 1)` at line 62 | confirmed |

## §1 — FR-006 boot-time assertion: refuse-to-boot vs. warn

**Decision: refuse to boot (`process.exit(1)`) after a loud `console.error`, not just warn.**

**Rationale:** F2 is rated High severity specifically because it silently downgrades cookie security
in production with no signal to the operator. A warning that scrolls past in Railway's log stream is
easy to miss on a solo-founder deploy; refusing to boot forces immediate attention and cannot regress
silently. The condition is narrow and false-positive-safe: fire only when
`process.env.NODE_ENV !== 'production'` **AND** `process.env.SUPABASE_URL` is set and does **not**
point at a local/dev instance (i.e., does not contain `127.0.0.1` or `localhost`). This correctly
allows local dev (`SUPABASE_URL=http://127.0.0.1:54321` per `connect-four/server/.env`) and any future
local Supabase setup to boot without `NODE_ENV=production`, while refusing to boot if a real Supabase
project URL is configured without also setting `NODE_ENV=production`.

**No `.env` read is introduced.** The assertion only inspects `process.env.NODE_ENV` and
`process.env.SUPABASE_URL`, both of which are already read elsewhere in `index.js` at module scope
without incident (they arrive from the platform's environment in prod, from `--env-file` locally).
This does **not** trigger the `project_boot_path_env_read_crash` trap (that trap is specifically about
a bare `readFileSync('.env')` executing as an import side-effect reachable from `index.js` in prod,
where no `.env` file exists — this assertion reads `process.env`, never the filesystem).

**Placement:** immediately after `dotenv`/env-file loading resolves (i.e., after all `process.env.*`
reads that could be populated from a local `.env` are already settled) and before `app.listen(...)`.

## §2 — CSP directive set (FR-003/004/005)

**Decision: derive the Supabase host from `process.env.SUPABASE_URL` at runtime; do not hardcode the
project ref.** `new URL(process.env.SUPABASE_URL).host` yields `kxtqwsumojtexokrtlfp.supabase.co` in
production and `127.0.0.1:54321` in local dev — the same code path works in both environments without
an env-specific branch, and if the Supabase project is ever migrated, the CSP updates itself.

**Decision: no Sentry ingest host in the CSP.** See Research §5 — the frontend never calls
`Sentry.init()`, so `@sentry/react`'s `captureException` in `ErrorBoundary.jsx` is currently a no-op
that issues **no network request**. There is nothing for the CSP to explicitly allow today. Server-side
Sentry (`@sentry/node` in `server/logger.js`, gated on `SENTRY_DSN`) makes its HTTP call from Node,
which browser CSP cannot affect either way. Adding a speculative `connect-src` entry for an
unconfigured, uninitialized client would be dead configuration (Constitution VII: explicit over
implicit — don't encode a policy for traffic that doesn't exist). FR-005's error-reporting smoke-test
leg is **dropped, not redirected to the server-side path** — server-side Sentry (`@sentry/node`,
`server/logger.js`) is gated on `SENTRY_DSN`, which is commented out / not confirmed set in
`.env.example`, so a smoke test against it would be permanently inconclusive (see §2 smoke-test scope,
below). This is a correction from an earlier planning pass that had reframed the leg onto the
server-side path; that reframing didn't hold up once `SENTRY_DSN`'s configuration state was checked.

**Decision: no `frame-src`/`form-action` entry is required for Google OAuth.**
`AuthModal.jsx:47` performs the OAuth handoff via `window.location.href = '${oauthBase}/api/auth/oauth/google'`
— a full top-level page navigation, not a `fetch`/XHR (governed by `connect-src`), not a popup
(`window.open`, governed by nothing CSP-related), and not an iframe (governed by `frame-src`). Standard
CSP source directives (`connect-src`, `frame-src`, `form-action`) do not restrict top-level navigation
via `location.href` assignment — the only directive that could theoretically apply
(`navigate-to`) is experimental/unsupported across browsers and not worth adopting for this. **This is
a correction to the epic's Non-obvious-facts framing**, which assumed the OAuth hop needed an explicit
CSP allowance. FR-005's OAuth smoke test remains required (full round-trip: our page → Supabase
authorize URL → Google → back to `${FRONTEND_URL}/auth/callback` → `POST /api/auth/callback`), because
`helmet`'s CSP could still incidentally break something else on the page (script/style loading) during
the flow — but no CSP directive needs to specifically "permit" Google.

**Final directive set** (derived programmatically where noted):
```
default-src 'self'
script-src  'self'
style-src   'self'                 # revisit → 'unsafe-inline' only if the FR-005 smoke test's
                                    #   general click-through surfaces a style-src violation
                                    #   (no styled-components/emotion in package.json; React's
                                    #   style={{}} prop sets element.style properties directly,
                                    #   which style-src does not restrict — CSS Modules / <link>
                                    #   stylesheets are the only other style source in this app)
img-src     'self' data:
media-src   'self' https://<supabase-host>   # signed Storage URL for coach-tts audio (302
                                              #   redirect target of GET /api/user/tts/deep-reveal)
connect-src 'self'                 # same-origin API only — F10 confirms no client Supabase SDK,
                                    #   so the browser never talks to Supabase REST/auth directly
frame-ancestors 'none'             # F3 anti-clickjacking; app is never framed
base-uri    'self'
object-src  'none'
```
`<supabase-host>` = `new URL(process.env.SUPABASE_URL).host`, computed once at server startup.
HSTS: `maxAge: 31536000, includeSubDomains: true` (per audit's suggested config). `X-Content-Type-Options: nosniff`
and `Referrer-Policy` (`strict-origin-when-cross-origin`, `helmet`'s default) ship via `helmet`'s
defaults; no custom config needed for those two.

**FR-005 smoke-test scope (revised, concrete — error-reporting leg dropped, see below):**
1. TTS: trigger a Deep Reveal in a browser with CSP active, confirm audio plays (validates
   `media-src` allows the signed Supabase Storage URL).
2. OAuth: complete a full Google sign-in round-trip with CSP active (validates no CSP directive
   accidentally blocks the redirect chain or the post-redirect page's own script/style loading).
3. General click-through (Home → Board → a Deep Reveal panel) with browser DevTools console open,
   confirm zero CSP violation messages — this is the practical check for the `style-src` question
   above, and is also the gate for Decision 1 (ship `style-src 'self'`; add `'unsafe-inline'` only if
   this click-through surfaces a real violation).

**Error-reporting leg: N/A, not a smoke-test leg.** Server-side Sentry (`@sentry/node` in
`server/logger.js`) is gated on `SENTRY_DSN`, which is commented out / not confirmed set in
`connect-four/server/.env.example` — testing it would be permanently inconclusive as a CSP gate (it
would pass or fail based on an unrelated, unconfirmed env var, not the CSP itself). Frontend Sentry is
dead code (§5) with no ingest call to smoke-test in the first place. FR-005 is therefore downgraded to
two legs only (TTS, OAuth); the error-reporting leg is dropped and tracked instead as a
`docs/open_issues.md` backlog item (frontend Sentry `Sentry.init()` never called).

## §3 — F2/F4 admin-endpoint hardening scope (FR-009)

Per spec FR-009 and the epic's Settled decisions: **no mandatory admin-session second factor is added
in this feature** — that is explicitly deferred to a tracked ticket (see spec Out of Scope). FR-009's
actual code scope is narrow: confirm `requireLocalhost` (`index.js:2822`) cannot be spoofed via a
client-supplied `X-Forwarded-For: 127.0.0.1` header, given `app.set('trust proxy', 1)` at `index.js:62`.
With `trust proxy = 1`, Express derives `req.ip` from the rightmost entry of `X-Forwarded-For` that
it trusts as coming from a proxy — i.e., it trusts exactly one hop and takes the client-facing IP as
whatever the trusted proxy reports, discarding any XFF value the original client tried to inject
further left in the chain. This is correct **only if Railway's edge is exactly one hop** (audit F4).
No code change is required for this if the trust-proxy count is accurate; this becomes a live
verification item (`curl -H 'X-Forwarded-For: 127.0.0.1' .../api/admin/candidates` → expect 403),
recorded in `staging_checks.md` per FR-025 — it cannot be verified locally because it depends on
Railway's actual proxy topology, which does not exist in local dev.

**Decision: also fix the debug endpoint's duplicated/inline localhost check.** `index.js:2779` has its
own copy of the loopback-IP check rather than using the `requireLocalhost` middleware (defined later
in the file at line 2822, but hoisted — function declarations hoist, so it is callable earlier in file
order). Consolidating onto the shared middleware removes duplicated logic (Constitution II) and is a
natural place to also add the `MOVES_RE` validation (FR-011) in the same edit.

## §4 — Frontend Google OAuth flow (confirms §2's CSP correction)

`src/components/AuthModal.jsx:47`: `window.location.href = '${oauthBase}/api/auth/oauth/google'`.
Server: `GET /api/auth/oauth/google` (`index.js:227–232`) redirects (302) to a Supabase-built Google
authorize URL. Google redirects back to `${FRONTEND_URL}/auth/callback` (still top-level navigation).
Frontend's callback handler (not traced further here — out of this feature's edit scope) extracts
tokens and calls `POST /api/auth/callback` (`index.js:235–...`), which is a same-origin `fetch`
governed by `connect-src 'self'` — already covered. No new insight beyond §2's correction.

## §5 — Frontend Sentry is dead code (drives §2's decision)

`@sentry/react` (`connect-four/package.json`) is a listed dependency. `src/components/ErrorBoundary.jsx`
imports it and calls `Sentry.captureException(error, { extra: info })` in `componentDidCatch`. **No
`Sentry.init(...)` call exists anywhere in `connect-four/src/`** (confirmed via repo-wide search), and
no `VITE_SENTRY_DSN` (or any frontend-facing Sentry env var) exists in `.env.example` or `.env`. An
uninitialized `@sentry/react` SDK's `captureException` is a no-op (it does not throw, but it also does
not transmit — there is no client configured to send through). **This means frontend error reporting
is currently non-functional**, independent of this feature.

**Decision: this feature does not fix it** (out of scope — FR-003/004/005 are about response headers
and their interaction with *existing* external calls, not about wiring up a previously-unconfigured
integration). **Decision: record it as a backlog item in `docs/open_issues.md`** per
`feedback_open_issues_destination` memory (deferred/latent bugs → `docs/open_issues.md`, OI-N format,
not memory), so it isn't silently rediscovered later. This is a genuine, newly-discovered gap the
audit's own framing (which assumed `@sentry/react` "POSTs error events to the Sentry ingest domain")
missed — the audit was a static review and did not check for the presence of the `Sentry.init()` call.

## §6 — `llm_usage` table shape & lifecycle (FR-021)

New migration `056_llm_usage.sql` (next number after `055_stripe_events_tracks_grants.sql`). Columns
per FR-021/Key Entities: `id` (uuid pk), `endpoint` (text — e.g. `'explain-move-llm'`, `'compute-eval'`,
`'run-eval'`), `purpose` (text — e.g. `'deep-reveal'`, `'offline-eval'`), `user_id` (uuid, nullable —
null for offline/CLI calls per US5 AC2), `model` (text), `prompt_tokens` (int), `completion_tokens`
(int), `total_tokens` (int), `cost_usd` (numeric, nullable only if the model is genuinely unpriced —
see §7), `created_at` (timestamptz, default `now()`). No `updated_at`/soft-delete — append-only per
FR-021, matching the `explanation_cache` **decoupling** requirement (this table has no TTL/purge job,
unlike `explanation_cache`'s TRUNCATE-on-deploy precedent, memory `project_spec039_audio_interactive_coach`).
RLS: enabled, deny-by-default, no policies — service-role only, consistent with every other
backend-only table (`stripe_events`, `explanation_cache`, per F10/migration precedent `010`/`037`).

## §7 — Rate table (FR-020)

Current configured models on `feature/polish` (`connect-four/server/.env`): `OPENAI_MODEL=gpt-5.4-mini`
(used by `defaultCallLLM`/`callLLM` — the prod deep-reveal path and the offline `run_eval.mjs` harness)
and `EXPLAIN_MODEL=gpt-5.4` (used by `compute.mjs`'s `callExplainLLM` for offline eval). `llmPricing.js`
must have entries for at least these two model ids. **Decision: unknown-model fallback logs a warning
(via `logError`) and returns `cost_usd: null` rather than throwing** — a missing rate-table entry must
never prevent the usage row itself from being written (FR-022's "never silently drop the entry" applies
to the whole record, not just the cost field); SC-006 requires "non-null cost" for calls made through
the documented, priced models, which this guarantees as long as the table is kept current for whichever
models are actually configured — an unpriced model is a data-quality gap to notice (via the warning
log), not a reason to lose the token-count data. Per FR-020's Settled Decision, the rate table itself is
a single version-controlled in-repo constants module (`llmPricing.js`), not env vars or a DB table.

## §8 — Unified helper contract (FR-017–023)

See `contracts/llm-call-helper.md` for the full signature. Summary: `llmChat.js` exports one async
function, `callOpenAIChat(prompt, { model, apiKey, endpoint, userId, purpose })`, that:
1. Performs the `fetch` (absorbing the `useJsonFormat`-retry-on-`response_format`-rejection logic
   currently duplicated in `defaultCallLLM`/`callExplainLLM`).
2. Returns `{ content, usage: { promptTokens, completionTokens, totalTokens } }` (FR-018) — `usage`
   comes directly from OpenAI's response `usage.prompt_tokens`/`usage.completion_tokens`/`usage.total_tokens`,
   already present in every chat-completions response today and simply discarded by all three current
   callers.
3. On success, fire-and-forget calls `llmUsageLedger.recordUsage({ endpoint, userId, purpose, model,
   usage, costUsd })` (FR-021) — never awaited by the caller, so a ledger-write failure cannot delay or
   fail the actual LLM response to the end user (Constitution V fire-and-forget precedent).
4. On failure (non-2xx or thrown), logs via `logError` (server-conventions.md convention) with the
   `context` object attached as `extra`, and re-throws — no ledger row is written for a failed call
   (FR-022), and the caller's existing error-handling (which already exists at each of the three call
   sites) is unchanged.

Each of the three callers is updated to (a) pass its context object and (b) destructure
`{ content, usage }` instead of treating the return value as a bare string — `usage` is otherwise
unused by two of the three callers (only the ledger write inside `llmChat.js` consumes it), so this is
a minimal, mechanical edit at each call site.

**One caller is not purely mechanical: the production deep-reveal `userId`.** Unlike `endpoint` and
`purpose`, which are static string literals at each call site, `userId` is request-scoped and must be
threaded through an existing function boundary that doesn't currently carry it. This is a
signature-changing edit, not a find-and-replace, and has two required edit points (both named
explicitly in `contracts/llm-call-helper.md`'s "userId threading" section and in `plan.md`'s Project
Structure): `computeMechanism`'s options object *and* its internal `defaultCallLLM` call closure
(`mechanismExplainer.mjs`), plus the route's call to `computeMechanism` (`index.js:1083`). Skipping
either leaves `userId` silently `null` for every production call — no error, no test failure unless a
dedicated regression test asserts a non-null `userId` end-to-end, which `tasks.md` must include.
