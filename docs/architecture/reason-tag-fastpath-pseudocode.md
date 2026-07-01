# Blunder-reason engine — the tagBlunder fast-path (design)

> **Read the four canonical reason docs first** (`reason-INVARIANTS.md`, `reason-DECISIONS.md`,
> `my_pseudocode.md`, `blunder-reason-evidence.md`) — this design amends the top-level dispatch only.
> It is a **wrapper in front of** the sign-taxonomy engine (`reason-engine-pseudocode.md`), not a
> rewrite of it. Everything below the fast-path (D16/D17/D18/D19, the two-halves walks, the
> occupation witness, the swindle gate, parity attribution) is preserved unchanged.

Status: **DESIGN — approved 2026-06-30**, not yet implemented.

## Motivation — one worked case

`3321234543`, played col 0, best col 3 (0-indexed). Green to move; Gray holds a standing
three-in-a-column at col 4 (`c4r2·c4r3·c4r4`, `c4r5` open and gravity-top). The correct move is the
block at col 3; playing col 0 lets Gray complete the four at `c4r5` next move.

- `tagBlunder` tags it **`forced_block / defensive_miss`** — correct, one sentence: *you conceded an
  immediate threat.*
- The sign engine sees `bestScore=-4, playedScore=-16` → both `<0` → `lose_to_faster_lose`, runs the
  swindle gate, and emits a `conditional_swindle` with a **parity attribution on a diagonal**
  (`c1r4`), `tacticTag: minor_threat`, `pliesToEnd: 15`. A convoluted, misleading story for "you
  didn't block a mate-in-1."

When `tagBlunder` finds a **short, concrete, cell-nameable tactic**, that fact — not the deep
two-halves parity machinery — is the reason. This design routes those tags to a cheap direct payload
and leaves the structural/zugzwang cases on the existing engine.

## Locked design decisions (this amendment)

1. **Tag-first fast-path.** `tagBlunder` runs in front of the sign taxonomy. Its `(tag, direction)`
   decides whether we take the **direct** route or fall through to the existing engine. The sign
   taxonomy (I5) and all its LOCKED decisions stay intact for the fall-through.
2. **Direct set = short concrete tactics only.** `{ immediate_threat, forced_block, double_threat,
   figure_7, forced_win, j_shape }` (any direction) → direct route. Everything else (`claimeven`,
   `z_threat`, `overcut`, `undercut`, `major_threat_parity`, `major_threat_nonparity`, `minor_threat`,
   `drawing_move`, `suboptimal_move`) → existing two-simulation engine.
3. **Direct payload = detector cells + one short opponent walk.** Half (a) `lostResource` comes
   straight from `classifyPattern`/detector cells (no optimal walk). Half (b) `opponentPunishment` is
   ONE opponent-optimal walk from `playedRoot` capped at ~2 plies. Uniform across directions.
4. **NotABlunder — override only the lose side.** Guard 1 stays: `bestScore>0 && playedScore>0`
   (`win_to_slower_win`, D3) is NotABlunder even with a tactical tag — you win either way. On the
   lose/draw side, a direct tag ALWAYS produces a reason: the direct route **overrides** the
   `lose_to_faster_lose` no-practical-chance gate (D4/D19). Conceding/enabling a mate is always
   teachable.
5. **Two halves stay separate (I3)** even on the fast-path; they are never merged.

## Pseudocode

```python
# ════════════════════════════════════════════════════════════════════════════
#  reason(movestring, playedCol)   —  TAG-FIRST wrapper around the sign engine
# ════════════════════════════════════════════════════════════════════════════

# The six tags whose story is short, concrete, and cell-nameable.
# For these we do NOT run the two-halves walks (no occupation-witness, no swindle
# gate, no parity attribution).
DIRECT_TAGS = { immediate_threat, forced_block, double_threat,
                figure_7, forced_win, j_shape }

def reason(movestring, playedCol):
    scores      = solver.query(movestring)        # player (side-to-move) perspective
    bestCol     = argmax(scores)
    bestScore   = scores[bestCol]
    playedScore = scores[playedCol]
    player      = side_to_move(movestring); opponent = other(player)

    # ── GUARD 1 (kept): you win either way → out of scope, even with a tactical tag.
    #    "You had a mate-in-1 but chose a slower win" is D3 NotABlunder.
    if bestScore > 0 and playedScore > 0:
        raise NotABlunder()          # win_to_slower_win

    # ── Ask the production classifier what KIND of blunder this is.
    #    tagBlunder may itself raise NotABlunderError (terminal / full board) → propagate.
    tag, direction = tagBlunder(movestring, playedCol, bestCol, solver)

    # ── FAST-PATH. A short concrete tactic on the lose/draw side ALWAYS gets the
    #    direct reason — this overrides the lose_to_faster_lose "no practical chance"
    #    gate. Conceding / enabling a mate is always worth teaching.
    if tag in DIRECT_TAGS:
        return direct_reason(movestring, playedCol, bestCol,
                             tag, direction, player, opponent, scores)

    # ── Everything else (claimeven, z_threat, overcut, undercut, major_threat_*,
    #    minor_threat, drawing_move, suboptimal_move) falls through UNCHANGED to the
    #    existing sign-taxonomy two-halves engine (D16/D17/D18/D19 all intact).
    return sign_taxonomy_engine(movestring, playedCol)      # my_pseudocode.md / reason-engine-pseudocode.md


# ════════════════════════════════════════════════════════════════════════════
#  direct_reason  —  cheap, cell-nameable, no optimal walks on half (a)
#    Still emits the two separate halves (I3): a lost resource and a punishment.
# ════════════════════════════════════════════════════════════════════════════

def direct_reason(movestring, playedCol, bestCol, tag, direction, player, opponent, scores):
    playedRoot  = movestring + playedCol
    correctRoot = movestring + bestCol

    # ── half (a): the lost resource — straight from the detectors, NO walk ──
    if direction == 'missed_own':
        # You could have BUILT (or already had) the tactic. Name its cells on the
        # board the correct move reaches (for immediate_threat/missed_own the win
        # already exists on `movestring` itself).
        source = movestring if tag == 'immediate_threat' else correctRoot
        cells  = classifyPattern(source, player)[tag].cells        # tested detector (I8)
        lostResource = { kind:'missed_tactic', tag, cells,
                         anchorCells: cells,
                         register: 'immediate' if tag=='immediate_threat' else 'forced_sequence',
                         finalMovestring: correctRoot }

    else:   # direction in ('enabled_opponent', 'defensive_miss')
        # The resource you gave up is the DEFENSE. Name the opponent's threat cells
        # and the block you had.
        #   defensive_miss   → opponent's threat already stands on `movestring`
        #   enabled_opponent → the played move created it, so read it on playedRoot
        source = movestring if direction == 'defensive_miss' else playedRoot
        threatCells = classifyPattern(source, opponent)[tag].cells
        blockCell   = landing_cell(movestring, bestCol)            # the safe move you had
        lostResource = { kind:'missed_defense', tag, threatCells, blockCell,
                         anchorCells: [blockCell], register:'immediate',
                         finalMovestring: correctRoot }

    # ── half (b): the punishment — ONE short opponent-optimal walk, capped ~2 plies ──
    opp = walk_optimal_capped(playedRoot, winner=opponent, cap=2)
    if opp.reached_win:                        # opponent wins within the cap
        opponentPunishment = { kind:'winning_line', register: opp.register,   # immediate | forced_sequence
                               completingCell: opp.completingCell, window: opp.window,
                               line: opp.line, pliesToEnd: opp.plies,
                               finalMovestring: opp.finalMovestring,
                               entryCell: opp.line[0].cell }
    else:                                      # no near win; the tactic is simply gone
        opponentPunishment = { kind:'neutralization', register:'immediate',
                               note:'no immediate opponent win — the missed tactic no longer exists',
                               playedScore: scores[playedCol],
                               finalMovestring: playedRoot }

    # ── the tie (cheap spatial, I3/D14): does the punishment land on the resource? ──
    #    enabled/defensive → opponent usually completes on the very cell you failed to
    #    block → 'tied'.   missed_own → often 'independent' (you lost YOUR win).
    shared = lostResource.anchorCells ∩ { opponentPunishment.get(entryCell),
                                          opponentPunishment.get(completingCell) }
    opponentPunishment.tie = { kind:('tied' if shared else 'independent'),
                               sharedCells: list(shared) }

    replyHistogram = { afterBest:   non_losing_reply_count(correctRoot),
                       afterPlayed: non_losing_reply_count(playedRoot) }

    return { route:'direct', tag, direction,
             lostResource, opponentPunishment, replyHistogram, gate: None }
```

## How the motivating tags read out

| tag / direction | half (a) lostResource | half (b) opponentPunishment |
|---|---|---|
| `forced_block/defensive_miss` (**`3321234543`**) | opponent's standing threat cells `c4r2·c4r3·c4r4·c4r5`, the block you had = `c4r5` | opponent completes at `c4r5` in 1 ply → **tie: tied** |
| `immediate_threat/enabled_opponent` | the block/safe move you skipped | opponent's new win in 1–2 |
| `immediate_threat/missed_own` | your own winning cell (on `movestring`) | usually `neutralization` — you threw your own win |
| `double_threat`/`figure_7` `missed_own` | the fork cells you could have built | short opp walk; often `independent` |

## Invariant reconciliation

- **I3 (two halves, separate) — kept.** The fast-path still emits `lostResource` and
  `opponentPunishment` as distinct fields; they are never merged.
- **I8 (reuse detectors) — kept.** Half (a) reuses `classifyPattern`'s tested detector cells rather
  than re-deriving geometry.
- **I2 (never fabricate) — bounded exception, stated explicitly.** Half (a) cells now come from a
  detector *without* a solver optimal-walk confirming they are the realized win/threat. This is
  acceptable **only because** `tagBlunder` already gated these tags via score/threat checks, and half
  (b)'s short walk is solver-grounded. This is the one place the fast-path trades a walk for a
  detector; it must be validated per I12 before locking (a counterexample per direction through the
  production `tagBlunder`).
- **I5 (sign taxonomy) / D16–D18 — untouched** for the fall-through route.
- **D3 preserved; D4/D19 overridden on the lose side** — per decision 4 above.

## Open items for the implementation plan

- Where the wrapper lives: `computeReason` in `reasonEngine.mjs` gains the tag-first branch; the
  existing body becomes `sign_taxonomy_engine`.
- `walk_optimal_capped(playedRoot, opponent, cap=2)` — a small bounded variant of `walk_optimal`
  (reuse, don't reinvent). Confirm `register` derivation (`immediate` vs `forced_sequence`) at the cap.
- Output-shape compatibility with `/admin/fv-suff` and the LLM narrator: the new top-level keys
  (`route`, `tag`, `direction`) and the `missed_tactic` / `missed_defense` / `neutralization` half
  kinds must be threaded through the viewer and the explain prompt.
- I12 validation: a counterexample board per `(tag, direction)` in the direct set, run through the
  real `tagBlunder` + the new `direct_reason`, added to `reason_fixture.jsonl`.
