---
name: project_admin_fv_suff_repurposed
description: /admin/fv-suff has TWO modes (Evidence vectors + Eval answers LLM/grade); each reads a DIFFERENT file
metadata: 
  node_type: memory
  type: project
  originSessionId: 8129d05b-a8c9-410f-9723-82e11e9622a5
---

**UPDATE 2026-06-30 (consolidation SHIPPED) — TWO modes (tab toggle in `AdminFvSuffPage.jsx`), and
the eval pipeline collapsed to 2 scripts. See `blunder-reason-evidence.md` §11.**

- **Evidence tab** — `reason_evidence_*.jsonl` via `GET /api/admin/reason`. Rows are now NESTED:
  `{ id, evidence:{…computeReason output incl raw scores…}, groundTruth:{case,gate,exhaustive,bucket,
  matches}|null }`. ReasonViewer reads `entry.evidence.*` and `entry.groundTruth?.{matches,bucket}`
  (NOT flat fields — that was the pre-consolidation shape). Produced by `compute.mjs` (the old
  `build_evidence.mjs` was DELETED).
- **Eval answers tab** — `GET /api/admin/fv-suff?answers=<file>` → `{ set, answers, grades }`, joined
  by `id`. **NO separate eval-set file and NO `set=` param anymore**: `set` is DERIVED from the
  answers file via `deriveSetFromAnswers` (`server/evalResultsHelpers.js`), because each
  `fv_suff_answers_*.jsonl` row now EMBEDS its own `feature_vector` (written by `compute.mjs --llm`).
  `grades` = `<answers-stem>_grades.jsonl`. The old "the `set` you pick MUST match the `--input`"
  gotcha is GONE.

**Filename prefixes are load-bearing** (validators in `server/evalResultsHelpers.js`, unit-tested):
Evidence dropdown matches `reason_evidence_*.jsonl`; answers `/files` list matches
`fv_suff_answers_*.jsonl` and EXCLUDES `*_grades.jsonl`. `isReasonEvalSetFile` is still exported +
tested but is now UNUSED by the server.

Grader (`grade-fv-sufficiency`) is UNCHANGED and runs on the answers file as its own vectors source:
`/grade-fv-sufficiency <answers> --vectors <same answers file>` (each row is a valid
`{id, pattern_category, feature_vector}` vectors row).

---

`/admin/fv-suff` (component still named `src/pages/AdminFvSuffPage.jsx`) **no longer shows the
Feature-Vector Sufficiency experiment**. As of 2026-06-29 it was repurposed in place (intentionally
NOT backwards compatible) into the blunder-reason browser; 2026-06-30 added the Eval-answers tab + the
consolidation above. It renders 3 boards (pre-move, lostResource, opponentPunishment) + an evidence
panel with chips (`kind`, `register`, `tacticTag` ◆, `tie` ⇄, `parityAttribution`) + raw-JSON aside.
No solver runs in the web server.

Gotcha that wasted time: a **stale running server instance serves the old routes/code** — after
editing `server/index.js` you must kill and restart it. Failure modes: (1) `/api/admin/reason` falls
through to the SPA catch-all and returns index.html instead of JSON; (2) a lingering server holds the
port so your new `node server/index.js` silently fails with EADDRINUSE and curl keeps hitting OLD
code. Fix: `lsof -ti tcp:3001 | xargs kill -9` before re-booting. Implementation map:
`docs/architecture/blunder-reason-evidence.md`.
