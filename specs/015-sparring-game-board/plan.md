# Implementation Plan: Sparring — Difficulty Picker & Game Board (Epic 3a)

**Branch**: `101-new-design` | **Date**: 2026-06-01 | **Spec**: `specs/015-sparring-game-board/spec.md`

---

## Summary

Implement the Sparring surface: a Difficulty Picker screen that feeds a Game Board screen where the user plays Connect Four against the AI with real-time Coach commentary, hints, deliberate-mistake mechanics, and game-record persistence. The primary technical work is: (1) extracting `checkWin` from `HomePage.jsx` into `src/lib/board.js`; (2) two new React screens (`DifficultyPickerScreen`, `GameScreen`) wired into the existing `screenRegistry.jsx`; (3) a new `POST /api/games` endpoint backed by a DB migration; (4) extending `aiDifficulty.js` with a deliberate-mistake trigger layer that calls `POST /api/scores`.

---

## Technical Context

**Language/Version**: JavaScript (Node 20+) / React 18; Vite build  
**Primary Dependencies**: react-i18next (i18n), `@supabase/supabase-js` (DB), existing `sampleColumnFromScores`/`DIFFICULTY_TEMPERATURES` in `aiDifficulty.js`  
**Storage**: PostgreSQL via Supabase service-role client; new `games` table (migration `026_games.sql`)  
**Testing**: Manual golden-path + edge-case verification per Constitution §III; unit test for deliberate-mistake trigger logic  
**Target Platform**: Mobile-first PWA (React SPA)  
**Performance Goals**: Coach dialog updates within 1 second per SC-002; AI response shows loading state within 200 ms  
**Constraints**: No numeric solver scores surfaced in UI; commit-first (no confirmation step); back-stack via `goBack()` only; anonymous games allowed (`user_id = null`)  
**Scale/Scope**: 2 new screens, 1 new endpoint, 1 DB migration, ~4 i18n key pools (≥2 entries each), extension of `aiDifficulty.js`

---

## Constitution Check

*GATE: Must pass before implementation.*

**Principle I — Explanation Engine** (partial — see Complexity Tracking deviation note):  
- [x] User-move Coach phrase: routed through `POST /api/evaluate-move` (existing). Returns `coachPhraseKey` / `coachMood` — no raw English. When `coachPhraseKey` is null (no pattern detected), client picks from `coach.sparring.user_move.generic.*` pool — never leaves CoachDialog blank.  
- [~] Hint scores: routed through `POST /api/scores`; only best-column overlays surfaced, no numeric values (FR-012). **MVP intentionally skips `classify()` for Hint — pattern-named hint phrases are post-MVP (see Complexity Tracking).**  
- [x] Deliberate-mistake column selection: routed through `POST /api/scores`; no scores exposed to user.  
- [x] AI-move Coach phrase: picked from `coach.sparring.ai_move.*` i18n pool via `pickFromPool` pattern — no raw English.

**Principle II — Code Quality**:  
- [x] `checkWin` extraction is a prerequisite task (not duplicated inline).  
- [x] Deliberate-mistake logic isolated in `aiDifficulty.js`; no inline implementation in screen component.  
- [x] Store access only via `useStore()` — never direct `IndexedDBStore`/`SupabaseStore`.

**Principle III — Testing**:  
- [x] Unit test for deliberate-mistake trigger + second-best selection logic (trigger rates, all-tied abort, forced-move skip).  
- [x] Manual golden-path verification: start game, play moves, Coach updates, hint overlays, game end + navigation to `review`.  
- [x] Manual edge case: `side='second'` (AI-first); verify Coach phrase uses user's perspective (parity bug check).

**Principle IV — UX Consistency**:  
- [x] `tg` overlay type for hint — consistent with locked OverlayType enum.  
- [x] No numeric scores surfaced anywhere (spec FR-012, cross-cutting Hints rule).  
- [x] Commit-first: move committed immediately on column tap (no pending-move confirmation).

**Principle V — Performance**:  
- [x] AI response: board locked during fetch; loading state visible within 200 ms.  
- [x] `POST /api/games` failure: non-blocking — navigate to `review` with no `id` on error.

**Principle VI — Methodology**:  
- [x] Sentinel value for full/invalid columns: `INVALID_MOVE = -1000` (defined in `aiDifficulty.js`; `server/index.js` uses `> -1000` filter at line 539). Same constant to be imported/reused in deliberate-mistake logic.  
- [x] All required fields traced to sources in data-model.md and contracts/ before code is written.  
- [x] Parity bug (AI-first) documented as manual QA requirement — not assumed fixed.

**Principle VIII — Documentation**:  
- [x] Architecture docs (`frontend-conventions.md`, `server-conventions.md`, `api-conventions.md`) read before planning.  
- [x] `games` table schema → `docs/architecture/data-model.md` update required.  
- [x] `POST /api/games` contract → `docs/architecture/api-conventions.md` update required.  
- [x] Store method usage (`saveSparringRecord`, `recordActivityDay`) already in `frontend-conventions.md` — no new doc needed.

---

## Project Structure

### Documentation (this feature)

```text
specs/015-sparring-game-board/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/
│   └── api-games.md     ← POST /api/games contract
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code

```text
connect-four/
├── server/
│   ├── index.js                    ← add POST /api/games handler
│   └── migrations/
│       └── 026_games.sql           ← new games table
│
└── src/
    ├── lib/
    │   ├── board.js                ← export checkWin (extracted from HomePage.jsx)
    │   └── aiDifficulty.js         ← add deliberateMistakeCol() + MISTAKE_RATES
    ├── screens/
    │   ├── DifficultyPickerScreen.jsx   ← new
    │   └── GameScreen.jsx               ← new
    └── lib/
        └── screenRegistry.jsx      ← wire difficulty + game screens (replace PlaceholderScreen)
    └── i18n/
        └── en.json                 ← add coach.sparring.* key pools
```

---

## Complexity Tracking

**Deliberate Principle I deviation — MVP Hint skips classifier layer (documented)**:
The MVP Hint feature calls `POST /api/scores` and surfaces only `tg` overlays + a generic `coach.sparring.hint.generic.*` phrase. It intentionally does NOT call `classify()` or return a pattern-named `coachPhraseKey`. This is a known Principle I deviation: pattern-named hint phrases (e.g. "This sets up a fork") are deferred as a post-MVP follow-up. The Constitution Check below is marked 'partial' for Hint accordingly.

---

## Phase 0: Research

*All NEEDS CLARIFICATION resolved before design.*

See `research.md` for full findings. Key resolved items:

| Question | Resolution |
|---|---|
| Sentinel value for invalid/full columns in `/api/scores` | `INVALID_MOVE = -1000` (both `aiDifficulty.js` line 1 and `server/index.js` line 539 `> -1000` filter). Import and reuse the constant. |
| How `device_uuid` is obtained client-side | `const { store } = useStore(); const profile = await store.getProfile();` → `profile.device_uuid`. |
| `store.saveSparringRecord` + `recordActivityDay` availability | Both implemented in `IndexedDBStore.js` (lines 128, 177). Method stubs exist in `SupabaseStore.js` per Epic 7. Interface is ready. |
| `checkWin` current location | Private function in `connect-four/src/pages/HomePage.jsx` at line 39. Signature: `checkWin(board, row, col, color)`. Returns `boolean`. Must be extracted to `src/lib/board.js` and exported before any new caller can use it. |
| Screen keys for sparring surface | `difficulty`, `game`, `review`, `explorer` — all registered as `PlaceholderScreen` stubs in `screenRegistry.jsx`. This epic replaces `difficulty` and `game`. |
| `CoachDialog` fixed prop | Accepted by `CoachDialog` at line 4 of `CoachDialog.jsx`. No layout changes needed. |
| `TopBar` `meta` and `rightIcon` | `TopBar` accepts `meta` (string), `rightIcon` (icon name), `onRight` (handler). Gear non-functional: pass `rightIcon="gear"` with `onRight={() => {}}`. |
| Deliberate-mistake trigger rates | Spec FR-019: Easy ~1/4, Medium ~1/7, Hard ~1/15, Perfect never. Implemented as Bernoulli trial per AI move: `Math.random() < MISTAKE_RATES[difficulty]` where `MISTAKE_RATES = { easy: 1/4, medium: 1/7, hard: 1/15, perfect: 0 }`. |
| Next migration number | Current highest is `025_puzzle_attempts_session_id.sql` → new migration is `026_games.sql`. |
| `go()` and `goBack()` patterns | `go(screenKey, params)` navigates forward; `goBack()` restores `prevScreen`. Back from `difficulty` → `home`; back from `game` → `difficulty`. |
| AI-first parity bug scope | Known bug (`project_parity_bug_ai_first`). NOT fixed in this epic. A manual QA task is required post-implementation. |

---

## Phase 1: Design & Contracts

### Data Model

See `data-model.md` for the complete entity diagram. Key entities:

**`games` table** (new, migration `026_games.sql`):

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `user_id` | `uuid` | nullable FK → `auth.users(id)` |
| `device_uuid` | `text` | NOT NULL |
| `moves` | `text` | NOT NULL (0-indexed movestring `[0-6]*`) |
| `difficulty` | `text` | NOT NULL, check IN ('easy','medium','hard','perfect') |
| `side` | `text` | NOT NULL, check IN ('first','second') |
| `result` | `text` | NOT NULL, check IN ('win','loss','draw') |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

Index: `(device_uuid, created_at DESC)` for Epic 3b lookup.  
RLS: Disabled (service-role key bypasses RLS per constitution).  
Grant: `GRANT SELECT, INSERT ON games TO anon, authenticated;` (Supabase PostgREST rule per `project_supabase_grants.md`).

### Interface Contracts

See `contracts/api-games.md` for full contract. Summary:

**`POST /api/games`**  
- Request: `{ device_uuid: string, moves: string, difficulty: 'easy'|'medium'|'hard'|'perfect', side: 'first'|'second', result: 'win'|'loss'|'draw' }`  
- Response (201): `{ id: string (uuid) }`  
- Auth: Optional. `req.user` populated by `loadUser` middleware; `user_id = req.user?.id ?? null`.  
- Validation: `moves` matches `/^[0-6]{0,42}$/`; `difficulty` ∈ valid set; `side` ∈ valid set; `result` ∈ valid set.  
- Errors: 400 for validation failure; 503 if Supabase not configured.

**`POST /api/evaluate-move`** (existing — no changes to handler):  
- Request body (exact shape): `{ movestring: <string before user's move>, col: <0-indexed integer> }`  
- For `side='first'`: `movestring` is the current game movestring **before** the user's column was appended; `col` is the user's chosen column (0-indexed).  
- For `side='second'`: `movestring` is the AI's opening move string only (e.g. `"3"`); `col` is the user's column. Do **not** pass the AI move + user move concatenated — the handler expects the string **before** the user's move.  
- Response: `{ badge, quality, coachPhraseKey, coachMood, summaryLineKey, patternTag }`.

**`POST /api/scores`** (existing — no changes):  
- Request: `{ moves: string, depth?: number }`  
- Response: `{ scores: number[7] }` — sentinel `<= -1000` for full/invalid columns.  
- Callers MUST filter with `score > INVALID_MOVE` before ranking.

### Key Design Decisions

#### 1. `checkWin` extraction (prerequisite)

`checkWin(board, row, col, color)` is extracted from `HomePage.jsx` (line 39) and added as a named export to `connect-four/src/lib/board.js`. `HomePage.jsx` updated to import from `board.js` instead of defining locally. No behavioral change — identical implementation.

**Why first**: `GameScreen.jsx` and any future caller depend on this export. Must land before `GameScreen` is written to avoid merge conflicts.

#### 2. `aiDifficulty.js` extension

Two additions:

```js
// Trigger rates (Bernoulli trial per AI move)
export const MISTAKE_RATES = { easy: 1/4, medium: 1/7, hard: 1/15, perfect: 0 };

/**
 * Given scores from POST /api/scores, return the second-best legal column.
 * "Second-best" = highest score strictly below the maximum among legal columns.
 * Returns null if: fewer than 2 legal columns, or all legal columns tie the max.
 * Never returns a sentinel-masked column.
 * Imports INVALID_MOVE from the top of this file (already exported).
 */
export function secondBestColumn(scores) {
  // INVALID_MOVE is imported from the top of aiDifficulty.js — do NOT redeclare.
  const legal = scores
    .map((s, i) => ({ score: s, col: i }))
    .filter(({ score }) => score > INVALID_MOVE);
  if (legal.length < 2) return null;
  const maxScore = Math.max(...legal.map(e => e.score));
  const belowMax = legal.filter(e => e.score < maxScore);
  if (belowMax.length === 0) return null; // all tied
  const best = belowMax.reduce((a, b) => b.score > a.score ? b : a);
  return best.col;
}
```

**Why isolated**: Isolating the function makes the unit test straightforward (pure function, no React dependency).

**Deliberate-mistake sequencing**: When the Bernoulli trial fires, **skip softmax sampling entirely** — call `POST /api/scores` once and play `secondBestColumn()`. Only fall back to normal sampling (with `coach.sparring.ai_move.*` phrase) if `secondBestColumn()` returns `null` (all-tied or forced move). Do not call `sampleColumnFromScores` on a mistake turn before the scores fetch.

#### 3. `GameScreen.jsx` state machine

The game follows a clear state machine:

```
IDLE (not mounted)
  ↓ mount
PRE_GAME (if side='first')  ──────────────────────────────────────┐
  ↓ user taps column                                               │
USER_MOVING (commit immediately, POST /api/evaluate-move)         │
  ↓ win/draw detected                                             │
GAME_OVER                                                         │
  ↓ response, no end                                             │
AI_THINKING (delay, POST /api/scores if mistake trigger)          │
  ↓ AI move committed, win/draw check                            │
  ↓──────────────────────────────────────────────────────────────┘

if side='second': mount → AI_THINKING (auto-play opening) → PRE_GAME
```

State variables:
- `moveHistory: number[]` — 0-indexed column array; length determines turn parity
- `board: string[][]` — reconstructed from moveHistory via `buildBoard()`
- `coachMessages: {text, faded?, lead?, mood}[]`
- `hintOverlays: {c,r,type}[]` — `[]` when no hint active
- `gameOver: {result, winnerColor} | null`
- `aiThinking: boolean`
- `lastDrop: {c,r} | null`

**No separate `turn` state**: turn is derived from `moveHistory.length % 2`. `side='first'` → user plays `'red'` (even indices); `side='second'` → user plays `'yellow'` (odd indices). This derives cleanly from `moveHistory` without a separate enum.

**Board prop name**: The real `Board` component's column-tap handler prop is `onColumnClick` (not `onColumn` as named in the mockup). Use `onColumnClick` in all `GameScreen` code.

**Color from side**: `userColor = side === 'first' ? 'red' : 'yellow'`. User's discs render as Green (`'red'` value) when first, Gray (`'yellow'`) when second (color-inversion quirk documented in project memory).

#### 4. Hint overlay logic

> **Mockup divergence — MUST NOT implement**: The numeric heat-row of per-column solver scores shown in `screens_sparring.jsx` is **not built** and **must never be implemented**. The Hint surface shows only `tg` overlays on the board plus a `coach.sparring.hint.generic.*` phrase in the CoachDialog. Solver scores are never shown to the user.

On hint tap → `POST /api/scores` with `{ moves: currentMovestring }`:
```js
const maxScore = Math.max(...scores.filter(s => s > INVALID_MOVE));
const bestCols = scores
  .map((s, i) => ({ score: s, col: i }))
  .filter(({ score }) => score > INVALID_MOVE && score === maxScore);
```
Overlays: `bestCols.map(({ col }) => ({ c: col, r: heights[col], type: 'tg' }))`.

Hint dismissed on next user move (clear `hintOverlays` before committing disc).

#### 5. Game-end + persistence

Win detection is called after every move (human and AI):
```js
const newBoard = buildBoard(newMoves).board;
const row = newHeights[col];
if (checkWin(newBoard, row, col, movedColor)) → GAME_OVER with result
else if (newMoves.length === 42) → GAME_OVER with draw
```

On `GAME_OVER`:
1. `POST /api/games` with full fields — fire-and-forget for navigation (on failure, navigate with `id: null`).
2. On response: `store.saveSparringRecord(result)`, `store.recordActivityDay()`, `track('game_ended', ...)`.
3. Navigate: `go('review', { id })` — `id` is `null` on network failure (Epic 3b handles missing ID).

**Resign**: Sets `result: 'loss'` immediately, skips win detection, goes to step 1.

#### 6. `DifficultyPickerScreen.jsx` state

Minimal local state:
- `diff: string` — initialized `'medium'`
- `side: 'first' | 'second'` — initialized `'first'` (Green / moves first)

On "Start game": `track('game_started', { difficulty: diff, side })` then `go('game', { difficulty: diff, side })`.

#### 7. i18n key pools

New pools in `en.json` (minimum 2 entries each):

```json
"coach": {
  "sparring": {
    "intro": {
      "0": "Ready to play? I'll give you a real fight.",
      "1": "Let's see what you've got. Good luck."
    },
    "ai_move": {
      "0": "I'll take that.",
      "1": "Interesting. Let's see.",
      "2": "Hmm. My turn."
    },
    "deliberate_mistake": {
      "0": "Oops — did I just give you something?",
      "1": "I may have slipped there. Can you punish it?"
    },
    "hint": {
      "generic": {
        "0": "The best move is highlighted — trust the column.",
        "1": "Look at the highlighted column. What does it set up?"
      }
    },
    "user_move": {
      "generic": {
        "0": "Interesting choice. Let's see how it plays out.",
        "1": "Got it. Now watch how I respond.",
        "2": "Noted. Your move is on the board."
      }
    }
  }
}
```

The server's `POST /api/evaluate-move` returns `coachPhraseKey` for user moves (existing). All AI-side phrases are picked client-side with a simple `pickFromPool`-equivalent:
```js
function pickPhrase(pool) {
  const keys = Object.keys(pool);
  return pool[keys[Math.floor(Math.random() * keys.length)]];
}
```
The client resolves via `t(key)` — matching the `pickFromPool` convention used server-side.

#### 8. AI-first game (side='second')

On mount when `side='second'`:
1. Show intro phrase.
2. Immediately call `makeAiMove()` with empty movestring.
3. Board stays `canPlay={false}` until AI move settles.
4. AI phrase shown from `coach.sparring.ai_move.*`.
5. Board becomes interactive.

**Parity note**: User's first move is at index 1 (odd = Yellow). `POST /api/evaluate-move` receives the full movestring (AI's move + user's move). The parity bug (`project_parity_bug_ai_first`) means evaluate-move may return the quality from the wrong player's perspective. This is NOT fixed here — manual QA task added to verify post-implementation.

---

## Implementation Sequence

Tasks are ordered to resolve all dependencies before each step. Detailed task breakdown in `tasks.md` (generated by `/speckit-tasks`).

**Phase A — Prerequisite (blocks everything)**
1. Extract `checkWin` → `src/lib/board.js` (export + update `HomePage.jsx` import). Also add a smoke-check assertion confirming that `buildBoard`'s row-major orientation matches the `(board, row, col, color)` indexing expected by `checkWin` — call `checkWin` on a known win position produced by `buildBoard` and assert `true`.

**Phase B — Backend (no frontend dependency)**
2. DB migration `026_games.sql` — create `games` table
3. `POST /api/games` endpoint in `server/index.js`
4. Update `docs/architecture/api-conventions.md` with `POST /api/games` contract
5. Update `docs/architecture/data-model.md` with `games` table schema

**Phase C — Logic layer (depends on Phase A)**
6. Extend `aiDifficulty.js`: add `MISTAKE_RATES` and `secondBestColumn()` exports
7. Unit test for `secondBestColumn()` (all-tied abort, second-best selection, sentinel filtering, forced-move)

**Phase D — i18n (no other dependency)**
8. Author `coach.sparring.*` key pools in `en.json`

**Phase E — Screens (depends on A, B, C, D)**
9. `DifficultyPickerScreen.jsx` — static UI + navigation
10. `GameScreen.jsx` — full game loop (see design decisions above)
11. Wire `difficulty` and `game` in `screenRegistry.jsx`

**Phase F — QA**
12. Manual golden-path: start as first player, play to win, verify Coach updates, hint overlays, game saved, navigation to `review`
13. Manual edge case: `side='second'` — verify AI auto-plays opening, board locks until AI move settles
14. Manual edge case: resign — verify `result: 'loss'` sent
15. Manual QA: AI-first parity check — verify evaluate-move quality badge reflects user's move quality, not AI's

---

## Sequencing Rationale & Trade-offs

**`checkWin` extraction is truly the first task**: `GameScreen.jsx` imports it; if extraction happens after the screen is written, there will be a merge conflict or a duplicate definition. Extract first, update import in `HomePage.jsx`, commit.

**DB migration before endpoint**: `POST /api/games` cannot be tested without the `games` table. Migration must be applied before functional testing of the endpoint.

**`secondBestColumn` unit test written before `GameScreen`**: Ensures the deliberate-mistake trigger logic is verified before it is wired into the game loop. Avoids discovering a logic bug only through manual gameplay.

**`DifficultyPickerScreen` before `GameScreen`**: No dependency, but it is simpler and provides a working navigation entry point to the game screen during development.

**Deferred**:
- Pattern-named hint phrases: post-MVP. MVP uses only `coach.sparring.hint.generic.*` (spec FR-012).
- AI-first parity bug fix: explicitly out of scope; flagged as manual QA.
- Post-game review screen (`review`): Epic 3b. Navigation terminates at `go('review', { id })`.
- Settings screen (gear icon): non-functional placeholder for MVP (epics.md post-MVP section).

---

## Open Risks

| Risk | Mitigation |
|---|---|
| `POST /api/games` network failure at game end | Non-blocking: catch error, navigate with `id: null`. Epic 3b handles missing ID. |
| Deliberate-mistake double-call of `POST /api/scores` (hint + mistake same turn) | Hint is for user turn only; deliberate mistake fires on AI turn only. These are mutually exclusive by turn parity. |
| AI-first parity bug makes Coach quality look wrong | Known bug, not fixed here. Manual QA task documents the verification step. |
| All columns full before game-end detection fires | Board-full check runs after every move (human and AI) via `newMoves.length === 42` guard. |
