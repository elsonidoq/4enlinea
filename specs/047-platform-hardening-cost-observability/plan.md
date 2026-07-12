# Implementation Plan: Platform Hardening & Cost Observability

**Branch**: `feature/polish` | **Date**: 2026-07-11 | **Spec**: `specs/047-platform-hardening-cost-observability/spec.md`
**Input**: Feature specification from `/specs/047-platform-hardening-cost-observability/spec.md` (Epic 7, `polish_epic.md`)

**Note**: This plan re-confirms every code seam and line number cited in the spec against the current
`feature/polish` branch (2026-07-11). Where the audit's premise no longer holds on this branch, the
correction is called out explicitly in Research §0 rather than silently followed.

## Summary

Remediate `docs/security_audit_fable.md` findings F1–F9 (dependency vulns, `NODE_ENV` fail-safe,
security headers, admin-gate XFF-spoofing, generic 500 bodies, debug-endpoint validation, repo
hygiene) and run its C1–C12 production verification checklist; record F10 positive controls as
regression guards. Separately, unify the three OpenAI **chat** call sites (`defaultCallLLM` in
`mechanismExplainer.mjs`, `callLLM` in `llmCoachHelpers.js`, `callExplainLLM` in `scripts/compute.mjs`)
behind one instrumented helper that returns `{ content, usage }`, accepts a per-call context object,
and persists every call to a new append-only `llm_usage` table via a per-model rate table. Anthropic
and OpenAI TTS are explicitly out of scope (spec Out of Scope / Deferred).

## Technical Context

**Language/Version**: Node.js ≥20.10 (ESM + CJS mix; `server/index.js` is CJS-style `require`/module
top-level in parts, `.mjs` scripts are ESM) — confirmed by the existing `with { type: 'json' }` import
in `index.js` (server-conventions.md "Static Cross-Directory JSON Import").
**Primary Dependencies**: `express`, `express-rate-limit`, `helmet` (NEW — not currently a dependency),
`@supabase/supabase-js`, `@sentry/node` (server-only; `@sentry/react` is a listed frontend dependency
but is **never initialized** — see Research §5), `stripe`, native `fetch` for OpenAI calls (no `openai`
SDK is used for chat; TTS goes through `server/ttsProvider.js`).
**Storage**: Supabase Postgres (service-role, RLS-deny-by-default per F10). New table: `llm_usage`.
**Testing**: `node --test`, via `npm run test:fast` inside `connect-four/` (CLAUDE.md mandatory —
`candidate-generator.test.js` excluded, real-solver IPC hang risk). **Note**: `connect-four/package.json`'s
`test`/`test:fast` scripts do not auto-discover test files — each passes `node --test` an explicit,
hand-maintained list of file paths, so any new test file must also be added to both lists or it will never
run (see tasks.md T002). New regression tests are added to `connect-four/tests/unit/` per existing
convention (see `tests/unit/adminAuth.test.js` for the precedent this feature extends — that file lives at
`connect-four/tests/unit/`, NOT `connect-four/server/tests/unit/`) — this is the single, consistent test
path used throughout this feature's artifacts (plan, contract, tasks); do not create a parallel
`server/tests/unit/` location.
**Target Platform**: Railway-hosted Node server (single service, serves API + built SPA), Supabase
(Postgres + Storage + Auth), production.
**Project Type**: Web application (monorepo) — this feature touches `connect-four/server/` only; no
frontend code changes are required by any FR (CSP headers are server response headers; the OAuth
smoke test exercises existing frontend code unmodified — see Research §4).
**Performance Goals**: N/A — this is a hardening/observability feature, not a latency-sensitive one.
The unified LLM call wrapper MUST NOT add a second network round-trip (usage/cost derivation is
computed from the same response, and the ledger INSERT is fire-and-forget per Constitution V's
"analytics writes MUST be fire-and-forget" precedent for `tracks` — applied here to `llm_usage`).
**Constraints**: `npm audit --production` → 0 critical/high after remediation (FR-002). CSP must not
break TTS audio playback or the Google OAuth round-trip (FR-005 — the error-reporting leg is N/A this
feature; see Research §2/§5, frontend Sentry is never `init()`'d and server-side Sentry's `SENTRY_DSN`
is not confirmed set, so neither is a viable smoke-test gate). The
boot-time NODE_ENV assertion must not read any file at import time (see `project_boot_path_env_read_crash`
memory) — it only inspects `process.env`, so this trap does not actually apply to FR-006's
implementation, but is noted so no one adds a `.env` read while touching this code path.
**Scale/Scope**: Solo-founder-scale traffic; the `llm_usage` ledger is append-only with no expected
volume concern (one row per OpenAI chat call, currently low hundreds/day at most).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Explanation Engine as Single Source of Truth** — N/A to hardening (US1–4). US5's telemetry
  wrapper does not touch what the LLM is told or how explanations are grounded — it wraps the
  transport call only (request in, `{content, usage}` out). PASS.
- **II. Code Quality & Simplicity** — The unified LLM-call helper is a natural home for the
  currently-duplicated `defaultCallLLM`/`callExplainLLM` retry-and-`useJsonFormat`-fallback logic
  (near-identical code in `mechanismExplainer.mjs` and `scripts/compute.mjs` today — three similar
  lines becomes one shared function, not a premature abstraction). PASS.
- **III. Testing Standards** — New regression tests (FR-012, US5 AC6) are unit-level (no solver
  dependency), consistent with `tests/unit/adminAuth.test.js`. PASS.
- **IV. UX Consistency** — N/A (no user-facing UI changes in this feature).
- **V. Performance Requirements** — The `llm_usage` INSERT must be fire-and-forget, matching the
  existing `tracks` table precedent explicitly named in this principle. Addressed in design.
- **VI. Implementation & Debugging Methodology** — "Reproduce before theorizing" was applied during
  planning: the Sentry/OAuth CSP premises in the audit were re-verified against actual frontend code
  (Research §4, §5) rather than trusted from the audit's prose. "Make load-bearing assumptions
  explicit" governs FR-006 (see Research §1) and the rate-table's unknown-model fallback (Research §7).
- **VII. Software Design Philosophy** — "Errors MUST NOT pass silently" directly motivates FR-022
  (individually-wrapped call sites; a failed OpenAI call must not fabricate a ledger row, per
  `feedback_calllm_error_handling` memory).
- **VIII. Documentation (MUST check before planning)**:
  - [x] Existing architecture docs read before drafting this plan: `docs/architecture/server-conventions.md`
    (LLM Coach Helpers, Supabase Two-Client Pattern, error-logging convention), `docs/architecture/
    llm-coach-endpoints.md`, `docs/security_audit_fable.md`, `docs/best_practices_spec_driven_development.md`,
    the constitution.
  - [x] Undocumented conventions discovered during review: none required documenting before planning —
    the CSP/Sentry/OAuth corrections in Research §4–§5 are new findings *for this feature*, not
    pre-existing undocumented conventions; they will be captured in `server-conventions.md` as part of
    this feature's own deliverable (task-level, not a pre-planning blocker).
  - [ ] `tasks.md` will include explicit documentation tasks for: the new `llm_usage` table
    (`docs/architecture/data-model.md`), the unified LLM-call helper contract (`server-conventions.md`
    "LLM Coach Helpers" section), the CSP directive rationale (`server-conventions.md`), and the F10
    regression-guard list (`server-conventions.md` or a dedicated security-guards doc). — deferred to
    `/speckit-tasks`, tracked here so it isn't dropped.

No violations. No Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/047-platform-hardening-cost-observability/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output — llm_usage table
├── quickstart.md        # Phase 1 output — manual verification steps incl. staging_checks.md items
├── contracts/
│   └── llm-call-helper.md   # Internal function contract for the unified OpenAI-chat helper
└── tasks.md              # Phase 2 output (/speckit-tasks — NOT created by this command)
```

### Source Code (repository root)

This is a **web application monorepo** (`connect-four/` contains `server/` + `src/`), but this
feature is **server-only** — no `src/` changes.

```text
connect-four/
├── package.json                          # FR-001: concurrently → devDependencies; npm audit fix
├── server/
│   ├── index.js                          # FR-003/004 helmet+CSP mount; FR-006 boot assertion;
│   │                                      #   FR-007/008 (already-correct, verify); FR-009 (verify);
│   │                                      #   FR-010 generic 500 bodies; FR-011 debug-endpoint
│   │                                      #   MOVES_RE validation; FR-019 the `computeMechanism`
│   │                                      #   call at line 1083 must add `userId: req.user.id` to
│   │                                      #   its options object (req.user is already guaranteed
│   │                                      #   non-null here per the line-1036 auth guard) — the
│   │                                      #   second of the two required userId-threading edits,
│   │                                      #   see mechanismExplainer.mjs entry above
│   ├── adminAuth.js                       # F2 requireAdmin — verify only, no code change expected
│   ├── mechanismExplainer.mjs            # FR-017/018/019: defaultCallLLM → unified helper; PLUS
│                                          #   userId threading (Blocking-3 fix, see contracts/
│                                          #   llm-call-helper.md "userId threading" section) —
│                                          #   computeMechanism (line 99) options object AND its
│                                          #   internal call closure (line 106) both need { userId,
│                                          #   endpoint, purpose } added; this is two edit points,
│                                          #   not one, and both are required together
│   ├── llmCoachHelpers.js                # FR-017/018/019: callLLM → unified helper
│   ├── scripts/compute.mjs               # FR-017/018/019: callExplainLLM → unified helper
│   ├── llmChat.js                         # NEW — the unified OpenAI-chat helper (FR-017–023)
│   ├── llmPricing.js                      # NEW — per-model rate table (FR-020)
│   ├── llmUsageLedger.js                  # NEW — persistence helper for llm_usage (FR-021)
│   └── migrations/056_llm_usage.sql       # NEW — llm_usage table + RLS
├── tests/unit/                            # test path fixed to connect-four/tests/unit/, matching the
│   │                                      #   existing tests/unit/adminAuth.test.js precedent — NOT
│   │                                      #   connect-four/server/tests/unit/, which does not exist
│   ├── llmChat.test.js                    # NEW — usage/cost/context/error-isolation unit tests
│   ├── errorResponseBody.test.js          # NEW — FR-012: no raw err.message in 5xx bodies
│   ├── debugClassifyAllValidation.test.js # NEW — FR-012: malformed movestring rejected
│   └── securityHeaders.test.js            # NEW — FR-003/SC-002: CSP/HSTS/nosniff/referrer-policy headers
├── .gitignore                             # FR-013: add `log`
├── log                                    # FR-013: git rm --cached
└── .DS_Store (+ docs/**/.DS_Store, .claude/.DS_Store)  # FR-013: git rm --cached (root .gitignore
                                            #   ALREADY lists .DS_Store — see Research §2)

staging_checks.md                          # FR-025: new "## Epic 7 — Platform Hardening & Cost
                                            #   Observability" section
docs/open_issues.md                        # New backlog item: frontend @sentry/react never
                                            #   initialized (Research §5) — explicitly out of this
                                            #   feature's scope to fix
docs/architecture/server-conventions.md    # Doc updates: LLM-call helper contract, CSP rationale,
                                            #   F10 regression-guard list, llm_usage table pointer
docs/architecture/data-model.md            # Doc update: llm_usage schema
```

**Structure Decision**: All code changes live under `connect-four/server/`. Three existing call
sites are edited in place (not deleted/replaced wholesale) to minimize blast radius, per Constitution
II. The new `llmChat.js`/`llmPricing.js`/`llmUsageLedger.js` triad mirrors the existing
`insertGameBlunder.js` / `lessonAudio.js` "pure dependency-injected functions, no route-handler logic
inline" pattern documented in `server-conventions.md` ("Admin Batch-Generation Modules" section) so
each is independently `node --test`-able without an Express app.

## Complexity Tracking

No Constitution Check violations. Not applicable.
