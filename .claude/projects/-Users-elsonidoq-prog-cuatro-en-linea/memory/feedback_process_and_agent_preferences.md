---
name: feedback_process_and_agent_preferences
description: "How heavy to make a process and how to dispatch agents — sizing bars (plan vs speckit vs manager), scope-is-a-diff, Opus-critique/Sonnet-apply, AskUserQuestion ≥2 options and never `preview` for text, ASCII diagrams, handoff runs ONE command"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5a34af86-ae36-4059-aa61-20c2adf0e291
  modified: 2026-07-31T19:37:47.550Z
---

Merged from `feedback_speckit_epic_scoping` (+ its `feedback_scope_by_diff` half), `feedback_prework_discipline`, `feedback_proportion_process_to_change`, `feedback_agent_and_ui_workflow` (+ its merged `feedback_askuserquestion_preview_format` / `reference_multiagent_orchestration_patterns` halves), and the agent-dispatch rules of `feedback_workflow_hygiene`. These are the owner's non-default preferences — the defaults are usually the opposite.

## 1. Sizing: the bars are numeric, and process is a hedge you must not take

- **Default to a plan** (`superpowers:writing-plans`), written "thinking in the end-game". Convert to a spec only if scope actually turns out too big.
- **Full speckit pipeline only when ALL THREE hold:** (1) 8+ tasks, (2) ≥1 unresolved design decision that changes the implementation *shape*, (3) multiple subsystems (server+frontend+DB, or a shared API contract).
- **A bespoke speckit *manager command*** only at **≥2 user stories × ≥7 tasks each**. Below each bar, step down a level. Skip speckit entirely for single-component UI, admin tools, or any feature whose "NOT included" list is longer than its scope. Full table: `docs/best_practices_spec_driven_development.md` → "Epic Sizing".
- **Merge trigger:** if Epic B's plan would need rewriting after Epic A resolves a brainstorming question, merge them into one run.
- **Proportion ceremony to the change.** For a small ADDITIVE skill/doc edit the owner explicitly cut off the `writing-skills` RED-baseline protocol — *"I think it is too much to do the red baseline protocol for this"* — and chose: make the edit, then validate by using it once on a real task. Keep the full discipline only for NEW discipline-enforcing skills and behavior that genuinely varies run-to-run.

## 2. Scope is a diff you MEASURE, not a whole you imagine

**Trigger: any request to plan, "determine the scope", size/estimate, or pick process weight.**

1. **Name the load-bearing assumption**: "This is big *because* ___."
2. **Kill it with an artifact, not an argument** — one real output, one grepped call site. Minutes, not a plan.
3. **Count what CHANGES, not what exists.** Unchanged plumbing (auth, cache, retry, endpoints) is evidence *for* simplicity — never list it as work.
4. **Match process to residual unknowns, not surface area.** 0 open decisions → do it; N known steps → writing-plans; genuine forks → brainstorm. *"I can write a long paragraph about it" is NOT an unknown.*
5. **Take "drop-in replacement" / "just swap X" literally** — strong prior that the seams already match.
6. **Classify BEFORE proposing: bug / gap / new scope.** When surfacing missing behaviour, the owner's
   first question is *"is this a bug? a gap? or are you proposing something not in the epic's scope?"*
   — asked verbatim, 2026-07-31. Answer it unprompted, because the three have different owners and the
   answer decides whether work starts at all. Worked case: `goalPrompt` overrides shipping silent was
   **not** a bug (FR-029 specified silence), and **not** an unfinished epic — it was a gap in the
   *seam between two epics* (Epic 5 built the audio walker before the field rendered; Epic 6 made it
   render but forbade itself from generating audio). Naming that let the owner make a real decision
   instead of accepting an implied defect. Also: don't over-hedge once the pieces are known — when the
   owner says *"I thought this was straightforward, am I correct?"*, they usually are; say so plainly
   and name the single genuine unknown rather than restating the whole risk surface.

**Why:** in the explain-move-llm → reason-engine session the first proposal was "big scope, needs brainstorming", then "writing-plans" — the real work was swapping one function call at one seam. Process weight was used as a hedge for a scoping decision that hadn't been done. See [[feedback_occam_principled_extrapolation]], [[feedback_llm_output_root_cause]].

## 3. Prework

- **Answer before editing.** A question gets a text answer FIRST, then tools. (Also in CLAUDE.md.)
- **Empirical first.** Run code / call the API / write a test as soon as a repro path is plausible. In the heatmap-bug session, 40+ rounds of mental bitboard analysis were resolved by two bash commands once the real movestring existed. Reserve theory for when nothing is testable, or to explain *why* after the fact.
- **Audit ALL code paths before an epic.** Multiple entry points (coach messages, notifications) mean reading every participating file — `rg "coach\."` and read every call site. Secondary paths (hint phrases, `handleSequenceClick`, server-side keys) become open questions if missed.
- **Sonnet spec-review before plan.** After `/speckit-specify`, spawn a **Sonnet** subagent to review the spec against `docs/best_practices_spec_driven_development.md` with severity-tagged findings, BEFORE `/speckit-plan`. Caught 6 blocking issues in the Epic 1a spec; spec errors are cheapest pre-plan.

## 4. Agent dispatch

- **Delegate on brief-cost, not edit-size.** The owner asks this explicitly (*"is it small enough to
  instruct a sub-agent, or better in this context because the edit is very small?"*, 2026-07-31). The
  test is not line count — it's whether the constraints are already loaded. If the edit is small but
  each line carries a constraint a fresh agent must re-derive (an ordering invariant tests assert on, a
  gating asymmetry between two similar helpers), the brief costs more than the work: do it in-context.
  Delegate when the work is broad, mechanical, or genuinely re-explorable from a short prompt.
- **Opus for critique, Sonnet for apply.** Opus when the task needs independent judgment on an unfamiliar document (critique, gap analysis, catching what the author would rationalize away). Sonnet when applying a well-defined list of known decisions. Ask this before every spawn. **But:** Opus critique agents assert confident false premises too — see [[feedback_verify_at_the_source_layer]]; give fix agents a **stop-and-report** instruction.
- **Background subagents get Edit/Write DENIED** → they return "designed everything, wrote nothing" because a spawned background `Agent` can't surface a permission prompt, so its writes are blocked outright. A silent failure mode; don't dispatch write work to one — implement writes in the main session, or have the subagent return a tight ready-to-apply design (file + exact change) that you apply. Reserve background subagents for read/research/analysis.
- **Commit pre-existing WIP before subagent-driven-development.** `git status` for pre-existing uncommitted WIP unrelated to the new plan and commit (or ask) BEFORE dispatching Task 1 — an implementer's `git add <file>` sweeps unrelated WIP into the task commit, misattributing it.
- **Don't `pkill` the shared backend.** Vite dev server and the Node server share a process group in the user's terminal — `pkill -f "server/index.js"` kills both (blank-page Vite failure). Ask the user to restart manually; if you must, start the new process first, then kill the old, and verify Vite still runs.
- **Fix dispatches must flag unrequested second-function bundling** rather than quietly widening scope.
- **Mark tasks completed promptly.** Call TaskUpdate → `completed` as soon as each task's work is done; don't leave stale `in_progress`/`pending`.
- **Use the right search tool** (all installed): `rg <pattern>` for text/regex (never `grep -r` or `find|xargs grep`); `fd <name>` for files (never `find -name`); `sg` (ast-grep) for structural/AST patterns (call sites, arg shapes — e.g. refactor audits); LSP for type-aware go-to-def/find-refs.
- **Coordinator + fan-out, one agent per unit of work** — the owner's preferred shape for bulk content work, stated directly (2026-07-25): *"use the coordinator pattern and fan out agents. One agent per lesson to translate. One agent per lesson to be added and then an agent that reviews all, fixes numbering issues, or any cross reference issue."* Model split he chose: **Sonnet for translation** (mechanical, well-specified), **Fable for authoring and for the final review**. Ran 13 translators + 2 authors + 1 reviewer successfully. The load-bearing detail: parallel agents are **forbidden from touching shared files** (i18n JSONs, test registries, anything renumbered) — all shared-file edits are batched into the final reviewer, which also owns cross-references and the gate run. Note the owner may also just say **"use fable for all tasks"**; take it literally and re-dispatch anything already running on another model.
- **A problem your own change created is yours to FIX, not to flag.** The owner, on finding paid lessons interleaved with free after a reorder I had performed and then reported as a known issue: *"Why didn't you fix that?"* Reporting a self-inflicted regression in a summary is not delivery. Flagging is for pre-existing problems and genuine owner decisions; if your diff caused it, fix it in the same pass.
- **Handoff prompts run ONE command.** Never write "if X, run `/speckit-clarify`" — the agent executes one command and cannot branch. Pre-answer likely clarifications inline so the target command doesn't stall.
- **Handoff context pattern:** each sub-agent ends with a `## Handoff context` section (decisions + reasoning, trade-offs, uncertainties to scrutinize, patterns to follow, non-obvious constraints); the orchestrator pastes it verbatim into the next prompt. Cold-start agents only see files on disk — without the "why", critique agents can't tell intentional decisions from defects.
- **AskUserQuestion gate pattern:** sub-agents can't be interactive, so separate critique (non-interactive Opus) from decision collection (AskUserQuestion in the main turn). Batch ≤4 per call; tag the recommended option.
- **Batched-implement / review / fix beats per-task dispatch when the owner asks for it explicitly.** For a small (≤8-task), low-coordination-risk plan, the owner directed: one Sonnet/general agent implements ALL tasks in one call (not `subagent-driven-development`'s one-agent-per-task default), then one Opus code-review agent, then one Sonnet fix agent — reserving the plan's own final manual-verification task for themselves. Confirmed working (worktree-port-isolation plan, 2026-07-17): the implementer ran every task's own verification steps and committed per-task inside its single call, and the review still caught a real cross-file gap (a doc file the plan's scope list omitted). Default to per-task dispatch for anything with real inter-task coordination risk or ambiguity; use this batched pattern only when the owner asks for it or the tasks are this mechanical.

## 5. Asking + showing

- **AskUserQuestion needs ≥2 options** — it throws `InputValidationError: expected array to have >=2 items` on one. When only one resolution makes sense, add "Keep current behavior" or "Accept all recommendations".
- **Don't ask what has only one viable answer.** The owner (2026-07-29, on approving the recommended option in nearly every technical Q&A): if there is a recommendation and no genuine alternative, apply it and report it — don't build a one-real-option question. Padding to reach the ≥2-option floor is the anti-pattern, not the fix. Applies to any gate you design, not just `/epics-manager` (where it is now encoded — [[reference_custom_commands]]). Two guards the owner kept: a recommendation *between* two real alternatives is still a question, and auto-applied items must be reported so fewer prompts doesn't silently mean less oversight. He **agreed with the caveat** that approving ~90% of recommendations doesn't make the asking worthless — the value is concentrated in the few you'd have refused — and therefore **declined** the larger "ask by blast radius (irreversible / user-visible / changes stored data), not by pipeline stage" redesign for now. Don't re-propose it as if it were unconsidered.
- **NEVER use `preview` for text/code options.** The owner: *"Never use this format again. Text is being suppressed."* Previews render in a boxed pane that truncates ("✂ N lines hidden") and suppresses the option `description`. Reserve `preview` for genuinely visual content (ASCII mockups, diagram comparisons) only.
- **ASCII diagrams for UI brainstorming** — inline; do NOT offer the browser-based visual companion (declined explicitly).
- **Prepopulate reviewed data upfront.** For a "re-review" flow, list EVERY field the UI must pre-populate, trace each to its source table, add all selects/**joins** in one edit — fields in related tables (e.g. `annotator_note` on `false_positive_records` joined by `candidate_id`) are the missed ones. Add `Cache-Control: no-store` to admin list endpoints returning mutable data (stale 304s mask changes).

## 6. What belongs in an epic doc

Only three classes: (1) **factual errors in the epic** (a wrong premise propagates silently); (2) **cross-epic contracts** (a decision in Epic A's run is invisible to Epic B); (3) **mockup-vs-Gap conflicts** (say "don't follow the mockup here", or `specify` faithfully builds the wrong thing). Everything else — behavior bounded by epic+Gap, work behind an already-named interface, single-epic decisions (migration shape, RLS/grants, response field lists) — leave to specify/clarify/plan/tasks; baking it in over-constrains.

**Hard-to-derive algorithms stay in `spec.md`**, even though SDD best practice moves "how" to `plan.md`. When an algorithm is significant research effort (e.g. the claimeven simulation FR-004), its presence in the spec locks the approach — don't flag it as a "how vs what" violation.

Related: [[feedback_explanation_and_question_style]], [[feedback_verify_at_the_source_layer]], [[feedback_open_issues_destination]].
