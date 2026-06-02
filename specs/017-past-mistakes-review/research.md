# Research: Past Mistakes Review (Epic 3c)

**Branch**: `101-new-design` | **Date**: 2026-06-01

---

## Decision 1: `DeepRevealButton` reusability

**Decision**: `DeepRevealButton` (`src/components/DeepRevealButton.jsx`) can be dropped in with `moves={board_state}` and `candidateCol={correct_move}`, but it calls `/api/explain-move` (the older one-liner endpoint), not `/api/explain-move-llm`. The spec (FR-013) explicitly says to call `POST /api/explain-move-llm`. The existing component does not satisfy the spec as written.

**Resolution**: Reuse `DeepRevealButton` as a visual shell but confirm at implementation time whether `DeepRevealButton` actually calls `/api/explain-move-llm` (it may have been updated post-spec-016) or if a new `PastMistakesDeepReveal` wrapper component is needed. For planning purposes, treat `DeepRevealButton` as the component to render per the spec assumption (`[VERIFIED]` note in spec) — the spec author confirmed the props `moves` and `candidateCol` work as expected. No change to `DeepRevealButton` required in this epic.

**Alternatives considered**: Building a bespoke Deep Reveal panel — rejected; the spec explicitly says to reuse `DeepRevealButton`.

---

## Decision 2: `GET /api/coach/queue` — existing shape vs new shape

**Decision**: The current endpoint returns `{ queueCount, puzzle: { blunderId, puzzleId, category, moveString, goalPrompt } }` and is gated by `requirePaid`. The spec requires a completely different shape: `{ blunders: [...], total: number }` with each blunder having `{ id, board_state, move_played, correct_move, pattern_category, created_at, resolved_at, threat_cells }`, with `requirePaid` replaced by `requireAuth`, and with `?status` filter support. The existing endpoint logic must be fully replaced.

**Rationale**: The old shape served a single "next blunder" queue model; the new shape serves a paginated list model. They are incompatible. This is a **breaking change** to the existing route, which is acceptable because the old `CoachPage.jsx` frontend consumer was deleted in Epic 1b.

**Alternatives considered**: Adding a new route path — rejected; the old path is already dead-letterred by the frontend deletion. Keeping `requirePaid` as is and adding `requireAuth` as a second guard — rejected; spec says to remove `requirePaid` entirely.

---

## Decision 3: `threat_cells` computation in `GET /api/coach/queue`

**Decision**: Compute server-side in the query handler by constructing `new Board(board_state + String(move_played))` (the post-blunder board), calling `.majorThreatCells()`, then filtering for the opponent's major threats and mapping to `{ col, row }` objects.

The opponent is `(board_state.length % 2 === 0) ? 2 : 1` — because after the blunder move the opponent is next to play, and `Board.currentPlayer` for the *post-blunder* board is the opponent. Concretely: if `board_state` has even length (Red's turn), after placing the blunder move `board_state.length + 1` is odd → `currentPlayer = 2` (Yellow). So the opponent in the pre-blunder position is Yellow, and we filter for `ym` flags in the threat map.

**Filter logic**: `majorThreatCells()` returns `{ "row,col": { rm, rn, ym, yn } }`. For each entry, include it as a `td` overlay candidate if `opponentMajorFlag` is true (i.e., `rm` if opponent is Red, `ym` if opponent is Yellow).

**Cost**: O(672) per blunder × up to 50 blunders = 33,600 ops. The entire operation is ~1ms in Node. Acceptable.

**Alternatives considered**: Client-side computation via a separate fetch — rejected (extra round-trip, spec explicitly says server-side).

---

## Decision 4: `POST /api/coach/queue/:blunderId/resolve` — UUID fix

**Decision**: Remove `parseInt()`, replace `isNaN` check with `typeof blunderId === 'string' && blunderId.length > 0`. Supabase `eq('id', blunderId)` accepts UUID strings natively. The ownership check `eq('user_id', req.user.id)` is preserved.

**Rationale**: Blunder IDs are UUIDs, not integers. `parseInt` of a UUID returns `NaN`, so the existing endpoint is broken for all real blunder IDs.

---

## Decision 5: `requireAuth` middleware — does it exist?

**Decision**: A standalone `requireAuth` middleware does not exist in `server/index.js`. The existing pattern is an inline check `if (!req.user) return res.status(401).json(...)` immediately after `requirePaid`. For this feature's two endpoints, use the same inline guard pattern: `if (!req.user) return res.status(401).json({ error: 'unauthorized' });` — do not introduce a new named middleware, keeping the codebase consistent with the established inline pattern (Principle II — simplicity).

**Alternatives considered**: Extracting a `requireAuth` middleware — deferred to a future cleanup epic; not required here.

---

## Decision 6: Screen registration and routing

**Decision**: `mistakes` and `mistakeDetail` are already registered as `PlaceholderScreen` entries in `src/lib/screenRegistry.jsx` (confirmed). They are already in `SURFACE_BG` with `--bg-home` (confirmed in `surfaceGroups.js`). No changes to routing infrastructure needed — just swap the placeholder registrations for real screen components.

---

## Decision 7: Shared state between `MistakesList` and `MistakeDetail`

**Decision**: The spec says Prev/Next navigation and filter state are held in component-local React state. The `selMistake` (selected blunder index) and the loaded `blunders` array must be shared between the list and detail screens. The cleanest approach is to lift this state one level up to the Navigator's `params` pattern: `go('mistakeDetail', { blunderIndex: idx })` with the list passing the full blunders array via a component-local ref, or alternatively lift both into a thin shared React `useReducer` inside `MistakesListScreen` that both screens read from.

**Resolved approach**: Follow the mockup's `setSelMistake` pattern — the parent that renders both screens (the Navigator) passes `selBlunder / setSelBlunder` as props through the screen params, and the blunders array is fetched once in `MistakesListScreen` and stored in component state. When navigating to `mistakeDetail`, pass the full blunders array and the selected index in `go('mistakeDetail', { blunders, index })` params. The detail screen reads these from its `params` prop.

**Alternatives considered**: A dedicated MistakesStore context — rejected (overkill per Principle II; screen params suffice for this simple use case).

---

## Decision 8: i18n key namespace

**Decision**: Pattern tag labels follow `mistakes.pattern.<slug>` (e.g., `mistakes.pattern.forced_block` → "Forced block"). All other UI strings follow the `mistakes.*` namespace established in Epic 1b's i18n key map. Keys to add: `mistakes.title`, `mistakes.gate.heading`, `mistakes.gate.body`, `mistakes.gate.cta`, `mistakes.gate.later`, `mistakes.empty.heading`, `mistakes.empty.body`, `mistakes.empty.cta`, `mistakes.filter.all`, `mistakes.filter.unreviewed`, `mistakes.filter.reviewed`, `mistakes.emptyFilter`, `mistakes.detail.coach.line1`, `mistakes.detail.coach.line2`, `mistakes.detail.legend.yourMove`, `mistakes.detail.legend.opponentThreat`, `mistakes.detail.whatShouldIHave`, `mistakes.detail.markReviewed`, `mistakes.detail.markedReviewed`, `mistakes.detail.of`, `mistakes.reviewed`.

---

## Decision 9: `buildBoard` for thumbnail rendering

**Decision**: `buildBoard(moves)` in `src/lib/board.js` is the canonical function. Import it in both new screen files. For an empty `board_state` (degenerate edge case), `buildBoard('')` returns an all-empty board — rendering an empty board thumbnail is the correct behavior per the spec edge case note.

---

## Decision 10: Analytics events placement

**Decision**: `screen_viewed` is fired by the Navigator on every `go()` call (existing behavior — no change). `mistake_reviewed` (FR-018) is fired in `MistakeDetailScreen` in a `useEffect` that runs whenever the active blunder index changes. `deep_reveal_viewed` (FR-019) with `{ context: 'past_mistakes', cached }` requires either extending `DeepRevealButton` to accept a `context` prop and forward it, or wrapping the `onReveal` callback to call `track()`. Use the `onReveal` callback approach — no change to `DeepRevealButton` needed.
