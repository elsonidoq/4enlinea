---
name: feedback_plan_file_map_is_coverage_frontier
description: "/speckit-tasks generates tasks ONLY from plan.md's Source Code map — a file named in prose (research.md, contracts/, a critique) but absent from that map silently gets no task; prose is not coverage"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e489485b-0827-42be-9935-e5e3e5d43ca8
  modified: 2026-08-01T23:15:30.568Z
---

**`/speckit-tasks` reads `plan.md`'s Source Code map, not the prose.** A file discussed in
`research.md`, named in a `contracts/*.md` consumer list, or flagged by a reviewer — but **absent from
that map** — produces **no task at all**. There is no warning. `/speckit-analyze` will still report
full FR coverage, because every requirement does map to *some* task; what is missing is a *file*, not
a requirement.

This is not hypothetical. In the spec 053 pipeline (Epic 3, entitlement/payments) it produced three
separate blocking findings at the very last checkpoint, after four prior review stages had passed:

- `src/i18n/en.json` / `es.json` — the new pricing screen and a new footer link referenced translation
  keys that did not exist. Missing keys fall back to English **silently** (see
  [[project_spanish_output_silent_fallback]]), so the Spanish build would have shipped half-English
  with every test green.
- `docs/architecture/frontend-conventions.md` — its §"Reading the user's tier" mandated the exact
  pattern the epic deletes, and cited as canonical precedent one of the very lines being removed. Left
  stale, it instructs the *next* feature to recreate the problem the epic exists to fix.
- The three `GET /api/lessons/:id` consumer screens, which index into `lesson.slides` unguarded and
  would have thrown on the new locked-lesson stub. `contracts/lessons.md` named one of them, in prose.

**How to apply.** Treat the plan's Source Code map as the coverage frontier, and run one explicit
sweep before generating tasks: *what does this change make stale?* — i18n bundles, convention docs
that prescribe the pattern being replaced, every consumer of a response shape being altered, every
linker to a URL being moved. Then reconcile the map against every prose claim in `research.md` and
`contracts/`: anything that must absorb a new shape or a moved URL belongs **in the map**, not only in
a sentence.

Corollary, same pipeline, same root cause: **a task that says "attach X to existing module Y" is
worthless until someone opens Y.** A task read "thread the nonce through `checkoutReturnFlow.js`"
without anyone having opened that 80-line file — which is a bare in-memory `let state = 'idle'`, wiped
on restart, so the cold-boot case the story existed for could never have worked. It would have gone
green in-session. See [[feedback_verify_at_the_source_layer]] and
[[project_paddle_integration]] §14.
