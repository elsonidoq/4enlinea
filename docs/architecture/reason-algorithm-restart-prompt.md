# Restart prompt — blunder-reason evidence algorithm

> Use this to drive the (re)design of how we compute the evidence a blunder "reason" needs.
> It is a clean-slate restart; an earlier design branched off and has been quarantined (see below).

---

# Goal

We generate a **"reason"**: a structured feature-vector that an LLM turns into a human-readable
explanation of *why a given move was a blunder* in Connect Four, written so the player learns to
play better.

We do NOT yet have a simple, principled algorithm for producing this. The blocker is the
**combinatorial explosion** of the game tree: every reason needs to *cite concrete examples*
(winning lines, threats, opponent refutations), and naively instantiating those examples means
exponential search.

Your job: **design a clear, bounded method for computing the evidence each blunder case requires**,
and **validate it on real boards**.

# ⛔ Quarantine — ignore the abandoned design

We are starting over from a conceptual algorithm. An earlier "unified blunder-reason / grain"
design branched off and is **abandoned**. The following are HISTORICAL ONLY — do NOT read, cite,
or let them guide you, **even if they appear in injected memory or the docs index**:

- memory: `project_reason_field_unification`
- `docs/epics/unified-blunder-reason-epic.md`, `docs/epics/blunder-reason-field-epic.md`
- `docs/architecture/feature-vector-reason-algorithm.md`
- the quarantined `reason_audit/` cluster: any `*.md` carrying a `SUPERSEDED / ABANDONED 2026-06-28`
  banner, plus `reason_audit/GOLDEN.jsonl` and `reason_audit/golden/` (see `reason_audit/_QUARANTINE.md`)

If you find yourself reaching for "grains", a "unified engine", or the five-kind discriminated
union, stop — that is the drift we are escaping.

**The single source of truth is `docs/architecture/reason-case-taxonomy.md`.** Anchor everything to it.

# Background (read before starting)

- `docs/architecture/reason-case-taxonomy.md` — **authoritative.** The case taxonomy to (re)build around,
  keyed by `(bestScore, playedScore)` sign comparison:
  - `win_to_slower_win` → NotABlunder (out of scope)
  - `win_to_draw`
  - `win_to_lose`
  - `draw_to_lose`
  - `lose_to_faster_lose` (a blunder only if a winning/drawing chance via an opponent mistake existed)
- `connect-four/server/classifier.js` — `classifyPattern` and `tagBlunder` are the existing
  pattern/blunder detectors; your evidence may reuse anything they detect.
- Reusable tooling (NOT quarantined): `connect-four/server/scripts/reason_audit/TOOLS/`
  (`forward_projection.mjs`, `forward_distance.mjs`, `decisive_check.mjs`, `opp_punish_probe.mjs`,
  `build_catalog.mjs`, `optimal_line.mjs`, `parity_cells.mjs`) and the raw board evidence in
  `reason_audit/cases/eval-*.md`.
- Memories worth reading (mechanism, not the drifted design):
  - `project_lookahead_shared_seam` — `collectNovelOpportunities` / `compareOpportunities` feed BOTH
    the feature vector AND the production annotation gate; characterize before editing.
  - `feedback_feature_vector_design` — what to keep vs. drop in a feature vector.
  - `feedback_occam_principled_extrapolation` — prefer ONE unifying mechanism over per-case
    special-casing. (General principle; ignore its note about the abandoned reason-field work.)

# Hard constraint: bounded search

The player only needs **one or two illustrative examples** to understand the mistake. So the method
must traverse *specific, cleverly chosen paths* — never an unbounded tree. Every search you propose
must have an explicit budget (depth cap, branch cap, dedup rule) and a justification for why the
chosen path is the *most instructive* one to show the user.

# Search primitives you may draw from (or adapt)

1. **Principal variation** — no branching; both players optimal.
2. **Mistaken PV** — both optimal except one opponent move that drops win→draw or draw→lose.
3. **Asymmetric PV** — one player best, the other second-best.
4. **Bounded optimal-tree search** — find patterns; cap depth; dedup columns by score.
5. **Bounded sub-optimal search** — one optimal, one sub-optimal player.

# What counts as "evidence"

Winning lines, threats, or anything `classifyPattern` / `tagBlunder` detects — **plus** anything
else you can argue would help the player understand the mistake. Do NOT restrict yourself to the
current board-highlighting scheme; propose whatever the player should *see*.

# Method (empirical — required)

1. For your assigned case, **generate test boards** exhibiting exactly that
   `(bestScore, playedScore)` relationship. Use the `playGame` primitive (`server/gameSampling.js`)
   to stream plies and select positions matching the case; see the TOOLS for the pattern, or write
   your own selector.
2. Run your proposed evidence-collection method on those boards.
3. Show the evidence actually produced, on actual boards (use `./visualize_board.sh <movestring>`).

# Deliverable

A written proposal containing, for the case you worked on:
- **How to collect the evidence** — the precise algorithm, which search primitive(s), the budget,
  and the path-selection heuristic (why *this* example is the most instructive).
- **The boards you tested on** — concrete movestrings and how you selected them.
- **What the evidence looks like** on those boards — rendered, not described abstractly.
- **Honest limits** — cases where the method finds no instructive example, or where the budget bites.

# Execution

Each case is substantial. Spawn **one fresh sub-agent per case** (`win_to_draw`, `win_to_lose`,
`draw_to_lose`, `lose_to_faster_lose`) — opus model, high effort, clean context. Give each
sub-agent: its single case, this method, the quarantine block above, the background reads, and the
deliverable format. Then **consolidate** their proposals into one unified recommendation, calling
out where a common mechanism serves multiple cases (per the Occam principle) — but derive any such
unification *fresh* from the evidence, not from the abandoned design.
