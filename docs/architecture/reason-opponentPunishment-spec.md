# Spec — `opponentPunishment` fork-denial (occupation witness) for `win_to_draw`

> **Superseded in part by D18 (2026-06-30):** the `win_to_draw` BFS (`denyOpponentPunishment`)
> described in §3 has been replaced by the unified `findOccupationWitness` PV walk. §3's
> "shallowest-by-BFS" contract is replaced by "first-on-canonical-PV." The output shape (§4)
> and the two-honest-claims rule (§5) are unchanged. The same primitive now also provides the
> `draw_to_lose` half-a denial (see DECISIONS D18 and `reason-engine-pseudocode.md`).

> Status: IMPLEMENTED (2026-06-29). Commits: f339220, 66cae80, fcfdae9, 0ac62cd, 2835e3c, 761401e.
> 45/45 tests pass. Canonicalized into DECISIONS (D17), blunder-reason-evidence.md,
> reason-engine-pseudocode.md, and my_pseudocode.md. Subordinate to the four canonical docs
> (INVARIANTS / DECISIONS / my_pseudocode / blunder-reason-evidence). On conflict, the canonical
> docs win.

## 1. Motivation

After D16, `lostResource` for `win_to_draw` is a concrete **double-threat fork** (e.g. board
`214444115623` played 4 → fork cells `c4r3`/`c6r4`). But the matching `opponentPunishment` half is
still the legacy `neutralization`: it stops at the opponent's **single saving reply** and only names
the one escape cell. It never *exhibits* the lesson the user asked for — that the fork the best move
was building **cannot be rebuilt after the blunder.**

This spec replaces that half (for `win_to_draw` only) with a search that produces a concrete
**denial witness**: the shortest optimal line in which the opponent occupies a cell of the lost
pattern, killing it.

## 2. Scope

- **In scope:** the `win_to_draw` half (b) only.
- **Out of scope (unchanged):** `win_to_lose` / `draw_to_lose` / `lose_to_faster_lose` half (b) —
  those already walk to the opponent's *own* fork-stopped winning line (D16). The played move there
  loses; there is nothing to "deny".

## 3. The contract — a property of the tree, independent of any heuristic

> The `opponentPunishment` is the **shallowest node in the depth-bounded optimal-play tree of the
> blunder position where the opponent occupies a cell of `lostPattern`, and the window it entered was
> LIVE before that move and DEAD after.** If no such node exists within the depth cap → `no_occupation`.

- **Optimal-play tree:** from `blunderRoot = movestring + playedCol`, both sides play only
  **score-preserving** moves (for `win_to_draw` that is every move scoring the draw, `0`, for the
  side to move). Branch **all** score-ties on **both** sides. (I2: every move is solver-grounded
  optimal play — we never exhibit a sub-optimal move.)
- **Shallowest:** BFS strictly by ply; never prune a depth level. The minimal-depth witness is fixed.
- **`lostPattern`:** the half-(a) pattern as an array of winning windows (`lostResource.forkWindows`).
  Detector-agnostic (I9): the search never names "double threat" — it consumes whatever windows half
  (a) produced (fork windows today; any future pattern's windows tomorrow).
- **LIVE → DEAD:** a window is *live* for the player when it contains no opponent disc; the opponent's
  move makes it *dead*. This is the cheap, sound test that the occupation is a real window-kill, not
  incidental.

### 3a. The tie-break is NOT part of the contract

A frontier-ordering heuristic ("look toward `lostPattern` first") may reach the witness with less
exploration, but it **must not change the returned board** — it only reorders, never prunes across
depth. It needs no principled measure, is omittable, and is **not tested.** Correctness is defined
solely by §3.

## 4. Output shape

`opponentPunishment` for `win_to_draw` becomes:

```
{ kind: 'denial',
  verdict: 'occupation' | 'no_occupation',
  line: [{ply,mover,col,cell,score}, ...],   // blunderRoot -> witness; null/[] only for no_occupation
  finalMovestring: <witness board>,
  cell: 'cNrM',          // the occupying cell (occupation only) — this IS the D14 tie, constructive
  window: ['cNrM',...],  // the killed window (occupation only)
  exhaustive: <bool>,    // no_occupation only: was the optimal tree exhausted to terminal within cap?
  tie: { kind, sharedCells } }   // see §6
```

## 5. Two honest claims — never merged (tightens "don't overclaim denial")

- **LOCAL (proved by the witness):** "the opponent occupies `cell`, killing window `window` of your
  pattern." Verified cell-by-cell (LIVE→DEAD).
- **GLOBAL (proved by the outcome):** "and the line only draws — the double threat never forms."
  Carried by the drawn result, emitted as a **separate** clause. The engine must NOT say "this move
  refutes the fork."

## 6. The tie (D14) becomes constructive

For `win_to_draw`, `opponentPunishment.tie` is produced by this search, not by intersecting one
saving move against `anchorCells`:
- `occupation` → `tie = { kind:'tied', sharedCells:[cell] }` (the occupying cell).
- `no_occupation` → `tie = { kind:'independent', sharedCells:[] }` (honest: the draw holds without the
  opponent ever taking a pattern cell).

## 7. Bounds & honest limits

- **Depth cap + dedup by movestring** (I6); both-sides full branching of score-ties (I0 — extra
  solver calls accepted).
- **`no_occupation` is two-valued** (I7-style asymmetry): `exhaustive:true` (tree reached terminal
  draw within the cap → confirmed the opponent never needs a pattern cell) vs `exhaustive:false`
  (only hit the cap → honest "no witness within budget").
- **Refutation-by-counter is NOT actively demonstrated.** Because the player is held to optimal
  (score-preserving) moves, the engine never makes the player sacrifice to show "every attempt to
  build loses to <counter>." That richer witness is a deferred enrichment; `no_occupation` is the
  honest residual verdict for now.
- **No `parity` verdict.** Parity is realized *as* the occupation (it decides who gets the gravity-top
  of the contested cell); it is not a separate no-touch denial.

## 8. I12 counterexamples (both required before locking)

- **occupation:** `214444115623` played 4 → witness occupies `c3r3` (window `c3r3·c4r3·c5r3·c6r3`).
- **no_occupation:** a sourced `win_to_draw` board whose optimal tree draws without the opponent ever
  taking a `lostResource` fork-window cell (proves the fallback fires). MUST be sourced via
  `gameSampling` / fixture search (never hand-rolled).

## 9. Integration points

- `connect-four/server/scripts/reason_audit/reasonEngine.mjs` — replace the `win_to_draw` half-(b)
  block; reuse `lostResource.forkWindows`.
- `reason_evidence_all.jsonl` — regenerate via `build_evidence.mjs` (line now multi-ply → the
  `/admin/fv-suff` lookahead numbering already renders it).
- Canonical docs — D17 (DECISIONS) + reflect into `blunder-reason-evidence.md` /
  `reason-engine-pseudocode.md`; close the lagging D16 sync while here.
