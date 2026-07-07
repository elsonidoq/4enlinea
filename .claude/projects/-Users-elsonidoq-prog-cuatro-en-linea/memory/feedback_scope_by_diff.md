---
name: feedback_scope_by_diff
description: "TRIGGER when asked to plan, estimate scope, size a task, or choose process weight (brainstorm/writing-plans/just-do-it) — scope is a diff you MEASURE against the running system, not a whole you imagine"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 19a370b3-4f5e-482d-a51b-3ef7ecdb07e7
---

**TRIGGER: any request to plan, "determine the scope", size/estimate a task, or pick how heavy a process to use (brainstorming vs writing-plans vs just-do-it). Read this BEFORE proposing an approach.**

Estimate scope by **measuring the diff against the running system**, not by enumerating what a complete solution would contain. Empirical-first applies to *scoping*, not just debugging.

Before recommending any process heavier than "just do it":
1. **Name the load-bearing assumption** in one sentence: "This is big *because* ___."
2. **Kill it with an artifact, not an argument** — generate one real output, grep the one call site, diff the new thing against what already exists. Minutes, not a plan.
3. **Count what CHANGES, not what exists.** Existing, unchanged plumbing (auth, cache, retry, tests, endpoints) is evidence *for* simplicity — never list it as work.
4. **Match process to residual unknowns, not surface area.** After looking: 0 open decisions → do it; N known steps → writing-plans; genuine unresolved forks → brainstorm. "I can write a long paragraph about it" is NOT an unknown.
5. **Take "drop-in replacement" / "just swap X" literally.** Such framing is a strong prior that seams already match — confirm it cheaply, don't re-derive the integration from zero.

**Why:** In the explain-move-llm → reason-engine session, the first proposal was "big scope, needs brainstorming," then "writing-plans," and the real work was swapping one function call at a single seam — all the plumbing already existed. The failure: reasoning from the JSON *envelope* instead of a concrete *output value* (the `[zone:]` tags in one real `mechanism` string were the whole answer), estimating additively instead of differentially, and using process weight as a hedge for a scoping decision I hadn't actually done. The user got there by looking at one sample output and asking the falsifiable "am I wrong?" — falsify-simple-first.

**How to apply:** When the user asks to plan or scope, spend the first pass actively hunting for the simplest possible shape ("could this be a one-function swap?") and produce the cheapest artifact that would disprove it, before enumerating anything. Length of description ≠ amount of change. This is [[feedback_occam_principled_extrapolation]] (one small mechanism over many parts) applied to process selection, and the empirical-first / audit-before-acting discipline of [[feedback_prework_discipline]] applied at scoping time. See also [[feedback_llm_output_root_cause]] — a missing/assumed fact is a question to observe with tools, not a fact.
