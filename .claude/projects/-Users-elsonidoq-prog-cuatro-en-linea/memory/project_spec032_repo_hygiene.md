---
name: project_spec032_repo_hygiene
description: Spec/plan/tasks done at specs/032-repo-hygiene-tech-debt/; 25 tasks across two independent tracks; dead-code audit + green/gray terminology sweep
metadata:
  type: project
---

Spec, plan, and tasks complete at `specs/032-repo-hygiene-tech-debt/`. 25 tasks total; not yet implemented.

**Why:** Epic 3 of TODOs_epics.md — remove dead screens/components and normalize user-facing disc color terminology to green/gray.

**Two independent tracks:**

- **Track A (T001–T015):** Dead-code audit → debt-inventory.md → deletion. T001/T002 (import graph + lint baseline) gate all subsequent steps. T010/T011 auto-delete the two pre-confirmed dead files; T012 requires owner sign-off before removing any additional DELETE candidates.
- **Track B (T016–T024):** Green/gray terminology sweep across i18n, lesson JSON, and CLI scripts. Fully independent of Track A; can run in parallel.

**Key architectural decisions locked in spec:**

- **Three-verdict system:** DELETE (all dead-checks pass, auto-remove) / SURFACE (ambiguous, owner decides) / DEFER (owner-explicit keep-list). No `// TODO:` comment trigger (zero exist in codebase).
- **Dead-code reachability:** Transitive import graph from entrypoint roster via `npx dependency-cruiser` (or `npx madge`). Entrypoints = `index.js` + `migrate.js` + `package.json` scripts + `process.argv` files + `*.test.*` files.
- **Screen deletion needs 4 signals:** not in SCREENS map AND not lazy-loaded in App.jsx AND no production importer AND no `go()` call AND no URL_MAP entry.
- **Admin screens are live:** `AdminLessonEditorScreen.jsx` and `AdminLessonListScreen.jsx` are NOT in SCREENS but ARE reachable via `AdminLessonsPage.jsx` (lazy-loaded in App.jsx at `/admin/lessons`). Must NOT get DELETE verdict.
- **Pre-confirmed DELETE files:** `src/pages/PuzzlesPage.jsx` and `src/screens/PlaceholderScreen.jsx` — zero production importers confirmed.
- **Lint gate:** error count ≤ pre-epic baseline (captured in T002); NOT exit 0. Codebase has ~170 pre-existing ESLint errors on files this epic doesn't touch.
- **Canonical disc color:** "gray" (American English). `en.json` has 16 uses of "gray", zero "grey".
- **`explainContext.js` + `llmCoachHelpers.js` both need Grey→Gray:** `explainContext.js` is where `playerName` ('Green'/'Grey') is constructed and passed to `llmCoachHelpers.js`. Both files must be updated (FR-020).
- **CLI sweep targets:** `server/scripts/visualize_board.mjs` and `server/scripts/classify_all.mjs` both emit 'Red'/'Yellow' player labels to stdout. Only full player name strings change; threat map abbreviations (rm/rn/ym/yn) are identifiers — out of scope.
- **`_boardInstructions` lesson JSON fields:** Admin-only authoring notes (rendered in AdminLessonEditorScreen, not in player runtime). Out of scope for the green/gray sweep; excluded from the final verification grep.
- **`es.json` sweep:** Conditional — grep first; if Spanish disc-color strings found, normalize to 'verde'/'gris'. Expected no-op (zero hits currently).

**How to apply:** Run `/coordinate-implementation specs/032-repo-hygiene-tech-debt` to start implementation.
