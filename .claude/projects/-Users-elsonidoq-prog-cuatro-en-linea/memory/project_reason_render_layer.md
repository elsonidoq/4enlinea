---
name: project_reason_render_layer
description: Grounded-render prompt (compute.mjs condition D) + the closed field-disposition tripwire
metadata: 
  node_type: memory
  type: project
  originSessionId: 5beb0093-24c2-4a4a-b8b8-28461511fe5b
---

The from-vector LLM answerer (`compute.mjs --llm`) has a NEW render layer producing a grounded,
board-anchored prompt as ablation **condition D** (alongside A/B/C). Read
`docs/architecture/reason-render-grounded-prompt.md` before touching the from-vector prompt. Modules
(all in `connect-four/server/scripts/`): `reason_engine/causalLinks.mjs` (declarative L1–L9
causal-link catalog + `classifyCausalLink`), `fieldDisposition.mjs` (closed field-disposition registry
+ `assertCoverage`), `renderReasonModel.mjs` (`buildReasonRenderModel`/`assembleGroundedPrompt`),
`reasonCellGrounding.mjs` (`groundCell` status/horizon/reachableInPlies), `reasonBoardTags.mjs`
(`tagBoard` — reuses classifier.js majors; kind=immediate|major|double + vector-named fork overlay),
`reasonBoardSelect.mjs` (`selectBoards`/`renderBoardAscii`/`renderThreatList`). **P1 + P2 (grounding)
DONE**; P3 = causal frames (one composer + one test per L1–L9, L2-vs-L3 branch-invariance,
confidence-gated `covers` removal — today `assertCoverage`'s 2nd param is unused / checks all paths),
P4 = grader+sampler.

**Two P2 traps (non-obvious):**
- **`selectBoards` selection-safety:** the vector-named fork pattern (figure_7/double_threat) is
  overlaid only on the DECISION board's DISPLAYED tags; the after-best/after-played inclusion baseline
  (`decisionKey`, §3e Option A) is computed from the STRUCTURAL tag-set (`tagBoard` with NO opts). Fold
  any display-only tag into that baseline and every after-board spuriously "differs" → always shown.
  Owner of the overlay derives from the half: pattern on `lostResource`→'you', `opponentPunishment`→'opp'.
- **Boards are NOT in the completeness walk:** `assertCoverage`/`renderedFields` operate on the narrator
  vector, not on `model.boards`. Adding/changing board tags cannot trip the corpus gate — but also gets
  no coverage protection. Only narrator-vector leaves are gated by the closed registry.

**Tripwire (cross-system trap):** `fieldDisposition.mjs` is a CLOSED registry — every narrator-vector
leaf path must map to a disposition (render / causal-code / transformed / exclude). Add or rename a
field on the reason engine's narrator vector and `assertCoverage` throws `UncoveredVectorFieldError`,
breaking `renderCoverageCorpus.test.mjs` (in `test:fast`) until you register it. This is BY DESIGN (no
field silently dropped from the prompt): register the new field's disposition — never weaken the
assertion or add a catch-all.

**Design principle the user requires (spec §3e):** any render decision that selects or prunes what the
LLM sees (causal-frame `covers`, board selection, …) must be a single declared rule consumed by THREE
consumers — the composer/render, the grader (`grade-fv-sufficiency`), AND the sampler
(`select_boards.mjs`). Never a silent local choice; wire all three. See
[[project_fv_suff_grader_pv_mismatch]], [[feedback_engine_soundness_then_render]].
