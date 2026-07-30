# Implementation Plan: Detector Perspective Soundness & Blunder Tag Taxonomy

**Branch**: `worktree-epic-1-pattern-acceptance` | **Date**: 2026-07-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/052-detector-perspective-taxonomy/spec.md`
**Source epic**: `docs/epics/open-issues-epics.md` § "## Epic 2 — Detector Perspective Soundness & Blunder Tag Taxonomy"

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Five independent fixes to the blunder-tag/detector layer of `connect-four/server/classifier.js`,
all sharing one theme: **a stored, user-visible tag must describe the player it names, using only
that player's own data.**

1. **US1 (P1)** — `detectOvercut(board, scores, perspective)` mixes `perspective`'s threats with
   the side-to-move's score sign whenever `perspective !== board.currentPlayer` — the exact defect
   already fixed for undercut in OI-74. Split it into `detectOvercutVictim(board, scores)` /
   `detectOvercutBeneficiary(board, scores)`, dropping `perspective` entirely, mirroring
   `detectUndercutVictim`/`detectUndercutBeneficiary` (`classifier.js:981`,`:1003`) exactly. The
   production call site (`classifyPattern`'s detector list, `classifier.js:1784`, reached by
   `tagBlunder` Phase C on the already-moved board) maps to **`detectOvercutVictim`**, not
   Beneficiary — verified at source: the side to move on Phase C's board is the opponent, not the
   blunderer, so Beneficiary there would report the opponent's overcut and misfile it as the
   blunderer's own, reproducing OI-76's defect under a new name. `detectOvercutVictim` is genuinely
   new code (today's single `detectOvercut` is already written in the beneficiary framing), so it
   needs its own I12 counterexample board and a Phase-C-level regression, not a bare unit test.
   **The fixture generator (below) MUST be re-run only after this call-site mapping lands**, not
   before, or the human-reviewed fixture corpus would reflect the wrong-player tag.
2. **US2 (P2)** — Add the KB's "active forcing" sub-case as its own first-class match branch in
   the overcut detector, and resolve the contested `active_forcing` label (today misapplied to the
   T5 rows-3/6 branch) per a documented decision.
3. **US3 (P2)** — Distinguish "forfeited a forced win" from "genuinely best-is-a-draw" in both
   `classify()` (live sparring) and `tagBlunder` Phase E (stored/reviewed), both currently emitting
   the same `drawing_move` tag for both cases. The stored path gets a new `direction: 'forfeited_win'`
   value; the live path — which never reads `direction` at all — gets a distinct
   `coach.spoken.forfeited_win.*` phrase-pool key wired into `evaluateMoveHandler.js`'s lookup, with
   **new** phrase pools authored in both `en.json` and `es.json` (this is net-new i18n content, not
   already-covered by the existing `drawing_move` pools).
4. **US4 (P3)** — Replace the boolean `hasDoubleThreat`/`detectForcedWin` "did this pattern already
   exist" gate with a per-column (fork) / anchoring-column (forced-win) diff, so a genuinely new
   second fork/forced-win is recognized as a creation even when the first one persists.
   `detectForcedWin` returns its anchoring `blockCol` only, not the full forcing-column set — the
   known collision (two distinct lines sharing one `blockCol`) is documented as a new open issue, not
   solved here.
5. **US5 (P4)** — Extend `classify()`'s live per-move tag vocabulary with a vetted subset of the
   patterns `classifyPattern()` already detects offline (figure_7, j_shape, z_threat, undercut,
   overcut, odd_even_threat, claimeven), reusing the existing absent→present transition gate, admitted
   under a single total-latency budget for `POST /api/evaluate-move` derived from the Explanation
   Engine's 2s target (cheapest detector first, not a per-detector ceiling).

Every story is a **content migration**, not a pure refactor: `overcut` is evaluated inside
`tagBlunder`'s `MISSED_OWN_PRIORITY` phase (`classifier.js:1961`) on `moves + correctCol`, where the
tagged player is **not** the mover — i.e., production always takes today's unsound branch, so fixing
it changes stored tags. Every changed fixture requires human review (FR-005), and every renamed/new
label requires a `reason-DECISIONS.md` entry and lockstep doc updates (FR-008, FR-015, FR-027).

## Technical Context

**Language/Version**: Node.js (ESM, `"type": "module"` per `connect-four/package.json`), no TypeScript.
**Primary Dependencies**: none new. Existing: `c4solver-wrapper.js` (child-process IPC to the C++
solver), `node:test` + `node:assert/strict` as the test runner, Supabase JS client for DB access.
**Storage**: Supabase Postgres. `public.blunders.pattern_category` (CHECK constraint,
`server/migrations/052_blunders_parity_threat_tags.sql`), `public.blunders.direction` (nullable,
no CHECK constraint — "forward compatibility" per `db-schema.md`), `public.candidates`/`public.puzzles`
`highlight_metadata` JSONB (only touched if FR-006's re-measurement finds active `overcut` rows).
**Testing**: `npm run test:fast` from `connect-four/` (per `CLAUDE.md` §Running tests — NOT `npm test`,
which additionally runs `tests/integration/candidate-generator.test.js`, excluded because it calls the
real solver up to 400× and routinely hangs 10+ minutes). `node --test --experimental-test-module-mocks`
under the hood (see the exact file list in `connect-four/package.json`'s `"test:fast"` script).
**Target Platform**: Node server (Railway-deployed) + Vite/React SPA; this epic touches only the server
(`connect-four/server/`) and its fixtures/i18n, not the SPA build.
**Project Type**: Web application (existing `connect-four/server` + `connect-four/src` split).
**Performance Goals**: US5 must not add unbounded per-move solver latency to live sparring
(`POST /api/evaluate-move`) — measure each candidate detector's real cost (`detectZThreat`,
`detectOddEvenThreat`, `detectClaimeven` are `async` and call the solver; `detectFigure7`/`detectJShape`
are sync geometry) before deciding inclusion (FR-022). The admission criterion is a **single total
end-to-end latency budget** for the endpoint, derived from the existing 2s explanation-path target
(below), not a per-detector ceiling: measure the endpoint with/without each detector and admit
cheapest-first while the running total stays under budget.
**Constraints**: `npm run test:fast` MUST pass after every user story (FR-027, epic Acceptance
criteria). Every `overcut`/`drawing_move` fixture diff MUST be human-reviewed, not bulk-regenerated
(FR-005). `docs/knowledge-base/community-overcut.md` has a vendored copy at `server/kb/` kept in sync
by `tests/unit/kbSync.test.js` (part of `test:fast`) — any edit to the doc requires `npm run sync-kb`.
**Scale/Scope**: 5 user stories, ~40 tasks total per the source epic's own sizing (`US2.1` 8,
`US2.2` 7, `US2.3` 10-14, `US2.4` 6, `US2.5` 7).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I — Explanation Engine as Single Source of Truth**: PASS. All five stories operate
inside the existing classifier/tagBlunder/explainContext pipeline (`classifier.js`, `llmCoachHelpers.js`,
`explainContext.js`) — no new independent evaluation path is introduced. US5 adds tags to `classify()`'s
existing priority chain (already the sanctioned per-move classifier), not a parallel mechanism.

**Principle II — Code Quality & Simplicity**: PASS with a noted risk. US2's active-forcing branch and
US4's per-column diff are genuinely new control flow (not speculative abstraction — each is required by
a named FR). Risk: FR-008's rename (`active_forcing` → `t5_row3_row6` or similar) touches a
production-emitted string that is also a stored-fixture value and a KB cross-reference target — must be
grepped exhaustively, not assumed contained to `classifier.js:1052`.

**Principle III — Testing Standards**: PASS. FR-009 explicitly mandates one dedicated counterexample
board per overcut sub-case (minor-threat, T4, T5, chain-T2, active-forcing) run through the *production*
detector — this is I12 (`reason-INVARIANTS.md`) applied to a non-reason-engine detector, which the epic's
Settled decision 3 explicitly extends here. FR-021 adds a `test:fast`-safe regression for
`candidate-generator.js`'s classify consumer (currently only covered by the excluded
`candidate-generator.test.js`).

**Principle IV — UX Consistency**: PASS, with an explicit FR: FR-015 requires every tag-vocabulary
touchpoint (DB constraint, `blunderTags.js`, docs, both locales, `blunderReasons.js`, `explainContext.js`,
the glossary) updated in the same change — this is the constitution's "identical terminology" rule
applied to a migration, not just new-feature copy.

**Principle V — Performance Requirements**: PASS with an explicit gate: FR-022 requires latency
measurement of each solver-calling detector *before* it is added to the <2s live per-move path (the
Explanation Engine's own performance requirement in this constitution). No detector may be added to
`classify()` on the strength of an assumption.

**Principle VIII — Documentation (MUST check before planning)**:
- [x] Existing architecture docs (docs/architecture/, data-model.md, contracts/, prior plan.md
  files, constitution) were read before this plan was drafted — see Research §Sources read, below.
- [x] Any undocumented conventions discovered during review have been documented before
  planning continued — see Research §"Undocumented gap found: minor-threat exception is
  structurally unreachable in the current detector loop" (a real finding, not assumed).
- [x] tasks.md will include explicit documentation tasks for every new architectural decision
  this feature introduces (the `active_forcing` rename, the `drawing_move` direction refinement,
  the per-column diff helper, the live-coach pattern-selection rationale) — see Research §Phase 0
  Decisions; each maps to an FR that already mandates a doc update (FR-008, FR-011, FR-015, FR-016,
  FR-022, FR-026).

No constitution violations requiring justification — Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/052-detector-perspective-taxonomy/
├── plan.md              # This file (/speckit-plan command output)
├── research.md           # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── detector-signatures.md   # Phase 1 output — new/changed function contracts
└── tasks.md              # Phase 2 output (/speckit-tasks command — NOT created by /speckit-plan)
```

### Source Code (repository root)

This is an existing web application (`connect-four/server` = Node/Express API + classifier,
`connect-four/src` = Vite/React SPA). This epic touches **only the server side** and its adjacent
fixtures/docs/i18n — no new top-level directories.

```text
connect-four/
├── server/
│   ├── classifier.js              # detectOvercut split (US1), active-forcing branch (US2),
│   │                               # classify()/tagBlunder drawing_move fix (US3), creation-gate
│   │                               # per-column diff (US4), classify() priority-chain extension (US5)
│   ├── blunderTags.js              # VALID_BLUNDER_TAGS registry (US3 touchpoint if new tag minted)
│   ├── blunderReasons.js           # REASON_TEMPLATES / POSITIVE_TEMPLATES (US3 :43/:60 fix)
│   ├── explainContext.js           # POSITIVE_CASCADE hard-coded tag array (US3 touchpoint, `drawing_move` at :415)
│   ├── candidate-generator.js      # detectOvercut caller (US1), cls.tag consumer (US4 FR-021, :668)
│   ├── llmCoachHelpers.js          # Fix 4 grounding-rule text re-check (US3 FR-016, :724)
│   ├── kb/community-overcut.md     # vendored KB copy — sync via `npm run sync-kb` after US2 edits
│   └── migrations/
│       └── 05N_*.sql               # new migration IF US3's Open Question 2 needs one (see research.md)
├── src/i18n/
│   ├── en.json                     # coach.spoken.<tag>.* (US5 — already present, verify parity),
│   │                               # blunder.pattern.<tag> (US3 if new tag), drawing_move templates
│   └── es.json                     # parity for all of the above
├── tests/
│   ├── blunder/
│   │   ├── tagBlunderFixtures.test.js   # golden fixtures — 0 existing `overcut` rows (grep-verified)
│   │   └── fixtures/tagBlunderFixtures.json
│   ├── classifier/classifier.test.js    # unit tests for detectOvercutVictim/Beneficiary (US1/US2)
│   └── integration/undercut_overcut.test.js  # structural tests, imports detectOvercut today (US1
│                                              # rename breaks this import — must be updated)
└── scripts/
    └── generate_tagblunder_fixtures.mjs # re-run to detect newly-reachable overcut fixtures (US1 FR-005)

docs/
├── knowledge-base/
│   ├── community-overcut.md        # FR-011 cross-references + KB source of the active-forcing case
│   ├── allen-t2.md / allen-t4.md / allen-t5.md   # FR-011 cross-references
├── architecture/
│   ├── reason-DECISIONS.md         # FR-008 (active_forcing) + US3's taxonomy decision entries
│   ├── server-conventions.md       # §"Undercut has two sides" precedent; §"Blunder Tag Registry" (US3)
│   ├── data-model.md / db-schema.md  # pattern_category / direction value updates (US3)
│   └── feature-vector-glossary.md  # :337 tag-semantics table (US3 FR-015)
└── open_issues.md                  # OI-76, OI-60, OI-48, OI-33, OI-30 closeouts (FR-026)
```

**Structure Decision**: No new directories or services. Every change lands inside the existing
`connect-four/server/` classifier module and its already-established fixture/doc/i18n satellites. This
matches the epic's own stated primary surface (`server/classifier.js`, `server/llmCoachHelpers.js`,
blunder fixtures) and requires no Constitution Check exception.

## Complexity Tracking

*No entries — Constitution Check passed without violations.*
