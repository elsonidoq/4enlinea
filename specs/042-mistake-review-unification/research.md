# Phase 0 Research — Mistake Review Unification & Deep-Reveal Overhaul

All Technical Context fields were resolvable directly from the existing codebase/docs — no
NEEDS CLARIFICATION markers remain. This document instead resolves the plan-step obligations from
the epic handoff: re-verifying the 4 spec-037 QA bugs against current code, the `/api/blunders/:id`
extension shape, and the SC-002 fixture. Findings below are from direct code inspection on
2026-07-08, not from memory.

## 1. Spec-037 QA bugs — current-code re-verification

The epic's "already shipped, do not re-do" claims are about a **different, earlier** pair of items
than the memory file's "4 open QA bugs (2026-06-17)" list — re-verified separately below.

### 1a. Epic's two "already shipped" claims — CONFIRMED, still true

- **`src/lib/urlMapping.js:22`** — `{ pattern: '/blunder/:id', screenKey: 'blunderDetail', ... }` is
  the only `blunder`-prefixed entry in `URL_MAP`; no bare `/blunder` entry exists. Confirmed exactly
  as claimed.
- **`is_owner !== false` gate** — confirmed at `src/screens/MistakeDetailScreen.jsx:441`:
  `{session && blunder.is_owner !== false && ( ... "Mark as reviewed" ... )}`. Do not simplify to
  `blunder.is_owner` (an `undefined` in-app value must still show the button).

**Decision**: No work needed on these two — carry forward as already-done, confirmed by direct read.

### 1b. Memory's "4 open QA bugs (2026-06-17)" — STATUS per item

The memory file is 5+ days stale relative to this session; each claim was re-checked against current
line numbers:

1. **"ReviewScreen chip floats above coach"** (z-order/opacity bleed-through) — NOT independently
   re-verified this session (visual/CSS bug, out of grep-able scope); treat as **still open** unless
   a future task finds it fixed. Not blocking for planning; add as a US2.4/US2.6 polish task only if
   still reproducible when implementation starts.
2. **"Blunder click in ReviewScreen goes to `/explorer`"** — the `/explorer` route/screen no longer
   exists at all (`rg -i explorer src/` finds nothing — Explorer was deleted per
   `project_suboptimal_blunder_unification`). The **underlying root cause** (papergames blunders keyed
   on `papergames_game_id`, not `game_id`, and `GET /api/coach/queue?game_id=<papergames_id>` matching
   zero rows) is the real, still-relevant risk for FR-015 — verify `ReviewScreen.jsx`'s chip→blunder
   map building logic against both `game_id` and `papergames_game_id` when implementation starts.
3. **"MistakeDetailScreen chip is below the board"** — layout-only, not independently re-verified;
   same treatment as #1.
4. **"Coach doesn't say what color the user played"** — **FIXED.** `MistakeDetailScreen.jsx:218-227`
   (`isGreenPlayer` derived from `board_state.length % 2`, `disc`/`discLabel` passed into
   `coachMessages`) already implements this exactly as the memory's proposed fix describes.

**Decision**: Item 4 is done — no task needed. Items 1–3 are CSS/z-order/click-routing items outside
this spec's FR list (spec 042 does not mention chip z-order or click-target routing as a defect) —
**out of scope for spec 042**; note as a residual finding for a future polish pass, not a planning
blocker. The load-bearing part of item 2 (papergames dual-key resolution) IS in scope, via FR-015.

### 1c. Spec's OWN claimed-still-open bugs (User Story 2 / QA:major E, I) — CONFIRMED OPEN

These are NOT claimed fixed by the epic and were independently re-verified as still broken:

- **QA:major I (`/mistakeDetail` reload → Home)**: `src/lib/urlMapping.js:33` —
  `SESSION_ONLY_SCREENS = new Set(['summary', 'mistakeDetail', 'game'])`. `src/App.jsx:19-31` (mount
  effect) and `:34-57` (popstate handler) both resolve any `SESSION_ONLY_SCREENS` member straight to
  `'home'` on cold load / history navigation. Confirmed: reloading `/mistakeDetail` redirects home.
  Root cause is structural (the screen key carries no URL param at all today — `URL_MAP:21` has
  `{ pattern: '/mistakeDetail', paramNames: [] }`), not a null-check bug.
- **QA:major E (cold-load `/blunder/:id` shows "Move N / 1", "1 of 1")**: confirmed at
  `MistakeDetailScreen.jsx:39-53` (cold-boot effect constructs `coldNavList = [data]`, a **single-item
  array**) and `:169-175` (fallback `metaContent` branch, used when `mistakeSource` is absent — which
  it always is on cold boot — renders `Move ${displayMoveNumber} / ${blunders.length}`, and
  `blunders.length` is 1 for a single-item cold-boot array). The Toolbar's `${index + 1} of
  ${blunders.length}` (line 524) shows "1 of 1" for the same reason. "Start new game from here"
  (line 370) DOES render on cold boot when `blunder.game_id` is present — but **not** when the
  mistake belongs to a papergames game, because `GET /api/blunders/:id`'s `.select()` (see §2) omits
  `papergames_game_id` entirely, so `blunder.papergames_game_id` is always `undefined` in the
  cold-boot payload even for a papergames-owned mistake. This is a previously-undocumented instance of
  the same root defect QA:major E names (missing data on the cold-boot object) and must be fixed by
  the same endpoint change in §2 (add `papergames_game_id` to the `.select()`).

**Decision**: Both are real, unfixed, and are what US2.3 targets. The endpoint extension in §2 below
fixes all three surfacing symptoms (Move N/M, X of Y, and the papergames start-from-here gap) with a
single change, because they share one root cause: the cold-boot single-item array has no visibility
into the parent game or sibling mistakes.

## 2. `GET /api/blunders/:id` — current shape and required extension

**Current handler** (`connect-four/server/index.js:2586-2615`):

```js
app.get('/api/blunders/:id', async (req, res) => {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) return res.status(400).json({ error: 'invalid id' });
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  const { data, error } = await supabase
    .from('blunders')
    .select('id, board_state, move_played, correct_move, pattern_category, quality, created_at, resolved_at, severity, blunder_severity, game_id, user_id')
    .eq('id', id)
    .single();
  // ... 404/500 handling ...
  const is_owner = req.user?.id != null && req.user.id === data.user_id;
  const moveIndex = (data.board_state || '').length;
  const threat_cells = computeThreatCells(data.board_state, data.move_played);
  const { user_id: _omit, ...blunderPublic } = data;
  res.json({ ...blunderPublic, moveIndex, threat_cells, is_owner });
});
```

**Confirmed gaps**:
- `.select()` omits `papergames_game_id` (only `game_id` is selected) — the response can never carry
  a papergames link, breaking "Start new game from here" and any papergames sibling lookup on cold
  boot.
- No query touches the parent game row (`games` or `papergames_games`) at all — no total move count.
- No query touches sibling `blunders` rows for the same parent game — no "X of Y".

**Relevant schema** (`docs/architecture/db-schema.md`):
- `games.moves` (text, NOT NULL) — the movestring; `moves.length` = total ply count = total move
  count for that game.
- `papergames_games.moves` (text, NOT NULL) — same semantics for imported games.
- `blunders.game_id` (uuid, nullable, FK → `games.id`) and `blunders.papergames_game_id` (uuid,
  nullable, FK → `papergames_games.id`) — exactly one is set per row (mutually exclusive by game
  source).

**Decision — extension shape** (full contract in `contracts/api-blunders-id.md`):

**Revised (critique blocking issue #3 / Decision 1)**: step 1 below (`papergames_game_id` in the
`.select()`) is promoted out of this story into Phase 1/Foundational. Without it, US1's own test (T003)
would assert a field (`papergames_game_id`) that this endpoint doesn't yet return for a papergames
fixture row until US2 lands — undermining US1's claimed independent-shippability. Promoting this
one-line change makes US1 genuinely independent and unblocks US6 as well; every other field below
(`totalMoves`, `siblingMistakes`, `patternCells`) stays scoped to its own story (US2/US6).

1. Add `papergames_game_id` to the initial `.select()` (Phase 1, per Decision 1 — not gated behind US2).
2. After fetching the blunder row, branch on which FK is set:
   - If `game_id` is set: `SELECT moves FROM games WHERE id = game_id` → `totalMoves = moves.length`.
   - If `papergames_game_id` is set: `SELECT moves FROM papergames_games WHERE id =
     papergames_game_id` → `totalMoves = moves.length`.
   - If neither is set (should not happen for a real blunder row, but defensively): `totalMoves =
     null`, and the client falls back to its current `blunders.length` behavior (unchanged for that
     edge case — no regression).
3. Query the sibling set: `SELECT id, move_index, quality, resolved_at FROM blunders WHERE game_id =
   :game_id` (or `papergames_game_id = :papergames_game_id`, matching whichever FK was set) `ORDER BY
   move_index ASC`. **No `user_id` filter** — this preserves the endpoint's existing "public permalink,
   no ownership filter" contract (FR-017 of spec 037 / `reference` above); a permalink visitor sees the
   same sibling set the owner would.
4. Response adds two new top-level fields: `totalMoves: number | null` and `siblingMistakes: [{ id,
   moveIndex, quality, resolved_at }]` (the full ordered sibling list, including the current row, so
   the client can compute both "X of Y" and construct a real multi-item cold-boot `navList` — turning
   every cold-boot permalink into a first-class stepper session, not a dead-end single-item list).
5. This is two additional bounded reads (by primary key / indexed FK), not a solver call, and not a
   new endpoint — additive fields on an existing response satisfy `api-conventions.md`'s "MUST" that
   pagination/response-shape changes be additive, and require no new route registration ordering
   concern (this is a `:id` leaf route, not a literal-vs-`:id` collision).

**Rejected alternative**: A separate `GET /api/blunders/:id/context` endpoint. Rejected because the
client needs all three facts (own data, total moves, siblings) in one render pass to avoid a
request waterfall on cold boot (which would show a second loading flash); one enriched response is
simpler and the endpoint is already public/uncached, so there's no cache-invalidation reason to
split it.

## 3. SC-002 fixture — real stored game, verified via live DB query

**Decision**: Use papergames game `40fe793a-aa39-429d-8ef4-4e43192cc4db` (owned by user
`d2752b6b-4b9e-450b-8242-bcb10a3900ed`), queried directly from the production Supabase instance
(read-only `SELECT`, no schema/data changes) via the connection recipe in memory
`reference_supabase_connection.md`. It satisfies every SC-002 condition:

- **Known total move count**: `papergames_games.moves.length` = **41**.
- **≥ 2 mistakes, mixed quality**: 4 rows in `blunders` where `papergames_game_id =
  '40fe793a-aa39-429d-8ef4-4e43192cc4db'`:

  | blunder id | move_index | quality |
  |---|---|---|
  | `52a28158-8603-4ccf-89f4-b9a73b2910f3` | 18 | blunder |
  | `33f1e7b8-7922-4cfb-a7de-61a44a261a6d` | 28 | suboptimal |
  | `29ec665b-0787-416f-9cb8-690ec127a346` | 16 | suboptimal |
  | `2963acad-45e7-4deb-bbb0-2de3726eb8c0` | 32 | suboptimal |

  Sorted by `move_index`, this game's mistakes are ordered 16 → 18 → 28 → 32, so "X of Y" is
  genuinely non-trivial (e.g. the move-16 mistake is "1 of 4", not "1 of 1").

**Test usage**: Any of the four blunder ids above may be opened directly at `/blunder/<id>` (cold
boot, no in-app nav) to exercise SC-002/FR-008/FR-009 acceptance: expected "Move 19 / 41" for the
`severity` row at `move_index: 18` (1-indexed display = `moveIndex + 1`), and "2 of 4" (its position
in the move_index-sorted sibling list). This is a real, already-stored game and remains the fixture for
**manual quickstart.md walkthroughs** (T009/T022/T058) — no seed script is needed there.

**Revised (critique blocking issue #1)**: this repo's automated integration tests are hermetic —
every existing integration test uses a mock-stubbed Supabase client with no real DB (confirmed at
`tests/integration/challenge-progress.test.js`, whose header states "Tests the HTTP handler logic with
mock supabase stubs — no real DB"). Automated tests (T010, T023, T024, T041, T050) MUST follow this
same convention: hardcode the four rows' values above (id/move_index/quality; `totalMoves: 41`) as
inline stub fixtures wired through a mocked `supabase.from(...).select(...).eq(...).single()`/`.order(...)`
chain, not a live query against production Supabase. The real game `40fe793a-…` is used **only** in the
manual quickstart walkthroughs, never in `npm run test:fast`.

## 4. `mistakeDetail` reload survival — chosen approach

**Decision**: URL param, not opaque state-recovery. `mistakeDetail`'s only prop dependency beyond
`go`/`goBack` is `category` (a `VALID_BLUNDER_TAGS` slug — plain, URL-safe, already round-tripped
through `go('mistakeDetail', { category: cat.category })` at `CategoryListScreen.jsx:146`). Add
`{ pattern: '/mistakeDetail/:category', screenKey: 'mistakeDetail', paramNames: ['category'] }` to
`URL_MAP` (ordered before the existing bare `/mistakeDetail` entry, or replacing it outright — the
screen has no meaningful zero-category state, matching the `URL_MAP` "replace, not add" precedent
from spec 037), and remove `'mistakeDetail'` from `SESSION_ONLY_SCREENS`. A cold load of
`/mistakeDetail/<category>` then resolves directly via `parseUrl` with no fetch-on-mount needed
(unlike `blunderDetail`'s pattern, which needs a fetch because its full item set can't fit in the
URL) — `MistakesListScreen` already fetches its own per-category list from `category` alone.
**Rejected**: sessionStorage/history-state recovery — rejected because a URL param is strictly
simpler, is the pattern the codebase already uses for `clchallenge`/`concept`/`socratic`, and makes
the URL itself shareable (consistent with this epic's permalink theme), whereas state-recovery would
still break on a truly cold tab.

## 5. Shared render-guard seam — where FR-019 hooks in

**Revised during plan review (blocking issue #2).** The producer-seam approach below (three call
sites in `reasonEngine.mjs`/`explainContext.js`/`llmCoachHelpers.js`) was the original Phase-0
proposal but is **rejected**: `server/index.js` serves explanations from `explanation_cache` on a
cache hit (confirmed at `index.js:1005` — the early-return branch of `/api/explain-move-llm` before
`computeMechanism` runs at all — and the equivalent cache-hit branch of `/api/explain-move`) — a path
that calls **none** of the three producer modules. A guard placed only in those three modules is
provably bypassed by the most common production path (a cache hit), which literally violates FR-019's
"no generation path can bypass it."

**Decision (revised)**: New module `server/reasonRenderGuard.mjs` exporting two functions:
- `stripInternalTokens(text) -> string` — (a) strips a `community-`/`allen-` prefix from any detected
  KB-slug-shaped token before it reaches prose, (b) rewrites raw `cXrY` tokens to plain "column N"
  (1-based from the 0-indexed internal column) wherever they appear in prose. Per Decision A
  (plan-review), the row is deliberately dropped here — highlights never come from parsing this
  string; they come solely from the structured `threat_cells`/`patternCells` fields (§9 below), so
  this text-only rewrite is harmless to FR-020.
- `sanitizeTermsMap(terms) -> object` — per Decision B (plan-review), rewrites each key of the `terms`
  response map through the same `community-`/`allen-`-stripping rule, so a raw KB-slug id can never
  reach `KbTermPopup.jsx:52`'s `displayName ?? kbId` fallback and render as the popup title, even if an
  LLM emits `[term:community-z-threat]` instead of the instructed `[term:z_threat]`.

Both functions are called at the **response/serialization boundary in `server/index.js`** —
immediately before every `res.json(...)` that emits explanation text or a `terms` map — not inside the
three producer modules. Concretely, this covers (both cache-hit and freshly-generated branches):
`/api/explain-move-llm`'s cache-hit early return (`index.js:~1005`) and its fresh-generation response
(`index.js:~1088`); `/api/explain-move`'s cache-hit and fresh branches (`index.js:~961`). This is a
strictly stronger reading of FR-019's "common seam" requirement than the original per-producer plan:
regardless of which internal module computed the text (`computeMechanism`/`mechanismExplainer.mjs`,
`explainContext.js`, `llmCoachHelpers.js`, or a cache row written before any of them ran), every byte
that reaches a client crosses this one boundary. Per reason-INVARIANTS I0–I2, this remains render-only
— it operates on the final natural-language string and the `terms` map, never on the feature vector or
its solver-grounded fields, so it cannot weaken engine correctness.

**Deploy requirement**: `TRUNCATE explanation_cache` before this ships (spec-039 precedent) — the
boundary guard sanitizes every row served *after* deploy regardless of when it was cached, but
truncating avoids any window where an old, unsanitized cache row is read and served without ever
passing back through a fresh `res.json()` call this session (defense in depth, not strictly required
for correctness once the boundary guard is in place, but consistent with the spec-039 precedent for
guard-behavior changes to cached content).

## 6. `ReviewScreen.jsx` stepper — actual current behavior vs FR-013/014/Edge-Cases (direct code read)

The epic frames QA:major D as "stepper doesn't drive the board; chips don't navigate" — this is
**not** what the current code does. Read in full (`src/screens/ReviewScreen.jsx`):

- `mistakeIndices` (lines 150-152) = `analysis.moves.filter(m => m.quality !== 'optimal').map(m =>
  m.moveIndex)` — **only** non-optimal move indices.
- `handlePrev`/`handleNext` (lines 172-184) step `selectedMistakeIdx` through `mistakeIndices` and call
  `navigateToMistake`, which (lines 154-170) **does** correctly resolve the target row via the
  fully-paged `gameBlunderList` (matched on `board_state.length === globalPlyIndex`) and **does**
  navigate to `blunderDetail` with the right `navList`/`index`/`mistakeSource` — already working, for
  non-optimal moves, including for papergames-sourced games (the `queueParam` ternary at
  `data.source === 'papergames'`, lines 132-134, already branches correctly).
- The move-timeline chips (lines 333-364, one circle per `analysis.moves` entry) have
  `onClick={isOptimal ? undefined : () => navigateToMistake(move.moveIndex)}` — **clicking an optimal
  move's chip is a no-op today.**
- `frozenBoard` (lines 189-193) is **always** built from `analysis.fullMovestring` (the final position)
  and **never changes** with `selectedMistakeIdx` — ReviewScreen's own board never re-renders per step;
  the only thing that currently changes visibly per step is the destination screen you navigate to
  (for non-optimal moves only).

**Real gaps against the spec** (not what the epic described, but genuine):
1. Edge Case: "when the review stepper is opened on a game with zero mistakes, Prev/Next and chips
   still function for stepping through the board's optimal moves" — today, `mistakeIndices.length ===
   0` disables Prev/Next entirely (the `disabled` prop guards on this), so a zero-mistake game has a
   fully inert stepper. Fails the Edge Case as written.
2. FR-014 "a chip MUST change the board when clicked... whether that chip is optimal or not" (spec
   Acceptance Scenario 3's "when they click any chip, then the board updates") — an optimal-move chip
   click is currently a true no-op (`onClick={undefined}`).

**Decision — in-place preview mode** (contract: `contracts/review-stepper-contract.md`):
Change `ReviewScreen` to step over **all** of `analysis.moves`, not just non-optimal ones. On selecting
a step: if that move's `quality !== 'optimal'`, behavior is unchanged (`navigateToMistake`, i.e. jump to
the permalink — already correct, do not touch). If the move IS optimal, instead of a no-op, update a
new local `previewMoveIndex` state and re-derive the on-screen board from
`buildBoard(analysis.fullMovestring.slice(0, previewMoveIndex))` — i.e. ReviewScreen's own frozen board
becomes steppable in place for the moves that have nowhere else to navigate to. This is additive to the
existing component (new state + a conditional inside the existing step handlers), not a rewrite, and it
reuses the existing `buildBoard` import already present in the file.

**Rejected alternative**: making every chip (optimal included) navigate somewhere (e.g. a synthetic
per-move detail view). Rejected because the spec's Key Entities section only defines a "Mistake" detail
screen — there is no product concept of an optimal-move detail screen, and Assumptions/Out-of-Scope
give no indication one should be invented. In-place board preview satisfies "the board updates" (FR-013,
FR-014, SC-004, the Edge Case) without inventing a new screen.

## 7. `SplitReveal`/`useDragSplit` zoom bug — root cause (direct code read, not previously analyzed)

`src/components/SplitReveal.jsx` (lines 45-52):
```js
const targetH = topPx ? topPx - 32 : 0;
const boardW = targetH > 57 ? (7 * (targetH - 57)) / 6 + 64 : 0;
const constrain = boardW >= 200;
// ...maxWidth: constrain ? boardW : undefined
```
`src/lib/useDragSplit.js` (line 140): `topPx = containerH > 0 ? (containerH * splitPct / 100) : null`,
and `splitPct` is the **live value being changed by the pointer-drag handler** (`handleMove`, lines
52-66) on every `pointermove` event during a drag.

**This means the board's rendered width is, by explicit design, a continuous function of the divider's
current drag position** — the component's whole point today is "the board shrinks/grows to fit
whatever pane height the user drags to." FR-022 ("dragging the divider between the board and the
explanation panel MUST NOT cause the board's zoom level to change") is therefore not a small
regression fix; it asks for the *opposite* of the component's current contract. Root cause of the
`new_TODOs #7`/QA:minor "un-zooms when dragged too high" complaint: it's not a glitch at the top of the
range, it's the intended behavior at *every* point in the range, which reads as jarring/unwanted because
users expect the board's zoom to be stable while they merely resize how much of the explanation is
visible.

**Decision — decouple board size from drag position** (contract:
`contracts/split-reveal-zoom-contract.md`): Freeze `boardW` so it is recomputed only when `containerH`
changes for a reason *other* than an active drag (mount, window resize, orientation change) — e.g.
compute it once from `initialSplitPct` (the pane height the panel opens at, before any drag), store it
in a ref, and never recompute it inside `handleMove`/while `isDragging` is true. The top pane keeps its
existing `flex: 0 0 ${topPx}px` sizing (so the *pane* still resizes with the drag, exactly as today),
but the *board inside it* stops resizing — it renders at its frozen width and the pane simply
crops/letterboxes around it (centered, via the existing `margin: '0 auto'`) if the pane becomes smaller
than the board's frozen width, or leaves whitespace if the pane becomes larger. This satisfies FR-022
literally (dragging never changes board zoom) while preserving the original "board fits the panel at
open time / on real resize" sizing behavior users get without ever touching the divider.

**Rejected alternative**: clamping `boardW` to a fixed min/max range instead of fully freezing it.
Rejected because FR-022's acceptance bar ("the board's zoom stays stable and independent of the divider
position," SC-009: "across the FULL range of the split-divider drag... stays constant") is explicit that
zoom must not change *at all* during a drag, not merely stay within a smaller band — a clamped-but-still
reactive value would still visibly jump near the clamp boundaries.

## 8. `community-`/`allen-` prefix leak — audit findings (partial root-cause, deeper than plan.md's one-liner)

Investigated across both text-producing pipelines named in FR-019:

- **`/api/explain-move-llm` path** (`server/explainContext.js`, KB-term-section builder, ~lines
  760-789): already deliberately avoids embedding the raw `community-*`/`allen-*` id in the LLM prompt —
  it uses `patternKey` (e.g. `z_threat`) as the `[term:...]` tag id, with an explicit code comment
  warning "KB article slugs with provenance prefixes (community-/allen-) must not appear in the prompt —
  the LLM copies them verbatim into its output." This suggests the leak, if reproducible today, is NOT
  in this prompt-construction step.
- **`terms` map assembly** (`server/index.js` ~lines 1057-1068): keys `termsMap` by whatever string
  appears inside `[term:...]` tags in the **LLM's own output** — if the model ever emits
  `[term:community-z-threat]` instead of the instructed `[term:z_threat]` (a plausible LLM non-
  compliance, not something the prompt can fully guarantee against), the raw community- string would
  reach the client verbatim in the `terms` response field.
- **`src/components/KbTermPopup.jsx:52`**: `const displayName = entry?.displayName ?? kbId;` — if a
  `kbId` reaching the client has no matching entry in `src/lib/kbTermLesson.js`, the raw id string
  renders as the popup title. Current count: 18 `displayName` entries vs. ≥15 `community-`/`allen-`
  ids in `llmCoachHelpers.js`'s `PATTERN_KB` — likely fully covered today for the explain-move-llm path,
  but this is a fragile invariant (a new `PATTERN_KB` entry without a matching `kbTermLesson.js` entry
  reintroduces the leak silently) worth hardening via the shared guard rather than trusting the count to
  stay in sync by convention.
- **Reason-engine mechanism pipeline** (`server/scripts/reason_engine/`, `docs/architecture/reason-
  render-grounded-prompt.md`'s D34 "mechanism is the ONLY player-facing field" contract): this is a
  **separate** code path from `explainContext.js`/`explain-move-llm` and was NOT verified to be free of
  the same leak class — it has its own KB-term / causal-link phrasing (`causalLinks.mjs`'s `TAG_PHRASE`/
  `plainTag` mapping per D34) that has not been checked against `community-`/`allen-` tokens.

**Decision**: FR-019's shared guard (`stripInternalTokens` + `sanitizeTermsMap`, §5 above, revised
during plan review to sit at the response boundary rather than at three producer call sites) is
written as a defensive last-mile filter precisely *because* the leak site cannot be fully pinned down
to one place ahead of time — it strips any `community-[\w-]+`/`allen-[\w-]+`-shaped token and raw
`cXrY` token from the final outbound text, and sanitizes `terms` map keys the same way, at the single
response-boundary seam (covering every pipeline that ends in a `res.json()` in `index.js`, cached or
fresh), rather than trusting that each upstream template avoids emitting them. tasks.md should include
an explicit audit task (grep + a small generation smoke-test across a handful of `pattern_category`
values through BOTH pipelines) to confirm the guard actually catches a real instance before declaring
SC-005 satisfied — a guard that never fires because the leak was already fixed elsewhere is not the
same as a verified fix.

## 9. FR-020/SC-008 structured highlight source — `patternCells` plumbing (resolves blocking issue #1; generalized per Decision 3)

**Problem** (found during plan review): the plan asserted the deep-reveal highlight "reuses
already-computed `threat_cells`" (data-model.md's original "Explanation" entry), but `threat_cells`
comes from `computeThreatCells(board_state, move_played)` (`index.js:114`), which builds the board
**after `move_played`** and returns the **opponent's** major threats on that resulting board. For a
`pattern_category === 'double_threat'` mistake, the two cells SC-008 names are the fork the blunderer
*missed creating* — those live on the board **after `correct_move`**, evaluated from the **blunderer's
own** perspective, exactly mirroring the production classifier's own check at `classifier.js:1703`:
`detectDoubleThreat(boardAfterCorrect, blunderer)`. This is a different board state and a different
perspective than `computeThreatCells` computes, so the fork cells are not currently present in any
field the client receives — a genuine gap, not a wiring oversight.

**Decision (revised, Decision 3 — owner-raised during Q&A)**: the original design below plumbed only
`double_threat`'s fork cells; the owner flagged this as over-focused on one pattern while
`figure_7`/`j_shape`/other cell-naming patterns were ignored. Generalized to one pattern-agnostic
mechanism: add a new computation in `index.js` (alongside `computeThreatCells`, in the same
`GET /api/blunders/:id` handler AND its list-variant at `index.js:~2560` — confirmed by direct read to
be a second, independent response-shape builder that does not delegate to the `:id` handler, so the
addition must be made in both places, unconditionally):
```js
let patternCells = [];
const detectorEntry = PATTERN_TAG_TO_DETECTOR[data.pattern_category]; // per-tag board-state table, T049A
if (detectorEntry) {
  const { board, perspective } = detectorEntry.boardInput(data); // e.g. board-after-correct-move for double_threat
  const result = detectorEntry.detect(board, perspective);
  patternCells = result.matched
    ? result.cells.map(parseCxRy) // "c1r4" (1-indexed) -> { col: 0, row: 3 } (0-indexed)
    : [];
}
```
For `pattern_category === 'double_threat'` specifically, `boardInput` resolves to:
```js
const boardAfterCorrect = new Board(data.board_state + String(data.correct_move));
const blunderer = new Board(data.board_state).currentPlayer;
// detect: (board, perspective) => detectDoubleThreat(board, perspective)
```
reusing the **production** `detectDoubleThreat` from `classifier.js:1328` directly (no reimplementation
— per reason-INVARIANTS I0, correctness over optimization, and I12, validate through the production
detector) — and analogously for other mapped tags (`figure_7`/`j_shape`/etc. at `classifier.js:934`/
`:970`, all sharing the same `{ matched, cells }` shape). Detector `cells` are returned as 1-indexed
`"cXrY"` strings (`classifier.js`'s own `c${col+1}r${board.colHeights[col]+1}` construction); convert to
`{col, row}` 0-indexed objects to match `threat_cells`'s existing shape. Neither the detector import(s)
nor a `parseCxRy` parser exist in `index.js`/anywhere in the repo today — both must be authored.
**Non-obvious trap** (project memory, immediate_threat phantom-cell case): `immediate_threat`/
`missed_own` must run their detector on the **pre-move** `board_state`, never on the board after
`correct_move` — the wrong board state produces a phantom cell one row up. `double_threat` and other
fork-shaped patterns keep the board-after-correct-move derivation. The per-tag board-state mapping is
recorded by an explicit audit task (tasks.md T049A) before being trusted for any tag beyond
`double_threat`.

**New response field**: `patternCells: [{col, row}]` on `GET /api/blunders/:id` (and the list-variant
builder) — empty array/absent when `pattern_category` has no detector mapping, the detector doesn't
match, or the detector legitimately returns no cells (e.g. score-consuming/solver-based detectors, no
special-casing per tag) — additive, render-only, alongside the existing `threat_cells`. See updated
`contracts/api-blunders-id.md` and `data-model.md`.

**Client wiring**: no new prop is needed. `MistakeDetailScreen.jsx:84-85` already derives
`userMajorThreats` (fed into `AnnotatedExplanation` for the board-highlight channel) from
`blunder.threat_cells`; extend that same derivation to merge in `blunder.patternCells`, so both
sources land in the one existing highlight channel and render in the existing player-color convention
(FR-021) with no new rendering path.

**Verification requirement (sequenced before US6 task-decomposition)**: run the `double_threat`
computation against the two Assumptions boards through the production `detectDoubleThreat` (not a
hand-derived prediction) and confirm the resulting `patternCells` contains both named cells before any
US6 task begins — these remain the **only** solver-verified fixture boards for this feature:
- `41442625312235115445550126400` (first-player fork) → expect `c1r4`/`c4r3` → `{col:0,row:3}`/`{col:3,row:2}`.
- `3333364101252113121524` (second-player fork) → expect `c5r3`/`c7r2` → `{col:4,row:2}`/`{col:6,row:1}`.

Separately, an audit task (T049A) determines — but does not necessarily solver-verify — the correct
board-state input for every other mapped pattern tag (`figure_7`, `j_shape`, `immediate_threat`,
`forced_block`, `forbidden_columns`, `z_threat`, `odd_even_threat`, `undercut`, `overcut`,
`major_threat_parity`, `major_threat_nonparity`, `minor_threat`, `claimeven` — the full registry at
`classifier.js:1536`).

**Decision A confirmed** (plan-review): prose rewrites `cXrY` → "column N" (row dropped, §5); ALL
highlights — for `double_threat` mistakes and every other pattern — derive solely from
`threat_cells`/`patternCells`, never from parsing rendered text. This makes the US2.5 prose
rewrite (which loses the row) harmless to FR-020/SC-008.

## 10. Cold-boot sibling stepping — fetch strategy (resolves blocking issue #3)

**Problem** (found during plan review): `siblingMistakes` (§2 above) carries only `{id, moveIndex,
quality, resolved_at}` — no `board_state`/`move_played`/`correct_move`. If a player cold-opens a
permalink and clicks Prev/Next to step to a sibling, the client has no board to render for that
sibling and `doStartFromHere` (`MistakeDetailScreen.jsx:118`) has no `board_state` to act on — the
"first-class stepper session" §2 promises would be a dead end in practice, contradicting its own goal.

**Decision**: Stepping issues a **lazy per-sibling `GET /api/blunders/:id`** at the moment of
navigation (Prev/Next/chip click within the cold-boot navList) — each sibling id in
`siblingMistakes[i].id` is itself a valid permalink id, so "step to sibling `i`" is implemented as
"navigate to (or fetch data for) `/blunder/:id` for that id," reusing the exact same endpoint and data
shape the initial cold-boot load already used, rather than inventing a bulk-fetch or an eager
prefetch-all-siblings variant. This matches the existing single-item permalink model exactly — no new
endpoint, no new response shape.

**What stays derivable without the extra fetch**: the header facts "Move N/M" (FR-008) and "X of Y"
(FR-009) do NOT require the sibling's `board_state` — they're computed from `totalMoves` (already on
the currently-loaded blunder) and `siblingMistakes`'s length/ordering/position (already fully present
in the enriched response), so the multi-item cold-boot navList can render correct header facts for
every sibling immediately, and only pays the extra request cost at the moment a player actually steps
to a different sibling (board state, correct move, explanation, etc. for THAT sibling).

**Rejected alternative**: eagerly fetching full board data for every sibling on initial cold-boot load.
Rejected because it would multiply the cold-boot request count by the sibling count (worst case:
several full blunder fetches for a game with many mistakes) for stepping that may never happen in a
given session — the lazy per-sibling fetch pays this cost only on actual navigation, matching how
`ReviewScreen.jsx`'s in-app navigation already works (each step is its own permalink navigation, not a
bulk preload).

## Summary of resolved unknowns

| Area | Resolution |
|---|---|
| Endpoint extension shape | Additive fields (`totalMoves`, `papergames_game_id`, `siblingMistakes`, `patternCells`) on existing `GET /api/blunders/:id`; `papergames_game_id` promoted to Phase 1 (Decision 1) |
| `mistakeDetail` reload | URL param `/mistakeDetail/:category`, removed from `SESSION_ONLY_SCREENS` |
| SC-002 fixture | Real stored game `40fe793a-aa39-429d-8ef4-4e43192cc4db` (papergames), 4 real blunder ids, no seeding needed |
| Spec-037 bugs re-verification | 2 "already shipped" claims confirmed true; of memory's 4 open bugs, 1 fixed, 1 (papergames dual-key) is in-scope via FR-015, 2 (z-order/layout) are out of scope for spec 042 |
| FR-019 guard seam (revised) | New `server/reasonRenderGuard.mjs` (`stripInternalTokens` + `sanitizeTermsMap`), called at the response/serialization boundary in `index.js` (every `res.json` for explanation text/`terms`, cache-hit AND fresh) — not at the 3 producer modules, which a cache hit bypasses; deploy task `TRUNCATE explanation_cache` |
| ReviewScreen stepper | Add in-place preview mode: all moves steppable; non-optimal steps navigate (unchanged); optimal steps update board in place |
| SplitReveal zoom | Decouple `boardW` from live `splitPct`; freeze on mount/real-resize only, never recompute during a drag |
| FR-020/SC-008 highlight source | New additive, pattern-agnostic `patternCells` field (Decision 3, generalized from `double_threat`-only `doubleThreatCells`), computed via the tag→detector map (`classifier.js:1536`) — `double_threat` runs `detectDoubleThreat(boardAfterCorrect, blunderer)`, verified against the two Assumptions boards before US6 task-decomposition; other tags' board-state derivation recorded by an audit task (T049A); applied unconditionally to both independent response builders (`:id` handler + `~2560` list-variant); ALL highlights derive from structured fields only (Decision A), never from prose |
| Cold-boot sibling stepping | Lazy per-sibling `GET /api/blunders/:id` on Prev/Next/chip navigation; header facts ("Move N/M", "X of Y") derivable from enriched fields alone, no eager sibling board-state fetch |
| `community-` leak | Guard-first defensive strip at all 3 seams; audit task required to confirm a real leak instance is actually caught (root cause not fully pinned to one call site) |
