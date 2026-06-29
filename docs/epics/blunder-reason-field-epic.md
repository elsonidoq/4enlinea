> ⛔ **SUPERSEDED / ABANDONED 2026-06-28** — the reason-field design described or assumed here branched off and is no longer the plan. Restarting from `docs/architecture/my_pseudocode.md`. Do NOT use this file as guidance; treat it as historical only.

# Blunder Reason Field Epic

**Status:** ready for spec (created 2026-06-28; revised 2026-06-28 after a board/solver critique —
see the §5 critique-resolution note, the §7 re-routings, and the §13 "Resolved" block)
**Owner artifact under test:** the **feature vector** (`toFeatureVector` in `server/explainContext.js`)
+ the **glossary** (`docs/architecture/feature-vector-glossary.md`). This epic improves *those*, not
the model. It is **iteration 2** of the Feature-Vector Sufficiency trajectory; iteration 1 (the
Feature-Vector Grounding epic, spec `specs/040-fv-grounding`, now done) shipped the grounding fields
(`outcomeTiming`, `decisiveLine`, `reachability`, `edgeType`, symmetric `categoryExamples`) this epic
builds on.

---

## 1. Why this exists

The Feature-Vector Sufficiency Experiment (`docs/architecture/feature-vector-sufficiency-experiment.md`)
re-graded the vector after iteration 1 (report `server/scripts/fv_suff_answers_all_v2_grade_report.md`,
2026-06-28, N=2 runs/case):

- **Condition A (full vector): 9/18 cases pass** — flat vs the 8/18 baseline.
- **A1 (better move) 108/108, A2 (outcomes) 75/108** — the model can *read* the vector.
- **A3 (mechanism real & decisive) 56/108, A4 (no fabrication) 71/108** — every substance failure is
  A3/A4.
- **Condition C (fields without `movestring`) ≥ A on every axis**, A4 27/36 vs 22/36. The headline
  finding: **the board tempts the model to re-derive tactics and fabricate; the engineered fields are
  what must carry the reason.**

The root cause is structural: the vector exposes a *lot* of data (threat tallies, pattern tags,
look-ahead diffs) but **no field states *why* the played move is worse than the best move.** The model
must infer the causal story, and on hard cases it invents one. The worst case is **eval-6**
(`undercut`, `444423333643535655`): all 6 runs × 3 conditions failed, every one telling the same
board-false story ("playing col2 lets the opponent take c3r2 *immediately* and you lose at once") when
the truth is a slow zugzwang resolved ~22 plies out via col6/col7.

This epic adds a **`reason`** field: a compact, board-grounded, **grader-verifiable** statement of the
causal reason a move is a blunder, computed algorithmically so the model only ever **narrates** it.

## 2. The design principle (the spine of every story)

Every blunder has two irreducible, solver-grounded facts: an **outcome delta** (best vs played:
win/draw/loss) and a **mechanism** (the tactical reason for that delta). `reason` makes both explicit
and **mechanically checkable on the board/solver**, so fabrication cannot move from the model into the
generator. It inherits iteration 1's three-axis discipline:

1. **Time** — is a structure on the board **now**, or projected N plies into a search? Encoded by the
   tempo **register** (a word, not a number).
2. **Causation** — does the cited fact **change between the two moves** and **hinge on the outcome
   flip**, or is it scenery present on both lines?
3. **Stakes** — what outcome, and **how it arrives** (an immediate threat vs a slow fill).

The central new rule: **`reason` reads tactically and never exposes a solver score or raw ply
magnitude.** The register is computed from the solver but emitted only as a word.

## 3. Empirical findings (verified during brainstorming — the foundation)

These were established by direct probes (`print_lookahead.mjs` and ad-hoc scripts) on eval-6 and the
erroring set. They are **load-bearing**: the design depends on them, and the spec must not re-derive
them from intuition.

1. **The opponent's true winning line for eval-6 IS reachable and registrable.** Under optimal defense
   with score-dedupe it surfaces as a **single line completing at `c7r6` (col 7), `realizedOnPly: 23`**
   — the final cell of the board — found in ~0.0 s once search depth ≥ 24. It does not register at
   depth 22 (the win is at ply 23).
2. **Two stacked causes hide it in production.** (a) **Short-circuit:** `runSparseLookahead`'s
   `better_holds_played_loses` path returns at the *player-side* novelty winner (eval-6 has a trivial
   `minor_threat` at c7r5/c7r6) **before the opponent-punishment search runs** — so the opponent line
   is never even searched. (b) **Depth/mode:** even when it runs, optimal-mode registers the win only
   at depth ≥ 24, far beyond the production tier (depth 4 / 60 calls). Mistake-mode surfaces it earlier
   but those lines are **phantoms** (they depend on the loser misplaying).
3. **The realization ply IS the tactical register.** A near-horizon forced win realizes at low ply; a
   ply-23 win (= board-fill) is the fingerprint of parity/zugzwang. So the depth at which a line
   registers tells the reader whether it is an immediate threat or a slow fill — **no separate parity
   engine is needed to distinguish them.**
4. **The existing parity/claimeven detectors return nothing on eval-6.** `detectZThreat` and
   `detectClaimeven` are silent on *both* the best and played boards, for both players, and Green's
   only major (`c3r5`) is identical on both. The only difference is in the solver scores (played board
   hands Gray col6/col7 = +1). **Therefore eval-6 is a deep `concrete_line` case, not a
   `parity_control` case** — a `parity_control` rung built on these detectors would have fabricated a
   structure that is not there.
5. **Several worst cases are too early to tree-search to a line.** eval-8 (3 discs, P2 lost after a
   center opening — *no player line can exist*), eval-0 (empty board), eval-2/eval-29 (3 discs). The
   game ends 30-40 plies out; a tree search to a winning line is hopeless. These need a non-line
   fallback (positional / resistance), not a deeper search.

## 4. The `reason` field (the contract)

Added to `lookahead` (or top-level — spec author chooses, glossary in lockstep). A discriminated union;
cells are `cNrM` (1-indexed, glossary §1); columns 0-indexed. **Every honest-negative value must be a
truthy enum or it is pruned (glossary §6).**

```jsonc
"reason": {
  // ALWAYS present (cheap, solver-derived):
  "register":     "immediate" | "forced_sequence" | "slow_zugzwang" | "lost_or_won_opening",
  "kind":         "concrete_line" | "parity_control" | "positional" | "resistance" | "conversion",
  "outcomeDelta": { "best": "win"|"draw"|"loss", "played": "win"|"draw"|"loss" },
  // betterMoveDoes is TEMPLATED from already-verified fields only (bestCell, the payload's
  // completing/decisive cell, outcomeDelta, register) — NEVER free narrative. It is part of the
  // §14 grader checklist. See Decision (§10) "betterMoveDoes is templated, not free text".
  "betterMoveDoes": "<templated clause assembled from verified fields>",

  // EXACTLY ONE payload, keyed by kind (absent payloads pruned).
  // NOTE: every honest-negative leaf below is a TRUTHY ENUM WORD, never a falsey value
  // (false / 0 / []) — falsey leaves are stripped by toFeatureVector's prune AND the answerer's
  // pruneVector, silently dropping a meaningful "no". See Decision (§10) "truthy enums".
  "line": {            // kind = concrete_line — ONLY for result-FLIPPING moves (best ≠ played outcome)
    "winner": "player"|"opponent", "completingCell": "c7r6", "col": 7,
    "winningLines": 1, "realizedOnPly": 23
  },
  "control": {         // kind = parity_control — requires a genuine kept/surrendered CELL set
    "controller": "player"|"opponent", "mechanism": "z_threat"|"claimeven",
    "keptCells": ["c.."], "surrenderedCells": ["c.."]   // NON-EMPTY — from a new same-perspective
                                                        // detection pass (see Story B / §10)
  },
  "principle": {       // kind = positional
    "name": "center_control", "bestCells": ["c.."], "playedCells": ["c.."]
  },
  "resistance": {      // kind = resistance — same-floor BOTH-LOSE (last longer = more punish chances)
    "loserSide": "player"|"opponent",
    "speed": "slower" | "same",                 // does the better move last longer? (truthy enum)
    "punishable": "win" | "draw" | "none"       // reachability.played.ceiling: is a punish line in-search?
  },
  "conversion": {      // kind = conversion — same-floor BOTH-WIN (win sooner = fewer self-blunder chances)
    "winnerSide": "player"|"opponent",
    "speed": "faster" | "same",                 // does the better move win sooner? (truthy enum)
    "extraLines": "some" | "none"               // does the better move open more winning windows?
  }
}
```

`register` describes the **crux** move: the played move's bad outcome for `enabled_opponent` /
`defensive_miss`; the forgone best line for `missed_own`; the best-vs-played delta for same-floor cases.

**Same-floor reasons are about mistake-chance, not a tactic** (the spine of `resistance` / `conversion`):
a same-floor move does not flip the result — it changes how many chances each side gets to err.
- **`conversion` (both win):** the better move **wins sooner**; a longer game gives *you* more chances
  to throw the win away, so faster is safer. Grounded by the repaired `outcomeTiming.*.pliesToEnd`.
- **`resistance` (both lose):** the better move **lasts longer**; more moves = more chances for the
  *opponent* to slip so you can punish into a win/draw. This reason **must read `reachability.played.ceiling`**
  (`win`/`draw` = a punishable line exists in-search → "lasting longer keeps that chance alive";
  `loss` = none found → stay honest: "loses slower; no punishable line within the search").
- A same-floor reason attaches a **concrete cell only when a re-solve confirms it is the genuine
  decisive/punishable cell** — never the earliest-surfacing (often blockable) threat.

## 5. The routing algorithm (the ladder)

Compute `register` and `outcomeDelta` first (always). **The ladder splits on the outcome first**
(flip vs same-floor), because the kinds and the §14 grader checks differ by branch — a same-floor
move has no result flip, so a flip-based "concrete line" check is meaningless for it (see the
critique resolution below).

**Branch A — the move FLIPS the outcome** (`outcomeDelta.best ≠ outcomeDelta.played`). Pick the
first that grounds:

1. **`parity_control`** — for a `z_threat` / `claimeven` blunder tag where a **same-perspective**
   detection pass yields a **non-empty** kept-vs-surrendered cell set that **differs** between the
   best and played boards. Runs *before* `concrete_line` so a genuine parity loss is named as such
   rather than as an incidental line. **Not validated by eval-49** (a shallow near-endgame parity
   argument, not a deep zugzwang — disqualified); see §13/§16 for the case-sourcing task.
2. **`concrete_line`** — the **short-circuit-fixed, iterative-deepening + dedupe** search registers
   the decisive line, **at any depth** (eval-6's ply-23 line included). `winner` from `direction`.
   The named `completingCell` must be **re-solve-confirmed decisive** (`winningLines > 1`, or it is
   the terminal board-fill cell, or a re-solve shows the line completes under optimal defense) —
   **never** merely the earliest-surfacing (often blockable) `immediate_threat`. Severity is computed
   via `checkWin` at the gravity-top cell, **never** from a tag name.
3. **`positional`** — sparse / opening boards where `centerDominance` (or center-occupancy) is the
   decisive factor (eval-0).

**Branch B — same-floor** (`outcomeDelta.best = outcomeDelta.played`). The reason is about
**mistake-chance** (§4), not a flipping tactic:

4. **`resistance`** — both **lose**: "the better move lasts longer → more chances for the opponent to
   slip." Reads `reachability.played.ceiling` for `punishable` (eval-8, eval-10, eval-42, eval-56,
   eval-7, eval-38). A concrete punish cell is attached only if re-solve-confirmed.
5. **`conversion`** — both **win**: "the better move wins sooner → fewer chances for you to throw the
   win away" (eval-43, eval-59). The win-side mirror of `resistance`.

6. **else** (either branch) → `reason` omitted (pruned); the prompt leans on the other fields (an
   absent reason beats a confidently-wrong one — the v2 report's central lesson).

On solver error / timeout → `reason` omitted.

> **Critique resolution (2026-06-28).** Empirical probes refuted three brainstorm assumptions:
> (a) a result-flipping `concrete_line` check cannot grade same-floor cases, and the old flat ladder
> mis-routed both-win eval-43/59 (which register a *player* line) into `concrete_line` — hence the
> flip/same-floor split. (b) eval-49 routes to `concrete_line` (a real win→draw flip at `c7r2`) and
> never reaches `parity_control`, and `detectZThreat` returns `cells:[]` when perspective ≠ current
> player — hence the same-perspective cell-emitting pass and the reorder. (c) the opponent-punishment
> search is **cheap** even at depth ≥24 on wide positions (optimal-mode + dedupe collapses branching;
> ~300 solver calls, <200 ms measured), so the iterative-deepening budget worry (§13) is largely moot.

## 6. Register definition

`register` is derived from the **repaired** `outcomeTiming.pliesToEnd` (a true forward distance:
end-move − current-ply; today it is `Math.abs(score)`, whose direction is inverted — glossary §5.3
known-issue), bucketed to a word:

- `immediate` — resolves in 1-2 plies (show the concrete line; win/loss next move-ish).
- `forced_sequence` — within a graspable horizon (≈ ≤ 8-10 plies); concrete line showable.
- `slow_zugzwang` — resolves near board-fill (eval-6); a concrete terminal cell may still be shown, but
  the register tells the reader **there is no immediate threat — it is a slow fill.**
- `lost_or_won_opening` — both moves lose (or both win) from theory near the opening (eval-8); pairs
  with `resistance` / `conversion`.

The numeric distance is computed but **only the word is emitted** (no solver-vocabulary leak).

## 7. Transition-matrix coverage (all 18 frozen cases)

| best → played | branch | register (typical) | kind | cases |
|---|---|---|---|---|
| draw/win → loss, near | **flip** | immediate / forced_sequence | `concrete_line` (opponent) | 1, 29, 11, 12 |
| draw → loss, deep | **flip** | slow_zugzwang | `concrete_line` (opponent) | **6**, 51 |
| win → draw, missed own win | **flip** | per crux | `concrete_line` (player, the forgone win) | 49 |
| win → loss, missed own + enabled opp | **flip** | per crux | `concrete_line` (+ dual-line rule) | 15 |
| win → draw, opening/positional | **flip** | — | `positional` | 0, 2 |
| both lose, punish line in reach | **same** | forced_sequence | `resistance` (+ verified cell) | 10, 42, 56, 7, 38 |
| both lose, deep / lost opening | **same** | lost_or_won_opening / slow | `resistance` (no cell) | 8 |
| both win, best stronger | **same** | — | `conversion` | 43, 59 |

> **eval-49 re-routed:** the brainstorm matrix assigned eval-49 to `parity_control`. Empirically it is
> a win→draw **flip** with a registering **player** line at `c7r2` (you had an immediate winning threat
> and gave it up) — so it grounds at `concrete_line` and is a *better*, cell-anchored explanation than a
> cell-less parity claim. `parity_control` therefore has **no valid case in the frozen set** and needs
> a sourced deep-zugzwang case to validate (§13/§16).

> **Same-floor both-lose cases (10/42/56/7/38) re-routed** from `concrete_line` to `resistance`: they
> have no result flip, so the §14 concrete-line check (flip + line-disappears) cannot grade them. They
> register an opponent line (verified: eval-10 @ply21, eval-51 is the flip case @ply7), which is
> attached to `resistance` **only** when re-solve-confirmed decisive — otherwise the reason is the
> tempo/`punishable` framing alone.

Two cross-cutting rules the matrix needs:
- **Dual-line rule** (eval-15: `missed_own` *and* played loses → a forgone player line *and* an
  enabling opponent line): the primary payload is the line the **outcome flip hinges on**; the other is
  mentioned in (templated) `betterMoveDoes`.
- **`defensive_miss` framing** (eval-7: the threat pre-exists on the board): `betterMoveDoes` reads
  "the better move blocks at C"; `line.winner` = opponent, completing cell from the pre-move board.
  (eval-7 is `losing_either_way` / same-floor → `resistance`; the pre-existing block cell is the
  re-solve-confirmed punish cell.)

## 8. Worked example — eval-6 (the acid test)

`movestring 444423333643535655`, Green to move, played col1 (loses), best col2 (draws). Verified
groundable output:

```jsonc
"reason": {
  "register": "slow_zugzwang", "kind": "concrete_line",
  "outcomeDelta": { "best": "draw", "played": "loss" },
  // betterMoveDoes is TEMPLATED from verified fields only: bestCell (c3r2) + outcomeDelta (holds the
  // draw) + register (slow). It states NO parity mechanism — the detectors are silent here (verified),
  // so a "denies the parity" clause would be fabrication. The slow_zugzwang register carries the
  // "no immediate threat, it's a fill" framing without asserting an unverifiable cause.
  "betterMoveDoes": "plays c3r2 and holds the draw",
  "line": { "winner": "opponent", "completingCell": "c7r6", "col": 7, "winningLines": 1, "realizedOnPly": 23 }
}
```

Reads: *"The better move (c3r2) holds the draw; after your move the opponent controls the fill and
completes four in column 7 on the final move — a slow zugzwang, no immediate threat."* True, decisive,
and grader-verifiable. The earlier brainstorm draft added "denying Gray the col6/col7 parity" to
`betterMoveDoes`; that clause is **ungrounded** (the parity detectors are silent on both eval-6 boards
— verified) and is exactly the fabrication the templated, grader-checked `betterMoveDoes` now prevents.
`completingCell: c7r6` is decisive-safe because it is the terminal board-fill cell (`winningLines: 1`,
unblockable — the board is full), satisfying the §5 re-solve-confirmation rule.

## 9. User stories

Each is independently testable and re-gradeable. Tasks are indicative; the spec/tasks stages own the
final list. Glossary edits are **lockstep** within each story.

### Story A — Tempo register (Stakes / Time)
Repair `outcomeTiming.pliesToEnd` to a true forward distance, then derive the `register` word (§6) with
crux-move semantics. Independently testable: the register matches the solver's forward-ply bucket on
known-distance positions. Closes the "loses at once" misread on slow losses (eval-6, eval-8).

Indicative tasks: confirm the score-magnitude → moves-to-end mapping (reuse iteration 1's validated
formula); compute forward distance; bucket to register; glossary §5.3 update; unit tests incl. a
slow-zugzwang and a near case; regenerate frozen vectors.

### Story B — Decisive-line grounding (Causation)
Make the decisive line populate for losing moves at any depth. **Precondition gate:** a characterization
test snapshotting the current `lookaheadSection` / `allowedSet` / `aliasMap` output must be green before
any edit, because removing the case-1 short-circuit touches the shared `collectNovelOpportunities` /
`compareOpportunities` seam (memory `project_lookahead_shared_seam`). Then: remove the short-circuit so
the opponent-punishment search runs whenever the played move loses; add iterative-deepening + score-dedupe
so deep lines (eval-6's ply 23) register affordably; compute severity via `checkWin` at the gravity-top
cell. **Decisiveness gate (new):** the `completingCell` surfaced as a `concrete_line` must be re-solve-
confirmed decisive (`winningLines > 1`, or terminal board-fill, or the line completes under optimal
defense) — `pickEarliestWay` alone can surface a blockable intermediate threat (verified: eval-51's
earliest opponent `immediate_threat` is a blockable @ply7). Closes the ungrounded-`immediate_threat`
failures (eval-6, 10, 29, 51). *(Budget note: the opponent optimal-mode + dedupe search is cheap even at
depth ≥24 on wide positions — ~300 solver calls, <200 ms measured — so a fixed deep cap is affordable.)*

### Story B2 — Parity cell pass + deep-zugzwang cases (NEW — for `parity_control`)
`detectZThreat` returns `cells:[]` when `perspective ≠ board.currentPlayer` (the FR-033 recursion path),
so the brainstorm's "reuse the detectors" plan yields a cell-less, ungroundable `parity_control`. Add a
**same-perspective** detection pass that returns the actual kept-vs-surrendered cells, and route
`z_threat` / `claimeven` blunder tags to `parity_control` **before** `concrete_line` (§5 Branch A).
**eval-49 cannot validate this** (shallow near-endgame parity, routes to `concrete_line`): source one or
more genuine deep-zugzwang cases from `eval_set_large_3.json`, or extend the eval-generation script to
include them, as the acceptance case for this rung. Independently testable against those sourced cases.

### Story C — The `reason` assembler (the synthesis)
A new `buildReason()` (own module) called from `toFeatureVector`. Reads Story A's register, Story B's
line, Story B2's parity cells, the existing `reachability` / `outcomeTiming` / detectors; **splits on
the outcome flip first, then routes within each branch** (§5); for same-floor reads
`reachability.played.ceiling` to set `resistance.punishable`; **templates `betterMoveDoes` from verified
fields only** (never free narrative); encodes every honest-negative as a **truthy enum word** (§4);
applies the dual-line rule and `defensive_miss` framing; emits `outcomeDelta` (falling back to the solver
when the case-`losing_either_way` outcome labels are null — memory `project_feature_vector_content_traps`);
omits `reason` on no-ground / solver error. Does **not** modify the shared seam. Glossary: a new
`reason` subsection. Closes the "no field states the cause" root gap across all cases.

## 10. Settled decisions (reflect verbatim — do not re-derive)

- **The artifact under test is feature vector + glossary, not the model.** A3 (mechanism real &
  decisive) and A4 (no fabrication) are the substance.
- **`reason` reads tactically and leaks no solver vocabulary.** The register is computed from the solver
  score magnitude but emitted only as a word; no raw score or ply magnitude appears in `reason`.
- **The register's depth value comes from the solver score magnitude → forward-ply mapping**, bucketed
  to a word — not from the search's realization ply. (Decision: register source = score magnitude.)
- **The routing ladder splits on the outcome flip FIRST, then routes within each branch** (§5).
  Result-flipping moves can take `concrete_line` / `parity_control` / `positional`; same-floor moves
  take only `resistance` / `conversion`. (Critique fix: a flip-based concrete-line grader check is
  meaningless for same-floor cases, and the old flat ladder mis-routed both-win eval-43/59 into
  `concrete_line`.)
- **`parity_control` requires a NEW same-perspective cell-emitting pass and runs BEFORE `concrete_line`
  for `z_threat`/`claimeven` tags.** The existing `detectZThreat` returns `cells:[]` when
  `perspective ≠ currentPlayer`, so detector-reuse alone yields a cell-less, ungroundable rung
  (Story B2). **eval-49 does not validate it** (shallow near-endgame parity; routes to `concrete_line`
  at `c7r2`) — a genuine deep-zugzwang case must be sourced/generated (§13/§16). (Supersedes the
  brainstorm "parity rung = existing detectors only" decision.)
- **`concrete_line` is for result-FLIPPING moves only, and its `completingCell` must be re-solve-
  confirmed decisive** (`winningLines > 1`, terminal board-fill, or completes under optimal defense) —
  never merely the earliest-surfacing threat (which can be blockable: eval-51 @ply7). A ply-23 terminal
  cell (eval-6) is valid because it is the unblockable board-fill; the register word supplies the
  "slow, no immediate threat" framing.
- **eval-6 is a `concrete_line` (deep, flip) case, not `parity_control`** — empirically: the parity
  detectors are silent on both its boards (finding §3.4).
- **Same-floor reasons (`resistance` / `conversion`) are framed by MISTAKE-CHANCE, not a tactic.**
  Both-win → "wins sooner (fewer chances to throw the win away)"; both-lose → "lasts longer (more chances
  for the opponent to slip)", with `punishable` read from `reachability.played.ceiling`. A concrete cell
  is attached only when re-solve-confirmed. (Decision: both-win = `conversion`, both-lose = `resistance`,
  in scope for v1.)
- **`betterMoveDoes` is TEMPLATED from verified fields only — never free narrative — and is in the §14
  grader checklist.** The brainstorm draft put an ungrounded parity clause in it (eval-6: "denying Gray
  the col6/col7 parity", detectors silent — verified); an always-present, ungraded free-text field
  re-opens the fabrication path the epic exists to close.
- **Every honest-negative leaf in `reason` is a TRUTHY ENUM WORD, never `false`/`0`/`[]`.** Falsey leaves
  are stripped by both `toFeatureVector`'s prune and the answerer's `pruneVector`, silently dropping a
  meaningful "no". Use `speed:"same"`, `extraLines:"none"`, etc. (§4).
- **Removing the case-1 short-circuit is gated by a characterization test** on the shared seam, created
  and green before any edit.
- **Severity / win-in-one is computed via `checkWin` at the gravity-top cell, never from a tag name**
  (the eval-6 `immediate_threat`-mislabel bug).
- **An absent `reason` beats a confidently-wrong one.** On no-ground / solver error, omit `reason`; the
  prompt falls back to the other fields. (The v2 report: misleading fields fabricate; honest abstention
  does not.)
- **`reason` must be field-grounded, not movestring-derived.** The v2 ablation shows the board induces
  fabrication (C ≥ A on A4); `reason` must be reconstructable from the engineered fields alone.
- **Scope is feature vector + glossary.** The production deep-reveal prompt (`buildExplainContext`'s
  `lookaheadSection`) must remain **functional with no regressions**, but is **not** rewritten to consume
  `reason` (a later trajectory step).
- **Acceptance stops at** code + glossary + unit tests + regenerated
  `eval_set_fv_suff_frozen_vectors.jsonl` + board spot-check. Re-running the `gpt-5.4` answerer and
  re-grading is a **separate, user-triggered** step (costs OpenAI calls).

## 11. Non-obvious facts (traps the spec/plan must respect)

- **The short-circuit, not depth, is why eval-6's `oppCategoryExamples` is empty** at the eval depth
  (20). The opponent search is gated behind "no player-side novelty winner" and never runs. (§3.2)
- **The opponent optimal-mode + dedupe search is cheap even on wide positions** — measured ~300 solver
  calls and <200 ms at depth ≥24 on 11-disc boards (eval-51, eval-10), because optimal-opponent mode +
  score-dedupe collapse the branching. The brainstorm's "wide positions can blow up" worry applies (if
  anywhere) only to the *player-side* mistake-mode searches, which already run at production depth 4. A
  fixed deep cap for the punishment search is affordable; the budget question (§13.1) is largely settled.
- **`pickEarliestWay` can surface a BLOCKABLE intermediate threat, not the decisive cell.** eval-51's
  earliest opponent `immediate_threat` is a single-line threat @ply7 that the loser can block; the true
  resolution is deeper. A `concrete_line.completingCell` must therefore pass the §5 decisiveness gate
  (re-solve), not just be the earliest immediate_threat.
- **Mistake-mode opponent lines are phantoms** (depend on the loser misplaying); only optimal-mode lines
  are forced. Use optimal-mode for the punishing line (consistent with `selectOpponentMistakeCols`'s
  score≤0 rationale and eval-42).
- **`pliesToEnd` is currently `Math.abs(score)`** — smaller magnitude = later resolution; the field name
  implies the opposite. Story A repairs it (glossary §5.3 already documents the known-issue).
- **`bestOutcome` / `postBlunderOutcome` are `null` for `case: losing_either_way`** (both lose);
  `outcomeDelta` must fall back to the solver (memory `project_feature_vector_content_traps`).
- **`collectNovelOpportunities` / `compareOpportunities` are shared** with the production annotation gate
  — the highest-risk seam. `buildReason` must **read** their outputs, not modify them; the short-circuit
  removal needs the characterization test.
- **`realizedOnPly` is already relative** to the pre-move board (`1 + (depth - pliesLeft)`, root = 1).
- **Movestrings are 0-indexed**; every `cNrM` in the vector is already 1-indexed.
- **No existing unit tests** cover `sparseLookahead.js` / `explainContext.js` / `toFeatureVector`.
  Runner: `npm run test:fast` (inside `connect-four/`; never the full `npm test`).
- **eval-8 has no player line at all** (P2 lost after a center opening); its `reason` is `resistance`,
  not a line — never force a line where none can exist.

## 12. NOT included (out of scope)

- **No new par-row parity-counting engine** — deferred to v2. `parity_control` v1 adds only a
  same-perspective cell-emitting detection pass (Story B2), not a parity-counting engine.
- **No production prompt rewrite** — kept functional only; not enhanced to consume `reason`.
- **No re-running the `gpt-5.4` answerer or re-grading** inside the epic (separate user-triggered step).
- **No changes to blunder detection / tagging / `classifier.js`** detection logic (the existing
  detectors are *called*, not changed).
- **No PV synthesis in `c4solver-wrapper.js`** — the line comes from the bounded iterative-deepening
  search, not a solver tree-walk.
- **No full move-sequence principal variation** surfaced in `reason` — only the completing cell + the
  register.
- **No edits to the shared `collectNovelOpportunities` / `compareOpportunities` functions** — `reason`
  reads their outputs.

## 13. Open design decisions (resolve in `/clarify` or the spec — do NOT invent silently)

1. **Register bucket cutoffs.** The exact ply thresholds for `immediate` / `forced_sequence` /
   `slow_zugzwang`. Derive empirically from the 18 frozen cases so the bands separate the known
   pass/fail cases (do not use arbitrary constants).
2. **Deep-zugzwang case sourcing for `parity_control`.** eval-49 is disqualified (shallow near-endgame
   parity, routes to `concrete_line`). Decide whether to mine `eval_set_large_3.json` for a genuine deep
   parity/zugzwang blunder or extend the eval-generation script to synthesize one — and how many cases
   the rung needs to be considered validated. (Story B2.)

**Resolved during the 2026-06-28 critique (no longer open):**
- **Iterative-deepening budget.** RESOLVED: the opponent optimal-mode + dedupe punishment search is cheap
  even at depth ≥24 on wide positions (measured ~300 calls, <200 ms). Use a fixed deep cap (≈26) with
  score-dedupe ON; on no-register → fall through (no concrete line). No per-position caching needed for v1.
- **`concrete_line` at `slow_zugzwang` phrasing.** RESOLVED: show the terminal cell bare; `betterMoveDoes`
  is templated from verified fields and carries **no** parity gloss (the gloss is ungrounded — §8).
- **`conversion` payload depth.** RESOLVED: `conversion` carries the register + `speed` (truthy enum) +
  `extraLines` (truthy enum); a grounded winning-line count is optional and only `"some"`/`"none"` is
  emitted (no raw count). Same shape principle for `resistance`.

## 14. Grader acceptance test (the verifiability contract)

A generated `reason` is **accepted** iff, checked by the privileged grader (solver + `visualize_board.sh`
+ `checkWin`). **Checks differ by branch** (flip vs same-floor — the brainstorm's single flip-based
concrete-line check could not grade same-floor cases):

**Always (every kind):**
- Every named cell exists on the stated snapshot board.
- `outcomeDelta` matches the solver (pre-move query; fall back when the vector labels are null).
- `register` matches the solver's forward-ply bucket.
- `betterMoveDoes` contains **only** facts present in the structured payload (templated, not narrated):
  it names `bestCell`, the payload's verified cell(s), and the `outcomeDelta`/`register` words, and
  asserts **no** mechanism (parity, fork, etc.) absent from the payload. Any extra causal clause = reject.

**Flip branch** (`outcomeDelta.best ≠ outcomeDelta.played`):
- For `concrete_line`: the line is **absent on the better branch and present on the played branch** (or
  vice-versa for `missed_own`) **and** the outcome flips, **and** `completingCell` is **re-solve-confirmed
  decisive** (`winningLines > 1`, terminal board-fill, or the window completes under optimal defense —
  never just the earliest-surfacing, possibly-blockable threat).
- For `parity_control`: `keptCells` / `surrenderedCells` are **non-empty**, the named controller **flips**
  between the two boards (same-perspective pass), **and** the solver outcome flips.
- For `positional`: the named principle (e.g. center occupancy) holds on the solver and differs between
  the two boards.

**Same-floor branch** (`outcomeDelta.best = outcomeDelta.played`):
- For `resistance` (both lose): `speed` matches the repaired `outcomeTiming` (`"slower"` ⇒ the better
  move's forward distance is strictly larger), and `punishable` matches `reachability.played.ceiling`
  (`win`/`draw`/`none`). Any attached cell is re-solve-confirmed as the punishable line.
- For `conversion` (both win): `speed` matches `outcomeTiming` (`"faster"` ⇒ better move's forward
  distance strictly smaller), and `extraLines` matches a `checkWin`-geometry comparison (`"some"` ⇒ the
  better board opens strictly more winning windows).

If `reason` is not mechanically verifiable, it is a defect — fabrication must not move from the model
into the generator.

## 15. Authoritative sources of truth (for spec / plan / critique agents)

- `docs/architecture/feature-vector-sufficiency-experiment.md` — the experiment; the frozen-set-constant
  invariant (the 18 case selections stay constant; vector contents may be regenerated).
- `docs/architecture/feature-vector-glossary.md` — the **contract under test**; §5.3 (lookahead), §6
  (pruning/absence), §5.1 (patterns*), §5.2 (threatStats), and the `pliesToEnd` known-issue note.
- `connect-four/server/scripts/fv_suff_answers_all_v2_grade_report.md` — the 2026-06-28 grade report
  (the requirements source: which cases fail and why).
- `connect-four/server/sparseLookahead.js` — the search; `runSparseLookahead`'s four return paths, the
  short-circuit, `searchOpportunities`, `buildDecisiveLine`, `selectOpponentMistakeCols`, the depth/
  budget tiers, `collectNovelOpportunities` / `compareOpportunities` (the shared seam).
- `connect-four/server/explainContext.js` — `toFeatureVector` projection **and** the production
  `lookaheadSection` that must not regress.
- `connect-four/server/classifier.js` — the existing detectors `buildReason` calls: `detectZThreat`,
  `detectClaimeven`, `categorizeThreats`, `checkWin`, `detectImmediateThreat`.
- `connect-four/server/scripts/run_eval.mjs` — how the frozen set is regenerated (`--no-llm`, depth 20).
- Memories: `project_lookahead_shared_seam`, `project_feature_vector_content_traps`,
  `reference_c4solver_scores`, `reference_z_threat_detection`, `reference_claimeven_detection`,
  `feedback_deep_reveal_product_mindset`.
- `docs/best_practices_spec_driven_development.md`.

## 16. Acceptance criteria (epic-level)

- The `reason` field is emitted by `toFeatureVector`, documented in `feature-vector-glossary.md` in
  lockstep, with every honest-negative value a **truthy enum** that survives both `toFeatureVector`'s
  prune and the answerer's `pruneVector`.
- The register + the kinds the frozen set exercises (`concrete_line`, `positional`, `resistance`,
  `conversion`) are produced; the §7 transition matrix is covered, including the flip/same-floor split,
  the dual-line rule, and `defensive_miss` framing.
- **`parity_control` is validated against at least one sourced deep-zugzwang case** (eval-49 is
  disqualified — §13.2); if no such case can be sourced in v1, the rung ships dark (code present, no
  frozen case) and is flagged for v2 rather than validated against an unsuitable case.
- **`betterMoveDoes` is templated from verified fields and passes the §14 no-extra-clause check** on
  every case (the eval-6 "denies the parity" fabrication must not recur).
- **eval-6 emits the §8 worked output** (verified on the board) — the acid test.
- The production deep-reveal prompt builds with **no regression**, made objectively decidable by the
  Story B characterization test (green before and after the shared-seam-adjacent edit).
- Unit tests exist for the register, the decisive-line grounding, and `buildReason` (`npm run test:fast`
  green).
- `eval_set_fv_suff_frozen_vectors.jsonl` regenerated via `run_eval.mjs --no-llm`.
- Board spot-check confirms each §7 case's `reason` is true, decisive, and tactical (the §14 grader
  acceptance test).
- **Separate, user-triggered:** re-run `explain_from_vector.mjs` + `grade-fv-sufficiency` to measure the
  pass-rate delta.

---

## Pipeline justification

Single-subsystem change (the feature-vector pipeline — no frontend/DB), and §10 settles much of the
design, which by the best-practices sizing test argues *against* the full speckit pipeline. It earns the
pipeline + manager overhead because: (a) ~12-16 tasks across three stories with real ordering
dependencies (register → line → assembler); (b) the high-risk shared-seam edit (short-circuit removal)
warrants a critique gate before each artifact; (c) it is iteration 2 of a multi-pass trajectory whose
value is durable counterexample→field traceability; and (d) real design decisions remain open (§13). If
§13 collapses to trivial defaults during `/clarify`, downgrade to direct task-writing.
