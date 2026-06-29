# Feature-Vector Sufficiency Audit — the `reason` field

**Question:** Can the `reason` field designed in `docs/epics/blunder-reason-field-epic.md`, once built, let a
coach explain **why a move is a blunder from the engineered feature vector alone** (zero LLM inference,
zero board re-reading)? **Pool:** `eval_set_large_3.json` (66 cases). **Analyzed:** 19, chosen for new
evidence; the other 47 are mapped to representatives (saturation argument below).

**Method:** every verdict is backed by reproducible solver/board commands (per-case files in `cases/`,
running log in `HANDOFF.md`, diagnostics in `TOOLS/`). Each case was routed through the epic's §5 ladder,
its `reason` payload hand-built from real evidence, run against the §14 grader checks, and then stress-tested
with the harder question: *does the payload actually explain the mistake, or merely pass a mechanical check?*

---

## Headline

**No — the design as written cannot explain ~100% of the case classes from the vector alone.** Projecting
the 19 verdicts across the 66 via the redundancy map, only **~12 of 66 (~18%)** receive an honest,
vector-grounded, grader-verifiable `reason`. The remaining **~54** fall into **six failure classes**, two of
which are *structural to a `reason` kind* (resistance, conversion = 39 cases / 59% of the pool) and cannot be
fixed by a field tweak.

The audit also produced two **positive** results worth keeping: the register's forward-distance repair is
correct and verifiable (`fwd = 43 − 2·|score| − discs`, confirmed on eval-6's documented ply-23), and the
`concrete_line` rung is genuinely sufficient for **flip-to-loss-with-an-on-board-immediate-threat** and for
**flip-to-win/draw with an on-board parity threat** — provided the decisive cell is sourced from a re-solve,
not from the frozen vector.

---

## Coverage table (19 analyzed)

| id | branch | routed kind (ACTUAL) | verdict | one-line reason |
|----|--------|----------------------|---------|-----------------|
| eval-6 | FLIP | concrete_line (slow_zugzwang) | **SUFFICIENT*** | groundable only via a mandatory re-solve; decisive diagonal is mislabeled `minor_threat` in the frozen vector |
| eval-27 | FLIP | concrete_line (defensive_miss) | **SUFFICIENT** | opponent cell c2r5 comes from `patternsOpponent`; "blocks at C" framing honest |
| eval-32 | FLIP | concrete_line (fast, missed_own) | **SUFFICIENT** | fast loss → opponent's immediate double_threat surfaces (`decisiveLine.opponent` populated) |
| eval-0 | FLIP | positional (center_control) | **SUFFICIENT** | empty board, unique near-term center win; but register mislabels + fabrication risk on populated boards |
| eval-5 | FLIP | **parity_control** | **SUFFICIENT** | on-board odd-distance z-threat at c3r4; cell in frozen vector — BUT tag is `drawing_move`, so a tag-gated rung never reaches it |
| eval-49 | FLIP | concrete_line (catalog said parity_control) | **SUFFICIENT via concrete_line** | single-open-col zugzwang; parity_control NOT validated (detector odd-only, wrong board) |
| eval-58 | FLIP | concrete_line (catalog said parity_control) | **SUFFICIENT via concrete_line** | identical to eval-49; confirms parity_control has no valid case |
| eval-15 | FLIP | concrete_line (dual-line) | **PAYLOAD_UNGROUNDABLE** | opponent line absent (`decisiveLine.opponent=null`) + schema can't carry the shared pivot cell |
| eval-29 | FLIP | concrete_line (3-disc tactical) | **PAYLOAD_UNGROUNDABLE** | opponent fork (c5r1 @ply7) absent from vector (`opponent:null`) |
| eval-46 | FLIP | concrete_line (clean win→loss) | **PAYLOAD_UNGROUNDABLE** | `decisiveLine.opponent=null` even for a clean, separate-window flip → gap generalizes |
| eval-51 | FLIP | concrete_line (figure_7) | **PAYLOAD_UNGROUNDABLE** | Case-1 short-circuit suppresses the opponent search; cell is decisive & cheap but never emitted |
| eval-1 | FLIP | OMIT (positional fabricates) | **PAYLOAD_UNGROUNDABLE / ROUTING_GAP** | near-opening draw→loss; no groundable kind; center_control solver-refuted |
| eval-2 | FLIP | OMIT (positional fabricates) | **PAYLOAD_UNGROUNDABLE** | deep zugzwang win→draw; center_control reads true but mechanism is parity |
| eval-24 | FLIP | OMIT (positional fabricates) | **PAYLOAD_UNGROUNDABLE** | best move is the EDGE + 5/7 columns win → center_control truth undefined |
| eval-7 | SAME | resistance | **ROUTING_GAP** | immediate-loss block; resistance has no cell slot → discards the explaining fact; punishable is a phantom |
| eval-8 | SAME | resistance | **INSUFFICIENT (→OMIT)** | sev-0 lost opening; punishable=win non-discriminating; can't tell "lost the game" from "was already lost" |
| eval-64 | SAME | resistance | **INSUFFICIENT (→OMIT)** | deep both-lose; 2-ply speed delta; phantom non-discriminating punishable |
| eval-42 | SAME | resistance | **INSUFFICIENT** | flagship "punish line in reach" — thesis perfectly true, yet payload byte-identical to vacuous eval-8 |
| eval-43 | SAME | conversion | **INSUFFICIENT** | both-win is still a forced win; "fewer chances to throw away" rests on unstated fallibility |

`*` SUFFICIENT only with the epic's mandatory re-solve step.

**Verdict tally:** SUFFICIENT 7 · PAYLOAD_UNGROUNDABLE 7 · INSUFFICIENT 4 · ROUTING_GAP 1.

---

## Selection log & saturation argument

Cases were selected to hit each (branch × kind) group and each suspected failure mode with the fewest cases.
New evidence each case contributed:

- **eval-6** — deep slow-zugzwang concrete_line (acid test); proved the decisive line is *not* in the frozen vector.
- **eval-49 / eval-58** — the only two `parity_control` candidates; both route to concrete_line → rung unvalidated.
- **eval-5** — discovered parity_control *can* ground (on-board odd-distance z-threat), exposing the tag-vs-structure routing gate.
- **eval-27 / eval-32** — concrete_line is sufficient for defensive-miss and fast on-board win→loss flips; bounds the opponent-line gap.
- **eval-15 / eval-29 / eval-46 / eval-51** — established the universal win→loss opponent-line-absence gap and its boundary (beyond the immediate horizon).
- **eval-0 / eval-1 / eval-2 / eval-24** — mapped the positional rung: works on the empty board, fabricates/OMITs on every populated board.
- **eval-7 / eval-8 / eval-42 / eval-64** — resistance fails in every subspecies (immediate-loss, opening, deep, flagship); the schema itself is insufficient.
- **eval-43** — conversion is structurally unable to label a both-win move a blunder.

**Saturation:** all 5 kinds and all (branch × kind) groups have ≥1 (most ≥3) analyzed representatives;
later cases only confirmed/refined earlier conclusions. Skipped cases map to representatives:

- **SAME/resistance (29)** → eval-7 (immediate-loss block) / eval-8,64 (vacuous) / eval-42 (schema): eval-4,10,11,12,14,16,17,19,23,28,30,33,34,38,41,44,45,48,52,54,55,56,60,61,62.
- **SAME/conversion (10)** → eval-43 (structural): eval-20,36,39,50,53,57,59,63,65.
- **near-opening draw→loss FLIP (9)** → eval-1 (OMIT/fabricate): eval-3,9,13,18,22,25,26,47.
- **win→draw drawing_move FLIP (6)** → eval-0/21 (positional OK, empty) + eval-2/24/37/40 (OMIT).
- **win→loss concrete_line FLIP** → eval-32/31 (fast, groundable) vs eval-15/29/46/51/35 (beyond-horizon, ungroundable).

---

## Unaddressed issues (the deliverable) — ordered by cases/classes blocked

### ISSUE 1 — `resistance`'s `{loserSide, speed, punishable}` payload is insufficient at the SCHEMA level (≈29 cases, all SAME/both-lose)
The schema discards every quantity that separates a real blunder from a vacuous one. **Proven by eval-42**, the
epic's own flagship "punish line in reach" case: the thesis is perfectly, re-solve-confirmed true (better move
lasts 25 plies vs 5; opponent has 1 safe reply vs 6; real winning cell c2r5) — yet the payload is **byte-for-byte
identical to eval-8's** sev-0 lost-opening payload `{loserSide, speed:"slower", punishable:"win"}`. Three root
defects: (a) `speed` is an enum word, not the numeric gap (25-vs-5 and 40-vs-38 both emit "slower"); (b)
`punishable = reachability.played.ceiling` is **non-discriminating** — `best.ceiling` is also `win` in eval-8/42/64,
and the line is frequently a **mistake-mode phantom** that under optimal play does not exist (the player is
already lost); (c) there is **no cell slot**, so eval-7's actual reason (block Gray's immediate win at c7r4) is
thrown away and the move is mislabeled "lasts longer for more punish chances" when it simply fails to block.
**Cases:** eval-7, eval-8, eval-42, eval-64 (proven) + the 25 listed.
**Fix:** add numeric `forwardDistanceGap`, `opponentSafeReplies`, a re-solve-confirmed `punishableCell`; redefine
`punishable` as a **diff vs `best.ceiling`** with a phantom flag; gate on `severity`/a new `preMoveFloor` and
**OMIT** when sev-0 or the position was already lost pre-move; route immediate-loss defensive misses to a concrete
block line (Issue 3) even when same-floor.

### ISSUE 2 — `conversion` cannot label a both-win move a blunder (10 cases, all SAME/both-win)
Structural, not a tuning problem. **Proven by eval-43** (the strongest conversion case: 20-ply gap + strictly more
winning windows): the played move is still a **forced win**. "Wins sooner → fewer chances to throw it away" rests
entirely on a player-fallibility assumption that **no vector field expresses**, and severity there is a *conversion-speed*
measure (score delta), not an error measure. A coach would overstate a non-mistake. **Cases:** eval-43 + the 9 listed.
**Fix:** reframe `conversion` as a *preference*, not a blunder — `betterMoveDoes` must say "both moves win"; add a
`convertibilityRisk` signal (e.g. sole-winning-move count along the played line) and emit `conversion` only when the
longer line is genuinely hard to hold; otherwise OMIT.

### ISSUE 3 — `concrete_line` flip-to-loss is ungroundable: `decisiveLine.opponent` is null beyond the immediate horizon (≈6–8 cases + the entire win→loss design)
The half of the explanation that names the blunder — *what the played move allows* — is absent from the production
vector for any win→loss flip whose punishing line is beyond ply ~1. **Proven by eval-46** (clean, separate-window
flip → `decisiveLine.opponent=null`, `oppCategoryExamples=[]`) and **eval-51** (the Case-1 short-circuit returns at
the player-side novelty winner before the opponent search ever runs; the decisive cell is genuinely decisive and
cheap — reachable at depth 8 — but never emitted). **Bounded by eval-32**: a *fast* loss to an on-board immediate
double_threat (realizedOnPly 1) *does* surface and grounds. So the gap is **beyond-immediate-horizon-specific**, not
universal. Note `winningLinesThroughCell:1` also **understates** decisiveness (eval-51's cell is a fork that passes
only via "completes under optimal defense") — so `winningLines:1` alone is not a sufficient decisiveness signal.
**Cases:** eval-15, eval-29, eval-46, eval-51 (proven; eval-32/31 ground).
**Fix:** on **every** FLIP-to-loss, run the optimal-mode punishment re-solve of the **played** branch and populate
`decisiveLine.opponent`; lift it out of the Case-1 `if(!out)` short-circuit (the epic's Story B targets the
short-circuit, but frames it as a depth/decisiveness fix — the load-bearing issue is opponent-line *absence*). Source
`completingCell` from this re-solve, never from the frozen lookahead categories (Issue 8).

### ISSUE 4 — near-opening draw→loss flips have NO groundable kind (9 cases)
**Proven by eval-1** (`44`, draw→loss at 3 discs): parity_control is empty (no structure yet), concrete_line is
impossible (loss resolves ~39 plies out; only mistake-mode phantoms), and `positional`/`center_control` **routes but
is solver-refuted** (a strictly *less*-central column draws while the played column loses). The true cause is a
long-range parity flip unnameable at 3 discs. `centerDominance` fires with no solver guard → fabrication.
**Cases:** eval-1 + eval-3,9,13,18,22,25,26,47.
**Fix:** solver-gate `positional` (require centrality monotone with solver score across alternatives) so it OMITs
here honestly; or add an honest register-only `zugzwang_opening` reason that states the outcome + register without a
fabricated mechanism.

### ISSUE 5 — `positional`/`center_control` fabricates on every populated board (≈4–6 cases)
The §14 "principle holds AND differs" check is too weak. **eval-24:** best move is the **edge** col0 and **5 of 7
columns win**, so "bestCell more central" is false and the principle's truth value is *undefined*. **eval-2:** best is
dead-center and `winningColumnCount=1`, so center_control reads *true* — yet the mechanism is a board-fill zugzwang,
not centrality. So a centrality-direction guard (necessary) is **insufficient**; the load-bearing guard is
`register==slow_zugzwang` (and `winningColumnCount>1`). **Cases:** eval-2, eval-24 (proven) + eval-37, eval-40.
**Fix:** suppress `positional` when `register==slow_zugzwang` OR `winningColumnCount>1` → OMIT; restrict the rung to
near-term center wins on (near-)empty boards (eval-0/21 only).

### ISSUE 6 — `parity_control` has no valid case AS GATED, but the cell-pass works (2 tag cases + a routing-gate bug)
The epic gates parity_control on the **z_threat/claimeven blunder tag**. The tag-carrying win→draw cases
(**eval-49, eval-58**) are P2 **even-distance** zugzwangs that `detectZThreat` (odd-distance-only, `cells:[]`,
FR-033 recursion) **cannot see on the best board** — it fires on the *played* (worse) board, inverting the control
signal → they route to concrete_line and the rung stays dark. Yet **eval-5 proves the cell-pass CAN ground** a
parity reason (on-board odd-distance z-threat, cell already in the frozen vector) — but eval-5's tag is
`drawing_move`, so a tag-gated rung **never reaches it**.
**Fix:** gate `parity_control` on the **same-perspective detector firing (structure)**, not the blunder tag; AND give
`detectZThreat` a **perspective-correct even/odd predicate** so it sees P2's even-distance threats on the best board.
Until both are done, ship the rung dark per epic §16 — but note the epic's stated reason ("no case in the set") is
incomplete: eval-5 is a case; the blocker is the gate + the odd-only detector.

### ISSUE 7 (cross-cutting) — register misbuckets openings; the live `pliesToEnd` inversion must be repaired
The repaired forward distance `43 − 2·|score| − discs` is **correct** (verified on eval-6's ply-23 and eval-0's
ply-41). But bucketing on distance alone mislabels opening wins/losses as `slow_zugzwang` (eval-0: 41-ply opening
win; eval-8: 1-disc lost opening). **Fix:** make the register **phase-aware** — `discs≈0` (and/or pre-move floor
already decided) overrides to `lost_or_won_opening`. (Story A's repair is otherwise sound and necessary; the live
`Math.abs(score)` value is inverted as the glossary §5.3 note says.)

### ISSUE 8 (cross-cutting) — even SUFFICIENT concrete_line cases require a mandatory re-solve; the frozen vector mislabels the decisive cell
**eval-6:** the winning diagonal surfaces in the frozen lookahead only as a `minor_threat` at c7r5/c7r6 — a builder
trusting the vector would mislabel or omit it. The completing cell must come from the re-solve-to-terminal step, never
from frozen `categoryExamples`. **Fix:** make the re-solve mandatory for the decisive cell on every concrete_line.

### ISSUE 9 (smallest) — the dual-line schema can't carry a shared pivot cell
**eval-15:** the player's winning cell *is* the opponent's enabling cell (c1r3). One `completingCell` +
templated-`betterMoveDoes` (no free narrative) structurally cannot express the shared pivot — the actual reason the
move loses. **Fix:** a `dual_line` kind or a `pivotCell{sharedWithOpponent}` field, *in addition to* populating
`decisiveLine.opponent` (Issue 3).

---

## What works (keep)
- **Register forward-distance repair** (`43 − 2·|score| − discs`) — verified, the load-bearing Story A fix.
- **concrete_line** for (a) defensive-miss flips (opponent cell from `patternsOpponent`, eval-27), (b) fast win→loss
  flips with an on-board immediate threat (eval-32/31), (c) single-open-column zugzwang win→draw (eval-49/58), and
  (d) deep slow-zugzwang **with the mandatory re-solve** (eval-6). This is the one rung that mostly delivers.
- **parity_control's same-perspective cell-pass** works when the threat is on-board and odd-distance (eval-5) — the
  mechanism is sound; only the gate and the odd-only detector block it.

## Tooling note (`reason_audit/TOOLS/`)
Generally useful (candidates to incorporate into the project):
- **`forward_distance.mjs`** — the repaired register/forward-distance; used by every case. **Incorporate** (it *is*
  Story A's computation).
- **`optimal_line.mjs`** — walks both sides solver-optimal to the terminal completing cell/window. **Incorporate** —
  it is exactly the re-solve Issues 3 & 8 require.
- **`decisive_check.mjs`** — confirms a `completingCell` is decisive vs blockable under optimal defense. **Incorporate**
  — it is the epic's §5 decisiveness gate.
- **`opp_punish_probe.mjs`** — forces the opponent-punishment search past the Case-1 short-circuit. **Incorporate** —
  it prototypes the Issue 3 fix.
- **`parity_cells.mjs`** — same-perspective z/odd/all-threat cell extractor working around the `cells:[]`/FR-033 trap.
  **Incorporate** — it is Story B2's pass (but needs the even-distance predicate from Issue 6).
- **`build_catalog.mjs`** — produced the 66-case routing catalog; one-off audit aid.

All per-case evidence is in `cases/<id>.md`; the running reasoning log with redundancy mappings is in `HANDOFF.md`.
