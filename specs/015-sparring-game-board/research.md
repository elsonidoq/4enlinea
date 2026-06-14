# Research: Sparring Game Board (Epic 3a)

**Feature**: `specs/015-sparring-game-board`  
**Date**: 2026-06-01

---

## Resolved Unknowns

### Sentinel value for full/invalid columns in `POST /api/scores`

**Decision**: `INVALID_MOVE = -1000`  
**Rationale**: Defined as a module-level constant in `connect-four/src/lib/aiDifficulty.js` line 1. `server/index.js` uses the same threshold at line 539: `scores[c] > -1000`. Both client and server filter using `score > INVALID_MOVE`. Import and reuse the exported constant from `aiDifficulty.js` in all callers.  
**Alternatives considered**: Using `null` or a special string sentinel — not applicable here; the solver already uses `-1000` as a numeric sentinel.

---

### `device_uuid` client-side access

**Decision**: `const { store } = useStore(); const profile = await store.getProfile();` → `profile.device_uuid`  
**Rationale**: `IndexedDBStore.getProfile()` (line 42) creates a `device_uuid` via `generateUUID()` on first call and stores it in the `profile` object store. This is the canonical device identity for anonymous persistence.  
**Alternatives considered**: Generating `device_uuid` inline in the screen — violates Constitution §II (storage-agnostic interface must be honored).

---

### Store method availability for Epic 3a

**Decision**: `saveSparringRecord(result)` and `recordActivityDay()` both exist in `IndexedDBStore.js` (lines 128, 177) and are part of the required store interface in `frontend-conventions.md`. No stub needed.  
**Rationale**: Epic 7 shipped these methods. The interface contract is already in `docs/architecture/frontend-conventions.md`.

---

### `checkWin` extraction details

**Decision**: Extract to `src/lib/board.js` as a named export; update `HomePage.jsx` to import from there.  
**Source**: `connect-four/src/pages/HomePage.jsx`, line 39–54. Signature: `checkWin(board: string[][], row: number, col: number, color: string): boolean`. Uses row-major `board[row][col]` with cell values `'empty'`/`'red'`/`'yellow'` — matching `board.js` convention exactly.  
**Rationale**: `frontend-conventions.md` establishes `src/lib/board.js` as the canonical location for board utilities. `buildBoard` is already there.  
**Alternatives considered**: Duplicating `checkWin` in each consumer — violates DRY and Constitution §II (no half-finished duplications).

---

### Screen keys and current registration

**Decision**: `difficulty` and `game` are already registered as `PlaceholderScreen` stubs in `screenRegistry.jsx`. This epic replaces both with real implementations.  
**Rationale**: `src/lib/screenRegistry.jsx` has stubs for all 15 screen keys. `review` and `explorer` remain as stubs (Epic 3b).

---

### Deliberate-mistake trigger rates

**Decision**: `MISTAKE_RATES = { easy: 1/4, medium: 1/7, hard: 1/15, perfect: 0 }` — Bernoulli trial per AI move.  
**Rationale**: Spec FR-019 specifies rates as "approximately every N AI moves". A Bernoulli trial with probability `1/N` achieves the target average rate without tracking per-game state. `perfect: 0` means `Math.random() < 0` never fires.  
**Alternatives considered**: Fixed countdown timer (every exactly N moves) — too deterministic, gives predictable exploit at Easy.

---

### Migration number

**Decision**: `026_games.sql`  
**Rationale**: Current highest migration is `025_puzzle_attempts_session_id.sql`. Next sequential number is 026.

---

### Navigation pattern from `game` to `review`

**Decision**: `go('review', { id })` where `id` is the UUID returned by `POST /api/games` (or `null` on failure).  
**Rationale**: `go(screenKey, params)` is the sole navigation mechanism per `frontend-conventions.md`. Epic 3b reads `id` from `params` to fetch game data. Passing `null` is acceptable — Epic 3b must handle a missing game ID gracefully (spec edge-case note).

---

### CoachDialog integration for `fixed` prop

**Decision**: Use `<CoachDialog fixed messages={coachMessages} size={46} />` above the board.  
**Rationale**: `CoachDialog.jsx` line 4 accepts `fixed` prop; it switches to a fixed-height layout that does not push board content. Mockup `screens_sparring.jsx` uses `size={46}`. The `messages` array format is `{ text, faded?, lead?, mood }`.

---

### `TopBar` gear icon

**Decision**: `<TopBar title="Game" onBack={() => goBack()} meta={"Move " + (moveHistory.length + 1)} rightIcon="gear" onRight={() => {}} />`  
**Rationale**: `TopBar` accepts `rightIcon` and `onRight` props. Empty `onRight` handler satisfies FR-010 (gear visible but non-functional). `meta` increments after each move by using `moveHistory.length + 1` as display count (1-based for the *next* move label, matching mockup "Move 14" convention).  
**Alternative**: Show current move count post-move: `moveHistory.length` — also valid; implementation detail for screen author.

---

### `buildBoard` return shape vs `GameScreen` needs

**Decision**: `buildBoard(moves)` returns `{ board, heights }`. `GameScreen` uses `heights` to compute the landing row for overlays and `lastDrop`.  
**Rationale**: `board.js` exports `buildBoard` which returns both fields. No additional utility needed.

---

### User color vs display color (inversion quirk)

**Decision**: `userColor = side === 'first' ? 'red' : 'yellow'`. `'red'` renders as Green disc; `'yellow'` renders as Gray disc (inversion documented in `reference_board_color_inversion.md`).  
**Rationale**: `side='first'` = moves first = even-index moves = `'red'` cell value = Green display. `side='second'` = odd-index moves = `'yellow'` cell value = Gray display. The spec acknowledges this (Assumptions section).

---

## Best Practices Applied

### Commit-first (no confirmation)

Per `project_commit_first_no_confirm.md`: move committed immediately on column tap. `pendingMove` state does not exist in `GameScreen`. Board locked via `canPlay={userTurn && !gameOver && !aiThinking}`.

### Fire-and-forget `POST /api/games`

Per `api-conventions.md` Fire-and-forget pattern: send request, don't await for navigation. On success callback: call store methods, track, navigate. On failure: navigate without id. No blocking spinner shown to user for the save.

### `pickFromPool` pattern (client-side variant)

Server uses `pickFromPool(i18nTranslations, prefix)`. Client equivalent:
```js
function pickSparringPhrase(t, prefix, sparringKeys) {
  const keys = Object.keys(sparringKeys);
  const key = keys[Math.floor(Math.random() * keys.length)];
  return { phraseKey: `${prefix}.${key}`, text: t(`${prefix}.${key}`) };
}
```
All phrases resolved via `t(key)` — never raw English strings.
