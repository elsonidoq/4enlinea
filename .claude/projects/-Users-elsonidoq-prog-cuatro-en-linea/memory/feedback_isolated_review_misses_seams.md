---
name: feedback-isolated-review-misses-seams
description: "Per-task/per-batch review structurally cannot see the seam BETWEEN two correct halves — after batched work, run one end-to-end check that exercises the cross-task path in the real app"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: beac6818-214f-4294-b8d7-b0f88677a1a0
  modified: 2026-07-28T13:15:53.746Z
---

When work is split across tasks (or batches, or a plan + a later plan), each piece gets reviewed against **its own** brief. A defect that lives in the *join* between two pieces — where each half is individually correct — passes every per-task review by construction. The reviewer of half A never sees half B.

**Why (2026-07-16 QA-remediation session — the SAME shape, three times, each shipped past review):**
- **Server seam correct, client never asks.** Task 2 wired `GET /api/lessons/:id` to read `req.locale`; reviewed ✅. Task 4b's job — make `ConceptScreen`/`SocraticScreen` actually *send* `langHeaders()` — was a separate task. Until it landed, every Spanish lesson rendered English. My Task 2 verification "passed" because I curled with an `Accept-Language` header **the app never sends**.
- **Producer correct, rendered output wrong.** `computeAnnualSavings` returned a correct `PriceInfo` (test ✅); nobody asserted the *string* — `formatPrice` appended its own `/mo` on top of the copy key's, rendering `$1.83/mo/mo` (and `/mo/mes` in Spanish).
- **Endpoint takes the param, button never sends it.** Task 3 gave `POST …/generate-audio` a `{lang}` body; Task 3b gave the editor an en/es toggle. Each reviewed ✅. Nobody wired the join: the button's fetch sent **no body**, so toggling to Spanish silently generated English clips. Found only when the owner asked "shouldn't this be in the tool?" and I drove the actual button.

**The same hole exists along a second axis: a component test renders ONE instance, the page renders N**
(2026-07-28, admin `windowHighlights` control). `SlideEditor` is rendered once per slide. Its DOM test
mounts a single `<SlideEditor index={0}>`, so every per-instance identifier it asserts —
`aria-label="Window 1 label"`, `"Coach message 1"` — was unique *by construction* and green. On the
real editor page with 3 slides, those labels collided three ways. Nothing in the component test could
ever see it; it surfaced only when a browser selector matched `null` and threw. The fix is to scope
per-instance identifiers by the index the component already receives (`Slide ${index+1} …`) — but the
**detection** requires rendering the parent, or driving the real page.

Per-task review is necessary but blind here. This is distinct from [[feedback_verify_at_the_source_layer]] (that's belief-level: don't trust a representation). This is *process-level*: even with every belief verified, the review **structure** has a hole at every task boundary.

**How to apply:**
1. **After batched/split work, add one integration pass that drives the cross-task path end-to-end in the real app** — not the unit tests, which each live on one side of the seam. The final whole-branch review exists partly for this; do not skip it.
2. **When Task N produces a capability and Task M consumes it, explicitly verify the wire.** Ask "who calls this, with what, and did I watch it happen?" — grep the call site, then exercise it.
3. **For any user-facing string, assert the rendered output**, never just the function that feeds it. A `test:dom` render test is the right shape; a producer-return assertion is not.
4. **Treat "shouldn't X drive Y?" from the owner as a seam probe** — it usually means two correct halves aren't joined. Drive Y's real path before answering.
5. **If a component is rendered N times by its parent, any DOM identifier it emits must be scoped by its index** — and a single-instance render test cannot verify that. Check it on the real page (`[...document.querySelectorAll('[aria-label]')]` → look for duplicates), or render the parent.

Related: [[feedback_verify_at_the_source_layer]], [[feedback_agent_and_ui_workflow]], [[feedback_llm_output_root_cause]].
