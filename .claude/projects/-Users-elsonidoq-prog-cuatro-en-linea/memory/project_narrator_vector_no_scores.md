---
name: project_narrator_vector_no_scores
description: "toNarratorVector must DEEP-scrub the solver-score family + EVERY evidence-only diagnostic (optimalWinSamples, winSamples); a new such field leaks to the LLM unless added to isNarratorHidden"
metadata: 
  node_type: memory
  type: project
  originSessionId: dfe02ac3-48f0-4313-8326-3861d5aa3af8
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

**Evidence-only diagnostics must be registered in `isNarratorHidden` or they leak.** `isNarratorHidden`
hides the score regex `/^scores?$|Score$/` PLUS an explicit allow-list of evidence-only field names.
Two such fields exist (2026-07-02):
- `optimalWinSamples` — seeded distribution of optimal winning-line realizations, gated to
  `register:'parity'` wins on `lostResource`; overlaid amber on the `/admin/fv-suff` pre-move board.
- `winSamples` — top-level `{best, played}` win-line distributions from the best root (player's win)
  and played root (opponent's win), for opening/mid-game boards only (`discs<30`); overlaid green
  (best) / red (played) on the pre-move board. **DISABLED by default 2026-07-02** via
  `REASON_CONFIG.enableWinSamples: false` — the owner built it then judged it does NOT help explain
  the blunder ("score is a compass not the reason" — [[feedback_deep_reveal_product_mindset]]). Code
  path kept intact; `out.winSamples` stays `null` unless the flag is flipped. Don't re-propose
  "show where each side wins" as an explanation aid — it was tried and rejected. (The older
  `optimalWinSamples` was NOT disabled.)

**The trap:** adding any new evidence-only field (a diagnostic you want on the raw vector + the
`/admin/fv-suff` view but NOT in the LLM prompt) requires adding its exact key to `isNarratorHidden`'s
allow-list AND to the `reasonNarratorVector.test.mjs` hidden-set assertion — otherwise
`toNarratorVector` passes it straight through to the narrator. The score regex only catches
`*Score`/`scores`; sample/distribution fields need the explicit name. See
[[project_admin_fv_suff_repurposed]], [[project_reason_engine_reorg]]. Full rationale: D21 in
`reason-DECISIONS.md`; `winSamples` shape in `blunder-reason-evidence.md` §11.
