# Feature Specification: MVP Launch Gate

**Feature Branch**: `057-mvp-launch-gate`
**Created**: 2026-08-03
**Status**: Draft
**Input**: Epic 10 — MVP Launch Gate (`docs/epics/pre-launch-mvp-epic.md`): the single gate between the
current tree and a public, paid launch of the web app on `decodec4.xyz`, in English. Contains only
blocking work — every item has a path by which a real paying user hits it. Scope is a 2026-08-03 triage
of the 48 open `OI-N` entries in `docs/open_issues.md`; 16 are in scope, the other 32 are explicitly
excluded so scope cannot silently grow.

## Settled decisions (do not relitigate — carried verbatim from the epic)

1. **"MVP launch" means a public, paid launch of the web app on `decodec4.xyz`, in English.** Spanish
   ships as a best-effort locale that silently falls back to English, and that is acceptable at launch.
   Therefore OI-36, OI-38, OI-93, OI-79 are explicitly **not** launch gates. If the owner reverses this
   and Spanish becomes a launch locale, those four re-enter and this feature must be re-sized.
2. **Admin-only surfaces are not launch gates.** There is one internal admin user; a crash or missing
   guard behind `requireLocalhost` costs that user a reload, not a customer. This removes OI-123,
   OI-107, OI-72, OI-88, OI-91, OI-114, OI-131 from scope.
3. **This feature removes blockers; it does not add features.** No new lesson, category, screen, or
   coach behavior. Where a fix is naturally feature-shaped (e.g. OI-95's "Sign in" vs "Upgrade" copy),
   ship the smallest correct version and log the rest as a new `OI-N`.
4. **No agent session writes to staging or production.** Every live data repair ships as a reviewed,
   idempotent, `--dry-run`-first script plus a deploy-steps entry; the owner runs it against live
   environments.
5. **OI-41 was stale; verified and narrowed — do not implement it.** Spec 053 already shipped the
   designed in-app `/pricing` screen and the live-browser CSP check passed 2026-08-01. All that remains
   is the hardcoded price/quota literals on the JavaScript-free `/pricing-legal` static page, a
   retained owner-accepted risk. This feature's only obligation is to re-confirm that decision, or close
   the entry won't-fix — the owner's call. No pricing-page work is in scope.
6. **Issue closeout is the `open-issues-epics.md` convention, applied verbatim**: an `OI-N` is done when
   `docs/open_issues.md` says so, in the same change that ships the work, using that file's
   fully-fixed / partially-fixed / already-resolved / deliberately-not-fixed formats. Each story carries
   its own closeout — there is no separate final cleanup pass.
7. **Every measurement in the epic's research is dated and must be re-taken at the start of the run** —
   this repo has concurrent sessions that can move the numbers between triage and execution.
8. **Owner decisions settled during epic drafting (do not re-open):**
   - OI-5, OI-31, OI-41 are owned by this feature, not by the `open-issues-epics.md` epics that
     originally listed them (those epics already shipped without doing the work).
   - OI-95's fix is a **client-side branch only**: the lesson-lock guard chain
     (`useLessonLockGuard.js` → `sagaLock.js` → `SagaScreen.jsx`/`UpgradeModal.jsx` — not the three
     lesson screens themselves, which never render locked-lesson copy; see FR-017) reads
     `GET /api/user/entitlement`'s existing `authenticated` signal and branches between "Sign in" and
     "Upgrade". No API contract change, no amendment to spec 053.
   - The Paddle default payment link points at **`/pricing`** (the existing in-app `PricingScreen`) with
     mount-time Paddle.js init and a `?_ptxn=` read. No new screen. `/pricing-legal` is disqualified —
     it must stay JavaScript-free. Dashboard configuration and sandbox end-to-end verification are
     **owner** tasks, recorded as sign-off items.
   - D2 (below) is resolved: the N=20 pool floor itself is not up for debate — serving below the floor or
     exempting a category for having been broken already are not options, and neither is hiding a
     category from serving. The remedy for any category below the floor is to generate candidates and
     approve/promote them through the admin tooling until the floor is met.

## Non-obvious facts (carried verbatim from the epic — context for requirements below)

### Grading and pools (US1)
- The grader (`evalOvercut`, dispatched from `server/predicates.js`) grades a player's answer against the
  puzzle row's **stored** `highlight_metadata`, not a fresh computation — this is why a detector change
  can silently invalidate rows already in the table.
- OI-86's "8 of 12 categories at zero" was measured **local only**; staging and production pools were
  never measured and may be healthy. The first task of this work is re-measuring on staging and
  production.
- `scripts/verify-undercut-puzzles.mjs` filters on an `approved` column that `puzzles` has never had (it
  carries `is_active boolean` instead) — PostgREST rejects the filter, so the script returns **zero rows
  for any input**. Any prior "the pool is fine" reading from it was vacuous.
- Filling seven of the eight empty categories is a **promotion pass** — candidates with `correct_cols`
  already populated are queued (`forbidden_columns` 30, `figure_7` 21, `j_shape` 14, `odd_even_threat` 13,
  `overcut` 9, `claimeven` 7, `z_threat` 3) — no solver calls. `forced_win` has only 2 queued candidates
  against the floor of 20.
- The floor is **N = 20 active puzzles per category** (`specs/051-pattern-acceptance/pool-thresholds.md`
  FR-022, an absolute owner ruling: never serve below it, never exempt a category for having been broken).
- A bulk promotion loop will trip the 120 req/min per-IP rate limiter; the 429 response is plain text and
  surfaces as an opaque JSON decode error with no handler log line.

### Response-seam text integrity (US2)
- The token-stripping guard's wiring is correct — `stripInternalTokens` is installed at the single
  response seam (`guardExplainMovePayload`/`guardExplainMoveLlmPayload`) and already covers the
  cache-hit, not-a-blunder, and fresh-generation branches. Only its **regex coverage** is wrong: it
  matches the paired `c<col>r<row>` form but not bare (`c3`) or ranged (`c3-c6`) forms.
- Widening the regex is not free: `c3` must not eat legitimate prose, and a range needs a locale-aware
  connector (Spanish degrades to English **silently** on a new untranslated string).
- The annotation gate (`server/annotationGate.js`) is well-tested (50 unit tests) but runs nowhere near
  production — its only importers are two offline scripts. This is the shared root cause of both
  OI-126 and OI-129.
- Explanations are served from two paths and the cache-hit path skips producer guards — sanitizing must
  happen at the response seam, and `explanation_cache` needs a `TRUNCATE` on deploy or repaired text will
  be masked by stale cached rows.

### Billing and conversion (US3)
- Nothing in the codebase reads `_ptxn`, the parameter Paddle appends to every payment-method-update
  email link (re-verified 2026-08-03, zero matches).
- Paddle.js never initializes on page load today — `getPaddle()` is called only inside async click
  handlers, so even a page that read `_ptxn` could not auto-open checkout without a mount-time init.
- A Paddle CSP change is a multi-round discovery, not a one-line edit, and CSP is invisible under
  `npm run dev` (the server reads the built `dist` at boot) — verification requires a rebuild, a
  restart, and a real production-build browser check.
- Sandbox vs. live Paddle mode is selected by API-key prefix, not `NODE_ENV`/`MODE`.
- `VITE_PADDLE_CLIENT_TOKEN` was recorded as unset locally (owner-confirmed) — "Paddle does not
  work locally", with the sandbox end-to-end transaction check therefore only runnable on staging.
  **That belief was disproven 2026-09-08 by spec 058 (e2e-qa-enablement)**: the Paddle sandbox
  checkout overlay works locally once `VITE_PADDLE_CLIENT_TOKEN` is configured in
  `connect-four/.env.local` — a real sandbox transaction has since been completed end to end
  against the local app.

### Grading stability (US4)
- The two "quality" labels come from genuinely different code: `scoreMove` (live solver judgment at
  request time) vs. `classifyStoredMistake` (the storage-rule threshold used when reconstructing a
  cached view). They are allowed to diverge by design today.
- The `blunders` table stores both severities (`quality ∈ {'blunder','suboptimal'}`) — every count over
  it is already a mistake count; that invariant is currently unnamed and guarded at only one of five
  call sites.

### Release gate and deploy (US5)
- `npm run test:fast` is **5 RED, not green**, identically in the main checkout — new work must be
  judged against 5 known failures, not 0. Two of the five die at `readFileSync` with `ENOENT` on a stale
  fixture path before asserting anything — they are not failing, they are not running.
- `lint` is a real gate: a lint *error* stops `test:fast` before any test runs; 47 warnings is the
  healthy baseline.
- The migration ledger tracks **filenames, not numbers**: `061_security_lints.sql` is recorded as
  applied on both staging and production but is absent from disk, while the on-disk
  `061_correct_cols.sql` has never been applied to either — "highest applied number" is a lie on both
  environments today.
- The "6543 is forbidden for DDL" rationale behind OI-31 is contradicted by observed behavior — staging
  already ships migrations on the transaction pooler and DDL works. OI-31 must be settled by measuring
  what URL the deploy actually uses, not by editing config on the strength of the rule.
- OI-5 needs no code unless a probe (`connect-four/scripts/probe-refresh-rotation.mjs`, already exists)
  run against a real account shows rotation; it is owner-gated because it needs real credentials.

## User Scenarios & Testing *(mandatory)*

> **Note on priority numbers**: P1–P5 below reflect the epic's recommended **execution order**
> (US1 → US5 → US2 → US4 → US3), not an MVP slice. US1 alone (P1) is not a shippable launch gate —
> SC-009's launch-readiness statement covers all 5 stories, and "the owner can launch" is not answerable
> until every story has shipped or been explicitly deferred.

### User Story 1 - Live puzzle answers grade correctly, and every served category has a pool (Priority: P1)

A paying subscriber works through the puzzle trainer. Every category the app is willing to serve has
enough puzzles to avoid repeats, and when the subscriber submits a genuinely correct answer, the app
marks it correct — never wrong because of stale server-side bookkeeping the subscriber can't see.

**Why this priority**: A paying user's correct answer being marked wrong, or being funneled into an
empty/near-empty category, is the most direct and highest-frequency way this app can betray the product
promise it is charging money for. It is also the largest story and gates the most user-visible damage,
so it runs first.

**Independent Test**: Can be fully tested by (a) querying staging and production `puzzles`/`candidates`
active-row counts per category and confirming every servable category is ≥ 20, and (b) re-deriving the
stored `highlight_metadata` for every live `overcut`, `undercut`, and `z_threat` row — the three
categories `server/predicates.js` grades against stored metadata rather than a fresh computation
(`evalOvercut`, `evalUndercut`, `evalZThreat`) — under the current detector and confirming each one
either still matches or has been explicitly dispositioned, repairing only where drift is actually found.

**Acceptance Scenarios**:

1. **Given** the staging and production `puzzles` tables, **When** active rows are counted per category,
   **Then** the counts are recorded in this feature's research artifact (not just the stale local count)
   and every category the app can serve has at least 20 active puzzles, or is not served.
2. **Given** the live `overcut`, `undercut`, and `z_threat` puzzle rows (the three metadata-graded
   categories in `server/predicates.js` — `evalOvercut`, `evalUndercut`, `evalZThreat`), **When** each
   row's stored `highlight_metadata` is re-derived under the current detector, **Then** every row either
   matches identically or has been dispositioned per the resolved design decision on repair-vs-retire,
   applied by an owner-run script — never left silently stale; drift found outside `overcut` is repaired
   and logged as a new `OI-N`, not silently absorbed into this feature's scope.
3. **Given** `scripts/verify-undercut-puzzles.mjs` run against local, **When** it queries the 25 known
   active undercut puzzles, **Then** it returns real rows (not zero, which is today's behavior against
   any input).
4. **Given** a subscriber submits the mathematically correct column for a puzzle, **When** the server
   grades the answer, **Then** it is marked correct — proven by a regression test that a stale-metadata
   row cannot silently grade a correct answer wrong.

---

### User Story 2 - No internal token or unhighlightable claim reaches player-facing prose (Priority: P3)

A subscriber reads an AI-generated move explanation, the flagship paid feature. The text never contains
raw internal notation (like `c3-c6`) and never names a board region the app cannot actually highlight for
them.

**Why this priority**: This is a correctness-of-the-paid-product defect with a known live reproduction,
but it is narrower in blast radius than US1 (pool health) and independent of the other stories, so it
runs after the release gate (US5) makes "tests pass" trustworthy.

**Independent Test**: Can be fully tested by feeding the OI-126 reproduction's real served explanation
string (board `455c5272-3143-43d4-aa3f-c10f9d061666`) through the response-seam sanitizer and asserting
no bare, ranged, or paired internal-coordinate token survives, in both locales.

**Acceptance Scenarios**:

1. **Given** a served explanation string containing bare (`c3`), ranged (`c3-c6`), and paired (`c3r4`)
   internal-coordinate forms, **When** it passes through the response-seam sanitizer, **Then** none of
   the three forms survive, in English and in Spanish, proven by a test whose input is a real served
   explanation string — not an invented fixture.
2. **Given** the resolved design decision on the annotation gate (D3, below), **When** it is implemented
   or deliberately deferred, **Then** the outcome is either live in the response path or recorded with
   its rationale in `docs/open_issues.md` against OI-124.
3. **Given** a sample of recent `explanation_cache` rows naming a board region, **When** each is checked
   for a corresponding `[zone:…]` annotation, **Then** a measured failure rate is produced and either the
   gate/prompt is extended to catch a named-region-without-zone, or the gap is recorded as a deliberate
   deferral with its rationale against OI-129.
4. **Given** a deploy of the sanitizer fix, **When** the deploy steps are followed, **Then**
   `explanation_cache` handling (whether to truncate) is explicitly stated in `docs/deployment_steps.md`.

---

### User Story 3 - The paid-conversion and billing-recovery paths both complete (Priority: P5)

A subscriber whose card payment fails receives Paddle's payment-method-update email, clicks it, and
lands on a page that is ready to complete the payment — not a dead end that quietly churns them. A
signed-out visitor and a free-tier subscriber, hitting the same locked-lesson wall, see different,
correctly-targeted calls to action.

**Why this priority**: Real but lower-frequency than US1/US2 (fires only for that subset of subscribers
whose card fails, or that subset of free users deciding to upgrade), and independent of the other
stories — it runs last per the epic's recommended order.

**Independent Test**: Can be fully tested by opening `/pricing?_ptxn=<real-id>` in a real browser against
a production build and confirming Paddle.js initializes on mount and the checkout auto-opens, with no
CSP violation in the console.

**Acceptance Scenarios**:

1. **Given** a visitor opens `/pricing?_ptxn=<transaction-id>`, **When** the page mounts, **Then**
   Paddle.js initializes automatically (not only inside a click handler) and the checkout auto-opens for
   that transaction, proven by a unit test, with CSP verified against a real production build in a real
   browser (not `npm run dev`). `/pricing-legal` remains JavaScript-free and out of scope.
2. **Given** the owner has pointed Paddle's dashboard default-payment-link setting at `/pricing` and runs
   a real sandbox transaction, **When** the payment-method-update email is opened, **Then** it lands on
   an open checkout — verified end-to-end by the owner and recorded as a sign-off item in
   `staging_checks.md` (not an agent-run step).
3. **Given** a signed-out visitor and a signed-in free-tier subscriber each reach a locked lesson,
   **When** `useLessonLockGuard.js` redirects them through `sagaLock.js`'s chained functions to
   `SagaScreen.jsx`, **Then** the signed-out visitor sees "Sign in" copy (via the existing
   `AuthModal.jsx`) and the free-tier subscriber sees "Upgrade" copy (via `UpgradeModal.jsx`) — no new
   API contract, no spec-053 amendment.
4. **Given** OI-41's narrowed scope (only the `/pricing-legal` hardcoded literals remain), **When** this
   story concludes, **Then** the decision to accept that risk is re-confirmed, or the entry is closed
   won't-fix — either way recorded in `docs/open_issues.md`.

---

### User Story 4 - A mistake's severity is stable across every view of the same game (Priority: P4)

A player reviews a game they just finished, sees a move flagged as a "blunder," comes back later, and
sees the exact same move still flagged as a "blunder" — never silently downgraded to "suboptimal" (or the
reverse) because a different code path reconstructed the view.

**Why this priority**: A real, reproducible defect (a user watching their own history get re-graded) but
narrower in scope than US1/US2 and independent of the other stories.

**Independent Test**: Can be fully tested by exercising one boundary-case move through both the live
scoring path and the cached-reconstruction path and asserting identical `quality` output.

**Acceptance Scenarios**:

1. **Given** a move that is a boundary case between "blunder" and "suboptimal," **When** it is scored on
   first analysis and again on every later reconstructed view, **Then** the `quality` label is identical
   both times, proven by a test exercising both the live and reconstruction paths.
2. **Given** the resolved design decision on which label is authoritative (D4, below), **When** it is
   implemented, **Then** the losing path is brought into line with the winning one (backfill/re-derive,
   or stop the cached view from diverging — whichever the decision selects).
3. **Given** the "never filter `blunders` by `quality` when counting mistakes" rule, **When** the codebase
   is checked, **Then** the rule is named in code and guarded by a test at more than one of its five
   call sites.

---

### User Story 5 - The release gate is trustworthy and the deploy prerequisites are settled (Priority: P2)

A future change to this codebase can be judged as "safe to ship" by running the test suite and reading
the deploy docs — not by separately re-deriving which of the failures are pre-existing and which
migration state is real.

**Why this priority**: Every other story's "tests pass" claim is only meaningful once the baseline is
known and honest, so this runs early, right after the largest/most damaging story (US1).

**Independent Test**: Can be fully tested by running `npm run test:fast` from a clean checkout and
diffing the failure list against the enumerated, justified baseline.

**Acceptance Scenarios**:

1. **Given** `npm run test:fast`, **When** it is run, **Then** it is green, or red only for failures
   explicitly enumerated and justified — and the two `ENOENT` fixture-path tests actually run and assert
   something instead of dying before their first assertion.
2. **Given** `connect-four/scripts/probe-refresh-rotation.mjs` and a real account's credentials
   (owner-only), **When** the owner runs it, **Then** the result (rotation detected → build the de-dup Map; no rotation
   → close the issue) is applied and recorded in `docs/open_issues.md`, with the run itself recorded as a
   sign-off item in `staging_checks.md`.
3. **Given** the live Railway deploy's actual migration behavior, **When** it is measured (not assumed
   from a written rationale), **Then** OI-31 (pooler URL) and OI-105 (ledger vs. disk divergence) are
   each closed with that measurement, not a rule-based edit.

### Edge Cases

- What happens when a category's promotion pass would push it just barely over the N=20 floor, but a
  concurrent session (staging/production are live) drops it back below 20 between measurement and
  promotion? → The floor check must be re-verified immediately before serving is re-enabled, not assumed
  from the earlier measurement (per the epic's "every measurement expires" settled decision).
- What happens when an `overcut`/`undercut`/`z_threat` row is retired but a player has an **in-progress
  attempt** against that exact row at the moment the owner runs `fill-candidate-pools.mjs`? → Out of
  scope to solve generally, per D1's 2026-08-03 resolution (retire-and-refill) and the owner directive
  that no row on staging/production is worth preserving; the script must still be idempotent so a
  re-run does not double-retire or double-insert.
- What happens when the regex widening for internal-token stripping is deployed but `explanation_cache`
  still holds pre-fix rows for the same board? → Addressed explicitly: `explanation_cache` handling is
  stated in `docs/deployment_steps.md` (truncate or otherwise), not left implicit.
- What happens when a visitor opens `/pricing?_ptxn=` with an **expired or invalid** transaction id? →
  Paddle.js still initializes on mount (so the page is never worse than today); the auto-open attempt
  fails gracefully and the visitor sees the normal `/pricing` page, not an error state.
- What happens when the annotation-gate measurement (OI-129) finds a 0% failure rate on the sampled
  window? → That is itself a valid outcome — record it as a deliberate deferral with the measured rate as
  the rationale, per the acceptance criterion; do not treat 0% as "no measurement happened."
- What happens when `test:fast`'s baseline shifts between epic triage and this feature's execution (a
  6th pre-existing failure appears, or one of the original 5 disappears)? → Re-run and re-enumerate the
  baseline at the start of work; the acceptance criterion is against the *current*, re-verified baseline,
  not the dated one recorded in the epic.

## Requirements *(mandatory)*

### Functional Requirements

**US1 — pool health and grading correctness**
- **FR-001**: System MUST report current active-puzzle counts per category on staging and production
  (not local-only) as the first artifact of this work, since the prior "8 of 12 empty" figure was
  measured local-only and may not hold on live environments. *(OI-86)*
- **FR-002**: `scripts/verify-undercut-puzzles.mjs` MUST return real rows when queried against a category
  with active puzzles (e.g. the 25 known local active undercut puzzles), replacing its current
  always-empty `approved`-column filter with the actual `is_active` column. *(OI-130)*
- **FR-003**: No category the app serves MUST be served below the N=20 active-puzzle floor, on staging or
  production. The queued-candidate counts cited in the epic's research (`forbidden_columns` 30,
  `figure_7` 21, `j_shape` 14, `odd_even_threat` 13, `overcut` 9, `claimeven` 7, `z_threat` 3, `forced_win`
  2) are **local-only, non-authoritative** figures and MUST be re-measured per environment (local,
  staging, production) before any remedy is chosen — a category short locally may already clear the
  floor on production, or vice versa. For every category still below the floor on the environment being
  served, the remedy is to generate candidates as needed and approve/promote them through the admin
  tooling until the floor is met — promoting first where `correct_cols`-populated candidates are already
  queued (no solver calls), generating fresh candidates otherwise. Empty pools are not a launch blocker;
  no category is hidden or excluded from serving — every category is brought up to the floor before it
  ships on that environment. *(OI-86, D2)*
- **FR-004**: The `forced_win` category, which per the epic's (local, unverified) research cannot reach
  the N=20 floor by promotion alone (2 queued candidates against the floor, per OI-83), MUST be brought
  to the floor by generating fresh candidates and approving/promoting them through the same admin
  tooling as FR-003, per environment, once the per-environment re-measurement required by FR-003 confirms
  the shortfall on that environment. `forced_win` is not a special case needing exclusion — it simply
  costs generation rather than pure promotion, which is a cost note, not a design decision. Serving below
  the floor, or exempting the category for having been broken already, remain not permitted outcomes. D2
  is resolved for every category, not just this one; see the Unresolved Design Decisions section below.
  *(OI-83, D2)*
- **FR-005**: Every live `overcut`, `undercut`, and `z_threat` puzzle row — the three categories
  `server/predicates.js` grades against stored `highlight_metadata` rather than a fresh computation
  (`evalOvercut`, `evalUndercut`, `evalZThreat`) — MUST either re-derive identically against the current
  detector, or be retired and the category refilled to the N=20 floor, per D1's resolution
  (retire-and-refill, RESOLVED 2026-08-03 — see Unresolved Design Decisions), applied only by the
  owner-run `fill-candidate-pools.mjs` — never by an agent session writing directly to staging or
  production. The audit runs read-only across all three categories; drift found is logged as a new
  `OI-N` if it is not covered by the retire-and-refill remedy, not silently absorbed into this feature's
  scope. *(OI-92, D1)*
- **FR-006**: The grader itself MUST NOT depend on the disposition in FR-005 having run: `evalOvercut`,
  `evalUndercut`, and `evalZThreat` (`server/predicates.js`) MUST cross-check the solver-gated
  `correct_cols` array before rejecting a player's answer, following the `evalFigure7` pattern already in
  that file, instead of reading only `puzzle.highlightMetadata?.cells`. A regression test MUST assert
  that a puzzle row with stale stored `highlight_metadata` cannot silently grade a genuinely correct
  player answer as wrong. *(OI-92)*
- **FR-007**: Every data-repair script produced for US1 MUST support a `--dry-run` mode and MUST be
  idempotent, per the epic's "no agent writes to live data" rule; the corresponding entry in
  `docs/deployment_steps.md` MUST describe the owner's run procedure. *(settled decision 4)*

**US2 — response-seam text integrity**
- **FR-008**: `stripInternalTokens` MUST strip bare (`c3`), ranged (`c3-c6`), and paired (`c3r4`)
  internal-coordinate forms from served explanation text, in both English and Spanish, without
  corrupting legitimate prose that happens to contain a lone "c" followed by a digit in another context.
  *(OI-126)*
- **FR-009**: The fix for FR-008 MUST be proven against a real served explanation string reproducing
  OI-126 (board `455c5272-3143-43d4-aa3f-c10f9d061666`), not an invented fixture.
- **FR-010**: System MUST resolve, per design decision D3, whether the annotation gate
  (`server/annotationGate.js`) is wired into the live explanation response path, or the fix stays
  regex-only with the gap recorded against OI-124 with its rationale.
- **FR-011**: System MUST measure the failure rate of prose naming a board region with no corresponding
  `[zone:…]` annotation, by sampling at least 50 recent `explanation_cache` rows that name a board region
  (or the full set, if fewer than 50 such rows exist — stated explicitly if so), and either extend
  detection to catch it or record a deliberate deferral with the measured rate **and the sample size**
  against OI-129, so a 0% result carries a stated floor rather than an unfloored count.
- **FR-012**: `docs/deployment_steps.md` MUST state the `explanation_cache` handling required by this
  deploy (e.g. truncation) so that repaired text is not masked by stale cached rows.

**US3 — billing recovery and conversion**
- **FR-013**: `/pricing` (the existing `PricingScreen`) MUST initialize Paddle.js on mount (not only
  inside a click handler) and, when a `?_ptxn=` query parameter is present, MUST auto-open the checkout
  for that transaction. *(OI-98, agent-satisfiable half)*
- **FR-014**: FR-013's CSP compatibility MUST be verified against a real production build in a real
  browser — `npm run dev` does not surface CSP behavior, since the server reads the built `dist` at boot.
  The **owner** MUST perform this verification (no agent session runs a production-build real-browser
  check, per Settled decision 4) and record it as a sign-off item in `staging_checks.md`.
- **FR-015**: `/pricing-legal` MUST remain JavaScript-free; no part of FR-013/FR-014 may touch it.
- **FR-016**: The owner-gated half of OI-98 — pointing Paddle's dashboard default-payment-link setting at
  `/pricing` and confirming a real subscriber's payment-method-update email reaches an open checkout via
  a real sandbox transaction — MUST be recorded as a sign-off item in `staging_checks.md`, not attempted
  by an agent session.
- **FR-017**: The lesson-lock guard chain — `useLessonLockGuard.js` (`src/lib/useLessonLockGuard.js`,
  the actual entry point the three lesson screens use, which redirects to `SagaScreen.jsx` before any
  of `ConceptScreen.jsx`/`SocraticScreen.jsx`/`CLChallengeScreen.jsx` render locked-lesson copy) →
  `sagaLock.js`'s three chained pure functions (`deriveLockReason` → `'none'|'tier'|'order'|'both'`;
  `dispatchLockAction` → `'upgrade'|'orderLock'|'navigate'`; `deriveLessonAccess` →
  `'allowed'|'upgrade'|'orderLock'`) → `SagaScreen.jsx`/`UpgradeModal.jsx` — MUST thread a new
  `'signin'` outcome through all three chained functions (not just `deriveLessonAccess`) and MUST
  reuse the existing `AuthModal.jsx` component so a signed-out visitor sees "Sign in" instead of
  "Upgrade" when a signed-in free-tier subscriber hits the same lock. The distinction MUST be derived
  from the existing `GET /api/user/entitlement` `authenticated` signal. No change to the entitlement
  API contract or to spec 053's locked-lesson stub. *(OI-95)*
- **FR-018**: OI-41 MUST be re-confirmed as an accepted risk scoped to `/pricing-legal`'s hardcoded
  literals, or closed won't-fix — either outcome recorded in `docs/open_issues.md`. No pricing-page
  redesign work is in scope.

**US4 — grading stability**
- **FR-019**: The `quality` label a move receives MUST be identical whether read from the live scoring
  path (`scoreMove`) or the cached-reconstruction path (`reconstructAnalysisFromBlunders`), per the
  authoritative-source decision D4. *(OI-104)*
- **FR-019a** *(owner directive, 2026-08-03 — binding, supersedes any weaker reading of FR-019)*: at this
  feature's close there MUST be exactly **one** piece of code in the repository that decides whether a
  move is a `'blunder'` or a `'suboptimal'`. "Both paths agree" is NOT sufficient — two rules that happen
  to produce the same answer are still two criteria, and they will drift again. Concretely, per D4's
  resolution:
  **Scope boundary (owner ruling, 2026-08-03): "game moves only — but name the boundary."** The
  single-criterion property applies to the **game-move** `quality` label (the `blunders.quality` value
  and the per-move badge served for a played game move). `ChallengeScreen`'s **puzzle-answer** grading
  is a *different question* (did the player pick the right answer set?) and is deliberately NOT unified —
  it is instead **documented** as a separate domain. See item 6.

  **Verified at source, 2026-08-03** (`/usr/bin/grep -rn "'blunder'" server src scripts` from
  `connect-four/`, excluding tests): six code locations, not two, decide or default this label.
  Enumerated with remedies:

  1. `scoreMove` (`server/moveQualityScorer.js:9`) is the **sole** grader. Verbatim producers inside it:
     `:35` `      quality = 'blunder';`, `:37` `      quality = 'suboptimal';`, `:49`
     `    quality = 'suboptimal';`, `:52` `    quality = 'blunder';`. **Keep, unchanged.**
  2. `classifyStoredMistake` (`server/mistakeStorageRule.js`) MUST STOP GRADING. **Line correction:**
     the function *declaration* is at `:81` (`export function classifyStoredMistake(bestScore,
     playedScore, movestring) {`); the grading expression is at **`:102`**, verbatim:
     `  return { quality: bestScore - playedScore > 4 ? 'blunder' : 'suboptimal' };`. That expression is
     **deleted**, not kept in agreement. The function retains only its storage-**eligibility** job (the
     slower-win exclusion at `:86` and the dead-position faster-loss exclusion at `:89-93`). Its return
     type narrows accordingly (`:79` `@returns {null | { quality: 'suboptimal'|'blunder' }}` and the
     header comment at `:24-27` documenting the `>4` threshold both update), and every call site
     (`server/index.js:1527`, `server/index.js:2417`, `server/papergamesImporter.js:125`) takes `quality`
     from `scoreMove` instead. **Note the seam asymmetry, verified at source:** at `:2417` and at
     `papergamesImporter.js:125` a `scoreMove` result is already in scope (`server/index.js:2410`
     `      const { quality, bestCol } = scoreMove(scores, col);`; `papergamesImporter.js:115`
     `    const { quality, bestCol } = scoreMove(scores, col);`) — those are one-line diffs. At
     `server/index.js:1527` (`POST /api/blunders`) there is **no solver `scores` array in scope at all**:
     the handler destructures `score` and `best_score` from `req.body` (`server/index.js:1494`
     `  const { board_state, move_played, correct_move, pattern_category, score, best_score } =
     req.body;`), and `scoreMove(scores, playedCol)` requires a full 7-element array. That call site MUST
     therefore either (a) receive the label from a score-pair entry point exported by
     `moveQualityScorer.js` that `scoreMove` itself delegates to — one rule, two entry points, still one
     criterion — or (b) be retired if the endpoint has no caller. The implementer picks (a) or (b) and
     records which; inlining a second threshold there is forbidden.
  3. `server/insertGameBlunder.js:28` — verbatim
     `  const quality = row.quality === 'suboptimal' ? 'suboptimal' : 'blunder';` — a **write-seam
     coercion** that silently turns `undefined`, `'optimal'`, or any typo into a `'blunder'` row. It is a
     third criterion and it fires exactly when the real grader produced nothing. **Remedy (concrete, not
     the implementer's judgment):** take `row.quality` verbatim, validate it against the two legal values,
     and **fail loudly** — `console.error` naming the offending value and `return false` without inserting
     — when it is missing or invalid. Do not default. All three callers already pass an explicit
     `quality` (`server/index.js:2484` `          quality: storedMistake.quality,`, and both
     `papergamesImporter.js:231`/`:363` spread a `blunder` object built by `extractBlunders`), so the
     coercion has no legitimate consumer.
  4. `server/index.js:2917` — verbatim `    quality: b.quality ?? 'blunder',` — a **serve-seam fallback**
     in the `GET /api/coach/queue` `enriched` mapping. **Verified unreachable today**, on two independent
     grounds: (a) `server/migrations/051_blunders_quality.sql:7-8` declares
     `  ADD COLUMN IF NOT EXISTS quality text NOT NULL DEFAULT 'blunder'` /
     `  CHECK (quality IN ('suboptimal', 'blunder'));` — the column cannot be NULL; and (b) the query at
     `server/index.js:2877-2878` explicitly selects `quality`, so the key is always present.
     **Remedy:** delete the `?? 'blunder'` (plain `quality: b.quality,`). An unreachable fallback is
     removed as dead code, not as a live bug — the requirement is that no second place in the tree can
     *invent* this label, whether or not it currently does.
  5. `src/lib/reviewChipQuality.js` — which exists ONLY to reconcile the two rules' disagreement ("red
     chip opens a SUBOPTIMAL detail"; its own header says so at `:1-15`) — MUST be removed along with its
     call sites (`src/screens/ReviewScreen.jsx:12` import, `:229` and `:430` calls), not left as a
     now-no-op reconciliation layer. Per Constitution II the divergence is removed, not papered over.
     **Deleting it also requires removing `tests/unit/reviewChipQuality.test.js` from BOTH the `test` and
     `test:fast` script strings in `connect-four/package.json:16,17`** — `node --test` errors on a missing
     file, and because `test:fast` is one long file list, that error means **zero tests run**.
  6. **Documented boundary, not unified** (owner ruling): `src/screens/ChallengeScreen.jsx:586` —
     verbatim `    const quality = allCorrect ? 'optimal' : noFalsePositives ? 'suboptimal' : 'blunder';`
     — grades a `forbidden_columns` **puzzle answer** by set-selection accuracy, client-side, with no
     solver scores. It reuses the same three-value vocabulary for a different question. It MUST be
     documented as a separate domain (in `docs/architecture/db-schema.md` alongside the `blunders`
     section, per FR-019's documentation task) so the next reader does not rediscover it as a defect.
     Two related puzzle-domain sites are covered by the same note: `ChallengeScreen.jsx:492`
     (`      quality: evaluation?.quality ?? 'blunder',` — a session-results fallback) and
     `server/index.js:2647-2654`, the puzzle-attempt `blunders` insert, which sets **no `quality` at all**
     and so takes the migration-051 column default `'blunder'`.
  7. **Recorded as an open issue, not fixed** (owner ruling): the spec-049/Epic-9 accepted-gate
     **display override** at `src/screens/ChallengeScreen.jsx:386` (verbatim
     `          ? { ...data, quality: 'blunder', badge: 'bad', summaryLineKey:
     pickSummaryKeyOrNull('blunder') ?? data.summaryLineKey }`) and `:407` (verbatim
     `        const coachQuality = acceptedPromoted ? 'optimal' : acceptedDemoted ? 'blunder' :
     (data.quality ?? 'blunder');`) overrides the server's label for display. It gets a new `OI-N` in
     `docs/open_issues.md` recording that a client-side override of the server's label exists and why it
     was left in place — not a fix, and not in this feature's change scope.
  8. A test MUST assert the single-criterion property **structurally**, and the assertion MUST key on
     **emitting the label**, not on taking scores. The previously-worded bar ("no module maps a
     `(bestScore, playedScore)` pair to `'blunder'`/`'suboptimal'`") is **too narrow and is retracted**:
     none of items 3, 4, 6, or 7 take scores at all, so a test worded that way would pass while five
     other criteria remained in the tree. The required shape is a **source scan of production code**
     (`connect-four/server/**` and `connect-four/src/**`, excluding `*.test.*`, `tests/`, `migrations/`,
     and `server/scripts/`) for a string literal `'blunder'` or `'suboptimal'` **appearing in a
     value-producing position**, checked against an **explicit allowlist keyed by `file` (plus the
     matched line's content), where every allowlist entry carries an inline comment stating why it is
     permitted**, so the exemptions are self-documenting and a new emitter fails the test by default. The
     allowlist deliberately includes the `ChallengeScreen` puzzle-answer domain (item 6) and the
     accepted-gate override (item 7) — the test must NOT fail on them.
- **FR-020**: FR-019 MUST be proven by a test that exercises one boundary-case move through both paths
  and asserts identical output.
- **FR-021**: The "never filter the `blunders` table by `quality` when counting mistakes" invariant MUST
  be named in code (not just implicit in five separate call sites) and guarded by a test at more than one
  of those sites. *(OI-125)*

**US5 — release gate and deploy trustworthiness**
- **FR-022**: `npm run test:fast` MUST be **zero failures** at this feature's close, OR each remaining
  failure MUST carry its own `OI-N` in `docs/open_issues.md` with a stated reason it is out of scope for
  this feature. A baseline re-measurement MUST happen at the start of execution (the epic's dated count of
  5 may have moved), and the zero-or-enumerated target is judged against that current baseline, not the
  dated one. *(OI-82)*
- **FR-023**: The two `ENOENT`-dying fixture-path tests MUST execute their assertions against a corpus
  that actually exists on disk, and MUST **pass** — not merely run and assert something without dying
  before their first assertion. The specific repointed path is a plan-level implementation detail, to be
  set only after the corpus location is re-measured at the start of execution; the epic's
  `server/scripts/fv_suff/` (no `reason_evidence_` prefix) is a dated, unverified starting hint, not a
  prescribed fix.
- **FR-024**: OI-5's refresh-token-rotation probe MUST be run by the owner against a real account
  (`node --env-file=server/.env scripts/probe-refresh-rotation.mjs <email> <password>`), recorded as a
  sign-off item in `staging_checks.md`, and its result (build the de-dup Map, or close the issue) applied
  and recorded in `docs/open_issues.md`.
- **FR-025**: OI-31 MUST be closed by measuring which connection URL the live Railway deploy actually
  uses for migrations — not by editing `.env.staging` on the strength of the "6543 forbidden" rationale,
  which is contradicted by observed behavior.
- **FR-026**: OI-105 MUST be closed by reconciling the migration ledger against what is actually on disk
  and actually applied on staging and production (filename-based, not "highest number"), recording the
  true state of `061_security_lints.sql` and `061_correct_cols.sql` on each environment.

**Epic-wide**
- **FR-027**: Each of the 16 in-scope issues (OI-92, OI-86, OI-83, OI-130, OI-126, OI-124, OI-129, OI-98,
  OI-95, OI-41, OI-104, OI-125, OI-82, OI-5, OI-31, OI-105) MUST receive a disposition in
  `docs/open_issues.md`, in the same change that ships the corresponding work, using that file's
  existing closeout formats (fully-fixed / partially-fixed / already-resolved / deliberately-not-fixed).
  An issue deliberately left open MUST record the decision, not just remain silent.
- **FR-028**: Any new defect discovered while doing this work MUST be logged as a new `OI-N` in
  `docs/open_issues.md` — never captured only in a memory file.
- **FR-029**: Every per-change deploy prerequisite introduced by this work MUST land in
  `docs/deployment_steps.md`; any change to the standing deploy procedure MUST land in
  `docs/deploy-runbook.md`.
- **FR-030**: This feature MUST close with an explicit launch-readiness statement covering all 5 user
  stories — shipped, or deferred with a stated reason — and a direct answer to whether the owner can
  launch.

### Key Entities

- **Puzzle pool (`puzzles` / `candidates` tables)**: per-category active/queued puzzle rows on
  local/staging/production; `is_active` boolean gates serving; `correct_cols integer[]` is the
  solver-gated answer set; `highlight_metadata` is the stored evidence a grader reads at answer time.
- **`OI-N` issue**: an entry in `docs/open_issues.md` with a repro, a deferral reason, and an "if picked
  up" note; this feature's scope is exactly the 16 named in Traceability below, each requiring a
  disposition on close.
- **Explanation response seam**: the single point (`guardExplainMovePayload` /
  `guardExplainMoveLlmPayload`) through which every served move explanation passes, whether freshly
  generated or served from `explanation_cache`.
- **Entitlement signal**: the existing `GET /api/user/entitlement` response's `authenticated` field,
  reused (not extended) by US3's locked-lesson copy branch in the `useLessonLockGuard.js` →
  `sagaLock.js` → `SagaScreen.jsx`/`UpgradeModal.jsx` chain (FR-017).
- **Mistake/quality label**: the `quality` value (`'blunder' | 'suboptimal'`) attached to a move, produced
  either live (`scoreMove`) or from storage (`classifyStoredMistake`), currently allowed to diverge.
- **Migration ledger**: the record of which migration filenames have been applied on staging/production,
  tracked by filename (not sequence number), currently diverged from what's on disk.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every puzzle category the app serves has at least 20 active puzzles on both staging and
  production, measured directly against those environments (not inferred from local).
- **SC-002**: Zero live puzzle rows grade a mathematically correct player answer as incorrect, verified
  across the full `overcut`, `undercut`, and `z_threat` pools (the three categories graded from stored
  `highlight_metadata`) plus a regression test that prevents recurrence.
- **SC-003**: A pool-health audit script returns real, non-empty results when run against a category with
  known active puzzles.
- **SC-004**: Zero raw internal board-coordinate tokens (bare, ranged, or paired) appear in any served
  move explanation, in either supported locale, verified against a real reproduced case.
- **SC-005**: A subscriber who clicks a real Paddle payment-method-update email link lands on a page that
  has already opened the checkout for their failed payment, with no browser console CSP violation on a
  production build.
- **SC-006**: A signed-out visitor and a signed-in free-tier subscriber see distinguishable, correctly
  targeted calls to action when they hit a locked lesson.
- **SC-007**: The same move retains the same severity label across every subsequent view of the same
  game, with zero divergence on the boundary-case test.
- **SC-008**: `npm run test:fast` run from a clean checkout produces a failure count that exactly matches
  a written, justified list — no unexplained red, no unexplained new green masking a skipped assertion.
- **SC-009**: All 16 in-scope issues carry a recorded disposition in `docs/open_issues.md` at the close of
  this work, and the closing summary states, per story, whether the owner can launch.

## Assumptions

- The 2026-08-03 triage numbers (pool counts, `test:fast` failure count, queued-candidate counts) are
  starting estimates only; every acceptance criterion that depends on a count requires re-measurement at
  the start of execution, per the epic's settled decision 7.
- "Launch" means the public paid launch of the English-language web app at `decodec4.xyz`; Spanish-locale
  completeness, admin-tool robustness, and the 32 explicitly out-of-scope issues are not gates for that
  event (Settled decisions 1–2, NOT included below).
- The owner will personally execute every step this spec marks owner-gated (live data repairs, Paddle
  dashboard configuration, credentialed probes, `staging_checks.md` sign-offs) — no agent session
  performs these directly, per settled decision 4.
- Design decisions D1–D4 below are resolved via `/speckit-clarify` before planning; none are answered
  unilaterally by the implementing agent, per the epic's explicit instruction.

## Unresolved Design Decisions (the `/clarify` targets)

Two decisions remain open — D3, D4. **D1 and D2 are no longer open**: the owner resolved D2 during spec
review (2026-08-03), and that resolution was itself reversed and corrected by the owner afterward. There
is no serving-policy decision to make: a category below the N=20 floor is never hidden or excluded from
serving — it gets candidates generated and approved/promoted through the admin tooling up to the floor,
per environment. This applies to every category, not just `forced_win`. Empty pools are not a launch
blocker and not a design decision; the remedy is routine, available work. This is reflected in FR-003 and
FR-004 above; it is kept in the table below only for its question/rationale record, not as something
`/speckit-clarify` still needs to ask.

The remaining two decisions were deliberately left open by the epic because each changes the shape of
the implementation. They must be resolved before `/speckit-plan`, not guessed at during implementation.

| # | Story | Question | Why it changes the plan |
|---|---|---|---|
| ~~**D1**~~ | US1 | **RESOLVED (2026-08-03) — retire and refill.** For the 6 live `overcut` rows that no longer pass the widened predicate and the 12 whose `highlight_metadata` differs: repair the stored metadata in place, or retire the rows and promote fresh candidates? | **Answer: retire and refill.** Stale rows are marked inactive and the category is refilled to the N=20 floor by `fill-candidate-pools.mjs`, which FR-003/FR-004 already require. No second repair script; `repair-overcut-highlight-metadata.js` is not extended to `undercut`/`z_threat`. The 2026-08-03 owner directive removed the "preserves attempt history" weight that used to favor in-place repair. This does not remove the separate requirement that the grader itself (`evalOvercut`/`evalUndercut`/`evalZThreat`) cross-check `correct_cols` — see FR-006 — which protects correct answers regardless of whether the retire-and-refill has run. |
| ~~**D2**~~ | US1 | **RESOLVED** — `forced_win` cannot reach the N=20 floor by promotion alone (2 queued candidates, and OI-83 is the bug that retired its last puzzle), and neither can several of the other seven categories once their queued counts are recognized as local-only. Generate fresh candidates, or hide below-floor categories from serving? | **Answer: there is no serving-policy decision.** Generate candidates and approve/promote them through the admin tooling until the floor is met, per environment. Nothing is hidden; nothing is deferred post-launch. No longer changes the plan — it is a fixed input to it. |
| ~~**D3**~~ | US2 | **RESOLVED (2026-08-03, owner) — wire the gate in and ENFORCE by stripping.** Widen the regex only, or wire `validateAnnotation` into the live response path (OI-124)? And on a violation: strip the offending span, retry the LLM, or serve anyway and log? | **Answer: wire `validateAnnotation` (`server/annotationGate.js:486`) into the response seam (`guardExplainMovePayload`/`guardExplainMoveLlmPayload`), failure policy = STRIP the offending span and log.** Verified at source before the call: `annotationGate.js` is pure ("No side effects, no DB, no I/O" — file header), so enforcement costs a synchronous board scan, **not** an extra LLM call — only the *retry* policy would have, and retry was rejected for that reason. The widened regex (T026) still ships as the floor. Two obligations attach: (a) the unconditional `console.log('[DEBUG validateAnnotation]…')` calls at **`annotationGate.js:488-489`** (line corrected 2026-08-04 — `:486` is the function declaration, `:487` is `const zones = parseZoneSpecs(explanation);`) MUST be removed before this runs in production; (b) the added latency MUST be measured against the Explanation Engine's <2s budget (Constitution V) as part of this story's own acceptance, not assumed free. **Re-verified 2026-08-04: the live seam carries NO `allowedSet`** — `grep -n "allowedSet" server/index.js` returns zero matches — so `checkP5Strong` will not run and only P1/P2/P3/P5/P6 apply; state which actually ran. Two further gaps, resolved in T028: the guard functions receive no `Board` (one is in scope at `server/index.js:1286-1288` and must be threaded), and `validateAnnotation` returns opaque failure *strings*, of which the `P3:*` codes carry **no span at all** — so "strip the offending span" has no defined behavior for P3 and T028 must state the policy. |
| ~~**D4**~~ | US4 | **RESOLVED (2026-08-03, owner) — `scoreMove` is authoritative.** Which `quality` label is authoritative — the live solver judgment (`scoreMove`) or the stored storage-rule one (`classifyStoredMistake`)? | **Answer: the live outcome-class rule (`scoreMove`) wins and becomes the single criterion.** Evidence gathered before the call: the two rules are *not* "mathematically identical" outside the all-losing branch — `scoreMove` grades by outcome-class change (any win→draw/draw→loss is a `blunder` regardless of magnitude), `classifyStoredMistake` grades by score-drop magnitude (`bestScore - playedScore > 4`). They run on the **same move seven lines apart** at `server/index.js:2410` (→ response badge) and `:2417` (→ stored row), and `src/lib/reviewChipQuality.js` exists solely to paper over the resulting "red chip opens a SUBOPTIMAL detail" mismatch. Scope note: `classifyStoredMistake` does two jobs — (a) storage *eligibility* (excludes slower wins and dead-position faster losses) and (b) *grading*. Only (b) changes; the eligibility gate stays exactly as is. `index.js:2417` takes `quality` from the `scoreMove` call two lines above. Per Constitution II this REMOVES the divergence — `reviewChipQuality.js`'s reconciliation becomes unnecessary and should go, not stay alongside. Existing `blunders` rows carry the old magnitude grading; per the owner's disposable-database directive that is a documented regenerate in `docs/deployment_steps.md`, **not** repair tooling. |

## Traceability — the 16 in-scope issues

Every one of these MUST receive a definition of done (via the functional requirements above) or an
explicit disposition in `docs/open_issues.md` at close.

| OI | Story | One-line reason it blocks launch | Covered by |
|---|---|---|---|
| OI-92 | US1 | 18 of 42 live `overcut` rows stale → correct answers graded wrong on staging **and** production (audit widened to `undercut`/`z_threat`, Decision 2) | FR-005, FR-006, D1 |
| OI-86 | US1 | 8 of 12 categories at zero active puzzles (local); production never measured | FR-001, FR-003 |
| OI-83 | US1 | The only `forced_win` puzzle was retired as AMBIGUOUS → category empty | FR-004, D2 |
| OI-130 | US1 | The pool-verification script can never return a row, so pool audits are vacuous | FR-002 |
| OI-126 | US2 | Raw `c3-c6` reproduced in text served to a real user | FR-008, FR-009 |
| OI-124 | US2 | Nothing gates the live explanation path — the root cause behind OI-126 and OI-129 | FR-010, D3 |
| OI-129 | US2 | Prose names board regions that carry no annotation — measured alongside D3, then fixed or deliberately deferred | FR-011 |
| OI-98 | US3 | Payment-method-update email dead-ends → involuntary churn | FR-013, FR-014, FR-016 |
| OI-95 | US3 | Signed-out visitors and free users get the same upgrade prompt (conversion) | FR-017 |
| OI-41 | US3 | Verified stale 2026-08-03 and narrowed to an accepted risk on `/pricing-legal` — re-confirm the decision only | FR-018 |
| OI-104 | US4 | A move labelled `blunder` reads `suboptimal` on every later view | FR-019, FR-020, D4 |
| OI-125 | US4 | The mistake-count invariant is unnamed and nearly unguarded (guard it while US4 is in there) | FR-021 |
| OI-82 | US5 | `test:fast` is 5 RED — a green run currently proves nothing | FR-022, FR-023 |
| OI-5 | US5 | Refresh-token rotation verified only against anonymous sessions | FR-024 |
| OI-31 | US5 | Staging migrations may run on the transaction pooler | FR-025 |
| OI-105 | US5 | Migration 061 used twice; ledger diverged from disk on both live environments | FR-026 |

## NOT included

Enumerated so scope cannot grow silently. All of these stay open in `docs/open_issues.md` and are
explicitly out of scope for this feature.

- **Spanish content debt** (settled decision 1): OI-36, OI-38, OI-93, OI-79.
- **Admin-only surfaces** (settled decision 2): OI-123, OI-107, OI-72, OI-88, OI-91, OI-114, OI-131, plus
  the two admin lesson-write defects OI-80 (filename/id fork) and OI-116 (read-modify-write race) — both
  real, but fire only from `/admin` under `requireLocalhost`, and their workaround is already documented.
- **Test/lint infrastructure beyond US5's baseline**: OI-102, OI-106, OI-111, OI-112, OI-118, OI-119,
  OI-87, OI-94. US5 makes the gate trustworthy; it does not refactor the harness, replace the
  hand-maintained test lists, or fix demoted `react-hooks` warnings.
- **Latent / no-live-caller detector work**: OI-89, OI-90, OI-30, OI-33, OI-109, OI-108.
- **Doc, dead-code and test-integrity debt with no user-facing defect**: OI-122, OI-127, OI-113, OI-32.
- **Minor UX polish**: OI-128 (stepper URL). OI-129 is in scope under US2 — not listed here as excluded.
- **New features of any kind**, including the OI-95 product decision beyond its smallest correct form.
- **Direct writes to staging or production by an agent** (settled decision 4).
- The 9 other epics in `docs/epics/open-issues-epics.md`. This feature does not absorb, renumber, or
  reorder them.
