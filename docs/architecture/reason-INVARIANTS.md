# Reason-field INVARIANTS

> **Read this before touching the blunder-`reason` engine — every time, fresh context or not.**
>
> This file is the *constitution* for the `reason` field (the structured feature-vector that an LLM
> turns into "why this move was a blunder"). It exists because the same principles were re-derived,
> re-typed, and occasionally violated across many sessions. These are **non-negotiable** unless this
> file is explicitly amended.
>
> Authoritative companions: [`reason-case-taxonomy.md`](./reason-case-taxonomy.md) (the case taxonomy) and
> [`blunder-reason-evidence.md`](./blunder-reason-evidence.md) (the two-halves evidence engine, the
> validated boards, the implementation map). Resolved choices + their rationale live in
> [`reason-DECISIONS.md`](./reason-DECISIONS.md).

---

## I0. Correctness over optimization — and the engine ALWAYS finds something relevant

**This is the top invariant. It overrides every other consideration in this file when they conflict.**

- The goal is a reason that is **correct 100% of the time** and that **always surfaces something
  relevant for the player to learn from.** Producing a sound, useful reason is the acceptance bar.
  Latency is not.
- **Never** prune search depth, skip a search pass, lower a bound, cache-around, or approximate a
  signal *in order to save solver calls* — unless the cheaper path is **provably equivalent** to the
  full one. If you are unsure whether it is equivalent, it is not: do the full search.
- Extra c4solver calls are **acceptable and expected.** A "this costs N more queries" objection is
  **not** a reason to weaken the algorithm. The engine is `O(plies)` per blunder precisely because
  it can afford to be exact (see evidence doc §1); spend that budget.
- If correctness and performance genuinely trade off, **choose correctness and defer optimization to
  a later, separate iteration** — and only after soundness is proven against the fixture.
- This has been conceded-then-retracted before. It is now locked: agents must not relitigate it, and
  must not raise solver-call cost as a design objection. See `reason-DECISIONS.md` D1.

### I0b. Engine soundness precedes render — a render constraint must never narrow what the engine stores

The same principle on a second axis (owner directive, 2026-07-02). The engine's job is to store the
**soundest, most complete** evidence; deciding *what* and *how* to feed the LLM — prompt pruning, not
printing a 25-ply line — is a **separate downstream preprocessing step** (`toNarratorVector`; see
`reason-DECISIONS.md` D21). If a rendering concern is allowed to decide what the engine *stores*, you
throw away sound evidence you cannot get back.

Two corollaries, both realized by D26:

- **Do not restrict an engine mechanism to "short/tactical" cases just because the deep case would be
  awkward to render.** The occupation-witness denial applies to **all** non-fork `win_to_draw` boards,
  deep parity wins included — not only `immediate` / `forced_sequence` ones.
- **Do not null or drop a field to match a render rule.** D26's `denial` halves keep the **full** `line`
  even at `parity` register, deliberately bypassing `renderHalf`'s null-for-parity rule. On such paths
  `register` becomes a *label*, not a data gate.

Where a value like `register` is derived from `fwd` on a non-walked half, treat it as descriptive
metadata; the load-bearing evidence (`line`, `finalMovestring`, witness cell) is stored regardless.

## I1. The vector is the artifact — the LLM narrates, it does not reason

Every fact needed to justify "this move is worse than the best move" must be **present in, or
mechanically derivable from, the feature vector**. The LLM is a narrator that restates fields. If
understanding a case requires re-reading the raw board or inferring something the fields do not
carry, that is a **defect in the vector**, not an acceptable reliance on model intelligence. Giving
the model the raw movestring makes it fabricate; the engineered fields must carry the reason.

## I2. Never fabricate — every clause is solver-grounded

Any clause not backed by a solver/search check is a defect: a named cell that is blockable or
non-canonical, a parity controller derived from a count rather than a detector, a claim of a winning
line that does not complete under optimal defense. A reason that merely "reads plausibly" is not
verified. When in doubt, **abstain on that clause** (honest "couldn't tell") rather than invent —
an honest abstention is a feature-gap signal, not a fabrication.

## I3. Every blunder reason exhibits concrete connect-4 line(s) — the two-halves engine

A blunder is explained by the **two halves** (evidence doc §2), kept in **separate fields**:

- **(a) lost resource** — what the *best* move preserved (one bounded optimal-line walk from
  `board + best`).
- **(b) opponent punishment** — how the *played* move loses or fails to win (one opponent-optimal
  walk from `board + played`).

The unifying mechanism: you explain *why one move is better* by exhibiting the winning/losing
connect-4 line in **both** branches and comparing timing/availability. **Do not merge the two
halves** — the half-(a) lost-resource cell is *not* the half-(b) opponent completing cell (validated:
`c2r3` vs `c7r6` in `draw_to_lose`). Merging fabricates.

## I4. No OMIT except genuine non-blunders and solver failure

OMIT / "no reason" is reserved for:
- `win_to_slower_win` (`bestScore>0 && playedScore>0`) — out of scope, raises `NotABlunder`.
- `lose_to_faster_lose` with **no practical chance** — `NotABlunder` when the gate finds no swindle
  within its depth bound (see I7; D23 made this a uniform depth-15 practical-chance policy). "Lost
  anyway, no counterplay" is not a blunder.
- Solver error / timeout.

Every other case must produce a sound reason. A case that falls through the taxonomy, or routes to a
payload whose only honest content would be a fabrication, is a **design defect to surface**, never an
acceptable gap.

## I5. The case taxonomy is keyed on `(bestScore, playedScore)` signs

The five cases (`win_to_slower_win`, `win_to_draw`, `win_to_lose`, `draw_to_lose`,
`lose_to_faster_lose`) are defined by the sign comparison in `reason-case-taxonomy.md`. **Implementation
caveat:** `win_to_slower_win` is gated on `bestScore>0 && playedScore>0` (both strictly positive).
A naive `bestScore*playedScore>0` is **wrong** — it also matches both-negative and would swallow `lose_to_faster_lose`.

## I6. Search is bounded, but the bound is DEPTH — never a budget heuristic

Search must terminate (depth cap, branch cap, dedup). But: the **only** thing that constrains the
analysis is **depth**. A "budget" parameter must **not** drive lookahead exploration or silently cut
off a relevant line. Bounded ≠ cheap: see I0 — within the depth bound, run the full search. The
`lose_to_faster_lose` gate is the only real branching search, and it is tightly bounded (evidence
doc §5).

## I7. The `lose_to_faster_lose` gate soundness is asymmetric — respect it

The gate is **sound for declaring BLUNDER** (every witness is solver-verified) but **not complete for
NotABlunder** (a swindle deeper than the depth bound is missed). Per **D23** the gate is one uniform
depth-bounded search (`gateMaxPlies=15`) and `NotABlunder` is a **practical-chance policy** ("no
practical swindle within 15 plies"), not an exhaustive-subtree proof — a single greedy PV cannot prove
swindle-absence, so completeness was never cheaply attainable and is not the goal. The asymmetry itself
is unchanged; only made uniform (the old per-board `exhaustive` claim is retired). Still **grade** the
chance (shallower `oppPlies` = more practical; wider `devCols` = more instructive) — don't treat the
binary gate as the whole story.

## I8. Reuse existing detectors as evidence — do not reinvent

`classifyPattern` and `tagBlunder` (`connect-four/server/classifier.js`) and the z-threat / claimeven
/ Allis odd-even detectors are **reusable evidence sources** — cite them. Deep zugzwang wins are
named by their **parity-aligned group of 4 + odd/even completing cell** (via z-threat / Allis
detection), **not** by major-threat materialization (evidence doc §7). This is the single mechanism
that collapses the zugzwang registers — prefer it over per-case fallbacks (Occam, I9).

## I9. One unifying mechanism over per-case special-casing (Occam)

Prefer a single principled mechanism that generalizes from examples over enumerating special cases.
Overfitting the current 66-case fixture is an **accepted, bounded risk** (see DECISIONS) — but reach
for the general rule first. Memory: `feedback_occam_principled_extrapolation`.

## I10. Always observe boards with tools; respect coordinate conventions

Never reason about a movestring blind — run `./visualize_board.sh <movestring>` (repo root).
Coordinates are **0-indexed internally** (row 0 = bottom, col 0 = left); the engine **emits `cNrM`
1-indexed** cells. The only translation boundaries are frontend display and the c4solver wrapper.
Solver score is from the side-to-move: `>0` win, `0` draw, `<0` lose; `|score|` ≈ how soon. `-1000`
is the INVALID_MOVE sentinel.

## I11. One frozen design — do not restart, do not resurrect the quarantine

`reason-case-taxonomy.md` + `blunder-reason-evidence.md` are the **sole** source of truth. The
`blunder-reason-field-epic.md`, `unified-blunder-reason-epic.md`,
`feature-vector-reason-algorithm.md`, and the old `reason_audit/` `SUPERSEDED/ABANDONED` cluster were
**deleted 2026-06-30** — do not resurrect them; ignore any lingering references in search or
injected memory. (The live engine lives in `server/scripts/reason_engine/`.) If you believe the core taxonomy must change, **stop and ask** — amend this design,
do not fork a parallel one.

## I12. Validate a rule against its case-space, not its motivating example

A rule that classifies, thresholds, or stops — a taxonomy boundary, a register cutoff, a stop
condition, a gate — is **not** validated by the example that motivated it. Before claiming it
generalizes:

1. **Enumerate the case-space.** When the rule reuses a detector, read that detector's **full**
   return contract — every Case/branch — not the branch you have in mind.
2. **Probe a detectable property only through its production detector — never a hand-rolled proxy,
   not even in a throwaway verification script.** A hand-rolled proxy silently narrows the
   case-space and yields false validation. *(The figure-7 miss: a `gravityTopWins` proxy modeled
   `double_threat` Case A and could not express the stacked Case B, so Case B was never confronted;
   reusing `detectDoubleThreat` would have forced both cases into view.)* This is **why I8 reuse is a
   correctness rule, not a tidiness one.**
3. **Build a deliberate counterexample per case and run it.** A board that confirms the motivating
   case is not evidence the rule generalizes.
4. If a case cannot yet be tested, **mark the rule provisional** — never assert coverage you did not
   test.

This is the enforced, local form of `feedback_eval_design_methodology` (counterexamples, not
averages) and `feedback_process_and_agent_preferences` (prework discipline).

---

## I13. The prompt may DISPLAY only what it OFFERS — and an unoffered tag leaves a record

The render layer hands the model a closed set of `[zone:<handle>]` / `[term:<slug>]` handles it is
permitted to point at. **Anything the prompt shows, it must also offer.** Concretely:

- A tactic name renders through its canonical plain-language phrase (`TAG_PHRASE`, plus the
  render-only `RENDER_DISPLAY_PHRASE` for slugs whose phrase is missing or equals the slug) whenever
  that slug is not in this record's `zones.terms`. Never print a raw tag slug the record does not offer.
- Every worked example draws its handles from the record's OWN offer set, falling back to an abstract
  `<handle>` / `<line-handle>` / `<square-handle>` placeholder — never a real-but-unrelated handle,
  and never a fabricated one. When a record offers no terms, the prompt does not demonstrate
  `[term:]` syntax at all.
- `dropUnoffered` RECORDS every strip as `unoffered_zone:<handle>` / `unoffered_term:<slug>` in the
  same `repairs` array as `stripUnclosedTags`, so an invented slug is visible downstream instead of
  vanishing silently.

**Why it is an invariant and not a preference.** Measured over 125 graded runs: prompts that displayed
an unoffered slug passed the term-fidelity axis 74/90 (82%); prompts that did not passed 35/35 (100%).
*Every* failure sat in the "taught but not offered" condition. Corpus-wide the defect stood at 49/63
records for term slugs and 44/63 for zone handles; after the fix, 0/63 and 0/63, and the axis moved
87% → 98% and held across two independent runs.

**Do NOT satisfy this by widening `zones.terms`** — a term with no KB entry renders an empty glossary
popup, which is why `conditional_swindle` is deliberately absent from `TERM_KB`. The fix is always on
the DISPLAY side.

Guarded by a corpus-wide test that sweeps every `REDACTABLE_TAG_SLUGS` entry across all 63 records
through the production `assembleGroundedPrompt` path. Full rationale and the measurement: **D48**.

