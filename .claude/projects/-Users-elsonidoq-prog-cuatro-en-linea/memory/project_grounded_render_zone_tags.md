---
name: project_grounded_render_zone_tags
description: In-flight effort to add zone/term annotation tags to the grounded-render path (to delete the production explain engine) + the overlay-tag board-truth gotcha it uncovered
metadata: 
  node_type: memory
  type: project
  originSessionId: dfd6ea4d-ff4d-4289-b277-605e1e05ab87
---

**In-flight (designed + planned 2026-07-06, NOT yet implemented).** Folding the production explain engine's highlightable `[zone:…]` tags + `[term:…]` KB popups into the reason-engine grounded-render path (condition D of `compute.mjs`), so the grounded path emits everything the frontend needs and the production explain engine (`explainContext.js`/`annotationGate.js`/`zoneParser.js`/`llmCoachHelpers.js` zone bits) can eventually be deleted. Design: `docs/superpowers/specs/2026-07-06-grounded-render-zone-tags-design.md`; plan: `docs/superpowers/plans/2026-07-06-grounded-render-zone-tags.md`. See [[project_reason_render_layer]], [[project_annotation_gate_and_zones]], [[project_zone_alias_must_match_prompt]].

**Locked decisions (non-obvious, won't be visible in code until built):**
- Tags live **inline in `mechanism`**; the A5/register grader must **strip `[zone:…]`/`[term:…]` before coach-voice checks** (same as production `checkP3`).
- **Aliases-only**: the LLM writes only offered handles, never raw cells → hallucination surface collapses to *binding* (which handle wraps which phrase); this retires `annotationGate`'s `allowedSet`/`P5strong` (offered map = allowedSet).
- **Terms symmetric to zones**: an offered *fired* term vocabulary, inline emission, NO free-text phrase-scan (paraphrase false-negatives). Vocabulary restricted to the **4 KB-backed slugs** `immediate_threat`/`double_threat`/`figure_7`/`claimeven` — **`conditional_swindle` is NOT a term** (no KB entry → empty popup).
- **Single display board** (decision board) but each alias carries a **truthBoard** for grader board-truth.
- New grader axis **G7** (annotation fidelity), board-truth delegated to existing **G5**. Coverage = new `renderUniverse.mjs` predicates only (`zone_speckind_*`/`term_emitted`/`zones_no_tactical`); **no new boards / no new reason-case** (an output-format axis, not a new field).

**GOTCHA (true in current code regardless of this effort): `reasonBoardSelect.mjs` injects the vector-named fork *overlay* (`figure_7`/`double_threat`) ONLY onto the DECISION board** (via `patternOpts` on `decisionTags`); after-best/after-played get plain `tagBoard`. That overlay names a resource that often completes **deep**, so an overlay tag on the decision board is **NOT board-true there** (the cell is empty now). Only the structural `getMajorThreatCells` tags (`immediate`/`major`/`double`) are board-true where they appear.

**Why:** treating the decision-board overlay tag as a present, highlightable threat re-creates the eval-3 "present-threat illusion." **How to apply:** for anything that highlights or grounds cells from board tags, use **structural tags only** and take the fork's truthBoard from the board where it's genuinely real (or its `finalMovestring`) — never assume an overlay tag is real on the board it's drawn on. The zone-tags design excludes overlay tags from highlights for exactly this reason.
