# Quickstart: Post-Game Review & Position Explorer (Epic 3b)

## Prerequisites

- Epic 3a complete: `GameScreen`, `POST /api/games`, migration 026 applied.
- Epic 2a complete: `moveQualityScorer.js` (`scoreMove`), `POST /api/evaluate-move` endpoint.
- Epic 2b complete: `POST /api/explain-move-llm` with cache wiring, `explanation_cache` table.

## Development flow

1. Apply migration 027 (blunders constraint + `'unknown'` sentinel).
2. Extract `useGameBoard` hook from `GameScreen.jsx`.
3. Refactor `GameScreen` to consume `useGameBoard` (no behavior change).
4. Implement `POST /api/games/analyze` endpoint.
5. Implement `POST /api/games/from-position` endpoint.
6. Author i18n key pools in `en.json`.
7. Implement `ReviewScreen` component.
8. Implement `ExplorerScreen` component (with `useGameBoard`).
9. Wire screen registry (replace `PlaceholderScreen` entries).
10. Manual QA: play a game, review it, enter Explorer, verify disc colors.

## Key file locations

| File | Role |
|---|---|
| `connect-four/server/migrations/027_blunders_unknown.sql` | Add `'unknown'` to blunders CHECK |
| `connect-four/server/index.js` | Add `POST /api/games/analyze` and `POST /api/games/from-position` |
| `connect-four/server/moveQualityScorer.js` | Shared scorer — import `scoreMove` |
| `connect-four/src/lib/useGameBoard.js` | **New** — extracted hook from GameScreen |
| `connect-four/src/screens/GameScreen.jsx` | Refactored to use `useGameBoard` |
| `connect-four/src/screens/ReviewScreen.jsx` | **New** |
| `connect-four/src/screens/ExplorerScreen.jsx` | **New** |
| `connect-four/src/lib/screenRegistry.jsx` | Replace placeholder entries for `review`, `explorer` |
| `connect-four/src/i18n/en.json` | Add `coach.sparring.review.clean.*` and `coach.sparring.review.mistakes.*` pools |

## Manual QA gates

1. **AI-first parity (FR-016)**: Play as Gray (side='second'), resign after ≥3 moves. Enter Explorer at move 1. Play any column. Verify disc renders as **Gray** (not Green). This is the parity bug QA gate.
2. **Accuracy edge case**: Play a game where all user moves are forced (very short game with full columns). Verify accuracy card shows `--`.
3. **Clean game**: Play a perfect game. Verify Coach shows clean-pool phrase and Prev/Next buttons are disabled.
4. **Blunder write**: Authenticated user plays a game with at least 1 blunder. Verify `blunders` table has a new row with `puzzle_id = null` and valid `pattern_category`.
5. **Deep Reveal auth gate**: As anonymous user, tap Deep Reveal button. Verify `AuthModal` appears, not the panel.
6. **Deep Reveal cache**: Trigger Deep Reveal for a position already in `explanation_cache`. Verify no spinner (instant display) and `track('deep_reveal_viewed', { cached: true })` fires.
7. **from-position**: Tap "Start new game from here". Verify navigation reaches `game` screen with board pre-populated, and a new row exists in `games`.
