---
name: project_spec032_repo_hygiene
description: "Spec/plan/tasks done; implemented 2026-06-13; 2 files deleted, 6 quarantined, green/gray sweep complete"
metadata: 
  node_type: memory
  type: project
  originSessionId: 82299498-e078-4575-8559-f3166f8918ca
---

Spec 032 implementation done 2026-06-13 via 3-batch `/coordinate-implementation` run.

**Track A — Dead-code audit & removal:**
- `debt-inventory.md` created at `specs/032-repo-hygiene-tech-debt/debt-inventory.md` — 121 files audited across 8 directories
- 2 files deleted: `src/pages/PuzzlesPage.jsx`, `src/screens/PlaceholderScreen.jsx`
- 6 files moved to `connect-four/src/_quarantine/` for owner QA: BadgeRow.jsx, ClassifyAllPanel.jsx, DeepRevealButton.jsx, ExplainMoveButton.jsx, SequenceHandler.jsx, StatusBar.jsx
- If QA confirms no breakage, `rm -rf connect-four/src/_quarantine/` finalizes Track A
- ESLint baseline: 176 problems (170 errors, 6 warnings); post-deletion: 171 (lower is fine)
- Pre-existing test failure: `classifier.test.js` forbidden_columns board-based test — `'suboptimal_move'` vs expected `'forbidden_columns'` (NOT caused by this epic)

**Track B — Green/gray sweep:**
- 4 server files fixed: `visualize_board.mjs`, `explainContext.js`, `llmCoachHelpers.js`, `classify_all.mjs`
- 11 lesson JSON files normalized — 281 replacements in `text`, `infoProse`, `label`, `title`, `goalPrompt` fields
- `es.json` and `en.json` confirmed no-ops (already canonical)
- Internal board cell enum `'red'`/`'yellow'` untouched (verified via SC-006)

**Key discovery:** `DeepRevealButton.jsx` calls `POST /api/explain-move-llm` — an endpoint that doesn't exist. Real production deep reveal uses `CoachDialog.jsx` + `POST /api/n`. DeepRevealButton is genuinely dead (wrong endpoint, zero importers, parent PuzzlesPage deleted).

**User preference — quarantine before delete:** Move suspected-dead files to a quarantine folder first, QA the site, then delete if clean. See `connect-four/src/_quarantine/`.

**Why:** Implementation complete. Owner needs to QA quarantined components before final deletion.
**How to apply:** Run QA on the site. If no regressions, delete `_quarantine/`. If breakage found, move individual files back from quarantine to `components/`.
