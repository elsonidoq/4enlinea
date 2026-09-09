## Handoff context (from tasks_create)

35 tasks (T001-T035): Setup 1, Foundational 5, US1 5, US2 11, US3 1, US4 9, Polish 3.
NOTE: `check-prerequisites.sh` errored on the non-feature-branch name in this worktree (expected,
see memory `reference_custom_commands` — non-fatal); tasks.md was written manually from the
already-read design docs.

**Key decisions and reasoning:**
- The full `qaAccountTools.js` module (BOTH `resetQaAccount` and `setQaAccountEmail`) sits in the
  **Foundational** phase rather than split across US1/US2, since both stories consume the same file
  and the template's rule sends a multi-story entity to the earliest phase. US1's independent test
  therefore depends on Foundational completing first — consistent with the template's phase model
  (Foundational always blocks all stories), not a break of independent testability.
- **T013 (`qa-set-email` endpoint) returns the same 503 payments-not-configured check as
  `qa-rollback`, even though `setQaAccountEmail` never touches `paddleClient`.** This is what
  `contracts/qa-endpoints.md` states verbatim ("both routes below return 503 ... before calling
  `createQaAccountTools` at all"). The contract was followed literally rather than "fixing" what
  looks like unnecessary coupling; flagged in the task text as INTENTIONAL so an implementer does
  not second-guess it. **A critique should decide whether this is right, not assume it is a slip.**
- **T019 (billing-portal 400 UI) is VERIFICATION-ONLY** — no code task generated. The plan's file
  map lists no frontend file for portal-error UI, and "fixing bugs the QA run discovers" is explicit
  Out of Scope. If the 400 path renders a dead button today, that is a QA finding for a separate OI
  entry, not a task here.
- **T014 (harvest) is where D4's raw-wire key-casing open item gets resolved** — written as an
  explicit "determine by inspection, do NOT assume" instruction rather than picking snake_case or
  camelCase, per the epic's framing that this is the harvest task's job.

**Deferred / left for implementation-time verification:**
- The exact `paddleClient.subscriptions.list` / `.cancel` SDK call shapes (T003) are flagged for
  `paddle-docs` MCP confirmation before finalizing, matching research.md D2's own caveat that these
  are recorded INTENT, not MCP-verified.
- T009's HTTP-test scaffolding tells the implementer to check `server/userEndpoints.test.mjs`'s
  existing request-mocking convention first rather than prescribing one — not every existing
  admin-route test file's mocking style was audited. Worth a quick look before writing T009.

**Fragile areas:**
- **T018/T020/T021 (manual payment-sweep drive tasks) deliberately keep ONE account across all of
  them** per Settled decision 10. If a future editor reorders these or interleaves a reset, NF1's
  security-rejection failure mode reappears SILENTLY. Called out explicitly in T018's text.
- **T028's "one pass over one file"** instruction for `open_issues.md`'s three locations is
  intentional (avoids conflicting parallel edits to the same file) — do NOT let a later agent split
  it into three parallel tasks.

## Orchestrator verification of tasks.md (2026-09-08)
- 35 tasks, T001-T035, confirmed.
- `connect-four/package.json` -> T005 with the hand-edit warning verbatim (tasks.md:110-114).
- `qaAccountTools.test.mjs` mock -> "MUST return a fake `SubscriptionCollection`" (tasks.md:90).
- `docs/open_issues.md` -> T028 covering `:3779`, `:3915`, `:5738` in one pass (tasks.md:343).
- No `docs/deployment_steps.md` work-queue entry; T032 is a prose retraction, explicitly labelled
  (tasks.md:13-16, 356-358).
- No task drives `DeepRevealPane`; the only tunnel/simulator mention is the negative instruction at
  tasks.md:234 ("No tunnel, no webhook simulator (FR-019)").

## Orchestrator-established facts — do not re-derive, generate no tasks for
1. Local puzzle pool is populated above the N=20 floor for all 12 categories (602 active rows). The
   one `forced_win` row with `correct_cols = NULL` is a QA *finding* — out of scope.
2. Paddle sandbox test-card rules are ALREADY DOCUMENTED at
   `.claude/skills/app-qa/references/environment.md:116`. No task may ask for that documentation.
   The dunning card `4000 0027 6000 3184` is the mechanism FR-016 needs for `past_due`. The REST of
   environment.md's corrections (NF3, NF6, NF7) ARE outstanding pipeline work under FR-023.
3. `staging_checks.md:102-105` still documents STRIPE test cards (stale since spec 050). Flagged to
   the owner; out of scope.
4. `npm run test:fast` baseline is GREEN: 1755 tests, 264 suites, 0 fail. AC7 is judged against
   this, not against zero.
5. NF15 verified: `payment_events` has no user/customer column; the
   `upgrade_completed_track:${transactionId}` second ledger row is real at `paddleProcessor.js:194`.
6. D4's webhook signature contract is EXACT: `ts=<unix>;h1=<hmac-sha256(secret,"<ts>:<rawBody>")>`,
   hard 5-second window (`MAX_VALID_TIME_DIFFERENCE = 5`).
7. Deploy prerequisites are NONE, walked against the actual design at `plan.md:160`.
8. The app-qa skill already accepts a `tier-journey` area argument — FR-026/AC5 needs no new command.
