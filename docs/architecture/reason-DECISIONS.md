# Reason-field DECISION LOG

> **Append-only.** Resolved decisions about the blunder-`reason` engine, each with its rationale, so
> they are not re-litigated or re-explained every session. If a decision is reversed, **append a new
> entry that supersedes it** — do not edit history in place.
>
> Non-negotiable principles live in [`reason-INVARIANTS.md`](./reason-INVARIANTS.md). The taxonomy is
> [`reason-case-taxonomy.md`](./reason-case-taxonomy.md); the engine is
> [`blunder-reason-evidence.md`](./blunder-reason-evidence.md).

Format: **Decision** / **Rationale** / **Status** / **Source**.

---

### D1 — Correctness over optimization is the design premise
- **Decision:** Every design choice favors correctness/soundness over solver-call cost. Extra passes
  are acceptable; the engine must always find something relevant to share with the player.
- **Rationale:** A contradictory/absent honest signal is exactly the fabrication this work exists to
  eliminate. Soundness is the acceptance bar; latency is not. This was conceded-then-retracted by the
  owner more than once when agents raised solver-call cost — now locked.
- **Status:** LOCKED. Do not relitigate; do not raise solver cost as a design objection.
- **Source:** owner directive (2026-06-29); memory `feedback_fv_grounding_correctness_over_speed` (memory removed; migrated here).

### D2 — Clean-slate restart; two prior epics quarantined
- **Decision:** `reason-case-taxonomy.md` + `blunder-reason-evidence.md` are the sole source of truth. The
  5-kind `blunder-reason-field-epic.md` and 5-grain `unified-blunder-reason-epic.md` designs are
  abandoned.
- **Rationale:** Both prior designs drifted into combinatorial-explosion fears and discriminated-union
  complexity. The conceptual `(bestScore, playedScore)` taxonomy is simpler and provably bounded.
- **Status:** LOCKED. Quarantined files were deleted 2026-06-30 (INVARIANTS I11).
- **Source:** restart prompt (2026-06-29); `reason_audit/_QUARANTINE.md` (removed 2026-06-30 with the scaffolding).

### D3 — `win_to_slower_win` is out of scope (NotABlunder)
- **Decision:** `bestScore>0 && playedScore>0` → raise `NotABlunder`; no reason computed.
- **Rationale:** Explaining "you'd have won faster" is hard to compute and low value; focus on the
  sub-optimal cases that actually cost an outcome.
- **Status:** LOCKED.
- **Source:** `reason-case-taxonomy.md`.

### D4 — `lose_to_faster_lose` is a blunder only if a practical chance existed
- **Decision:** When both scores are `<0`, the move is a blunder only if the best move preserved a
  reachable opponent-mistake that flips to ≥0 (the gate). Otherwise `NotABlunder`.
- **Rationale:** If you are lost either way with zero counterplay, losing one move later is not a
  mistake worth teaching — "better to lose fast." A position is *not* a lost cause if an opponent
  mistake could still be exploited; that hope is the lesson.
- **Status:** LOCKED. Gate is sound-for-BLUNDER, incomplete-for-NotABlunder (INVARIANTS I7).
  **Amended by D19:** the reachable opponent-mistake must be *admissible* (the opponent always blocks immediate threats).
- **Source:** `reason-case-taxonomy.md`; evidence doc §5.

### D5 — Register thresholds are provisional and must be empirically validated
- **Decision:** `fwd = 43 − 2·|score| − discs` selects rendering register: `immediate` ≤2,
  `forced_sequence` ≤~6, `parity` >~12. These constants are **provisional**, validated on a handful
  of boards. They must be tuned by **looking at real boards just above/below each threshold** and
  confirming the call feels right, against a labeled set, before being locked.
- **Rationale:** No principled closed form was found for the cutoffs; the honest path is empirical
  calibration with eyes on near-threshold boards.
- **Status:** PROVISIONAL — calibration pending.
- **Source:** evidence doc §3, §10; epic Q&A (2026-06-28/29).

### D6 — Depth, not budget, bounds the analysis
- **Decision:** The lookahead is constrained only by a depth cap. A "budget" parameter must not drive
  exploration or truncate a relevant line.
- **Rationale:** Budget-driven cutoffs silently drop instructive lines and conflict with D1.
- **Status:** LOCKED.
- **Source:** owner directive (2026-06-28).

### D7 — Deep zugzwang named by parity group, not major-threat materialization
- **Decision:** Name deep zugzwang wins by their parity-aligned group of 4 + odd/even completing cell
  (z-threat / Allis odd-even detection), not by when a window physically becomes 3-of-4.
- **Rationale:** "Diffuse, no nameable cell" was a tooling artifact (`forward_projection` only flags
  materialized windows); the parity claim locks in many plies earlier. Collapses three fallbacks onto
  one mechanism.
- **Status:** LOCKED. Only genuine exception: multi-window board-fill with no dominant parity group.
- **Source:** evidence doc §7.

### D8 — The two halves stay in separate fields
- **Decision:** `lostResource` (half a) and `opponentPunishment` (half b) are distinct fields; their
  cells are not merged.
- **Rationale:** In `draw_to_lose` the parity-hold cell ≠ the opponent completing cell; merging them
  into one "opponent wins here" claim fabricates.
- **Status:** LOCKED.
- **Source:** evidence doc §2, §6.

### D9 — Target 100% honest coverage of the 66-case fixture; overfitting risk accepted
- **Decision:** Aim for a sound reason on every one of the 66 `eval_set_large_3` cases. The risk of
  overfitting this fixed set is explicitly accepted for now.
- **Rationale:** A concrete coverage bar is needed to call the algorithm done; Occam guards against
  per-case hacks (INVARIANTS I9), and the fixture risk is bounded and revisitable.
- **Status:** ACCEPTED (revisit when the fixture grows).
- **Source:** owner directive (2026-06-28).

### D10 — Display cap is a product knob, not a correctness threshold
- **Decision:** The show/don't-show-the-line ply threshold trades instructiveness for completeness;
  it is tunable product policy, separate from soundness.
- **Rationale:** The search always runs to terminal to learn the target cell; the cap only governs
  whether the *line* is rendered. Raising it never changes correctness.
- **Status:** LOCKED (as a knob).
- **Source:** evidence doc §3, §10.

### D11 — Engine + fixture implemented; tested via `npm run test:fast`
- **Decision:** Engine is `reason_engine/reasonEngine.mjs` (`computeReason` + CLI); fixture built by
  `build_fixture.mjs` (stratified rejection sampling, fixed seed, + curated anchor boards); evidence
  precomputed by `build_evidence.mjs`; regression in `server/tests/reasonEngine.test.mjs`.
- **Rationale:** A thin solver-backed engine over a committed fixture turns "does it cover 100%?" into
  a runnable check instead of a re-run multi-agent hand-audit.
- **Status:** DONE (2026-06-29) — thresholds still provisional per D5.
- **Source:** evidence doc §11.

### D12 — Fixtures need disc floor + `fwd` stratification
- **Decision:** Sample boards with a `discs ≥ ~20` floor **and** stratify/reject on `fwd` (or
  `|score|`); for `win_to_lose` also require `max(scores)>0`.
- **Rationale:** Random self-play resolves either immediately or via deep zugzwang; the instructive
  mid-length forced lines (`fwd` 3–12) are rare and must be deliberately concentrated. Without
  `max(scores)>0` the selector grabs `losing_either_way` boards (a different case).
- **Status:** LOCKED.
- **Source:** evidence doc §9.

### D13 — Tactic naming: classifyPattern PROPOSES, the solver DISPOSES (two gates)
- **Decision:** Each half may carry a `tacticTag` (+ `tacticCells`, `tacticFromDiff`) from
  `classifyPattern`, but only through two solver gates: **Gate 1 register-class consistency** (a
  tactical tag — immediate_threat/double_threat/figure_7/… — may name a half only in
  `immediate`/`forced_sequence` registers; a structural tag — z_threat/claimeven/major_threat_parity/…
  — only in `parity`; contextual tags are last-resort any register) and **Gate 2 realized-locus
  alignment** (the tag's cells must intersect the solver-realized window ∪ PV-line ∪ parity group).
  The best-vs-played diff is a tiebreak, not a gate. No admissible tag → honest `tacticTag: null`.
- **Rationale:** Implements I2 (never fabricate). `classifyPattern` reports every tactic *present* on
  the board, agnostic to which one the solver actually rides; on `214444115623` (parity win) it
  proposes `immediate_threat{c3r4}` — a real but BLOCKED tempo decoy that is not how the win happens.
  Register-class + locus gating rejects it; the win is the parity row-2 group instead. Reuses the
  tested production detector rather than reinventing one (I8).
- **Status:** LOCKED. Implemented in `reasonEngine.mjs` (`nameHalf`/`registerClassOk`/`realizedLocus`).
- **Source:** owner directive + case audit (2026-06-29); `reason-engine-pseudocode.md`.

### D14 — The tie is whole-algorithm; half (b) is verified against half (a) via `anchorCells`
- **Decision:** `opponentPunishment` (half b) is computed *against* `lostResource` (half a) and emits a
  verified `tie`: `tied` (the punishment's entry/completing cell ∈ `lostResource.anchorCells`),
  `independent` (no shared cell — e.g. `draw_to_lose` zugzwang, by design per D8), or `temporal`
  (`lose_to_faster_lose`: played loss faster than the swindle grind). Every lost resource carries
  `anchorCells` = the MOVE-LEVEL squares that define it (for win cases, the winning-move cells —
  scores>0 — NOT the eventual completing cell).
- **Rationale:** Each case's reason is a *relationship* between what was preserved and how it was lost
  (the `win_to_draw` lesson is literally "your winning square was the opponent's only escape").
  Computing the halves independently and hoping they align fabricates. The tie is verified against the
  resource object (`anchorCells`), not a re-derived proxy (an earlier `winningCols` shortcut was
  rejected for this reason). Reporting `independent`/`temporal` honestly is information, not a gap.
- **Status:** LOCKED. Implemented as `tieTo(...)` + `entryCell` in `reasonEngine.mjs`.
- **Source:** owner directive + case audit (2026-06-29); `reason-engine-pseudocode.md`.

### D15 — `win_to_lose` tie uses the uniform spatial test; "enabled-by-vacating" deferred
- **Decision:** The `win_to_lose` tie uses the same spatial `anchorCells` intersection as the other
  cases. The stricter causal test — "the opponent wins on the very square you vacated by not playing
  the win" — is an accepted known-gap, deferred.
- **Rationale:** The uniform mechanism (D14) is sound and covers the common case; the stricter test
  needs more design and a labeled set to validate. Deferring keeps one mechanism (I9/Occam) until the
  loose version is shown to mislabel.
- **Status:** ACCEPTED known-gap — revisit if the loose tie produces a misleading `tied`/`independent`.
- **Source:** case audit (2026-06-29); `reason-engine-pseudocode.md` honest-limits.

### D17 — `win_to_draw` half (b) is now a constructive fork-denial search; supersedes the `win_to_draw` portion of D14

- **Decision:** For `win_to_draw` where half (a) found a fork (D16), `opponentPunishment` (half b) is no longer a "single saving reply" (`neutralization`) but a **fork-denial search**: the shallowest node in the depth-bounded optimal-play tree of the blunder position (both sides branch **all** score-preserving — score = 0 — moves; BFS strictly by ply) where the opponent occupies a cell of `lostResource.forkWindows` and that window was LIVE before the move and DEAD after. Verdict is **`occupation`** (with the occupied cell as the constructive tie) or **`no_occupation`** (two-valued by `exhaustive`). The tie-break heuristic (frontier ordering toward `lostPattern`) is not part of the contract; it may reorder but never prunes across depth. Non-fork `win_to_draw` cases keep the legacy `neutralization`.
- **Supersedes the `win_to_draw` portion of D14:** D14 said "tie via `anchorCells` intersection" (the opponent's saving-move entry cell ∈ `lostResource.anchorCells`). For `win_to_draw` with a fork, the tie is now produced **constructively** by the denial search — the occupied cell IS the shared cell. `occupation` → `tie = { kind:'tied', sharedCells:[cell] }`; `no_occupation` → `tie = { kind:'independent', sharedCells:[] }` (honest: the draw holds without the opponent ever occupying a pattern cell). D14's spatial intersection mechanism remains in force for all other cases.
- **Two honest claims, never merged:** LOCAL — "the opponent occupies `cell`, killing window `window` of your pattern" (verified LIVE→DEAD, cell-by-cell); GLOBAL — "and the line only draws — the double threat never forms" (carried by the drawn result, emitted as a **separate** clause). The engine must NOT merge these into "this move refutes the fork."
- **`no_occupation` is two-valued (I7-style asymmetry):** `exhaustive:true` = the optimal tree reached terminal draw within the depth cap (confirmed the opponent never needs to occupy a pattern cell); `exhaustive:false` = only the depth cap was hit ("no witness within budget" — honest residual).
- **Counterexamples (I12):** occupation: `214444115623` played 4 → witness occupies `c3r3` (window `c3r3·c4r3·c5r3·c6r3`); no_occupation: `3333302111456114554542` (sourced via `gameSampling`, never hand-rolled — proves the fallback fires).
- **Rationale:** The legacy `neutralization` named the opponent's single escape cell but never *exhibited* the core lesson — that the fork the best move was building cannot be rebuilt after the blunder. The denial search produces a concrete witness: the first moment the opponent kills a fork window under optimal play. Every node is solver-grounded (I2); the search consumes `lostResource.forkWindows` whatever the pattern is (I9, detector-agnostic).
- **Status:** LOCKED (2026-06-29). Implemented in `reasonEngine.mjs`; commits f339220, 66cae80, fcfdae9, 0ac62cd, 2835e3c, 761401e; 45/45 tests pass.
- **Source:** `reason-opponentPunishment-spec.md`; I12 counterexamples; D16 (fork-stop); `reason-engine-pseudocode.md`.

---

### D16 — The PV stops at the deciding double-threat fork; this supersedes D5's `fwd`-as-parity proxy
- **Decision:** `walkOptimal` no longer walks every win to the completed four. After each winner move
  it checks the node for an unstoppable **double-threat fork** and stops there, returning that node as
  the resource (`terminal:'fork'`, the fork cells + windows). The stop trigger is the **whole realized
  double-threat family**: `hasActiveDoubleThreat(board, colHeights, winner)` (`classifier.js`) — true
  for ≥2 gravity-top wins (**Case A**, named `double_threat`) OR 1 gravity-top + a major stacked
  directly above (**Case B**, named `figure_7`) — guarded by `!detectImmediateThreat(board, opponent)`
  (opponent has no immediate win of its own). `j_shape` is **excluded**: per KB
  `allen-j-configuration` it generates three *minor* threats winning in zugzwang — a precursor, not a
  realized fork. Cells/windows come from `detectDoubleThreat`; the tactic name is chosen by
  `classifyPattern` between `double_threat`/`figure_7`.
  - **Supersedes D5 in operative meaning:** "register from `fwd = 43 − 2·|score| − discs`" used
    win-distance as a proxy for parity-vs-tactical. That proxy is **wrong** — a *forced* win can be
    12+ plies long and still be a pure tactical fork (validated: `214444115623`, a 12-ply win the old
    rule called `parity`, with `fwd=13`). Register is now derived from the **fork node** (near-distance
    → `immediate`/`forced_sequence`), and `fwd` is no longer consulted to infer parity.
  - **Annotates D7:** `parityAttribution` now fires **only when no fork is found on the whole PV** —
    i.e. genuine zugzwang/parity wins. The fork check is the tactical-vs-parity discriminator D5 lacked.
  - **Annotates D13:** once the register is correctly tactical at the fork node, Gate 1 admits
    `double_threat`/`figure_7` naturally — no special-case. The earlier `minor_threat` fallback on
    `214444115623` was a downstream symptom of the D5 misclassification, not a tagging bug.
- **Rationale:** I12 — the old register rule was validated only on its motivating examples and missed
  the Case-B (figure_7) class. Structural fork detection on the solver-proven PV is sound (the detector
  only *locates* the decisive resource; the solver already proved the win — I2), reuses tested
  detectors (I8), and unifies the tactical/parity split onto one mechanism (I9/Occam).
- **Status:** LOCKED (thresholds for the *remaining* genuine-parity cases stay provisional per D5).
- **Source:** owner-driven case audit `214444115623` (2026-06-29); I12; `reason-engine-pseudocode.md`.

---

### D18 — `findOccupationWitness` unified PV primitive; draw_to_lose flip; `no_occupation` as depth artifact; supersedes the "shallowest-by-BFS" portion of D17 §3

- **Decision:** One unified `findOccupationWitness(solver, root, { denier, windows, depthCap })` primitive in `connect-four/server/scripts/reason_engine/reasonEngine.mjs` replaces the `win_to_draw` BFS (`denyOpponentPunishment`, now deleted) **and** provides the `draw_to_lose` half-a denial. It walks the canonical argmax (both-sides optimal) PV from `root` and returns the **first** node where `denier` occupies a cell of `windows` with the window LIVE before → DEAD after. Roles by case:
  - `win_to_draw` → `denier=opponent`, `root=playedRoot`, `windows=lostResource.forkWindows`
  - `draw_to_lose` → `denier=player`, `root=bestRoot`, `windows=` opponent's conceded winning window(s) (sourced from the half-b walk of `playedRoot`).
- **Supersedes the "shallowest-by-BFS" portion of D17 §3:** the witness is now the *first occupation on the canonical optimal PV*, not the *globally shallowest across all optimal lines*. Shallowest was already declared non-contractual in D17 §3a; correctness (a LIVE→DEAD occupation exists) is unchanged. Rationale: I9/Occam (one mechanism, roles swapped) + the theorem: a drawn full board fills every winning-for-S window with ≥1 not-S disc, so a single PV walk to terminal always yields the witness — the BFS was over-built.
- **`draw_to_lose` half (a) flip:** half a = the player's occupation of the opponent's conceded window — a constructive, **window-aware** tie. This fixes the former false `independent` verdict for zugzwang boards. The TACTICAL sub-case (`defensive_hold`) falls out as a ply-0 root occupation on the PV; no separate special-case code is needed. Half (b) is computed first (opponent `win_half` from `playedRoot`) to supply `concededWindows` to the witness call.
- **`no_occupation` is a depth-budget artifact, not a structural verdict:** the theorem guarantees occupation at the full-board terminal. With `depthCap = 42 − len(root)`, the PV always reaches the witness; `no_occupation` only honestly fires on a deliberately small cap or on a non-terminal solver error (`exhaustive:false`).
- **I12 counterexamples (LOCKED 2026-06-30):** tactical `draw_to_lose` `3342652233354244431011`,col 0 — ply-0 root occupation (defensive_hold falls out naturally); zugzwang `draw_to_lose` `2444422235255630400333`,col 0 — witness cell `c4r6` inside opponent window, tie `tied`; `win_to_draw` `214444115623`,col 4 — witness cell `c3r3` (window `c3r3·c4r3·c5r3·c6r3`).
- **Rationale:** I9/Occam (one PV-walk primitive, roles swapped between cases), I0 (PV walk is O(plies); no BFS overhead), I2 (every node solver-grounded), I12 (counterexample per case, validated 2026-06-30).
- **Status:** LOCKED (2026-06-30). Implemented in `reasonEngine.mjs`; prior commits retain D17 BFS history.
- **Source:** task-6-brief.md (2026-06-30); D17 §3a; `reason-INVARIANTS.md` I9/I12.

---

### D19 — The `lose_to_faster_lose` swindle gate only counts ADMISSIBLE opponent mistakes (opponent always blocks immediate threats); amends D4

- **Decision:** The `swindleGate` swindle-existence test is narrowed. A node counts as a swindle only when the opponent has an **admissible** non-winning reply, where a reply is admissible iff **after the opponent plays it the PLAYER has no immediate (win-in-1, gravity-top) threat** — i.e. the reply blocks every existing immediate threat and creates none. Formally, `adm = { c ∈ legal : detectImmediateThreat(node+c, player) is empty }`, and:
  - if the player has an immediate threat and `adm` is empty → **unblockable** → BLUNDER (the player wins outright — this single predicate collapses double-threat, forced-only-column, and poisoned-block into one test);
  - else swindle iff `min(oppScore over adm) ≤ 0` (an admissible reply that still draws/loses for the opponent);
  - the branching descent recurses only over `adm ∩ winningCols` — never through an inadmissible reply.
  Winning replies (`oppScore > 0`) are always admissible (an opponent win-in-1 leaves the player no win-in-1), so the filter only ever removes ≤0 replies — precisely the inadmissible "swindles" the old any-non-winning-reply rule over-credited.
- **Amends D4:** D4's "reachable opponent-mistake that flips to ≥0" is now "reachable **admissible** opponent-mistake." Rationale: assuming an opponent that hangs an immediate win-in-1 threat is not counterplay worth teaching — a swindle must survive an opponent that at least blocks immediate threats. D4's asymmetric soundness (sound-for-Blunder, incomplete-for-NotABlunder, I7) is unchanged: every witness is still a concrete solver-verified admissible mistake; the branching search (I0 — not weakened) is preserved.
- **IMMEDIATE ≠ MAJOR (never mix):** IMMEDIATE threat = a group of 3 completable by one gravity-top drop (`detectImmediateThreat`); MAJOR threat = a group of 3 not completable in one move. The gate consults only `detectImmediateThreat`. Major threats never enter admissibility.
- **The opponent model is cooperative-but-not-suicidal:** the gate models the *most cooperative* opponent that still blocks immediate threats — it may drift into a subtle admissible losing move (that is the reachable mistake / the lesson) but never ignores or gifts a win-in-1. This is a swindle-*existence* model, not a best-effort defender.
- **Accepted known-gap (scope):** admissibility governs the **gate's existence criterion**, not the rendered swindle *line*. After the single admissible deviation, `walkOptimal` plays both sides optimally, so its non-deviation moves are optimal (and thus won't hang a threat) — but the engine does not separately assert that *every* move of a multi-ply swindle line is independently admissible. Revisit only if a rendered line surfaces an inadmissible intermediate move.
- **I12 witness (LOCKED 2026-06-30):** `332123`,col 4 — under the old rule the swindle witnessed at `3321232` with the opponent skipping the forced `c3r4` block; under D19 the search descends *through* the block and the witness moves to `33212322543` (still `Blunder`, but no move in the swindle hangs an immediate threat). No pre-existing fixture verdict flipped (the change is conservative — it only re-sites or removes inadmissible witnesses). Added to `reason_fixture.jsonl` as bucket `d19-witness`.
- **Rationale:** owner directive (2026-06-30): "make sure the opponent always blocks immediate threats." I0 (correctness over cost — the extra `detectImmediateThreat` calls are acceptable), I8 (reuses the production gravity-top detector), I12 (counterexample validated through the production gate).
- **Status:** LOCKED (2026-06-30). Implemented in `reasonEngine.mjs` (`admissibleOpponentCols` + `swindleGate`); 43/43 reason-engine tests pass.
- **Source:** owner case audit `332123` (2026-06-30); amends D4; `blunder-reason-evidence.md` §5; `reason-engine-pseudocode.md`.

---

### D20 — A tag-first "realized/denied" router precedes the sign taxonomy for short tactics

- **Decision:** `computeReason` now runs `tagBlunder` in front of the sign taxonomy. When the tag is in `REALIZED_DENIED_TAGS = {immediate_threat, forced_block, double_threat, figure_7}` **and** `realizedPattern` can confirm it as a one-move pattern, the reason is built by `realizedDeniedReason` from two direction-symmetric halves: a **`realized_pattern`** (the one-move tactic, from the production detectors — trivial) and a **`denial`** (the generalized `findOccupationWitness`, proving the tactic is prevented — potentially multi-move). `direction` (`missed_own`/`enabled_opponent`/`defensive_miss`) flips which board each half reads and, by pattern **owner**, which half becomes `lostResource` vs `opponentPunishment`. Every other tag — and every board where `realizedPattern` returns null — **falls through unchanged** to the sign taxonomy. Authoritative design: `reason-tag-fastpath-pseudocode.md`; field dictionary: `feature-vector-glossary.md` §3b.
- **Two gates keep it conservative (the route only ever REDUCES to the sign engine):** (1) `tagBlunder` must name a routed tag — its Phase C is 1-ply, so **deep forks tag as `drawing_move` and stay on the sign engine** (e.g. `214444115623` keeps its D18 witness `c3r3`); (2) `realizedPattern` must confirm the tag, else `realizedDeniedReason` returns null → fall through (I2: never fabricate a resource we cannot exhibit). There is **no regression**: every non-firing case is byte-identical to the prior engine (D16/D17/D18/D19 untouched).
- **Generalizes D18, does not reverse it:** the denied half is `findOccupationWitness` with `denier`/`root` derived from `direction` (was hard-wired to opponent/playedRoot for `win_to_draw`, player/bestRoot for `draw_to_lose`). The `win_to_draw` fork case is one instance of the symmetric rule.
- **forkCase-aware naming:** `tagBlunder` never assigns `figure_7` (`double_threat` outranks it in its priority lists and matches the same stacked forks). The router recovers the distinction: `realizedPattern` returns `forkCase` and `realizedDeniedReason` refines the emitted `tag` to `figure_7` when `forkCase === 'B'` (aligns the router with the sign engine's `nameFork`). This is why `figure_7` is in the routed set even though `tagBlunder` never emits it.
- **Honest limits (I12, accepted):** 5 of 7 routed `(tag, direction)` pairs are sourced in `reason_fixture.jsonl`; `double_threat/enabled_opponent` and `figure_7/enabled_opponent` remain PROVISIONAL (0 hits in ~60k harvested blunders — the enabled direction is a narrow existential; documented in `reason-tag-fastpath-pseudocode.md` §Honest-limits, not a fabricated pass). Downstream rendering of the new half shapes in `/admin/fv-suff` + the explain prompt is a tracked out-of-scope follow-up.
- **Rationale:** owner directive (2026-06-30/07-01) — a conceded/handed/missed immediate threat or fork is a short, cell-nameable tactic whose lesson is the tactic itself, not the sign-taxonomy's parity-swindle machinery (motivating bug: `3321234543` mis-explained `lose_to_faster_lose` as a diagonal `conditional_swindle`). I8 (reuse `classifyPattern`/`findOccupationWitness`), I9/Occam (one denial primitive, roles swapped by direction), I2/I3 preserved.
- **Status:** IMPLEMENTED + reviewed on `stagging` (not merged); `npm run test:fast` 688/688. Engine in `reasonEngine.mjs` (`realizedPattern`, `realizedDeniedReason`, `REALIZED_DENIED_TAGS`, `classifySignCase`); regression in `reasonRealizedDenied.test.mjs` + route-labeled `reason_fixture.jsonl`.
- **Source:** owner case audit `3321234543` + realized/denied design session (2026-06-30/07-01); `reason-tag-fastpath-pseudocode.md`; `docs/superpowers/plans/2026-06-30-reason-tag-realized-denied-router.md`.

---

### D21 — The narrator vector exposes ZERO solver scores (deep-scrub); outcomes come from `case`; the glossary is solver-free

- **Decision:** `toNarratorVector` (`server/scripts/reasonNarratorVector.mjs`) — the single projection defining "what the LLM sees", shared by the eval answerer and the future production coach — now **deep-scrubs the entire solver-score family at every depth**: a recursive, pure deep-copy that drops any key matching `/^scores?$|Score$/` (catches top-level `scores`, per-move `line[].score`, **and** the decision scores `bestScore`/`playedScore`) plus `optimalWinSamples`. The narrator receives **no numeric evaluation of any kind**. The win/draw/loss outcome of both moves comes entirely from **`case`** (whose name IS the sign pair); `pliesToEnd` (a counted ply distance, not a score) is the only distance signal.
- **Supersedes the flat `HIDDEN_FIELDS = ['scores']` strip:** that stripped only the top-level per-column array, so nested `lostResource.line[].score` and the `bestScore`/`playedScore` decision scores leaked straight into the LLM prompt. A flat top-level omit-list is structurally insufficient — the scrub MUST be recursive.
- **Purity is load-bearing:** `toNarratorVector` never mutates its input, so the RAW evidence object retains every score. `/admin/fv-suff`'s Evidence view and the frozen eval fixtures still carry `scores`/`bestScore`/`playedScore`/`line[].score`/`optimalWinSamples`; only the narrator projection drops them. Anything needing ground-truth scores (e.g. the `grade-fv-sufficiency` grader) must read RAW evidence (`row.evidence`) / the sibling `groundTruth`, **never** the narrator `feature_vector`.
- **The LLM glossary is solver-free:** `feature-vector-glossary.md` must never mention a "solver" or any numeric score — it speaks only in strategy terms (patterns, parity, winning lines, optimal play). "solver-grounded" → "game-theoretically exact"; "solver proof" → "proof under optimal play"; "solver-gated name" → "verified name". The solver is an implementation detail, irrelevant to the LLM and the end user.
- **Rationale:** owner directive (2026-07-01) — exposing `|score|` invites "you win in 7" grounding, exactly the fabrication surface I1/I2 forbid; the reason must rest on board structure, not a number. `case` already carries the outcome losslessly, so no information is lost. Audit before the fix confirmed 3 leaking surfaces (`bestScore`, `playedScore`, both halves' `line[].score`); after, a recursive-key sweep over the coverage fixture shows zero score-family keys surviving into the narrator vector.
- **Status:** IMPLEMENTED on `stagging` (not merged). `reasonNarratorVector.mjs` (`isNarratorHidden` + recursive `toNarratorVector`); regression in `reasonNarratorVector.test.mjs` (asserts no `score`-family key survives at any depth, incl. nested `line[].score`); glossary de-scored + de-solvered.
- **Source:** owner directive (2026-07-01); I1/I2; `feature-vector-glossary.md`.
- **Forward-looking trap:** the deep-scrub regex only catches `/^scores?$|Score$/` — a NEW non-score evidence-only field (e.g. a future diagnostic you want in raw evidence + `/admin/fv-suff` but NOT the LLM) passes straight through to the narrator unless its exact key is added to `isNarratorHidden`'s allow-list AND the `reasonNarratorVector.test.mjs` hidden-set assertion is updated to cover it.

---

### D22 — Board selection stratifies on (route, tag, direction) over an upfront-named universe; the old-explain board generator is retired; one reason universe serves the FV-suff eval now and the future glossary-prompt eval

- **Decision:** The reason-eval coverage selector (`connect-four/server/scripts/select_boards.mjs --strategy coverage`) enumerates the **full closed predicate universe UPFRONT** (`REASON_UNIVERSE` — every value of every axis the engine emits: `route`, `case`, `player`, `phase`, `severity`, the 7 `rd_<tag>_<direction>` pairs, `lost_*`, `opp_*`, `tie_*`, `reg_*`, `tactic_*`, `parity_*`, `gate_*`), partitioned into **`required`** (asserted reachable; `satisfied()` = every required predicate ≥ target — a real completeness claim, not "everything I happened to see") and **`provisional`** (known-rare / structurally-unreachable in ordinary self-play; reported but NON-blocking). This supersedes the prior dynamic-discovery behavior (which could only certify "every SEEN predicate reached target"). `MAX_GAMES` is the bug-bound, not the normal exit; the log reports fulfilled / under-target / never-seen against the named universe (`*` marks provisional). A `discovered ⊆ REASON_UNIVERSE` guard throws on any engine-emitted predicate absent from the universe (I12 turned on the selector). New axes added to `reasonPredicates`: `route_<route>`, `rd_<tag>_<direction>` (realized_denied route), and a `lost_realized_<tag>` branch closing the D20 `realized_pattern` lostResource hole.
- **The old LLM-explanation eval is retired.** `generate_eval_set.mjs` (whose 35 predicates described the `buildExplainContext` prompt, not the reason engine) is **deleted** as redundant; `run_eval.mjs` is marked DEPRECATED (the chain — `run_eval` + `eval_set_*.json` + `buildExplainContext` + the `/api/admin/eval-set` endpoint incl. its stale `index.js:539` error string — is swept when the glossary-prompt evaluator lands). Going forward only the reason feature vector is evaluated: the FV-sufficiency experiment now (`compute.mjs --llm` + `grade-fv-sufficiency`) and a future glossary-derived prompt. Both consume the **same reason feature vector** (the glossary is its field dictionary; `toNarratorVector` is a projection of the reason evidence), so ONE board set over ONE reason universe serves both. There is no `explainPreds ∪ reasonPreds` union — the union framing was an artifact of the retired pipeline.
- **`compute.mjs` hardened** (ported from `run_eval.mjs`): per-board `try/catch` isolation (a throwing/terminal board becomes an `error` row, `evidence:null`, instead of crashing the batch) + crash-safe incremental (`appendFileSync`-per-row) evidence writes. Resume mode deliberately omitted (footgun). The CLI entry is guarded behind `import.meta.main` so `buildEvidenceRow` is importable/testable.
- **Calibration (2026-07-01, coverage harvest, target 2):** 45/47 REQUIRED predicates filled by ~497 games; a confirmation run reached all-REQUIRED-satisfied at game 1337. Two predicates demoted to PROVISIONAL as unmet-under-budget: `gate_exhaustive` (1 hit / 497 games; near-full-board exhaustive gate) and `lost_realized_forced_block` (never seen; missed_own forced_block as the LOST resource is rare in self-play).
- **`rd_double_threat_enabled_opponent` + `rd_figure_7_enabled_opponent` remain PROVISIONAL — unsourced.** A targeted all-suboptimal-columns harvest (probing EVERY suboptimal legal column per self-play position, not just the played move — more thorough than D20's played-move sweep) examined **13,937 `enabled_opponent`-tagged blunders through `computeReason` across 44,110 suboptimal-column probes / 425 games and found ZERO** such forks. This reinforces D20's 0/60k finding: the enabled-direction fork is a narrow existential over optimal replies. I12 is NOT fully closed for these two pairs — a documented, non-fabricated gap.
- **DEFERRED (post-plan, owner-directed 2026-07-01):** the unreachable predicates above are likely structural under current self-play. Hypothesis to investigate separately: widen the per-player **mistake-probability range** in the sampling (`gameSampling`/`harvestBlunders`) so rare (tag,direction)/gate cases appear. Not attempted in this change.
- **Rationale:** D20 changed the vector shape from `(sign)` to `(sign) × (route) × (tag, direction)`; the selectors modeled only the sign case, so the router categories were covered incidentally at best and the enabled_opponent forks not at all. An upfront-named universe makes "did we cover everything?" a checkable claim; the `discovered ⊆ named` guard keeps the list honest as the engine evolves. Reuses the `tag:direction` binning idiom from `generate_tagblunder_fixtures.mjs` (I8), one axis set spanning routes (I9/Occam), counterexample-through-production discipline (I12).
- **Status:** IMPLEMENTED on `stagging` (SDD execution 2026-07-01). `select_boards.mjs` (named universe + guard + logging), `compute.mjs` (isolation + crash-safe writes), `generate_eval_set.mjs` deleted, `run_eval.mjs` deprecated. `npm run test:fast` 700/700. The two enabled_opponent pairs + `gate_exhaustive` + `lost_realized_forced_block` PROVISIONAL pending the deferred sampling investigation.
- **Source:** board-selection review + SDD plan `docs/superpowers/plans/2026-07-01-reason-eval-board-selection-consolidation.md`; D20; D12; D9; `reason-tag-fastpath-pseudocode.md` §Honest-limits.

---

### D23 — The enabled_opponent forks were a router-locus BUG (not rarity); the swindle gate becomes one uniform depth-bounded search; `lost_realized_forced_block` is impossible-by-construction; `gate_exhaustive` retired

- **Decision (three coupled fixes to the reason-eval coverage gaps investigated 2026-07-01):**
  1. **`rd_double_threat_enabled_opponent` / `rd_figure_7_enabled_opponent` are a ROUTER BUG, now fixed — not the "rarity" D22/D20-honest-limits claimed.** Root cause: for an `enabled_opponent` fork, `realizedDeniedReason` set `realizedRoot = playedRoot` and called `realizedPattern(playedRoot, opponent, tag)`, but the opponent's fork only materializes ONE ply later — after its fork-forming reply. A fork already present on `playedRoot` (opponent to move) would be an immediate win, caught earlier by tagBlunder Phase B as `immediate_threat`; so `realizedPattern(playedRoot)` is **null 100% of the time** and the route always fell through to the sign engine. The old harvests ("0/60k", "13,937 enabled tags / 0 forks") only counted *routed* hits and never the raw `tagBlunder` tag — which emits `double_threat:enabled_opponent` ~9× and `figure_7:enabled_opponent` ~5× per 3 self-play games. Fix: `advanceToEnabledFork` advances `realizedRoot` by an optimal opponent reply that materializes the fork (mirroring Phase D's existential), so `realizedPattern` can exhibit it; the denied half still denies those windows from `correctRoot`. After the fix a 60-game coverage harvest fills `rd_double_threat_enabled_opponent` to target in ~48 games (was structurally impossible to emit). `rd_double_threat_enabled_opponent` → **REQUIRED**; `rd_figure_7_enabled_opponent` stays **PROVISIONAL** (Case-B enabled forks reachable but rarer, like `lost_fork_B`).
  2. **The `lose_to_faster_lose` swindle gate is now ONE uniform depth-bounded search (`swindleGate`), replacing the exhaustive(≤10 empties)/bounded two-mode split.** `gateMaxPlies: 15` bounds total plies from the gate root; found-within-cap → Blunder (sound, a real solver witness); not-found → NotABlunder **by policy** ("no practical swindle within 15 plies" — a practical-chance threshold per D4, NOT a completeness proof). Rationale: the exhaustive mode's completeness was an exponential drain affordable only at ≤10 empties; a single greedy PV cannot prove swindle-*absence* (that is a universal over a branching reachability space — worst-by-eventual-outcome ≠ worst-by-solver-score), so full completeness was never cheaply attainable and is not the product goal. Kept: width caps (`gateBranch`/`gatePlayerTiedCap`) + a new opponent-branch **dedup-by-score** + a `gateNodeBudget` hard node cap (bounded time on pathological boards). **Amends D4/D19** (their asymmetry — sound-for-Blunder, incomplete-for-NotABlunder, I7 — is unchanged; only made uniform and explicit). This retires the `exhaustive` flag on `out.gate` and the `gate_exhaustive`/`gate_bounded` predicate split (→ single `gate_ran`).
  3. **`lost_realized_forced_block` is structurally impossible — removed from `REASON_UNIVERSE` (was mislabeled "rare" PROVISIONAL).** `forced_block` is definitionally a `defensive_miss` (you failed to answer the OPPONENT's pre-existing threat); tagBlunder only ever emits it in Phase A2 with `direction:'defensive_miss'`. In that direction the pattern is the opponent's, so the realized half is always `opponentPunishment` — never `lostResource`. `lost_realized_forced_block` requires `forced_block` in `missed_own`, which cannot occur. (`immediate_threat`/`double_threat` are threats *someone creates*, so both directions exist; `forced_block` is not.)
- **Consequence — fixture reclassifications (all verified coherent):** closing the enabled-fork router hole moves any board where the blunder handed the opponent a fork off the sign engine and onto the realized/denied route (this is D20's intent — the motivating `3321234543` is itself both-losing). Three committed fixture rows reclassified sign→`realized_denied figure_7/enabled_opponent` (`3333325662555225`, `3333003110656002222266315615016551`, `434240103412114`), each now emitting a real occupation-witness denial + fork realized half with a `tied` tie. The former `notABlunder`-bucket ltfl row was one of these, so its gate-NotABlunder coverage moved to a direct `swindleGate` unit test.
- **Rationale:** owner-directed investigation (2026-07-01) via scientific-method debugging: instrumenting the harvest to record the raw `tagBlunder` tag (not just routed hits) proved the forks are common, isolating the ply-locus bug; the gate/impossible-category cleanups remove the phantom "never-appears" coverage categories so `select_boards` completes on REQUIRED without chasing unreachable predicates. I8 (reuse `detectForkAt`/`findOccupationWitness`), I2 (gate-2 detector-confirmation still falls through when a fork can't be exhibited — no fabrication), I7/D4 (gate asymmetry preserved).
- **Status:** IMPLEMENTED on `stagging`. `reasonEngine.mjs` (`advanceToEnabledFork`, uniform `swindleGate`, `REASON_CONFIG.gateMaxPlies`/`gateNodeBudget`), `select_boards.mjs` (universe: `gate_ran`, `lost_realized_forced_block` removed, `rd_double_threat_enabled_opponent` REQUIRED), fixtures + tests updated. `npm run test:fast` 701/701; 60-game coverage harvest fills the previously-empty fork pair.
- **Source:** owner debugging session 2026-07-01; supersedes the D22 / `reason-tag-fastpath-pseudocode.md` §Honest-limits "rarity" attribution for the two enabled_opponent forks; amends D4/D19; D20.

---

### D24 — A routed tactic is a blunder even on a both-losing board (the route does not suppress it), but it now CARRIES the swindle-gate verdict; and `parityAttribution` retracts its fabricated `leverCells`/`forcedFirstRequired`/`groupKind`

- **Decision (two coupled fixes from the 2026-07-02 code review):**
  1. **F1 — router vs D4 reconciliation.** The D20 realized/denied router runs in front of the sign taxonomy; on a **both-losing** board (`bestScore<0 && playedScore<0`, the `lose_to_faster_lose` signs) where the played move concedes/hands over a routed one-move tactic (`immediate_threat`/`forced_block`/`double_threat`/`figure_7`), the router emits a **Blunder** reason. This is intended (D20: the lesson is the conceded tactic, not the sign-taxonomy parity machinery) and is **NOT** suppressed by D4/I4's "lost anyway → NotABlunder" rule. **This explicitly amends D4/I4:** a conceded/handed nameable one-move tactic is teachable even in a lost position — routed tags are exempt from D4's OMIT. But the router previously discarded D4's actual question ("was any practical counterplay preserved?") by hard-setting `gate: null`. It now RUNS `swindleGate` on `bestRoot` for both-losing routed boards and **carries the verdict** in `out.gate` (`{ ran, verdict: 'Blunder'|'NotABlunder', witness, nodesVisited }`). A routed Blunder with `gate.verdict === 'NotABlunder'` is the honest framing: *you were losing regardless, AND this move handed over the tactic.* The gate is DIAGNOSTIC on this route, never a suppressor. Non-losing routed boards keep `gate: null` (the gate does not apply). Before the fix, `gate: null` on such boards contradicted I4/D4 as written (verified: fixture `3333003110656002222266315615016551`,col 4 — routed `figure_7/enabled_opponent`, gate on bestRoot `found:false` over a fully-searched 8-empty endgame, yet emitted Blunder with `gate:null`).
  2. **F3 — `parityAttribution` fabrication retracted (I2).** `attributeParityWin` previously emitted `leverCells` (odd-height-parity empties, labeled "the zugzwang levers / z-threats"), `forcedFirstRequired` ("the win rests on a forced-first / Aftereven argument"), and `groupKind` (a major/minor THREAT label). All three are **removed**: a z-threat/lever is a detector-backed concept (KB `community-z-threat` requires a MAJOR threat at the cell + a controlling side), not "any empty with odd height-parity"; "rests on Aftereven" is an unbacked game-theoretic claim; and `groupKind` mislabeled a 0-own-disc window (a pure parity claim, not yet a threat) as `minor`. Because `parityAttribution` reaches the LLM (`toNarratorVector` does not scrub it) and the glossary instructed the model to treat `leverCells` as z-threats, this was a **live fabrication surface** (I1/I2). The payload now abstains: it emits only the solver-validated `controllingGroup`, `ownDiscs`, per-cell `empties` (raw height-parity arithmetic, claimed as nothing more), and `completingCell`. The detector-backed replacement (intersect the realized window with the production z-threat/Allis odd-even detector) is the **deferred D7 milestone** — an I12-gated separate change.
- **Rationale:** I1/I2 (never expose an unbacked claim to the narrator); I4/D4 (make the NotABlunder question explicit rather than silently dropped); the review's F1/F3 with verified counterexamples through the production path (`gate_vs_router.mjs`, `parity_cells.mjs`).
- **Status:** IMPLEMENTED on `stagging` (2026-07-02). `reasonEngine.mjs` (`realizedDeniedReason` carries the gate; `attributeParityWin` retraction), `select_boards.mjs` (`parity_forcedFirst` removed from `REASON_UNIVERSE`), `AdminFvSuffPage.jsx` + `feature-vector-glossary.md` + `reason-engine-pseudocode.md` + `blunder-reason-evidence.md` updated. Also fixed the F2 temporal-tie frame bug (compare absolute terminal disc counts, not cross-root walk lengths) and F6 denial-register consistency; retired dead `denialDepth`/`DIRS`. Tests updated.
- **Source:** 2026-07-02 code review (F1, F2, F3, F6, F8); amends D4/D19/D20; annotates D7 (parity naming still deferred).

---

### D25 — The swindle-gate WIDTH caps (score-dedup + gateBranch/gatePlayerTiedCap) are KEPT despite a confirmed within-depth false-OMIT; cost outweighs the rare miss

- **Decision:** The `lose_to_faster_lose` `swindleGate` width pruning — `gateBranch=3` (distinct-score opponent winning replies branched per node), `gatePlayerTiedCap=2` (tied-best player replies followed), and the unconditional **dedup-by-score** on opponent replies — **stays as-is.** The gate's `NotABlunder`/OMIT verdict is therefore incomplete on **both** depth (`gateMaxPlies=15`) **and** width. This is now an **accepted known-gap**, not a bug to fix.
- **Context (2026-07-02 code review, finding F4):** the width caps were shown to drop real admissible swindles that exist *within* the depth bound, producing a false OMIT (`computeReason → notABlunder:true`) on a genuine blunder. Verified through the production path with `connect-four/server/scripts/reason_engine/TOOLS/gate_cap_ablation.mjs` (production `swindleGate` vs an uncapped/dedup-free reference at equal depth): user-visible counterexample `20312225101223110055056066165433` played 3, best 6 (sign route); rate ≈ 1 per ~470 ltfl boards. The I0-motivated fix would have been to drop the score-caps and keep only `gateMaxPlies` + `gateNodeBudget`.
- **Rationale (owner directive, 2026-07-02):** the uncapped/dedup-free search is **too expensive** — the reference gate visits many times more nodes per board (≈1k+ vs ≈200 on a diff, and unbounded in the worst case) and the harvest/offline-compute cost is not worth eliminating a ~0.2%-of-ltfl-boards false OMIT. The owner **explicitly keeps the caps as the practical-chance policy**: `NotABlunder` means "no swindle found within the depth bound AND the width caps," which is accepted as the operative definition of "no *practical* chance." This SUPERSEDES the review's I0-based recommendation to remove the caps — the owner weighs cost over that particular completeness gain here. (I0's "never weaken to save calls" still governs everywhere else; this is a scoped, owner-accepted exception for the ltfl gate's `NotABlunder` side, whose soundness-for-Blunder — I7 — is unaffected: every emitted witness is still real.)
- **Status:** ACCEPTED known-gap (owner decision 2026-07-02). No code change. The caps in `REASON_CONFIG` stand. `blunder-reason-evidence.md` §10 reflects this as accepted, not open.
- **Source:** owner directive 2026-07-02 (kept the decision on cost grounds); code-review F4; `gate_cap_ablation.mjs`; I0/I7/D4/D23.

---

### D26 — Non-fork `win_to_draw` half (b) is now the occupation-witness denial too; the legacy `neutralization` is retired; supersedes the "non-fork keeps neutralization" carve-out of D17/D18

- **Decision:** For **every** `win_to_draw` board the `opponentPunishment` half is now the unified `findOccupationWitness` denial (D18), not just the fork sub-case. The non-fork sub-case (a genuine parity/zugzwang win, `lostResource.terminal !== 'fork'`) previously emitted a `neutralization` — the opponent's single saving reply (`savingCol`/`savingReplyCount`, `finalMovestring = playedRoot + saveCol`). It now walks the canonical optimal PV from `playedRoot` until the opponent occupies+kills a cell of **`lostResource.window`** (the single winning-line window; the fork case uses `forkWindows`), i.e. `findOccupationWitness(solver, playedRoot, { denier: opponent, windows: [lostResource.window], depthCap: 42 − len(playedRoot) })`. Emits the standard denial shape — `kind:'denial'`, `verdict`, `line`, `finalMovestring`, `completingCell`=killed cell, `window`, `cell`, `exhaustive`, `entryCell`, and a constructive tie (`occupation` → `{kind:'tied', sharedCells:[cell]}`, else `independent`). The `neutralization` kind and its `savingCol`/`savingReplyCount` fields are **removed from the engine** (the counterplay count is still available as `replyHistogram.afterPlayed`); `nameHalf` is no longer applied to this half (matching the fork/`draw_to_lose` denial halves, which carry no `tacticTag`).
- **Register is fwd-derived, but the FULL line is always retained (soundness-first):** the denial `register` is `registerOf(fwdOf(bestScore, discs))` — the same label the `lostResource` half carries, so a deep parity win is labeled `parity`. Unlike `renderHalf`, this branch does **not** null `line` for the `parity` register: the engine records the soundest, most complete evidence and leaves "what/how to feed the LLM" (e.g. not printing a long line) to a **downstream preprocessing step**. `register` is a label on this path, not a data gate.
- **Supersedes the "non-fork keeps neutralization" carve-out** stated in D17 §3, D18, and the `blunder-reason-evidence.md` §2 table. D18's occupation theorem (a drawn full board fills every winning-for-S window with ≥1 not-S disc) guarantees the witness exists for the single winning-line window exactly as it does for fork windows, so `no_occupation` is again only a depth-cap/solver-error residual (`exhaustive:false`). The fork sub-case is byte-identical to before (D18); only the non-fork branch changed.
- **Rationale:** owner directive (2026-07-02) — the `neutralization` named only the opponent's escape cell and never *exhibited how the winning line dies*, leaving the two halves reading as `independent` even though the played move's whole point is that it lets the opponent block the line the best move preserved. The occupation witness ties half (b) back to half (a)'s winning line constructively (D14 `tied`), the same lesson the fork case already tells. On the motivating empty-board case (`""`, played col 4) the witness is `c2r5` at ply 12 (the opponent takes the left end of the top-row four), `tie:tied` — concrete, not a deep incidental board-fill. I2 (every node solver-grounded), I9/Occam (one denial primitive for all `win_to_draw`), I3 (exhibit the line in both branches).
- **Considered and rejected:** (a) restricting the witness to short (`immediate`/`forced_sequence`) non-fork wins and keeping `neutralization` for genuine parity — rejected once rendering moved downstream (the deep witness is still sound evidence; the register label already carries the depth signal); (b) retaining `savingCol`/`savingReplyCount` alongside the denial — dropped as redundant with `replyHistogram.afterPlayed`.
- **Status:** IMPLEMENTED on `stagging` (2026-07-02). `reasonEngine.mjs` (non-fork branch of the `win_to_draw` case), `reasonEngine.test.mjs` (win_to_draw half (b) now asserted `denial`), `reason_fixture.jsonl` anchor `d26-nonfork-denial` (`""`, played 4). `npm run test:fast` 707/707. Docs updated: evidence §2/§4, taxonomy comment, pseudocode, glossary, `reason-opponentPunishment-spec.md`.
- **Source:** owner directive (2026-07-02); supersedes the non-fork carve-out of D17/D18; I2/I3/I9; D14 tie.

---

### D27 — The deferred D7 parity-naming milestone lands as `namedRule`: a parity-register win is named by an Allen victory rule ONLY when the production z-threat / odd-even detector confirms the completing cell; otherwise abstain

- **Decision:** `parityAttribution` now carries a **detector-confirmed** `namedRule` for parity-register wins, replacing the placeholder `parityNamingDeferred: true / namedRule: null` retracted in D24-F3. A new async `nameParityRule(solver, half, winnerMark)` (`reasonEngine.mjs`) runs after each `nameWalkedHalf` on a walked win-half that can be a parity win (the `win_to_draw`/`win_to_lose` `lostResource`, the `win_to_lose`/`draw_to_lose`/`lose_to_faster_lose` `opponentPunishment`, and the `lose_to_faster_lose` `conditional_swindle` `lostResource`). It is a no-op unless `half.parityAttribution?.nameable && half.register === 'parity' && half.terminal === 'win'`.
  - **Step A (solver-free) — lock-in-node scan (`findLockInNode`):** replay prefixes of `half.finalMovestring` to find the FIRST board where the realized `controllingGroup` window is 3-of-4 for `winnerMark`, holds 0 loser discs, `completingCell` is still empty, **AND the winner is to move**. Records `lockInPly` and the completing cell's height-relative `zcount` there. **Winner-to-move is load-bearing (R1 collision):** the *literal* "first 3-of-4" node is always the node right after the winner places their 3rd window disc, so the LOSER is to move there — and the detector emits its nameable capsule only on the non-recursive branch (`perspective === currentPlayer`). Empirically the literal node names **0 of 193** harvested parity wins; the winner-to-move node (one ply later — `""` played 4 → allen-v3, `zcount 5`, `lockInPly 24`) names correctly. Requiring winner-to-move is the faithful realization of the D7 goal (the literal reading names nothing); precedent is D23 `advanceToEnabledFork`. *(This refines the settled Step A wording; owner was away when surfaced, resolved toward the stated goal — trivially revertible.)*
  - **Step B (one solver query, I8) — production-detector confirmation:** at the lock-in node, run the PRODUCTION `detectZThreat` (fallback `detectOddEvenThreat`) from `classifier.js` with `perspective = winnerMark`. **Confirm only** when the detector returns its non-recursive **capsule** form (`highlightMetadata`) whose locus `cellStr(toRow, column)` equals `completingCell`. Not confirmed → **ABSTAIN** (`namedRule` stays `null`, `parityNamingDeferred` stays `true`). **Never name from `zcount` arithmetic alone** — that would re-create the retracted D24-F3 defect (an odd height-parity count is not a detector-backed z-threat).
  - **Step C — mapping:** `winner=P1 (Red/Green) + odd zcount → 'allen-v3'`; `winner=P2 (Black/Gray) + even zcount → 'allen-v4'`; any mismatch (P1+even, P2+odd) → abstain. On confirm, emit `namedRule: { rule, basis: 'z_threat', lockInPly, completingCell, zcount, parity }` and set `parityNamingDeferred: false`.
- **Abstention is the safety net (I2).** Every non-confirmed path — no lock-in node, solver error, detector recursion branch (winner not to move → no capsule locus), `matched:false`, locus ≠ completingCell, or a P1+even/P2+odd mismatch — abstains with `namedRule: null`. This is honest, not a gap. (On the motivating board `""`, played 4, the deep top-row win legitimately abstains: at its lock-in node the detector does not surface a single confirmable z-threat capsule.)
- **R1 detector-contract reconciliation (I12).** The settled design said "require detected cells to include completingCell", but `detectZThreat`/`detectOddEvenThreat` **never populate `cells`** — the confirmable locus lives in `highlightMetadata = { column, fromRow, toRow, badgeCount }`, and only on the non-recursive (`perspective === currentPlayer`) branch; `scores[col] > 0` and a single odd-count candidate are also required. Confirmation reads that capsule locus, not `cells`. Reading the detector's full return contract (not the branch we had in mind) is the I12 discipline that keeps naming sound.
- **R2 gate reconciliation.** `renderHalf` previously set `half.terminal` only for forks; it now also propagates `walk.terminal` (`'win'`/`'draw'`) for non-fork halves so the settled 3-clause gate reads literally (additive; every existing check is `=== 'fork'`, unaffected).
- **Known gap — `allen-v4` currently never confirms (detector locus, PENDING).** `detectZThreat` matches only ODD height-relative counts, so the P2/even `allen-v4` case must confirm through the `detectOddEvenThreat` fallback — but that detector returns `highlightMetadata: null` (its evidence is a parity-*choice*: `categoryEvidence.goodRowCol`/`goodRow`, a promoted good-parity minor, not a completing-cell z-threat locus). So `detectorConfirmsCell` can never confirm through it, and P2/even parity wins **abstain** (honest `namedRule: null`, I2). A 60-game harvest confirmed **0** `allen-v4` names vs abundant `allen-v3`. The mapping code (`winner=P2 + even → 'allen-v4'`) is retained so a future locus-exposing even-parity detector activates v4 without re-plumbing. Sourcing a P2/even CONFIRM fixture is **PENDING that detector** — deliberately not fabricated (plan honesty rule).
- **Explicitly DEFERRED (I9/Occam — not in this change):** NO V1/V2 multi-threat counting, NO T1–T7 simplifier, NO per-branch odd-threat ledger. One completing cell, one detector confirmation, one name. Broader Allen-rule inference is a separate, I12-gated milestone if ever pursued.
- **Rationale:** D24-F3 retracted `leverCells`/`groupKind`/`forcedFirstRequired` as I2 fabrications and named the detector-backed replacement as the deferred D7 milestone. `parityAttribution` reaches the LLM unscrubbed, so a fabricated rule name is a live fabrication surface; a **detector-confirmed** name is sound (I2/I8), collapses onto one mechanism (I9), and is validated per I12 (a counterexample per `{winner}×{parity}×{confirm/abstain}×{lock-in locus}` cell, through the production detector — including the mandatory ghost/undercut ABSTAIN board). `namedRule.zcount` survives `toNarratorVector` (no `*Score` key; D21).
- **Status:** IMPLEMENTED on `stagging` (2026-07-02). `reasonEngine.mjs` (`findLockInNode`, `detectorConfirmsCell`, `nameParityRule`, 6 wiring calls, R2 in `renderHalf`, detector imports); `reasonNarratorVector.test.mjs` (survival guardrail); `reasonEngine.enrichment.test.mjs` + `reason_fixture.jsonl` `d7-*` rows (I12 cells + abstain counterexample). Annotates D7/D24-F3. `npm run test:fast` green.
- **Source:** owner directive (2026-07-02); lands D7; annotates D24-F3; I2/I8/I9/I12; D21.

---

### D28 — P3 causal frames: composers derive horizon from `register`; the covers audit is a static causal-code check (not per-record presence); L2-vs-L3 branch-invariance is computed at render time

- **Decision:** Phase 3 adds a `template(fv, ctx)` composer per causal link (L1–L9) producing the coach
  sentence; `classifyCausalLink` returns the composed `text`. Composed frames hide (cover) the semantic
  CODES they subsume: a fired frame renders the family's routing/label codes (e.g. `register`/
  `terminal`/`verdict`) redundant for narration, even where the sentence does not restate each one
  word-for-word — the covers list names the whole family a frame makes narratively moot, not a literal
  transcript of the sentence. Cells and counts stay grounded. Three sub-decisions:
  1. **Horizon from `register`, not `pliesToEnd`.** `pliesToEnd` is absent on all 29 corpus records, so
     deep-vs-near framing derives from `register` (`forced_sequence` → "deep on a forced line", `parity`
     → "deep, via a parity battle"); the plies count is appended only when present. This is the eval-3
     fix (the deep fork is framed as deep, never "immediate").
  2. **The covers over-removal audit is a STATIC causal-code check.** Every `covers` entry across the
     catalog must resolve to a `causal-code` disposition; a `render`/`exclude`/typo entry throws. The
     spec's earlier "a covers entry naming an absent field throws" is infeasible — `covers` are
     family-wide supersets (`CODES_SIGN`/`CODES_REALIZED`) and every link legitimately names absent
     codes (verified across the corpus). L3's covers dropped `lostResource.exhaustive`/`gate.witness.node`/
     `gate.witness.devVal` (statically excluded); L7's dropped `tie.playedPlies`/`tie.swindlePlies`
     (`render` counts, kept grounded).
  3. **L2-vs-L3 branch-invariance is computed at render time** (`patternOnAfterBestBoard`, reusing the P2
     `tagBoard` on the after-best board), never read off `direction`. This is the eval-23 fix.
- **I12 note:** no corpus board is a `win_to_lose`/`draw_to_lose` + `enabled_opponent` +
  pattern-present-on-after-best (the case where the computation flips a would-be-L2 into L3); the
  computation is validated against real boards through `tagBoard` and the routing at the classifier
  layer with synthetic ctx. The missing flip-board is a documented PROVISIONAL gap for a Phase-4
  targeted harvest.
- **Status:** IMPLEMENTED on `stagging` (Phase 3). Render-layer only; `computeReason` untouched.
  `npm run test:fast` green; corpus completeness gate 29/29 zero-uncovered.
- **Source:** Phase-3 design `docs/superpowers/specs/2026-07-03-grounded-render-prompt-phase3-design.md`;
  spec `reason-render-grounded-prompt.md` §3b/§3d/§6; I12.

---

### D29 — P4 lands: `render_decision` persisted as grader ground truth; coverage universe gains the render-layer joint predicates; flip-case (D28 I12) gap CLOSED

- **Decision (three coupled P4 deliverables):**
  1. **`buildRenderDecision(nv)` emits a per-record `render_decision` object, render-only, no engine
     change.** Added to `renderReasonModel.mjs`, it captures `case`/`route`/`direction`,
     `patternOnAfterBestBoard` (the D28 L2-vs-L3 branch-invariance value), the fired link
     (`linkId`/`confidence`/`covers`/`guardrail`/composed `text`), `boards[{id, shown, reason}]`,
     resource grounding (`completingCell`, `register → horizon`), the field partition
     (`rendered`/`covered`/`excluded`), and `finalMovestring`. `compute.mjs` persists it on
     **condition-D answers lines only** (`renderDecisionForCondition`) — condition A/B/C rows are
     unaffected, and `computeReason` is untouched.
  2. **The `grade-fv-sufficiency` grader now grades condition D via G1–G6, consuming `render_decision`
     as ground truth — never re-deriving routing.** Per §3f, re-running `classifyCausalLink`,
     recomputing branch-invariance, or re-selecting boards inside the grader was explicitly rejected as
     the same class of drift that produced the eval-1/16/3 mis-grades. Two grounding fixes land with
     it: **G4** — cells are verified against the engine's OWN `finalMovestring`, never an alternate
     solver PV (the root cause of the eval-1/16 false convictions); and the **D28 covers semantics** —
     a `covers`-hidden-but-absent field is normal (the covers list is a family-wide superset), not
     `missing_info`.
  3. **The coverage universe gains the render-layer joint predicates via a shared `renderUniverse.mjs`,**
     consumed identically by `select_boards.mjs --strategy coverage` and the coverage test — spanning
     `link_L1`–`link_L9`, the branch-invariance split (L2-vs-L3), `board_*` (decision/after-best/
     after-played/projected-deep), covers-exercised, horizon, and the `case × route × direction` joint
     space, plus a bounded directed rare-fill (`RARE_FILL_GAMES` cap + no-progress early-exit) added
     after a tractability incident during harvesting (an earlier unbounded rare-fill run stalled/ran
     away; the cap + early-exit make the sampler terminate deterministically on a bounded budget). A
     **freshly regenerated 32-board set** (`boards_coverage_p4_2026-07-03T15-54-38Z.jsonl` +
     precomputed `reason_evidence_boards_coverage_p4_2026-07-03T15-54-38Z.jsonl`) is committed and
     graded by `renderCoverageUniverse.test.mjs`, which asserts all 35 `RENDER_REQUIRED` predicates
     covered, solver-free (reads precomputed evidence only). **The frozen 29-board set
     (`boards_coverage_2026-07-02T11-37-56Z.jsonl`) is retained** — not superseded — as the ablation
     (A-vs-D) input and the P1–P3 regression anchor; it is a strict predecessor, not a duplicate, of
     the P4 32-board coverage set.
- **Flip-case (D28 I12 gap) disposition: CONFIRMED reachable-but-rare, gap CLOSED.** The Phase-4
  directed all-suboptimal-column harvest surfaced two real boards carrying the `flip_case_l3`
  predicate (`win_to_lose`/`draw_to_lose` + `enabled_opponent` + pattern-present-on-after-best,
  routing correctly to L3 not L2) in the 32-board set — confirming Hypothesis H1 (reachable-but-rare)
  over H2 (router bug); the routing/computation was verified correct on both harvested boards. Full
  write-up: `docs/architecture/reason-flip-case-investigation.md`. `flip_case_l3` stays
  PROVISIONAL-with-example in the coverage universe (rare, now sourced — not blocking, not fabricated).
- **Rationale:** I2/I9 (the grader must consume one declared render-decision record rather than
  re-implement the composer's rules — §3e's "one rule × three consumers" principle, generalized to a
  fourth artifact: the persisted decision itself); I0 (the bounded rare-fill trades a small,
  documented completeness gap for a tractable, terminating sampler after the tractability incident);
  I12 (the flip-case gap is closed with real harvested counterexamples, not asserted away).
- **Status:** IMPLEMENTED on `stagging` (Phase 4). Render-layer + tooling only — `computeReason` and
  the engine are untouched. `renderReasonModel.mjs` (`buildRenderDecision`), `compute.mjs`
  (`renderDecisionForCondition`), `grade-fv-sufficiency` SKILL (G1–G6 + G4 PV fix), `renderUniverse.mjs`
  (shared universe) + `select_boards.mjs --strategy coverage`, `renderCoverageUniverse.test.mjs`.
  `npm run test:fast` 795/795 green.
- **Source:** Phase-4 design/task briefs (2026-07-03); spec `reason-render-grounded-prompt.md` §3e/§3f;
  D28; `reason-flip-case-investigation.md`; I0/I2/I9/I12.

---

### D30 — The sign `case` gates the L2/L3 OUTCOME sentence; `patternOnAfterBestBoard` is retired as the L2↔L3 discriminator; supersedes D28 sub-decision 3, plus the Fix-A coordinate-leak render fix and the Fix-C timing-not-causation glossary rule

- **Decision (three coupled fixes to defects surfaced by the 2026-07-03 combined-coverage FV-sufficiency grading run — 15/126 fails in three clusters):**
  1. **Fix B (engine `when` change, `causalLinks.mjs`) — the L2/L3 split now keys on the SIGN `case`, not on `patternOnAfterBestBoard`.** New predicates: **L3** iff `route==='realized_denied' && direction==='enabled_opponent' && case==='lose_to_faster_lose'`; **L2** iff the same but `case!=='lose_to_faster_lose'`. **This supersedes D28 sub-decision 3** ("L2-vs-L3 branch-invariance is computed at render time"). The principle: **L3's text asserts an OUTCOME** ("you were already losing, both moves lose, played loses faster") — an outcome claim is valid ONLY when both moves actually lose. `patternOnAfterBestBoard` is a **GEOMETRIC** fact ("the opponent threat cell is present on the after-best board") and is **NOT equivalent to "the best line loses"** — D28 conflated the two. Using geometry to pick L3 flipped genuine win/draw cases into a false loss narration: solver-confirmed on **eval-53** (`win_to_lose`, best truly WINS) and **eval-51** (`draw_to_lose`, best truly DRAWS) — both got L3 and the model faithfully narrated `best_outcome=loss`. These are exactly the `win_to_lose`/`draw_to_lose` + `enabled_opponent` + pattern-present-on-after-best boards that D28's I12 note flagged as an unproven provisional gap and that D29's `flip_case_l3` rare-fill sourced — the coverage run filled the gap and **proved the branch-invariance outcome-flip wrong** (D29 had recorded the routing on those boards as "verified correct"; it was not). `patternOnAfterBestBoard` remains **informational** in `render_decision` (`buildRenderDecision` still computes it for enabled_opponent) and MAY soften L2's guardrail *wording*, but **never** drives the outcome sentence. Consequence: the D28/D29 "flip case" (non-ltfl enabled_opponent routing to L3 via geometry) is now **structurally impossible** — the `flip_case_l3` coverage predicate is retained as a **regression marker** (its boards must now emit L2, never L3) in `renderUniverse.mjs`, still provisional.
  2. **Fix A (render-only, `renderReasonModel.mjs` + `fieldDisposition.mjs`) — kill the 0-indexed coordinate leak.** The grounded prompt now leads with a canonical, board-anchored **Decision block**: `you = player {X}`, `Better move: column {bestCol+1} (lands at {cell})`, `Played move: column {playedCol+1} (lands at {cell})`, with best/played **outcomes derived from `case`** (never a solver score — D21). Landing cells come from `movestring`+col via `parseBoardState`. `bestCol`/`playedCol` move from `RENDER_LEAVES` to the **transformed** disposition (the Decision block IS their transform, mirroring `movestring`→board), so the raw 0-indexed leaves no longer leak into the `# Vector facts` JSON residue. `READING_KEY` now states every column shown anywhere is a 1-indexed display column. Root cause (9 condition-D fails: eval-10/17/21/22/25/30/42/56/57): the JSON dump printed 0-indexed `bestCol`/`playedCol` while every other layer was 1-indexed, so the model emitted the raw value as `better_move` and scrambled move→cell→role (worst on the `444…`/c3r1 double_threat family). (`opponentPunishment.line[].col` was already transformed-dropped by the `isTransformed` `line` regex.)
  3. **Fix C (glossary, doc-only) — the raw-vector path safety net.** `feature-vector-glossary.md` now states that on a `lose_to_faster_lose` board `direction: enabled_opponent` is a **TIMING** fact ("the played move loses faster"), **NOT causation** — the opponent's pattern pre-exists on the after-best board. This protects conditions A/C and any non-render caller (which have no L3 guardrail): root cause of the 4 condition-A fails (eval-18/23/34/57 A) reading `enabled_opponent` as causal creation. On non-ltfl `enabled_opponent` (`win_to_lose`/`draw_to_lose`) the concession IS causal (the better move would have denied it), matching Fix B's L2.
- **I12 (validated through the PRODUCTION classifier, not the motivating example):** the full `(tag, case)` cell-space of the `enabled_opponent` branch driven end-to-end (`computeReason`→`toNarratorVector`→`buildReasonRenderModel`) in `reasonRealizedDenied.test.mjs`: **eval-53** `win_to_lose`→L2 best=win; **eval-51** `draw_to_lose`→L2 best=draw; **eval-23** (`32556442454451212`,played 5) `lose_to_faster_lose`→L3 both=loss. `win_to_draw` + `enabled_opponent` is not sourced in the frozen sets — PROVISIONAL per I12 step 4; the L2 routing predicate for it is asserted directly in `causalLinks.test.mjs`. Every board is extracted verbatim from the frozen combined-coverage answers, never hand-built.
- **Rationale:** owner-directed (2026-07-03) from the FV-sufficiency grade report. I0/I2 (correctness; every counterexample solver-verified, no fabricated board); I12 (case-space + counterexample per cell through production); the geometry≠outcome distinction D28 conflated. Fix A is render-only and highest-value; Fix C is a doc safety net; Fix B is the engine change, done last with the fullest validation (ordering A→C→B).
- **Status:** IMPLEMENTED on `stagging`. `causalLinks.mjs` (L2/L3 `when`; `branchInvariant` helper removed), `renderReasonModel.mjs` (Decision block + landing cells + READING_KEY), `fieldDisposition.mjs` (bestCol/playedCol → transformed), `renderUniverse.mjs` (flip_case_l3 comments → regression marker), `feature-vector-glossary.md` (Fix C + Decision-block contract). Tests: `causalLinks.test.mjs`, `branchInvariance.test.mjs` (routing test rewritten for D30), `renderReasonModel.test.mjs` (Decision block + no-leak), `reasonRealizedDenied.test.mjs` (I12 integration). `npm run test:fast` 803/803 green.
- **Source:** owner directive + grade report `fv_suff_answers_combined_boards_coverage_2026-07-03T17-42-51Z_2026-07-03T17-44-57Z_grade_report.md` (2026-07-03); supersedes D28 sub-decision 3; annotates D29 (`flip_case_l3`), D20; I0/I2/I12/D21.

---

### D31 — Opening-theory reason: `openingContext` two-mode evidence field, four guards, and the boundary vs. transposition/render layer

- **Decision:** `computeReason` gained an optional, mutually-exclusive `openingContext` evidence
  field (Part B, Tasks B1–B5), computed by a shared, side-effect-free helper
  `computeOpeningContext.mjs` (imported by both `reasonEngine.mjs` and production `explainContext.js`
  — one mechanism, I9). It emits EITHER `namedOpening: {id, family, matchedPrefixLen, bookNextCol}`
  (a KB book-line **lookup + provenance** claim, not a causal "leaving cost you" claim) OR
  `centrality: {bestCol, playedCol, betterHasMoreLines, text}` (a geometric fallback reusing
  `detectCenterDominance`), or is absent entirely. The field rides the narrator vector's existing
  general keep/drop rule (D3's `toNarratorVector`) with **no bespoke branch** — its field names are
  score-free (`bookNextCol`/`bestCol`/`playedCol`/`matchedPrefixLen`/`family`/`id`/`text`/
  `betterHasMoreLines`), so D21's score-scrub never touches it, and B4's `select_boards.mjs` coverage
  strategy registers two PROVISIONAL predicates (`reason_opening_named_line`,
  `reason_opening_centrality`) derived from its presence.
- **The four guards (`computeOpeningContext.mjs`), in order:**
  1. **Guard 1 — on-book prefix.** `matchOpeningPrefix(movestring)` (B1's pure KB matcher; five
     `allen-*` strategic-rule KB entries contribute worked-example movestrings as lines, parsed once
     and mirror-normalized `col → 6 − col`) returns non-null.
  2. **Guard 2 — beneficiary is the mover.** `player === 1` — every parsed KB opening line is a
     first-player win, so the beneficiary check is simply "is the mover player 1."
  3. **Guard 3 — SCORE-EQUALITY, not column identity.** `match.bookNextCol != null && bestScore > 0
     && scores[match.bookNextCol] === bestScore`. **This is the hard correctness point of the whole
     feature and supersedes any competing `bookNextCol === bestCol` phrasing that appeared in earlier
     planning text.** Under a tie of two-or-more equally-winning columns, the KB's recommended
     `bookNextCol` and the engine's own argmax `bestCol` can legitimately differ while both are
     correct — score-equality credits a book move that ties the max even when the engine's argmax
     happened to pick a different equally-optimal column; it never falsely claims a below-max book
     move is best (I2). No new solver call — reuses the engine's already-computed `scores`/`bestScore`
     (I0).
  4. **Guard 4 — specific id vs. shared family.** `id = match.ids.length === 1 ? match.ids[0] :
     null`; a prefix shared by multiple KB lines reports `family` only, `id: null` — this is a
     **correct, honest label**, not a hedge/gap.
  - **Centrality fallback:** when Guard 1 fails (off-book) or a later guard fails (on-book but
    unverifiable — e.g. Guard 3 fails because the book's next move is not solver-best), the position
    falls through to the `centrality` branch (confined to early boards, ≤6 plies, where the better
    move is strictly more central) rather than to absence. **A `centrality` field can therefore
    legitimately appear on a technically on-book position** — it is not proof the board is off-book.
- **Boundary — non-matching attribution and transposition, both explicitly OUT of v1:**
  - A board that fails Guard 1 (no KB prefix match at all, direct or mirrored) gets no `namedOpening`
    attribution of any kind — it either falls to `centrality` or is fully absent. There is no
    "close-but-not-quite" fuzzy match.
  - **Transposition (reaching a known line via a different move order) is NOT detected.** The matcher
    is a literal (mirror-normalized) prefix match against recorded KB worked-example movestrings only;
    it does not canonicalize board state or search for transposed move orders that reach the same
    position. A transposed board that is strategically on a known line but whose move *sequence*
    doesn't literally match will not get `namedOpening` — this is a known, accepted v1 gap, not a bug.
  - **The condition-D render layer (`causalLinks.mjs`/`buildRenderDecision`) is NOT wired for
    `openingContext`** — the frozen condition-D corpus has no opening boards, so no
    `render_decision`/`fieldDisposition`/causal frame exists for this field (per
    `project_reason_render_layer`). Production `explainContext.js`/`llmCoachHelpers.js` (a *separate*
    consumer, B5) grounds `openingContext` directly into the `## Opening theory` prompt section
    without going through the render layer at all. A later task would need to register
    `openingContext`'s disposition + a causal frame + `render_decision` if/when opening boards are
    added to the condition-D corpus — out of scope here.
- **I12 validated boards (B2's report, `openingContext.test.mjs`):** `3333` (shared-prefix →
  `family:'central-column opening', id:null`), `333331` (unique-id direct match →
  `allen-candlesticks-opening`), `333335` (unique-id mirror-reflected match, same id), `3332223`
  (Guard 2 fails — player 2 to move, negative counterexample → absent), `32` (Guard 3 fails — book
  move not solver-best → falls through to `centrality`, NOT `namedOpening`), `30` (off-book, Guard 1
  fails → `centrality`). Plus a cross-branch mutual-exclusivity test. See
  `blunder-reason-evidence.md` for the full per-board write-up.
- **Rationale:** I0 (guard 3 reuses already-computed `scores`; zero new solver calls); I2 (never
  claims a book move is best without a live score check; `id`/`family` disambiguation is never
  fabricated past what the matcher proves); I8/I9 (one shared `computeOpeningContext.mjs` module
  consumed by both the offline engine and the production prompt-builder — no guard duplication after
  the post-review fix); I12 (one deliberate counterexample per guard-branch, each through the
  production `computeReason`, each board solver-verified).
- **Status:** IMPLEMENTED on `opening-theory` branch (Tasks B1–B5). `openingMatch.mjs`,
  `computeOpeningContext.mjs` (shared, side-effect-free), `reasonEngine.mjs` (wiring),
  `reasonNarratorVector.mjs` (comment only — no logic change, general rule already covers it),
  `select_boards.mjs` (opening fixture band + two PROVISIONAL coverage predicates), `explainContext.js`
  / `llmCoachHelpers.js` (production `## Opening theory` prompt section). `npm run test:fast`
  812/812 green (as of B5); 806/806 at B4. This task (B6) adds no code — glossary + grader + this
  entry only.
- **Source:** Task briefs B1–B6 (2026-07-04/05); task reports `task-B1-report.md`…`task-B5-report.md`;
  `docs/knowledge-base/allen-*-opening.md` (the five source KB lines); memory
  `feedback_reason_case_requires_eval_and_grader`, `project_reason_render_layer`,
  `project_select_boards_skips_openings`; I0/I2/I8/I9/I12.

---

### D32 — `openingContext` gains a third mode `defense` (second-player on-book resist-and-wait); owner correction: `centrality` is NOT suppressed for a losing mover; precedence namedOpening → defense → centrality

- **Decision:** `computeOpeningContext.mjs` gains a third, mutually-exclusive `openingContext` mode,
  `defense`, alongside D31's `namedOpening`/`centrality`. It fires under three guards, all required:
  1. **On-book real match** — `matchOpeningPrefix(movestring)` returns non-null (the same B1 KB
     matcher D31 uses for `namedOpening`, mirror-normalized, no duplication — I9).
  2. **Player is 2** — the mover is the second player, the losing side of every parsed KB line (the
     mirror-image guard of D31's Guard 2, which requires `player === 1`).
  3. **`case === lose_to_faster_lose`** — the position is a genuine theoretical loss for the mover (both
     scores `< 0`); `defense` never fires on a position the second player could still draw or win.
  When all three hold, `bestDefenseCol = bestCol` — the solver's own argmax, i.e. the objectively
  least-bad reply — with **no `bookNextCol`-equality requirement**: unlike `namedOpening`'s Guard 3
  (D31), `defense` does not need the KB's book move to coincide with the solver best; it simply reports
  the solver's least-bad column as "the move that resists longest," independent of whether the KB text
  happens to recommend that exact column. `id`/`family`/`matchedPrefixLen` are carried through
  unchanged from the underlying `matchOpeningPrefix` result (`id` unique-else-null → `family` only, per
  D31 Guard 4's honesty rule).
- **Precedence:** `namedOpening` → `defense` → `centrality`. `namedOpening` (D31, player 1 only) is
  checked first and is mutually exclusive with `defense` on guard 2 alone (player 1 vs player 2) — they
  never compete on the same board. `defense` is checked before `centrality`: a second-player on-book
  `lose_to_faster_lose` position that passes all three `defense` guards emits `defense`, never falls
  through to `centrality`. `centrality` remains the fallback for everything neither mode claims (off-book
  boards, on-book boards failing a guard, and — per the owner correction below — on-book-but-not-yet-a-
  literal-KB-match `lose_to_faster_lose` boards for the second player, e.g. shared-prefix boards where
  `defense`'s `id` is `null` still route through `defense`, not `centrality`, because guard 1 only needs
  a prefix match, not a unique id).
- **Owner correction (2026-07-05): `centrality` is NOT suppressed for a losing mover.** The originally
  planned spec included a "companion suppress-fix" — silencing `centrality`'s existing "keeps more ways
  to build a winning connection open" framing whenever the mover is provably losing (since a lost side
  has no winning connection to build). That suppression is **dropped**. Instead, both `defense` and a
  losing-P2 `centrality` (`lose_to_faster_lose`, off-book or guard-failed) now carry a **`resistAndWait:
  true`** flag and the resist-and-hold goal framing, plus a **conditional** centrality/even-row canon
  frame: KB `docs/knowledge-base/allen-parity.md` states "Even-row threats (rows 2, 4, 6): Favour the
  second player (Yellow/Gray)" as **GENERAL canon only** — cited as a background strategic fact about
  why holding central/even squares matters for the second player, **never** as a per-board claim that a
  *specific* cell on *this* board is a confirmed even-row threat (that claim would require a detector,
  per D24-F3's retraction of unbacked `leverCells`/`groupKind`). This upholds D24-F3: the fix adds an
  honest general-canon sentence: it does not resurrect a fabricated per-cell parity claim.
- **`centralityGrounded` is conditional and honest per board.** `centralityGrounded =
  detectCenterDominance(...) != null` — true only when the production `detectCenterDominance` detector
  actually confirms center dominance for the position, false otherwise. Verified per I12: **true** on
  `333`/col 4 (`centralityGrounded:true` — the detector confirms), **false** on `3333344`/col 2
  (`centralityGrounded:false` — the detector does not confirm center dominance at that depth/column).
  This mirrors D31's discipline of never asserting a geometric claim the detector itself does not
  confirm.
- **Render-layer boundary unchanged (per D31).** Opening boards — `namedOpening`, `centrality`, and now
  `defense` alike — still bypass the condition-D render layer (`causalLinks.mjs`/`buildRenderDecision`):
  the frozen condition-D corpus has no opening boards, so there is no `render_decision`/`fieldDisposition`
  for any of the three modes. Production `explainContext.js`/`llmCoachHelpers.js` grounds `defense`
  directly into the `## Opening theory` prompt section, exactly as it does for `namedOpening`/`centrality`.
- **I12 counterexamples (validated 2026-07-05, via `TOOLS/compute_feature_vector.mjs`):**
  - `3333344` played 2, player 2 → `defense{id:'allen-5-4-opening', family:'central-column opening',
    matchedPrefixLen:7, bestDefenseCol:4, centralityGrounded:false}` — unique id, no centrality claim
    (equidistant columns).
  - `333` played 4, player 2 → `defense{id:null, family:'central-column opening', matchedPrefixLen:3,
    bestDefenseCol:3, centralityGrounded:true}` — shared prefix → family only; centrality clause fires.
  - `333331` played 0, player 1 → `namedOpening{id:'allen-candlesticks-opening', family:'central-column
    opening', matchedPrefixLen:6, bookNextCol:1}` — **unchanged**, confirming `defense` never displaces
    `namedOpening` on a first-player board (regression anchor).
  - `305` played 1, player 2, off-book → `centrality{bestCol:4, playedCol:1, betterHasMoreLines:true,
    text:…, resistAndWait:true}` — centrality NOT suppressed for a losing mover; carries `resistAndWait`.
  Full outputs recorded in `blunder-reason-evidence.md` §12's new "Opening defense" subsection.
- **Rationale:** I0 (guard 3 reuses already-computed `case`/`scores`; zero new solver calls beyond what
  D31 already pays for); I2 (never claims a book move is objectively best when only "least-bad" is true;
  `centralityGrounded` never asserts geometric dominance the detector itself doesn't confirm; the
  even-row citation stays general canon, never a per-cell fabrication — upholds D24-F3); I8 (reuses
  `matchOpeningPrefix`/`detectCenterDominance`, no new detector); I9 (one shared
  `computeOpeningContext.mjs` module, one mechanism, `defense` slots into the same guard-chain shape as
  D31's `namedOpening`/`centrality` rather than a parallel code path); I12 (one counterexample per
  branch — unique-id, shared-family, regression-anchor, off-book-centrality — each verified through the
  production `compute_feature_vector.mjs`, not asserted).
- **Status:** IMPLEMENTED on `opening-theory` branch (Tasks 1–3). This entry (Task 4) adds no code —
  decision record + evidence doc only. Sampling predicate `reason_opening_defense` lands in Task 5
  (`select_boards.mjs` coverage strategy), symmetric to D31's `reason_opening_named_line`/
  `reason_opening_centrality`.
- **Source:** `docs/superpowers/specs/2026-07-05-opening-defender-reason-and-sampling-design.md`; owner
  correction (2026-07-05, dropping the spec's companion suppress-fix); D31 (guard-chain shape, render
  boundary); D24-F3 (parity-fabrication retraction, upheld not reversed); `docs/knowledge-base/allen-
  parity.md` (even-row canon quote); memory `project_opening_defender_reason_gap` (the gap this closes);
  I0/I2/I8/I9/I12.

### D33 — `openingContext` renders in condition D: an additive **opening frame** is primary, the deep two halves demote to a horizon (no crisp deep cell)

**Context.** D31/D32 made `computeReason` emit `openingContext`, but the condition-D grounded-render
path was never wired for it (D31/D32 render-boundary note; memories
`project_reason_render_layer`/`project_opening_defender_reason_gap`). The first run to feed opening
boards through condition D (`fv_suff_answers_boards_coverage_opening_2026-07-05*`) therefore crashed
all 25 opening records with `UncoveredVectorFieldError` — the closed `fieldDisposition` tripwire firing
as designed on the unregistered `openingContext.*` subtree.

**Decision.** Wire it as an **additive opening frame**, faithful to the glossary's "epigraph, not
substitute" contract — NOT a new causal-link family:

- **`reason_engine/openingFrame.mjs` → `composeOpeningFrame(prunedFv)`** returns one primary frame
  (`O1` namedOpening / `O2` defense / `O3` centrality) = lead + landing-cell centrality/parity clause +
  horizon tail. `classifyCausalLink` (L1–L9) STILL runs — it feeds `render_decision`'s outcome
  scaffolding + horizon `register`/`pliesToEnd` — but its text is **not rendered**; the opening frame is
  the sole `frames[0]`. Opening boards show the **decision board only** (no after-best/after-played/
  projectedDeep).
- **The deep two halves demote to a horizon, never a crisp deep cell.** At ply 1–6 `lostResource`/
  `opponentPunishment` are sound but their completing cells sit 30–40 plies out. `pruneOpeningResidue`
  reduces both halves in the "Vector facts" residue to `{register, pliesToEnd}` — WITHOUT it,
  `renderedFields` leaks a 35-ply `completingCell` (e.g. `c6r2`) into the prompt, and the grader's
  `deepResourceGrounded:false` then FALSE-FAILS any answer that grounds it (a render-invited
  fabrication). Engine output is unchanged — this is render-only (I0 / `feedback_engine_soundness_then_render`).
- **Two distinct "centralities."** The `O3` lead is the engine's geometry statement
  (`openingContext.centrality.text`, backed by `betterHasMoreLines:true`) — an always-valid claim, NOT
  gated. The landing-cell clause ("easier to build a four through `{cell}`") IS gated on
  `centralityQualitative` (heatmap mass ratio; may be `null`). The grader's qualitative check applies
  **only** to the landing-cell clause; it must exempt the geometry lead.
- **Winning-cell heatmap** (`reason_engine/data/winning-cell-heatmap.json`, 27,976 self-play games,
  90/10 policy) is hardcoded config (copied from the design spec, NOT from branch
  `worktree-win-dist-grid`). Used **internally only** to pick qualitative words — never a probability in
  prose. `heatmap[player][row][col]`, row 0 = bottom; measured parity: P1 winning mass 72% on
  display-odd rows, P2 67% on display-even rows.
- `render_decision` gains an `openingContext` block `{kind, frameId, lead, centralityComparison,
  parityFavor, deepResourceGrounded:false, horizon}` (previously absent for opening boards — the grader
  rubric in `grade-fv-sufficiency` was updated to consume it).

**Source:** `docs/superpowers/specs/2026-07-05-opening-frame-render-design.md` +
`docs/superpowers/plans/2026-07-05-opening-frame-render.md`; final-review fixes (residue leak +
grader centrality scoping). Modules: `reason_engine/openingFrame.mjs`, `renderReasonModel.mjs`,
`fieldDisposition.mjs`, `reason_engine/winningCellHeatmap.mjs`. I0/I12; D30 (Fix-A coordinate-leak,
extended: opening columns `bookNextCol`/`bestDefenseCol` are `transformed`).
