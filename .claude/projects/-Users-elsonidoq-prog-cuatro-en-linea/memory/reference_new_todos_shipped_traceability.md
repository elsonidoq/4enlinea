---
name: reference_new_todos_shipped_traceability
description: "new_TODOs.md is now EMPTY (all 26 items shipped) — the issue→epic→spec traceability lives in polish_epic.md's Appendix; also breaks app-qa's 'read new_TODOs.md for the QA mindset' setup step"
metadata: 
  node_type: memory
  type: reference
  originSessionId: d25bb270-05f1-4779-b7df-daeeb80916f9
  modified: 2026-08-03T15:49:48.820Z
---

**Trigger: asked whether a `new_TODOs.md` item is done, asked to triage that backlog, or running
`/app-qa` (whose setup Step 1 says to read `new_TODOs.md` as the QA mindset).**

As of **2026-08-03** `new_TODOs.md` at the repo root is **empty of tasks** — all 26 of its items were
verified shipped and removed. Do not read its emptiness as "the backlog was lost" or re-add items from
an old memory of it.

**The traceability survives in `polish_epic.md`, not in git alone.** That file was written to cover
*every* `new_TODOs.md` item (#1–#26) plus every `agentic_QA` finding, and carries an
**"Appendix — issue → deliverable traceability"** table (~line 2118) mapping each `new_TODOs #n` to an
epic number. The epics map to specs `041`–`050` under `specs/`. So the fastest answer to "was #N
shipped, and where?" is that table → the epic's section → the spec folder — *not* a code search.

Two traps when auditing that list:

- **Epic 2 (spec 042) and Epic 3 (spec 043) have no `feat(042)`/`feat(043)` commit** — unlike 041 and
  044–048, which do. They shipped under differently-worded commits, so a `git log --grep` sweep will
  wrongly conclude they were never implemented. Check `specs/0NN-*/tasks.md` checkbox state instead.
- **Some items were closed by *correcting the premise*, not by building what was asked.** `#16`
  ("make the mistake count = blunders + suboptimal") was closed because the counts **already**
  included suboptimal — the real defect was copy that called a lost game flawless. Reading the item
  text alone will send you to fix something that was never broken. See
  [[project_stats_architecture]] and `docs/open_issues.md` OI-125 for the vocabulary trap underneath.

**Consequence for `/app-qa`**: its setup step "Read `new_TODOs.md` and `TODOs.md` — these are the QA
mindset, known bug classes to hunt" now yields nothing from `new_TODOs.md`. Use `polish_epic.md`'s
issue list and the most recent `agentic_QA_<stamp>.md` as the seed instead.

Related: [[project_app_qa_setup_gotchas]], [[reference_open_issues_epics]],
[[feedback_open_issues_destination]].
