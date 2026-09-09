---
name: feedback_occam_principled_extrapolation
description: "Decide designs with Occam's razor — prefer one unifying mechanism over many special-case kinds; extrapolate general rules from examples, don't enumerate cases; and its tooling corollary — extend the ONE existing command, never add a sibling script or a new --strategy"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 56e7f9e4-5e9a-4e07-928a-b96d64865768
---

When designing or deciding, apply **Occam's razor**: prefer the simplest single mechanism that
explains all the cases over a sprawling set of special-case branches/kinds. Use concrete examples to
**extrapolate a general principle**, then state and design around that principle — don't enumerate a
rule per example.

**Why:** the user wants durable, general designs, not case-by-case rules overfit to a fixed example
set. A "kind per situation" design usually hides one underlying mechanism; finding it makes the system
smaller, more correct, and easier to reason about. (Established 2026-06-28 during the blunder
`reason`-field audit: the five "kinds" turned out to be facets of one rule — see
`reason-DECISIONS.md` D2 (abandoned predecessor).)

**How to apply:**
- When a design has N branches/kinds/payloads, ask: is there ONE principle that generates them? If so,
  collapse to it and treat the branches as special cases of the same mechanism.
- Ground the principle in examples, but write it generally; validate it against held-out examples
  rather than tuning thresholds to the seen set (avoid the overfit [[feedback_eval_design_methodology]]).
- Be explicit about which residual cases the principle does NOT cover and why (honest scope), instead
  of bolting on a special case to force coverage.

## The tooling corollary: EXTEND the one command, don't add a script or a mode

(Merged from `feedback_one_command_pipeline_extend_dont_add`.) The same razor governs pipeline tooling:
the user strongly prefers **extending an existing command over adding a new script or a new CLI mode.**
Concrete corrections from the opening-sampling brainstorm (2026-07-05) — a proposed new `TOOLS/` script
**and** a proposed new `--strategy opening` were both rejected: *"The `--strategy` must not change. All
boards must be generated with just one command. Why would we have more than one command to generate
boards?"* The intended shape was the ONE existing command (`select_boards --strategy coverage`) running
**two internal phases** (a deterministic opening step, then the existing harvest) into one output —
"one command generates everything for the next step". Fewer moving parts for the operator; the pipeline
stays `select_boards → compute --llm → grade` with no extra invocations to sequence.

**How to apply:** default to a new internal phase/branch inside the current entry point, reusing its
emit/classify/write plumbing, rather than a sibling script or a new strategy value. If you think a new
`--strategy`/script is warranted, propose it as "extend the existing command" first and justify the new
surface. **Do not let this override soundness** — the user equally insisted sampled cases stay
**solver-verified** blunders and cover **both players**, not just the convenient one.
