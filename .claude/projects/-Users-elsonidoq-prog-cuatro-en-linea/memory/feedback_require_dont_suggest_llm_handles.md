---
name: feedback_require_dont_suggest_llm_handles
description: "To change which grounding handle the coach uses, make it REQUIRED — prompt wording is measurably inert"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: cfb9cb8a-6253-42d4-a773-75ae83ef5ba1
  modified: 2026-09-01T21:10:21.577440Z
---

**Trigger: you want the deep-reveal coach to start using a handle/annotation it is already offered
(a `windows:` line, a `future:` fork, a `[term:]` pairing) and your instinct is to reword the prompt.**

Don't. Prompt steering for this behaviour has been measured and falsified **twice** in one session
(spec 058 feedback closure, 2026-08-05), against the real pipeline with real LLM calls:

| lever | measurement |
|---|---|
| role text ("a LINE of four squares, not a single square — use this handle") + a worked bad/good example in `assembleGroundedPrompt` | **0 `windows:` specs emitted / 12 board-runs** |
| a handle-specific `[term:]`→zone binding instruction, also with a worked example | **0 pairings / 3 runs** |
| adding the spec to the **required set** (`deriveRequiredSet`) | **12/12** line specs, **6/6** term pairings |

The required set is enforced (FR-008 gives a compliance retry); the prompt's prose is advice the
model discards under competing pressure. So the question is never "how do I word this better" — it
is "which derivation makes this handle *required*, and does it survive `required ⊆ offered`?"

**Why this hides:** the offer looked correct the whole time. The engine computed the exact right
line, offered it, the guard would have accepted it — and the coach pointed at the line's endpoint
square instead, because nothing obliged it not to. An offer-set dump looks healthy; only an
emission count over several runs reveals it. **One run is a sample, not a measurement** — the LLM is
nondeterministic, so always run ≥3 before concluding a handle "works" or "doesn't".

Corollary for the inverse case: if a required handle still goes missing, check whether the *guard*
stripped it before blaming the model (see [[project_grounded_annotation_traps]] for the replay
harness that separates the two in one command). See also [[feedback_llm_output_root_cause]],
[[feedback_eval_design_methodology]] (counterexamples not averages).

**UNRESOLVED contradiction (2026-08-23), do not treat this memory as settled.** A worked-EXAMPLE
wording repair — making the prompt's own bad/good example grammatical instead of splicing a raw
canonical phrase into it ("you handed him double threat (two winning squares at once)") — coincided
with the actionability axis moving 76% → 84% and with a control board's 5/5 coach-voice failure
disappearing. That is prompt *wording* moving behaviour, which this memory says is inert. Caveats: one
run, and a second fix landed in the same commit, so it is a hypothesis, not a result. If you are about
to cite "wording is inert" to skip a prompt-text fix, re-read this paragraph first and consider
measuring instead. Exemplars may be a special case: the model imitates them rather than obeying them.


## RESOLVED-ish (2026-09-01): the RETRY is wording, and it is NOT inert — 91% recovery

The "unresolved contradiction" above now has a second, much larger data point, and it sharpens the
rule rather than overturning it.

`compute.mjs --retry` (D60) makes the harness run production's own retry. Measured on the first
`--retry` corpus run (63 boards x 3, 189 runs): the retry **fired on 81 runs (43%)** and **recovered
74 of 81 (91%)** — 57 fully fixed, 17 partial, 7 unchanged. A 14-case set at n=3 gave 90%.

**The distinction that matters, and it is the whole lesson:**

| intervention | measured |
|---|---|
| adding wording to the ORIGINAL prompt ("use this handle", worked examples) | **inert** — 0/12, 0/3 |
| making the handle REQUIRED | **12/12** |
| RE-ASKING after a concrete, itemised miss (the retry's amended prompt names the exact handles that were dropped) | **91% recovered** |

So "prompt wording is inert" is about *pre-emptive instruction competing with everything else in the
prompt*. A retry is not that: it arrives after a failure, names the specific missing handles, and asks
again. **Do not cite this memory to argue a retry is pointless — that inference was made in a session
and was wrong.** The corollary also flips: a graded "model ignored the required set" failure is
usually recoverable, so measure with `--retry` before treating it as a render defect.
