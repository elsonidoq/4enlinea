---
name: project_prod_llm_call_graph
description: "Prod deep-reveal LLM path is mechanismExplainer.defaultCallLLM, NOT llmCoachHelpers.callLLM (offline-only); + a separate Anthropic path"
metadata: 
  node_type: memory
  type: project
  originSessionId: 57bb2794-fed6-4536-ae1e-f8d655866958
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
- **Separate live Anthropic path**: `composeExplanation` (index.js:~474) → `anthropic.messages.create`
  (index.js:~499), used for the coach one-liner (index.js:~997). Usage fields are `input_tokens`/`output_tokens`,
  NOT OpenAI's `prompt_tokens`/`completion_tokens`.
- **`compute.mjs --llm`** has its **own** OpenAI `fetch` (reads `EXPLAIN_MODEL`), independent of the above.
- **OpenAI TTS** (deep-reveal audio, index.js:~3760) is billable but **char-priced** (no token semantics).

There is **no single choke-point**; these are independent implementations. Spec 047 (US7.5) unifies the three
**OpenAI chat** paths (`defaultCallLLM` + `callLLM` + `compute.mjs`) through one helper returning
`{content, usage}`; Anthropic + TTS are deliberately out of scope. Also: `/api/recommend-move` appears in the
endpoint doc but is **not a registered route** in index.js — it is CLI-only (`recommend_next_move.mjs`); don't
treat it as a live prod endpoint. See [[project_explain_system]], [[reference_llm_model_env_vars]],
[[feedback_calllm_error_handling]].
