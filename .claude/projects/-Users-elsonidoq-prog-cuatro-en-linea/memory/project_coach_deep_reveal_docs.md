---
name: project-coach-deep-reveal-product-docs
description: "MVP product docs for the coach-explanation rebuild + Deep Reveal annotation layer; which is authoritative; what's already shipped vs the real remaining work"
metadata: 
  node_type: memory
  type: project
  originSessionId: 333f715f-3260-440f-abcd-2036f4c28b6f
---

Three docs in `docs/mvp/` govern the coach-explanation / Deep Reveal work (created/finalized 2026-06-02):

- **`coach_explanation_principles.md`** — content layer: *what the coach says*. Honesty as top principle; Type 1–4 explanation taxonomy (immediate / tactical / parity / development) selected by evidence present; the unifying mechanism is the specific **group of 4** by win-frequency delta, labeled by **parity** via KB (`allen-v1`/`v3` Red odd rows, `v2`/`v4` Yellow even); grounding contract = the model may only reference pre-listed cells. Scoped to past_mistakes-style "why move A was worse than B."

- **`deep_reveal_product.md`** — **AUTHORITATIVE** product description for the *interactive annotation/highlight layer* of the existing Deep Reveal Panel (Tier 2). It is an enhancement, not a new feature, and **supersedes** `product_vision.md` Screen 8's "non-interactive" board. Defines **Annotation Integrity Principles P1–P6** (renderer/pipeline, not the prompt, is the enforcement boundary). Scoped to **3 surfaces**: Challenges, Position Explorer, Past Mistakes. **Read-aloud/TTS is DEFERRED out of MVP.** Deep Reveal is authenticated-only (anon → AuthModal), 20/week free quota.

- **`deep_reveal_improvements.md`** — **non-binding engineering PRIOR ART, partly stale.** Phase 1 (interactive highlights + board sync) is **already shipped** on branch `101-new-design`: `src/lib/annotatedText.js`, `AnnotatedExplanation.jsx`, `AnnotatedText.jsx`, `Board.jsx` `zhCells`/`zh` overlay, and all 3 surfaces wired (`ChallengeScreen`, `ExplorerScreen`, `MistakeDetailScreen`). Trust the code over its current-state claims; it has a staleness banner at the top.

**The genuinely-new work** for the rebuild = a **server-side validate-then-cache** enforcement of P1–P6 + closed-vocabulary check (today validation is only client-side parse-and-drop in `annotatedText.js`). TTS is separate and deferred.

See [[feedback-product-doc-authoring]] for how these were written.
