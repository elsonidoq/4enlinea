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
- **Source:** owner directive (2026-06-29); memory `feedback_fv_grounding_correctness_over_speed`.

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
- **Status:** ACCEPTED known-gap (owner decision 2026-07-02). No code change. The caps in `REASON_CONFIG` stand. `blunder-reason-evidence.md` §10 and memory `project_reason_gate_width_cap_bug` reflect this as accepted, not open.
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
