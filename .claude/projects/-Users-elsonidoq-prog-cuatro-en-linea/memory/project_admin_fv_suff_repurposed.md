---
name: project_admin_fv_suff_repurposed
description: /admin/fv-suff was repurposed (2026-06-29) into the blunder-reason evidence browser; the FV-sufficiency browser & its endpoints are GONE
metadata: 
  node_type: memory
  type: project
  originSessionId: 8129d05b-a8c9-410f-9723-82e11e9622a5
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
  `node server/scripts/reason_audit/build_evidence.mjs`). It renders 3 boards (pre-move,
  lostResource, opponentPunishment) + an evidence panel with chips: `kind`, `register`, `tacticTag`
  (◆), `tie` (⇄ tied/independent/temporal), and a `parityAttribution` box + raw-JSON aside. No
  solver runs in the web server.
- The `grade-fv-sufficiency` skill's "manual inspection browser" no longer exists; its
  `fv_suff_answers_*.jsonl` / frozen-vectors files on disk are untouched but no endpoint serves them.

History gotcha: the ReasonViewer page + `/api/admin/reason` endpoints were once UNCOMMITTED and a
`git reset` discarded them (unrecoverable from git). They were rebuilt and are now committed; the
`reason_audit/` engine deps (`lib/boardUtils.mjs`, `reason_fixture.jsonl`, the baseline test,
`build_evidence.mjs`) were also untracked and are now committed. If tests pass but a clean checkout
fails to import, suspect untracked files.

Gotcha that wasted time: a **stale running server instance serves the old routes** — after editing
`server/index.js` you must kill and restart it, or `/api/admin/reason` falls through to the SPA
catch-all and returns index.html instead of JSON. Implementation map lives in
`docs/architecture/blunder-reason-evidence.md`.
