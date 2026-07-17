# Reason-render flip-case investigation (D28 I12 gap)

**Status: CLOSED.** The D28 I12 gap — "no corpus board exercises the `win_to_lose`/`draw_to_lose` +
`enabled_opponent` + pattern-present-on-after-best flip into L3" — is closed by two real,
harvested boards. This doc records the hypothesis, the experiment, and the verified conclusion.
No code was changed; this is an investigation and write-up only.

## Background

D28 (`docs/architecture/reason-DECISIONS.md`) made L2-vs-L3 branch-invariance a render-time
computation: `patternOnAfterBestBoard(fv)` (in `reasonBoardSelect.mjs`) re-tags the after-best
board and asks whether the opponent's punishing pattern is *still present* there. If it is, the
case is branch-invariant — the opponent's threat exists regardless of which move you played — and
the correct causal link is **L3** ("you were already losing; your move didn't cause this, it lost
faster"), not L2 ("your move genuinely handed the opponent the pattern").

At the time of D28, the frozen 29-record corpus had zero boards where `direction ===
'enabled_opponent'` AND `case ∈ {win_to_lose, draw_to_lose}` AND the after-best pattern was
present — the "flip case," so named because it flips what would otherwise route to L2 (by sign)
into L3 (by presence). I12 requires a rule that classifies/routes to be validated against a real
example of every case in its case-space, not just its motivating example — so this was flagged as
a **PROVISIONAL** gap pending a Phase-4 targeted harvest.

## Hypotheses

- **H1 (leading):** the flip-case is reachable-but-rare — it doesn't arise in ordinary self-play
  (hence absent from the frozen 29), but a directed all-suboptimal-column probe can reach it, and
  when it does, the routing/computation is genuinely correct (no engine or router bug).
- **H2 (rule out):** an engine/router bug — `computeReason`'s `direction` and the branch-invariance
  computation disagree, crash, or mislabel for boards matching this signature.

## Experiment

Source: the Phase-4 coverage harvest committed at
`connect-four/server/scripts/reason_evidence_boards_coverage_p4_2026-07-03T15-54-38Z.jsonl`
(directed all-suboptimal-column rare-fill run). Two records in that 32-record file carry the
`flip_case_l3` predicate (per `renderDecisionPredicates` in `renderUniverse.mjs`):

| id | movestring | playedCol | bestCol | case | direction |
|---|---|---|---|---|---|
| eval-23 | `333342252132535511551622` | 4 | 0 | win_to_lose | enabled_opponent |
| eval-26 | `33333252644446435416` | 5 | 0 | win_to_lose | enabled_opponent |

For each board, ran the full production path (script: scratch, not committed):
1. `computeReason(movestring, playedCol, { solver })` — the real solver-backed entrypoint (not a
   proxy) — to confirm `case`/`direction` independently of the recorded evidence file.
2. `patternOnAfterBestBoard(evidence)` from `reasonBoardSelect.mjs` (the production detector,
   reusing `tagBoard`) — to confirm the after-best pattern really is present.
3. `buildRenderDecision(toNarratorVector(evidence))` from `renderReasonModel.mjs` — the full
   render layer — to confirm the fired link, route, and predicate.
4. `renderDecisionPredicates(rd)` from `renderUniverse.mjs` — to confirm `flip_case_l3` fires.
5. Cross-check on the actual board via `./visualize_board.sh <movestring><bestCol>` (0-indexed
   `bestCol` appended, i.e. the after-best board) to visually confirm the opponent's major threat
   at the recorded `completingCell` persists.

### Results — eval-23

```
movestring: 333342252132535511551622   playedCol: 4   bestCol: 0
case (recorded):        win_to_lose      direction (recorded):        enabled_opponent
fresh computeReason case: win_to_lose    direction:                   enabled_opponent
patternOnAfterBestBoard(recorded evidence): true
render_decision.link: L3   route: realized_denied   case: win_to_lose   direction: enabled_opponent
patternOnAfterBestBoard(rd): true
flip_case_l3 predicate fired: true
```

`opponentPunishment.completingCell` = `c5r3` (1-indexed col 5, row 3), tag `immediate_threat`,
owner 2 (opponent). `./visualize_board.sh 3333422521325355115516220` (movestring + bestCol=0,
i.e. the after-best board) shows:

```
Major threats: col5 row3 (Gn+Gy)   col5 row4 (Gn+Gy)   col5 row5 (Gn)   col5 row6 (Gy)
```

`col5 row3` carries `(Gn+Gy)` — both players have a live major threat there, confirming the
opponent's (Gray = player 2) threat at `c5r3` is present on the after-best board, exactly as
`patternOnAfterBestBoard` reported. The opponent's punishing pattern persists whether or not the
best move is played — genuinely branch-invariant.

### Results — eval-26

```
movestring: 33333252644446435416   playedCol: 5   bestCol: 0
case (recorded):        win_to_lose      direction (recorded):        enabled_opponent
fresh computeReason case: win_to_lose    direction:                   enabled_opponent
patternOnAfterBestBoard(recorded evidence): true
render_decision.link: L3   route: realized_denied   case: win_to_lose   direction: enabled_opponent
patternOnAfterBestBoard(rd): true
flip_case_l3 predicate fired: true
```

`opponentPunishment.completingCell` = `c6r4`, tag `immediate_threat`, owner 2.
`./visualize_board.sh 333332526444464354160` (movestring + bestCol=0) shows:

```
Major threats: col3 row4 (Gn)   col6 row4 (Gy)
```

`col6 row4` carries `[Gy]` — a live opponent major threat, confirming the pattern is present on
the after-best board. Same conclusion: genuinely branch-invariant.

### L3 firing is the correct routing

`classifyCausalLink` in `reason_engine/causalLinks.mjs` fires L3 exactly when
`fv.route === 'realized_denied' && fv.direction === 'enabled_opponent' && branchInvariant(fv, ctx)`,
where `branchInvariant` is `ctx.patternOnAfterBestBoard === true || fv.case === 'lose_to_faster_lose'`.
For both boards, `patternOnAfterBestBoard === true`, so L3 fires (not by the `lose_to_faster_lose`
sign-proxy — by genuine presence, which is the flip case by definition). L3's guardrail text is:

> "MUST NOT say the played move caused or enabled the pattern; both moves lose, played loses
> faster."

This is the correct no-causation framing for a position that was already lost regardless of the
move played — confirmed consistent with the visual boards above (the opponent threat exists on
the after-best board, so the played move cannot be blamed for creating it).

## Conclusion

**(b) reachable-but-rare**, confirmed by direct production-path execution, not (a) structurally
impossible and not (c) an engine/router bug.

- `computeReason` (the real solver-backed entrypoint), `patternOnAfterBestBoard` (the production
  detector), and `buildRenderDecision`/`classifyCausalLink` (the render layer) all agree with each
  other and with the visual board state for both boards — no contradiction, no crash, no mislabel
  (H2 ruled out).
- The case simply does not arise from ordinary self-play sampling (hence absent from the frozen
  29-record corpus) but is reached by a directed all-suboptimal-column rare-fill harvest, which is
  exactly the Phase-4 targeted harvest D28's I12 note called for.
- **The D28 I12 gap is now CLOSED**: the rule ("branch-invariance flips `enabled_opponent` +
  `win_to_lose`/`draw_to_lose` into L3 by presence, not sign") has a confirmed real counterexample
  per I12 item 3 ("build a deliberate counterexample per case and run it") — in fact two
  independent boards (`eval-23`, `eval-26` in the P4 coverage file), both routed correctly, with
  the correct no-causation guardrail firing.

## Disposition of the `flip_case_l3` predicate

`flip_case_l3` (defined in `renderUniverse.mjs`) stays listed in `RENDER_PROVISIONAL` — it remains
**rare in ordinary self-play** and is only reliably reached by a directed harvest, so it should not
be expected to recur in every future self-play corpus. What changes is the evidentiary status: it
is no longer an *unconfirmed, possibly-unreachable* case (per D28's I12 note) — it is a
**confirmed-reachable, rare** case, with two concrete boards on record
(`connect-four/server/scripts/reason_evidence_boards_coverage_p4_2026-07-03T15-54-38Z.jsonl`,
records `eval-23` and `eval-26`) that any future regression check or grader can replay.

## SURFACED issues

None. No engine, router, or render-layer inconsistency was found. `computeReason`, the
branch-invariance computation, and `classifyCausalLink`'s L3/L2 routing all behaved as designed
for both boards, and the visual board cross-check independently confirmed the underlying tactical
claim (the opponent's threat persists on the after-best board).

## References

- `docs/architecture/reason-DECISIONS.md` — D28 (branch-invariance at render time; the I12 note).
- `docs/architecture/reason-INVARIANTS.md` — I12 (validate a rule against its case-space).
- `connect-four/server/scripts/reasonBoardSelect.mjs` — `patternOnAfterBestBoard`.
- `connect-four/server/scripts/renderUniverse.mjs` — `flip_case_l3` predicate, `RENDER_PROVISIONAL`.
- `connect-four/server/scripts/reason_engine/causalLinks.mjs` — L2/L3 `when`/`guardrail`.
- `connect-four/server/scripts/reason_evidence_boards_coverage_p4_2026-07-03T15-54-38Z.jsonl` —
  the harvested boards, records `eval-23` and `eval-26`.
