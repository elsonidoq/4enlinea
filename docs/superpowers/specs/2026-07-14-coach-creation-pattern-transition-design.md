# Coach creation-pattern praise: transition-gating design

**Date**: 2026-07-14
**Status**: design approved (pending written-spec review)
**Area**: `connect-four/server/classifier.js` (`classify()`), consumed by `POST /api/evaluate-move` (`server/evaluateMoveHandler.js`)

## Problem

During live sparring, when the user makes an optimal move on a board that contains a
**double threat**, the coach says "Perfect — you created the double threat." It says this even when
the double threat was **already on the board before the move** — so every subsequent optimal move
re-triggers the same "you created it" praise. The praise is false (the move didn't create anything)
and repetitive.

Root cause: `classify()` (`classifier.js:627`) detects `double_threat` (and `forced_win`) as pure
**post-move geometry**. It asks "does the post-move board contain the pattern?" but never "did this
move *cause* the pattern to appear?" A "you created X" claim is only truthful on an
absent→present transition.

## Principle

A **creation** praise is emitted only when the move causes the pattern to appear:

> Emit the creation tag **iff** the pattern is present on the post-move board **and absent** on the
> pre-move board, both evaluated from the **mover's** perspective.

If the pattern was already present, the move didn't create it — fall through the existing priority
chain to the generic optimal-move praise.

## Scope

Only the two tags in `classify()` that (a) assert creation and (b) can persist across moves:

- **`double_threat`** (`classifier.js:643–666`) — the reported bug.
- **`forced_win`** (`classifier.js:669`) — same failure mode, worse: a forced win, once made,
  persists under optimal play, so today *every* subsequent optimal move re-fires "you have a forced
  win."

Left unchanged (correctly):

- **`immediate_threat`** (`classifier.js:631–637`) — the candidate move itself completes 4-in-a-row
  → the game ends. It cannot persist or repeat, and the pre-move board never contains a completed
  win, so gating is a no-op.
- **`forced_block`** (`classifier.js:674–687`), **`forbidden_columns`** (`classifier.js:690–698`) —
  already reason about pre-vs-post state.
- **`best_move` / `drawing_move` / `suboptimal_move`** (`classifier.js:701–703`) — quality
  fallbacks, not creation claims.

Out of scope (tracked separately):

- **AI-move commentary** (`classifyAiMove()` / `classifyPattern()`) has the same latent repeat
  behavior but goes through a different, multi-tag detector. Deferred by decision.
- **`figure_7` and other multi-tag tactics** are never emitted on live user moves at all — see
  **OI-30** in `docs/open_issues.md`. If they are ever added to the live path they must adopt this
  same transition-gating.

## Why this seam

`classify()` already constructs both boards it needs — `board` (pre-move) and
`nextBoard = board.withMove(candidateCol)` (post-move) — and already passes the mover's perspective
(`board.currentPlayer`) explicitly into the double-threat / forced-win checks. This change extends
the pre-vs-post discipline that `forced_block` and `forbidden_columns` already use to the two
purely-geometric creation tags. It is fully **stateless** and **server-side**: no per-game history,
no schema change, no API-shape change, no frontend change.

## Behavior when a pattern is suppressed

No silence mechanism is needed. When a creation tag is suppressed, `classify()` continues down its
existing priority chain and lands on `best_move` / `drawing_move`. Those tags have **no `coach.*`
phrase pool**, so `pickFromPool` returns `null`, `evaluateMoveHandler` returns
`coachPhraseKey: null`, and the frontend's existing fallback (`useGameBoard.js:284–288`) speaks a
generic `coach.generic.<quality>` line ("Nice move") — exactly what every other optimal move without
a special pattern already gets. Consistent, and requires no client change.

Worked example (transition-only, per the approved repeat rule):

```
Move 10: user creates a double threat (absent → present)  → "Perfect — you created the double threat."
Move 12: double threat still on board (present → present)  → "Nice move."  (generic fallback)
Move 14: opponent blocked it; user re-creates it (absent → present) → "Perfect — you created ..." (again)
```

## Implementation

1. **Extract two pure board-level predicates** in `classifier.js`, so the identical check runs on
   either board and either could be unit-tested in isolation:

   - `hasDoubleThreat(board, player)` — the current `classifier.js:644–666` logic (≥2 gravity-top
     reachable winning threats via `board.reachableThreats(player)`, **or** two stacked
     consecutive-row threats in one column), parameterized on `(board, player)` instead of
     hard-coding `nextBoard` / `board.currentPlayer`.
   - `hasForcedWin(board, player)` — thin wrapper over the existing
     `detectForcedWin(board, player).matched`.

2. **Gate each creation tag** inside `classify()`'s existing
   `if (board.colHeights[candidateCol] < ROWS) { … }` block, after computing
   `nextBoard`:

   ```js
   const player = board.currentPlayer;

   // Double threat — only if this move CREATED it (absent before, present after)
   if (hasDoubleThreat(nextBoard, player) && !hasDoubleThreat(board, player)) {
     return { tag: 'double_threat' };
   }

   // Forced win — only if this move ESTABLISHED it
   if (hasForcedWin(nextBoard, player) && !hasForcedWin(board, player)) {
     return { tag: 'forced_win' };
   }
   ```

   Priority order among tags is unchanged; a suppressed tag simply continues to the next check and
   ultimately to the quality fallback.

## Testing (validate against the case-space, per project Principle I12 — not just the motivating example)

All cases run **through the real `classify()`**, with movestrings sourced from existing classifier
tests or generated via `playGame`/the simulation harness and solver-verified — never hand-rolled
(project convention; see memory `feedback_no_random_boards`, `reference_game_simulation_harness`).

| Case | Setup | Expected tag |
|---|---|---|
| Double threat **created** | move takes an absent→present double threat | `double_threat` (regression: existing behavior preserved) |
| Double threat **persists** | pre-move board already has the double threat; move keeps it | **not** `double_threat` → `best_move` |
| Forced win **established** | move takes an absent→present forced win | `forced_win` |
| Forced win **persists** | pre-move board already has the forced win; optimal move keeps it | **not** `forced_win` → `best_move` |

The two "persists" cases are the regression the fix targets; the two "created/established" cases
prove the fix does not over-suppress genuine praise.

## Costs / risks to verify during implementation

- **Extra pre-move evaluation**: one additional `hasDoubleThreat` / `hasForcedWin` call on the
  pre-move board per `classify()` invocation. These are geometry-only (no solver call), so the cost
  is negligible.
- **Consumer audit**: grep `classify(` callers before merge to confirm nothing depends on
  `patternTag === 'double_threat'` / `'forced_win'` firing on a *persisting* pattern. Puzzle paths
  pass an explicit `category`, which overrides `patternTag` for the phrase pool
  (`evaluateMoveHandler.js:90`), so puzzle scoring is unaffected. The change only makes the live
  `patternTag` more accurate (fires on creation, not on mere presence), which is the intent.
