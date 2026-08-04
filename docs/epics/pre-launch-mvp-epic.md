# Epic 10 — MVP Launch Gate

> **Invocation:** `/epics-manager docs/epics/pre-launch-mvp-epic.md 1`
> (this file holds exactly one epic; the id argument is optional)

The single gate between the current tree and a **public paid launch**. It contains only work that is
*blocking* — every item here has a path by which a real paying user hits it. Companion to
[`docs/epics/open-issues-epics.md`](open-issues-epics.md), which holds the 9 quality/correctness epics;
this file does not renumber them. **This file does take over three issues that file's Traceability table
previously assigned elsewhere — OI-41 (was Epic 3), OI-5 and OI-31 (were Epic 4)** — because Epics 3 and
4 already shipped (specs 053 and 054) without doing that work; `open-issues-epics.md`'s Traceability
table and its header note were corrected in the same change that added this sentence. Apart from those
three, this epic does not duplicate the other 9.

**Lane:** D — runs **alone**. It repairs live staging/production data (US1) and changes the response
seam every explanation flows through (US2); both conflict with any concurrent branch touching
`server/predicates.js`, `server/reasonRenderGuard.mjs`, or the `puzzles`/`candidates` tables.

**Scope source:** triage of the 48 still-open `OI-N` entries in
[`docs/open_issues.md`](../open_issues.md) performed 2026-08-03, after the spec 056 merge (`9a2b059`).
**16 of 48** are in scope. The other 32 are enumerated in *NOT included* so scope cannot silently grow.

**Sizing:** 5 user stories, ~6–10 tasks each (~40 tasks), 4 unresolved design decisions, touching
server + frontend + live data + ops. Full speckit per
[`docs/best_practices_spec_driven_development.md`](../best_practices_spec_driven_development.md)
§"Epic Sizing".

---

## Overview

| # | User story | Open issues | Primary surface | Blocking because |
|---|---|---|---|---|
| **US1** | Live puzzle answers grade correctly, and every served category has a pool | OI-92, OI-86, OI-83, OI-130 | `puzzles`/`candidates` on staging+prod, `server/predicates.js`, `scripts/verify-undercut-puzzles.mjs` | A paying user's **correct** answer is marked wrong; 8 of 12 categories may be empty |
| **US2** | No internal token or unhighlightable claim reaches player-facing prose | OI-126, OI-124, OI-129 | `server/reasonRenderGuard.mjs`, `server/annotationGate.js`, `server/llmCoachHelpers.js` | Raw `c3-c6` shipped to a user in the flagship paid feature |
| **US3** | The paid-conversion and billing-recovery paths both complete | OI-98, OI-95, OI-41 | `src/lib/useUpgradeCheckout.js`, `PricingScreen.jsx` | A subscriber whose card fails lands on a dead page → involuntary churn |
| **US4** | A mistake's severity is stable across every view of the same game | OI-104, OI-125 | `server/index.js`, `server/mistakeStorageRule.js`, `server/moveQualityScorer.js` | The user watches their game get silently re-graded on revisit |
| **US5** | The release gate is trustworthy and the deploy prerequisites are settled | OI-82, OI-5, OI-31, OI-105 | `server/tests/`, `server/migrations/`, `.env.staging`, `docs/deployment_steps.md` | You cannot tell a green build from a red one; migration ledger diverged from disk |

**Recommended order:** US1 → US5 → US2 → US4 → US3. US1 is the largest and gates the most user-visible
damage; US5 early makes every later story's "tests pass" claim mean something. US2/US3/US4 are
independent of each other.

---

## Settled decisions

Do not relitigate these. They were taken during the 2026-08-03 triage.

1. **"MVP launch" means a public, paid launch of the web app on `decodec4.xyz`, in English.** Spanish
   ships as a best-effort locale that silently falls back to English, and that is acceptable at launch.
   Therefore **OI-36, OI-38, OI-93, OI-79 are explicitly NOT launch gates** despite being real content
   debt. If the owner reverses this and Spanish becomes a launch locale, those four re-enter and this
   epic must be re-sized — they are ~6,000 words of translation plus audio regeneration, not a task.
2. **Admin-only surfaces are not launch gates.** There is one internal admin user. A crash or a missing
   guard behind `requireLocalhost` costs that user a reload, not a customer. This removes OI-123,
   OI-107, OI-72, OI-88, OI-91, OI-114, OI-131 from scope.
3. **This epic removes blockers; it does not add features.** No new lesson, category, screen, or coach
   behavior. If a story's fix is naturally shaped as a feature (e.g. OI-95's "Sign in" vs "Upgrade"
   copy), take the smallest correct version and log the rest as a new `OI-N`.
4. **No agent session writes to staging or production.** Every data repair (US1) ships as a reviewed,
   idempotent, `--dry-run`-first script plus a `docs/deployment_steps.md` entry; the **owner** runs it
   against live environments. [[feedback_implemented_vs_deployable]]
5. **OI-41 was stale; it has been verified and narrowed — do not implement it.** Spec 053 shipped a
   designed in-app pricing screen (`src/lib/screenRegistry.jsx:44` reads `pricing: PricingScreen`;
   `src/lib/urlMapping.js:28` states verbatim *"and /pricing itself is now the in-app designed
   PricingScreen."*), and OI-96 records the live-browser CSP check as **passed** on 2026-08-01. The OI-41
   entry was corrected on 2026-08-03 (see its `UPDATE 2026-08-03`): all that remains is the hardcoded
   price/quota literals on the **`/pricing-legal`** static page, a retained owner-accepted risk that Paddle
   requires to stay JavaScript-free. US3's only obligation is to re-confirm that decision — or close the
   entry won't-fix, which is the owner's call. **No pricing-page work in this epic.**
   [[feedback_verify_at_the_source_layer]]
6. **The issue-closeout convention from `open-issues-epics.md` applies verbatim** — an `OI-N` is done
   when `docs/open_issues.md` says so, in the same change that ships the work, with the
   fully-fixed / partially-fixed / already-resolved / deliberately-not-fixed formats that file defines.
   Every story carries its own closeout tasks; there is no final cleanup pass.
7. **Every measurement in this file is dated and must be re-taken at the start of the run.** This repo
   has concurrent sessions; the file grew by 4 entries and closed 1 while this triage was being
   written. [[feedback_concurrent_agents_clobber]] [[feedback_measurement_expires]]

---

## Unresolved design decisions (the reason this runs the full pipeline)

These are the `/clarify` targets. Each one changes the shape of the implementation, so none should be
answered by the implementing agent on its own.

**D2 is no longer open.** It was resolved by the owner during spec-057 review (2026-08-03), and that
resolution was itself reversed and corrected by the owner afterward. There is no serving-policy decision
to make: a category below the N=20 floor is never hidden or excluded from serving. The remedy for any
category below the floor — `forced_win` or any of the other seven — is to generate candidates as needed
and approve/promote them through the admin tooling until the floor is met, per environment. Empty pools
are not a launch blocker and not a design decision; this is routine, available work, not a project.
Nothing is deferred post-launch. **D1 is also no longer open** — the owner resolved it 2026-08-03 (see
below). Two decisions remain genuinely open — D3, D4.

| # | Story | Question | Why it changes the plan |
|---|---|---|---|
| ~~**D1**~~ | US1 | **RESOLVED (2026-08-03) — retire and refill.** For the 6 live `overcut` rows that no longer pass the widened predicate and the 12 whose `highlight_metadata` differs: repair the stored metadata in place, or retire the rows and promote fresh candidates? | **Answer: retire and refill.** Stale `overcut`/`undercut`/`z_threat` rows are marked inactive and the category is brought back to the N=20 floor by `fill-candidate-pools.mjs`, which this feature builds regardless (FR-003/FR-004). No second repair script is written, and `repair-overcut-highlight-metadata.js` is not extended to `undercut`/`z_threat`. The owner directive (`CLAUDE.md` §"Staging and production databases are disposable (pre-launch)") removed the "preserves attempt history" weight that used to favor in-place repair — no row on staging or production is worth keeping — and in-place repair would require per-category branch logic across three different metadata shapes, the speculative abstraction Constitution II forbids. No longer changes the plan — it is now a fixed input to it, same status as D2. |
| ~~**D2**~~ | US1 | **RESOLVED** — `forced_win` cannot reach the N=20 floor by promotion alone (2 queued candidates, and OI-83 is the bug that retired its last puzzle), nor can several of the other seven categories once their queued counts are recognized as local-only. Generate fresh candidates (costs solver calls), or hide below-floor categories from serving? | **Answer: there is no serving-policy decision.** Generate candidates and approve/promote them through the admin tooling until the floor is met, per environment. Nothing is hidden; nothing is deferred post-launch. No longer changes the plan — it is now a fixed input to it. |
| **D3** | US2 | **Widen the regex only, or wire `validateAnnotation` into the live response path (OI-124)?** And on a violation: strip the offending span, retry the LLM, or serve anyway and log? | Regex-only is a one-line fix that leaves the systemic hole open — OI-126 *and* OI-129 both escaped because nothing gates the live path. Wiring the gate in is a latency + failure-policy change on the paid feature's hot path. |
| **D4** | US4 | **Which `quality` label is authoritative — the live solver judgement (`scoreMove`) or the stored storage-rule one (`classifyStoredMistake`)?** | Picking live means backfilling or re-deriving on read; picking stored means the first analysis must stop showing a different answer. The two thresholds are allowed to diverge *by design* today, so this is a product call, not a bug fix. |

---

## Non-obvious facts

Harvested and verified 2026-08-03 against this working tree. Re-verify before depending on any of them.

### Grading and pools (US1)

- **The grader reads STORED metadata, not a fresh computation.** `evalOvercut`
  (`server/predicates.js:364`, dispatched from `:106`) grades the player's answer against the row's
  saved `highlight_metadata`. That is precisely why OI-92 is a *live user-facing* defect and not a
  code-quality one: changing a detector silently invalidates rows already in the table.
  [[project_puzzle_grading_reads_stored_metadata]]
- **OI-86's "8 of 12 categories at zero" was measured on LOCAL ONLY.** The entry says verbatim:
  *"**Measured on local only** — staging and production pools were never measured and may be healthy."*
  Do not carry the local number into a production claim. The first task of US1 is the measurement.
- **The tool you would reach for to check pool health is broken (OI-130, new from spec 056).**
  `scripts/verify-undercut-puzzles.mjs` filters `.eq('approved', true)`; `puzzles` has no `approved`
  column and never has (it carries `is_active boolean NOT NULL DEFAULT true` since
  `003_puzzles.sql:17`). PostgREST rejects the filter, so the script **cannot return rows for any
  input** — meaning any previous "the undercut pool is fine" reading from it was vacuous. Fix this
  before trusting a pool audit.
- **Filling a pool is a promotion pass, not a generation project.** Every one of the eight empty
  categories already has `correct_cols`-populated candidates queued (`forbidden_columns` 30,
  `figure_7` 21, `j_shape` 14, `odd_even_threat` 13, `overcut` 9, `claimeven` 7, `z_threat` 3,
  `forced_win` 2). Promotion makes **no solver calls**. [[feedback_generate_puzzles_for_local_qa]]
- **The floor is N = 20 active puzzles per category**, defined in
  `specs/051-pattern-acceptance/pool-thresholds.md` (FR-022). That file records an owner ruling
  (2026-07-30) that closes off two of D2's three options: *"The threshold is absolute. A category
  below 20 active puzzles is not servable, whatever put it there."* and *"The remedy is always the
  same: generate and promote more puzzles. Never lower the threshold, and never exempt a category for
  having been broken already."* Do not re-open "serve it below the floor" as a live option.
- **A bulk promotion loop will trip the rate limiter.** 120 req/min per IP, shared with any browser QA
  session; the 429 comes back as **plain text**, which surfaces as an opaque JSON decode error with no
  handler log line. [[project_api_rate_limit_breaks_bulk_scripts]]

### Response-seam text integrity (US2)

- **The guard's wiring is correct; only its coverage is wrong.** `server/reasonRenderGuard.mjs:25`:
  ```js
  const CXRY_RE = /\bc(\d+)r\d+\b/gi;
  ```
  It matches only the **paired** `c<col>r<row>` form. `stripInternalTokens` (`:41`) applies it (`:46`)
  alongside `LABEL_PREFIX_RE` (`:20`), and is installed at the single response seam via
  `guardExplainMovePayload` (`:80`) and `guardExplainMoveLlmPayload` (`:99`) — so it already covers the
  cache-hit, not-a-blunder, and fresh-generation branches alike. **The fix belongs in the regex, not in
  the wiring.**
- **Widening the regex is not free.** `c3` must not eat legitimate prose; the replacement callback
  already maps a column number to a word via `columnWord(col)`, and a range (`c3-c6`) needs a *pair* of
  words plus a connector, which is locale-dependent. Spanish degrades to English **silently**, so a
  new string added here ships untranslated without any error. [[project_spanish_output_silent_fallback]]
- **The annotation gate exists, is well-tested, and runs nowhere near production (OI-124).**
  `server/annotationGate.js` carries 50 unit tests and is in both `test` and `test:fast`, but its only
  importers are `server/scripts/run_eval.mjs` and `server/scripts/corpus_annotation_check.mjs` — both
  offline. This is the shared root cause of OI-126 and OI-129. [[project_annotation_gate_and_zones]]
- **Explanations are served from two paths and the cache path skips producer guards** — sanitize at the
  response seam and `TRUNCATE explanation_cache` on deploy, or repaired text will be masked by stale
  cached rows. [[project_blunder_serving_dual_paths]]

### Billing and conversion (US3)

- **`grep -rn "_ptxn" src server` returns zero matches** (re-verified 2026-08-03). Nothing reads the
  parameter Paddle appends to every payment-method-update link it emails to subscribers.
- **Paddle.js never initializes on mount.** `getPaddle()` is called only at
  `src/lib/useUpgradeCheckout.js:119` and `:160`, both inside async click handlers. A visitor who merely
  *lands* on `/pricing` never loads the SDK — so even a page that read `_ptxn` could not auto-open the
  checkout today.
- **Settled: the default payment link points at `/pricing`, reusing the existing `PricingScreen`** — not
  a new dedicated route. Settled decision 3 ("this epic adds no new screens") stands unamended.
  `/pricing-legal` is disqualified for this purpose; it must stay JavaScript-free. Pointing the Paddle
  dashboard's default-payment-link setting at `/pricing` is the owner-gated half of OI-98 (see US3
  acceptance criteria).
- **A Paddle CSP change is a multi-round discovery, not a one-line edit**, and CSP is invisible under
  `npm run dev` — the server reads `dist` at **boot**, so you must rebuild *and* restart to see it.
  Budget for this since US3 adds a mount-time SDK load. [[project_csp_helmet_traps]] [[project_paddle_integration]]
- **Sandbox vs live is selected by key prefix, not by `NODE_ENV`/`MODE`.** [[project_paddle_integration]]
- **OI-96 records the owner's confirmation that `VITE_PADDLE_CLIENT_TOKEN` is unset — Paddle does not
  work locally.** The sandbox end-to-end transaction verification for OI-98 can only be run against
  staging, which is another reason it is owner-gated rather than an agent task.
- **OI-95's fix is a client-side branch, not a contract change.** `GET /api/user/entitlement` already
  carries the `authenticated` signal that FR-033's session-lapse logic consumes. **Correction
  (spec-057 planning, 2026-08-03): the three lesson screens never render locked-lesson copy** —
  `src/lib/useLessonLockGuard.js` redirects away from `ConceptScreen.jsx`/`SocraticScreen.jsx`/
  `CLChallengeScreen.jsx` before any of them render, to `SagaScreen.jsx` via `sagaLock.js`'s three
  chained functions (`deriveLockReason` → `dispatchLockAction` → `deriveLessonAccess`). The fix
  threads a new `'signin'` outcome through all three functions and reuses the existing
  `AuthModal.jsx`/`UpgradeModal.jsx` components at that real render point — not a change to any of
  the three lesson screens. Re-adding `authenticated` to the locked-lesson stub (option C in
  `docs/open_issues.md`'s OI-95 entry) would require amending spec 053 FR-002, its "Lesson (locked
  view)" entity, and that epic's Settled decision #7 together — out of scope for this epic's
  smallest-correct-version rule (Settled decision 3).

### Grading stability (US4)

- The two labels come from genuinely different code: `scoreMove` (`server/moveQualityScorer.js:9`,
  solver scores at request time) vs `classifyStoredMistake` (`server/mistakeStorageRule.js:81`, the
  storage-rule threshold). The cached view is rebuilt by `reconstructAnalysisFromBlunders`
  (`server/index.js:2223`, called at `:2378`).
- **Spec 054 widened the blast radius but did not introduce the divergence** — it extracted the
  reconstruction block into a shared helper (unchanged logic) and additionally reached it from the
  anonymous caller, taking this from signed-in users to everyone.
- **The `blunders` table stores both severities** (`quality ∈ {'blunder','suboptimal'}`), so every count
  over it is already a *mistake* count. OI-125's point is that this load-bearing rule has no name and
  only one of five sites is test-guarded — the natural place to add that guard is inside US4, since
  US4 is already editing the quality-labelling code.

### Release gate and deploy (US5)

- **`npm run test:fast` baseline is 5 RED, not green** (OI-82), identically in the main checkout — judge
  new work against 5 failures, not 0. Two of the five are a **stale fixture path**: the tests build
  `../scripts/reason_evidence_boards_coverage_<ts>.jsonl`, but the corpora live one directory deeper at
  `server/scripts/fv_suff/` and without the `reason_evidence_` prefix. Both die at `readFileSync` with
  `ENOENT` **before asserting anything** — they are not failing, they are not running.
  [[project_repo_worktree_setup]]
- **`lint` is a real gate now** — `test:fast` runs it first, so a lint *error* means zero tests run.
  47 warnings is the healthy baseline. [[project_eslint_config_traps]]
- **`staging_checks.md` is at the REPO ROOT**, not under `docs/` like the rest of the deploy paperwork.
  It is tracked, and every doc that cites it uses the bare path correctly — just don't prefix `docs/`
  out of habit, because `ls docs/staging_checks.md` fails and reads as "the file doesn't exist".
- **The migration ledger tracks FILENAMES, not numbers** (OI-105): `061_security_lints.sql` is recorded
  as applied on both staging and production but **is not in `server/migrations/`**, while the on-disk
  `061_correct_cols.sql` has never been applied to either. Not immediately breaking — `migrate.js`
  matches by filename, so the on-disk one will simply run on the next deploy — but "highest applied
  number" is a lie on both environments. [[project_migration_ledger_and_pooler]]
- **The "6543 is forbidden for DDL" rationale in OI-31 is contradicted by observed behaviour** —
  staging ships on the transaction pooler and DDL works anyway. Settle OI-31 by measuring what URL the
  Railway deploy actually uses for migrations, not by editing `.env.staging` on the strength of the
  rule. [[project_migration_ledger_and_pooler]]
- **OI-5 needs no code** unless the probe says so: `connect-four/scripts/probe-refresh-rotation.mjs`
  already exists; it is owner-gated only because it needs a real account's credentials. Run:
  `cd connect-four && node --env-file=server/.env scripts/probe-refresh-rotation.mjs <email> <password>`.
  "rotation detected" → build the de-dup Map; "no rotation" → close OI-5.
- **Run `eval "$(./worktree-ports.sh)"` before starting or killing any server**, every session,
  unconditionally. Never kill by bare port or `pkill node`.

---

## Authoritative sources of truth

Read before writing code — not the memory summaries, the actual files.

| Topic | Source |
|---|---|
| Full detail on every `OI-N` (repro, why deferred, "if picked up") | [`docs/open_issues.md`](../open_issues.md) |
| The other 9 epics; closeout convention; lane rules | [`docs/epics/open-issues-epics.md`](open-issues-epics.md) |
| Pool floor N=20 and "how to fill a category" | `specs/051-pattern-acceptance/pool-thresholds.md` |
| Endpoint shape, error responses, auth threading | `docs/architecture/api-conventions.md` |
| Anything under `server/` | `docs/architecture/server-conventions.md` |
| Anything under `src/` | `docs/architecture/frontend-conventions.md` |
| Schema, queries, data shapes | `docs/architecture/data-model.md`, `db-schema.md` |
| Test placement, registration, the no-discovery rule | `docs/architecture/testing-conventions.md` |
| Per-change deploy prerequisites (US1's repair script, US5's migration) | `docs/deployment_steps.md` |
| Standing deploy procedure | `docs/deploy-runbook.md` |
| Manual staging sign-off items | `staging_checks.md` **(repo root, not `docs/`)** |
| Strategic concepts named in US1 (overcut, undercut, figure-7…) | `docs/knowledge-base/<slug>.md` — read the `formal_predicate` and `false_positives` before touching a detector |
| Board reasoning | `./visualize_board.sh <movestring>` — never reason about a movestring blind |

---

## Acceptance criteria

### Per story

**US1 — live puzzle answers grade correctly**
- Staging and production pool counts per category are **measured and recorded** in the epic's research
  artifact (local counts alone do not satisfy this).
- Every live `overcut`, `undercut`, and `z_threat` row either re-derives identically under the current
  detector or has been retired (`is_active=false`) and the category refilled to the N=20 floor by
  `fill-candidate-pools.mjs`, per D1's 2026-08-03 resolution — applied by the owner-run script, never by
  an agent session writing to staging or production.
- `evalOvercut`/`evalUndercut`/`evalZThreat` (`connect-four/server/predicates.js`) cross-check the
  solver-gated `correct_cols` array before rejecting a player's answer, following the `evalFigure7`
  pattern — a correct answer is never graded wrong on the strength of stale stored
  `highlight_metadata` alone, independent of whether the D1 retire-and-refill has run yet.
- `scripts/verify-undercut-puzzles.mjs` returns real rows against local (OI-130), demonstrated by the
  25 active undercut puzzles known to exist there.
- Every category the app can serve meets the N=20 floor: the seven categories with queued candidates
  are filled by a promotion pass (no solver calls, no decision needed); `forced_win` is filled by
  generating fresh candidates and promoting them (D2 — no serving-policy decision required, generation
  is the routine remedy).
- A regression test asserts a stale-metadata row cannot silently grade a correct answer wrong.

**US2 — no internal token reaches the player**
- `stripInternalTokens` strips bare (`c3`), ranged (`c3-c6`), and paired (`c3r4`) forms, in **both**
  locales, proven by a test whose input is a **real served explanation string** — not an invented
  fixture. The OI-126 reproduction (`455c5272-3143-43d4-aa3f-c10f9d061666`) is the starting point.
- D3's decision on the annotation gate is implemented **or** recorded as a deliberate deferral with its
  rationale in OI-124.
- **OI-129 gets an explicit disposition, not just a D3 input.** Per its own "If picked up" note, this
  needs a measured failure rate before a fix is designed — the same sequencing OI-124 uses. The
  measurement (sample recent `explanation_cache` rows for a named board region with no `[zone:…]`) rides
  along with D3's investigation; the result either extends the gate/prompt to catch a named-region-without-
  zone or is recorded as a deliberate deferral with its rationale in OI-129, mirroring the OI-124
  disposition above.
- `explanation_cache` handling on deploy is stated in `docs/deployment_steps.md`.

**US3 — billing recovery completes**
- **Agent-satisfiable half of OI-98**: `/pricing` (the existing `PricingScreen`) gains a mount-time
  Paddle.js init and reads `?_ptxn=…` to auto-open the checkout, proven by a unit test, and CSP is
  verified against a **production build** in a real browser — not under `npm run dev`.
  `/pricing-legal` stays out of scope; it must remain JavaScript-free.
- **Owner-gated half of OI-98**: pointing Paddle's dashboard default-payment-link setting at `/pricing`
  and confirming a real subscriber's payment-method-update email reaches an **open checkout**, verified
  end-to-end in the sandbox with a real transaction id. This is not an agent task — it is recorded as a
  sign-off item in `staging_checks.md` (repo root), the same pattern `open-issues-epics.md` Epic 4 uses
  for its ops verifications.
- OI-95's smallest correct form ships: the lesson-lock guard chain — `useLessonLockGuard.js` →
  `sagaLock.js`'s three chained functions (`deriveLockReason`/`dispatchLockAction`/
  `deriveLessonAccess`, each threading a new `'signin'` outcome) → `SagaScreen.jsx`/`UpgradeModal.jsx`
  — calls the existing `GET /api/user/entitlement` and branches the locked-lesson copy between "Sign
  in" (signed out, via the existing `AuthModal.jsx`) and "Upgrade" (signed in, free tier) — no API
  contract change, no amendment to spec 053 FR-002/FR-033 or its "Lesson (locked view)" entity. This
  corrects the epic's original file map, which named the three lesson screens directly — they never
  render locked-lesson copy; `useLessonLockGuard.js` redirects away from them first.
- OI-41 needs no code: its stale half was corrected on 2026-08-03 and its substantive half narrowed to
  the `/pricing-legal` accepted risk. The story either re-confirms that decision or closes the entry
  won't-fix; either outcome is recorded in `docs/open_issues.md`.

**US4 — grading is stable**
- The same move shows the same `quality` on first analysis and on every later view, proven by a test
  that exercises both the live and reconstruction paths for one boundary-case move.
- The "never filter `blunders` by `quality` when counting mistakes" rule (OI-125) is named in code and
  guarded by a test at more than one of its five sites.

**US5 — the gate is trustworthy**
- `npm run test:fast` is **green, or red only for failures explicitly enumerated and justified** in the
  epic's closing summary. The two ENOENT fixture-path tests must actually run and assert.
- **OI-5 is owner-gated** (the probe needs a real account's credentials): the run is recorded as a
  sign-off item in `staging_checks.md` (repo root), the owner runs
  `cd connect-four && node --env-file=server/.env scripts/probe-refresh-rotation.mjs <email> <password>`,
  and the result is applied (close it, or build the de-dup Map) and recorded in `docs/open_issues.md`.
- OI-31 and OI-105 are each closed with a **measurement** of what the live deploy actually does, not a
  rule-based edit.

### Epic-wide

- **Issue closeout is mandatory and per-story**: `docs/open_issues.md` is updated for each of OI-92,
  OI-86, OI-83, OI-130, OI-126, OI-124, OI-129, OI-98, OI-95, OI-41, OI-104, OI-125, OI-82, OI-5,
  OI-31, OI-105 in the same change that ships the work, using that file's existing formats. An entry
  deliberately not fixed stays open **with the decision recorded**.
- Any new defect found while working this epic gets a **new `OI-N`**, never a memory entry.
  [[feedback_open_issues_destination]]
- Every per-change deploy prerequisite lands in `docs/deployment_steps.md`; standing procedure changes
  land in `docs/deploy-runbook.md`.
- The epic closes with an explicit **launch-readiness statement**: for each of the 5 stories, shipped /
  deferred-with-reason, and whether the owner can launch.

---

## NOT included

Enumerated so scope cannot grow silently. All of these stay open in `docs/open_issues.md`.

- **Spanish content debt** (settled decision 1): OI-36, OI-38, OI-93, OI-79.
- **Admin-only surfaces** (settled decision 2): OI-123, OI-107, OI-72, OI-88, OI-91, OI-114, OI-131,
  plus the two admin lesson-write defects OI-80 (filename/id fork) and OI-116 (read-modify-write race).
  Both are real and both corrupt content, but they fire only from `/admin` under `requireLocalhost`,
  and their workaround (serialise the calls, re-read the JSON) is already documented.
- **Test/lint infrastructure beyond US5's baseline**: OI-102, OI-106, OI-111, OI-112, OI-118, OI-119,
  OI-87, OI-94. US5 makes the gate *trustworthy*; it does not refactor the harness, replace the
  hand-maintained test lists, or fix the demoted `react-hooks` warnings.
- **Latent / no-live-caller detector work**: OI-89, OI-90, OI-30, OI-33, OI-109, OI-108.
- **Doc, dead-code and test-integrity debt with no user-facing defect**: OI-122, OI-127, OI-113, OI-32.
- **Minor UX polish**: OI-128 (stepper URL). (OI-129 is in scope under US2 — see its acceptance
  criterion — not listed here.)
- **New features of any kind**, including the OI-95 product decision beyond its smallest correct form.
- **Direct writes to staging or production by an agent** (settled decision 4).
- The 9 epics in `open-issues-epics.md`. This epic does not absorb, renumber, or reorder them.

---

## Traceability

| OI | Story | One-line reason it blocks launch |
|---|---|---|
| OI-92 | US1 | 18 of 42 live `overcut` rows stale → correct answers graded wrong on staging **and** production |
| OI-86 | US1 | 8 of 12 categories at zero active puzzles (local); production never measured |
| OI-83 | US1 | The only `forced_win` puzzle was retired as AMBIGUOUS → category empty |
| OI-130 | US1 | The pool-verification script can never return a row, so pool audits are vacuous |
| OI-126 | US2 | Raw `c3-c6` reproduced in text served to a real user |
| OI-124 | US2 | Nothing gates the live explanation path — the root cause behind OI-126 and OI-129 |
| OI-129 | US2 | Prose names board regions that carry no annotation — measured alongside D3, then fixed or deliberately deferred |
| OI-98 | US3 | Payment-method-update email dead-ends → involuntary churn |
| OI-95 | US3 | Signed-out visitors and free users get the same upgrade prompt (conversion) |
| OI-41 | US3 | Verified stale 2026-08-03 and narrowed to an accepted risk on `/pricing-legal` — re-confirm the decision only |
| OI-104 | US4 | A move labelled `blunder` reads `suboptimal` on every later view |
| OI-125 | US4 | The mistake-count invariant is unnamed and nearly unguarded (guard it while US4 is in there) |
| OI-82 | US5 | `test:fast` is 5 RED — a green run currently proves nothing |
| OI-5 | US5 | Refresh-token rotation verified only against anonymous sessions |
| OI-31 | US5 | Staging migrations may run on the transaction pooler |
| OI-105 | US5 | Migration 061 used twice; ledger diverged from disk on both live environments |
