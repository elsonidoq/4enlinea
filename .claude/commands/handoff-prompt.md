# Handoff Prompt Generator

You just finished implementing a phase of work. Write a self-contained handoff prompt for the next coding agent.

## What to produce

A single markdown block the user can copy and paste as a prompt to a fresh agent. The prompt must be **immediately actionable**: the next agent should be able to start coding without asking clarifying questions.

## What to include

Only include context that the next agent **cannot derive by reading the spec, plan, tasks, or source files**. Concretely:

- **Entry point**: branch name, working directory, test command, and current pass/fail baseline (run the tests now to get the real numbers).
- **Start task**: which task ID to begin at (the first unchecked `[ ]` in tasks.md).
- **Runtime surprises**: things that differ from what the plan says — e.g., a function that was already removed, an import that needs updating, a variable name collision, a null-guard the plan forgot to mention.
- **Cross-task dependencies within the next phase**: if two tasks touch the same call site and doing them in isolation would create a double-construction or a broken intermediate state, say so explicitly.
- **Dead-code traps**: helpers that look unused but aren't, or helpers that look used but are actually dead and safe to delete — only when this is non-obvious from reading the code.
- **Anything the plan's migration table gets wrong or omits**: wrong line references, missing call sites, incorrect replacement patterns — only if you discovered a discrepancy while implementing.

## What NOT to include

Do not repeat anything the next agent will find by reading:
- `tasks.md` — task descriptions, acceptance criteria, file paths
- `plan.md` — migration tables, replacement code, architectural rationale
- `spec.md` / `research.md` / `data-model.md` — design decisions, entity specs
- Source files themselves — function signatures, existing logic

If the plan already covers it accurately, do not restate it.

## How to write it

1. Run `npm test` (or the project's test command) to get the current baseline numbers.
2. Read `tasks.md` to find the first unchecked task — that is where the next agent starts.
3. Read `plan.md` §for that phase to identify what the plan says will happen.
4. Read the actual source files for the call sites and functions involved in the next phase.
5. Compare plan vs. reality. Note every discrepancy, missing case, or trap.
6. Write the prompt. Lead with the mechanical setup (branch, dir, test command, baseline, start task). Then list only the non-obvious facts you found in step 5 — one tight paragraph or bullet per item. No preamble, no rationale the plan already gives.

Keep the prompt under 400 words. If there is nothing non-obvious to add beyond the mechanical setup, say so explicitly rather than padding.
