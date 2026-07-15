# Coach creation-pattern praise: transition-gating design

**Date**: 2026-07-14
**Status**: IMPLEMENTED 2026-07-14 (plan: docs/superpowers/plans/2026-07-14-coach-creation-pattern-transition.md)
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
existing priority chain and lands on `best_move` / `drawing_move` / `suboptimal_move`. Those tags
have **no `coach.*` phrase pool**, so `pickFromPool` returns `null`, `evaluateMoveHandler` returns
`coachPhraseKey: null`, and the frontend's existing fallback (`useGameBoard.js:284–288`) speaks a
generic `coach.generic.<quality>` line — exactly what every other move without a special pattern
already gets. Consistent, and requires no client change.

Note on which generic line actually fires: `scoreMove`'s `quality` (not `classify`'s tag) drives the
choice between `coach.generic.optimal` and `coach.generic.suboptimal`. Holding a *standing* double
threat or forced win, the solver-max move is usually to cash one of the wins now (which triggers
`immediate_threat`/a win, not a suppressed "persist"). So a move that *leaves the pattern standing*
is, by construction, typically sub-max — the suppressed case therefore usually falls through to
`coach.generic.suboptimal` ("Not bad, but there was a sharper move"), a mild nudge, not praise. This
is still correct and truthful (the move genuinely is sub-max), but it is not the "Nice move" praise
line; do not assume `coach.generic.optimal` is what fires.

Worked example (transition-only, per the approved repeat rule):

```
Move 10: user creates a double threat (absent → present)  → "Perfect — you created the double threat."
Move 12: double threat still on board (present → present), move is sub-max → "Not bad, but there was
         a sharper move." (generic.suboptimal fallback — no false "you created" claim)
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
- **Consumer audit**: `classify()` has more callers than the puzzle handlers. Puzzle paths pass an
  explicit `category`, which overrides `patternTag` for the phrase pool (`evaluateMoveHandler.js:90`),
  so puzzle scoring is unaffected. A final whole-branch review found the audit below (originally
  two callers) under-counted the unshielded set; it is now five production call sites plus one
  diagnostic script:
  - `server/index.js:1091` — `POST /api/explain-move`. No `category` is passed, so
    `patternTag = classify(...).tag` feeds `composeExplanation()` directly. After the fix, a move
    that merely maintains (rather than creates) a double threat or forced win will produce a
    different, more generic explanation here instead of the pattern-specific one. This is a live,
    user-facing behavior change in the same (correct) direction as the fix; verify it manually
    before merging (see plan Task 3). **Unshielded.**
  - `server/index.js:1777` — `POST /api/evaluate-move/inline`. The phrase pool IS
    category-shielded (`phrasePoolKey = category || patternTag` at `index.js:1786`), so
    `coachPhraseKey`/`summaryLineKey` are unaffected. BUT the raw `patternTag` is still returned
    verbatim in the response JSON (`index.js:1800`), so a client reading `patternTag` directly on a
    persisting-pattern move now gets a generic/null tag instead of `double_threat`/`forced_win`.
    Same-direction, low-severity. **Shielded for phrase selection, unshielded for the raw
    `patternTag` field.**
  - `server/index.js:3148` — `GET /api/admin/scores` (localhost-only, gated by
    `requireLocalhost`). Surfaces the tag with no shielding at all:
    `classifier_tags: classResult?.tag ? [classResult.tag] : []` (`index.js:3170`) — there is no
    `category` override here, so this endpoint's output genuinely changes. This is a third
    unshielded consumer; the audit's earlier "only explain-move and candidate-generator are
    unshielded" claim was incomplete. Localhost-only admin diagnostics, same-direction,
    low-severity. **Unshielded.**
  - `server/candidate-generator.js:607` — pushes `cls.tag` into puzzle-generation metadata. Its test
    (`candidate-generator.test.js`) is excluded from `npm run test:fast` per CLAUDE.md (it calls the
    real solver and can hang), so this path is **not covered** by the plan's test gate; treat it as
    an accepted, unverified-by-CI risk in the same low-severity direction as the fix. **Unshielded.**
  - `server/scripts/diagnose_blunders.mjs:168` — diagnostic script (non-production), logs
    `classifyResult.tag` to the console for manual blunder inspection. Same-direction, no
    production impact.
  The change only makes `patternTag` more accurate everywhere it is derived (fires on creation, not
  on mere presence), which is the intent — but it does reach these five production call sites (plus
  one diagnostic script), not just the intended coach path. The unshielded set is: `explain-move`,
  `evaluate-move/inline`'s raw `patternTag` field, `admin/scores`, and `candidate-generator`.
