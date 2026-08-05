# Implementation Plan: Deep-Reveal Grounding

**Branch**: `058-deep-reveal-grounding` | **Date**: 2026-08-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/058-deep-reveal-grounding/spec.md`, epic
`docs/epics/deep-reveal-grounding-epic.md` ("Epic 11 — Deep-Reveal Grounding"), and
`.claude/epics-workflow/deep-reveal-grounding-epic.handoff.md` (carries the future-square visual
mechanism, deliberately not in spec.md — see §"The future-square visual mechanism" below).

## Summary

The reason engine already computes correct, solver-grounded facts about a blunder (winning
lines, fork squares, deep-forced-sequence completions) but the render layer has no legal way to
highlight some of them (no handle for a deep fork square) and does not require the coach to
highlight the ones it does offer (`buildAnnotationOffer` in
`connect-four/server/scripts/reason_engine/zoneAnnotations.mjs:49` only *offers*). The fix is
entirely render-layer, in four ordered stories: (US1) add a "future square" handle class for
deep fork cells, distinctly framed; (US2) derive a 1–3-group required set from the causal link's
two halves and require the coach to highlight it, retrying once on omission and always serving
the retried attempt; (US3) close three known leaks — a new `promoteRawCoordinates()` function
(`connect-four/server/reasonRenderGuard.mjs`, a new symbol, not touching Plan A's
`stripInternalTokens`/`RANGE_RE`) turns a raw coordinate into a real highlight instead of flattening
it, `checkP5Strong` (`connect-four/server/annotationGate.js:323`) is finally threaded live from a
real offered-alias set, closing OI-143, and `checkP5Strong`'s own three internal coverage gaps
(no `windows:` branch, no `future:`-prefix handling, and `reasonRenderGuard.mjs`'s
`SPAN_CARRYING_CODES` missing `P5strong`) are fixed in the same task — see "Corrections" below,
the plan-critique's systemic finding that this class of gap needed a full re-walk, not a patch of
the one instance the plan's first draft found; (US4) an opt-in `Board.jsx` prop that numbers
columns/rows on the deep-reveal screen only.

**Hard prerequisite**: this plan is written against the **post-Plan-A** version of
`connect-four/server/reasonRenderGuard.mjs` (`stripInternalTokens`/`RANGE_RE` widened for
en-dashes, and `GET /api/user/tts/deep-reveal` routed through the same sanitizer). This epic does
not implement either — see Cross-Lane Constraints in spec.md. Merge order: Plan A first.

## Technical Context

**Language/Version**: Node.js, ES modules (`connect-four/package.json:5` — `"type": "module"`)
**Primary Dependencies**: Express (`server/index.js`), `@supabase/supabase-js` (Postgres via
Supabase), OpenAI chat completions (`server/llmChat.js`), React 18 (frontend, `src/components/`)
**Storage**: Postgres via Supabase — `deep_reveal_failures`, `explanation_cache` tables
**Testing**: `node --test` via `npm run test:fast` (`connect-four/package.json:17`, ESLint +
~180 explicit test files in one line) — **never** `npm test` (that variant additionally runs
`candidate-generator.test.js`, which hangs on real solver IPC; out of scope here regardless)
**Target Platform**: Railway-hosted Node server + static-served React SPA; local dev via
`npm run dev` (see `docs/architecture/worktree-conventions.md` for port allocation)
**Project Type**: Web application — `connect-four/server/` (backend) + `connect-four/src/`
(frontend), single repo, no separate `backend/`/`frontend/` top-level split
**Performance Goals**: No new latency budget beyond the existing Explanation Engine's 2s target
(constitution Principle V) — this feature adds at most one additional LLM retry call (already
budgeted by the existing `isLlmError` retry) and pure-function render-layer work; no new solver
calls (I0 does not apply — this is render-only, not engine work)
**Constraints**: Cross-lane file ownership (see spec.md `## Constraints (Cross-Lane)`, copied
verbatim from the epic) — `reasonRenderGuard.mjs`'s `stripInternalTokens`/`RANGE_RE` and the TTS
sanitizer routing are Plan A's; `Board.jsx` sizing/layout is Plan B's; new OI ids use OI-170+;
`package.json` line 17 test-list additions must be explicit line-level diffs (§below)
**Scale/Scope**: 4 user stories, server-side (reason-engine render layer + one endpoint) +
one frontend prop, 1 schema migration; no new external dependency

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Explanation Engine as Single Source of Truth** — PASS. All changes are inside the existing
  Explanation Engine's render layer (`zoneAnnotations.mjs`, `causalLinks.mjs`,
  `renderReasonModel.mjs`, `mechanismExplainer.mjs`) or its response-boundary guard
  (`reasonRenderGuard.mjs`, `annotationGate.js`). No new explanation-producing path is created.
- **II. Code Quality & Simplicity** — PASS. Reuses existing primitives throughout: the
  `denialCell` precedence already in `causalLinks.mjs:23`, the existing `zoneParser.js`
  `expandSpec`/`isValidSpec` single source of truth (shared by client, `annotationGate.js`, and
  server), the existing `checkP5Strong` (already implemented, never wired), the existing
  `zhCells` color pipeline (no `Board.jsx` renderer change for US1's visual distinction).
- **III. Testing Standards** — PASS with an explicit list (see "Testing" below); no solver-mocking
  introduced (this is render-layer, not solver-dependent) — pattern classification detectors
  (STRUCTURAL tag kinds) are already computed upstream and reused, not reimplemented.
- **IV. UX Consistency & Progressive Disclosure** — PASS. US4's numbering is additive and
  opt-in; no existing terminology changes; Deep Reveal remains gated the same way.
- **V. Performance Requirements** — PASS. See Technical Context; no new solver calls, at most one
  additional bounded LLM retry (same shape as the existing `isLlmError` retry in
  `mechanismExplainer.mjs:98-99`).
- **VI. Implementation & Debugging Methodology** — the four staging boards
  (`3154`, `315444233213`, `315444233213134122`, `3154442332131341225551`) are the concrete
  reproducing artifacts (epic "The evidence" table) — every US1–US3 change is validated by
  re-running these positions through the pipeline, not by theorizing.
- **VII. Software Design Philosophy** — the required-set Derivation Rule (spec.md, copied
  verbatim from the epic) is the single explicit rule; no silent guess when a half has neither
  `cell` nor `completingCell` (FR-006 — abstain, don't invent).
- **Principle VIII — Documentation (MUST check before planning)**:
  - [x] Existing architecture docs were read before drafting: `docs/architecture/reason-INVARIANTS.md`,
    `reason-DECISIONS.md` (D26, D28, D29, D30, D34), `reason-case-taxonomy.md`,
    `blunder-reason-evidence.md`, `reason-render-grounded-prompt.md`, `docs/deployment_steps.md`,
    `docs/open_issues.md` (OI-143/124/126/139), the constitution, and the epic + handoff.
  - [x] One undocumented convention was discovered during review and is resolved in this plan
    (not deferred): the `future:` spec-prefix mechanism for US1 (§"The future-square visual
    mechanism" below) has no prior art in the codebase — it is a new, minimal addition to the
    existing zone-spec grammar, documented here and to be added to
    `docs/architecture/reason-render-grounded-prompt.md` as a task (see tasks list, doc task).
  - [x] tasks.md (next phase) will include explicit documentation tasks: an addendum to
    `reason-render-grounded-prompt.md` for the required-set derivation + future-square mechanism,
    a `reason-DECISIONS.md` entry (D35) recording the two-attempt-logging schema and the
    `future:` spec convention, and the `docs/deployment_steps.md` entry for the migration.

**No violations to justify — Complexity Tracking is empty.**

## Corrections to the epic/handoff (source-verified — supersede the epic text where they conflict)

Per CLAUDE.md's "Verifying any claim about this codebase" rule, every claim below was checked
against the actual file. Five corrections surfaced — the first two from the initial planning pass,
the remaining three from the plan-critique review round (items 3-5 below; item 3 also broadens an
initial finding from one gap to three, per the critique's systemic finding):

1. **`ZONE_COLORS` has 4 entries, not 7.** The handoff's "CRITICAL for the plan author" note says
   "a reserved distinct colour from the existing 7-colour highlight palette in
   `src/lib/annotatedText.js`." The actual array
   (`connect-four/src/lib/annotatedText.js:11-16`):
   ```js
   export const ZONE_COLORS = [
     '#5B9BD5', // blue
     '#E8543E', // red
     '#2FAA5A', // green
     '#8B5CF6', // purple
   ];
   ```
   is a **4-colour** pool, hash-assigned by `getZoneColor(spec)` (`:25-32`). The owner's decision
   (reserve one distinct colour, keyed off the spec string, no `Board.jsx` renderer change) still
   stands and is implemented below — it is a **5th, non-hash-pool** colour, not "one of the 7."
2. **`RANGE_RE` is currently `/\bc(\d+)-c(\d+)\b/gi`** (`connect-four/server/reasonRenderGuard.mjs:33`)
   — ASCII hyphen only, confirming the epic's "misses the en-dash" diagnosis. This plan does not
   touch it (Plan A's file); it is cited here only to confirm the pre-Plan-A baseline this plan
   builds on.
3. **`checkP5Strong` has THREE silent-fallthrough gaps, not one — found by a full re-walk of
   `annotationGate.js` + `reasonRenderGuard.mjs` end-to-end, per the plan-critique's systemic
   finding** (the critique's diagnosis: this plan's first draft found one gap and stopped, rather
   than walking every branch/consumer of a failure code; both of the critique's top-2 blocking
   issues were further instances of the exact class the plan itself had just diagnosed).
   1. **No `windows:` branch.** `annotationGate.js:349-399`'s spec-matching loop handles
      `tg`/`colN`/`cNrM`/`cells:`/`rowN` but has no case for the `windows:c1r1,c2r2,...` format
      `buildAnnotationOffer`'s own `tagSpec()` emits for every window-bearing structural tag
      (`zoneAnnotations.mjs:44-47`). A `windows:` spec silently falls through every branch today —
      not rejected, just never checked.
   2. **No `future:` handling.** `checkP5Strong` never calls `zoneParser.js`'s
      `isValidSpec`/`expandSpec` (unlike `checkP1`/`checkP2`/`checkP5`, which do and so get
      `future:`-prefix support "for free" once `zoneParser.js` is updated for US1) — it matches raw
      spec strings with its own four regexes. A `future:c2r6` or `future:windows:...` spec (US1's
      new handle class) matches none of them and falls through identically to gap 1 — verified
      false the earlier assumption that stripping the prefix in `zoneParser.js` alone gives
      `checkP5Strong` coverage.
   3. **`reasonRenderGuard.mjs`'s `SPAN_CARRYING_CODES` (`:151`) omits `P5strong`.** Even after
      gaps 1-2 are fixed and a real `allowedSet` is threaded, `stripFailingZoneSpans`
      (`reasonRenderGuard.mjs:162-177`) only strips a span for a code in
      `SPAN_CARRYING_CODES = new Set(['P1', 'P2', 'P5', 'P6'])` — `checkP5Strong`'s own codes
      (`P5strong:tg`, `P5strong:col_not_allowed:*`, `P5strong:cell_not_allowed:*`) are absent. A
      rejected highlight would mark the payload invalid, log a `console.warn`, and then be **served
      to the player unchanged** — the exact failure US3/FR-012/SC-006 exist to close.

   All three ship as **one task** (per the owner's answer) — landing them separately leaves a class
   of highlight silently unchecked in the interim. See data-model.md §3 for the full fix (a
   `windows:` branch mirroring the existing `cells:` one, a `future:`-prefix strip before the four
   existing branches, and the `SPAN_CARRYING_CODES` addition) — `annotationGate.js` **and**
   `reasonRenderGuard.mjs` are both touched by this epic for US3, correcting an earlier draft of
   this plan's file map that under-scoped this to `annotationGate.js` alone.
4. **The required-set retry-compliance check (US2) cannot be checked against a raw `[zone:handle]`
   string — pinned to `processAnnotations`'s `usedSpecs`, surfaced.** `runLlmAttempt`
   (`mechanismExplainer.mjs:50-58`) calls `postprocessAnswer` (`compute.mjs:294`) →
   `processAnnotations` (`zoneAnnotations.mjs:191`), which rewrites every offered `[zone:{handle}]`
   into its expanded `[zone:{spec}]` **before** `computeMechanism` ever inspects
   `attempt.mechanism` — no handle survives to be string-matched. An earlier draft of research.md
   D3 hedged between checking the handle or "its already-expanded `spec`"; checking the handle
   would fail on every single request (retry + a `deep_reveal_failures` row every time). The check
   is pinned to the expanded `spec`, specifically `processAnnotations`'s own local `usedSpecs` Set
   (`zoneAnnotations.mjs:208,210`), which is not currently returned — surfacing it is three small,
   explicit changes (`processAnnotations`, `postprocessAnswer`, `runLlmAttempt` each widen their
   return shape by one field). See data-model.md §2, Consumer 2, and research.md D3 for the full
   three-hop trace with each function's current body quoted.
5. **`assembleGroundedPrompt` (`renderReasonModel.mjs`), not `compute.mjs`'s
   `buildPromptForCondition`, is where the `# Highlightable regions` prompt block lives.** Verified
   by direct read — `compute.mjs` only calls `buildPromptForCondition`, which itself calls
   `assembleGroundedPrompt`; this plan's Source Code map already correctly omits `compute.mjs` for
   that reason, but an earlier draft of research.md D6 and data-model.md named `compute.mjs`
   directly — both are corrected in this pass so a tasks author does not task the wrong file.

**Full implementation-shape decisions (derivation-rule wiring, retry-trigger composition, the
`AllowedSetEntry` adapter, the migration schema, the future-square mechanism's exact code
insertion points, `promoteRawCoordinates`'s design (D10), and `guardExplainMoveLlmPayload`'s three
call sites (D11)) are recorded in `research.md` (D1–D11) and `data-model.md` — this plan.md does
not duplicate them; it cites their conclusions where the Source Code map and deploy prerequisites
need them.

## The future-square visual mechanism (US1 / FR-002 / SC-003 — not in spec.md by design)

Per the handoff, the owner's mechanism is a **reserved distinct colour + future-tense prose**,
explicitly **not** a `Board.jsx` `zhCells` renderer change (that file is Plan B's for sizing, and
the color pipeline already exists end-to-end: `AnnotatedExplanation.jsx` calls
`getZoneColor(spec)` (`connect-four/src/components/AnnotatedExplanation.jsx:92`) and hands
`{color, cells}` up to `Board.jsx`'s existing `zhCells` prop
(`connect-four/src/components/Board.jsx:104`, doc comment: *"Coach-mention zone highlights —
Array<{color: string, cells: Array<{c,r}>}> (0-indexed)"*) — no new renderer code needed if the
color and cells are already correct by the time they reach that prop).

**Concrete mechanism (new, minimal — the "undocumented convention" from the Constitution Check
above), reusing the existing single-source-of-truth spec grammar in `server/zoneParser.js`:**

- A future-square handle's `spec` carries a `future:` prefix wrapping an otherwise-ordinary spec,
  e.g. `future:c2r6` (single cell) or `future:windows:c2r6,c5r5` (a fork's two cells as a window
  list — reusing the existing `windows:` shape, `server/zoneParser.js:110-126`).
- **Server** (`server/zoneParser.js`): `isValidSpec` (`:14-21`) and `expandSpec` (`:62-130`) each
  gain one line: strip a leading `future:` before delegating to the existing shape checks —
  `annotationGate.js` imports both (`server/annotationGate.js:10`,
  `import { parseZoneSpecs, expandSpec, isValidSpec } from './zoneParser.js';`), so P1/P5/P5Strong
  validate `future:` specs for free, no separate change.
- **Client** (`src/lib/annotatedText.js`): `isValidSpec` (`:38-45`) gains the same one-line strip.
  `getZoneColor(spec)` (`:25-32`) gains an early branch: `spec.startsWith('future:')` returns a
  **new, 5th, reserved constant** (not part of `ZONE_COLORS`, never hash-selected) — e.g.
  `FUTURE_ZONE_COLOR = '#D97706'` (amber; UNVERIFIED SKETCH — adapt to the existing design-token
  palette, confirm no collision with an existing semantic color in `Board.jsx`'s inline styles
  before picking the final hex). `zoneToOverlays`/`zoneToWindowGroups` (`:151`, `:245`) need the
  same one-line `future:` prefix strip before delegating to their existing cNrM/windows parsing,
  since cell *resolution* is identical — only the *color* differs.
- **Server offer** (`server/scripts/reason_engine/zoneAnnotations.mjs`): `buildAnnotationOffer`
  gains a new handle class for deep fork cells — the `forkCells` named by `tacticTag:
  "double_threat"` on the projected-deep board (Settled decision 8) — with `tagSpec()` prefixing
  `future:` and `roleText()` gaining a future-tense variant, e.g. *"this square matters later,
  once the forced sequence reaches it — not a threat right now"* (distinct from the present-tense
  `roleText` at `zoneAnnotations.mjs:36-41`).
- **Prompt** (`server/scripts/renderReasonModel.mjs`'s `assembleGroundedPrompt`, `:284-286`
  region, the "Highlightable regions" block): the rule from Settled decision 8(b) — describe a
  `future:`-handle square in future/conditional language, never as a present threat — is stated
  explicitly in that block, distinguishing it from the present-tense instruction already there.

This closes the loop: verbal distinction is the future-tense `role`/prompt-rule text feeding the
LLM's prose; visual distinction is the reserved color reaching the existing `zhCells` pipeline
unmodified. Both derive deterministically from the `future:` spec prefix — no new per-cell
metadata needs to ride through `processAnnotations`'s `keyCells` (which stays a flat string
array); the color decision happens client-side, purely as a function of the spec string it
already receives.

## Project Structure

### Documentation (this feature)

```text
specs/058-deep-reveal-grounding/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── deep-reveal-grounding-contracts.md   # deep_reveal_failures schema + Board.jsx prop contract
└── tasks.md              # Phase 2 output (/speckit-tasks — NOT created by this command)
```

### Source Code (repository root: `connect-four/`)

```text
connect-four/
├── server/
│   ├── scripts/
│   │   └── reason_engine/
│   │       ├── zoneAnnotations.mjs        # US1: future-square handle class; buildAnnotationOffer;
│   │       │                               US2: processAnnotations (:191) return shape gains
│   │       │                               `usedSpecs: [...usedSpecs]` (data-model.md §2 Consumer 2,
│   │       │                               research.md D3) — required for the retry-compliance check
│   │       ├── causalLinks.mjs            # US2: export `denialCell` for reuse by the derivation rule
│   │       └── (reasonEngine.mjs, etc. — UNTOUCHED; this is render-only, I0/I1 boundary)
│   ├── renderReasonModel.mjs              # US2: deriveRequiredSet + prompt "MUST build" block
│   │                                        inside `assembleGroundedPrompt` (:311, NOT compute.mjs
│   │                                        — see Corrections item 5); US1: future-square framing
│   │                                        rule in the same prompt block
│   ├── mechanismExplainer.mjs             # US2: second retry trigger (required-set omission,
│   │                                        checked via `attempt.usedSpecs`, not a raw handle
│   │                                        string — Corrections item 4); both attempts returned
│   │                                        (not discarded); runLlmAttempt (:50-58) and
│   │                                        postprocessAnswer pass-through gain `usedSpecs`
│   ├── scripts/compute.mjs                # US2: postprocessAnswer (:294) destructures + returns
│   │                                        `usedSpecs` from processAnnotations's result (one of
│   │                                        the three plumbing hops, data-model.md §2 Consumer 2) —
│   │                                        NOT touched for the "Highlightable regions" prompt
│   │                                        block (that lives in renderReasonModel.mjs, not here)
│   ├── reasonRenderGuard.mjs              # US3: (a) NEW export `promoteRawCoordinates(text, locale)`
│   │                                        (data-model.md §5), called from
│   │                                        guardExplainMoveLlmPayload (:207-225) BEFORE
│   │                                        validateAnnotation and BEFORE the final
│   │                                        stripInternalTokens call — a new symbol, NOT touching
│   │                                        Plan A's stripInternalTokens/RANGE_RE; (b)
│   │                                        guardExplainMoveLlmPayload threads a real allowedSet
│   │                                        through to validateAnnotation, built via a new
│   │                                        `toAllowedSet(aliases)` adapter — ONLY at the
│   │                                        fresh-generation call site (index.js:1424); the two
│   │                                        other call sites (index.js:1316 cache-hit, :1349
│   │                                        not-a-blunder) have no aliases in scope and keep
│   │                                        `allowedSet: null` (research.md D11); (c) add
│   │                                        `'P5strong'` to `SPAN_CARRYING_CODES` (:151)
│   ├── annotationGate.js                  # US3: checkP5Strong (:323-403) has THREE gaps, fixed as
│   │                                        ONE task (Corrections item 3, data-model.md §3): add a
│   │                                        `windows:` branch mirroring the existing `cells:`
│   │                                        branch (exact-signature match, not per-cell — Decision
│   │                                        A, whole-window-only); strip a leading `future:` prefix
│   │                                        before the four existing branches; separate the
│   │                                        `concreteCells`/`concreteRows`/`concreteCols`
│   │                                        pre-processing loop (:332-347) into single-cell-eligible
│   │                                        entries vs. `windowOnly` entries, the latter feeding a
│   │                                        new `offeredWindowSignatures` Set only (data-model.md
│   │                                        §3); (the SPAN_CARRYING_CODES fix is in
│   │                                        reasonRenderGuard.mjs, listed above)
│   ├── zoneParser.js                      # US1: future: prefix support in isValidSpec/expandSpec
│   ├── index.js                           # US2/US3: two-attempt deep_reveal_failures logging
│   │                                        (own region, away from the TTS handler at :3839);
│   │                                        allowedSet construction from
│   │                                        `result.renderDecision.zones.aliases` for
│   │                                        guardExplainMoveLlmPayload ONLY at the
│   │                                        fresh-generation call site (:1424) — the cache-hit
│   │                                        (:1316) and not-a-blunder (:1349) call sites are
│   │                                        UNCHANGED (research.md D11)
│   └── migrations/
│       └── 065_deep_reveal_failures_two_attempts.sql   # NEW — see data-model.md. Number
│                                                          # VERIFIED against disk at plan time
│                                                          # (highest existing is 064
│                                                          # `064_drop_correct_col.sql`; NOT 032 —
│                                                          # `032_blunders_new_tags.sql` already
│                                                          # exists, corrected from an earlier draft
│                                                          # of this plan that collided with it).
│                                                          # Re-verify at task-execution time: two
│                                                          # other concurrent lanes (Plan A, Plan B)
│                                                          # may also add migrations before this
│                                                          # feature's tasks run.
├── src/
│   ├── lib/
│   │   └── annotatedText.js               # US1: future: prefix in isValidSpec/getZoneColor/
│   │                                        zoneToOverlays/zoneToWindowGroups
│   ├── components/
│   │   └── Board.jsx                      # US4: new opt-in `showCoordinates` prop (additive,
│   │                                        default false — preserves existing API per
│   │                                        constraint 3)
│   └── screens/
│       └── MistakeDetailScreen.jsx        # US4: pass showCoordinates=true only to the Board
│                                            instance inside the `deepRevealOpen` branch (:410),
│                                            NOT the default-state instance (:422)
├── server/tests/
│   ├── zoneAnnotations.test.mjs           # US1 (existing file — extend)
│   ├── zoneParser.test.mjs                # US1 — NEW test file (no prior test file exercised
│   │                                        server-side isValidSpec/expandSpec; tasks-critique
│   │                                        blocking issue 2)
│   ├── causalLinks.test.mjs               # US2 (existing file — extend, for exported denialCell)
│   ├── renderReasonModel.test.mjs         # US1/US2 (existing file — extend)
│   ├── mechanismExplainer.test.mjs        # US2 (existing file — extend)
│   ├── reasonRenderGuard.test.mjs         # US3 (existing file — extend)
│   └── renderCoverageCorpus.test.mjs      # Phase 6.5 — AC3/SC-004: required ⊆ offered corpus
│                                            assertion (existing file — extend, tasks-critique
│                                            blocking issue 1b)
├── server/
│   └── deepRevealFailuresLogging.test.mjs # US2/US3 — NEW test file, two-attempt logging
├── tests/unit/
│   └── boardShowCoordinates.test.js       # US4 — NEW test file
└── docs/
    ├── architecture/
    │   ├── reason-render-grounded-prompt.md   # doc task: required-set + future-square addendum
    │   ├── reason-DECISIONS.md                # doc task: new decision entry (D35)
    │   └── data-model.md                      # doc task: deep_reveal_failures schema addendum
    │                                            (six new columns + new failure_reason value +
    │                                            migration filename — NOT db-schema.md, which does
    │                                            not document this table; tasks-critique blocking
    │                                            issue 3)
    ├── open_issues.md                         # US3: close OI-143 (mark resolved by this epic,
    │                                            do not open a duplicate — constraint 4)
    └── deployment_steps.md                    # deploy-prerequisite entry (see below)
```

**Structure Decision**: existing single web-app layout (`connect-four/server` +
`connect-four/src`) — no new top-level directories. Every file above already exists except the
migration, the two new test files, and `contracts/`. This is a render-layer feature;
`reasonEngine.mjs` and everything upstream of `toNarratorVector` is untouched (I0/I1 boundary
preserved).

## Testing — explicit `test:fast` additions (verbatim line-level diff)

`connect-four/package.json:17` is a single line listing ~180 test files
(`"test:fast": "eslint . && node --test --experimental-test-module-mocks tests/... server/tests/..."`).
Per Cross-Lane Constraint 5, every file this plan adds is listed here **by name**, to append as an
explicit, reviewable diff — never a rewrite of the line:

- `server/deepRevealFailuresLogging.test.mjs` (NEW — US2/US3, two-attempt logging + missing-handles
  recording)
- `tests/unit/boardShowCoordinates.test.js` (NEW — US4, `Board.jsx`'s new prop + the "every other
  screen unchanged" regression guard)
- `server/tests/zoneParser.test.mjs` (NEW — US1, `future:` prefix support in `isValidSpec`/
  `expandSpec`; added post-critique, blocking issue 2 — no prior file exercised the server-side
  zone parser)

Existing files below already appear on line 17 and are **extended in place** (no new line-17
entry needed) to cover this feature's changes:
`server/tests/zoneAnnotations.test.mjs` (`processAnnotations`'s new `usedSpecs` return field),
`server/tests/causalLinks.test.mjs`,
`server/tests/renderReasonModel.test.mjs`, `server/tests/mechanismExplainer.test.mjs` (the
required-set retry trigger, checked against `attempt.usedSpecs`),
`server/tests/reasonRenderGuard.test.mjs` (`promoteRawCoordinates` — the promote/accept and
promote/reject-and-flatten cases; `SPAN_CARRYING_CODES` actually stripping a `P5strong:*` failure),
`tests/annotationGate.test.js` (already on line 17, confirmed the file that exercises
`checkP5Strong` today — all three new branches, data-model.md §3, are tested there, not in a new
file), and `server/tests/computeConditionD.test.mjs` (already on line 17, verified — read in full —
to directly unit-test `postprocessAnswer` today, e.g. `postprocessAnswer expands handles +
rederives key_cells only when a zone was emitted, and surfaces repairs`; extend it to also assert
`usedSpecs` is surfaced on the return value, since this is the file that already owns
`postprocessAnswer` coverage, not a new one).

Phase 1 (`research.md` §"Testing decisions") confirms the US3 allowedSet-threading integration
test is added to `server/tests/reasonRenderGuard.test.mjs` (already imports
`guardExplainMoveLlmPayload`) rather than a new file, while the `checkP5Strong` `windows:`-branch
unit coverage itself belongs in `tests/annotationGate.test.js` alongside its existing P1–P5Strong
tests.

**Added post-critique (blocking issue 1)**: `server/tests/renderCoverageCorpus.test.mjs` (already on
line 17, no new entry needed) gains a required-⊆-offered assertion over the full boards corpus
(epic AC3/spec SC-004), and a new end-to-end acceptance task re-runs the four real staging boards
through the live pipeline per `quickstart.md`'s "End-to-end acceptance" section (epic AC1/spec
SC-001) — see tasks.md Phase 6.5.

## Deploy prerequisites

Walking the required checklist against this design:

- **Schema migration — YES.** `server/migrations/031_deep_reveal_failures.sql` declares
  `raw_llm_output text NOT NULL`, one row per failure
  (`connect-four/server/migrations/031_deep_reveal_failures.sql:1-14`). Settled decision 5 widens
  logging to record **both** attempts, the missing handles, and which was served — this cannot fit
  the existing single-`raw_llm_output` shape. New migration `065_deep_reveal_failures_two_attempts.sql`
  (see data-model.md; number verified against disk — highest existing is `064_drop_correct_col.sql`,
  re-verify at task time since concurrent lanes may add migrations first). Since staging/production
  are disposable pre-launch, this is a straight `ALTER TABLE` — no backfill of existing rows needed.
- **Data migration / backfill — NO new backfill needed**, beyond the pre-launch disposability
  rule already in force: `explanation_cache` rows written under the old (non-mandatory-highlight,
  non-checkP5Strong-enforced) rules are not retroactively compliant (spec.md Assumptions). Per the
  project's pre-launch rule, the fix is **TRUNCATE `explanation_cache` on deploy**, not migrate.
- **Content pools — NO.** No `puzzles`/`candidates` predicate changes.
- **Secrets / env vars — NO.** No new env var; `OPENAI_API_KEY`/`OPENAI_MODEL` already required by
  the existing endpoint (`server/index.js:1286`).
- **Caches — YES, `explanation_cache` TRUNCATE** (see above) — a cache hit bypasses every producer
  guard (`server/index.js:1310-1324` comment; memory `project_blunder_serving_dual_paths`), so a
  pre-epic cached row would keep serving ungrounded content indefinitely otherwise.
- **Ordering — Plan A merges first** (hard prerequisite, stated in spec.md and the epic). Within
  this epic: the migration must run **before** the code deploy that starts writing two-attempt
  rows (an INSERT against new NOT-NULL-shaped columns would fail on the old schema); the
  `explanation_cache` TRUNCATE can run any time before or immediately after the code deploy, but
  must happen before real traffic resumes hitting the endpoint, or a stale cache row will keep
  serving pre-epic content past the deploy.

**`docs/deployment_steps.md` entry** (added by this feature — using the file's own template,
`docs/deployment_steps.md:1530-1544`):

```markdown
## Spec 058 — Deep-Reveal Grounding

**Status**: PENDING
**When**: before, relative to the code deploy (migration); either, for the cache TRUNCATE (any
  time before real traffic resumes post-deploy)
**Blocks**: the two-attempt `deep_reveal_failures` INSERT (US2) will fail against the pre-epic
  schema without the migration; a stale `explanation_cache` row will keep serving pre-epic,
  ungrounded content without the TRUNCATE
**Applies to**: staging / production

### What's wrong (or: what this sets up)
Widens `deep_reveal_failures` to record both LLM attempts + missing required handles (Settled
decision 5); the old schema only logs a single terminal failure. `explanation_cache` rows
written before this deploy were produced under the old, non-mandatory-highlight rules and are not
retroactively compliant.

### Run it — exact commands
1. Staging: `node --env-file=server/.env.staging server/migrate.js`
   Production: `node --env-file=server/.env.production server/migrate.js`
   (applies `065_deep_reveal_failures_two_attempts.sql` — number re-verified at task time — plus any
   other still-unapplied migrations in that environment; `migrate.js` is idempotent per-migration
   via the ledger table. Staging pooler drift note: see the Standing Checklist item 1 in this file.)
2. `TRUNCATE TABLE explanation_cache;` run directly against the target environment's DB.

### Verify — the command and the success condition
`\d deep_reveal_failures` shows the new columns; a fresh `/api/explain-move-llm` call after
deploy returns a freshly-generated (non-`cached: true`) response.

### Roll back
Not reversible in a data sense (TRUNCATE); pre-launch disposability rule applies — no backup
needed (pre-launch data rule, owner directive 2026-08-03, CLAUDE.md).
```

## Complexity Tracking

*No Constitution Check violations — this section is empty by design.*
