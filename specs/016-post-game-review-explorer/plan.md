# Implementation Plan: Post-Game Review & Position Explorer (Epic 3b)

**Branch**: `101-new-design` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/016-post-game-review-explorer/spec.md`

---

## Summary

Implement the Post-Game Review screen (`review`) and Position Explorer screen (`explorer`) for the Sparring surface. After a game ends, the user is navigated to Review where the board is frozen at game end, a move timeline shows analysis nodes that fill in with quality colors as `POST /api/games/analyze` resolves, and an accuracy card is displayed. Tapping a non-optimal node opens the Explorer, which rewinds the board to the mistake position and lets the user try alternative moves using the same AI logic as the original game. The Explorer also supports Deep Reveal (LLM explanation with cache) and Prev/Next mistake navigation. Two new backend endpoints are needed: `POST /api/games/analyze` (uses the existing `moveQualityScorer.js` shared scorer) and `POST /api/games/from-position` (returns a truncated movestring + side + difficulty so the client can start a new game from a specific move index; the actual game row is created by `saveGame` when that new game ends). A migration adds `'unknown'` to the `blunders.pattern_category` CHECK constraint to enable blunder capture from game analysis.

---

## Technical Context

**Language/Version**: Node.js 20+ (server), React 18 (frontend), ES modules throughout  
**Primary Dependencies**: Express (server), React + react-i18next (frontend), Supabase (DB via service role key)  
**Storage**: PostgreSQL via Supabase; `games`, `blunders`, `explanation_cache`, `llm_feedback` tables  
**Testing**: Manual QA gates (FR-016 parity check, edge cases); unit tests for `scoreMove` already exist  
**Target Platform**: Mobile web (PWA), same as existing sparring surface  
**Project Type**: Web application (monorepo: `connect-four/server` + `connect-four/src`)  
**Performance Goals**: Full analysis of ≤20 user moves must complete within 15 seconds (SC-001); board + pending timeline must render immediately before analysis arrives (SC-002)  
**Constraints**: Solver queries serialized via persistent process (IPC); Deep Reveal calls same `POST /api/explain-move-llm` with existing quota enforcement; blunder writes are fire-and-forget  
**Scale/Scope**: 2 new screens, 2 new endpoints, 1 extracted hook, 1 new migration

---

## Constitution Check

### Before Phase 0 (Pre-design gate)

- [x] **Principle I (Explanation Engine as Single Source of Truth)**: Deep Reveal in the Explorer routes through `POST /api/explain-move-llm` — the same endpoint used in Challenges. The analyzer uses `scoreMove` + `classify()` — the same scorer and classifier used by `POST /api/evaluate-move`. No independent evaluation path is introduced.
- [x] **Principle II (Code Quality)**: `useGameBoard` hook extracted to avoid duplicating 200+ lines of interactive board logic between `GameScreen` and `ExplorerScreen`. No speculative abstractions added.
- [x] **Principle III (Testing Standards)**: Manual QA gates defined in quickstart.md for golden path and edge cases (parity, forced-move, clean game, blunder write, Deep Reveal cache). Solver-dependent logic (analyze endpoint) must be tested with a real moves string, not mocked.
- [x] **Principle IV (UX Consistency)**: Quality colors (green/amber/red), overlay types (`tr`, `td`), and Coach phrase i18n key pattern all follow established conventions. Timeline uses same color scale as Challenges.
- [x] **Principle V (Performance)**: Analysis endpoint processes moves serially via persistent solver. No per-move timeout (solver is fast). Loading indicator is the pending (gray) timeline state that renders immediately. Fire-and-forget writes (blunders, tracks) do not block response.
- [x] **Principle VI (Debugging Methodology)**: Data dependencies fully mapped in data-model.md before any code is written. The forced-move detection signal (`count of scores > INVALID_MOVE`) has been validated against the solver's INVALID_MOVE sentinel (`-1000`) — this is the same check used in `GameScreen.makeAiMove`.
- [x] **Principle VII (Software Design Philosophy)**: Explicit over implicit for `side` parity. `patternTag` coercion to `'unknown'` is explicit at the write call site, not hidden. Navigation params are typed in data-model.md.
- [x] **Principle VIII (Documentation)**: Architecture docs were read before planning. New API contracts documented in contracts/api.md. Migration documented in data-model.md. Plan to update `api-conventions.md` and `data-model.md` (architecture docs) included as explicit tasks.

**GATE: PASS** — No constitution violations. No complexity table required.

---

## Project Structure

### Documentation (this feature)

```text
specs/016-post-game-review-explorer/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # POST /api/games/analyze and /api/games/from-position contracts
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code

```text
connect-four/server/
├── migrations/
│   └── 027_blunders_unknown.sql        # NEW — add 'unknown' to CHECK constraint
├── index.js                            # MODIFIED — add 2 new endpoints
└── moveQualityScorer.js                # EXISTING — imported by new analyze endpoint

connect-four/src/
├── lib/
│   ├── useGameBoard.js                 # NEW — hook extracted from GameScreen
│   ├── screenRegistry.jsx              # MODIFIED — replace placeholder entries
│   └── board.js                        # EXISTING — buildBoard, checkWin already extracted
├── screens/
│   ├── GameScreen.jsx                  # MODIFIED — refactored to use useGameBoard
│   ├── ReviewScreen.jsx                # NEW
│   └── ExplorerScreen.jsx              # NEW
└── i18n/
    └── en.json                         # MODIFIED — add coach.sparring.review.* pools
```

**Structure Decision**: Monorepo, standard project layout. New screens in `src/screens/`; new hook in `src/lib/`. Migration in `server/migrations/` following the established numbering scheme.

---

## Phase 0: Research

**Output**: `research.md` — see file for all 10 decisions. Key findings:

1. Migration 027 required before any blunder write can succeed (constraint currently does not include `'unknown'`).
2. `moveQualityScorer.js` is the canonical shared scorer — import `scoreMove` directly in analyze endpoint.
3. `useGameBoard` hook extraction is the right reuse strategy for ExplorerScreen.
4. Deep Reveal panel is a bottom sheet (same pattern as ChallengeScreen), not an overlay.
5. `review` and `explorer` are already registered in `screenRegistry.jsx` (as `PlaceholderScreen`) and `surfaceGroups.js` (as `--bg-spar`) — no changes needed to those files beyond swapping the component.
6. `pickFromPool` can be used directly for `summaryPhraseKey` selection in the analyze endpoint.

---

## Phase 1: Design & Contracts

### Data Model

See `data-model.md`. Summary:
- No new tables created.
- Migration 027 modifies the `blunders.pattern_category` CHECK constraint to add `'unknown'` and bring it up-to-date with all current slugs.
- Two ephemeral entities: `GameAnalysis` (analyze response) and `ExplorerState` (client-only).
- Navigation params contracts defined for `review`, `explorer`, and `game` screens.

### API Contracts

See `contracts/api.md`. Two new endpoints:
- `POST /api/games/analyze` — scores user plies, returns `GameAnalysis` shape.
- `POST /api/games/from-position` — returns `{ moves, side, difficulty }` init payload for starting a new game from position N; does NOT insert a games row (row is created by `saveGame` when the spawned game ends).

Four existing endpoints are reused without change: `/api/explain-move-llm`, `/api/llm-feedback`, `/api/evaluate-move`, `/api/scores`.

### i18n Key Pools (new additions to `en.json`)

```json
{
  "coach": {
    "sparring": {
      "review": {
        "clean": {
          "0": "Clean game. Nothing to revisit.",
          "1": "Excellent — no mistakes to review."
        },
        "mistakes": {
          "0": "Good game. One parity mistake decided it.",
          "1": "A few moments to learn from — let's look.",
          "2": "You played well. Let's find the edge.",
          "3": "Some tactical moments worth revisiting."
        }
      }
    }
  }
}
```

---

## Implementation Phases

### Phase A: Infrastructure (blocking — must complete before any screen work)

These tasks have no UI dependencies but block everything else.

**A1 — Migration 027: add `'unknown'` to blunders constraint**

File: `connect-four/server/migrations/027_blunders_unknown.sql`

```sql
-- 027_blunders_unknown.sql
-- Add 'unknown' sentinel to blunders.pattern_category CHECK constraint (Epic 3b FR-011).
-- Also brings constraint up-to-date with all slugs added since migration 013.

ALTER TABLE public.blunders DROP CONSTRAINT IF EXISTS blunders_pattern_category_check;
ALTER TABLE public.blunders ADD CONSTRAINT blunders_pattern_category_check
  CHECK (pattern_category IN (
    'immediate_threat','forced_block','double_threat','forced_win','forbidden_columns',
    'z_threat','claimeven','undercut','overcut','figure_7','j_shape','unknown'
  ));
```

**A2 — i18n: author `coach.sparring.review.*` key pools in `en.json`**

Add the pools specified above under the existing `coach.sparring` subtree in `en.json`. At least 2 entries for `clean`, at least 4 for `mistakes`.

**A3 — Extract `useGameBoard` hook from `GameScreen.jsx`**

Create `connect-four/src/lib/useGameBoard.js` with the following interface:

```js
/**
 * @param {{ initialMoves: string, side: 'first'|'second', difficulty: string, onGameEnd?: (result, finalMoves) => void }} opts
 * @returns {{
 *   moveHistory: number[],
 *   board: array,
 *   heights: number[],
 *   fullCols: number[],
 *   lastDrop: {c, r} | null,
 *   aiThinking: boolean,
 *   gameOver: {result, winnerColor} | null,
 *   hintOverlays: array,
 *   hintActive: boolean,
 *   coachMessages: array,
 *   handleColumnClick: (col: number) => void,
 *   handleHintToggle: () => void,
 *   handleResign: () => void,
 *   userColor: string,
 *   aiColor: string,
 *   userTurn: boolean,
 * }}
 */
export function useGameBoard({ initialMoves, side, difficulty, onGameEnd }) { ... }
```

- `initialMoves` defaults to `''` (empty board) for normal games.
- `onGameEnd` is called with `(result, finalMoves)` instead of the hook calling `saveGame` directly. This lets `GameScreen` save the game and `ExplorerScreen` ignore game end (from-position is a separate action).

**A4 — Refactor `GameScreen.jsx` to consume `useGameBoard`**

`GameScreen` becomes a thin wrapper: calls `useGameBoard({ initialMoves: '', side, difficulty, onGameEnd: saveGame })` and passes the returned values to the render tree. The `saveGame` function remains in `GameScreen.jsx` (it navigates to `review` and calls `POST /api/games`). No behavior change.

Verify: play a full game, resign, confirm navigation to `review` screen still works.

---

### Phase B: Backend Endpoints

**B1 — `POST /api/games/analyze`**

Location in `server/index.js`: register **before** `GET /api/puzzles/:id` (following route-ordering convention). Auth: `loadUser` runs, `req.user` may be null.

Algorithm:
1. Validate `gameId` is present (400 if missing).
2. Fetch game row from `games` table: `moves`, `side`, `difficulty` (404 if not found).
3. Iterate over `moves` string character by character. For each character at position `i`:
   - Determine if this is a user ply: `side==='first'` → user ply when `i % 2 === 0`; `side==='second'` → user ply when `i % 2 === 1`.
   - If not a user ply: skip.
   - Compute `movesBeforeThisPly = moves.slice(0, i)`.
   - Query solver: `const scores = await solver.query(movesBeforeThisPly)`. (Use the persistent solver singleton from `c4solver-wrapper.js`.)
   - Count legal columns: `const legalCount = scores.filter(s => s > INVALID_MOVE).length`.
   - Call `scoreMove(scores, col)` from `moveQualityScorer.js`. This returns `{ badge, quality, bestCol }`.
   - Derive `score = scores[col]` and `bestScore = scores[bestCol]` explicitly from the raw `scores` array (using the `bestCol` returned by `scoreMove`).
   - Call `classify(movesBeforeThisPly, col, scores)` from the classifier. Read `.tag` as `patternTag`. (The classifier does NOT return `threatCells`.)
   - Build `AnalyzedMove` entry using `{ col, quality, score, bestScore, bestCol, patternTag }`.
   - If `legalCount > 1`: increment `scored`; classify quality.
   - If `legalCount === 1`: move is forced — still include in `moves` array with quality, but do NOT increment `scored`.
4. Compute counts and `accuracy`.
5. Select `summaryPhraseKey` via `pickFromPool`.
6. Return `GameAnalysis` shape.

**Note on solver serialization**: The persistent solver is shared across all requests. Use the same `solver.query()` call pattern as `POST /api/evaluate-move`. Do not call it in parallel within the endpoint.

**B2 — `POST /api/games/from-position`**

Location in `server/index.js`: register at the end of the games-related route block.

Algorithm:
1. Validate `gameId`, `N` (integer 0–42), `difficulty` (against allowed set).
2. Fetch original game: `moves`, `side` (404 if not found).
3. Compute truncated movestring: `const truncated = moves.slice(0, N)`.
4. Return `{ moves: truncated, side, difficulty }` with status 200. **Do NOT insert a games row at this point.**
   - The client uses this payload to navigate to the `game` screen. When the new game finishes, `GameScreen.saveGame` calls `POST /api/games` to create the real row, exactly as it does for a normal new game.
   - This avoids phantom game rows with a fake `result: 'draw'` placeholder that could never be updated.

---

### Phase C: Review Screen

**C1 — `ReviewScreen.jsx` implementation**

File: `connect-four/src/screens/ReviewScreen.jsx`

Props: `{ go, goBack, id }` — `id` is the `gameId` from navigation params.

State:
- `analysis: GameAnalysis | null` — populated after fetch completes
- `loading: boolean` — true while fetch is in-flight
- `error: boolean` — true on network failure or 404

Behavior:
1. On mount, immediately call `POST /api/games/analyze` with `{ gameId: id }`.
   - While loading: board is not shown (no movestring yet), timeline shows a loading indicator, CoachDialog shows a neutral phrase.
   - On error/404: show neutral board (or hide), error phrase, disabled Prev/Next.
2. On analysis success:
   - Render compact `Board` with `buildBoard(analysis.fullMovestring)`.
   - Render timeline of `analysis.moves` nodes (user plies only, numbered 1..N).
   - Render accuracy card.
   - Update CoachDialog with `t(analysis.summaryPhraseKey)`.
   - Fire `track('game_reviewed', { gameId: id, accuracy, blunderCount })`.
   - Fire blunder writes (see below).

**Timeline nodes**:
- Each node starts in pending (gray) state. Since the endpoint is not streaming, all nodes update simultaneously when the response arrives. (No per-move streaming is implemented — the whole `GameAnalysis` arrives at once.)
- Node color: green (`var(--eval-good)`) for `optimal`, amber (`var(--eval-mid)`) for `suboptimal`, red (`var(--eval-bad)`) for `blunder`.
- Tapping a non-optimal node: `go('explorer', { gameId: id, moveIndex: move.moveIndex, moves: analysis.moves, difficulty, side })`. `difficulty` and `side` are not in the analyze response — they must be stored separately. **Implementation note**: the `review` screen must store `difficulty` and `side` from the game by fetching them from the analyze response's `fullMovestring`... Actually, `difficulty` and `side` are needed for the Explorer but are NOT in the analyze response. **Resolution**: the `review` screen fetches them from the `games` table directly via a separate call, OR the analyze endpoint includes them in its response.

  **Decision**: Extend the `POST /api/games/analyze` response to include `difficulty` and `side` (these are fetched server-side anyway). Add these two fields to the `GameAnalysis` shape. Update `contracts/api.md` accordingly.

- Tapping an optimal node: no action.

**Accuracy card**:
- When `scored > 0`: show `Math.round(optimalCount / scored * 100)%`.
- When `scored === 0`: show `--`.
- Always show quality counts: Optimal N / Suboptimal N / Blunder N.

**Prev/Next mistake navigation**:
- Compute `mistakeIndices = moves.filter(m => m.quality !== 'optimal').map(m => m.moveIndex)`.
- If `mistakeIndices.length === 0`: Prev and Next buttons are disabled.
- If mistakes exist: Prev/Next navigate within the `mistakeIndices` array (start at first mistake on enter).

**Blunder writes** (FR-011):
- Trigger only when `session?.user_id` (or `req.user` equivalent on client — use `session` from `useStore()`).
- For each move in `analysis.moves` where `quality === 'blunder'`:
  - Compute `board_state = fullMovestring.slice(0, moveBeforeThisPly)` — the movestring before this user ply.
  - `move_played = move.col` (0-indexed).
  - `correct_move = move.bestCol` — **Note**: the analyze response does not currently include `bestCol`. **Resolution**: extend `AnalyzedMove` to include `bestCol` (the `scoreMove` return already includes it — just pass it through).
  - `pattern_category = validCategorySet.has(move.patternTag) ? move.patternTag : 'unknown'`.
  - `puzzle_id = null`.
  - Fire-and-forget: `supabase.from('blunders').insert(...)` via client fetch with auth header.

  **Implementation note**: The client cannot call Supabase directly (uses service role key on server). The blunder write must go through a server endpoint. **Resolution**: Add a thin `POST /api/blunders` endpoint (no auth required — uses `req.user` from `loadUser`; returns 401 if user is null, which is the silent failure the spec allows). The client calls it fire-and-forget for each blunder.

  **Alternative**: Or, have the analyze endpoint itself write blunders server-side on analysis completion, conditioned on `req.user`. This avoids a new endpoint but complicates the analyze response (which is now a mutation, not a query). The spec says "the client MUST fire-and-forget a write" — so the client is the correct initiator.

  **Final decision**: Add `POST /api/blunders` as a thin write endpoint. Body: `{ board_state, move_played, correct_move, pattern_category }`. Server reads `user_id` from `req.user` (returns 401 silently if null). No response body (204). Rate limit: standard 120/min.

**C2 — Wire `ReviewScreen` in `screenRegistry.jsx`**

Replace:
```js
review: (props) => <PlaceholderScreen {...props} screenKey="review" />,
```
With:
```js
import { ReviewScreen } from '../screens/ReviewScreen.jsx';
// ...
review: ReviewScreen,
```

---

### Phase D: Explorer Screen

**D1 — `ExplorerScreen.jsx` implementation**

File: `connect-four/src/screens/ExplorerScreen.jsx`

Props: `{ go, goBack, gameId, moveIndex, moves, difficulty, side }`

On mount:
1. Compute `mistakeIndices = moves.filter(m => m.quality !== 'optimal').map(m => m.moveIndex)`.
2. Compute `selectedMistakeIndex = mistakeIndices.indexOf(moveIndex)` (or 0 if not found).
3. Compute the rewound board state for the selected mistake:
   - `userMoveOrdinal = moveIndex` (1-based).
   - Total plies before this user move: `side === 'first'` → `(userMoveOrdinal - 1) * 2`; `side === 'second'` → `(userMoveOrdinal - 1) * 2 + 1`.
   - `rewindedMoves = fullMovestring.slice(0, totalPliesBeforeThisMove)`.
   - **Problem**: `fullMovestring` is not passed to the Explorer. The Explorer receives `moves` (AnalyzedMove[]) but not the full game movestring. **Resolution**: pass `fullMovestring` as an additional navigation param from `ReviewScreen` to `ExplorerScreen`. Update the navigation params contract in data-model.md.
4. Mount `useGameBoard({ initialMoves: rewindedMoves, side, difficulty, onGameEnd: () => {} })` — ignore game end in Explorer (from-position is separate).
5. Fire `track('mistake_reviewed', { gameId, moveIndex, category: selectedMove.patternTag ?? null })`.

**Board overlays on mount**:
- Build the board from the rewound position: `const board = parseBoardState(rewindedMoves)` (using the existing `buildBoard` helper from `src/lib/board.js`).
- `tr` overlay on the mistake column's landing row: `{ c: selectedMove.col, r: heights[selectedMove.col], type: 'tr' }` — derive `heights` from the board built above.
- `td` overlays on threat cells: call `getMajorThreatCells(board)` (from `src/lib/board.js`) on mount to get all major threat cells, then emit `{ c, r, type: 'td' }` for each. Do NOT call `classify()` for this purpose — `classify()` does not return `threatCells`.

**Interactive board**:
- After initial render (with `tr` overlay), clear the `tr` overlay on first user move.
- Reuse `useGameBoard`'s `handleColumnClick` for user interaction. AI responds at `difficulty`.
- **Disc color**: `useGameBoard` already derives `userColor = side === 'first' ? 'red' : 'yellow'` — this is correct since the Board renders `'red'` as green disc and `'yellow'` as gray disc.

**Prev/Next mistake navigation**:
- Prev: go to `mistakeIndices[selectedMistakeIndex - 1]`. Disabled at index 0.
- Next: go to `mistakeIndices[selectedMistakeIndex + 1]`. Disabled at last index.
- Navigation within the Explorer: update all derived state without calling `go()` (stay on same screen). Reset `useGameBoard` to the new rewound position.

**"Start new game from here"**:
- Compute `N` = total plies in `rewindedMoves` (its length).
- Call `POST /api/games/from-position` with `{ gameId, N, difficulty }`.
- On success: the response is `{ moves, side, difficulty }` — no `gameId` in the response (the row is created later by `saveGame`). Navigate: `go('game', { initialMoves: responseMoves, side: responseSide, difficulty: responseDifficulty })`. `GameScreen` starts from this position and creates the game row when the game ends.
- On failure: show brief error message; do NOT navigate.

**Deep Reveal button (FR-020)**:
- Visible in Toolbar when viewing a non-optimal mistake node.
- Not visible for optimal nodes (but Explorer only opens for non-optimal nodes, so this is always visible in practice within the Explorer).
- Tapping opens the Deep Reveal bottom-sheet panel.

**Deep Reveal panel (FR-021)**:
- On open: check `explanation_cache` indirectly by calling `POST /api/explain-move-llm` with `{ movestring: rewindedMoves, col: selectedMove.col }` and auth header.
  - The endpoint already checks the cache first and returns `{ explanation, bestLine, cached }`.
  - On 401: show `AuthModal` instead of the panel.
- On response (cache hit): render instantly (no spinner for cache hit). `cached: true` in track call.
- On response (cache miss): spinner while loading; render on response.
- Timeout (>6s): show Tier 1 phrase from `patternTag` if available, else generic phrase. Show "Detailed explanation unavailable."
- Panel content: LLM explanation text, `bestLine` chips, "Flag this explanation" button.
- "Flag this explanation": call `POST /api/llm-feedback` with `{ movestring: rewindedMoves, llm_prompt: '', llm_response: explanation, human_note: '', feature: 'position_explorer' }`. Show brief confirmation. Keep panel open.
- `track('deep_reveal_viewed', { context: 'position_explorer', cached })` on every panel open.

**D2 — Wire `ExplorerScreen` in `screenRegistry.jsx`**

Replace the placeholder with the real component import.

---

### Phase E: Documentation Updates

**E1 — Update `docs/architecture/api-conventions.md`**

Add sections for:
- `POST /api/games/analyze`
- `POST /api/games/from-position`
- `POST /api/blunders`

**E2 — Update `docs/architecture/data-model.md`**

Document the `blunders.pattern_category` constraint change (migration 027) and the `'unknown'` sentinel.

---

### Phase F: QA Gate

**F1 — Manual QA: AI-first parity verification (FR-016)**

This is a mandatory merge gate. Before shipping:
1. Play a game as Gray (side='second').
2. Resign after ≥3 moves.
3. Enter Explorer at move 1.
4. Play any column.
5. Verify the disc renders as **Gray** (not Green).

Document result. If the disc renders as Green, the parity bug is present — do not ship until investigated.

---

## Dependency Ordering

```
A1 (migration) ─────────────────────────────► C1 (blunder writes in ReviewScreen)
A2 (i18n) ──────────────────────────────────► B1 (summaryPhraseKey pool)
A3 (extract useGameBoard) ──────────────────► A4 (refactor GameScreen)
                                             ► D1 (ExplorerScreen uses hook)
A4 (refactor GameScreen) ───────────────────► VERIFY game still works
B1 (analyze endpoint) ──────────────────────► C1 (ReviewScreen calls it)
B2 (from-position endpoint) ────────────────► D1 (ExplorerScreen calls it)
C1 (ReviewScreen) + C2 (registry) ──────────► [review screen live]
D1 (ExplorerScreen) + D2 (registry) ────────► [explorer screen live]
E1 + E2 (doc updates) ──────────────────────► [docs current]
F1 (QA gate) ───────────────────────────────► [merge-ready]
```

---

## Extended `GameAnalysis` Shape (refined during Phase 1)

Two fields added beyond the spec's original FR-030 shape to support client needs:

```json
{
  "moves": [{ "moveIndex": 1, "col": 3, "quality": "optimal", "score": 5, "bestScore": 5, "bestCol": 3, "patternTag": "double_threat" }],
  "accuracy": 82,
  "optimalCount": 17,
  "suboptimalCount": 3,
  "blunderCount": 2,
  "scored": 22,
  "summaryPhraseKey": "coach.sparring.review.mistakes.1",
  "fullMovestring": "334441...",
  "difficulty": "medium",
  "side": "first"
}
```

- `bestCol` (on `AnalyzedMove`): needed for `correct_move` in blunder writes.
- `difficulty` + `side` (on `GameAnalysis`): needed for Explorer navigation params.

---

## Constitution Check (Post-Phase 1)

Re-verification after design is complete:

- [x] **Principle I**: Scorer and classifier are the sole quality source. LLM explanation routes through existing endpoint with existing cache key. No divergent evaluation paths.
- [x] **Principle II**: `useGameBoard` hook eliminates code duplication. `POST /api/blunders` is a thin write endpoint (~20 lines). No over-engineering.
- [x] **Principle IV**: Color tokens (`--eval-good`, `--eval-mid`, `--eval-bad`) used for timeline nodes — identical to Challenges surface. `tr`/`td` overlay types match the locked enum.
- [x] **Principle V**: Fire-and-forget for blunder writes, analytics. Analyze endpoint processes synchronously but responses begin as soon as all scores are ready (no additional wait).
- [x] **Principle VI**: `bestCol` derived from `scoreMove` return value (already computed). Forced-move detection uses `count of scores > INVALID_MOVE` — same sentinel constant (`INVALID_MOVE = -1000`) already imported in `GameScreen`. `side` parity for ply assignment is explicit in the endpoint with a comment.
- [x] **Principle VIII**: contracts/api.md, data-model.md, quickstart.md authored. Tasks will include doc update tasks.

**GATE: PASS**
