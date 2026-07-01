---
name: project_narrator_vector_no_scores
description: toNarratorVector must DEEP-scrub the whole solver-score family + optimalWinSamples; a flat top-level strip leaks nested scores to the LLM
metadata:
  type: project
---

`toNarratorVector` (`connect-four/server/scripts/reasonNarratorVector.mjs`) is the ONE filter that
defines "what the LLM narrator sees" (the eval answerer and the future production coach both use it).
As of 2026-07-01 (D21) it exposes **zero solver scores**.

**The trap:** the old impl used a flat `HIDDEN_FIELDS = ['scores']` and stripped only the *top-level*
per-column array. But solver scores also live NESTED — `lostResource.line[].score` /
`opponentPunishment.line[].score` (per-move) and the top-level decision scores `bestScore` /
`playedScore`. A flat top-level omit-list silently leaked all of those into the LLM prompt (verified:
values like `18`, `-16` reached the narrator). **The scrub MUST be recursive.** It is now a pure
deep-copy dropping any key matching `/^scores?$|Score$/` (→ `scores`, `score`, `bestScore`,
`playedScore`) plus `optimalWinSamples`, at any depth.

**Why / how to apply:**
- Adding a new score-bearing field nested in a half — or "simplifying" the projection back to a
  top-level omit-list — reintroduces the leak. Keep it recursive; the regex catches `*Score`.
- The narrator gets **no numeric evaluation at all** — not even `bestScore`/`playedScore`. Outcomes
  (win/draw/loss) come from `case` (its name IS the sign pair); `pliesToEnd` (a ply count, not a
  score) is the only distance signal. Exposing `|score|` invites "you win in 7" grounding (I1/I2).
- `toNarratorVector` must stay a **pure deep-copy** — it must NOT mutate its input, because the RAW
  evidence object keeps every score for the `/admin/fv-suff` Evidence view and the frozen fixtures.
- Anything needing ground-truth scores (e.g. the `grade-fv-sufficiency` grader) must read RAW
  evidence (`row.evidence`) / the sibling `groundTruth`, NEVER the narrator `feature_vector`.
- The LLM glossary (`docs/architecture/feature-vector-glossary.md`) must **never mention a "solver"
  or any numeric score** — strategy language only (patterns, parity, winning lines, optimal play).
  Owner directive 2026-07-01; keep it solver-free and score-free on every edit.

`optimalWinSamples` (the seeded, deterministic distribution of optimal winning-line realizations for
`register:'parity'` wins — gated `register==='parity' && half.window`, sibling of
`attributeParityWin`) is **evidence-only**: on the raw vector, stripped from the narrator, and now
overlaid amber (distinct windows) on the pre-move board in `/admin/fv-suff`. See
[[project_admin_fv_suff_repurposed]], [[project_reason_engine_reorg]]. Full rationale: D21 in
`reason-DECISIONS.md`.
