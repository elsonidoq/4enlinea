---
name: project_epic3a_implementation
description: "Epic 3a (Sparring: Difficulty Picker & Game Board) — implementation state, new files, endpoint contract, and handoff for Epic 3b"
metadata: 
  node_type: memory
  type: project
  originSessionId: a27b8834-058b-49c1-8abd-238fa602d96a
---

Epic 3a implemented on branch `101-new-design` on 2026-06-01. All 18 tasks complete + 2 QA bug fixes.

**Why:** Delivers the Sparring surface — difficulty picker, AI game loop with Coach commentary, hints, deliberate mistakes, and game persistence.

**How to apply:** When working on Epic 3b (Post-Game Review & Position Explorer), `go('review', { id })` is the terminal action. Game records are in the `games` table with `id` passed as navigation param. [[project_sparring_games_table]]

## What was built

**New files:**
- `src/screens/DifficultyPickerScreen.jsx` — 4 radio rows (Medium DEFAULT), Play-as cards (Green=first/Gray=second), Start → `go('game', { difficulty, side })`
- `src/screens/GameScreen.jsx` (429 lines) — full game loop: commit-first move, CoachDialog, AI response, hints, deliberate mistakes, game-end persistence, Resign
- `server/migrations/026_games.sql` — `games` table (applied to dev DB 2026-06-01)
- `tests/unit/aiDifficulty.test.js` — 10 tests for `secondBestColumn` + `MISTAKE_RATES`, all passing

**Modified files:**
- `src/lib/board.js` — added `checkWin(board, row, col, color)` as named export
- `src/pages/HomePage.jsx` — imports `checkWin` from board.js
- `src/lib/aiDifficulty.js` — added `export INVALID_MOVE`, `MISTAKE_RATES`, `secondBestColumn(scores)`
- `server/index.js` — `POST /api/games` handler at line 1134; validates 5 fields, returns `{id}` 201
- `src/i18n/en.json` — `coach.sparring.*` key pools (intro/ai_move/deliberate_mistake/hint.generic/user_move.generic)
- `src/lib/screenRegistry.jsx` — `difficulty` and `game` wired to real components
- `src/lib/surfaceGroups.js` — sparring token fixed: `--bg-sparring` → `--bg-spar` (was a pre-existing mismatch)
- `docs/architecture/api-conventions.md` — `POST /api/games` contract
- `docs/architecture/data-model.md` — `games` table schema

## Key contracts for Epic 3b

- **Navigation**: `go('review', { id })` where `id` is the game UUID from `POST /api/games`. `id` is `null` on network failure — Epic 3b MUST handle missing ID gracefully.
- **`games` table**: columns `id, user_id (nullable), device_uuid, moves, difficulty, side, result, created_at`. `moves` is 0-indexed movestring `[0-6]*`. `side` ∈ `'first'|'second'`. `result` ∈ `'win'|'loss'|'draw'`.
- **`POST /api/games`** returns `{ id }` 201. Anonymous users write with `user_id = null`. Auth header included when `session?.access_token` exists.
- **Store methods used**: `store.saveSparringRecord(result)`, `store.recordActivityDay()` — both exist in `IndexedDBStore` and `SupabaseStore`.
- **`checkWin`** is now in `src/lib/board.js` — import from there in Epic 3b screens.

## Non-obvious gotchas

- **`secondBestColumn` task spec had wrong expected value**: T005(a) said `[0,5,10,8,-1000,3,7]` returns col 1 (score 5), but the algorithm finds col 3 (score 8). Implementation follows the algorithm, not the erroneous test expectation.
- **React closure with `moveHistory`**: `saveGame` accepts optional `finalMoves` param because `commitAiMove` calls it after `setMoveHistory` — the state hasn't updated yet. Pass `newHistory` explicitly.
- **`pickRandomKey` probing pattern**: `GameScreen` uses `t(fullKey) !== fullKey` to detect available i18n keys in a pool. i18next returns the key itself when not found.
- **Navigator passes `go`/`goBack` as props**: `<ScreenComponent go={go} goBack={goBack} {...params} />` in App.jsx line 48. Difficulty and side from `go('game', { difficulty, side })` land as direct props on GameScreen.
- **Board color inversion**: `'red'` → green disc, `'yellow'` → gray. `side='first'` user plays `'red'`, `side='second'` user plays `'yellow'`.
- **`coachPhraseKey` null fallback**: When `POST /api/evaluate-move` returns `coachPhraseKey: null`, pick random from `coach.sparring.user_move.generic.*`. CoachDialog must never be blank.

## Deliberate stubs (Epic 3b scope)

- `review` screen is `PlaceholderScreen` — `go('review', { id })` lands on a stub.
- Gear icon in GameScreen TopBar is `onRight={() => {}}` — non-functional placeholder.
- Pattern-named hint phrases (post-MVP) — hint uses `coach.sparring.hint.generic.*` only.

## QA results (2026-06-01)

25/25 acceptance scenarios PASS. Two bugs found and fixed:
- `surfaceGroups.js` had `--bg-sparring` → fixed to `--bg-spar`
- `saveGame()` missing Authorization header for authenticated users → added `session?.access_token`
