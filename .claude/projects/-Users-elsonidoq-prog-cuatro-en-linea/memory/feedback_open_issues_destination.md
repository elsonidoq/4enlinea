---
name: feedback_open_issues_destination
description: "Deferred/latent issues go in docs/open_issues.md (human backlog), NOT memory — memory stays trigger-first gotchas"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e72aeeaf-77c1-4f53-889b-c19ab8f78bda
---

When you discover a **deferred/latent issue** — a real bug or quality gap you're consciously NOT
fixing now (scoped out of the current spec, pre-existing, "fix later") — record it in
`docs/open_issues.md`, the human-triageable backlog, NOT in memory.

**Why:** the owner draws a hard line between the two destinations. Memory = trigger-first gotchas
that ambush an agent editing the relevant code. `docs/open_issues.md` = the browsable backlog of
"things we know are wrong and might fix later." A deferred issue is backlog, not a code-editing trap.

**How to apply:**
- Entry format is `## OI-N — title` with **Status / Area / Discovered / description(+repro) / Why
  deferred / If picked up** fields (see the file's existing entries). Append the next sequential
  `OI-N`; read the file first to avoid duplicates; keep the pointer in `docs/index.md` under "Other".
- Does NOT qualify: ephemeral notes (test flakes, one-off env quirks, "re-run X to seed data") →
  those go in a QA/setup memory or nowhere. A stub the next batch already finished is not open.
- The `/coordinate-implementation` command now auto-persists Step-4 "Open items" and Step-5 QA
  "Remaining issues" into this file (see `.claude/commands/`).
- A pre-existing issue flagged "out of scope / not a regression" during QA still belongs here if
  it's a real latent bug — that's exactly what the backlog is for. First entry OI-1 = single-answer
  puzzle categories score by solver-score not pattern (score-tie ≠ pattern-tie); see
  `docs/architecture/server-conventions.md` §Predicate Evaluator.
