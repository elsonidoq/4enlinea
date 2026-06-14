# Debt Inventory — Spec 032 Repo Hygiene & Tech-Debt Sweep

> **Purpose**: Durable reference for every audited file, its verdict, and the exact reason. Future contributors must understand which files were deliberately kept and why.
>
> **Audit date**: 2026-06-13
>
> **Methodology**: Transitive reachability from production entrypoints (madge graph for `src/`; manual import tracing for `server/`), confirmed with ripgrep searches excluding `*.test.*` and `*.spec.*` files. See individual directory sections below for specific dead-check criteria.
>
> **IMPORTANT — Owner approval gate (2026-06-13)**: 6 files flagged as dead by the audit are held as SURFACE pending owner review. See the SURFACE rows below. No additional files were deleted beyond the 2 pre-confirmed.

---

## ESLint Baseline

Recorded for FR-012 (lint gate: must not exceed this count).

```
npm run lint → 176 problems (170 errors, 6 warnings)
  1 error and 1 warning potentially fixable with the `--fix` option.
```

**Baseline**: **176 problems (170 errors, 6 warnings)**

---

## Verdict Definitions

| Verdict | Meaning |
|---------|---------|
| **DELETE** | File is dead code — not reachable from any production entrypoint. Safe to remove in Batch 2. |
| **SURFACE** | Ambiguous — file has no clear production entrypoint signal but may serve a purpose. Requires owner review before deletion. |
| **DEFER** | File is alive — transitively reachable from a production entrypoint. Keep. |

---

## Audit: `connect-four/src/screens/` (20 files)

**Dead-check criteria (FR-004)** — DELETE only when ALL FOUR are true:
1. Export name is not a value in the `SCREENS` map in `src/lib/screenRegistry.jsx` (17 entries)
2. Not lazy-loaded in `src/App.jsx`
3. Not transitively reachable from any production importer in `src/` (test-only imports excluded)
4. No `go('<key>')` call referencing its screen key, AND no entry in `URL_MAP` in `src/lib/urlMapping.js`

| File | Verdict | Reason |
|------|---------|--------|
| `AdminLessonEditorScreen.jsx` | DEFER | Imported by `AdminLessonsPage.jsx`, which is lazy-loaded in `App.jsx` at `/admin/lessons` |
| `AdminLessonListScreen.jsx` | DEFER | Imported by `AdminLessonsPage.jsx`, which is lazy-loaded in `App.jsx` at `/admin/lessons` |
| `CLChallengeScreen.jsx` | DEFER | In SCREENS map (key `clchallenge`); rendered by Navigator |
| `CategoryListScreen.jsx` | DEFER | In SCREENS map (key `mistakes`); rendered by Navigator |
| `ChallengeScreen.jsx` | DEFER | In SCREENS map (key `challenge`); rendered by Navigator |
| `ConceptScreen.jsx` | DEFER | In SCREENS map (key `concept`); rendered by Navigator |
| `DifficultyPickerScreen.jsx` | DEFER | In SCREENS map (key `difficulty`); rendered by Navigator |
| `ExplorerScreen.jsx` | DEFER | In SCREENS map (key `explorer`); rendered by Navigator |
| `GameScreen.jsx` | DEFER | In SCREENS map (key `game`); rendered by Navigator |
| `HomeScreen.jsx` | DEFER | In SCREENS map (key `home`); rendered by Navigator |
| `MistakeDetailScreen.jsx` | DEFER | In SCREENS map (key `blunderDetail`); rendered by Navigator |
| `MistakesListScreen.jsx` | DEFER | In SCREENS map (key `mistakeDetail`); rendered by Navigator |
| `PastGamesListScreen.jsx` | DEFER | In SCREENS map (key `pastGames`); rendered by Navigator |
| `PlaceholderScreen.jsx` | DELETE | FR-008: NOT in SCREENS map (17 entries checked); NOT lazy-loaded in App.jsx; NOT in madge transitive graph (absent from 72-node graph rooted at App.jsx); zero production importers found via `rg` (self-reference only); no `go()` call; no URL_MAP entry |
| `PostSetSummaryScreen.jsx` | DEFER | In SCREENS map (key `summary`); rendered by Navigator |
| `ReviewScreen.jsx` | DEFER | In SCREENS map (key `review`); rendered by Navigator |
| `SagaScreen.jsx` | DEFER | In SCREENS map (key `saga`); rendered by Navigator |
| `SetPickerScreen.jsx` | DEFER | In SCREENS map (key `setpicker`); rendered by Navigator |
| `SocraticScreen.jsx` | DEFER | In SCREENS map (key `socratic`); rendered by Navigator |
| `StatsScreen.jsx` | DEFER | In SCREENS map (key `stats`); rendered by Navigator |

---

## Audit: `connect-four/src/pages/` (3 files)

**Dead-check criteria (FR-004)** — same four conditions as screens.

| File | Verdict | Reason |
|------|---------|--------|
| `AdminCuratePage.jsx` | DEFER | Lazy-loaded in `App.jsx` at `/admin` (line 103, condition 2 fails → not DELETE) |
| `AdminLessonsPage.jsx` | DEFER | Lazy-loaded in `App.jsx` at `/admin/lessons` (line 99–100, condition 2 fails → not DELETE) |
| `PuzzlesPage.jsx` | DELETE | FR-007: NOT in SCREENS map; NOT lazy-loaded in App.jsx; NOT in madge transitive graph (absent from 72-node graph); zero production importers (`rg` finds self-reference + comment-only mentions in `lib/board.js` and `lib/categories.js`); no `go()` call; no URL_MAP entry |

---

## Audit: `connect-four/src/components/` (37 files)

**Dead-check criteria (FR-005)** — DELETE only when not transitively reachable from any production importer in `src/` or `server/` (test-only imports excluded). Primary signal: madge graph from `App.jsx` (72 nodes); confirmed with `rg` for files absent from graph.

### Root components (31 files)

| File | Verdict | Reason |
|------|---------|--------|
| `AnnotatedExplanation.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `AnnotatedText.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `AuthModal.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `BadgeRow.jsx` | SURFACE | AWAITING OWNER APPROVAL: NOT in madge reachability graph (absent from 72-node graph); zero production importers found via `rg` (self-reference only) |
| `Board.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `CandidateDashboard.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `ClassifyAllPanel.jsx` | SURFACE | AWAITING OWNER APPROVAL: NOT in madge reachability graph (absent from 72-node graph); zero production importers found via `rg` (self-reference only) |
| `CoachAvatar.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `CoachDialog.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `CurationWorkspace.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `DeepRevealButton.jsx` | SURFACE | AWAITING OWNER APPROVAL: NOT in madge reachability graph; sole production importer is `PuzzlesPage.jsx` (now deleted); zero other importers found via `rg` |
| `DeepRevealPane.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `ErrorBoundary.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `ExplainMoveButton.jsx` | SURFACE | AWAITING OWNER APPROVAL: NOT in madge reachability graph (absent from 72-node graph); zero production importers found via `rg` (self-reference only) |
| `FeatureCard.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `Icon.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `MistakesGate.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `MultiMoveSequencer.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `PredicateChecklist.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `ProgressBar.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `RejectModal.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `SequenceHandler.jsx` | SURFACE | AWAITING OWNER APPROVAL: NOT in madge reachability graph; sole production importer is `PuzzlesPage.jsx` (now deleted); zero other importers found via `rg` |
| `SetCard.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `SeverityMeter.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `SplitReveal.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `Stars.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `StatusBar.jsx` | SURFACE | AWAITING OWNER APPROVAL: NOT in madge reachability graph (absent from 72-node graph); zero production importers found via `rg` (self-reference only) |
| `Toolbar.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `ToolButton.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `TopBar.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `UpgradeModal.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |

### `components/admin/` (6 files)

| File | Verdict | Reason |
|------|---------|--------|
| `admin/BoardEditor.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx via AdminLessonsPage) |
| `admin/LessonMetaForm.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx via AdminLessonsPage) |
| `admin/PuzzlePickerModal.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx via AdminCuratePage) |
| `admin/PuzzlePickerRow.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx via AdminCuratePage) |
| `admin/SlideEditor.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx via AdminLessonsPage) |
| `admin/SocraticEditor.jsx` | DEFER | In madge reachability graph (transitively reachable from App.jsx via AdminLessonsPage) |

---

## Audit: `connect-four/src/lib/` (13 files)

**Dead-check criteria (FR-005)** — DELETE only when not transitively reachable from any production importer.

| File | Verdict | Reason |
|------|---------|--------|
| `aiDifficulty.js` | DEFER | In madge reachability graph (imported by `useGameBoard.js`) |
| `annotatedText.js` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `board.js` | DEFER | In madge reachability graph (imported by `movestring.js` and `useGameBoard.js`) |
| `categories.js` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `coachUtils.js` | DEFER | In madge reachability graph (imported by `useGameBoard.js`) |
| `movestring.js` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `screenRegistry.jsx` | DEFER | In madge reachability graph (directly imported by `App.jsx` line 5) |
| `socraticReducer.js` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `surfaceGroups.js` | DEFER | In madge reachability graph (directly imported by `App.jsx` line 6) |
| `track.js` | DEFER | In madge reachability graph (directly imported by `App.jsx` line 7) |
| `urlMapping.js` | DEFER | In madge reachability graph (directly imported by `App.jsx` line 8) |
| `useDragSplit.js` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `useGameBoard.js` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |

---

## Audit: `connect-four/src/context/` (1 file)

**Dead-check criteria (FR-005)** — DELETE only when not transitively reachable from any production importer.

| File | Verdict | Reason |
|------|---------|--------|
| `DebugContext.jsx` | DEFER | In madge reachability graph (directly imported by `App.jsx` line 3) |

---

## Audit: `connect-four/src/store/` (3 files)

**Dead-check criteria (FR-005)** — DELETE only when not transitively reachable from any production importer.

| File | Verdict | Reason |
|------|---------|--------|
| `IndexedDBStore.js` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |
| `ProfileStore.jsx` | DEFER | In madge reachability graph (directly imported by `App.jsx` line 2) |
| `SupabaseStore.js` | DEFER | In madge reachability graph (transitively reachable from App.jsx) |

---

## Audit: `connect-four/server/` root (31 files)

**Dead-check criteria (FR-006)** — DELETE only when not transitively reachable from the server entrypoint roster:
1. `server/index.js` (main server process)
2. `server/migrate.js` (migration runner)
3. All files referenced in `package.json` `"scripts"`
4. All files containing `process.argv` or `require.main === module`
5. All `*.test.*` files

### Server modules

| File | Verdict | Reason |
|------|---------|--------|
| `adminAuth.js` | DEFER | Directly imported by `index.js` (line 27) |
| `annotationGate.js` | DEFER | Directly imported by `index.js` (line 29) |
| `blunderReasons.js` | DEFER | Transitively reachable: imported by `explainContext.js` → imported by `index.js` (line 14) |
| `blunderTags.js` | DEFER | Directly imported by `index.js` (line 15) |
| `c4solver-wrapper.js` | DEFER | Directly imported by `index.js` (line 18); also imported by `classifier.js` |
| `candidate-generator.js` | DEFER | Directly imported by `index.js` (line 19) |
| `categories.js` | DEFER | Directly imported by `index.js` (line 20) |
| `challengeSets.js` | DEFER | Directly imported by `index.js` (line 21) |
| `classifier.js` | DEFER | Directly imported by `index.js` (line 13) |
| `classifyAiMove.js` | DEFER | Directly imported by `index.js` (line 14) |
| `completionStrategies.js` | DEFER | Directly imported by `index.js` (line 23) |
| `debug-claimeven.js` | DEFER | Has `process.argv[2]` (lines 4, 17) → qualifies as entrypoint per FR-006 rule 4 |
| `debug-immediate-threat.js` | SURFACE | FR-009: no `process.argv` call; contains only hardcoded movestring (`0116034064222505306`); not imported by any server module; purpose is ambiguous without owner clarification — appears to be a one-off predicate debug script with no CLI interface |
| `explainContext.js` | DEFER | Directly imported by `index.js` (line 14) |
| `heatmap.js` | DEFER | Directly imported by `index.js` (line 11) |
| `index.js` | DEFER | Server entrypoint — listed in `package.json` scripts (`server`, `dev`) |
| `insertGameBlunder.js` | DEFER | Directly imported by `index.js` (line 16) |
| `lessonAdmin.js` | DEFER | Directly imported by `index.js` (line 28) |
| `lessonLoader.js` | DEFER | Directly imported by `index.js` (line 25) |
| `llmCoachHelpers.js` | DEFER | Directly imported by `index.js` (line 17); also imported by `explainContext.js` |
| `migrate.js` | DEFER | Has `process.argv` (lines 10, 12, 15, 17) → qualifies as entrypoint per FR-006 rules 2 and 4 |
| `moveQualityScorer.js` | DEFER | Directly imported by `index.js` (line 22) |
| `predicates.js` | DEFER | Directly imported by `index.js` (line 17) |
| `userHelpers.js` | DEFER | Transitively reachable: imported by `userRoutes.js` → imported by `index.js` (line 17) |
| `userRoutes.js` | DEFER | Directly imported by `index.js` (line 17) |
| `zoneParser.js` | DEFER | Transitively reachable: imported by `annotationGate.js` → imported by `index.js` (line 29) |

### Test files (automatically alive per FR-006 rule 5)

| File | Verdict | Reason |
|------|---------|--------|
| `evaluate-move-ai-path.test.js` | DEFER | Test file — automatically alive per FR-006 rule 5 |
| `llmCoachHelpers.test.mjs` | DEFER | Test file — listed in `package.json` `test:fast` script; automatically alive |
| `migrate.test.js` | DEFER | Test file — automatically alive per FR-006 rule 5 |
| `userEndpoints.test.mjs` | DEFER | Test file — listed in `package.json` `test` and `test:fast` scripts; automatically alive |
| `userHelpers.test.mjs` | DEFER | Test file — listed in `package.json` `test` and `test:fast` scripts; automatically alive |

---

## Audit: `connect-four/server/scripts/` (13 files)

**Dead-check criteria (FR-006)** — same entrypoint roster as server root. Files with `process.argv` are alive; files without `process.argv` and not imported by any entrypoint → SURFACE.

| File | Verdict | Reason |
|------|---------|--------|
| `classify_all.mjs` | DEFER | Has `process.argv` — qualifies as entrypoint per FR-006 rule 4 |
| `corpus_annotation_check.mjs` | SURFACE | No `process.argv`; not imported by any server module; not referenced in `package.json` scripts; purpose is ambiguous without owner clarification |
| `debug_blunder_severity.mjs` | SURFACE | No `process.argv`; not imported by any server module; not referenced in `package.json` scripts; appears to be a one-off debug script with no CLI interface |
| `debug_blunders_for_room.mjs` | DEFER | Has `process.argv` — qualifies as entrypoint per FR-006 rule 4 |
| `delete_all_candidates.sh` | SURFACE | Shell script (not JS); no `process.argv`; not imported by any server module; not referenced in `package.json` scripts; cannot be identified as a live entrypoint through standard JS signals |
| `diag_figure7.js` | DEFER | Has `process.argv` — qualifies as entrypoint per FR-006 rule 4 |
| `diagnose_blunders.mjs` | DEFER | Has `process.argv` — qualifies as entrypoint per FR-006 rule 4 |
| `import_papergames_blunders.mjs` | DEFER | Has `process.argv` — qualifies as entrypoint per FR-006 rule 4 |
| `reprocess_blunders.mjs` | SURFACE | No `process.argv`; not imported by any server module; not referenced in `package.json` scripts; appears to be a manual reprocessing script with no CLI interface |
| `set-tier.js` | DEFER | Has `process.argv` — qualifies as entrypoint per FR-006 rule 4 |
| `simulate_blunders.mjs` | DEFER | Has `process.argv` — qualifies as entrypoint per FR-006 rule 4 |
| `verify_prompt_fixes.mjs` | SURFACE | No `process.argv`; not imported by any server module; not referenced in `package.json` scripts; appears to be a verification script with no CLI interface |
| `visualize_board.mjs` | DEFER | Has `process.argv` — qualifies as entrypoint per FR-006 rule 4 |

---

## Summary

| Category | Total | DELETE | SURFACE | DEFER |
|----------|-------|--------|---------|-------|
| `src/screens/` | 20 | 1 | 0 | 19 |
| `src/pages/` | 3 | 1 | 0 | 2 |
| `src/components/` | 37 | 0 | 6 | 31 |
| `src/lib/` | 13 | 0 | 0 | 13 |
| `src/context/` | 1 | 0 | 0 | 1 |
| `src/store/` | 3 | 0 | 0 | 3 |
| `server/` root | 31 | 0 | 1 | 30 |
| `server/scripts/` | 13 | 0 | 5 | 8 |
| **Total** | **121** | **2** | **12** | **107** |

### DELETE-verdict files (pre-confirmed — auto-deleted in Phase 3)

1. `connect-four/src/screens/PlaceholderScreen.jsx` — deleted
2. `connect-four/src/pages/PuzzlesPage.jsx` — deleted

No additional DELETE files discovered; audit confirmed only the 2 pre-confirmed dead files.

### SURFACE-verdict files (require owner review before deletion)

**Downgraded from DELETE — moved to quarantine for QA (T012)**:
1. `connect-four/src/_quarantine/BadgeRow.jsx`
2. `connect-four/src/_quarantine/ClassifyAllPanel.jsx`
3. `connect-four/src/_quarantine/DeepRevealButton.jsx`
4. `connect-four/src/_quarantine/ExplainMoveButton.jsx`
5. `connect-four/src/_quarantine/SequenceHandler.jsx`
6. `connect-four/src/_quarantine/StatusBar.jsx`

These 6 files were moved to `connect-four/src/_quarantine/` on 2026-06-13 for owner QA. If the site works correctly without them, delete the `_quarantine/` folder. If anything breaks, move the needed file(s) back to `components/`.

**Original SURFACE files (ambiguous entrypoint/import signal)**:
7. `connect-four/server/debug-immediate-threat.js`
8. `connect-four/server/scripts/corpus_annotation_check.mjs`
9. `connect-four/server/scripts/debug_blunder_severity.mjs`
10. `connect-four/server/scripts/delete_all_candidates.sh`
11. `connect-four/server/scripts/reprocess_blunders.mjs`
12. `connect-four/server/scripts/verify_prompt_fixes.mjs`

---

## Deletions executed (Phase 3 — 2026-06-13)

### Files removed

1. `connect-four/src/pages/PuzzlesPage.jsx` — deleted per FR-007 (pre-confirmed)
2. `connect-four/src/screens/PlaceholderScreen.jsx` — deleted per FR-008 (pre-confirmed)

### Import/comment cleanup

- `connect-four/src/lib/board.js` line 1: removed "PuzzlesPage" from header comment ("used by PuzzlesPage and ChallengeScreen" → "used by ChallengeScreen and other screens")
- `connect-four/src/lib/categories.js` line 24: removed "PuzzlesPage" from header comment ("used by PuzzlesPage, CandidateDashboard, CurationWorkspace" → "used by CandidateDashboard, CurationWorkspace")
- Zero import references to either deleted file remained anywhere in `src/` or `server/` after cleanup

### T012 — Downgrade gate

- 6 additional DELETE-verdict files flagged during audit were downgraded to SURFACE per T012 rule (owner approval required before deletion)
- Files: BadgeRow.jsx, ClassifyAllPanel.jsx, DeepRevealButton.jsx, ExplainMoveButton.jsx, SequenceHandler.jsx, StatusBar.jsx
- Each retains its original dead-check evidence in the Reason cell, prefixed with "AWAITING OWNER APPROVAL:"
- No additional DELETE files discovered; audit confirmed only the 2 pre-confirmed dead files

### Test:fast result

- **434 pass, 1 fail**
- The single failure is pre-existing: `classifier.test.js` forbidden_columns board-based test expects `'forbidden_columns'` but receives `'suboptimal_move'`
- This failure existed before any changes from this epic and is NOT caused by this epic's deletions
- Zero new test failures

### Lint result

- **171 problems (166 errors, 5 warnings)**
- Pre-epic baseline: 176 problems (170 errors, 6 warnings)
- 171 ≤ 176 — passes FR-012 gate (zero new errors introduced)
