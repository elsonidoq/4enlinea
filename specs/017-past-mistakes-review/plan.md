# Implementation Plan: Past Mistakes Review (Epic 3c)

**Branch**: `101-new-design` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/017-past-mistakes-review/spec.md`

---

## Summary

Implement the Past Mistakes Review feature: two new screens (`MistakesListScreen` and `MistakeDetailScreen`) that let authenticated users browse blunders captured during post-game review, see the board at the moment of each mistake with overlays, and get an LLM deep-reveal of the better move. The backend `GET /api/coach/queue` endpoint is redesigned from a single-next-blunder shape to a full blunder list with `?status` filtering and server-side `threat_cells` computation via `Board.majorThreatCells()`. The `POST /api/coach/queue/:blunderId/resolve` endpoint is fixed to handle UUID IDs (confirmed: `blunders.id` is `uuid PRIMARY KEY` from `003_puzzles.sql`; the existing `parseInt` returns `NaN` for all real IDs). Both endpoints drop the `requirePaid` gate in favor of a `requireAuth` inline check. No new DB migration is needed (migration 027 with `'unknown'` in CHECK was applied in Epic 3b). `DeepRevealButton` must be extended to call `/api/explain-move-llm` (it currently calls `/api/explain-move`) and render the full LLM response (bestLine chips + Flag button); it is not reusable as-is. A new optional `trackingContext` prop is added to avoid duplicating the `deep_reveal_viewed` analytics event.

---

## Technical Context

**Language/Version**: Node.js 20+ (server), React 18 (frontend), ES modules throughout  
**Primary Dependencies**: Express (server), React + react-i18next (frontend), Supabase (DB via service role key)  
**Storage**: PostgreSQL via Supabase; `blunders`, `explanation_cache`, `llm_feedback` tables  
**Testing**: Manual QA gates (7 gates defined in quickstart.md)  
**Target Platform**: Mobile web (PWA), same as existing sparring surface  
**Project Type**: Web application (monorepo: `connect-four/server` + `connect-four/src`)  
**Performance Goals**: List fetch ≤1s for 50 blunders (50 × O(672) threat computation ≈ 1ms); Deep Reveal served from cache instantly on repeat access  
**Constraints**: `DeepRevealButton` must be extended (not reused as-is) to call `/api/explain-move-llm` and render bestLine chips + Flag button — see DeepReveal Fix section; no new DB migrations; solver not called in this feature; blunder writes already handled by Epic 3b  
**Scale/Scope**: 2 new screens, 2 modified endpoints, 1 modified component (`DeepRevealButton`), 0 new hooks, 0 new migrations

---

## Constitution Check

### Before Phase 0 (Pre-design gate)

- [x] **Principle I (Explanation Engine as Single Source of Truth)**: Deep Reveal routes through `<DeepRevealButton>` which will be extended to call `POST /api/explain-move-llm` — the same endpoint used in Sparring Explorer. The component currently calls `/api/explain-move` and will be updated as part of this feature. No independent evaluation path. Pattern tags come from `blunder.pattern_category` (already classifier-computed at write time in Epic 3b). No new solver calls or classifier calls in this feature.
- [x] **Principle II (Code Quality)**: Minimal changes. `DeepRevealButton` extended in-place (no new component) to call `/api/explain-move-llm` and render bestLine chips + Flag button. `Board.majorThreatCells()` called directly in the query handler. Inline `requireAuth` check matches established server pattern.
- [x] **Principle III (Testing Standards)**: 7 manual QA gates defined in quickstart.md covering all three list variants, detail screen overlays, mark-as-reviewed success/error, Deep Reveal flow, and analytics. `threat_cells` can be spot-checked with `./visualize_board.sh`.
- [x] **Principle IV (UX Consistency)**: `tr` / `td` overlay types are the locked cross-epic enum. Pattern tag labels use `mistakes.pattern.<slug>` namespace. Coach dialog strings use established `mood: 'think'` pattern. No raw scores surfaced.
- [x] **Principle V (Performance)**: `threat_cells` computation is O(672) × 50 blunders ≈ 1ms total. Deep Reveal quota enforcement is in the existing endpoint (cache hits skip quota decrement). No loading silent hangs — spinner shown within 200ms of tap.
- [x] **Principle VI (Implementation Methodology)**: `board_state` → `heights[move_played]` derivation verified in spec (`[VERIFIED]` note). `majorThreatCells()` return format verified in server code (returns `"row,col"` keys with `rm/rn/ym/yn` flags). Opponent player derivation (`postBlunderBoard.currentPlayer`) verified against `Board` constructor logic (`movestring.length % 2 === 0 ? 1 : 2`). All data dependencies traced to source table before writing (see data-model.md).
- [x] **Principle VII (Software Design Philosophy)**: Explicit `opponent === 1 ? flags.rm : flags.ym` check (verified: `rm = Red major threat`, `ym = Yellow major threat` per `getMajorThreatCells` JSDoc in `classifier.js` lines 137–141). Pattern tag hidden via explicit `!== 'unknown'` guard. Navigation params typed in data-model.md.
- [x] **Principle VIII (Documentation)**: Architecture docs read before planning. New API contract shape documented in contracts/api.md. `api-conventions.md` update task included (updated coach endpoint shape). No new data-model changes (no migration).

**GATE: PASS** — No constitution violations.

---

## Project Structure

### Documentation (this feature)

```text
specs/017-past-mistakes-review/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # GET /api/coach/queue and POST /api/coach/queue/:id/resolve contracts
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code

```text
connect-four/server/
└── index.js                              # MODIFIED — redesign 2 existing coach endpoints

connect-four/src/
├── components/
│   └── DeepRevealButton.jsx             # MODIFIED — switch to /api/explain-move-llm; add bestLine chips + Flag button
├── lib/
│   └── screenRegistry.jsx               # MODIFIED — replace 2 placeholder entries
├── screens/
│   ├── MistakesListScreen.jsx            # NEW
│   └── MistakeDetailScreen.jsx          # NEW
└── i18n/
    └── en.json                           # MODIFIED — add mistakes.* i18n keys

docs/architecture/
└── api-conventions.md                   # MODIFIED — update coach endpoint shapes
```

**Structure Decision**: Monorepo, standard project layout. New screens in `src/screens/`. No new hooks (state is simple enough to live in components). No new migrations.

---

## Phase 0: Research

**Output**: `research.md` — 10 decisions. Key findings:

1. **`GET /api/coach/queue`** must be fully redesigned (old shape incompatible); breaking change is safe because `CoachPage.jsx` was deleted in Epic 1b.
2. **`POST /api/coach/queue/:blunderId/resolve`** has a critical UUID bug — `parseInt` of a UUID returns `NaN`; endpoint is broken for all real blunder IDs.
3. **`requirePaid` → inline `requireAuth`**: no named `requireAuth` middleware exists; use inline check per established server pattern.
4. **`threat_cells`**: computed server-side via `Board.majorThreatCells()` on the post-blunder board. Opponent determined by `postBlunderBoard.currentPlayer`. Filter on `rm` (opponent=Red) or `ym` (opponent=Yellow) major-threat flags.
5. **`DeepRevealButton`** must be extended — the spec `[VERIFIED]` note was incorrect. Confirmed: the component currently calls `POST /api/explain-move` (not `/api/explain-move-llm`), renders only `patternTag` + `fullText` (no bestLine chips, no Flag button), and its internal `track('deep_reveal_viewed', ...)` fires unconditionally on success (meaning the `onReveal` callback must NOT fire a second `deep_reveal_viewed` to avoid double-tracking). The component must be updated to: (a) switch the fetch target to `/api/explain-move-llm`, (b) adapt the request body from `{ moves, candidateCol, requestDeepReveal: true }` to `{ movestring: moves, col: candidateCol }`, (c) render `explanation` + bestLine chips + Flag button in the revealed state (the `/api/explain-move-llm` response shape is `{ explanation, bestLine, cached? }` — no `patternTag` field), and (d) pass `{ cached: data.cached ?? false }` to `onReveal`.
6. **`deep_reveal_viewed` analytics**: `DeepRevealButton` already fires `track('deep_reveal_viewed', { candidateCol })` internally after a successful fetch. The `onReveal` callback in `MistakeDetailScreen` must NOT fire an additional `deep_reveal_viewed` event — it would double-count. The `onReveal` callback is used only to receive `{ cached }` for any context-specific tracking separate from the general event, or may be omitted entirely.
7. **Navigation params**: blunders array + index passed via `go('mistakeDetail', { blunders, index })`. Prev/Next navigate via local index state, not `go()`.
8. **`mistakes` and `mistakeDetail` screens** already registered as `PlaceholderScreen` in `screenRegistry.jsx` and already mapped to `--bg-home` in `surfaceGroups.js`.
9. **i18n keys**: all new strings under `mistakes.*` namespace.
10. **No migration**: migration 027 already applied in Epic 3b.

---

## Phase 1: Design & Contracts

**Output**: `data-model.md`, `contracts/api.md`, `quickstart.md` — see files for full detail.

### Key design decisions

**`threat_cells` opponent computation**:
```
postBlunderBoard = new Board(board_state + String(move_played))
opponent = postBlunderBoard.currentPlayer  // after placing blunder disc, opponent is next to move
filter: opponent === 1 → flags.rm; opponent === 2 → flags.ym
```
This is correct because `Board.currentPlayer = movestring.length % 2 === 0 ? 1 : 2`. After the blunder move, the movestring length is `board_state.length + 1`. If odd → currentPlayer = 2 (Yellow) = opponent for Red's blunder.

**TopBar meta slot**: `"Move " + (blunder.board_state.length + 1)`. Movestring length = number of moves placed = 0-indexed last move index + 1. Adding 1 gives the 1-based move number of the blunder (the move being reviewed).

**`buildBoard` return shape for `heights`**: The `buildBoard()` function from `src/lib/board.js` returns `{ board, heights }` where `heights[col]` is the number of discs in that column = the row index where the next disc would land. So `heights[move_played]` is the row where the blunder disc lands.

**Detail screen state at navigation**: When the user taps "Mark as reviewed", the local `isReviewed` state flips to `true`. When navigating to the next blunder (Prev/Next), `isReviewed` is re-derived from `blunders[newIndex].resolved_at !== null`. Since the list was fetched once and passed as params, the resolve call does not retroactively update `blunders[index].resolved_at` in the params array — the visual update is local state only, which is correct for the current UX (no re-fetch mid-session).

**`DeepRevealButton` deep reveal analytics**: `DeepRevealButton` internally fires `track('deep_reveal_viewed', { candidateCol })` on every successful response. The `onReveal` callback must NOT fire a second `deep_reveal_viewed` event. In `MistakeDetailScreen`, `onReveal` is used only to receive `{ cached }` for the `FR-019` context-enriched event — but since the component already tracks globally, FR-019 can be satisfied by extending the internal track call inside `DeepRevealButton` to include `context` when provided via a new optional prop, OR by simply accepting the existing global event (which fires without `context: 'past_mistakes'`). Decision: extend `DeepRevealButton` with an optional `trackingContext` prop; the internal `track()` call includes it when present. No `onReveal`-based analytics.

Updated usage in `MistakeDetailScreen`:
```jsx
<DeepRevealButton
  moves={blunder.board_state}
  candidateCol={blunder.correct_move}
  trackingContext="past_mistakes"
/>
```

### Re-check after Phase 1

Constitution re-check: All principles hold after the DeepRevealButton extension decision. The `threat_cells` derivation was verified against `Board` class source code (`rm` = Red major threat, `ym` = Yellow major threat, confirmed in `classifier.js` lines 137–141). The `buildBoard` heights field was verified against `src/lib/board.js` conventions. The `blunders.id` column is confirmed UUID (`gen_random_uuid()`) from `003_puzzles.sql` line 40 — the `parseInt` removal is unambiguously correct. The `DeepRevealButton` endpoint mismatch and analytics double-fire are both addressed by the extension plan above.

**GATE (post-Phase 1): PASS** (with DeepRevealButton extension required)

---

## Implementation Notes for Tasks

### Backend task ordering

1. **Redesign `GET /api/coach/queue`** — prerequisite for all frontend work. Both screens consume `threat_cells` from this response. Cannot test list or detail screen without this.
2. **Fix `POST /api/coach/queue/:blunderId/resolve`** — can be done in parallel with frontend work, but must be done before Gate 5 QA.
3. **Update `api-conventions.md`** — documentation task, can be done after both endpoint tasks.

### Frontend task ordering

4. **Add i18n keys** to `en.json` — prerequisite for all screen rendering.
5. **Build `MistakesListScreen`** (all three variants: gate, empty, populated) — prerequisite for `MistakeDetailScreen` integration. Fetch `?status=all` once on mount; filter tabs operate on the in-memory array. Mark-as-reviewed from the detail screen updates `blunders[index].resolved_at` in local state to keep tab counts accurate without a re-fetch.
6. **Build `MistakeDetailScreen`** — requires blunders array shape from backend. Can be scaffolded with mock data before backend is ready.
7. **Register screens** in `screenRegistry.jsx` — can be done early; replaces placeholders.
8. **Analytics instrumentation** — wired into screens during build. `deep_reveal_viewed` is fired inside `DeepRevealButton` (step 9); do not fire it a second time via `onReveal`. The `mistake_reviewed` event (FR-018) fires on `MistakeDetailScreen` mount. The `screen_viewed` event (FR-008) fires on `MistakesListScreen` mount.
9. **Extend `DeepRevealButton`** — confirmed that the component calls `/api/explain-move` (wrong endpoint). This is a required code change, not a verification step. The implementation task must: (a) change fetch URL to `/api/explain-move-llm`, (b) change request body from `{ moves, candidateCol, requestDeepReveal: true }` to `{ movestring: moves, col: candidateCol }`, (c) replace `data.deepReveal` unwrap with direct `data` since `/api/explain-move-llm` returns `{ explanation, bestLine, cached? }` at top level, (d) replace `patternTag` + `fullText` render with `explanation` + bestLine chips + Flag button render, (e) add optional `trackingContext` prop and thread it into the internal `track()` call, (f) handle `data.cached` to pass to `onReveal`. The existing `track('deep_reveal_viewed', ...)` inside the component must NOT be duplicated in callers.

### Critical implementation details

- **`blunders.id` is UUID**: Confirmed from `003_puzzles.sql` line 40 (`id uuid PRIMARY KEY DEFAULT gen_random_uuid()`). The server's `parseInt(blunderId)` returns `NaN` for every real blunder ID. The fix is to use the raw string with a non-empty string guard: `if (!blunderId || typeof blunderId !== 'string') return res.status(400)...` — no `parseInt`, no `isNaN`.
- **`threat_cells` opponent logic verified**: In `classifier.js` (lines 137–141), `rm = Red major threat (3 Red discs + 1 empty)`, `ym = Yellow major threat (3 Yellow discs + 1 empty)`. The filter `opponent === 1 ? flags.rm : flags.ym` is correct. Getting this backwards would show the user's own threats as `td` overlays instead of the opponent's. Spot-check during implementation: fetch a blunder, run `./visualize_board.sh <board_state + move_played>` and verify major threats listed match `threat_cells` in the API response.
- **`tr` overlay row**: Use `buildBoard(blunder.board_state).heights[blunder.move_played]` — NOT `heights[blunder.move_played] - 1`. The `board_state` is the pre-blunder position; `heights[col]` is the landing row of the next disc in that column.
- **Pattern tag hidden for `unknown`**: `{blunder.pattern_category !== 'unknown' && <span className="tag pat">...</span>}`
- **Empty board_state edge case**: `buildBoard('')` returns an all-empty board with `heights: [0,0,0,0,0,0,0]`. The overlay derivation still works — `heights[move_played] = 0` (bottom row). Render as-is; do not throw.
- **Wrap-around navigation**: `(index - 1 + blunders.length) % blunders.length` for Prev, `(index + 1) % blunders.length` for Next.
- **Deep Reveal panel close on navigation**: set `deepRevealOpen` to `false` in the Prev/Next handlers before updating `index`.
- **`isReviewed` initial state**: derived from `blunders[index].resolved_at !== null` at screen mount AND on index change.
- **Resolve error handling**: on non-204 response, revert `resolving` to `false` and do not flip `isReviewed` to `true`.
