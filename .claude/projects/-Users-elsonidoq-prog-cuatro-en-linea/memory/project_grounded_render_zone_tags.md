---
name: project_grounded_render_zone_tags
description: SHIPPED zone/term annotation tags in the grounded-render path (condition D) + the overlay-tag board-truth gotcha + the condition-D key_cells-are-overlay-cells gotcha
metadata: 
  node_type: memory
  type: project
  originSessionId: dfd6ea4d-ff4d-4289-b277-605e1e05ab87
---

**SHIPPED 2026-07-06** (branch `opening-theory`). Folded the production explain engine's highlightable `[zone:…]` tags + `[term:…]` KB popups into the reason-engine grounded-render path (condition D of `compute.mjs`). Single source of truth = `reason_engine/zoneAnnotations.mjs` (`buildAnnotationOffer`/`processAnnotations`). **Authoritative doc: `docs/architecture/reason-render-grounded-prompt.md` §10** — read that, not this memory, for the full mechanism. This memory keeps only the two non-obvious gotchas. The grounded path is now *capable*; production `explainContext.js`/`annotationGate.js` zone code is NOT yet deleted (later pass once wired to a live endpoint). See [[project_reason_render_layer]], [[project_annotation_gate_and_zones]], [[project_zone_alias_must_match_prompt]].

**GOTCHA — condition-D `answer.key_cells` are display-overlay cells, NOT per-cell threat claims.** `postprocessAnswer` (compute.mjs) re-derives `key_cells` by EXPANDING each emitted zone spec: `[zone:better-col]` → the whole 6-cell column; a `windows:` fork → its cells. So most cells in a condition-D `key_cells` are legitimately empty. The grader's A3/A4 carry a **condition-D carve-out** (do NOT fail an empty highlighted-column/window cell as fabrication; zone board-truth is G7/G5). An agent reading the old "key_cells = squares the reason rests on" wording (still true for A/B/C) would wrongly fail every column/window-zone case. `key_cells` is overwritten ONLY when the model emitted ≥1 zone (transition safety).

**Design decisions (non-obvious rationale behind the shipped code; full mechanism in the §10 doc):**
- Tags live **inline in `mechanism`**; the A5/register grader must **strip `[zone:…]`/`[term:…]` before coach-voice checks** (same as production `checkP3`).
- **Aliases-only**: the LLM writes only offered handles, never raw cells → hallucination surface collapses to *binding* (which handle wraps which phrase); this retires `annotationGate`'s `allowedSet`/`P5strong` (offered map = allowedSet).
- **Terms symmetric to zones**: an offered *fired* term vocabulary, inline emission, NO free-text phrase-scan (paraphrase false-negatives). Vocabulary restricted to the **4 KB-backed slugs** `immediate_threat`/`double_threat`/`figure_7`/`claimeven` — **`conditional_swindle` is NOT a term** (no KB entry → empty popup).
- **Single display board** (decision board) but each alias carries a **truthBoard** for grader board-truth.
- New grader axis **G7** (annotation fidelity), board-truth delegated to existing **G5**. Coverage = new `renderUniverse.mjs` predicates only (`zone_speckind_*`/`term_emitted`/`zones_no_tactical`); **no new boards / no new reason-case** (an output-format axis, not a new field).

**GOTCHA (true in current code regardless of this effort): `reasonBoardSelect.mjs` injects the vector-named fork *overlay* (`figure_7`/`double_threat`) ONLY onto the DECISION board** (via `patternOpts` on `decisionTags`); after-best/after-played get plain `tagBoard`. That overlay names a resource that often completes **deep**, so an overlay tag on the decision board is **NOT board-true there** (the cell is empty now). Only the structural `getMajorThreatCells` tags (`immediate`/`major`/`double`) are board-true where they appear.

**Why:** treating the decision-board overlay tag as a present, highlightable threat re-creates the eval-3 "present-threat illusion." **How to apply:** for anything that highlights or grounds cells from board tags, use **structural tags only** and take the fork's truthBoard from the board where it's genuinely real (or its `finalMovestring`) — never assume an overlay tag is real on the board it's drawn on. The zone-tags design excludes overlay tags from highlights for exactly this reason.
