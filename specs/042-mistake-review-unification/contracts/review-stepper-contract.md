# Contract: `ReviewScreen` stepper — in-place preview mode for optimal moves

Frontend behavior contract for `src/screens/ReviewScreen.jsx`'s Prev/Next controls and move-timeline
chips (FR-013, FR-014, FR-015, spec Edge Case "zero-mistake game").

## Current behavior (baseline, unchanged parts)

- `mistakeIndices` currently = only non-optimal `moveIndex` values from `analysis.moves`.
- `navigateToMistake(moveIndex)` resolves the target row from the fully-paged `gameBlunderList` (paged
  via `fetchAllQueueBlunders`, branching on `data.source === 'papergames'` for the query param) and
  navigates to `blunderDetail` with the correct `navList`/`index`/`mistakeSource`. **This part already
  works correctly for both AI-sparring and papergames games and MUST NOT be changed.**

## Required behavior (this feature)

1. **Step universe**: Prev/Next and the chip row operate over **all** entries in `analysis.moves`
   (`stepIndices = analysis.moves.map(m => m.moveIndex)`), not only non-optimal ones. Prev/Next are
   disabled only at the true first/last move of the game — never disabled outright because a game has
   zero mistakes.
2. **Per-step dispatch**: On selecting step `i` (via Prev, Next, or a chip click):
   - If `analysis.moves[i].quality !== 'optimal'`: call `navigateToMistake(analysis.moves[i].moveIndex)`
     exactly as today (unchanged — this already satisfies FR-014's "a chip representing a mistake MUST
     navigate to that mistake's permalink" and FR-015's dual-key resolution).
   - If `analysis.moves[i].quality === 'optimal'`: do **not** navigate. Instead, set a new local state
     `previewMoveIndex = analysis.moves[i].moveIndex` and re-render `frozenBoard` from
     `buildBoard(analysis.fullMovestring.slice(0, /* ply count up to and including this move */))`
     (reuse the existing `board` field of `buildBoard`'s return value; `analysis.fullMovestring` and
     `buildBoard` are already imported in this file).
3. **Rendered-state signature**: every step (optimal or not) must produce a distinct, observable
   change — either a screen navigation (non-optimal) or a changed board render (optimal) — so a test
   asserting "the board updates on every activation" (SC-004) has a real signal to check in both cases.
4. **Initial/default state**: `previewMoveIndex` defaults to `null`/unset; when unset, `frozenBoard`
   renders the full game's final position exactly as it does today (no visual change for a user who
   never steps).
5. **Selection indicator**: `selectedMistakeIdx` (or its renamed equivalent) continues to track position
   within the step universe so Prev/Next enable/disable state and the currently-highlighted chip stay
   consistent with whichever `stepIndices` entry is active.

## Explicitly out of scope

- Any change to `navigateToMistake`'s target resolution logic, dual-key handling, or the
  `blunderDetail` screen it navigates to.
- Introducing a new screen/route for "optimal move detail" — optimal-move steps update the existing
  `ReviewScreen` board in place; they do not navigate anywhere.
- Persisting `previewMoveIndex` across navigation/reload — it is transient UI state, reset on remount.

## Test strategy

- A rendered-state-signature test: step through a game with ≥1 optimal and ≥1 non-optimal move (the
  SC-002 fixture game, `40fe793a-aa39-429d-8ef4-4e43192cc4db`, qualifies — it has both, since only 4 of
  its 41 plies are mistakes); assert the board's rendered signature (or navigation target) differs at
  every step.
- A zero-mistake regression case: a game where `analysis.moves.every(m => m.quality === 'optimal')`
  must still allow Prev/Next to move `previewMoveIndex` through the full move list (Edge Case).
- A chip-click case: clicking a chip for an optimal move must change the rendered board without
  triggering navigation; clicking a chip for a non-optimal move must navigate (unchanged behavior).
