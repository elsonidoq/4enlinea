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
  `docs/knowledge-base/allen-*-opening.md` (the five source KB lines);
  `docs/architecture/feature-vector-sufficiency-experiment.md` §7b; memories `project_reason_render_layer`,
  `project_reason_opening_traps`; I0/I2/I8/I9/I12.

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
  parity.md` (even-row canon quote); memory `project_reason_opening_traps` (the opening-defender gap this closes);
  I0/I2/I8/I9/I12.

### D33 — `openingContext` renders in condition D: an additive **opening frame** is primary, the deep two halves demote to a horizon (no crisp deep cell)

**Context.** D31/D32 made `computeReason` emit `openingContext`, but the condition-D grounded-render
path was never wired for it (D31/D32 render-boundary note; memories
`project_reason_render_layer`/`project_reason_opening_traps`). The first run to feed opening
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
  fabrication). Engine output is unchanged — this is render-only (`reason-INVARIANTS.md` I0/I0b).
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

### D34 — coach-voice pass: resistance-framed L3/L7, a C4-vocabulary layer, and a mechanism register contract

**Context.** A `grade-fv-sufficiency` run over the 57-board opening batch failed **every** case on
axis **A5 (coach voice)** while A1–A4 + G1–G6 passed 100% — i.e. the vector/glossary was sufficient and
the defect was purely render/prompt. Two triage buckets: **render_bug (12)** — L7 (and L3 once) emit
defeatist bookends the model faithfully echoed on player-2 opening boards; **prompt_confusion (45)** —
the model leaked internal jargon (`the vector`/`the solver`/`the gate`/`reply histogram`/`completing
cell`/`window`/raw tactic slugs) and 3rd-person analyst voice. Closes the OPEN gap in memory
`project_reason_opening_traps` (the coach-voice opening-defeatist gap, RESOLVED D34).

**Decision — three composer-layer changes, NO vector/schema change** (consistent with 0 `vector_error` /
0 `missing_info`):
- **Resistance frame (was defeatist).** L3 and L7 no longer say "You were already losing" / "Neither
  move wins" / "only loses faster." Keyed on the mover being lost (`case=lose_to_faster_lose`, a superset
  of the player-2-opening case — so it also covers lost player-1 mid-games), they now lead with the
  Connect Four practical-resistance principle: name the better column, "your most stubborn / toughest
  defense," "makes your opponent work hardest," keep the practical swindle alive. Theory basis: C4 is a
  first-player forced win (Allis 1988) — telling a losing side "you're lost" is redundant; the actionable
  content is central control + narrowest opponent margin (`gate.witness`, `replyHistogram`,
  `centrality`/`resistAndWait`, already in the vector). L3's no-causation rule moved from the player text
  into its **guardrail**. Mirrors production `llmCoachHelpers.js` ("hold the toughest defense, wait for a
  slip; do NOT claim to be building a win").
- **C4-vocabulary layer.** `TAG_PHRASE`/`plainTag` in `causalLinks.mjs` maps every internal tactic slug
  to its plain theory phrase (`immediate_threat`, `double_threat`, `figure_7`, `conditional_swindle`),
  applied in L1/L2/L3 so no raw slug reaches player text. One map, all tags.
- **Mechanism register contract.** `renderReasonModel.mjs` reframes the `READING_KEY` (concept-first,
  and an explicit "never repeat a field name / histogram / window / completing cell / solver / score in
  `mechanism`" line) and renames the raw JSON dump `# Vector facts` → `# Internal evidence fields (for
  your reading only — do NOT name these in mechanism; cite paths in fields_relied_on)`. The `compute.mjs`
  `TASK` schema now declares `mechanism` the ONLY player-facing field: 2nd-person, plain C4, machine
  tokens go in `fields_relied_on`; on a lost board, do NOT tell the player they are lost.

**Lockstep + verification.** `causalLinks.mjs` link text is a single source of truth asserted verbatim
by 4 test files — `causalLinks.test.mjs`, `causalLinksComposers.test.mjs`, `reasonRealizedDenied.test.mjs`,
and `reasonRenderFixes.test.mjs` (the last splits the assembled prompt on the literal header string, so
the `# Vector facts`→`# Internal evidence fields` rename had to update it) — all updated in the same
change; full `npm run test:fast` green (833/833) and a corpus scan of all rendered frames shows 0
defeatist / 0 raw-slug. **Grader note stale:** the `grade-fv-sufficiency` SKILL's aside "A5b render_bug
is the expected bucket for this vector today" no longer holds once the render is clean (residual
defeatism would now correctly bucket `prompt_confusion`); update it when the grader is next touched.
`select_boards.mjs` untouched (no new case).

**Source:** session 2026-07-06, branch `opening-theory`. Modules: `reason_engine/causalLinks.mjs`,
`renderReasonModel.mjs`, `compute.mjs`. Invariants: I0 (correctness over optimization — no vector change),
the coach-voice A5 axis in `grade-fv-sufficiency`.

---

### D35 — three condition-D render fixes from the 57-board grading run: tag bare-strip, dropped opening guardrail, defeatist-phrase ban

**Context.** A `grade-fv-sufficiency` run over 57 condition-D answers (57 boards,
`boards_coverage_opening_2026-07-05T18-58-35Z`, model `gpt-5.4`) scored 40 pass / 17 fail, all 17
`prompt_confusion`. Three distinct root causes, none requiring a vector/schema change:

1. **Unclosed annotation tags leak raw markup (13-14/17 fails).** The model sometimes emits a bare
   `[zone:X]`/`[term:X]` opener used as a noun, with no closing tag anywhere. Both
   `processAnnotations`'s `dropUnoffered` and the frontend `parseAnnotatedText` require a paired
   open+close, so an unclosed opener matches neither and its raw markup renders verbatim in the
   coach text the player reads. **Decision:** tighten the prompt instruction (paired-tag rule +
   bad/good example) AND harden `processAnnotations` as a backstop — bare-strip (delete the token,
   no canonical-phrase substitution) any tag still unclosed after normalization, returning a new
   `repairs: string[]` field. `processAnnotations` stays pure (no DB call); `compute.mjs` threads
   `repairs` onto the eval output line as `annotationRepairs`, and `grade-fv-sufficiency` treats a
   non-empty `annotationRepairs` as an automatic G7 fail (`prompt_confusion`). Production logging
   into `deep_reveal_failures` is documented as a TODO in `reason-render-grounded-prompt.md` §10 —
   `processAnnotations` has exactly one caller today (`compute.mjs`, eval-only); there is no
   production endpoint yet to wire the write into.
2. **Invented centrality asymmetry against a null signal (eval-18) — a code bug, not a
   prompt-wording gap.** `assembleGroundedPrompt` always rendered `model.link.guardrail` (the
   unconditional L1-L9 classification's guardrail) and silently dropped `frames[0].guardrail` (the
   opening frame's own guardrail) — so an opening record's model never saw any instruction against
   inventing a centrality claim; the composed frame text itself was already correct (omits the
   clause when `centralityQualitative` is null), but nothing told the model not to add one anyway.
   **Decision:** `assembleGroundedPrompt` now combines both guardrails when they differ (a
   non-opening record's `frames[0].guardrail` already equals `link.guardrail`, so no duplication);
   `openingFrame.mjs`'s `GUARDRAIL` gains a conditional clause, appended when
   `centralityQualitative(fv)` is null, explicitly forbidding an invented centrality/difficulty
   claim.
3. **Player-2 opening defeatism (eval-23, eval-24) — model non-compliance, not a missing
   guardrail.** L7's guardrail (per D34) already said "do NOT tell the player they are lost," and
   `grade-fv-sufficiency`'s A5b/G2 rubric (LLM-judged, not mechanical) already correctly caught
   both cases. **Decision:** strengthen L3/L7's `guardrail` text (not `template` — the verbatim-
   asserted player-facing text is unchanged) with an explicit banned-phrase list ("ends poorly,"
   "goes against you," etc.). Given this is already correctly guarded and graded, and only 2/57
   cases, **accept as a monitored residual** rather than building a mechanical detector or a second
   LLM rewrite pass — revisit with a heavier approach only if it recurs at a meaningfully higher
   rate in a future grading round.

**Source:** session 2026-07-06, branch `opening-theory`. Design:
`docs/superpowers/specs/2026-07-06-condition-d-render-failures-fix-design.md`. Modules:
`renderReasonModel.mjs`, `reason_engine/zoneAnnotations.mjs`, `reason_engine/openingFrame.mjs`,
`reason_engine/causalLinks.mjs`, `compute.mjs`. Docs updated: `reason-render-grounded-prompt.md`
§10 (TODO), `.claude/skills/grade-fv-sufficiency/SKILL.md` (G7c). Invariants: I0 (render-only, no
vector/schema change).

### D36 — the codebase now carries two competing solutions to the same perspective problem

**Context.** OI-76/OI-74's underlying defect — a detector reading one player's board threats
crossed with the *other* player's `scores` sign — has now been resolved twice, by two different
mechanisms, and no artifact previously said so out loud:

1. **Role-split (undercut, and now overcut, spec 052 US1).** Drop the `perspective` parameter
   entirely; export two role-named functions (`detectXVictim`/`detectXBeneficiary`) that each
   resolve their own role from `board.currentPlayer` — the mover. There is no non-mover-perspective
   case to support; a caller who wants the opponent's-eye view constructs the child board and asks
   again. Used by `detectUndercutVictim`/`detectUndercutBeneficiary` (shipped) and
   `detectOvercutVictim`/`detectOvercutBeneficiary` (spec 052 T005).
2. **FR-033 solver recursion (`detectZThreat`, `detectOddEvenThreat`, `detectForcedBlock`,
   `detectForbiddenColumns`, `classifier.js:849/1220/1615/1716` respectively).** Keep the
   `perspective` parameter; when `perspective !== board.currentPlayer && solver`, recurse into
   every child position (playing each legal column) asking the *same* perspective-mismatched
   question one ply down, until the recursion terminates. No role split — one function, one
   parameter, a solver-driven escape hatch for the mismatch case.

**Why this matters.** These are not interchangeable: the role-split makes "which player" a
compile-time-fixed concept (resolved once, from the mover, no ambiguity possible), while the
FR-033 route keeps `perspective` first-class and pushes the cost of reconciling it into runtime
solver calls — and, per OI-89, silently produces an unsound answer instead of reconciling
anything when the `&& solver` conjunct is false (no solver supplied, non-mover perspective
requested). Spec 052's Settled decision 1 explicitly chose the role-split for `detectOvercut` and
explicitly declined to migrate the four FR-033 detectors to it (T003A is audit-only) — so the
divergence is intentional-for-now, not an oversight, but until this entry nothing recorded that
the codebase deliberately carries both patterns side by side.

**Decision.** Record the divergence; do not reconcile it in this epic. If a future defect surfaces
in one of the four FR-033 detectors that role-split would prevent structurally (as it did for
undercut/overcut), that is the trigger to migrate them — not a standalone cleanup task.

**Source:** spec 052 (Epic 2) planning + T003A audit, 2026-07-30. Modules: `classifier.js`
(`detectZThreat`, `detectOddEvenThreat`, `detectForcedBlock`, `detectForbiddenColumns`,
`detectUndercutVictim`/`Beneficiary`, `detectOvercutVictim`/`Beneficiary`). Related: OI-74
(resolved, role-split precedent), OI-76 (resolved by role-split, this epic), OI-89 (the FR-033
route's latent unsound fall-through, deferred).

---

### D37 — `classifyPattern`'s Phase-C `'overcut'` detector-list entry calls `detectOvercutVictim`, not `Beneficiary`

**Context.** Spec 052 (Epic 1, US1) split `detectOvercut(board, scores, perspective)` into
`detectOvercutVictim`/`detectOvercutBeneficiary` (T005), each resolving its role from
`board.currentPlayer` (D36). Both are now legal candidates to wire into `classifyPattern`'s
detector list (`classifier.js:1854`), and `tagBlunder`'s Phase C calls `classifyPattern` on the
**post-move board after the correct/best move** — not the pre-move blunder board — so the side to
move on that board is whichever player did *not* just move (i.e., for a `missed_own` blunder, the
opponent of the blunderer). Picking the wrong one of the pair is a silent wrong-role wiring bug
that a bare unit test on either function cannot catch (FR-003) — it only shows up as cells that
belong to the wrong player once wired into the pipeline.

**Decision.** The `'overcut'` entry calls `detectOvercutVictim(board, scores)` (`classifier.js:1854`),
never `detectOvercutBeneficiary`. Rationale: on the Phase-C board, the side to move is the
opponent, and `detectOvercutVictim` resolves the *mover's* role — so it reports the opponent as the
victim (their own threat dies) and the **non-mover** (the blunderer) as holding the killing
threat that neutralises it. That is exactly the reading `tagBlunder`'s `MISSED_OWN` phase needs:
"the overcut you, the blunderer, just let stand/landed" — the blunderer's threat is the one doing
the killing, not the one dying. Wiring `detectOvercutBeneficiary` at this call site instead would
report the *mover* (opponent) as benefiting, attributing the blunderer's own overcut cells to the
wrong player — reintroducing OI-76 under the new function names.

`candidate-generator.js`'s `checkOvercutPredicate` is the other caller and correctly uses
`detectOvercutBeneficiary` instead (T008) — that call site evaluates a board where the *puzzle's
own solver* is the mover benefiting from the overcut (a puzzle-pool candidate, not a
blunder-attribution question), so the role need is inverted from Phase-C's. The two call sites are
not parallel; each needs the opposite half of the split.

**Verification.** `tests/integration/undercut_overcut.test.js`'s `tagBlunder Phase C — overcut
cells belong to the blunderer (spec 052 T007)` describe block (T010) runs the full `tagBlunder`
pipeline on harvested board `33341302254244423366` (blunderer plays col 5 instead of col 6) and
asserts the reported killing-threat cell is in the blunderer's own `reachableThreats` — this is the
regression that would fail if this call site were ever rewired to `Beneficiary`.

**Status:** LOCKED — this is the load-bearing call-site mapping for spec 052 US1's FR-003.

**Source:** spec 052 (Epic 1) T005/T007/T010, 2026-07-30. Modules: `classifier.js:1854`
(`classifyPattern`), `candidate-generator.js:372` (`checkOvercutPredicate`). Supersedes nothing;
extends D36 (which records the cross-detector pattern-divergence, not this specific
same-pattern-different-call-site mapping).

---

### D38 — Open Question 1 resolved: `'active_forcing'` is reserved for the new KB-matching branch; the existing T5-exception branch is renamed `'t5_row3_row6'`

**Context.** Spec 052 (Epic 2) US2/FR-008. `detectOvercutCore`'s `isT5Exception`-driven rescue
branch (`classifier.js`, inside `detectOvercutCore`) has, since before this epic, emitted
`reason: 'active_forcing'` — but `isT5Exception` fires only for the specific row pair `{2, 5}`
(0-indexed; Allen rows 3/6), regardless of column parity or row adjacency, and has nothing to do
with the community-overcut KB's actual "active forcing" mechanism (`docs/knowledge-base/
community-overcut.md`, precondition (e): odd-empty-count column, mover's turn, mover's threat
immediately above the opponent's blocked threat). This mislabeling is OI-60's motivating defect:
lesson 12 teaches the KB's real active-forcing shape, but no detector branch matched it under that
name (or at all) — the label was already spoken for by an unrelated branch.

**Decision (Option (b), per research.md Decision D3 and the epic's own documented leaning in
`open-issues-epics.md`):**
1. Rename the `isT5Exception` branch's emitted `reason` from `'active_forcing'` to
   `'t5_row3_row6'` — logic unchanged, label only.
2. Reserve `'active_forcing'` for a new, distinct rescue branch added in the same change,
   matching community-overcut.md's case (e): the mover's threat `R` sits immediately above the
   opponent's threat `Rp` (`R === Rp + 1`), the column has an odd number of empty cells, and
   — because the geometric shape alone does not guarantee a game win (community-overcut.md's own
   false-positive board `331324244556605142` has the identical local shape yet the mover still
   loses; see `known_limitations`: "Overcut does not guarantee a full game win") — the branch also
   requires `scores[col] > 0` directly, not merely inherited from the caller's role-based
   `scoreOk` gate (T5/T4/chain-T2 are theorems that hold independent of the rest of the board;
   active-forcing is not, so its score check cannot be delegated to the shared gate the way the
   other three are).

**Rationale.**
- This is the epic's own stated "likely resolution" (`open-issues-epics.md` § Non-obvious facts) —
  not a fresh naming guess.
- It converges the code's vocabulary with the KB's own (`community-overcut.md`'s
  `formal_predicate` names the T5 branch `"t5_exception"` and the true active-forcing case
  `"active_forcing"` — distinct strings for distinct mechanisms).
- Keeping `'active_forcing'` on the T5 branch (Option (a)) would perpetuate OI-60's exact
  confusion on the *unrelated* branch instead of resolving it on the branch lesson 12 and the
  community's own term actually describe.
- Grep-verified before renaming (per T018): `active_forcing` appears in production code only at
  the `detectOvercutCore` reason string; no lesson JSON, deep-reveal renderer, i18n string, or
  test asserts on the *old* T5-branch meaning of the string other than the two now-updated
  `undercut_overcut.test.js` assertions — see the grep transcript in the T018 commit/handoff notes.

**Consequence for FR-009/FR-010/FR-011.** `docs/knowledge-base/community-overcut.md`,
`allen-t2.md`, `allen-t4.md`, `allen-t5.md` gain cross-references naming both branches
(`t5_row3_row6`, `active_forcing`) plus the new `minor_threat` branch (Decision D2, the
structurally-unreachable-today minor-threat exception, now wired via
`getMinorThreatWindows`/`categorizeThreats`). Lesson 12's copy is updated to use `active_forcing`
only for the new branch.

**Source:** spec 052 (Epic 2) T017–T021, 2026-07-30. Modules: `classifier.js` (`detectOvercutCore`,
new `isActiveForcing` helper). Related: OI-60 (resolved by this decision + T021's branch), D2/D3
(research.md, the planning-phase resolution this entry executes), D36/D37 (the role-split this
branch is added inside of).

### D39 — Open Question 2 resolved: a forfeited forced win refines `direction`, not a new `pattern_category`; live-path phrase-pool key is a separate mechanism; `eval.forfeited_win.*` is out of scope; FR-017's premise corrected

**Context.** Spec 052 (Epic 1) US3/FR-014–FR-017. Before this change, a played move that forfeited
a forced win (`preScore > 0 && postScore === 0`) and matched no named tactical pattern fell through
`tagBlunder`'s Phase E score-based fallback to `{ tag: 'drawing_move', direction: 'missed_own',
reason: '...' }` — indistinguishable, by tag or direction, from a genuine draw-to-draw position
where the best achievable outcome really was a draw. A player who blew a forced win and a player
who correctly navigated to the only available draw saw identical labels.

**Decision (Option: refine `direction`, mint no new `pattern_category`).**
1. `tagBlunder`'s Phase E gate (`classifier.js`) now checks `preScore > 0 && postScore === 0` and
   emits `{ tag: 'drawing_move', direction: 'forfeited_win', reason: 'forced win dropped to draw,
   no pattern detected' }` for that case only. `classify()`'s independent fallback (used by the
   live `/api/evaluate-move` path) computes the same `bestScore > 0` condition and returns
   `phrasePoolKey: 'forfeited_win'` — **no `direction` field**, since `classify()`'s return shape
   never carried one; `phrasePoolKey` is a distinct, parallel mechanism (see point 3).
2. No new `pattern_category` value was minted. `blunderTags.js`'s `VALID_BLUNDER_TAGS` already
   contained `'drawing_move'` and tracks `pattern_category` only — it has no concept of `direction`
   at all, so it required no change (T033A). The `direction` column carries no CHECK constraint
   (`migrations/034_blunders_direction.sql`: "deliberately unconstrained to allow future extensions
   without a migration"), so `forfeited_win` required no migration either (T033B). The separate
   `pattern_category` CHECK constraint (`migrations/052_blunders_parity_threat_tags.sql`) is
   unaffected.
3. **The live sparring path (`FR-014`'s explicit second half) does not reuse `direction` at all.**
   `evaluateMoveHandler.js` resolves `phrasePoolKey = category || classifyPhrasePoolKey ||
   patternTag`, where `classifyPhrasePoolKey` comes from `classify()`'s own `phrasePoolKey` field —
   a mechanism independent of `tagBlunder`'s `direction`. Both mechanisms key on the same
   `bestScore > 0 && postScore === 0` condition but are separate code paths with separate return
   shapes; a future reader must not assume `classify()`'s output carries `direction` because
   `tagBlunder`'s does.
4. **`blunderReasons.js`'s composite `tag:direction` keying** (FR-014's closing clause) gains one
   new key, `'drawing_move:forfeited_win'`, alongside the pre-existing `'drawing_move:missed_own'`.
   The latter is now **dead on the stored path**: re-reading the pre-change `tagBlunder` (`git show
   HEAD:connect-four/server/classifier.js` at the time of this decision) shows Phase E's gate was
   *already* `preScore > 0 && postScore === 0` before this epic touched it — a genuine draw-to-draw
   position (`preScore === 0`) never reached `drawing_move` at all; it fell through to
   `{ tag: 'suboptimal_move', direction: 'missed_own' }`, both before and after this change.
   `'drawing_move:missed_own'` is kept in `REASON_TEMPLATES` as a defensive fallback (harmless dead
   entry, cheap insurance against a future Phase-E refactor that widens the gate) — it is not
   deleted, but no architecture doc may describe it as a live, reachable case.
5. **`eval.forfeited_win.*` is explicitly out of scope for this decision.** `evaluateMoveHandler.js`
   drives two independent lookup families from one `phrasePoolKey`: `coach.spoken.<key>.<quality>`
   (populated for `forfeited_win` in both locales) and `eval.<key>.<quality>.summary` (left absent).
   `drawing_move` never had an `eval.*` entry before this epic either — `pickFromPool` returns
   `null` and the summary line is simply omitted, matching pre-existing behavior for every other
   score-fallback tag. Adding one is a separate, future decision, not a regression of this one.
6. **FR-017 premise correction.** FR-017 states "a genuine draw-to-draw position MUST continue to
   receive its current tag unchanged" as if `drawing_move` were ever the tag for that case on the
   stored path. It was not (see point 4) — there is no behavior change to preserve for that case
   because it never reached `drawing_move`. FR-017 is satisfied trivially and by construction (the
   Phase E gate's condition is unchanged, only its emitted `direction` is refined), but the spec's
   premise that a "current tag" needed preserving on this path was factually wrong; this entry
   records the correction so a future reader does not go looking for a `drawing_move`
   draw-to-draw case that never existed. (The live `classify()` fallback path's pre-change behavior
   — plain `{ tag: 'drawing_move' }` with no `phrasePoolKey` for both sub-cases — is the one place
   where "unchanged for the draw-to-draw case" is a real, non-trivial claim: `classify()`'s fallback
   now sets `phrasePoolKey: 'forfeited_win'` only under the same `bestScore > 0` gate, so a genuine
   draw-to-draw live evaluation still returns plain `{ tag: 'drawing_move' }` with no
   `phrasePoolKey`, unchanged.)

**Rationale.** A new `pattern_category` would have required six touchpoints (CHECK constraint,
`blunderTags.js`, three architecture docs, both locales' display + reason vocabulary, the
`explainContext.js` tag list, the glossary) for a distinction that is purely about *why* a score
fallback fired, not a new tactical shape — `drawing_move` already means "no named pattern matched,
judged by score alone," and `forfeited_win`/`missed_own` are two reasons a score-only judgment can
land on the same `pattern_category`. Refining `direction` is the same pattern D34–D38 already use
for other pattern-vs-role distinctions, costs zero migration/CHECK-constraint surface (`direction`
is deliberately unconstrained), and keeps `pattern_category`'s CHECK-constraint set stable.

**Source:** spec 052 (Epic 1) T027–T041, 2026-07-30. Modules: `classifier.js` (`tagBlunder` Phase E,
`classify()` fallback), `evaluateMoveHandler.js`, `blunderReasons.js`, `blunderTags.js` (verified
unchanged), `src/i18n/en.json`/`es.json` (`coach.spoken.forfeited_win`, `mistakes.pattern.drawing_move`
label correction). Related: FR-012–FR-017, D34–D38 (citation format precedent).

### D40 — Open Question 3 resolved: only `figure_7` and `j_shape` are admitted to live-coach recognition; `z_threat`/`odd_even_threat`/`claimeven`/`undercut`/`overcut` are explicitly excluded, not silently deferred

**Context.** Spec 052 (Epic 2) US5/FR-022–FR-025, T052–T057. Of the seven tactical patterns the
offline pipeline (`classifyPattern`) recognizes but the live sparring path (`classify()`) never
does — `figure_7`, `j_shape`, `z_threat`, `undercut`, `overcut`, `odd_even_threat`, `claimeven` —
decide which are added to `classify()`'s priority chain for live praise (OI-30).

**T052 measurements (real, against a running server on this worktree's `$API_PORT`, harvested
mid-game position `333331111555551`, 16-ply, via `server/gameSampling.js`'s `playGame`):**

| Measurement | Value |
|---|---|
| Baseline `POST /api/evaluate-move` end-to-end latency (15 samples, real server) | median 4.6ms, mean 15.0ms, min 3.3ms, max 155.9ms (one solver-jitter outlier) |
| Explanation Engine's existing target (plan.md §Technical Context) | 2000ms |
| **Headroom** | **≈1995ms typical (2000 − 4.6), ≈1844ms worst-observed-case (2000 − 155.9)** |
| `detectFigure7` (pure geometry, mover perspective) | median 0.00ms, max 0.19ms |
| `detectJShape` (pure geometry, mover perspective) | median 0.00ms, max 0.39ms |
| `detectUndercutVictim` / `detectUndercutBeneficiary` | median 0.00ms, max 0.30ms / 0.02ms |
| `detectOvercutVictim` / `detectOvercutBeneficiary` | median 0.00ms, max 0.21ms / 0.02ms |
| `detectZThreat` (mover perspective, no solver call) | median 0.00ms, max 0.08ms |
| `detectOddEvenThreat` (mover perspective, no solver call) | median 0.07ms, max 0.37ms |
| `detectZThreat`/`detectOddEvenThreat` evaluated on `nextBoard` at the ORIGINAL mover's perspective (required for an absent→present gate — this recurses through the solver, since the mover is no longer `nextBoard.currentPlayer`) | median 0.2ms, one 12ms spike (6 samples) |
| `detectClaimeven` (real solver, `runClaimevenSimulation` per odd-height column, always solver-calling) | median 1.07ms, mean 5.93ms, max 40.41ms (8 samples) |

**Finding: latency is not the binding constraint for any of the seven.** Every candidate's
measured marginal cost — even the solver-calling ones, even including a second solver round-trip
for the "after" half of a transition gate — is at most tens of milliseconds against ≈1844–1995ms
of headroom. A pure latency-knapsack read of T052 would admit all seven. The actual constraint
that separates the two admitted patterns from the other five is **structural/architectural
soundness of the FR-023 transition-gate shape**, not the budget:

- `detectFigure7`/`detectJShape` (`classifier.js` — unchanged by FR-004 of spec 052 Epic 2)
  **retain an explicit `perspective` parameter** (`(board, _scores, perspective =
  board.currentPlayer)`). That means they can be called as `detectFigure7(nextBoard, null,
  mover)` — passing the ORIGINAL mover explicitly, not `nextBoard.currentPlayer` (which has
  flipped to the opponent once the move is played) — reproducing the exact absent→present shape
  Category 3/4 already use (`if (hasX(nextBoard, player) && !hasX(board, player))`) with zero
  solver cost and zero interface change.
- `detectOvercutVictim`/`detectOvercutBeneficiary` **deliberately dropped their `perspective`
  parameter** as part of this epic's own US1/US2 (FR-001–FR-003): role is resolved *only* from
  `board.currentPlayer` (who is to move), never from a caller-supplied argument — the exact fix
  for OI-76. That invariant makes it impossible to ask "does the ORIGINAL mover still have this
  pattern on `nextBoard`" at all: `nextBoard.currentPlayer` is the opponent, so
  `detectOvercutBeneficiary(nextBoard, nextScores)` necessarily describes the **opponent's**
  situation, not a retroactive fact about the mover's move. Reintroducing a caller-supplied
  perspective to make the gate possible would directly reopen OI-76 (the unsound branch FR-002
  explicitly forbids: "A caller wanting the non-mover's overcut status MUST NOT be served by
  silently flipping the score sign"). `detectUndercutVictim`/`Beneficiary` share the identical
  shipped design (`docs/architecture/server-conventions.md` §"Undercut has two sides") and
  inherit the same incompatibility. **Excluded: structurally incompatible with FR-023's gate
  shape given an invariant this same epic just locked down; not a latency finding.**
- `detectZThreat`/`detectOddEvenThreat` (`classifier.js`) DO retain an explicit `perspective`
  parameter (untouched by the overcut/undercut work) and so ARE structurally gateable — but
  correctly evaluating the "after" half for the mover's perspective on `nextBoard` triggers each
  function's own solver-recursion branch (`if (perspective !== board.currentPlayer && solver)`),
  because the mover is no longer `nextBoard.currentPlayer`. Admitting either therefore requires
  converting `classify()` — today a synchronous, solver-free pure function
  (`server/classifier.js`, no external process dependency) — into an `async` function with a
  live `solver` instance threaded through `evaluateMoveHandler.js`'s `buildEvaluationResponse`,
  for the first time introducing a per-move external-process failure mode into this exact path
  (the Edge Case's "solver temporarily unavailable or slow" scenario, which today simply cannot
  happen inside `classify()`). Measured marginal cost is low, but the risk/benefit is asymmetric:
  new architectural surface area and a new failure mode requiring graceful-degradation handling,
  for benefit that is additional praise variety rather than correctness. **Excluded: deferred, not
  because the numbers are bad, but because the "few patterns, honestly justified" outcome this
  epic's own judgment guidance sanctions is preferred over the sync→async refactor's risk for a
  nice-to-have.** Revisitable cheaply — the measured numbers above stand.
- `detectClaimeven` is unconditionally solver-calling (no board-only fast path exists in its
  implementation, unlike `detectZThreat`/`detectOddEvenThreat`'s mover-perspective shortcut) and
  is Yellow/Player-2-only, halving its live applicability. Same `classify()` sync→async
  architecture cost as above applies, for a narrower-scope pattern. **Excluded, same rationale as
  z_threat/odd_even_threat, compounded by the Player-2-only scope narrowing.**

**Decision.** Admit `figure_7` and `j_shape` only. Exclude `z_threat`, `odd_even_threat`,
`claimeven`, `undercut`, `overcut` — each for the specific, written reason above, not a blanket
"solver cost too high" (the measurements show it is not).

**Where slotted.** `classifier.js`'s `classify()` gained a new **Category 6** (figure_7/j_shape
creation), placed after Category 5 (`forbidden_columns`) and before the score-based Fallback.
Rationale for the position: Categories 1–5 all carry genuine move-urgency (an immediate win, a
fork, a forced win, a forced/failed block, a forbidden column) that must outrank a "you built a
shape" compliment; Category 1 firing first forecloses figure_7/j_shape recognition on any move
that is ALSO an immediate win, which is accepted (an immediate win is always more urgent feedback
than shape praise). Placing the new category before the Fallback means specific pattern
recognition still outranks the generic `best_move`/`drawing_move`/`suboptimal_move` labels when
no higher-urgency category fires.

**`eval.*` decision (FR-025).** Both `figure_7` and `j_shape` had complete `coach.spoken.*` pools
in both locales already (research.md D6, re-verified) but **no** `eval.<tag>.*.summary` entries in
either locale. Decision: **author them** (not "out of scope") — `eval.figure_7.{optimal,
suboptimal,blunder}.summary` and `eval.j_shape.{optimal,suboptimal,blunder}.summary`, in both
`en.json` and `es.json`, following the existing `z_threat`/`claimeven` three-quality-bucket
convention. Unlike D39's `forfeited_win` (a Fallback-path sub-reason with no natural score-quality
bucketing), figure_7/j_shape are ordinary named-pattern tags for which the existing convention
already has a direct template — authoring them is strictly additive and keeps this small feature
complete end-to-end (spoken line + written summary) rather than leaving a known half-populated
pool for a future epic to notice.

**Graceful degradation (Edge Case).** Not applicable — no solver-calling detector was admitted, so
`classify()` remains fully synchronous with zero external-process dependency, and the Edge Case's
"solver unavailable/slow" scenario cannot occur for either admitted pattern.

**Source:** spec 052 (Epic 2) T052–T057, 2026-07-30. Modules: `classifier.js` (`classify()`
Category 6), `src/i18n/en.json`/`es.json` (`eval.figure_7`, `eval.j_shape`),
`tests/integration/liveCoachFigure7JShape.test.js`. Measurements captured against `$API_PORT`
(this worktree) with a live c4solver process; raw sample scripts not committed (ad hoc,
scratchpad-only per CLAUDE.md). Related: FR-022–FR-025, OI-30, D36–D39 (numbering continuity).

### D41 — US4's forced-win `blockCol` diff is a correctness hardening with no observable behavior change today; do not "fix" it back to a boolean gate

**Context.** Spec 052 (Epic 2) US4/FR-019, T044–T045, T048. `classify()`'s Category 4 gate was
changed from a boolean `.matched` transition to a `blockCol`-identity diff on `detectForcedWin`'s
return shape, mirroring Category 3's column-set diff for `double_threat` (FR-018). Acceptance
Scenario 3 (spec.md) describes this as catching "a genuinely new forced-win opportunity... even if
the mover already had a DIFFERENT forced win before the move" — i.e., `detectForcedWin` matching
both before and after the move, with a different `blockCol` each time.

**Finding.** That transition is unreachable via a single `classify()` move. Proof sketch: whenever
`detectForcedWin(board, player)` matches with `blockCol = X`, column X's winning window already has
its other three cells filled (board cells are never unfilled, so this is permanent for the rest of
the game), so X remains a threat on `nextBoard` regardless of which *different* column the mover
plays. The mover can never play at X itself and have the move land in Category 3/4 at all, because
playing the immediate-threat column X would win outright — that is Category 1 (`immediate_threat`),
which is checked first and forecloses reaching Category 4 for that move. So if `nextBoard` is also
singly-matched (`myThreats.length === 1`), its one threat must still be X — `blockCol` cannot
change across one `classify()` move once it was already matched pre-move. Consequently the
`blockCol`-before vs. `blockCol`-after diff and the old boolean `.matched`-transition gate always
agree on every reachable single-move transition: **this diff changes no live-observed classify()
output today.**

**Verified empirically, not just by proof.** An exhaustive harvest attempt found zero
counterexamples across ~3,400 solver-guided self-play games (via `gameSampling.js`'s `playGame`)
plus ~21.8M solver-free random-walk plies directly probing `detectForcedWin` for a single move
transition with "both matched, different `blockCol`." See
`connect-four/tests/classifier/classifier.test.js` (the `describe('detectForcedWin() blockCol
identity (US4 T048 — mechanism-level...)')` block) for the full proof-sketch comment and the two
independently-harvested boards (`'0064323135'`, `blockCol=3`; `'052236'`, `blockCol=1`) used to
exercise the identity-diff mechanism directly (not via a move transition, since none exists), each
solver-verified via `./visualize_board.sh`.

**Consequence — do not revert this.** T048 (FR-019, Acceptance Scenario 3) is therefore satisfied
by a mechanism-level test plus this proof, not a harvested single-move transition test — that is
expected and correct, not a gap to fill later. A future reader auditing this diff against
production traffic will find it never fires differently from the old boolean gate and may conclude
it is dead code or a regression risk to simplify away — it is neither. The diff is real correctness
hardening (it removes an *assumption* — "no two distinct forced-win instances can ever need
distinguishing" — that the boolean gate baked in silently) and stands ready for the day
`detectForcedWin`'s matching logic changes (e.g. to support multiple simultaneous major threats,
which would break the single-cell-immutability argument above). Do not simplify the gate back to
`.matched` on the grounds that "the diff never differs in practice" — the equivalence is a proven
property of *today's* `detectForcedWin`, not an accident to clean up.

Separately, OI-90 records a genuinely distinct residual this diff does **not** close: two different
forced-win *lines* sharing the same anchoring `blockCol` (same first forcing move, different
continuation) are still conflated as one instance — that is a real, accepted scope limit of the
minimal `blockCol`-only identity (research.md Decision D5), orthogonal to this entry's finding that
the *shipped* diff has no observable behavior change on the single-value-mismatch case Acceptance
Scenario 3 describes.

**Source:** spec 052 (Epic 2) T042–T048, T064b, 2026-07-30. Modules: `classifier.js`
(`detectForcedWin`'s `blockCol` field, `classify()` Category 4), `tests/classifier/classifier.test.js`.
Related: FR-018–FR-021, research.md Decision D5, OI-33, OI-90.

### D42 — deep-reveal-grounding closing batch: two-attempt failure-logging schema, the `future:` spec convention, and `checkP5Strong`'s coverage remains partial by design

**Context.** Spec 058 (deep-reveal-grounding), User Stories 1–4, closing documentation batch,
2026-08-05. This entry records three things settled across the epic's four implementation batches
that had not yet been written into the decision log. **Numbering note:** the epic's own task list
(`specs/058-deep-reveal-grounding/tasks.md`, T036) names this entry "D35" — by the time this
closing batch ran, a separate lane's merge had already taken D35 (see the entry immediately above,
"three condition-D render fixes from the 57-board grading run"), so this is D42, the next free
number, not D35. Do not renumber the existing D35.

**1. Two-attempt failure-logging schema (US2, migration `065_deep_reveal_failures_two_attempts.sql`).**
Six new nullable columns on `deep_reveal_failures`:

| Column | Type | Meaning |
|---|---|---|
| `attempt1_raw_llm_output` | `text` | The raw LLM output of the FIRST attempt, before any retry. |
| `attempt1_mechanism` | `text` | The post-processed `mechanism` text of the first attempt. |
| `attempt2_raw_llm_output` | `text` | The raw LLM output of the retry attempt, if one occurred. |
| `attempt2_mechanism` | `text` | The post-processed `mechanism` text of the retry attempt. |
| `missing_handles` | `jsonb` | The required-set handles the first attempt failed to use — what triggered the retry. |
| `served_attempt` | `smallint` | `1` or `2` — which attempt's output was actually served to the user. |

`served_attempt` semantics: a row is only written when at least one attempt failed some guard (a
terminal failure after both attempts, or a `missing_required_squares` retry) — a clean first-attempt
pass writes no row at all (unchanged from the epic's pre-existing failure-logging posture). When a
row is written, `served_attempt` records whichever attempt's text the user actually saw: `1` when
the retry itself also failed and the system fell back to serving attempt 1's output anyway (a
partial answer beats none), `2` when the retry succeeded and its output was served. This is why
both `attemptN_*` column pairs exist independently rather than a single "the" output column — the
row must be able to show what each attempt produced even when only one was shown to the user.
New `failure_reason` value: `'missing_required_squares'` — no `CHECK` constraint exists on that
column (verified against `031_deep_reveal_failures.sql`'s body), so no migration was needed for the
value itself, only this documentation entry and the corresponding entry in `data-model.md`.

**2. The `future:` spec-prefix convention (US1).** No prior art existed in this codebase for
marking a highlight as "true, but not yet, don't treat it as a present threat" before this feature.
`buildAnnotationOffer` (`zoneAnnotations.mjs`) now emits `future:`-prefixed specs for a half's
`forkCells` when they come from a `tacticTag: 'double_threat'` fork that completes on the deep
`projectedDeep` board rather than a near-term one. Full mechanics are documented in
`docs/architecture/reason-render-grounded-prompt.md` §11b — this entry exists to make the decision
searchable from the D-log rather than duplicate the mechanics.

**3. `checkP5Strong` coverage remains partial by design — not a residual bug.** US3's guard-layer
work (`server/annotationGate.js`, `server/index.js`) wires a real `allowedSet` into `checkP5Strong`
at exactly **one** of the three call sites that reach it in `server/index.js`: the fresh-generation
path (a genuinely new LLM call, where the offered alias/term set is known and enforceable). The
other two call sites — the `explanation_cache` cache-hit path and the not-a-blunder short-circuit —
pass `allowedSet: null`, deliberately, with an explicit comment at each site. This means a cached or
not-a-blunder response is never checked against a *specific* offered set — only the cache-hit path's
pre-existing sanitization (see memory `project_blunder_serving_dual_paths.md`) applies. **This is an
accepted scope boundary of this epic, not something a future batch should silently "complete" by
threading `allowedSet` into the other two sites.** The reason it was left this way: the cache-hit
path has no live `zones` object to build an `allowedSet` from (the cached row does not carry the
render model that produced it), and the not-a-blunder path never calls the grounded-prompt machinery
at all — there is no offered set to enforce against. Widening coverage there is a distinct piece of
work (re-deriving or persisting the offered set alongside the cached explanation) that this epic's
scope never included; see `docs/open_issues.md` for the tracked residual gap this leaves open
(`P5strong:tg` span-strip, a narrower and separate gap from this one).

**Source:** spec 058 (deep-reveal-grounding) Batches 1–5, 2026-08-04/05. Modules:
`server/migrations/065_deep_reveal_failures_two_attempts.sql`, `server/deepRevealFailuresRow.js`,
`server/mechanismExplainer.mjs` (`computeMechanism`'s retry trigger), `server/annotationGate.js`
(`checkP5Strong`), `server/index.js` (the three call sites), `server/scripts/reason_engine/
zoneAnnotations.mjs`, `server/zoneParser.js`, `src/lib/annotatedText.js`. Related: US1/US2/US3 FRs,
`docs/architecture/data-model.md` "Deep Reveal Failures" section, `docs/open_issues.md`.

---

### D43 — A `future:`-prefixed alias DOES satisfy a derived plain cell in `deriveRequiredSet`; this supersedes spec 058's "never by accident" invariant and resolves OI-171

**Supersedes:** the invariant recorded as
`server/tests/renderReasonModel.test.mjs`'s test
`'deriveRequiredSet never matches a future:-prefixed alias against a plain derived cell spec'`
(spec 058, US1/US2), and the "known structural gap" paragraph in
`docs/architecture/reason-render-grounded-prompt.md` §11a.

**Decision.** `deriveRequiredSet` indexes `zones.aliases` by the alias spec with any leading
`future:` stripped. The derived spec (`denialCell(h)` or `'windows:' + h.window.join(',')`) is
unchanged, the 1–3 cap is unchanged, and required ⊆ offered is unchanged — the alias that matches is
an offered alias. **The Derivation Rule's SUBSTANCE was not widened: the same specs are derived from
the same two sources, the same cap applies, and `required ⊆ offered` still holds. Only the alias
INDEX was normalized.**

**Why.** `future:` is a render-framing decorator, not geometry. Five production functions already
strip it before matching: `zoneParser.js` `isValidSpec` (:18) and `expandSpec` (:70),
`annotationGate.js` `checkP5Strong` (:372), `reasonRenderGuard.mjs` `toAllowedSet` (:209), and the
client's `src/lib/annotatedText.js` (:53, :167, :266). `deriveRequiredSet` was the sole holdout, and
the consequence was that every causal half whose register is deep derived a plain `cNrM` that only
existed in the offer set as `future:cNrM` — so the group was dropped.

**Measured, on the four spec-058 staging feedback boards** (`buildReasonRenderModel` over real
`computeReason` output). Before, with the widened offer set (the new half-geometry family) but the
un-normalized index — i.e. the offer change ALONE was not enough:

```
3154                   requiredSet []
315444233213           requiredSet []
315444233213134122     requiredSet [c1r3 (you-major)]
3154442332131341225551 requiredSet []
```

After:

```
3154                   [future:c7r3 (you-key-square), future:c6r4 (opp-key-square)]
315444233213           [future:c5r5 (you-key-square), future:c3r5 (opp-key-square)]
315444233213134122     [c1r3 (you-major)]                                   <-- unchanged
3154442332131341225551 [future:c7r3 (you-key-square), future:c2r6 (opp-key-square)]
```

Board 3 is the natural experiment that isolated the mechanism: its `lostResource.completingCell`
(`c1r3`) happens to also be a structural major-threat cell, so it was already offered UNPREFIXED —
and it was the only one of the four boards with a non-empty required set and the only one whose
feedback asks were largely satisfied.

**Why NOT the alternative the epic contemplated.** OI-171's "if picked up" note proposed widening
the Derivation Rule to read `forkCells` as a fourth derivation source. That edits the Rule, which
spec.md copies verbatim from the epic with an explicit instruction not to re-derive it, and would
have needed an owner override. Normalizing the alias index does not touch the Rule at all.

**FR-002 is preserved.** The group's emitted `spec` is the alias's OWN prefixed spec and its `role`
is the alias's own future-tense role text, so the `# You MUST build the explanation around these`
prompt block still frames the square as "matters later, once the forced sequence reaches it — not a
threat right now", and the client still colours it with `FUTURE_ZONE_COLOR`.

**To reverse this in one step** (if the owner disagrees): in
`server/scripts/renderReasonModel.mjs`, symbol `deriveRequiredSet`, change
`new Map(... .map((a) => [unprefix(a.spec), a]))` back to `new Map(... .map((a) => [a.spec, a]))`
and delete the `unprefix` helper on the line above. Nothing else depends on it: the emitted group
already carries the alias's own prefixed spec, so `mechanismExplainer`'s `missingRequiredGroups`
comparison is unaffected either way. Two tests in
`server/tests/renderReasonModel.test.mjs` pin the new behaviour (the D43 test and the
`buildReasonRenderModel and buildRenderDecision both expose requiredSet` NV assertions) and would
need to be reverted alongside it.

**Source:** spec 058 feedback remediation, 2026-08-05. Modules:
`server/scripts/renderReasonModel.mjs` (`deriveRequiredSet`),
`server/tests/renderReasonModel.test.mjs`. Related: OI-171 (resolved), OI-172 (mitigated),
`docs/architecture/reason-render-grounded-prompt.md` §11a/§11c.

---

### D44 — P6 becomes rewrite-then-check: a coordinate its own zone VOUCHES FOR is humanized in place (precisely, with the row) instead of destroying the span; a MISMATCHED coordinate still gets no free pass

**Supersedes** nothing in substance — P6's invariant ("no raw internal coordinate reaches the
user") is unchanged. What changes is the **remedy**, and the row-dropping of the promoted/grounded
wording.

**The confirmed defect (RC-H).** Spec 058 feedback remediation, attempt 2, 2026-08-05. On board
`315444233213134122`, three of three real-pipeline runs had the model emit a **correct**,
engine-vouched highlight anchored on a literal coordinate:

```
rawMechanism: "You needed to keep [zone:c1r3]the c1r3 square that completes your
               four-in-a-row line[/zone:c1r3] alive, ..."
served:       "You needed to keep the column 1 square that completes your ... alive, ..."
stderr:       [annotation gate] stripped ... [ 'P6:raw_coordinate:c1r3' ]
```

`checkP6` flagged the inner text, P6 is span-carrying, and `stripFailingZoneSpans` destroyed the
whole highlight — so the board lit up nothing where the previous attempt had lit up `c1r3`, a
regression. The flattening then also dropped the row, which is precisely what that board's human
feedback complained about ("the text says 'column 1' but the coach speaks c1r3 which is much more
precise").

**Decision.**

1. **A new `humanizeGroundedCoordinates(text, locale)`** (`server/reasonRenderGuard.mjs`) runs in
   `guardExplainMoveLlmPayload` **after** `promoteRawCoordinates` and **before**
   `validateAnnotation`. For each `[zone:SPEC]` span it rewrites, *in place*, any `cNrM` / `colN`
   token that `expandSpec(SPEC)` actually covers into localized human wording. P6 then sees clean
   text and passes, and the correct highlight survives. Everything outside a zone span is untouched
   — that remains `promoteRawCoordinates`' job with `stripInternalTokens` as the final floor.
2. **MISMATCH POLICY (deliberate).** A coordinate its enclosing zone does **not** cover is left
   **raw**, so `checkP6` still fires and the span is still stripped.
   `[zone:c1r3]the c5r5 square[/zone:c1r3]` gets no free pass — a zone that points at one square
   while its words name another is not a grounded highlight, and laundering it would hide exactly
   the mis-anchoring the gate exists to catch. This fired for real in run 1 of the attempt-2
   measurement (board `3154`: the model wrote `[zone:future:c7r3]c6r3[/zone:future:c7r3]`), and the
   span was correctly stripped.
3. **Precision: a full cell reference keeps the row.** A new `serverT` key **`cell`**
   (`server/locale.mjs`) renders `en: "column 1, row 3"` / `es: "columna 1, fila 3"`.
   `humanizeGroundedCoordinates` and `promoteRawCoordinates`' wrapper text both use it.
   `stripInternalTokens`' `column` remains row-dropping **on purpose**: it is the last-resort
   flattening for an *unvouched* coordinate in ordinary prose, where naming a row the annotation
   layer never vouched for would over-claim (Decision A, research.md §5/§9).
4. **`future:` is stripped before matching**, the same normalization `zoneParser`, `checkP5Strong`,
   `toAllowedSet` and the client's `annotatedText` already apply (D43).

**Measured, three real-pipeline runs over the four spec-058 feedback boards** (`computeMechanism` ->
`toAllowedSet` -> `guardExplainMoveLlmPayload`, `specs/058-deep-reveal-grounding/t042-attempt2-*`):
**11 of 12 board-runs emitted every required spec with zero guard failures**; the twelfth is the
mis-anchor in point 2 above, correctly rejected. Board `315444233213134122` now emits `c1r3` **and**
serves "column 1, row 3" in all three runs.

**Also landed in the same batch (prompt-layer, no invariant change):**
- **Line-vs-square steer.** `roleText` (`zoneAnnotations.mjs`) marks every line role as "a LINE of
  four squares, not a single square" and every cell role as "single", and
  `assembleGroundedPrompt`'s Highlightable-regions block carries the rule plus a worked bad/good
  pair. Attempt 1 had the model name a line in words and ground it on one endpoint cell while the
  real `windows:` handle sat unused in the offer.
- **Term/zone adjacency.** A `[term:...]` opens a glossary popup and highlights nothing, and a term
  and a zone can **never** wrap the same phrase (`src/lib/annotatedText.js`'s `combinedRegex` is
  single-pass and non-nesting — a nested tag survives as literal visible text). The KB-terms block
  now *positively requires* the adjacent pairing, with a worked example, instead of only forbidding
  the overlap.

**Source:** spec 058 feedback remediation attempt 2, 2026-08-05. Modules:
`server/reasonRenderGuard.mjs` (`humanizeGroundedCoordinates`, `promoteRawCoordinates`,
`guardExplainMoveLlmPayload`), `server/locale.mjs` (`cell`),
`server/scripts/reason_engine/zoneAnnotations.mjs` (`roleText`),
`server/scripts/renderReasonModel.mjs` (`assembleGroundedPrompt`). Tests:
`server/tests/reasonRenderGuard.test.mjs`, `server/tests/renderReasonModel.test.mjs`.
Evidence: `specs/058-deep-reveal-grounding/t042-attempt2-run{1,2,3}-results.json`.

---

### D45 — The LINE becomes REQUIRED, not merely offered: `deriveRequiredSet` derives a cell group per half PLUS one line group; a `double_threat` half's groups are its two fork squares and its two fork lines

**Supersedes** the Derivation Rule's cell/line precedence as recorded in
`specs/058-deep-reveal-grounding/spec.md` §"Derivation Rule — Required Set" (copied verbatim from
`docs/epics/deep-reveal-grounding-epic.md`, Settled decision 2) and restated in
`docs/architecture/reason-render-grounded-prompt.md` §11a. **FR-004 (required ⊆ offered), FR-005
(cap 1–3, composed as "one per half that resolves to a cell, plus at most one line/window"), FR-006
(abstain, never invent) and FR-002 (`future:` framing) are all unchanged and still hold.** Only the
*precedence* changes.

**The defect.** The Rule said the derived spec is the half's load-bearing cell, "or the full
`half.window` array when the half's story is a line". Implemented as
`denialCell(h) ?? (h.window ? 'windows:'+… : null)`, the `windows:` branch was **effectively dead**:
virtually every half carries a `completingCell`, so the line was never reached. The engine offered
the correct line handle and the coach never used it — a human asks "what is the key four-in-a-row
line?" and the board lights one endpoint square.

**The measurement that justified it.** Attempt 2 (2026-08-05) added prompt steering for exactly
this — `roleText` marking every line role "a LINE of four squares, not a single square", plus a
worked bad/good pair in `assembleGroundedPrompt`. Measured over **12 real board-runs (3 runs × 4
spec-058 feedback boards, real LLM)**: **ZERO `windows:` specs emitted.**
Evidence: `specs/058-deep-reveal-grounding/t042-attempt2-run{1,2,3}-results.json`.
**Prompt steering alone is refuted for this behaviour. Requiring it is the only lever that moves
it.** (Re-confirmed independently in attempt 3: a *new*, handle-specific term→zone binding line was
added to the prompt for `[term:double_threat]` and the model ignored it in 3/3 runs; the same
pairing appeared in 6/6 runs only once the fork became a required group.)

**Decision.** `deriveRequiredSet` (`server/scripts/renderReasonModel.mjs`) now derives in two
passes, matching FR-005's own stated composition:

1. **A point group per half.** Normally `denialCell(h)`. **Exception:** a half with
   `tacticTag === 'double_threat'` and ≥2 `forkCells` derives `'windows:' + forkCells.join(',')`
   instead — a double threat's load-bearing geometry is *two* squares, and requiring one of them
   leaves the other dark while `[term:double_threat]` (which highlights nothing at all) points into
   the void. This is `buildAnnotationOffer`'s existing `<owner>-future-fork` alias; on match failure
   it falls back to `denialCell(h)`.
2. **Exactly ONE line group** (FR-005's "plus at most one line/window"), tried
   `lostResource` first, then `opponentPunishment`; the first half that produces a *matching*
   offered line fills the slot and the loop stops. A half's line geometry is
   `'windows:' + forkWindows.map(w => w.join(',')).join('|')` when it is a `double_threat` with ≥2
   `forkWindows` (its story is two lines, and only the combined `<owner>-fork-lines` alias shows
   both), otherwise `'windows:' + h.window.join(',')`.

**Why `lostResource` wins the single line slot.** It is the resource the *player* gave up, which is
what every "what is the key/long four-in-a-row line?" piece of staging feedback was asking about
(asks 1c, 2a, 2b); it is also the half the Derivation Rule names first. The alternative
(fork-lines-first) was evaluated and rejected: it would have satisfied 2 asks instead of 3.5, and
the fork's *squares* now reach the player through the point group anyway.

**Measured after, same harness, 3 runs × 4 boards** (`specs/058-deep-reveal-grounding/t043-attempt3-run{1,2,3}-results.json`):

```
windows: line spec emitted                       12 / 12 board-runs   (was 0 / 12)
every required spec emitted                      10 / 12 board-runs
guard failures                                    2 / 12, both the SAME pre-existing
                                                  model mis-anchor on board 3154 (D44 point 2:
                                                  [zone:future:c7r3] wrapping words that name
                                                  c6r3/c6r4 -> correctly stripped)
[term:double_threat] adjacent to a fork zone      6 /  6 fork board-runs (was 0)
```

Required sets on the four feedback boards after D45:

```
3154                    future:c7r3, future:c6r4, future:windows:c4r3,c5r3,c6r3,c7r3
315444233213            future:c5r5, future:windows:c3r5,c7r1, future:windows:c2r5,c3r5,c4r5,c5r5
315444233213134122      c1r3, windows:c1r3,c2r3,c3r3,c4r3
3154442332131341225551  future:c7r3, future:windows:c2r6,c5r5, future:windows:c7r3,c6r4,c5r5,c4r6
```

**FR-002 is preserved.** Every group carries the *alias's own* prefixed spec and the alias's own
future-tense role text, so a deep line still reads "matters later, once the forced sequence reaches
it — not a threat right now" and still renders in `FUTURE_ZONE_COLOR`.

**Opening records still abstain.** `buildAnnotationOffer`'s `opts.openingHorizon` suppresses the
half-resource family entirely, so no deep line is offered and therefore none can be required —
pinned by `renderReasonModel.test.mjs`'s
`'opening records never offer or require a deep half cell (guardrail + pruneOpeningResidue)'`.

**Also in this batch (no invariant change):**
- `roleText` (`zoneAnnotations.mjs`) gains a `future-fork` kind for a **multi-cell** fork alias. The
  old singular "this single square matters later" mis-described a two-square spec and the model
  paraphrased it back as "the later fork square" (measured, t043 run 1). The single-cell fork case
  still uses `future`.
- `roleText`'s `line` branch: `"the whole four-in-a-row line you is playing for"` → `"… you are …"`.
- `assembleGroundedPrompt` binds each KB term to the offered aliases carrying `kbId === slug`
  ("if you use this term you MUST also point at it, with `[zone:<handle>]` wrapping ADJACENT
  words"). **Measured ineffective on its own** (0/3 runs) — kept because it is free and correct, but
  it is the required-group change that actually produced the pairing.

**To reverse this in one step** (if the owner disagrees): in
`server/scripts/renderReasonModel.mjs`, symbol `deriveRequiredSet`, replace the two derivation
passes with the single original loop body
`const spec = denialCell(h) ?? (Array.isArray(h.window) && h.window.length ? 'windows:' + h.window.join(',') : null);`
and delete the `halfForkCellsSpec` / `halfLineSpec` helpers directly above it. Nothing downstream
inspects group *kind*: `mechanismExplainer`'s `missingRequiredGroups` compares `g.spec` against
`processAnnotations`' `usedSpecs` either way. The seven `D45:`-prefixed tests in
`server/tests/renderReasonModel.test.mjs`, the `D45` test in `server/tests/zoneAnnotations.test.mjs`,
and the three-group `okAnswer`/`missingHandles` fixtures in
`server/tests/mechanismExplainer.test.mjs` would need to be reverted alongside it.

**Source:** spec 058 feedback remediation attempt 3, 2026-08-05. Modules:
`server/scripts/renderReasonModel.mjs` (`deriveRequiredSet`, `halfForkCellsSpec`, `halfLineSpec`,
`assembleGroundedPrompt`), `server/scripts/reason_engine/zoneAnnotations.mjs` (`roleText`,
deep-fork family). Tests: `server/tests/renderReasonModel.test.mjs`,
`server/tests/zoneAnnotations.test.mjs`, `server/tests/mechanismExplainer.test.mjs`.
Evidence: `specs/058-deep-reveal-grounding/t043-attempt3-run{1,2,3}-results.json`,
`t043-attempt3-script.mjs`. Related: D43, D44, OI-172.

---

### D46 — An opening record MERGES the causal frame instead of replacing it; the deep resource is grounded as a `future:` square, not withheld

- **Decision (reverses D28's opening-suppression posture):** `buildReasonRenderModel`'s opening branch
  now emits `frames: [openingFrame, link]` and `boards: selectBoards(pruned)`, calls
  `buildAnnotationOffer` **without** `openingHorizon`, and `pruneOpeningResidue` is **deleted**.
  `openingFrame.mjs`'s `GUARDRAIL` flips from *"Do NOT ground a specific deep completing cell"* to
  *"when you name its square or line, say plainly that it matters LATER … never as a threat that
  exists now"*. `buildRenderDecision` mirrors the same offer set, so the routing record and the prompt
  cannot disagree (interim fix; full unification is OI-186).
- **Why the reversal:** printing only the opening frame kept `link.text` — and every cell it names —
  **out of the prompt entirely**. Verified on eval-12: `prompt.includes(link.text)` was `false` and the
  completing cell `c2r5` appeared nowhere. The model was being asked to ground an explanation on
  geometry it had never been shown. Measured before/after, live-to-live: opening records went from
  **2.60 to 6.63** mean zone aliases; `link.text` in the prompt from **0/30 to 30/30**; boards actually
  printed from **0/30 to 30/30** (the record had claimed `projectedDeep` was shown while only
  `decision` was rendered). Non-opening records are **byte-identical** (7.97 → 7.97).
- **The bet, and its revert trigger:** the suppression existed to stop a deep, currently-empty cell
  reading as a present threat (the eval-3 trap). That job now belongs to the **`future:` decorator** —
  the spec prefix plus role text "matters later, once the forced sequence reaches it — not a threat
  right now" — and to the new guardrail, rather than to withholding the handle. **If a post-fix grading
  run shows deep cells narrated as present threats, revert this decision**, not the `future:` machinery.
- **Status:** IMPLEMENTED (commit `e6eaed2`). `npm run test:fast` 1949/0. Two assertions that pinned the
  old guardrail wording were re-pointed at the new text.
- **Source:** the 2026-08-06 63-case grading (opening records passed 1 of 30) and the 2026-08-11
  25-board baseline; plan `docs/superpowers/plans/2026-08-11-deep-reveal-render-remediation.md` Task 6.

---

### D47 — Alias ownership derives from the half's KIND, not its position in the evidence object

- **Decision:** `zoneAnnotations.mjs` exports `halfOwner(half, side)`. A half whose `kind` is
  `denial` or `neutralization` describes the OTHER player's geometry, so the owner flips:
  `lostResource`+`denial` → `opp` (the opponent line you would have denied);
  `opponentPunishment`+`denial` → `you` (your line they deny). Both alias loops use it.
- **Why:** the previous hard-map (`lostResource → 'you'`, `opponentPunishment → 'opp'`) offered the
  opponent's window to the player as *"the whole four-in-a-row line YOU are playing for"*. This is
  **OI-184**, filed from the 2026-08-06 evaluation as the most severe defect found — a served
  explanation handed the learner the opponent's fork and labelled it theirs. **37 of 126** halves in
  the corpus flip owner under the correct rule.
- **Trap for future work:** the flip runs in BOTH directions. A fixture asserting `opp-key-square` on
  an `opponentPunishment`+`denial` board was encoding the bug and was corrected to `you-key-square`;
  do not "restore" it.
- **Status:** IMPLEMENTED (commit `e5c0c75`). `test:fast` 1950/0. Related: D45, OI-182, OI-184.

---

### D48 — The render layer must never DISPLAY a handle or slug it does not OFFER; and a fork's pivot is offered but not yet enforced

- **Decision (three rules, all render-layer):**
  1. **Display ⊆ offer.** `assembleGroundedPrompt` may never print a term slug or a concrete
     `[zone:<handle>]` that is not in this record's `zones.terms` / `zones.aliases`. Tactic names render
     through `TAG_PHRASE`'s canonical phrase (plus a render-only `RENDER_DISPLAY_PHRASE` map for slugs
     whose canonical phrase is missing or identical to the slug), and every worked example draws its
     handles from the record's own offer set, falling back to an abstract `<handle>` placeholder rather
     than a real-but-unrelated handle. When a record offers no terms, the prompt does not demonstrate
     `[term:]` syntax at all.
  2. **An unoffered tag is recorded, not silently dropped.** `dropUnoffered` pushes
     `unoffered_zone:<handle>` / `unoffered_term:<slug>` into the same `repairs` array as
     `stripUnclosedTags`, so an invented slug is visible downstream instead of vanishing.
  3. **A fork's pivot is offered and required** — the LAST ply of the half's `line[]`, never `entryCell`
     (which is `line[0]`, the opposite end), and never a `forkCell` or the other half's completing cell.
- **Why, measured:** over 125 graded runs, prompts that displayed an unoffered slug passed G7b 74/90
  (82%); prompts that did not passed 35/35 (100%) — every G7b failure sat in the "taught but not
  offered" condition. Corpus-wide the defect was 49/63 records for term slugs and 44/63 for zone
  handles. After the fix: **0/63 and 0/63**, and the post-fix subset re-measure moved G7b **87% → 98%**.
- **What this decision does NOT claim.** The same re-measure did **not** support the accompanying
  hypothesis that naming the better column in prose fixes A6: the treated templates moved only
  43%→54%, the untouched control group moved the wrong way, and three boards fail A6 5/5 or 4/5 while
  the prompt states the column verbatim, because the model paraphrases it as "the central move". A6's
  headline +8pts is entirely in the confounded opening stratum. **Do not cite this entry as evidence
  for the prose-column rule.**
- **Known limit:** `forkPivotCell` keys off `half.tacticTag ∈ {double_threat, figure_7}` + `forkCells`.
  A board whose fork lives in the board TAGS rather than a tagged half (e.g. `eval-47`) gets no pivot
  and still fails A7c deterministically. A7c is improved (9→6 run-failures), not closed.
- **Open revert trigger (D46's, now live):** `pin-L5-deep-fork` shows 3/5 runs conflating the deep
  fork-creating cell with the immediate best move, because the `fork-pivot` role text omits the
  "not right now" contrast its `future-fork` sibling carries. Fix that clause before re-measuring.
- **Status:** IMPLEMENTED (commits `0d6f818`..`3771fba`, `test:fast` 1976/0). Measurement:
  `docs/superpowers/plans/2026-08-11-baseline-numbers.md`. Related: D45, D46, D47, OI-182.

---

### D49 — Every offered handle must be individually identifiable, and a shared geometry takes the PRESENT framing

- **Decision (four rules, all render-layer; no `computeReason` change):**
  1. **Sibling roles must differ (OI-191).** `mkHandle` disambiguates the *handle*
     (`opp-key-square`, `opp-key-square-2`); `roleText` is a pure `(owner, kind)` function and returned
     the *same* string for both. `buildAnnotationOffer` now runs `disambiguateSiblingRoles` as its last
     step: any aliases sharing a `(role, truthBoard)` pair — exactly the pair the prompt prints — get
     their geometry front-loaded into the role (`the one at c3r1: …`, `the one through c4r6·c5r6·…: …`).
     The `future:` decorator is stripped from the hint (D43: it is framing, not geometry), and an alias
     with no sibling is left byte-identical.
  2. **The required block carries the same board disambiguator (OI-196).** `deriveRequiredSet` now
     propagates the matched alias's `truthBoard`, and `assembleGroundedPrompt`'s required block appends
     `(on the … board)` exactly as the Highlightable-regions block already did. Two required handles
     whose roles differ only by which board they are true on used to restate identically in the one
     block the prompt calls mandatory.
  3. **First-offer-wins is horizon-aware (OI-192).** When both halves reference the same geometry with
     different horizons, a `future:` framing may be **upgraded** to the present one — never the reverse.
     Present tense is the board-truth direction (an immediate offer is board-true on a shown near-term
     board), and the one-directional rule keeps the eval-3 present-threat trap closed: nothing here can
     turn a genuinely deep cell into a present threat. Handle, position and offer identity are
     preserved, so `requiredSet` (matched on the unprefixed spec, D43) and I13's display-⊆-offer
     contract are untouched.
  4. **L2's conceded cell is the SHARED cell (OI-195).** `tie.sharedCells[0]`, not the punishment
     half's `completingCell` — for a `double_threat` the completing cell is one of the fork's remote
     winning squares, which the opponent has not taken and may never take.
- **Why, measured (code-level; the LLM re-measure is pending):** the `(role, truthBoard)` collision
  stood at **48 of 63** corpus records before rule 1 and **0 of 63** after. Rules 3 and 4 were validated
  against their full case space per I12: `eval-33` is the only corpus record where the two halves offer
  one geometry at two horizons, and of the five L2-routed records only `pin-L2-enabled-opponent` and its
  branch-invariance twin have `tie.sharedCells[0] !== completingCell` — the other three render
  byte-identically, which is what makes the next measurement attributable.
- **What this decision does NOT claim.** No G7 number yet. These four are the render-side root causes
  behind four of the five boards driving the G7 judgment failures; whether the axis moves is the next
  measurement's question, not this entry's.
- **Deliberately out of scope here.** L2's verb "occupy" still over-claims on the other four L2 records
  (the named square is empty on the opponent's own line there too) and its raw `cNrM` notation is
  OI-194. Both are *wording*, and L1/L2/L4/L8's wording belongs to the separate prose pass — bundling
  them would destroy the attribution, exactly as correction #4 in the remediation plan's STATUS block
  records.
- **Status:** IMPLEMENTED, `test:fast` **1990 / 0**. Related: D43, D45, D48, I13, OI-191, OI-192,
  OI-195, OI-196.

---

### D50 — One projected board PER DEEP HALF, and a deep alias names the board its owner's geometry is true on

- **Decision (two rules, render-layer only; no `computeReason` change):**
  1. **`boardSelectionDecisions` renders one `projectedDeep*` board per deep line.** It used to `.find()`
     the FIRST deep half and build a single shared board from its `finalMovestring`. Now each deep half
     contributes a board; halves sharing one line still share one board, the first keeps the plain
     `projectedDeep` id, and a second (`projectedDeepOpp`) appears only when both halves are deep with
     different lines. Every pre-existing single-board shape is byte-identical.
  2. **A deep alias's `truthBoard` is chosen by BOARD TRUTH, not provenance** — the projected board on
     which that alias's OWNER actually occupies the geometry, resolved **once per half** over all the
     cells that half contributes, using the production board model (`parseBoardState` + `statusOf`).
     Ties and a no-evidence result fall back to the half's own line; with fewer than two deep boards the
     answer is the single `projectedDeep`.
- **Why provenance alone is wrong.** `halfOwner` re-owns a `denial` / `neutralization` half to the other
  player, so an alias can be produced by one half while belonging to the other's line. `eval-9`'s
  `you-key-square-2` (`c3r5`) comes from `opponentPunishment` but is one of YOUR line's squares and is
  your disc only on `lostResource`'s line. Binding by producing half put an OPPONENT disc under a `you-`
  handle — OI-190 reintroduced from the other side. Measured: binding by provenance fixed 14 aliases and
  broke 9; binding by board truth fixed them without that trade.
- **Why once per half.** The deep-fork loop and the half-resource loop originally decided independently,
  which split `eval-13` / `eval-22` / `eval-23` — a half's fork alias on one board and its key square on
  the other, describing one idea from two continuations. One resolution, both loops.
- **Measured, corpus-wide (63 records, 89 deep single-cell aliases):**
  **contradictions — an alias whose cell holds the OTHER player's disc on the board it names — went
  17 across 16 records → 0 across 0 records.** Owner-correct went 54% → 67%. The remainder are cells
  that are EMPTY on their stated board, which is not a contradiction: a `future:` cell is expected to be
  unplayed and the role text says so. A per-ALIAS rule scored marginally higher (72%) but split
  siblings; the per-half rule was preferred for coherence.
- **Cost, stated.** 38 of 63 records now render a second projected board (mean assembled prompt 10,076
  chars). This is I0 — correctness over optimization: the alternative is an alias pointing at a board
  its cells are false on, which is what the graders charged 5/5 on `eval-11` and `eval-20`.
- **What this decision does NOT claim.** No LLM number yet. The 2026-08-25 graded run measured the code
  BEFORE this change; whether G4/G5/A7b move is the next measurement's question.
- **Status:** IMPLEMENTED, `test:fast` **1999 / 0**. Guarded by three corpus-wide tests in
  `zoneAnnotations.test.mjs` whose occupancy check is deliberately independent of the production board
  model the fix uses. Related: D43, D45, D49, OI-190, OI-196.

---

### D50 addendum — measured outcome, and the A5 regression it introduced

Re-measured on the frozen 25-board subset (`fv_suff_answers_boards_subset_2026-08-25T20-16-50Z`,
`gpt-5.4-mini`, n=5, rubric v1), against the D49 run graded the same way:

- **G4 80 → 94, G2 86 → 96.** G4 is the axis defined as "verify every named cell against
  `render_decision.finalMovestring`" — precisely what a wrongly-labelled projected board breaks. Ten
  independent graders verified the fix cell-by-cell on their own board; `eval-11` and `eval-20`, both
  previously 5/5 deterministic OI-190 failures, no longer reproduce it.
- **A5 88 → 76 — a regression this change caused.** The second board's caption read *"for your
  opponent's punishment"*, and "opponent punishment" is on A5a's banned-terminology list; the extra
  board also gave the model board names to paraphrase ("the deep board", "the deep reply board").
  Measured on the answers themselves: runs leaking a render/board label went **0/125 → 10/125**, on
  exactly the seven records that gained a second board.
- **Fixed immediately after that run:** the two-board suffix is now plain Connect Four (`— your line` /
  `— your opponent's line`), and `READING_KEY` carries an explicit rule that board names and their
  paraphrases are internal labels never to be written in `mechanism`. `test:fast` **1999 / 0**.
  The A5 number above therefore does NOT reflect shipped code.

**Lesson worth keeping:** adding a board adds VOCABULARY, not just information. Any new render surface
that the model can see is a surface it can echo, and the never-repeat list has to grow with it.

---

### D51 — FR-013's seam: the guard-aware required-set check runs BEFORE the existing single retry, on `attempt1`

- **Decision:** `mechanismExplainer.mjs`'s `computeMechanism` now builds `board = new Board(movestring)`
  and `allowedSet = toAllowedSet(renderDecision?.zones?.aliases ?? [])`, then calls a NEW, first,
  in-process invocation of `guardExplainMoveLlmPayload({ explanation: attempt1.mechanism, board,
  allowedSet, diagnostics: true })` immediately before the existing `missing =
  missingRequiredGroups(requiredSet, attempt1)` call. `survivedSpecs = attempt1.usedSpecs.filter(s =>
  !diagnostics.strippedSpecs.includes(s))` is passed into the existing `missingRequiredGroups` call in
  place of the raw `attempt1.usedSpecs` — `missingRequiredGroups` itself is unchanged. The retry's
  BUDGET and TRIGGER SET are untouched (D-log precedent narrowing retry scope); this only changes which
  specs count as "used" for the existing `missing.length > 0` check, so more records retry: the 5 runs
  that lose a `[zone:…]` span become retry candidates that did not retry before. The live `/explain`
  endpoint's own guard call (on `finalAttempt.mechanism`) is unaffected — this is a second, separate
  invocation used only to decide the retry.
- **Rejected alternative — restructure the seam so the guard runs once and its result threads
  through**, instead of a second invocation. Rejected because: (a) the guard is provably free (no I/O:
  `promoteRawCoordinates`, `humanizeGroundedCoordinates`, `validateAnnotation`,
  `stripFailingZoneSpans`, `stripInternalTokens` are all synchronous string/regex/board-lookup
  functions) — no performance case for the restructure; (b) it would couple `index.js`'s three
  `guardExplainMoveLlmPayload` call sites (cache-hit, not-a-blunder, fresh-generation) to a
  `computeMechanism`-shaped result even on the two paths that never call `computeMechanism` — a larger,
  riskier diff for zero measured benefit; (c) it would guard `attempt1`'s text against a request context
  that has not yet decided whether a retry happens, conflating the retry-decision diagnostics with the
  endpoint's real guard call on `finalAttempt.mechanism`.
- **Rejected alternative — moving the endpoint's guard call earlier.** Also rejected for reason (c)
  above: the endpoint's real guard call belongs on the FINAL served text, not on an intermediate
  attempt.
- **Measured:** in all 5 of the corpus's span-losing rows, the stripped spec is one of that row's own
  `requiredSet` specs; `eval-5` replayed end-to-end goes from `calls === 1` (no retry) to `calls === 2`
  (retry fires).
- **Status:** IMPLEMENTED, epic 059 (Deep-Reveal Remediation) T017. Resolves OI-177. `test:fast`
  2041 / 0.

---

### D52 — `renderedFields`'s array/object emptiness-guard asymmetry, and the board-selection-aware `.line`-path consistency test

- **Decision:**
  1. The array branch of `renderedFields`'s `prune` (`pruneArray`'s caller) now mirrors the object
     branch's existing empty-drop guard: after `pruneArray(val, path)` runs, if every element is `{}`,
     `key` is dropped from `copy` entirely, exactly as the object branch already dropped a child that
     pruned to `{}`. Measured: empty `[{},{},...]` array literals went 36/63 → 0/63 corpus-wide.
  2. `fieldPartition`'s existing disposition-only classification is left alone for `TRANSFORMED_LEAVES`
     (`movestring`/`finalMovestring`/`bestCol`/`playedCol`) — unconditionally shown via the Decision
     block, so the carve-out holds there without qualification; this is NOT reclassified (the over-broad
     reading FR-019 explicitly forbids). For the `.line`-pattern subset specifically, a new corpus-wide
     test (`renderFieldPartitionLineCarveout.test.mjs`, T028) checks: for every record, if a
     `.line`-typed path is non-empty in the pruned vector, either (a) its owning half's board is among
     that record's selected/rendered boards, or (b) an alias derived from `.line` is present in
     `zones.aliases`. This is model-free and runs the production `fieldPartition`/`selectBoards`
     functions directly.
- **Empirical deviation from the plan, found while implementing (record what was found, not what the
  plan predicted):** the plan's Decision 2 named `eval-33`/`lostResource.line` as a genuine violation
  requiring a named exemption, and read condition (b) narrowly (fork-pivot aliases only). Implementing
  T028 found: `eval-33` turns out **not** to be a genuine violation — its `lostResource` is
  deep/`forced_sequence` and gets its own `projectedDeep` board matching its `finalMovestring`, so
  condition (a) holds for it directly. Under the plan's narrow reading of (b), **7 other records** would
  go RED instead: `eval-34/41/47/48/49/50` and `pin-L1-completes-your-tactic`, all
  `opponentPunishment` denial/`immediate`-register halves whose one-ply reply lands on a square with no
  board of its own but which IS separately offered as that half's ordinary load-bearing-cell alias.
  **Resolution:** read condition (b) literally as the plan's own "OR" wording allows — any offered alias
  whose spec cell is one of the half's own `.line` cells, not fork-pivot aliases specifically — under
  which all 63 records pass with 0 real violations measured corpus-wide, `eval-33` included (its
  `lostResource` half is deep/`forced_sequence` and gets its own `projectedDeep` board matching
  `lostResource.finalMovestring`, satisfying condition (a) directly). The `KNOWN_EXEMPTIONS` set naming
  `eval-33` is **kept in the test anyway, inert** — Design Decision 2 names it explicitly and forbids
  removing it without revisiting the deferred board-selection remedy question, so the code carries a
  now-unexercised safety net rather than a required exemption. The `TRANSFORMED_LEAVES` carve-out is
  unchanged, not reclassified; `eval-33`'s underlying board-selection question remains deferred out of
  the epic.
- **Status:** IMPLEMENTED, epic 059 (Deep-Reveal Remediation) T027/T028. Resolves OI-206. `test:fast`
  2041 / 0.

---

### D53 — Q1 pick (PROVISIONAL, not resolved by this epic): the harness stores BOTH the pre-guard `mechanism` and the post-guard `servedExplanation`

- **Decision:** `compute.mjs` exports `computeServedExplanation(...)` → `{ servedExplanation,
  guardDiagnostics }`; answers rows now carry both the raw `mechanism` (pre-guard) and
  `servedExplanation` (post-guard) fields, rather than one replacing the other. The v2 grading rubric
  (`GRADER_INSTRUCTIONS_v2.md`) instructs graders which field each axis is graded against, so the risk
  Q1 flags (a grader charging the pre-guard string) is mitigated at the dispatch layer, not by
  destroying the pre-guard data at storage time.
- **This is a PROVISIONAL answer to `[NEEDS CLARIFICATION: Q1]` — not resolved by this epic.** If a
  future `/clarify` pass picks a different storage shape (e.g. served-only to graders, pre-guard kept
  entirely out of the grading prompt), only the v2 rubric's dispatch wording changes; `FR-001`'s storage
  shape does not need to change to accommodate it.
- **Status:** IMPLEMENTED, epic 059 (Deep-Reveal Remediation) T003. `test:fast` 2041 / 0.

---

### D54 — Q2 pick (PROVISIONAL, not resolved by this epic): `better-col` gets a reserved lowest-priority slot outside the geometry cap, not a competing one

- **Decision:** `deriveRequiredSet` pushes `better-col` as a candidate into an already-free slot only —
  it never displaces a geometry group derived from the two halves. Measured corpus-wide (63 records):
  offered to 21/63; 42/63 remain at-cap and unresolved by design (Q2's PROVISIONAL choice deliberately
  does not compete with the FR-005 3-slot geometry cap).
- **This is a PROVISIONAL answer to `[NEEDS CLARIFICATION: Q2]` — not resolved by this epic.** A future
  session could instead widen the cap or reprioritize geometry vs. better-column; this decision commits
  to neither, only to "never displace, only fill a free slot."
- **Status:** IMPLEMENTED, epic 059 (Deep-Reveal Remediation) T026. Closes OI-187 (near-duplicate);
  leaves OI-205 PARTIALLY RESOLVED for the 42/63 residual. `test:fast` 2041 / 0.

---

### D55 — Q3 pick (PROVISIONAL, not resolved by this epic): a terminal `afterBest` board keeps the board, drops the tags, and gets one game-over sentence

- **Decision:** `reasonBoardSelect.mjs` keeps the terminal `afterBest` board (`shown: true`) but assigns
  it `tags: []` and `terminal: true`, instead of either hiding the board or leaving stale live-threat
  tags on an already-decided position. `causalLinks.mjs`'s L1 template renders a single completed,
  present-tense game-over sentence ("wins on the spot", "the game is over there") for this case, never
  future tense for a move that already ended the game.
- **This is a PROVISIONAL answer to `[NEEDS CLARIFICATION: Q3]` — not resolved by this epic.** An
  alternative (hide the board entirely, or synthesize a different visual treatment) was not built; this
  decision commits only to "keep the board, silence the tags, say it's over."
- **Status:** IMPLEMENTED, epic 059 (Deep-Reveal Remediation) T012. Resolves OI-203. `test:fast`
  2041 / 0.

---

### D56 — Q4 pick (PROVISIONAL, not resolved by this epic): drop the `replyHistogram` comparative rather than restate a rule the data contradicts

- **Decision:** `READING_KEY` was replaced by `readingKeyFor(replyHistogram)`, which omits the
  `replyHistogram.afterBest`/`afterPlayed` comparative bullet entirely when
  `replyHistogramSupportsStatedDirection` is false (i.e. `afterBest > afterPlayed`, contradicting the
  key's own "fewer means tougher" rule), instead of restating the rule regardless of whether the
  rendered numbers support it. Measured: 6/63 records now omit it; 57/63 still render it.
- **This is a PROVISIONAL answer to `[NEEDS CLARIFICATION: Q4]` — not resolved by this epic.** The
  smaller-surface choice (omit the sentence) was taken over the count-AND-score-aware fix, which needs
  reply scores and new prompt surface — out of scope here.
- **Status:** IMPLEMENTED, epic 059 (Deep-Reveal Remediation) T014. Resolves OI-202. `test:fast`
  2041 / 0.

---

### D57 — Q5 pick (PROVISIONAL, not resolved by this epic): drop the centrality invitation when the clause is suppressed; the guardrail's denial is untouched

- **Decision:** `GUARDRAIL_ADMISSIBLE_FRAMINGS_*` in `openingFrame.mjs` is split into 4 variants gated
  on `clause === ''` — when the centrality clause is suppressed, the admissible-framings line no longer
  invites "centrality" as something to explain through, while `GUARDRAIL_NO_CENTRALITY`'s existing
  denial ("do not say one column is more central") is left exactly as it was. Gap closure (T038/T039,
  batch 5b) found the same B3 contradiction class, previously un-gated, in
  `renderReasonModel.mjs`'s `OPENING_READING_KEY_*` constants and applied the identical fix there,
  gated on `openingFrame.centralityOffered`; three tests now assert it.
- **This is a PROVISIONAL answer to `[NEEDS CLARIFICATION: Q5]` — not resolved by this epic.**
- **Status:** IMPLEMENTED, epic 059 (Deep-Reveal Remediation) T029 (+ T038/T039 gap closure). Resolves
  OI-199. `test:fast` 2041 / 0.

---

### D58 — `reasonBoardTags.mjs` gates every vector-named overlay on the production detectors actually matching the board (corpus-wide consequence beyond the two records that motivated it)

- **Decision:** `reasonBoardTags.mjs`'s overlay tag placement is now gated on the production detectors
  actually matching the board being rendered, instead of asserting a pattern named by the feature
  vector regardless of whether it is board-true yet. `grainOf(...)` is newly exported to support this.
- **Measured, corpus-wide — a bigger effect than either motivating issue named:** this suppresses the
  overlay on **100% of the 13 corpus records** carrying a vector-named fork half — each half's pattern
  only becomes board-true on a LATER board, never the decision board it was attached to. OI-188 and
  OI-204 each cited one or two motivating records (`pin-L2-enabled-opponent`, `eval-33`); the fix's
  actual reach is the full 13-record set. This is a corpus-wide behavior change, not a two-record patch.
- **Status:** IMPLEMENTED, epic 059 (Deep-Reveal Remediation) T013 (+T016). Resolves OI-188, OI-204, and
  the second half of OI-195. `test:fast` 2041 / 0.

---

### D59 — Correction: T032/OI-189's remaining producer is `openingFrame.mjs`, not `causalLinks.mjs` — record this so a future reader doesn't search the wrong file

- **What happened:** T032's own task text (`specs/059-deep-reveal-remediation/tasks.md`) and the
  2026-08-25 graded run's report both identify the producer of the O2 lead-sentence term-slug leak as
  `causalLinks.mjs` ("causalLinks L7 prose" in the report). **Both citations are wrong.** The actual
  producer is `openingFrame.mjs`'s `nameTag` function — the O2 lead sentence — which used to name every
  opening as `` `the ${family}` `` regardless of whether `oc.id` was set; with no `id` to anchor it as a
  specific book-opening citation (the id-less "family only" defense fallback), the bare phrase read
  exactly like offerable KB jargon and the model wrapped it in an unoffered `[term:…]` tag. The report's
  own quoted evidence matches `openingFrame.mjs` verbatim, not `causalLinks.mjs`.
- **Fix:** `nameTag` now uses an indefinite article (`` `a ${oc.family}` ``) when `id` is null, keeping
  the same information while dropping the "the X" proper-noun-shaped signal that reads as a citable
  term.
- **Why this needs a D-log entry, not just a fixed test:** a future session grepping `causalLinks.mjs`
  for this defect, trusting either the task text or the graded report, will not find it there and may
  conclude the issue is unfixed or re-attempt the fix in the wrong file.
- **Status:** IMPLEMENTED, epic 059 (Deep-Reveal Remediation) T032. Closes OI-189 (both halves; see
  OI-189's own stale-status correction for the pre-epic display-path half). `test:fast` 2041 / 0.

---

### D49 addendum — Q8 pick (PROVISIONAL, not resolved by this epic): plain-English ordinal locator for sibling disambiguation, and the board-tag-pivot dedupe exception

- **Decision (Q8):** Sibling disambiguation (D49 rule 1, `disambiguateSiblingRoles`) uses a plain-
  English locator instead of raw coordinates. The D49 property (0/63 `(role, truthBoard)` collisions)
  still holds. Measured corpus-wide, all 63 records: raw coordinates in `zones.aliases[].role` went
  32/63 → 0/63.
- **AMENDED SAME DAY (2026-08-28) — the first locator wording shipped a board-FALSE claim.** The
  original pick ("the lower one" / "the higher one"; "the Nth one, counting from the bottom of the
  board") asserted a **height** relation `specSortKey` does not guarantee — its sort falls through to a
  column tiebreak and then to original array order, so two cells on the **same row** were labelled
  "lower" and "higher". Measured: **22 of 58** sibling groups carried a false height claim
  (the 2026-08-28 corpus this measurement was taken against; 59 is the count post-A7-wave — see D60
  §2, which split one group via an ownership-word change) (`eval-9`:
  `future:c3r5` → "the lower one", `future:c6r5` → "the higher one", both on row 5). The corpus test
  passed throughout because it asserted only that the two roles *differ* — an absence assertion, not a
  truth assertion.
- **SUPERSEDED by D60 §2.** The description below — a ladder of three rungs, taking the FIRST rung
  that yields unique labels for the whole group — is **stale**. D60 §2 made `locatorsForGroup` decide
  **per member** and added a **geometric (line) rung**, so one member that cannot take a geometric
  label no longer drags its sibling down to a claim-free ordinal. Read D60 §2 for the current
  behaviour; the paragraph below is kept for the historical record of what the Q8 pick originally was.
- **Implementation as first shipped (SUPERSEDED — see above): `locatorsForGroup()`**, a strategy ladder
  taking the first rung that yields
  unique labels, every rung true by construction: (1) `"the one in column N"`; (2)
  `"the lower/upper one in column N"`, and `"the <lowest|second-lowest|…> one in column N"` for 3+
  sharing a column; (3) `"the <first|second|…> one listed"` where two members share a representative
  cell and nothing spatial separates them. A height word may appear **only** on rung 2, where the
  members provably share a column and differ in row.
- **Rule this establishes for any future change here:** assert the *truth* of the locator, not merely
  that siblings differ. Removing a coordinate and introducing a falsehood is strictly worse in a
  grounding layer — ugly-but-true beats clean-but-false.
- **This is a PROVISIONAL answer to `[NEEDS CLARIFICATION: Q8]` — not resolved by this epic.**
- **Deliberate, documented exception found while implementing (OI-193's fix):** board-tag pivots
  (`forkPivotCell`'s board-tag-only offers, T025) do NOT participate in the cross-board `seen` dedupe
  every other alias family uses — only a same-board collision guard applies to them. Reason: on
  `eval-47`, both candidate pivot cells are immediate-threat cells on the OTHER near-term board, so
  applying the standard cross-board dedupe would leave the record with zero pivots, contradicting the
  reason this fix exists. This is a narrower guard than the rest of the alias system deliberately
  carries, not an oversight.
- **Status:** IMPLEMENTED, epic 059 (Deep-Reveal Remediation) T023 (Q8), T025 (dedupe exception).
  Resolves OI-193 (dedupe exception); Q8 itself is cross-cutting (T024, T030, T031, T033 all build on
  `roleText`/`disambiguateSiblingRoles`). `test:fast` 2041 / 0.

---

### D60 — A7 remediation wave 1: six render-layer changes, measured; and the fork geometry that is offered but not required is the next binding constraint

- **Decision (six changes, all render-layer; `computeReason` untouched):**
  1. **`roleText`'s `future` branch names its owner** (`zoneAnnotations.mjs`). It was the only cell-role
     branch with no ownership word, so `you-key-square` and `opp-key-square` rendered byte-identical
     roles. Now `a single square on ${possessive(owner)} four-in-a-row line — it matters later…`.
     28/63 records carried >=2 ownerless-future roles; 37.3% of real blunders (probe D3).
  2. **Sibling locators are line-aware and per-member** (`locatorsForGroup`). A multi-column window is
     located as `the line across columns N–M on row R` / `the diagonal line rising from column N on
     row R to column M on row S`, never `the one in column N`. `lineLocator` returns `null` — falling
     through to a claim-free ordinal — for any spec containing `|`, any spec that is not exactly 4
     contiguous cells, and any disjoint fork-cell group. The ladder decides **per member**, so one
     member that cannot take a geometric label no longer drags its sibling down. Measured corpus-wide:
     136 locator-prefixed aliases = 76 column-family / 50 line-family / 10 claim-free ordinal, and the
     10 ordinals are exactly the `|`-joined fork-lines specs.
  3. **The opening frame's deep-horizon tail is gated on `register === 'immediate'` only**
     (`openingFrame.mjs` `horizonTail` + a new `deepResourceGuardrail`). Of 30 opening-context records,
     15 are `forced_sequence` and 14 `parity` — for those "settles a long way out" is TRUE and D46's
     `GUARDRAIL_DEEP_RESOURCE` must stay attached; only `eval-44` is `immediate`. **Gating
     `forced_sequence` too would have stripped the eval-3 present-threat guardrail from 15 records.**
  4. **`immediate_threat`'s glossary description is board-attributed** (`describeTerm` + `firedBoards`).
     The slug fires from a tag on any near-term board, so "completes on the very next move" floated
     record-wide while being true only on a follow-up board. 19 of the 25 offering records now carry a
     qualifier. **`zones.terms` membership is byte-identical corpus-wide (I13): the fix is on the
     description, never the offer.**
  5. **A realized-pattern fork family is offered** (`zoneAnnotations.mjs`): a prong pair and a pivot,
     `truthBoard` derived exactly as the half-resource loop derives it, reusing the existing round-4
     collision abstention verbatim. Measured: 0 aliases evicted, 0 mutated corpus-wide.
     **Counts CORRECTED 2026-09-01 (final review), re-measured pre-wave vs. post-wave over all 63
     records:**
     - **Pivot: attempted for all 13 realized-fork records; 5 added, 3 already covered, 5 abstaining.**
       *Added* (new `opp-fork-pivot` on the `decision` board): `eval-43`, `eval-44`, `eval-46`,
       `pin-L3-no-causation`, `pin-branch-invariance-true-1`. *Already had one* from the pre-existing
       board-tag / tagged-half loops: `eval-47` (two), `eval-48`, `pin-L1-completes-your-tactic`.
       *Abstaining* on the collision guard (the pivot IS the other half's completing cell):
       `eval-42`, `eval-49`, `eval-50`, `pin-L2-enabled-opponent`, `pin-branch-invariance-false`.
       (The earlier "pivot for all 13 … 13 -> 8" was self-contradictory: 13 records are *attempted*,
       8 end up carrying a pivot, and only 5 of those 8 are this change's doing.)
     - **Prong pair: 4 of the 7** realized-fork halves with `cells.length >= 2` gain one —
       `eval-43`, `eval-44`, `pin-L2-enabled-opponent`, `pin-branch-invariance-false`. The other three
       (`eval-47`, `eval-48`, `pin-L1-completes-your-tactic`) are suppressed by the containment /
       `seen` guards, which is correct: an alias of the same owner already covers both prongs there.
  6. **`deriveRequiredSet` branches on the ROUTED `link.id`, threaded from all three call sites** —
     never re-derived from `kind` fields. On a **non-fork** L6 record both lines are required (owner
     decision 2026-09-01, "swap, keep cap 3"); on L7 the player's own counterplay displaces an
     opponent line, abstaining when the only victim would be a fork pivot (D48 rule 3).
     Changed exactly 3 of 63 records: `eval-3`, `eval-4`, `eval-30`.
  Plus: `causalLinks.mjs`'s L3/L5 frames gained a **mechanism** clause (below), and
  `frequency_probe.mjs`'s denominator now excludes by-design OMITs, with a shared `guardNotABlunder`
  helper raising a typed error from **both** `buildReasonRenderModel` and `buildRenderDecision`.

- **Why L3's new clause does not violate its own guardrail.** L3 fires only on `lose_to_faster_lose`
  and MUST NOT say the played move caused or enabled the pattern. The clause describes what the move
  **conceded** — `filled the square right beneath the one your opponent needs… so that square is now
  theirs to take on their very next turn`, or on the other branch `leaves the square your opponent
  needs in column N open on their very next turn`. Decisive fact: in the second branch the square was
  **already gravity-top before the played move**, in a column the player did not play — "leaves open"
  describes a state that persisted THROUGH the move. This is the timing register **D30 Fix C**
  explicitly sanctions ("`enabled_opponent` is a TIMING fact, NOT causation"). The `pOABB !== true`
  opener says the pattern `is already available in this position` — *available*, not *present*: on
  `eval-42` the `figure_7`'s own identifying cell is empty and the opponent must still play it.

- **Measured, 14 counterexample cases x 3 runs, gpt-5.4-mini, rubric v2, Opus-graded**
  (`fv_suff_answers_boards_smoke_a7wave1_2026-09-01T16-55-47Z`):
  **A7 run-fails 35/42 -> 22/42** (25/42 as first reported; 3 of those 25 were phantom failures from a
  contaminated smoke grade — see the correction note at the end of this entry); G1 15->10, G3 3->0,
  G5 8->2, G6 3->0; against, A6 2->4, G4 0->3.
  The **three deterministic A7a failures are resolved**: `eval-42` 3/3 -> 0/3 (full pass), `eval-28`
  3/3 -> 0/3 (full pass), `eval-37` 3/3 -> 1/3. `eval-47`'s unsatisfiable required handle is gone.
  **This refutes, for this change class, the standing prior that frame wording is inert.** The
  distinction to keep: the inert precedent concerned *asking* the model to use a handle it already had;
  this change *supplied a missing fact* (the mechanism) that no wording could have conjured.

- **What the measurement says is next, and it is not a guess.** `eval-44` (A7c 3/3, unmoved) and
  `pin-L2-enabled-opponent` (A7b 2/3 -> 3/3) were graded blind by different agents, and both name the
  same cause: **wave 1 OFFERS the realized fork's pivot and second prong but never REQUIRES them**,
  because `deriveRequiredSet`'s fork predicate reads `tacticTag`, which a `realized_pattern` half does
  not carry. Offering without requiring did not move the model. Requiring is the lever
  (`feedback_require_dont_suggest_llm_handles`, D45's own measurement: 0/12 under steering, 12/12 once
  required). **Extending the required-set derivation to realized-fork shapes is the highest-value item
  for wave 2.**

- **A cost of the owner's L6 decision, measured and surfaced rather than absorbed — and the mechanism
  first recorded here was WRONG. CORRECTED 2026-09-01 (final review), verified at source.** The
  original bullet claimed the both-lines swap filled all three slots on `eval-4` so `better-col`
  stopped being required, and that this caused the A6 regression. That is false in both halves:

  ```
  PRE-WAVE  eval-4 requiredSet: you-key-square, opp-key-square, you-key-line   (3 slots, at cap)
  POST-WAVE eval-4 requiredSet: you-key-line,   opp-key-line,   you-key-square (3 slots, at cap)
  better-col required: FALSE in BOTH
  ```

  - **The actual delta is one slot:** `opp-key-square` -> `opp-key-line` in slot 2. The set was at cap
    (3) *before* the wave too, and D54's `better-col` push is gated on `groups.length < 3` — already
    false pre-wave. **`better-col` was never required on this record, in either arm.**
  - **The pre-wave baseline graded `eval-4` A6 pass/pass/pass *with* `better-col` unrequired.**
    Requiring it is therefore demonstrably not necessary for A6 here, and its absence cannot be the
    regression's cause.
  - **The A6 regression is real** (pass/pass/pass -> fail/fail/pass, while A7b went 3/3 -> 2/3).
    **Its cause is UNIDENTIFIED.** `eval-4`'s prompt moved in at least three ways over the wave, and the
    evidence does not distinguish between them: (a) the slot-2 handle swap itself
    (`opp-key-square` -> `opp-key-line`); (b) the `you-key-square`/`opp-key-square` role-text rewrite
    (change 1 above: from "this single square matters later..." to "a single square on your/their
    four-in-a-row line -- it matters later..."); (c) the required-set slot reorder (slots 1 and 3
    traded places between the pre-wave and post-wave sets shown above). None of the three has been
    isolated.
  - **Cheapest next probe — an ablation on the actual diff, NOT a cap change:** grade `eval-4` with
    `opp-key-square` in slot 2 (holding slot order and role text otherwise fixed) against the current
    `opp-key-line` in slot 2. That isolates candidate (a). The role-text rewrite (b) and the slot
    reorder (c) would each need their own ablation arm — neither is tested by a `better-col` swap,
    since `better-col` did not move across the wave (see above: unrequired in both arms).
  - **The deferred owner question, re-framed.** A 4th L6 slot would **newly** require `better-col` on
    this record — a change *relative to the baseline*, not the restoration of something this wave
    removed. Decide it on its own merits, not as a regression fix. (The OWNER FLAG in
    `deriveRequiredSet` names the limit and the 9 fork-carrying L6 records excluded from the swap; that
    comment does **not** carry this error.)

- **Second deferred defect, now sized.** `frequency_probe.mjs` gains **D5 "dead fork offered as live"**
  — a fork offered on a near-term board where the opponent moves next and can occupy a prong —
  measured at **23/193 = 11.9% of real blunders**. `pin-L6-lost-win-and-gave-one` fails on exactly
  this, with a `c1r5` ownership collision (`opponentPunishment.entryCell` + `tie.sharedCells` under a
  `you-`-owned handle). **`eval-29` does not corroborate this.** The apparent second corroboration was
  an artifact of a contaminated smoke grade for `eval-29` that in fact graded `pin-L6`'s board — see the
  correction note at the end of this entry. Only `pin-L6-lost-win-and-gave-one` supports the D5 class.

- **Probe honesty.** The 36 blunders that "threw and produced no render decision" were **35x
  `win_to_slower_win` + 1x gate-`NotABlunder`** — by-design OMITs under I4, never defects. They are now
  excluded from the denominator (229 = 193 rendered + 36 omitted + 0 errors) and raise a typed
  `NotABlunder` error instead of `classifyCausalLink: no rule matched`. **Unreachable in production**:
  `computeMechanism` returns `{ notABlunder: true }` before either function is called. (`index.js`'s
  catch on this path is a bare HTTP 500 — the graceful branch is the earlier `result.notABlunder` one.)

- **Method note worth keeping.** Every plan defect this wave surfaced was **authored** code or a test
  body inside the plan contradicting the plan's own requirements — a snippet that dropped a branch
  while the same task demanded byte-identical output; a suggested gloss that could not match its own
  test regex; a test that could never go green; a proposed gate (`register === 'immediate'`) that would
  have produced four board-false claims; a suggested opener using `punishment`, a banned A5a term with
  a measured 88->76 regression behind it (D50 addendum). **Zero harvested values failed.** This is the
  "harvest fixtures, never invent them" rule with a wave's worth of evidence behind it.

- **Status:** IMPLEMENTED. `test:fast` **2056 -> 2092 pass / 0 fail / 282 suites, 0 eslint errors**.
  No commits made by the implementing agents (owner commits WIP himself). Related: D30, D43, D45, D46,
  D48, D49 + addendum, D50 + addendum, D54, D58; I2, I4, I12, I13; OI-182, OI-205.

- **Correction (2026-09-01, post-publication).** The original smoke grade for `eval-29` was
  contaminated: it graded `pin-L6-lost-win-and-gave-one`'s board under `eval-29`'s label. This inflated
  the reported A7 headline (35/42 -> 25/42, corrected to 35/42 -> 22/42), manufactured a second
  wave-1 regression that did not occur (`eval-29` actually improved, 1/3 failing -> 0/3 failing on a
  clean re-grade, triage `prompt_confusion`, a non-A7 axis), and manufactured a second corroboration of
  the D5 "dead fork offered as live" class that does not exist — only `pin-L6-lost-win-and-gave-one`
  supports D5. Lesson: two graders returning near-identical prose about the same cell for different
  records is a contamination signal, not a coincidence.

### D61 — the offered-but-not-required fork pivot, the board-false "completing" role, and the retry that discarded a better first attempt: three fixes, measured without a graded run

Executes the constraint D60's own title named as next. Three independent defects, all found by the
2026-09-01 v3+retry grading (`fv_suff_answers_boards_v3retry63_2026-09-01T20-55-54Z`) and all fixed
2026-09-02. Every number below is from a deterministic replay over the 63-record corpus — **no LLM
call and no grader was used to validate any of the three**, which is the point: these are properties
of pure functions, so grading them would have been strictly worse than asserting them.

**1. The require side could not see two of the three ways a pivot is offered.**
`zoneAnnotations.mjs` mints a `*-fork-pivot` alias from three places: the half-based path (`:449`,
gated on `FORK_TAGS.has(half.tacticTag)`), the board-tag path (`:341-364`), and the realized-pattern
path (`:509`, gated on `half.tag`). `deriveRequiredSet` (`renderReasonModel.mjs`) called only
`forkPivotCell(pruned[half])` — the first. The board-tag path's gate is the exact complement of the
half path's (`if (!hasTaggedFork)`), so it is *guaranteed* to mint pivots the require side cannot
derive. Measured before: 25 records offer a pivot, **10 never required it**. Critically this was NOT
slot starvation — in all 10 a slot was free when the pivot loop ran (`better-col` filled slot 3
afterwards, and `better-col` only fills a free slot). An earlier reading of this session called it
starvation and was wrong; the corrected diagnosis is a derivation/match failure.
**Fix**: when `forkPivotCell` abstains, fall back to the already-offered `${owner}-fork-pivot` alias
from `zones.aliases` (which `deriveRequiredSet` already receives and indexes), keyed by the exported
`halfOwner(half, side)`. FR-004 (`required ⊆ offered`) holds *by construction* — the fallback selects
an offered alias rather than deriving new geometry. Cap stays 3; the pivot beats `better-col`, which
is the priority the code already documents (`better-col` is a provisional 4th-priority fill that must
never displace a cell/pivot/line group). **After: 22/25 require their pivot.**
Three do not, and all three are correct or accepted: `eval-48` and `pin-L1-completes-your-tactic`
already require the same CELL under another handle (the no-duplicate-spec guard declines to name one
square twice), and `eval-36` is the single unanchored case — see OI-223.

**2. `cellKind` was derived from the horizon and never from the board.**
`zoneAnnotations.mjs:418` read `const cellKind = isFuture ? 'future' : 'major'`, and `:145` turned
`'major'` into *"a single square completing <owner> four-in-a-row line"*. Nothing checked that the
cell completes anything on the truthBoard the alias names. The comment on that line guards *timing*
("never over-claims immediacy"); the defect was *geometry*. This is the worst class of render defect
in this engine, because the model fails the no-fabrication axis **by complying** with the role it was
handed. Measured over the corpus (place the owner's disc on the cell, test for a new winning window):
**11 of 52 checkable `-key-square` roles were board-false → 0 after the fix.** Four grader-flagged
records (`eval-48/49/50`, `pin-branch-invariance-false`) plus five no grader caught
(`eval-42`, `eval-44`, `pin-L1`, `pin-L2`, and a second `eval-42` alias).
**Fix**: check the cell against the decision board via the production `checkWin`, downgrade only on
positive evidence, and abstain to the unchanged wording when the board is unavailable (I2).

**3. The retry replaced attempt 1 unconditionally, including when attempt 1 was better.**
`decideRetry` scores **attempt 1 only**; `mechanismExplainer.mjs` then overwrote `finalAttempt` with
the retried answer whatever it contained. Nothing re-checked the requirements the retry existed to
enforce. Measured over all 81 firings, guard-aware: retry is strongly net-positive, but 15 runs
regressed.
**Fix**: `scoreAttempt` (extracted from `decideRetry`, so the guard-aware `survivedSpecs` filter is
computed once and reused — I8) plus `chooseRetryWinner`, which prefers the retry and falls back to
attempt 1 only when attempt 1 is strictly better. The retry TRIGGER is unchanged. Mirrored into
`compute.mjs`'s `--retry` path, because harness/production alignment is that flag's whole purpose.
**Recovers 5 of 15.** The other 10 are a real tradeoff: the retry fixed the required set and lost the
better column, so neither attempt is fully compliant and the chooser prefers the required set.

**CORRECTION (2026-09-02, hours after this entry was written).** "Recovers 5 of 15" measured only one
direction and is not the whole effect. Replaying `chooseRetryWinner` over all 189 runs and scoring the
SERVED attempt shows the chooser also LOSES the better column on 3 runs — `eval-8|0`, `eval-34|2`,
`eval-35|0` — where the retry named the column but dropped required handles, so the chooser reverts to
an attempt 1 that names no column. Those three named the column before this change.
**Net: required-set +4, better-column −2** (11 runs lacked the column pre-chooser, 13 after).
`chooseRetryWinner` ranks required-set lexicographically above the column (`satisfied1 > satisfiedRetry`
wins outright; the column is consulted only on an exact tie) — a rule justified for the Category B
direction and never examined firing in reverse. This is a trade, not a pure win, and the full 13-run
population plus the widened decision are tracked in **OI-224**. Lesson, and it is the same one this
D-log has recorded before: a fix validated only on the cases that motivated it measures its benefit and
not its cost — score the FINAL SERVED artifact across the whole population, not the delta on the
motivating set.

**Deliberately NOT fixed: the `-fork-square` roles (4 records).** A fork's two winning squares do not
complete anything on the decision board — they only do so once the pivot is played. Downgrading them
the way (2) downgrades `-key-square` would be board-false in the opposite direction, denying the very
thing that makes a fork decisive. The honest fix is a horizon qualifier ("play here first, then this
square finishes it"), which is a copy decision, not a correctness fix. Tracked as OI-225.

**Validation method, stated because it generalizes.** `deriveRequiredSet` and `buildAnnotationOffer`
are pure over stored evidence, so both render fixes were verified by rebuilding all 63 render
decisions and asserting an invariant — exhaustive and deterministic, versus 3 sampled runs per board
carrying ±20-24% grader disagreement. The role-truth probe deliberately used `winningWindows`
(`lib/boardUtils.mjs`) while the fix uses `checkWin` (`classifier.js`): different helpers reaching the
same verdict, so the check is not a fixture agreeing with its own author. `test:fast` 2102 -> 2118, green.

### D62 — retry behaviour is now observable in `explanation_cache`, because D61's chooser made "which attempt did we serve?" a question with a real answer

Before D61 the answer was always "the retry", so there was nothing to record. D61 made the served
attempt a *decision* — and its CORRECTION block shows that decision is a trade (required-set +4,
better-column −2), measured on a 63-record corpus by replay. Owner request, 2026-09-02: make it
visible in production data instead, so the OI-224 objective question is settled against real traffic
rather than a corpus.

Migration 066 adds three additive columns to `public.explanation_cache`, written at the deep-reveal
cache-miss insert (`server/index.js` ~:1449): `retry_fired`, `retry_reason` (jsonb —
`{missingHandles, missingBetterCol}`), `served_attempt` (smallint). `computeMechanism` gained
`contentRetryFired` and `missingBetterCol` to feed them. The combination the owner specifically asked
for — *retried, then kept the first answer anyway* — is `retry_fired = true AND served_attempt = 1`,
which is exactly the class D61 introduced.

Three decisions worth not relitigating:

- **`served_attempt` is `smallint` 1/2, not text.** Migration 065 already added
  `deep_reveal_failures.served_attempt smallint` for the same concept. Two tables describing one event
  must not disagree on representation, so the in-memory `'attempt1'`/`'retry'` string is mapped at the
  DB boundary rather than a second convention being introduced.
- **`missingHandles` was NOT widened to carry the better-column miss.** OI-181 documents why: it would
  change the meaning of an existing logged field that other queries and the spec-058 acceptance evidence
  read. `missingBetterCol` is a distinct field, which is the resolution OI-181's own "If picked up"
  paragraph prescribes.
- **The LLM-error retry is excluded.** It is a different trigger with no content reason to log; folding
  it in would make `retry_fired` mean two things. Stated in `db-schema.md` so the exclusion is not
  rediscovered as a bug.

**Read the data with one caveat, recorded in `db-schema.md`**: the cache row is written only on a cache
MISS, so these columns describe *generation events*, not positions — a cached position never re-records,
and the table is therefore not a time series. If trend-across-deploys is ever wanted, that needs an
append-only event table; it was deliberately not built.

**Deploy ordering is load-bearing and its failure is silent**: PostgREST drops unknown columns from a
write and returns success, so shipping the code before migration 066 records nothing while appearing to
work. See the 2026-09-02 entry in `docs/deployment_steps.md`.

### D63 — the better column is ground truth, so state it deterministically; and a fork's prongs get a horizon qualifier, not a downgrade

Closes OI-224 and OI-225, the two items D61 deferred as "decisions with tradeoffs, not defects with
a right answer". Both were settled by deterministic replay over the 63-record / 189-run v3retry63
corpus — **no LLM call and no grader**, the same method D61's "Validation method" note describes.

**1. OI-224: re-ranking the chooser is measurably dominated; a post-repair dissolves the tradeoff.**

D61's CORRECTION block established the population: 13 runs serve text that never names the better
column — 10 where the retry traded the column away for required handles, and 3 (`eval-8|0`,
`eval-34|2`, `eval-35|0`) where `chooseRetryWinner` reverted to an attempt 1 that names none. Before
acting, all five plausible re-rankings were replayed over the same 189 runs, scoring the SERVED
attempt on BOTH axes:

| chooser rule | serves no better column | runs missing >=1 required group | required groups missed |
|---|---|---|---|
| current (required-set lexicographic) | 13 | 14 | 15 |
| always-retry (pre-D61) | 11 | 17 | 21 |
| column-first lexicographic | 0 | 26 | 38 |
| total-misses, column weighted 1 | 12 | 15 | 16 |
| total-misses, column weighted 2 | 5 | 21 | 25 |
| fully-compliant-first, else current | 13 | 14 | 15 |

Every rule that cuts the column count costs strictly more required-set than it buys. **Option (e)
— an explicit, tunable ranking — is not merely unattractive, it is dominated**, and that is the
finding, not a preference. Option (b) is unavailable (prompt wording measured INERT for this
instruction class, 0/12); option (c) cannot be evaluated without an LLM run.

The resolution is option (d): the better column is **ground truth already in the prompt verbatim**
(`renderDecision`'s "- Better move: column N (lands at cNrM)"), so it can be stated with no model
involved at all. `ensureBetterColumnMention` (`retryDecision.mjs`) appends one localized sentence to
the CHOSEN attempt's mechanism when `mentionsBetterColumn` says the column is absent. Replayed over
the same 189 runs with the REAL shipped function: **13 repaired, no-better-column 13 -> 0,
required-set unchanged at 14.** It dissolves the tradeoff rather than picking a side, which is exactly
why it was preferred over re-ranking.

`decideRetry`'s trigger and `chooseRetryWinner`'s ranking are **unchanged** — the repair runs strictly
after both, in `computeMechanism` (production, `mechanismExplainer.mjs`) and behind `--retry` in
`compute.mjs` (harness). The harness gate is a deliberate divergence: a run without `--retry` is the
single-attempt baseline other measurements compare against, and repairing those rows would move a
baseline.

Two things deliberately NOT done: the sentence is plain prose, not a `[zone:better-col]` highlight
(`mentionsBetterColumn` tests the prose the reader sees — a bare zone tag is explicitly not a
mention, so a tag would not satisfy the check that declared the mention missing); and
`better_col_repaired` is **not** persisted — D62's `explanation_cache` columns stay closed.

**A6 preservation (owner decision, Task 4b).** `grade_mechanical.mjs`'s A6 axis reads
`answer.mechanism` to measure whether the served text names the better column. Left untouched, the
harness repair would overwrite exactly that field, so A6 would read a constant `pass` on every
`--retry` run and silently stop measuring anything — the repair would have destroyed the axis it was
meant to fix. `compute.mjs --retry` additionally emits `mechanism_pre_repair` (the mechanism as the
model produced it, before the repair; `null` when no repair fired), and `grade_mechanical.mjs`'s A6
now reads `row.mechanism_pre_repair ?? a.mechanism` — the pre-repair text when a repair happened,
falling back to the unchanged `answer.mechanism` otherwise (which reproduces the exact old behavior
on every non-repaired and pre-D63 row). The operator is `??`, deliberately not `||`: an empty-string
`mechanism_pre_repair` is falsy under `||` and would fall through to the repaired `a.mechanism`,
silently grading the repaired text instead of the model's own. A6 therefore keeps measuring whether
the MODEL named the column unaided, and stays comparable with the pre-D63 189-run baseline.

**Accepted, unmeasured cost**: one appended sentence is not coach voice at its best. That cost cannot
be quantified without a graded eval run, which was explicitly out of scope — no such run was
performed for this decision. Recorded here so it is a known trade, not a discovery.

**Comparability beyond A6 (I2).** Only A6 was protected from the repair; it was not. The appended
sentence lands in both `answer.mechanism` and `servedExplanation` on the 13 repaired rows (`13/189`,
~7%), and every judgment axis (A3/A4/A5/A7/G1-G6) grades those same fields — so on a `--retry` run
those axes are grading text that a pre-D63 run never produced. They are not strictly comparable to a
pre-D63 `--retry` run without segmenting or excluding the `better_col_repaired: true` rows.

**2. OI-225: a fork's prongs take a horizon qualifier.**

`roleText` gains a `fork-square` kind: *"a square that will finish <owner>
four-in-a-row — it completes nothing yet; it only becomes a winning square once the fork is set up"*.
Applying D61's `-key-square` downgrade (`key-cell`, "it does not complete the line on this board")
would have been board-false in the OTHER direction, denying exactly what makes a fork decisive.

No cardinality claim ("two squares") is made, by owner decision — a fork half is not always a pair.
Measured over the corpus: realized fork halves (`half.cells`) split `cells.length === 1` -> 6 (all
`register: 'immediate'`) and `=== 2` -> 7; half-resource fork halves (`forkCells`) split
`forkCells.length === 1` -> 11 and `=== 2` -> 9 (all `forced_sequence`). A "two squares" wording would
have been board-false for every single-cell half — the same over-claim class T031/OI-180 already fixed
for the sibling `double` role (`zoneAnnotations.mjs:109-115`). Single-cell realized fork halves are not
an edge case: `zoneAnnotations.mjs:613` ("6 of the 10 realized-fork records carry a single-cell
`cells`, which is a realized pattern, not a prong pair") and `:649` ("Offered for every realized
fork half, single-cell ones included — there the cell IS the pattern") show they are deliberately
offered by the same loop that offers the pair.

Both `-fork-square` emitters route to it. All 4 measured defects came from the realized-pattern
emitter (`zoneAnnotations.mjs:656`, the `half.cells` loop) — every one of the four records has an
`opponentPunishment` with `kind: 'realized_pattern'`, `tag: 'double_threat'`, `register: 'immediate'`
and a two-element `cells` array, so the half-resource emitter (`zoneAnnotations.mjs:520`) never fired
for them — it has ZERO near-term `-fork-square` instances in this corpus. It was fixed anyway: same
defect class, and I12 says fix the case-space, not the motivating instance.

The 9 `future:` fork-squares are unchanged (owner decision) — they already carry the "matters later"
contrast, were board-true, and changing them would add vocabulary the model echoes for no measured
defect.

Corpus-wide role-truth probe, rebuilding all 63 render decisions and checking every alias whose role
claims "completing <owner> four-in-a-row line": **`-fork-square` 4 violations of 4 checked -> 0 of 4;
`-major` 0 violations of 52 checked, unchanged.** A regression on that second line would be a
correctness regression, not a wording one, which is why the probe checks it too. Counting the family
by HANDLE rather than by role text tells the same story a different way: before `{ future: 9,
horizon: 0, completing: 4 }`, after `{ future: 9, horizon: 4, completing: 0 }`.

**A labelling note worth recording**, because it cost time: D61 and OI-225 both call the 52 checkable
roles "`-key-square` roles". They are not — after D61 no `-key-square` alias carries the "completing"
wording at all (53 are `future`, 11 are the `key-cell` downgrades). The 52 sit under the `-major`
handle family, from the structural loop. The numbers reproduce exactly; only the family label in the
prose was loose.

**Validation method** (unchanged from D61, and it generalizes): `deriveRequiredSet`,
`buildAnnotationOffer`, `scoreAttempt` and `chooseRetryWinner` are pure over stored evidence, so both
issues were settled by asserting invariants over the WHOLE corpus rather than sampling runs against
±20-24% grader disagreement. The role-truth probe used `winningWindows` (`lib/boardUtils.mjs`) while
the committed test uses `checkWin` (`classifier.js`): two independent helpers reaching the same
verdict, so neither is a fixture agreeing with its own author.

`test:fast` 2123 -> 2136, green.

### D64 — the fork pivot's "both winning squares" was the third cardinality over-claim; and the annotation gate's strip is the mechanism that serves OI-226's false sentence

Three issues, one session, 2026-09-03, all settled by deterministic replay over stored evidence —
**no LLM call and no grader was used for any of them**, the method D61 and D63 both describe.

**1. OI-227: `-fork-pivot` asserted a count the board does not support. RESOLVED.**

`roleText`'s two pivot branches (`fork-pivot`, `fork-pivot-now`) read *"the square <owner> plays to
CREATE the fork — the move that makes **both winning squares** live at once"*, unconditionally.
Measured over the 63-record v3retry63 corpus through the production `buildAnnotationOffer`: **25
aliases carried the phrase; 20 were decidable; 11 of those 20 left exactly ONE gravity-top winning
square** after the pivot lands (`eval-7`, `eval-8`, `eval-15`, `eval-16`, `eval-26`, `eval-30`,
`eval-43`, `eval-46`, `pin-L3-no-causation`, `pin-L5-deep-fork`, `pin-L7-practical-swindle`). The
remaining 5 are undecidable — the pivot cell is already occupied, or is not gravity-top, on the board
the alias names — and are excluded from both numerators and denominators rather than scored as passes.

*Gravity-top is the whole discriminator.* "Live at once" means **playable** at once; completing cells
stacked in one column are not two live squares. Three hand-rolled denominators each produced a
confident wrong number first: `forkCells.length` (inapplicable — several fork halves carry no
`forkCells` at all, and `boardTagPivotCell` mints pivots that never read it; it also false-flagged
`eval-30`), a plain empty-completing-cell count (reported **0** violations and nearly retracted the
issue), and a first draft of the audit harness that dropped a floating disc on a non-gravity-top cell
(reported a false "0 live squares" on `pin-branch-invariance-true-1`, which is undecidable, not
board-false). I12 in miniature.

**Fix**, following T031/OI-180 (`double`) and D63/OI-225 (`fork-square`) exactly: remove the count,
keep everything else. The phrase becomes *"the move that makes **a** winning square live at once"*.
"to CREATE the fork" still carries the decisiveness the **9** genuinely-multi-square cases need
(`eval-13, eval-17, eval-18, eval-19, eval-20, eval-22, eval-23, eval-25, eval-44`), and "at once"
still rules out "eventually". Deriving the count from the board was considered and is **not
available**: 8 of the 11 sit on a `projectedDeep` truthBoard, for which `boardSelectionDecisions`
hands `roleText` no movestring — abstaining to count-free wording is the I2-correct move.

**Measurement, unchanged audit harness, all 11 claim axes** (416 claims checked):
`C4_bothLive` 20 checked / 11 violations **→ 0 checked / 0 violations**; every other axis byte-identical
(`C1` 52/0, `C2` 11/0, `C3` 22/0, `C5` 9/0, `C6` 20/0, `C7` 4/0, `C8` 150/0, `C9` 63/0, `C9b` 63/0,
`C10` 2/0). **`C4`'s `checked` dropping to 0 is stated loudly and is not the fix hiding**: the harness
detects that axis by grepping for the false phrase itself, so removing the phrase necessarily empties
that row — exactly as D63's `-fork-square` fix moved its family out of `C1` and into the new `C7` row.
The successor claim is measured, not dropped: adding a `C4b_pivotMakesLive` row (`makes a winning
square live at once`, threshold ≥1 live square) gives **20 checked / 0 violations / 5 skipped** — the
identical denominator the false claim had. Total violations 11 → 0.

Four existing assertions pinned the removed wording via `/creates|makes both/i`
(`zoneAnnotations.test.mjs`, three unit + one `pin-L5-deep-fork` corpus test). They were retargeted to
`/CREATE the fork/i` — the surviving, board-true half of the same intent — rather than deleted; a test
that locks in a board-false claim is part of the bug. The new corpus-wide guard in
`zoneAnnotations.test.mjs` asserts **both** directions (a "both" claim needs ≥2 live squares, a "a
winning square" claim needs ≥1), so it cannot go green by the claim becoming unmeasurable. It was
confirmed RED against the pre-fix wording, listing exactly the 11 named aliases. `test:fast` 2141 → 2142, green.

**2. OI-226: root cause located, and it is NOT the offer set. Still open — the fix belongs to OI-228.**

Four board-checkable hypotheses about the offered handle set were built and each **fails to
discriminate**, measured over all 25 `-fork-pivot` aliases:

| hypothesis | fires on | verdict |
|---|---|---|
| a competing causal single-cell handle on the SAME truthBoard | 4 of 25 records | excludes `eval-44`, the only confirmed hit |
| a fork-causal handle whose cell set EXCLUDES the pivot | 15 of 24 | includes both observed-CLEAN records (`eval-18`, `eval-47`); excludes `pin-L7` |
| the pivot cell named in NO other alias on its board | 9 of 25 | excludes `eval-44` |
| `fork-pivot-played`'s wording (a grader's hypothesis) | offered on exactly **2** records (`eval-36`, `eval-47`) | **refuted at source** — neither symptomatic record is offered it at all, and `eval-47` graded clean for OI-226 on all 3 runs |

What the evidence does show, read at the `raw` layer (not `answer.mechanism`, which is
post-`processAnnotations`): on **all three** `eval-44` runs the model selects the **correct** handle,
`[zone:opp-fork-pivot]`, and fills the span with the **wrong square's** text — verbatim run 0:
`you let your opponent take [zone:opp-fork-pivot]c3r1[/zone:opp-fork-pivot]`. So OI-226's confirmed
instance is a **span-content** error, not a handle-selection error, and no change to which handles are
offered would have prevented it.

**The gate already caught it and threw the catch away.** On `eval-44` runs 0 and 2 the raw coordinate
inside that span tripped `P6:raw_coordinate:c6r1`, `stripFailingZoneSpans` removed the tag, and the
false prose "you let your opponent take column 3" was served. OI-226's remedy is therefore OI-228's
disposition, not a render-offer change. Ninety percent of the remaining OI-226 case space is still
unobserved and sizing it needs model output — out of scope here, and recorded as such.

**3. OI-228: measured corpus-wide for the first time, and the retry option is dominated.**

Replaying the stored `guardDiagnostics` of all **222** runs across the three v3retry63 answer files
(pure read, no LLM):

- **9 runs (4.1%)** had at least one span stripped. Codes: `P6` ×6, `P2` ×2, `P5strong` ×1.
- **4 of those 9 leave a board-false sentence in the served text** — `eval-44` runs 0 and 2,
  `pin-L7-practical-swindle` run 1, `eval-47` run 1. That is **4 of 222 runs, 1.8%**. The other 5
  survive as board-TRUE sentences whose tag was merely mis-anchored (`pin-L1` run 2's "the key square
  at column 2" names a genuinely offered `you-immediate = c2r1`), so a blanket sentence-drop
  over-deletes on 5 of 9.
- **1 of the 9 stripped sentences carries the better-column mention** (`pin-L1` run 2: *"You should
  have played column 3, …"*). `ensureBetterColumnMention` runs in `computeMechanism`, strictly BEFORE
  `guardExplainMoveLlmPayload`, so a sentence-drop there **cannot be re-repaired** — this would
  reopen the exact hole D63/OI-224 closed. `mentionsBetterColumn`'s own comment already names this
  interaction as accepted residual imprecision; option (a) would promote it from rare to systematic.
- **8 of the 9 had already fired the retry.** The retry budget is exactly one and shared, so
  **option (b) is dominated on measurement, not on preference**: on 8 of 9 occurrences there is no
  retry left to spend, and widening the budget is a separate decision D61/D63 deliberately did not take.

**Recommendation (not yet implemented): option (a), narrowed, with a better-column carve-out.**
Drop the containing SENTENCE only when the stripped span's surviving prose names a column that
contradicts the span's own spec — the `P2:col_mismatch` shape and the `P6:raw_coordinate` shape whose
coordinate sits in a different column. Reuse `mentionsBetterColumn` (I8) as a carve-out: if that
sentence names the better column, strip the tag only, as today. Replayed over the same 222 runs this
fires on exactly the **4 board-false** runs, leaves the 5 board-true strips untouched, and the
carve-out protects `pin-L1` run 2. **PENDING — question for the owner:** whether a mid-paragraph
sentence deletion reads acceptably in coach voice cannot be settled without a graded run, and none was
performed. That is the only unmeasured term in the recommendation.
