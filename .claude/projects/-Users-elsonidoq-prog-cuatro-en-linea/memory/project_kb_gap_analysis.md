---
name: project-kb-gap-analysis
description: "Two-part KB gap analysis (web sources + PDFs) comparing docs/knowledge-base/ against external_references; both parts complete; final report at knowledge-base-gaps.md"
metadata: 
  node_type: memory
  type: project
  originSessionId: fff0bdb4-dae0-44b0-bb96-0c9e71717575
---

KB gap analysis to find concepts in `docs/external_references/` not represented in `docs/knowledge-base/`. Two-part coordinator workflow, both parts now complete.

- **Part 1 (web resources) — DONE 2026-05-19.** Output: `knowledge-base-gaps-part1.md`. 13 gaps (3 high / 6 medium / 4 low). Sources: allen_expert_play_summary.md + tromp/weakc4/wikipedia/wikibooks HTML.
- **Part 2 (PDFs) — DONE 2026-05-19.** Output: `knowledge-base-gaps.md` (final merged report). Spawned 8 PDF sub-agents (Allen book pp 1-20, 21-40, 41-70, 71-100, 101-131; Allis thesis pp 1-45, 46-91; Allis 1993 TSS), deduplicated against Part 1.

**Final merged report:** `knowledge-base-gaps.md` at project root. **58 gaps total** (17 high / 25 medium / 16 low), sorted by priority then alphabetically by primary source. Each entry lists `Merged from` showing which agent labels (P1-GAP-* or P2 A-1..H-6) contributed.

High-priority highlights (17):
- Foundational vocabulary missing: "check" definition, major/minor/strategic threat taxonomy, row parity, adjacent threat pair (cross-column case), mixed threat pair (medium).
- Allen Ch. 4 p. 103–104 — six minor-threat rules as standalone entries (GAP-005).
- Triple Threat variants, Winning Quadruple Threat, J-Shape variants (Capped/Overcut/Future), Undercutting chapter, Counterthreats — all missing.
- Allis: combination meta-rules (§5.3–5.4), 9×9 compatibility matrix + even-square-count, White-strategy threat combinations (§8).
- Allis 1993 TSS: formal definitions (gain/cost/rest/dependency) and search principles.
- allen-j-configuration worked_examples still PENDING (fillable from Allen 1990 Game 1).

**Why:** Empirical inventory of what canonical/community sources cover that the project KB doesn't — input to the next round of KB authoring.

**How to apply:** When asked to extend the KB or "what's missing from KB," read `knowledge-base-gaps.md` (the final merged file, not the part1 file). The part1 file remains on disk but is now subsumed.

Related: [[project_kb_migration]], [[project_kb_audit]], [[reference_external_pdfs]].
