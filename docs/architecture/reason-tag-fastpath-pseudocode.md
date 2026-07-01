# Blunder-reason engine — the tagBlunder realized/denied router (design)

> **Read the four canonical reason docs first** (`reason-INVARIANTS.md`, `reason-DECISIONS.md`,
> `reason-case-taxonomy.md`, `blunder-reason-evidence.md`) plus `reason-engine-pseudocode.md`. This design
> **generalizes the D18 `findOccupationWitness` primitive** across move directions and routes the
> short, cell-nameable tactical tags through it. It does **not** reverse D16/D17/D18 — it subsumes the
> `win_to_draw` fork case as one instance of a symmetric rule.

Status: **DESIGN — approved-in-principle 2026-06-30** (owner-directed), not yet implemented.

## Motivation — one worked case

`3321234543`, played col 0, best col 3 (0-indexed). Green to move; Gray holds a standing
three-in-a-column at col 4 (`c4r2·c4r3·c4r4`, `c4r5` open, gravity-top). Correct move blocks at col 3;
playing col 0 lets Gray complete at `c4r5`.

- `tagBlunder` tags it **`forced_block / defensive_miss`** — one sentence: *you conceded an immediate
  threat.*
- The sign engine sees `bestScore=-4, playedScore=-16` → both `<0` → `lose_to_faster_lose`, runs the
  swindle gate, and emits a `conditional_swindle` with a **parity attribution on a diagonal** (`c1r4`),
  `tacticTag: minor_threat`, `pliesToEnd: 15`. Convoluted and misleading for "you didn't block a
  mate-in-1."

## The unifying insight — realized vs. denied (asymmetry is cost, not rigor)

Every tactical-tag blunder decomposes into the same two halves:

- **Realized half — trivial.** A pattern that forms in **one move** is exhibited straight from
  `classifyPattern`: here are the cells, one drop makes it. No search.
- **Denied half — a solver simulation, potentially multi-move.** Proving a pattern **cannot** be formed
  (or can't be re-formed) under optimal play is the hard half. It needs a bounded solver walk. This is
  true for **every** case. `immediate_threat` only *looks* trivial here because its denial resolves in
  one move (a single block); `double_threat` / `figure_7` need the multi-move occupation-witness to
  prove the fork is dismantled.

The denied half **is** `findOccupationWitness` (the D18 primitive), generalized so `denier` and `root`
flip with the **direction** instead of being hard-wired to `opponent`/`playedRoot`.

### Direction is symmetric — it just swaps which board is which

| tag / direction | realized half (`classifyPattern`, 1 move) | denied half (`findOccupationWitness`, 1…N moves) |
|---|---|---|
| `double_threat`/`figure_7` `missed_own` | `correctRoot`, **you** form the fork | from `playedRoot`, **opponent** denies your fork |
| `double_threat`/`figure_7` `enabled_opponent` | `playedRoot`, **opponent** forms the fork | from `correctRoot`, **you** deny the opponent's fork |
| `immediate_threat` `missed_own` | `moves`, **you** have the win-in-1 | from `playedRoot`, **opponent** blocks it |
| `immediate_threat` `enabled_opponent` | `playedRoot`, **opponent** has the new win-in-1 | from `correctRoot`, **you** block it |
| `forced_block` `defensive_miss` (**`3321234543`**) | `moves`, **opponent** already has the threat | from `correctRoot`, **you** block it (occupation at `c4r5`, ply 0) |

### Which I3 field each half becomes — decided by who OWNS the pattern

I3 is preserved: `lostResource` (a) = what the best move preserved; `opponentPunishment` (b) = how the
played move loses.

- **Pattern is YOURS** (`missed_own`): realized → `lostResource`; denied → `opponentPunishment`.
- **Pattern is the OPPONENT's** (`enabled_opponent` / `defensive_miss`): denied → `lostResource` (the
  defense you had); realized → `opponentPunishment` (the threat you handed over).

For `3321234543` this yields: `lostResource` = "block at `c4r5`" (denied, occupation at ply 0);
`opponentPunishment` = "opponent completes at `c4r5`" (realized). `tie` = `c4r5` (shared cell). Exactly
the intended one-sentence lesson, no parity swindle.

## Routing — tag-first

`tagBlunder` runs in front and its `tag` picks the engine:

- **Realized/denied set** = `{ immediate_threat, forced_block, double_threat, figure_7 }`. These are the
  tags with a one-move-realizable half. Routed through `realized_denied_reason`.
- **Everything else** — structural/zugzwang (`claimeven`, `z_threat`, `overcut`, `undercut`,
  `major_threat_parity`, `major_threat_nonparity`, `minor_threat`) and score fallbacks
  (`drawing_move`, `suboptimal_move`) — falls through **unchanged** to the existing sign-taxonomy
  two-walk engine (D16/D17/D18/D19). "Two full simulations" is exactly the case where **neither** half
  is a one-move pattern, so both halves must be walked.
- **`forced_win` and `j_shape` are deliberately OUT** of the realized/denied set: `forced_win` is not a
  one-move pattern, and `j_shape` is a minor-threat/zugzwang precursor (KB `allen-j-configuration`; D16
  excludes it from the fork-stop). Both route to the two-walk engine. *(Open — confirm.)*

### Relationship to the sign taxonomy and the NotABlunder guards

- **Guard 1 kept (D3):** `bestScore>0 && playedScore>0` (`win_to_slower_win`) → NotABlunder, before
  `tagBlunder` is consulted. You win either way.
- **Not actually worse:** `playedScore === bestScore` → NotABlunder (no outcome lost).
- **The route fires only for tactics that are actually near-term AND detector-confirmable — otherwise
  it falls through.** Two gates, both required, keep it conservative (verified during implementation
  2026-07-01):
  1. **`tagBlunder` must name a realized/denied tag.** `tagBlunder`'s Phase C looks only **one ply**
     past `correctCol`, so a fork that materializes deep (e.g. the `win_to_draw` board `214444115623`,
     whose fork is ~10 plies down the forced line) is tagged `drawing_move`, **not** `double_threat`.
     Such deep forks never enter the route; they stay on the sign engine and keep their D18
     occupation-witness (`214444115623` → `c3r3`) unchanged. This is the desired split — the realized
     half must be a *one-move* pattern, and a deep fork is not one.
  2. **`realizedPattern` must confirm the tag on the realized board.** When `tagBlunder` names a tag
     that `realizedPattern`'s stricter production detector cannot exhibit as a one-move pattern
     (detector disagreement — e.g. `detectForkAt`'s unstoppable-guard rejects a `classifyPattern`
     double_threat), `realized_denied_reason` returns **null** and `computeReason` **falls through to
     the sign engine**. I2: never fabricate a resource we cannot show; prefer the proven full engine.

  Net effect: the route fires for genuinely near-term, cell-exhibitable tactics (the motivating
  `3321234543` `forced_block/defensive_miss`); everything else — deep forks, detector mismatches, and
  all non-tactical tags — is handled by the unchanged sign-taxonomy engine. There is no regression
  because every non-firing case reverts to today's behavior.

## Pseudocode

```python
REALIZED_DENIED_TAGS = { immediate_threat, forced_block, double_threat, figure_7 }

def reason(movestring, playedCol):
    scores      = solver.query(movestring)
    bestCol     = argmax(scores); bestScore = scores[bestCol]
    playedScore = scores[playedCol]
    player      = side_to_move(movestring); opponent = other(player)

    if bestScore > 0 and playedScore > 0: raise NotABlunder()   # win_to_slower_win (D3)
    if playedScore == bestScore:          raise NotABlunder()   # nothing lost

    tag, direction = tagBlunder(movestring, playedCol, bestCol, solver)   # may raise NotABlunder

    if tag in REALIZED_DENIED_TAGS:
        rd = realized_denied_reason(movestring, playedCol, bestCol,
                                    tag, direction, player, opponent, scores)
        if rd is not None:            # realizedPattern confirmed the tag as a one-move pattern
            return rd
        # else: detector could not exhibit the tag -> fall through to the sign engine (I2, no fabrication)

    return sign_taxonomy_engine(movestring, playedCol)          # unchanged (D16/D17/D18/D19)


def realized_denied_reason(movestring, playedCol, bestCol, tag, direction, player, opponent, scores):
    correctRoot = movestring + bestCol
    playedRoot  = movestring + playedCol

    # ── who owns the pattern, where it is REALIZED (one move), where it is DENIED ──
    if direction == 'missed_own':
        owner, denier = player, opponent
        realizedRoot  = correctRoot            # the best move forms YOUR pattern
        deniedRoot    = playedRoot             # after the blunder, the opponent denies it
    else:  # 'enabled_opponent' | 'defensive_miss'
        owner, denier = opponent, player
        realizedRoot  = (movestring if direction == 'defensive_miss' else playedRoot)
        deniedRoot    = correctRoot            # the best move would have denied it

    # ── REALIZED half: trivial, straight from the detector ──
    pat      = classifyPattern(realizedRoot, owner)[tag]        # cells (tested detector, I8)
    windows  = pattern_windows(realizedRoot, owner, tag)        # detector's winning window(s)
    realized = { kind:'realized_pattern', tag, owner,
                 cells: pat.cells, windows, completingCell: windows[0].openCell,
                 register:'immediate', finalMovestring: realizedRoot }

    # ── DENIED half: the generalized D18 occupation-witness (bounded by DEPTH, not a cap) ──
    denied = find_occupation_witness(deniedRoot, denier=denier, windows=windows,
                                     depthCap=42-len(deniedRoot))
    #   occupation  -> denier occupies+kills a window cell (LIVE->DEAD); that cell is the tie.
    #   no_occupation(exhaustive) -> the pattern is NOT deniable here (the owner's threat stands).

    # ── assign to the I3 fields by WHO owns the pattern ──
    if owner == player:                        # missed_own: you owned the resource
        lostResource, opponentPunishment = realized, denied
    else:                                      # enabled/defensive: opponent owns the threat
        lostResource, opponentPunishment = denied, realized

    tie = ({ kind:'tied', sharedCells:[denied.cell] } if denied.verdict == 'occupation'
           else { kind:'independent', sharedCells:[] })

    return { route:'realized_denied', tag, direction,
             case: sign_case(bestScore, playedScore),   # kept for continuity
             lostResource, opponentPunishment, tie,
             replyHistogram: { afterBest:   non_losing_reply_count(correctRoot),
                               afterPlayed: non_losing_reply_count(playedRoot) },
             gate: None }
```

## Invariant / decision reconciliation

- **I3 (two separate halves) — kept.** Realized and denied are distinct fields; the owner mapping
  assigns them to `lostResource` / `opponentPunishment`. Never merged.
- **I8 (reuse detectors) — kept and extended.** Realized half = `classifyPattern`; denied half =
  `findOccupationWitness`. No reinvented geometry.
- **I9 / Occam — strengthened.** One primitive (`findOccupationWitness`) now serves every denied half
  by flipping `denier`/`root`; the sign-case dispatch shrinks to the non-tactical tags.
- **I2 (never fabricate).** The realized pattern is decisive because the **sign gate** proves it
  (`bestScore>0` for a missed win; `playedScore<0` for a handed loss); the denied half is
  solver-grounded by the witness walk. Neither half is asserted without a solver guarantee.
- **D16/D17/D18 — generalized, not reversed.** D18 hard-wired `denier=opponent, root=playedRoot`
  (`win_to_draw`) and `denier=player, root=bestRoot` (`draw_to_lose`). This design keeps the primitive
  and derives `denier`/`root` from the tag direction; the two D18 instances become special cases.
- **D3 preserved; D4/D19 (`lose_to_faster_lose` gate) only reached for non-tactical fall-through.**

## Open items for the implementation plan

- `pattern_windows(root, owner, tag)`: reuse `detectDoubleThreat` / `detectFigure7` /
  `detectImmediateThreat` / `getWinningWindows` to return the winning window(s) + open cell for the tag.
- Confirm `forced_win` / `j_shape` stay out of `REALIZED_DENIED_TAGS`.
- `find_occupation_witness` is already generalized (D18) — verify it accepts arbitrary `denier`/`root`
  cleanly and that the ply-0 root-occupation pre-check fires for `defensive_miss` (block at ply 0).
- Fixture regression: run the new engine over `reason_fixture.jsonl`; label each row with `route`
  (`realized_denied` | `sign`); gate the existing sign-shape assertions on `route === 'sign'`; add
  realized/denied assertions. Confirm `214444115623` reproduces its D18 witness under the new route.
- I12 validation: a sourced counterexample board per `(tag, direction)` in the realized/denied set
  (via `gameSampling`, never hand-rolled), run through the real `tagBlunder` + `realized_denied_reason`,
  added to `reason_fixture.jsonl`.
- Output-shape threading: `route` / `tag` / `direction` and the `realized_pattern` half kind into
  `build_evidence.mjs`, `/admin/fv-suff`, and the explain prompt.

## Honest-limits: I12 coverage gaps (Task 5, 2026-07-01)

Per I12, every `(tag, direction)` pair in `REALIZED_DENIED_TAGS × {missed_own, enabled_opponent,
defensive_miss}` should have a sourced fixture counterexample verified through `computeReason`. **Five**
pairs are covered in `reason_fixture.jsonl` / `reason_evidence_all.jsonl` (`immediate_threat/missed_own`,
`immediate_threat/enabled_opponent`, `forced_block/defensive_miss`, `double_threat/missed_own`, and —
after the forkCase-aware naming fix, 2026-07-01 — `figure_7/missed_own`, sourced from the Case-B board
`3333344440625621503122` played 6, asserted in the `D16 Case B (diverted)` test).
Two pairs remain **PROVISIONAL — unsourced**:

- `double_threat/enabled_opponent`
- `figure_7/enabled_opponent`

Harvest attempt (pre-fix): streamed `playGame` self-play (two parallel seeds, ~600 games combined,
~60,000 candidate blunder columns checked via `tagBlunder`) looking for the then-three unsourced
`(tag, direction)` pairs. Zero hits. Script: `scratchpad/harvest_realized_denied.mjs` (not committed —
scratch, per convention).

Why the remaining two are plausible rather than a bug (do NOT treat as blocking):
- **`figure_7` reachability (RESOLVED for `missed_own`):** `tagBlunder` never *assigns* `figure_7` —
  `figure_7` is checked in `MISSED_OWN_PRIORITY` / `ENABLED_OPP_PRIORITY` immediately AFTER
  `double_threat` (`classifier.js` ~line 1726, ~1798), and `detectDoubleThreat` matches BOTH Case A
  (>=2 gravity-top columns) and Case B (single-column stacked) forks, so `double_threat` always wins
  the priority race. **However**, the router's forkCase-aware refinement (2026-07-01) renames the
  *emitted* tag to `figure_7` when `realizedPattern` reports `forkCase === 'B'` — so a Case-B fork that
  `tagBlunder` calls `double_threat` is surfaced as `figure_7` by the router. That is how
  `figure_7/missed_own` became reachable and sourced. `figure_7/enabled_opponent` is still unsourced
  only because no Case-B *enabled_opponent* fork turned up in the harvest (the enabled direction is the
  narrower condition below), not because `figure_7` is unreachable.
- `double_threat/enabled_opponent` (and `figure_7/enabled_opponent`) requires the OPPONENT (not the blunderer) to gain a fresh
  double-threat fork under an optimal reply that the correct line's optimal replies never produce.
  This is a narrower existential-over-optimal-replies condition than `missed_own` (which only needs
  the blunderer's own correct-line board to hold the pattern); it may simply be rare in short
  self-play games rather than absent.

If a future harvest (longer budget, targeted search, or hand-selected known constructions run through
`gameSampling`, never hand-rolled positions) finds either of these two, add the row to
`reason_fixture.jsonl` with `route:"realized_denied"`, `expectedTag`, `expectedDirection`, a
`bucket:"rd-<tag>-<direction>"`, and `expectedCase`, per the Step-3 pattern in `reasonEngine.test.mjs`.
Until then: I12 is NOT fully closed for the realized/denied router — this is a known, documented gap,
not a fabricated pass.

## Follow-up (separate change)

Task 6 confirmed that `route`/`tag`/`direction` and the `realized_pattern`/`denial` half kinds
survive into the precomputed evidence output (`computeReason`'s return is passed through
`compute.mjs` untouched — no projection/whitelist strips them; see
`connect-four/server/scripts/reason_evidence_all.jsonl`). Note: the previous "Output-shape
threading" open item above referenced `build_evidence.mjs`, which was deleted 2026-06-30 as part
of the reason-eval 2-script pipeline consolidation (commit `4c26b3a`); `compute.mjs` is its
successor and is the file that actually needs to stay pass-through-safe going forward.

**Still explicitly OUT OF SCOPE for this plan** — tracked here so it is not lost:

- `/admin/fv-suff` (`src/pages/AdminFvSuffPage.jsx`) does not yet render the `realized_pattern` /
  `denial` half kinds or the new `route` / `tag` / `direction` fields in its Evidence or
  Eval-answers views — it still assumes the older sign-shape half kinds. See memory
  `project_admin_fv_suff_repurposed` for the current 2-mode browser design this must extend.
- The explain prompt (`explainContext.js` / the LLM narrator, i.e. `compute.mjs`'s
  `buildPrompt`/`TASK` and `reasonNarratorVector.mjs`'s `toNarratorVector`/`pruneVector`) does not
  yet teach the model how to read `realized_pattern`/`denial` halves or `route`/`tag`/`direction`
  when constructing an explanation. See memory `project_explain_system` for the current prompt
  invariants and data flow this must extend without violating.

Both are downstream UI/prompt consumers of the evidence shape, not blockers for the engine or
evidence-generation work — but the new fields are inert (computed, never surfaced to a human or
an LLM) until this follow-up lands.
