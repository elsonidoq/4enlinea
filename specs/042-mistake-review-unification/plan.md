# Implementation Plan: Mistake Review Unification & Deep-Reveal Overhaul

**Branch**: `feature/polish` | **Date**: 2026-07-08 | **Spec**: `specs/042-mistake-review-unification/spec.md`
**Input**: Feature specification from `specs/042-mistake-review-unification/spec.md` (Epic 2 of `polish_epic.md`)
**Depends on**: Epic 1 / spec 041 (already landed — unified counts, paginated coach queue).

## Summary

Six independent-but-adjacent defects/gaps around one screen — `MistakeDetailScreen.jsx` — and its
surrounding navigation/render layer, unified under one theme: a mistake (blunder OR suboptimal) is
one concept with one detail screen, reachable and fully-informed whether entered in-app or opened
cold via permalink, with no internal token leaking into player-facing text, and a stable board while
reading the explanation. No new screens, no schema changes, no reason-engine changes — this is a
routing/rendering/labeling/query-shape feature layered on an already-correct data foundation (Epic 1).

Primary technical moves:
1. Extend `GET /api/blunders/:id` to also return the parent game's total move count and the full
   sibling-mistake set (so cold-boot pagination/"Move N/M"/"X of Y" are correct without an in-app nav
   list). Query the parent `games`/`papergames_games` row for `moves.length`, and the `blunders` table
   filtered by the same `game_id`/`papergames_game_id` for siblings. The one-line `papergames_game_id`
   `.select()` addition is promoted to Phase 1/Foundational (Decision 1, plan-review) so US1 remains
   independently shippable without depending on this story landing first.
2. Retire `mistakeDetail` (and `blunderDetail`, per US2.3) from the reload-redirects-home set where
   state is actually reconstructible from the URL — `mistakeDetail`'s only param is `category`, so it
   can be URL-encoded (`/mistakeDetail/:category`) instead of living in `SESSION_ONLY_SCREENS`.
3. Fix `handleBack` in `MistakeDetailScreen.jsx` so the game-reached trail is linear (mistake → game →
   past games → home) — while preserving the existing cold-boot-permalink → Home-in-one-press
   behavior (Edge Cases) — and confirm/repair the papergames dual-key (`papergames_game_id` vs
   `game_id`) chip-resolution path in `ReviewScreen.jsx`. Separately, `ReviewScreen.jsx`'s Prev/Next
   and move-timeline chips already navigate correctly to `blunderDetail` for non-optimal moves (via a
   fully-paged `gameBlunderList`) — this is *not* broken as the epic originally framed it. The real gap
   is narrower: `handlePrev`/`handleNext` step only through `mistakeIndices` (non-optimal moves) and are
   disabled outright when a game has zero mistakes (violating the spec's Edge Case, which requires
   Prev/Next to still step through *all* moves when there are no mistakes), and clicking an *optimal*
   move's chip is a no-op (`onClick={isOptimal ? undefined : ...}`) even though FR-014 requires every
   chip click to update the board. This requires ReviewScreen to gain a lightweight in-place preview
   mode: Prev/Next and chips step over ALL moves; a step landing on a non-optimal move keeps navigating
   to its permalink (unchanged, already-correct); a step landing on an optimal move instead updates a
   new local "preview" index and re-derives the on-screen board from a movestring prefix, rather than
   navigating anywhere. See `contracts/review-stepper-contract.md`.
4. Add one shared guard function (new module `server/reasonRenderGuard.mjs`) that strips
   `community-*` prefixes and raw `cXrY` tokens from generated prose, and separately sanitizes the
   `terms` response map's keys (the KB-term-popup leak vector, `KbTermPopup.jsx:52`). Per plan-review
   resolution, the "common seam" this is called from is **not** the three producer modules
   (`reasonEngine.mjs`/`explainContext.js`/`llmCoachHelpers.js` — a cache hit bypasses all three) but
   the **response/serialization boundary in `server/index.js`**: every `res.json(...)` call that emits
   player-facing explanation text or a `terms` map (both the cache-hit and freshly-generated branches of
   `/api/explain-move-llm` and `/api/explain-move`) passes its payload through the shared guard
   immediately before responding. This covers cached AND fresh text with one structural rule, which a
   producer-side call cannot (render-only, per reason-INVARIANTS I0–I2 — no engine/evidence change). A
   deploy task MUST `TRUNCATE explanation_cache` at ship time (spec-039 precedent) so pre-fix cached
   rows containing leaked tokens are not served stale by the new guard mistakenly believing old cache
   rows never need sanitizing (the guard runs at the boundary regardless, but truncating avoids serving
   stale untouched cache shapes during the deploy window).
5. Remove the debug legend (`sev:`/`tree:`/raw movestring) from `MistakeDetailScreen.jsx`.
6. Relabel "blunder(s)" → "mistake(s)" in user-facing copy/i18n only (wire field `blunder_count`
   stays); regression-audit that no endpoint filters `quality='blunder'`.
7. **Before US6 task-decomposition**: plumb pattern-detector cells into `GET /api/blunders/:id`'s
   response as a new additive, render-only, **pattern-agnostic** field, `patternCells: [{col, row}]`
   (0-indexed to match the existing `threat_cells` shape) — generalized (Decision 3, owner-raised
   during Q&A) from an earlier design that only covered `double_threat`, since the design otherwise
   ignored every other cell-naming pattern (`figure_7`, `j_shape`, `immediate_threat`, etc). The
   mechanism: look up `pattern_category` in the existing tag→detector map (`classifier.js:1536`) and, if
   mapped, run that pattern's detector — every detector shares the `{ matched, cells }` return shape —
   against the board state/perspective that tag requires (a per-pattern audit, tasks.md T049A,
   determines this; **non-obvious trap**: `immediate_threat`/`missed_own` must run on the **pre-move**
   `board_state`, never on the board after `correct_move`, or the detector reports a phantom cell one
   row up — forks such as `double_threat` keep the board-after-correct-move derivation). This is the
   structured data source FR-020/SC-008 need: `computeThreatCells` (index.js:114) computes the
   *opponent's* major threats on the board **after `move_played`** — not, e.g., the fork a `double_threat`
   mistake's blunderer *missed* creating. For `pattern_category === 'double_threat'` specifically, the
   two named fork cells are on the board **after `correct_move`**, from the blunderer's own perspective
   (mirroring classifier.js:1703's own `detectDoubleThreat(boardAfterCorrect, blunderer)` call) — a
   different board state and perspective than `computeThreatCells` uses, so it cannot be derived from
   that field and needs its own computation, reusing the production `detectDoubleThreat` detector
   directly (no reimplementation). Convert each detector's returned 1-indexed `"cXrY"` strings to
   `{col, row}` (0-indexed) for shape-consistency with `threat_cells`. Verify `double_threat`'s cells are
   non-empty and contain both named cells for the two Assumptions boards
   (`41442625312235115445550126400` → `c1r4`/`c4r3`; `3333364101252113121524` → `c5r3`/`c7r2`) through
   this production detector before any other US6 task starts — these remain the **only** solver-verified
   fixture boards; other pattern tags' board-state derivation is recorded by the audit but not asserted
   against a verified board unless one already exists. Per Decision A (plan-review), ALL highlights
   render from this and `threat_cells` alone — never parsed from prose — so the US2.5 prose guard
   rewriting `cXrY` → "column N" is harmless to the highlight (the row is dropped from prose only, never
   from the structured field). This computation must be applied to **both** independent blunder-response
   builders in `index.js` (the `:id` handler and the list/enriched-map builder at `~line 2560`, confirmed
   by direct read to construct its own shape and not delegate) — unconditionally, not gated behind a
   conditional check of whether the other handler "needs" it, since in-app navigation reaches the mistake
   through the second builder and must carry the same field the cold-boot path does.
8. Highlight every explanation-named cell using the structured fields above (`threat_cells` +
   `patternCells`, merged into the existing `userMajorThreats`/board-highlight channel — no new
   frontend prop needed, since `MistakeDetailScreen.jsx:84-85` already derives `userMajorThreats` from
   `blunder.threat_cells`); fix `SplitReveal`'s zoom-on-drag bug. This is **not a one-line bug** —
   `SplitReveal.jsx` computes the board's rendered `maxWidth` directly from `topPx`, which is itself
   `containerH * splitPct / 100` (`useDragSplit.js`), i.e. the board's zoom level is *by design* a
   function of the divider position; dragging the divider currently resizes the board to fit the pane on
   every pixel of drag. FR-022 requires the opposite (zoom must stay constant across the full drag
   range), which is a genuine design change: decouple `boardW` from `splitPct`/drag position entirely —
   recompute it only from `containerH` at mount and on a real container resize (window resize/rotation),
   frozen (via a ref) for the duration of any drag gesture, so the pane may crop/letterbox around a
   fixed-size board instead of scaling the board itself. See `contracts/split-reveal-zoom-contract.md`.
9. Cold-boot sibling stepping (US2.3/US2.4): Prev/Next navigation to a sibling in the cold-boot navList
   issues a **lazy per-sibling `GET /api/blunders/:id`** at the moment the player steps to it (each
   sibling is itself a permalink id in `siblingMistakes`, matching the existing single-item permalink
   model) — `siblingMistakes` itself stays lightweight (`{id, moveIndex, quality, resolved_at}`, no
   `board_state`), and the header facts "Move N/M" / "X of Y" (FR-008/FR-009) remain fully derivable from
   the enriched fields (`totalMoves`, `siblingMistakes.length`, position-in-array) without needing any
   sibling's `board_state` up front.

## Technical Context

**Language/Version**: JavaScript (ES modules), Node.js (server), React 18 (frontend, Vite)
**Primary Dependencies**: Express (server routes), Supabase JS client (service-role key), React + `react-i18next`, no router library (`react-router-dom` permanently absent per spec 011)
**Storage**: Supabase Postgres — `blunders`, `games`, `papergames_games` tables (no schema changes; read-only additive queries)
**Testing**: `node:test` + `node:assert/strict` (NOT Jest); `npm run test:fast` from `connect-four/` for CI-safe regression; manual QA in a real browser for UI/UX acceptance criteria (per Constitution III)
**Target Platform**: Web (mobile + desktop browser), Node.js server on Railway
**Project Type**: Web application — `connect-four/server/` (Express API) + `connect-four/src/` (React SPA)
**Performance Goals**: No change to Explanation Engine's <2s budget (Constitution V); this feature is render/routing/labeling, not new solver work
**Constraints**: No reason-engine weakening (reason-INVARIANTS I0–I2); no new client-side DB access (spec 030 — all data via `/api/*`); `react-router-dom` must not be reintroduced; `URL_MAP` is the sole URL↔screen mapping
**Scale/Scope**: 6 user stories, single screen + one endpoint + one navigation module + one render choke-point + one split-pane component; touches `MistakeDetailScreen.jsx`, `ReviewScreen.jsx`, `PastGamesListScreen.jsx`, `urlMapping.js`, `App.jsx`, `SplitReveal.jsx`/`DeepRevealPane.jsx`, `server/index.js` (`GET /api/blunders/:id`), `reasonEngine.mjs`, `explainContext.js`, `llmCoachHelpers.js`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Explanation Engine as Single Source of Truth** — PASS. This feature does not add a second
  explanation path; it removes leaked internal tokens from the *existing* engine's output at a single
  render choke-point (FR-019) and adds highlighting that mirrors already-computed `threat_cells` (plus
  the new additive, pattern-agnostic `patternCells` (Decision 3), sourced from the existing
  tag→detector map and production detectors, not a reimplementation) and correct-move data. No new
  evaluation logic.
- **II. Code Quality & Simplicity** — PASS, with an explicit constraint, reframed during plan review:
  US2.5's guard MUST be one shared function (`stripInternalTokens`), but its call site is the
  **response/serialization boundary in `server/index.js`** — the one seam every explanation, cached or
  fresh, must cross before reaching a client — not the three producer modules named in the original
  FR-019 draft (a cache hit runs none of those three, so a producer-side call would not be uniform).
  This is still a Constitution II requirement (no scattered special-casing): one function, one class of
  call site (response emission), not three per-producer patches.
- **III. Testing Standards** — PASS. Reason-render changes get an automated substring-absence test
  (`community-`, `cXrY`) per SC-005; navigation/stepper/split-pane changes (FR-012–014, FR-022) are
  UI-only and MUST be manually verified in a real browser per Constitution III (no solver dependency,
  but "UI features MUST be manually verified on the golden path and at least one edge case"). Two
  design tensions were resolved during planning rather than left as open questions (Constitution VI,
  "make load-bearing assumptions explicit"): (a) ReviewScreen's Prev/Next/chips must gain an in-place
  preview mode for optimal moves (see `contracts/review-stepper-contract.md`) — a real, if small,
  feature addition, not a bug patch; (b) SplitReveal's board-zoom-follows-divider-position is the
  component's existing *intended* mechanism, and FR-022 requires decoupling board size from drag
  position entirely (see `contracts/split-reveal-zoom-contract.md`), not a one-line fix.
- **IV. UX Consistency & Progressive Disclosure** — PASS. FR-001/FR-002 make severity a label/color
  variance only, preserving one consistent detail-screen structure across severities — directly
  satisfies "pattern labels... MUST use identical terminology" and progressive disclosure (Deep Reveal
  stays gesture-gated).
- **V. Performance** — PASS. No solver-path change; the new `GET /api/blunders/:id` query adds two
  bounded reads (one parent-game row, one sibling-`blunders` query), not a new solver call.
- **Principle VIII — Documentation**:
  - [x] `docs/architecture/api-conventions.md`, `frontend-conventions.md`, `server-conventions.md`,
    `reason-INVARIANTS.md`, `reason-render-grounded-prompt.md` read before this plan was drafted.
  - [x] One undocumented-but-load-bearing fact found during review, now carried into this plan: the
    cold-boot `GET /api/blunders/:id` response shape omits `papergames_game_id` from its `.select()` —
    this silently breaks "Start new game from here" on cold-opened papergames permalinks today (not
    previously documented as a known bug; see research.md §"Papergames cold-boot gap").
  - [x] tasks.md (next command) will include a documentation task updating `api-conventions.md`'s
    `GET /api/blunders/:id` shape once the response is extended (parent move count + siblings +
    `patternCells`), and updating `frontend-conventions.md`'s `SESSION_ONLY_SCREENS` description
    once `mistakeDetail` is removed from that set.
  - [x] tasks.md (next command) will include a **deploy task**: `TRUNCATE explanation_cache` before this
    feature ships (spec-039 precedent), so no pre-fix cached row (potentially containing an unsanitized
    `community-`/`cXrY` token or an unsanitized `terms` key) is ever served once the guard is live —
    required because the guard's move to the response boundary (item 4 above) makes this the one
    deploy-time step that fully realizes FR-019's "no generation path can bypass it" for already-cached
    rows.

No violations requiring Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/042-mistake-review-unification/
├── plan.md              # This file
├── research.md           # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   ├── api-blunders-id.md              # Extended GET /api/blunders/:id contract
│   ├── review-stepper-contract.md      # Prev/Next/chip in-place-preview behavior (US2.4)
│   └── split-reveal-zoom-contract.md   # board-size-freeze mechanism (US2.6)
└── tasks.md              # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
connect-four/
├── server/
│   ├── index.js                       # GET /api/blunders/:id (extend + patternCells; applied to
│   │                                   #   res.json() response boundaries for explanation text/terms
│   │                                   #   (US2.5 — call shared guard here, not per-producer),
│   │                                   #   route registration
│   ├── classifier.js                  # US2.6 — detectDoubleThreat (line ~1328), consumed read-only by
│   │                                   #   index.js's new patternCells computation; NOT modified
│   └── reasonRenderGuard.mjs          # NEW — single shared strip-internal-tokens(+terms-key) function,
│                                       #   called from index.js's response boundary
├── src/
│   ├── lib/
│   │   └── urlMapping.js              # US2.3 — /mistakeDetail/:category pattern + un-session-only
│   ├── App.jsx                        # US2.3 — cold-boot fetch wiring for mistakeDetail if needed
│   ├── screens/
│   │   ├── MistakeDetailScreen.jsx    # US2.1/US2.3/US2.4/US2.5/US2.6 — primary target
│   │   ├── ReviewScreen.jsx           # US2.4 — stepper/chip board-driving, papergames chip resolution
│   │   └── PastGamesListScreen.jsx    # US2.2 — "mistake(s)" label copy
│   ├── components/
│   │   ├── DeepRevealPane.jsx         # US2.6 — highlight wiring
│   │   └── SplitReveal.jsx            # US2.6 — zoom-stability fix (freeze boardW)
│   └── lib/
│       └── useDragSplit.js            # US2.6 — expose containerH/initialSplitPct for the freeze calc
├── docs/architecture/
│   ├── api-conventions.md             # doc update: GET /api/blunders/:id extended shape
│   └── frontend-conventions.md        # doc update: SESSION_ONLY_SCREENS membership change
└── tests/
    ├── integration/                   # HTTP-level: cold-boot permalink, reload survival
    └── unit/ or blunder/              # render-guard substring test, nav-trail test
```

**Structure Decision**: Existing single web-app layout (`connect-four/server` + `connect-four/src`),
no new top-level directories. All changes are localized edits to existing files plus one new small
server module (`reasonRenderGuard.mjs`) for the shared guard (FR-019's structural requirement).

## Complexity Tracking

No Constitution Check violations. (Table omitted — nothing to justify.)
