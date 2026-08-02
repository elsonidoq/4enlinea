---
name: project_prod_llm_call_graph
description: "Prod deep-reveal LLM path is mechanismExplainer.defaultCallLLM, NOT llmCoachHelpers.callLLM (offline-only); composeExplanation/POST /api/explain-move is DEAD (no frontend caller)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 57bb2794-fed6-4536-ae1e-f8d655866958
  modified: 2026-07-30T13:58:32.625Z
---

Before instrumenting LLM token/cost usage, or reasoning about which function the **production** deep-reveal
endpoint calls, know the real call graph on `feature/polish` — `docs/architecture/llm-coach-endpoints.md`'s
pipeline diagrams show `callLLM` and mislead you into thinking it's the choke-point. It is not. This wrong
premise cost spec 047 a full critique round.

Verified seams (index.js line numbers drift — re-grep):
- **Prod HTTP `POST /api/explain-move-llm`** (index.js:~1035) → `computeMechanism` (mechanismExplainer.mjs:99)
  → **`defaultCallLLM`** (mechanismExplainer.mjs:29, called by default at :106). This is the OpenAI chat path
  that actually serves users. `computeMechanism`'s `callLLM` option is a **test-injection seam only**.
- **`callLLM`** in `server/llmCoachHelpers.js` is used **only** by the offline `run_eval.mjs` harness — it
  captures **no production traffic**. Instrumenting it alone records nothing real.
- **~~Separate live Anthropic path~~ — `composeExplanation` is DEAD CODE (proven 2026-07-30, spec 051 US4).**
  It and its only route, `POST /api/explain-move`, have **no frontend caller at all**. Confirmed by driving
  the real app (Sparring → Resign → Past Games → a "Suboptimal" card → "What should I have played?") and
  capturing the network tab in both languages: zero requests to `/api/explain-move`, and no
  `oneLiner`/`one_liner` key anywhere in the captured payloads. The one-liner the learner actually reads
  comes from **`POST /api/explain-move-llm` → `explanation`** — i.e. `computeMechanism`, the OpenAI path in
  the bullet above, not a second Anthropic path. It **already** threads locale correctly
  (`buildPromptForCondition` appends a Spanish directive when `locale === 'es'`; `explanation_cache` is
  keyed `(position_hash, locale)`), so "localize the one-liner" needs no work. **If a plan tells you to add
  locale / instrumentation / anything to `composeExplanation`, verify a live caller first** — spec 051
  scoped exactly that fix and would have shipped it against code no learner reaches. (Static grep is not
  enough either: it found the absence but couldn't prove it; the captured request did.) If it is ever
  revived, its Anthropic usage fields are `input_tokens`/`output_tokens`, not OpenAI's
  `prompt_tokens`/`completion_tokens`.
- **`compute.mjs --llm`** has its **own** OpenAI `fetch` (reads `EXPLAIN_MODEL`), independent of the above.
- **OpenAI TTS** (deep-reveal audio, index.js:~3760) is billable but **char-priced** (no token semantics).

There is **no single choke-point**; these are independent implementations. Spec 047 (US7.5) unifies the three
**OpenAI chat** paths (`defaultCallLLM` + `callLLM` + `compute.mjs`) through one helper returning
`{content, usage}`; Anthropic + TTS are deliberately out of scope. Also: `/api/recommend-move` appears in the
endpoint doc but is **not a registered route** in index.js — it is CLI-only (`recommend_next_move.mjs`); don't
treat it as a live prod endpoint. See [[project_explain_system]], `docs/architecture/server-conventions.md` §Environment Variables,
`docs/architecture/server-conventions.md` §LLM Explanation Scripts.
