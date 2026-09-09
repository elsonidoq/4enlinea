You turn raw input — a requirements document, a bug report, a rough prompt, a QA findings file, a
conversation summary — into an **epic file** that `/epics-manager` can drive through the speckit
pipeline without further archaeology.

Your output is a single markdown file in `docs/epics/`. Its quality is judged by one question:
**can a fresh-context agent derive a correct spec from this file alone, without re-investigating
the codebase?** Everything below serves that.

## Inputs

`$ARGUMENTS` = a path to a text/markdown file, **or** a free-text description, **or** both. If
`$ARGUMENTS` is empty, ask the user what the epic is about before doing anything else.

If the input references other documents (a spec, a QA file, an open issue), read those too.

---

## Step 1 — Read the governing docs first

Before touching the input, read:

- `docs/best_practices_spec_driven_development.md` — especially §"Epic Sizing: When the Pipeline
  Earns Its Overhead" and §"Designing AI-Friendly Specifications". These are the acceptance
  criteria for your own output.
- `CLAUDE.md` — the project's constitution. Note which of its mandatory-read sections the epic's
  surface will trigger (architecture docs, knowledge base, reason-engine docs, Paddle rules).
- An existing epic as a format reference: `docs/epics/deep-reveal-grounding-epic.md`.

---

## Step 2 — Verify every claim at its source layer

**This is the step that determines whether the epic is worth anything.** The input document is a
set of *claims*, not facts. Per `CLAUDE.md` §"Verifying any claim about this codebase", each one
must be traced to where the truth lives before it enters the epic.

- Read the **signature**, not the doc comment. Read the **code**, not a summary of it.
- **Open every negative claim.** "X doesn't exist", "Y isn't wired up", "that would require a new
  Z" — negative claims silently manufacture scope, and they are wrong often enough to matter.
- **"Already satisfied / no task needed" is the highest-risk claim** in any input. It asserts
  something about existing code while doing the least checking. Read the code that allegedly
  satisfies it — and if it *is* satisfied, say so loudly so no task gets generated for it.
- Prefer `file:line` **plus the verbatim line**. Paraphrase is where staleness hides.
- Line numbers drift; locate by symbol name and treat line refs as approximate.

**Resolve empirically what you can resolve empirically.** If a blocker's status is unknown and one
command or one browser drive would settle it, do that now rather than carrying it into the epic as
an open question. An unknown you can retire in five minutes must not become a `/clarify` round.
Label anything you could not verify as **UNVERIFIED** in the epic, explicitly.

Record the outcome as two buckets:
- **Resolved during this review** → goes into *The evidence*, with a "do not re-derive" marker.
- **Still true and load-bearing** → goes into *Non-obvious facts*.

---

## Step 3 — Separate settled decisions from open ones

Sort every decision the input touches into exactly one of:

- **Settled** — the user has already decided, or the code has already decided, or it follows from a
  constitution rule. Goes in *Settled decisions*, worded so it cannot be relitigated, **with the
  reason attached** (a decision without its rationale gets reversed by the next agent).
- **Open** — the answer would meaningfully change the implementation shape. These become your
  clarifying questions in Step 4, and then the *Open design decisions* section for `/clarify`.
- **Not a decision** — a mechanical consequence. Do not present it as a choice.

A question whose answer changes nothing is noise. Do not ask it.

---

## Step 4 — Ask the clarifying questions (AskUserQuestion, required)

**You must use the `AskUserQuestion` tool for this. Do not ask in prose.**

Before you ask, one hard prerequisite from `CLAUDE.md`: *open the primary artifact behind each
option and put a `file:line` next to every factual claim in the question or its options. If you
cannot cite it, write `UNVERIFIED`.* `AskUserQuestion` is the highest-risk moment in the loop —
whatever framing you present gets decided on and then treated as settled, and nobody re-checks a
closed decision. An inflated cost estimate feels safe and is not; it closes correct options on
false premises.

Rules for the questions themselves:

- Ask only about genuinely open decisions (Step 3). Routine judgment calls are yours to make.
- Give each question 2–4 concrete options, each with a description of what choosing it implies —
  scope, risk, what goes untested if declined.
- **Lead with your recommendation** and mark it `(Recommended)`, with the reason in its description.
- Prefer at most 4 questions in one call; batch related ones rather than interrogating serially.
- Do **not** use the `preview` field for prose options — it is for mockups, code, and diagrams.
- Cover, at minimum, any decision that swings the task count materially, and any coverage gap the
  user might not realize they are accepting (e.g. "this branch of the code will go untested").

If a question is really about *scope*, say what it costs in tasks — grounded, not guessed.

After the answers land, fold them into *Settled decisions* with the user's reasoning preserved.
Anything still genuinely undecided stays in *Open design decisions* for `/clarify`.

---

## Step 5 — Size it, and split off what does not belong

Apply `docs/best_practices_spec_driven_development.md` §"Epic Sizing". The full pipeline is
justified only when **all three** hold:

1. **8+ expected tasks**
2. **At least one unresolved design decision**
3. **Multiple subsystems touched**

State the verdict explicitly in the epic's `**Sizing:**` line, with the task estimate and the
reasoning. Then act on it:

- **Fails the gates** → say so plainly and recommend writing a task list directly instead. Do not
  produce an epic that will waste the pipeline's overhead. Offer the task list instead.
- **Passes** → continue, but **carve out the parts that individually fail the gates**. Mechanically
  obvious, single-purpose edits (doc retractions, renames, config additions) cost more in pipeline
  overhead than in implementation. They go in a *"Deliberately excluded from the pipeline — do
  these directly"* subsection under *NOT included*.
- **Exception to the carve-out:** if a chore's content depends on a *design output* of the epic, it
  stays in. That is the same rule the best-practices doc gives for merging epics — a dependency on
  a design output, not merely on a deployed artifact.

Check the red flags too: a single-bullet scope section, an empty brainstorming section (design
already resolved — skip clarify/plan), or a "NOT included" list longer than the scope (this is
probably a sub-task of a bigger feature — consider merging up).

---

## Step 6 — Write the epic file

Path: `docs/epics/<slug>-epic.md`. Check `specs/index.md` and the existing `docs/epics/` contents
before assigning an epic number, and say so if you had to guess.

Use this structure, matching `deep-reveal-grounding-epic.md`:

```
# Epic N — Title

> **Invocation:** `/epics-manager docs/epics/<slug>-epic.md 1`

<2–4 sentences: what is broken or missing, and what the epic makes possible.>

**Who the "user" is.** <State this whenever the beneficiary is not an end customer — an
internal agent, the founder, CI. Without it, /specify invents customer-facing stories and
specs the wrong system.>

**Lane:** <files/subsystems touched; what it conflicts with.>

**Scope source:** <where this came from, and when.>

**Sizing:** <stories, task estimate, subsystems, open decisions, and the gate verdict.>

**Deployment prerequisites:** <NONE, or the entries for docs/deployment_steps.md. Verify —
do not assume either way.>

## Overview
<table: # | User story | Primary surface | Why it blocks>

## The evidence (do not re-derive — this is the whole diagnosis)
<what you verified in Step 2, numbered, with citations. Include anything you RESOLVED, so no
task gets generated for it.>

## Settled decisions (reflect verbatim — do not relitigate)
<numbered, each with its rationale.>

## Non-obvious facts (verified at source — the spec/plan must respect these)
<NF1..NFn. Traps, invariants, call-site inventories, things that would bite an agent who only
read the code. Mark the highest-risk one as such. Label UNVERIFIED items.>

## Open design decisions (for /clarify)
<only what survived Step 4, each with options and a recommendation. Note the scope swing.>

## Acceptance criteria (epic-level)
<AC1..ACn. Deterministic and checkable — a DB predicate, an observable UI state, a green test
command. Never "works correctly" or "sensible UX".>

## NOT included (so scope cannot grow silently)
<+ the "do these directly" carve-out from Step 5.>

## Authoritative sources of truth
<CLAUDE.md sections, architecture docs, specs, open issues, and memory files the
implementer must read.>
```

Write **outcome-oriented, deterministic** criteria. Harvest real values — a real ID, a real
payload, a real error string — rather than inventing plausible ones; a hand-written fixture tests
the epic's imagination, not the code.

---

## Step 7 — Report back

Tell the user, briefly:

- Where the file is.
- The sizing verdict and whether speckit is justified.
- **What you resolved during the review** — the blockers that turned out not to be blockers, and
  anything the input asserted that is actually false. This is usually the most valuable output.
- What you carved out to do directly.
- Anything still `UNVERIFIED`, and what it would take to settle.
- The exact `/epics-manager` invocation to run next.

If you created only a direct task list because the sizing gates failed, say that instead — and do
not pretend it was an epic.

## Do not

- Do not write the spec, plan, or tasks. `/epics-manager` owns those stages.
- Do not start implementing.
- Do not carry an input's claim into the epic unverified without labelling it.
- Do not ask clarifying questions in prose instead of `AskUserQuestion`.
- Do not invent a beneficiary. If it is unclear who the epic serves, ask.
