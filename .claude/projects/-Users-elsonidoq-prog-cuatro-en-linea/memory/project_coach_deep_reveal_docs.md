---
name: project-coach-deep-reveal-product-docs
description: "MVP product docs for the coach-explanation rebuild + Deep Reveal annotation layer; which is authoritative; what's already shipped vs the real remaining work"
metadata: 
  node_type: memory
  type: project
  originSessionId: 333f715f-3260-440f-abcd-2036f4c28b6f
---

Four docs in `docs/mvp/` govern the coach-explanation / Deep Reveal work:

- **`coach_explanation_principles.md`** — **AUTHORITATIVE** content layer: *what the coach says*. Honesty as top principle; Type 1–4 explanation taxonomy (immediate / tactical / parity / development) selected by evidence present. Algorithm mechanics pinned in sections M1/M2/M3: simulation aggregates specific winning groups (not classifier tags); draw leaves contribute `draw_threat` records; union rule for which groups enter the context (groups appearing in either branch A or B); top-5 per branch with discard logging. Eval gap thresholds: small ≤3 / moderate 4–9 / large ≥10 (c4solver range [-18,+18]); sign-change override (win→draw/loss treated as at least moderate/large). Type 1 skips simulation entirely (evidence is already on the board). `buildExplainContext` return value extended in Epic B to carry `allowedSet` alongside `prompt`.

- **`deep_reveal_product.md`** — **AUTHORITATIVE** product description for the *interactive annotation/highlight layer* of the existing Deep Reveal Panel (Tier 2). Supersedes `product_vision.md` Screen 8 "non-interactive." Defines **Annotation Integrity Principles P1–P6**. Scoped to 3 surfaces: Challenges, Position Explorer, Past Mistakes. Read-aloud/TTS DEFERRED. Authenticated-only; 20/week free quota. P5 traceability: `e86eeac9`/`8d83947e` = blocked-group failures (Epic A); `403a21c9` = non-existent-threat (requires strong P5, Epic B).

- **`deep_reveal_epics.md`** — **two implementation epics** in strict order. Epic A before Epic B (hard dependency). Epic A: server-side validate-then-cache gate enforcing P1–P4 + board-only P5 (blocked groups + out-of-bounds); gate inserts *after* `injectDefaultActiveZone` and *before* the Tier-2 cache write only (not the Tier-1 `/api/explain-move` path). Epic B: coach rebuild — `explainSimulate.js` won-leaf change, Type 1–4 taxonomy, M1/M2/M3 aggregation, grounding contract, strong-form P5 upgrade. P5 seam: Epic A board-only → Epic B plugs in `allowedSet` for strong form.

- **`deep_reveal_improvements.md`** — **non-binding PRIOR ART, partly stale.** Has a staleness banner. Trust code over its claims.

Key invariants: The `opponentResponseMovestring` for Type 2 critical-position check is already computed in `buildExplainContext` — no new solver calls needed. The pre-built pattern narrations (`claimevenNarration`, `zThreatNarration`, etc.) in `buildExplainContext` are **replaced**, not extended, by Epic B.

Related: [[project-blunder-tagging-design]] — the pattern→blunder→challenge system that feeds blunder statistics into the coach. Its authoritative doc is `docs/mvp/patterns_blunders_challenges.md`.
