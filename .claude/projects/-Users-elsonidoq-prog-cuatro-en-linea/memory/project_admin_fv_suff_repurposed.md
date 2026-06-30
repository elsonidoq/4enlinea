---
name: project_admin_fv_suff_repurposed
description: /admin/fv-suff has TWO modes (Evidence vectors + Eval answers LLM/grade); each reads a DIFFERENT file
metadata: 
  node_type: memory
  type: project
  originSessionId: 8129d05b-a8c9-410f-9723-82e11e9622a5
---

**UPDATE 2026-06-30 — the page now has TWO modes (a tab toggle in `AdminFvSuffPage.jsx`), reading
DIFFERENT files:**
- **Evidence** — the blunder-reason vectors: `reason_evidence_*.jsonl` via `GET /api/admin/reason`
  (build_evidence.mjs output). This is the original repurpose below.
- **Eval answers** — board + vector + LLM answer + A1–A4 grade. The legacy `GET /api/admin/fv-suff`
  was **REVIVED** (the "dead endpoint" note below is now obsolete): it serves `{ set, answers, grades }`
  joined by `id`. `set` = an eval set (`(fv|reason)_eval_set*.jsonl`, narrator vectors); `answers` =
  `fv_suff_answers_*.jsonl` (explain_from_vector.mjs); `grades` = `<answers-stem>_grades.jsonl`
  (grade-fv-sufficiency side-output). **Gotcha:** the `set` you pick MUST be the same `--input` you
  gave `explain_from_vector.mjs`, or the ids don't join (board shows blank). Filename prefixes are
  load-bearing (validators in `server/evalResultsHelpers.js`): the `/files` answers list excludes
  `*_grades.jsonl`; `build_evidence --out` must start `reason_evidence_` to appear in the Evidence
  dropdown. **A consolidation is planned** (4 board/vector scripts → `select_boards.mjs` +
  `compute.mjs(--llm)` + grade skill, one evidence file feeding both tabs) — see the handoff; don't
  add more scripts.

---

`/admin/fv-suff` (component still named `src/pages/AdminFvSuffPage.jsx`) **no longer shows the
Feature-Vector Sufficiency experiment**. As of 2026-06-29 it was repurposed in place (intentionally
NOT backwards compatible) into the **Blunder-reason evidence browser**.

What changed — surprises for anyone expecting the old tool:
- Added `GET /api/admin/reason/files` and `GET /api/admin/reason?file=<reason_evidence_*.jsonl>`
  (localhost+admin gated) in `server/index.js`. The old `GET /api/admin/fv-suff[/files]` endpoints
  are **still present but dead** (the page no longer calls them) — the first repurpose deleted them,
  but it was uncommitted and a `git reset` wiped it; the rebuild (see below) left them in place to
  minimize collateral risk. Harmless; delete later if desired.
- The page now reads precomputed `connect-four/server/scripts/reason_evidence_all.jsonl` (one
  reasonEngine evidence object per line; regenerate with
  `node server/scripts/reason_engine/build_evidence.mjs`). It renders 3 boards (pre-move,
  lostResource, opponentPunishment) + an evidence panel with chips: `kind`, `register`, `tacticTag`
  (◆), `tie` (⇄ tied/independent/temporal), and a `parityAttribution` box + raw-JSON aside. No
  solver runs in the web server.
- The `grade-fv-sufficiency` skill's "manual inspection browser" no longer exists; its
  `fv_suff_answers_*.jsonl` / frozen-vectors files on disk are untouched but no endpoint serves them.

History gotcha: the ReasonViewer page + `/api/admin/reason` endpoints were once UNCOMMITTED and a
`git reset` discarded them (unrecoverable from git). They were rebuilt and are now committed; the
`reason_engine/` engine deps (`lib/boardUtils.mjs`, `reason_fixture.jsonl`, the baseline test,
`build_evidence.mjs`) were also untracked and are now committed. If tests pass but a clean checkout
fails to import, suspect untracked files.

Gotcha that wasted time: a **stale running server instance serves the old routes/code** — after
editing `server/index.js` you must kill and restart it. Two failure modes seen: (1) `/api/admin/reason`
falls through to the SPA catch-all and returns index.html instead of JSON; (2) a lingering server
holds the port, so your new `node server/index.js` silently fails with EADDRINUSE and curl keeps
hitting the OLD code (symptom: the endpoint returns the previous response shape). Fix:
`lsof -ti tcp:3001 | xargs kill -9` before re-booting. Implementation map lives in
`docs/architecture/blunder-reason-evidence.md`.
