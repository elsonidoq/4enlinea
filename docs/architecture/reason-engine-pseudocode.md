# Blunder-reason engine — integrated pseudocode

Successor to [`reason-case-taxonomy.md`](./reason-case-taxonomy.md) (the authoritative 5-case sign taxonomy) and
companion to [`blunder-reason-evidence.md`](./blunder-reason-evidence.md) (the two-half engine,
registers, gate, validated boards). Folds in the enrichments developed afterward:

1. **Parity attribution** — for parity-register wins (line too long to show), describe the
   solver-realized *controlling group* + zugzwang *lever* instead of a bare distant cell.
2. **Solver-gated tactic naming** — `classifyPattern` (the tested production detector) PROPOSES a
   tactic label; the solver DISPOSES via two gates (register-class consistency + realized-resource
   alignment). Honest `null` rather than a misleading name.
3. **The tie principle (whole-algorithm)** — `opponentPunishment` (half b) is never independent: it
   is the causal counterpart of `lostResource` (half a). Half (b) is computed *against* half (a) and
   emits a **verified** relationship. The tie may legitimately be `independent` (and saying so is
   information, not a failure).

Abstraction level matches `reason-case-taxonomy.md`: a skeleton, not an implementation. Two truth sources —
the SOLVER proves the case, the realized win, and every tie (authoritative); `classifyPattern` only
names tactics (proposer). The solver always disposes.

```python
# ════════════════════════════════════════════════════════════════════════════
#  reason(movestring, playedCol)
#    -> { case, lostResource, opponentPunishment, replyHistogram, gate }
# ════════════════════════════════════════════════════════════════════════════

def reason(movestring, playedCol):
    scores       = solver.query(movestring)        # side-to-move (player) perspective
    bestCol      = argmax(scores)
    bestScore    = scores[bestCol]
    playedScore  = scores[playedCol]
    player       = side_to_move(movestring); opponent = other(player)
    bestRoot     = movestring + bestCol
    playedRoot   = movestring + playedCol

    # ── 1. classify by the (bestScore, playedScore) sign pair ──
    if bestScore > 0 and playedScore > 0:   raise NotABlunder()      # win_to_slower_win (out of scope)
    if   bestScore > 0 and playedScore == 0: case = 'win_to_draw'
    elif bestScore > 0 and playedScore <  0: case = 'win_to_lose'
    elif bestScore == 0 and playedScore < 0: case = 'draw_to_lose'
    elif bestScore <  0 and playedScore < 0: case = 'lose_to_faster_lose'
    else:                                     raise NotABlunder()    # both draw / impossible

    gate = None

    # ── 2. half (a): the lost resource — WHAT THE BEST MOVE PRESERVED ──
    #   Every resource carries `anchorCells`: the MOVE-LEVEL squares that define it (NOT necessarily
    #   the eventual completing cell). The tie in step 3 is verified against these.
    if case in ('win_to_draw', 'win_to_lose'):
        lostResource = win_half(bestRoot, winner=player, diffAgainst=playedRoot)
        # anchorCells = the winning MOVES the player had = { landing_cell(movestring,c) : scores[c] > 0 }
        lostResource.anchorCells = winning_move_cells(movestring, scores)

    elif case == 'draw_to_lose':
        # D18: half (b) is computed FIRST to supply concededWindows to the occupation witness.
        # The punish_half call below reuses this pre-computed oppHalf via the `against` argument.
        oppHalf          = win_half(playedRoot, winner=opponent)     # half (b): opp winning line
        # the window(s) the player must have blocked: the fork windows if half (b) fork-stopped (D16),
        # else the single winning window.
        concededWindows  = oppHalf.forkWindows if oppHalf.terminal == 'fork' else [oppHalf.window]
        # Half (a): player's occupation of the opponent's conceded window on the bestRoot PV.
        # Tactical sub-case (ply-0 root occupation) and zugzwang fall out of the same primitive.
        lostResource     = find_occupation_witness(bestRoot, denier=player, windows=concededWindows,
                                                   depthCap=42-len(bestRoot))
        lostResource.anchorCells = ({lostResource.cell} if lostResource.verdict == 'occupation' else ∅)
        # tie: CONSTRUCTIVE and window-aware — set DIRECTLY from the half-(a) occupation cell, NOT via
        # tie_to (whose anchorCells intersection would wrongly report `independent`). The player's
        # occupation cell lies inside the opponent's window → kind:'tied'.
        oppHalf.entryCell = oppHalf.line[0].cell if oppHalf.line else oppHalf.completingCell
        oppHalf.tie       = ({ kind:'tied', sharedCells:[lostResource.cell] }
                             if lostResource.verdict == 'occupation'
                             else { kind:'independent', sharedCells:[] })
        return { case, lostResource, opponentPunishment: oppHalf, replyHistogram, gate }

    elif case == 'lose_to_faster_lose':
        gate = swindle_gate(bestRoot)               # exhaustive if <=10 empties, else bounded
        if not gate.found: raise NotABlunder()      # lost anyway, no reachable swindle -> not a blunder
        lostResource = win_half(gate.node + gate.devCol, winner=player)   # conditional_swindle
        lostResource.anchorCells = { landing_cell(gate.node, gate.devCol) }  # the practical-chance move

    # ── half (b): the opponent punishment — computed AGAINST lostResource (the tie principle) ──
    opponentPunishment = punish_half(case, movestring, playedRoot, opponent, against=lostResource)

    # ── 3. counterplay signal ──
    replyHistogram = { afterBest:   non_losing_reply_count(bestRoot),
                       afterPlayed: non_losing_reply_count(playedRoot) }

    return { case, lostResource, opponentPunishment, replyHistogram, gate }


# ════════════════════════════════════════════════════════════════════════════
#  HALF (b): punish_half — ALWAYS computed against half (a), ALWAYS verifies the tie
# ════════════════════════════════════════════════════════════════════════════

def punish_half(case, movestring, playedRoot, opponent, against):     # against = lostResource
    if case == 'win_to_draw':
        # D18 + D26: half (b) is the unified occupation-witness PV walk for BOTH sub-cases.
        # Walk the canonical argmax PV from playedRoot; return the first node where the opponent
        # occupies+kills a cell of the winning window(s) (LIVE->DEAD).  depthCap = full board.
        #   fork sub-case      -> windows = lostResource.forkWindows        (D18)
        #   non-fork sub-case  -> windows = [lostResource.window]           (D26, replaces neutralization)
        windows = against.forkWindows if against.terminal == 'fork' else [against.window]
        half = find_occupation_witness(playedRoot, denier=opponent, windows=windows,
                                       depthCap=42-len(playedRoot))
        # register: fork -> tactical (from denial line length, D16); non-fork -> registerOf(fwd(bestScore))
        # as a LABEL, but the full `line` is retained regardless (soundness-first; rendering deferred).
        # The counterplay count the old neutralization.savingReplyCount carried is replyHistogram.afterPlayed.
    else:
        # the played move LOSES (or loses faster): half (b) is the opponent's winning line.
        half = win_half(playedRoot, winner=opponent)                  # kind = winning_line
        half.entryCell = half.line[0].cell if half.line else half.completingCell  # opp's capitalizing move

    # ── THE TIE — verify the causal relationship to half (a); never assume it ──
    half.tie = tie_to(case, against, half)
    return half


# tie_to: does the punishment exploit the very resource that was given up?  Returns the VERIFIED
# relationship (which may be `independent`).  Spatial for most cases; temporal for lose_to_faster_lose.
def tie_to(case, lost, punish):
    if case == 'lose_to_faster_lose':
        # both sides are lost; the tie is SPEED: the played loss is faster than the swindle grind.
        return { kind:'temporal',
                 tied: punish.pliesToEnd < lost.pliesToEnd,
                 playedPlies: punish.pliesToEnd, swindlePlies: lost.pliesToEnd }
    # spatial: the opponent's entry/completing square coincides with a square of the lost resource.
    shared = lost.anchorCells ∩ { punish.entryCell, punish.completingCell }
    return { kind: ('tied' if shared else 'independent'), sharedCells: list(shared) }
    #   win_to_draw : shared != ∅  ->  "your winning square was their only escape."
    #   win_to_lose : shared != ∅  ->  "they win on the very square you vacated."
    #   draw_to_lose: tied at the occupation cell (D18 — both tactical and zugzwang sub-cases;
    #                 the witness is window-aware so the occupation cell is always inside the window).


# ════════════════════════════════════════════════════════════════════════════
#  find_occupation_witness — D18: unified PV-walk primitive (replaces the D17 denial_search BFS)
#    root:     starting movestring (playedRoot for win_to_draw; bestRoot for draw_to_lose)
#    denier:   the side whose occupation we look for (opponent for win_to_draw; player for draw_to_lose)
#    windows:  list of windows to watch (lostResource.forkWindows; or opponent's conceded window)
#    depthCap: maximum plies to walk; use 42-len(root) for a full-board guarantee
#
#  Theorem: a drawn full board fills every winning-for-S window with ≥1 not-S disc, so a single
#  PV walk to the terminal always yields a LIVE→DEAD occupation.  With depthCap = 42-len(root)
#  the witness is ALWAYS found; no_occupation only fires on a smaller cap or a solver error.
#
#  Contract: walk the canonical argmax (both-sides optimal) PV step by step.  At each denier
#  move check whether the landing cell kills a watched window (LIVE before → DEAD after).
#  Return the FIRST such node.  The first-on-PV witness may differ from the globally-shallowest-
#  across-all-optimal-lines witness of D17 §3 — that difference was already declared non-
#  contractual in D17 §3a; correctness (a LIVE→DEAD occupation exists) is unchanged (D18).
# ════════════════════════════════════════════════════════════════════════════

def find_occupation_witness(root, denier, windows, depthCap):
    # Root pre-check: if denier's last move (the move that arrived at root) already occupies a
    # watched window — this handles the tactical sub-case of draw_to_lose at ply 0.
    # NOTE (code parity): the implementation checks ONLY `lastCell in win` here — it deliberately
    # SKIPS the window_live_before/dead_after test, because killedWindow's LIVE-before guard cannot
    # see a window already DEAD at root (the honest-limit). This can never yield a wrong cell: the
    # only firing case (draw_to_lose tactical) has the window provably LIVE before the best move —
    # best/played boards are identical except their last disc, and the opponent's conceded window
    # cannot already contain a denier(=player) disc on that shared pre-move board.
    if root is non-empty:
        lastCell = landing_cell(root[:-1], root[-1])
        mover    = side_to_move(root[:-1])      # who played the last move
        if mover == denier:
            for win in windows:
                if lastCell in win:             # implementation: w.includes(lastCell) only (see NOTE)
                    return { kind:'denial', verdict:'occupation',
                             line: [], finalMovestring: root,
                             cell: lastCell, window: win,
                             tie: { kind:'tied', sharedCells:[lastCell] } }

    node = root; line = []
    for _ in range(depthCap):
        if is_terminal(node): break
        scores = solver.query(node)
        col    = argmax(scores)                 # both sides play the single canonical argmax move
        child  = node + col
        cell   = landing_cell(node, col)
        mover  = side_to_move(node)
        line   = line + [{ ply: len(line), mover, col, cell, score: scores[col] }]
        if mover == denier:
            for win in windows:
                if (cell in win
                        and window_live_before(node,  win, denier)
                        and window_dead_after(child, win, denier)):
                    return { kind:'denial', verdict:'occupation',
                             line: line, finalMovestring: child,
                             cell: cell, window: win,
                             tie: { kind:'tied', sharedCells:[cell] } }
        node = child

    # No occupation found (depth cap hit before terminal, or a non-terminal solver error).
    # exhaustive:true only when the walk actually reached a terminal — guarantees no witness exists.
    exhaustive = is_terminal(node)
    return { kind:'denial', verdict:'no_occupation',
             line: [], finalMovestring: root,
             exhaustive: exhaustive,    # False = honest "none within budget"; True = theorem-verified
             tie: { kind:'independent', sharedCells:[] } }


# ════════════════════════════════════════════════════════════════════════════
#  win_half — one bounded optimal walk, enriched three ways (used by both halves)
# ════════════════════════════════════════════════════════════════════════════

def win_half(root, winner, diffAgainst=None):
    walk = walk_optimal(root, winner)               # D16: stops at the deciding fork, else the four

    # D16 — FORK STOP. walk_optimal halts at the first node (after a winner move) where the winner
    # holds an unstoppable double threat: detectDoubleThreat(board, winner).matched AND NOT
    # detectImmediateThreat(board, opponent)  (production detectors, I8/I12). This is the
    # tactical-vs-parity discriminator. A fork is ALWAYS tactical, never parity.
    if walk.terminal == 'fork':
        reg  = 'forced_sequence' if walk.line else 'immediate'      # NOT derived from fwd (supersedes D5)
        half = { kind:'winning_line', terminal:'fork', register: reg,
                 forkCase: walk.forkCase,                           # 'A' (>=2 gravity-top) | 'B' (stacked)
                 forkCells: walk.forkCells, forkWindows: walk.forkWindows,
                 completingCell: walk.forkCells[0], window: walk.forkWindows[0],
                 line: walk.line, finalMovestring: walk.finalMovestring, pliesToEnd: walk.pliesToEnd }
        # named at the FORK NODE (the tactic may not exist yet at root): Case A -> double_threat;
        # Case B -> figure_7 if present (more specific) else double_threat. j_shape is NOT a fork.
        half.tactic = name_fork(walk.finalMovestring, winner, walk.forkCase)
        # anchorCells = every cell of the fork windows (so the tie can find a constituent the
        # punishment sits on, e.g. c3r3 on 214444115623).
        half.anchorCells = union(walk.forkWindows)
        return half

    fwd  = 43 - 2*abs(score_of(winner, root)) - len(root)
    reg  = register(fwd)                            # immediate | forced_sequence | parity

    half = { kind:'winning_line', register: reg,
             completingCell: walk.completingCell, window: walk.window,
             line: walk.line if shows_line(reg) else None,    # parity line suppressed (too long to teach)
             finalMovestring: walk.finalMovestring, pliesToEnd: walk.pliesToEnd }

    if reg == 'parity' and walk.terminal == 'win':            # enrichment A: parity attribution
        # fires ONLY for a genuine parity win — i.e. NO fork on the whole PV (D16 annotates D7)
        half.parityAttribution = attribute_parity_win(root, walk.window, walk.completingCell, winner)

    half.tactic = name_half(root, winner, reg,                # enrichment B: solver-gated tactic name
                            anchor=realized_locus(walk, half), diffAgainst=diffAgainst)
    return half


def register(fwd):                                  # fwd = free proxy for "is there something short to show"
    fwd <= 2  -> 'immediate'                         # state as fact: "col C completes your four at <cell>"
    fwd <= 6  -> 'forced_sequence'                   # render the literal short line (most instructive)
    else      -> 'parity'                            # do NOT render the line; describe the structure


# parity attribution: project the SOLVER-realized window back onto the root; describe the group.
#   KB: community-z-threat (height-relative count); allen-parity raw-row trap AVOIDED.  Solver-free.
#   NOTE (review F3, 2026-07-02): leverCells / forcedFirstRequired / groupKind were REMOVED as an I2
#   fabrication — an odd height-parity count is NOT a detector-backed z-threat/lever. `empties` carries
#   the raw parity only; detector-backed naming is deferred (D7 / D24).
def attribute_parity_win(root, window, completingCell, winner):
    if window has any LOSER disc:  return { nameable: False }      # multi-window board-fill (unnameable)
    empties = [ {cell, zcount = row_1indexed - colHeight, parity: odd|even}  for empty in window ]
    return { nameable: True, controllingGroup: window, ownDiscs, empties, completingCell,
             parityNamingDeferred: True }                          # canonical V1/Aftereven naming DEFERRED


# defensive_half — SUPERSEDED by D18 for draw_to_lose half (a).
# The draw_to_lose half (a) is now find_occupation_witness(bestRoot, denier=player, windows=concededWindows).
# The tactical sub-case (ply-0 root occupation) and the zugzwang sub-case both fall out of the unified
# primitive; no separate defensive_half dispatch is needed.  Retained here for historical reference only.


# ════════════════════════════════════════════════════════════════════════════
#  TACTIC NAMING — classifyPattern PROPOSES, the solver DISPOSES (two gates)
#    Principle: a tag may name a half ONLY IF consistent with the solver-proven
#    NATURE (register) and LOCUS (the realized win) of that half's outcome.
# ════════════════════════════════════════════════════════════════════════════

def name_half(root, perspective, register, anchor, diffAgainst=None):
    present  = classifyPattern(root, perspective)            # Map<tag,{cells}> — ALL tactics on board
    uniqueTo = present \ classifyPattern(diffAgainst, perspective)  if diffAgainst else present
    #   the tagBlunder Phase-C diff: what BEST builds that PLAYED does not.

    admissible = [ tag for tag in present
                   if register_class_ok(tag, register)              # GATE 1: nature
                   and cells_touch(present[tag].cells, anchor) ]    # GATE 2: locus (>=1 cell on the win)

    if admissible == []:  return None                        # honest null — never fabricate a name
    chosen = best_by(admissible, key=(is_in(uniqueTo), TAG_PRIORITY_rank))   # diff = tiebreak, NOT a gate
    return { tag: chosen, cells: present[chosen].cells, fromDiff: chosen in uniqueTo }


# GATE 1 — register-class consistency. INVARIANT: register is a function of win-distance, so a short
#   tactic cannot win a long (parity) position and vice-versa.
#     tactical   {immediate_threat, double_threat, forced_win, figure_7, j_shape, undercut, overcut}
#                admissible iff register in {immediate, forced_sequence}
#     structural {z_threat, odd_even_threat, claimeven, major_threat_parity, major_threat_nonparity}
#                admissible iff register == 'parity'
#     contextual {forced_block, forbidden_columns, minor_threat}  -> last-resort only (any register)

# GATE 2 — realized-resource alignment. The tag must PARTICIPATE in the solver's actual win.
#   anchor = realized_locus = window ∪ PV-line cells ∪ parity controllingGroup/levers
#   Causal test: a figure_7/undercut LEVER sits on the PV even if not a completion cell -> survives;
#   an incidental same-class tactic the solver never rides -> dropped.
def realized_locus(walk, half):
    return cells(walk.window) | cells(walk.line) | cells(half.parityAttribution.controllingGroup?)


# ════════════════════════════════════════════════════════════════════════════
#  SHARED PRIMITIVES (unchanged from reason-case-taxonomy.md / blunder-reason-evidence.md)
# ════════════════════════════════════════════════════════════════════════════

def walk_optimal(root):               # both sides argmax to terminal -> {completingCell, window, line, ...}
    ...                               # under optimal play each side collapses to one line; no branching.

def non_losing_reply_count(node):     # free counterplay signal (one already-computed score vector)
    return count(c for c in legal(node) if oppScore[c] >= 0)

def swindle_gate(node):               # the ONLY branching search; bounded, or exhaustive <=10 empties
    DFS opponent nodes (DEPTH=6, BRANCH=3, player tied-best capped 2; dedup by movestring):
        adm = [c in legal : detectImmediateThreat(node+c, player) is empty]  # D19: opponent blocks win-in-1
        if player has immediate threat and adm == []: return BLUNDER (unblockable) # double/forced-col/poisoned
        if min(oppScore over adm) <= 0:  return BLUNDER witness  # ADMISSIBLE non-winning reply -> swindle
        branch over (adm ∩ winningCols) only                    # never descend an inadmissible reply
    return NOT_A_BLUNDER              # SOUND for Blunder; EXACT NotABlunder only when exhaustive.
    # D19: an admissible mistake is one an opponent that always blocks IMMEDIATE (win-in-1) threats
    # could still make. Never counts "opponent hangs a win-in-1". IMMEDIATE != MAJOR threat.
```

## The tie principle, stated once

Half (b) takes half (a) and the solver, and emits `tie = { kind, ... }`:

- `tied` — the punishment exploits a square of the lost resource (`win_to_draw` save == your winning
  square; `win_to_lose` they win where you vacated; `draw_to_lose` the player's occupation cell is
  inside the opponent's conceded window — D18, both tactical and zugzwang sub-cases).
- `independent` — no shared square. Can still occur for `win_to_draw` `no_occupation` (honest: the
  draw holds without the opponent ever occupying a pattern cell). Reporting this is the honest
  output; the canonical "you handed it to them" sentence must NOT be emitted here.
- `temporal` — `lose_to_faster_lose`: the tie is speed (played loss faster than the swindle grind),
  not a shared cell.

This replaces the earlier `winningCols` shortcut: the relationship is verified against
`lostResource.anchorCells` (the resource object), not a re-derived proxy, and it is applied in **every**
case rather than only `win_to_draw`.

## Honest limits (carried forward)

- **Parity naming deferred** — `parityAttribution` emits the controlling group + per-cell height
  parity (`empties`) but NOT the canonical Allis odd/even / V1 / Aftereven name, and NOT a "lever" /
  "z-threat" claim. The `leverCells` / `forcedFirstRequired` / `groupKind` fields were REMOVED
  2026-07-02 (review F3 / D24): labeling an odd height-parity empty a "lever/z-threat" is an I2
  fabrication (a z-threat is detector-backed — KB community-z-threat needs a MAJOR threat at the cell).
  The detector-backed replacement is the deferred D7 milestone.
- **Tactic naming falls to `null`** when no `classifyPattern` tag passes both gates — correct, not a
  gap; `parityAttribution` carries the explanation for parity wins.
- **Tie may be `independent`/`temporal`** — not every case shares a cell; the engine reports the
  relationship rather than forcing one.
- **`contextual` class precedence** (`forced_block`/`forbidden_columns`/`minor_threat`) not yet pinned.
- **Provisional thresholds** — `forced_sequence <= 6`, `parity > ~12`, gate `DEPTH=6 / BRANCH=3`,
  `TAG_PRIORITY` order — all unvalidated against a labeled set.
```
