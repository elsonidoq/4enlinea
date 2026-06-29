# Reason-field DECISION LOG

> **Append-only.** Resolved decisions about the blunder-`reason` engine, each with its rationale, so
> they are not re-litigated or re-explained every session. If a decision is reversed, **append a new
> entry that supersedes it** — do not edit history in place.
>
> Non-negotiable principles live in [`reason-INVARIANTS.md`](./reason-INVARIANTS.md). The taxonomy is
> [`my_pseudocode.md`](./my_pseudocode.md); the engine is
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
- **Decision:** `my_pseudocode.md` + `blunder-reason-evidence.md` are the sole source of truth. The
  5-kind `blunder-reason-field-epic.md` and 5-grain `unified-blunder-reason-epic.md` designs are
  abandoned.
- **Rationale:** Both prior designs drifted into combinatorial-explosion fears and discriminated-union
  complexity. The conceptual `(bestScore, playedScore)` taxonomy is simpler and provably bounded.
- **Status:** LOCKED. Quarantined files are historical only (INVARIANTS I11).
- **Source:** restart prompt (2026-06-29); `reason_audit/_QUARANTINE.md`.

### D3 — `win_to_slower_win` is out of scope (NotABlunder)
- **Decision:** `bestScore>0 && playedScore>0` → raise `NotABlunder`; no reason computed.
- **Rationale:** Explaining "you'd have won faster" is hard to compute and low value; focus on the
  sub-optimal cases that actually cost an outcome.
- **Status:** LOCKED.
- **Source:** `my_pseudocode.md`.

### D4 — `lose_to_faster_lose` is a blunder only if a practical chance existed
- **Decision:** When both scores are `<0`, the move is a blunder only if the best move preserved a
  reachable opponent-mistake that flips to ≥0 (the gate). Otherwise `NotABlunder`.
- **Rationale:** If you are lost either way with zero counterplay, losing one move later is not a
  mistake worth teaching — "better to lose fast." A position is *not* a lost cause if an opponent
  mistake could still be exploited; that hope is the lesson.
- **Status:** LOCKED. Gate is sound-for-BLUNDER, incomplete-for-NotABlunder (INVARIANTS I7).
- **Source:** `my_pseudocode.md`; evidence doc §5.

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
- **Decision:** Engine is `reason_audit/reasonEngine.mjs` (`computeReason` + CLI); fixture built by
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
