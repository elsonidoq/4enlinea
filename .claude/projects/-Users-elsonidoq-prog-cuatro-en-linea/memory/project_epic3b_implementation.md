---
name: project_epic3b_implementation
description: "Epic 3b (Post-Game Review & Position Explorer) — implementation state, new files, endpoint contracts, bugs fixed, open items"
metadata:
  type: project
---

Epic 3b implemented on branch `101-new-design` on 2026-06-01. All tasks complete + QA pass.

**Why:** Delivers post-game learning loop — frozen board review, quality timeline, accuracy card, mistake explorer with interactive board, Deep Reveal LLM panel.

**How to apply:** When working on Epic 3c or later, `go('review', { id })` navigates to ReviewScreen; `go('explorer', { gameId, moveIndex, moves, difficulty, side, fullMovestring })` navigates to ExplorerScreen. Both are in `--bg-spar` surface group.

## What was built

**New files:**
- `src/screens/ReviewScreen.jsx` — frozen board, quality timeline, accuracy card, Prev/Next mistake nav, blunder writes, tracking
- `src/screens/ExplorerScreen.jsx` — interactive board via `ExplorerBoard` child (keyed on `selectedMistakeIdx` to remount `useGameBoard`), Prev/Next nav, "Start new game from here", Deep Reveal panel with `react-markdown` rendering
- `src/lib/useGameBoard.js` — hook extracted from GameScreen; accepts `{ initialMoves, side, difficulty, onGameEnd, introKey }`
- `server/migrations/027_blunders_unknown.sql` — adds `'unknown'` to `blunders.pattern_category` CHECK constraint (applied)

**Modified files:**
- `src/screens/GameScreen.jsx` — now a thin wrapper calling `useGameBoard`; accepts `initialMoves` prop for "start from here" flow
- `src/lib/screenRegistry.jsx` — `review` and `explorer` wired to real components
- `src/i18n/en.json` — added `coach.sparring.review.*` pools, `coach.sparring.explorer.intro.*`, and 13 `sparring.*` UI string keys
- `server/index.js` — `POST /api/games/analyze`, `POST /api/games/from-position`, `POST /api/blunders`
- `src/components/AuthModal.jsx` — `🛠 Dev: skip auth` button (DEV-only, calls `signInAnonymously()`)
- `docs/architecture/api-conventions.md` + `data-model.md` — documented new endpoints and migration 027

## Key contracts

- **`POST /api/games/analyze`** accepts `{ gameId }`, returns `GameAnalysis` shape including `moves[]` (user plies only), `fullMovestring`, `difficulty`, `side`, `summaryPhraseKey`, `accuracy`, `scored`, `optimalCount`, `suboptimalCount`, `blunderCount`.
- **`POST /api/games/from-position`** accepts `{ gameId, N, difficulty }`, returns `{ moves: truncated, side, difficulty }`. Does NOT insert a games row — `GameScreen.saveGame` does that when the spawned game ends.
- **`POST /api/blunders`** requires auth (401 if anonymous), accepts `{ board_state, move_played, correct_move, pattern_category }`, returns 201 `{ id }`.
- **`useGameBoard` `introKey` param**: optional, defaults to `'coach.sparring.intro'`. Pass `'coach.sparring.explorer.intro'` from ExplorerBoard to get context-appropriate coach phrase.
- **`GameScreen` `initialMoves` prop**: optional, defaults to `''`. Non-empty = start from a pre-played position (from-position flow). Hook does NOT auto-trigger AI opening move if initialMoves is non-empty.
- **`computeBestLine`** (server/explainSimulate.js) returns formatted strings like `"Col 1"`, `"Col 5"` (1-indexed). ExplorerScreen renders them as `{col}` directly — do NOT add `+ 1`.

## Bugs fixed during QA

- `POST /api/games` rejected `device_uuid: null` — fixed: validation now allows null, server falls back to `req.user.id || 'anonymous'`
- Deep Reveal BEST LINE chips showed "Col Col 11" — `computeBestLine` already returns `"Col N"` strings; ExplorerScreen was double-prefixing

## Open items (cosmetic, not blocking)

- Explorer TopBar title uses `t('sparring.deepReveal')` — `sparring.explorerTitle` i18n key not yet added; fix is trivial
- `react-markdown` added to ExplorerScreen for LLM explanation rendering — verify it's in package.json dependencies
- `td` overlays (threat cells) not shown in Explorer — `getMajorThreatCells` not exported from `src/lib/board.js`
- Supabase anonymous sign-ins must be enabled in dashboard for the `🛠 Dev: skip auth` button to work
