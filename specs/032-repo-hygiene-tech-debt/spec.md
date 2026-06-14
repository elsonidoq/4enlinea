# Feature Specification: Repo Hygiene & Tech-Debt Sweep

**Feature Branch**: `032-repo-hygiene-tech-debt`
**Created**: 2026-06-13
**Status**: Draft

## Overview

Remove all dead screens, dead components, and dead server modules from the codebase, and replace every user-facing "red"/"yellow" disc label with the canonical "green"/"gray" terminology. The result is a cleaner repository surface for all subsequent epics, with no behaviour changes for users.

The epic has two independent parts:

- **Part A — Dead-code audit & removal**: Enumerate all dead files using a rigorous transitive-reachability model, produce a written inventory, then delete only the confirmed-dead ones.
- **Part B — Green/gray terminology sweep**: Find every "red"/"yellow" string that reaches a user (UI, i18n, lesson content, CLI output) and rename it to "green"/"gray", without touching the internal board-cell enum.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Dead-code inventory and deletion (Priority: P1)

A developer opens the codebase to work on a new feature. They can find the screens and components that exist without having to mentally filter out files that no longer serve any purpose.

**Why this priority**: Dead screens and dead server modules are the highest-leverage cleanup — they impose a cognitive tax on every developer touching the tree, and their presence makes "is this file safe to change?" harder to answer. Removing them before subsequent epics reduces future rework.

**Independent Test**: After deletion, `npm run test:fast` inside `connect-four/` exits 0. `npm run lint` inside `connect-four/` produces ≤ the pre-epic baseline error count (zero new errors introduced; the codebase has ~170 pre-existing lint errors on unrelated files that are not cleared by this epic). `rg "PlaceholderScreen|PuzzlesPage" src/` returns no hits. Each deleted file has no remaining import references.

**Acceptance Scenarios**:

1. **Given** the audit is complete, **When** a file has DELETE verdict, **Then** the file is removed from the repository and all import references to it are also removed.
2. **Given** the audit is complete, **When** a file has SURFACE verdict, **Then** the file is present in the inventory with an explicit reason, and it is NOT deleted.
3. **Given** the audit is complete, **When** a file has DEFER verdict, **Then** the file is present in the inventory with the owner's keep-rationale, and it is NOT deleted.
4. **Given** all DELETE-verdict files have been removed, **When** `npm run test:fast` is run inside `connect-four/`, **Then** it exits with code 0.
5. **Given** all DELETE-verdict files have been removed, **When** `npm run lint` is run inside `connect-four/`, **Then** the ESLint error count is ≤ the pre-epic baseline recorded in `debt-inventory.md` (zero new errors introduced by this epic's changes).

---

### User Story 2 — Debt inventory document (Priority: P1)

A developer can open a single document and see every file that was audited during this sweep, its verdict, and the exact reason for that verdict, so that future contributors understand which files were deliberately kept and why.

**Why this priority**: The inventory is a prerequisite for deletions (decisions must be recorded before code is removed) and a durable reference for future maintainers.

**Independent Test**: The file `specs/032-repo-hygiene-tech-debt/debt-inventory.md` exists and has a row for every audited file, with columns File | Category | Verdict | Reason. No row has an empty Reason cell.

**Acceptance Scenarios**:

1. **Given** the audit runs, **When** any file in `src/screens/`, `src/pages/`, `src/components/`, `src/lib/`, `src/context/`, `src/store/`, or `server/` is evaluated, **Then** it appears in the inventory.
2. **Given** the inventory exists, **When** a reviewer reads the DELETE rows, **Then** each row cites the specific dead-check(s) that passed (e.g., "not in SCREENS map, not lazy-loaded in App.jsx, no go() call, no URL_MAP entry, no production importer found").
3. **Given** the inventory exists, **When** a reviewer reads the SURFACE rows, **Then** each row explains the specific ambiguity that prevented a DELETE verdict.

---

### User Story 3 — Green/gray terminology sweep (Priority: P2)

A player interacting with the app never sees the words "red" or "yellow" when the text is describing disc colors. CLI tool output, lesson text, and i18n catalogs all use "green" and "gray" consistently.

**Why this priority**: This is user-facing correctness and brand consistency. It is lower priority than dead-code cleanup (which reduces developer tax) but must ship before subsequent UI epics build on top of stale copy.

**Independent Test**: `rg -iw "yellow|red" connect-four/src/i18n/ connect-four/lessons/` returns zero hits that refer to disc colors. The same search in CLI script stdout strings returns zero disc-color hits. `npm run test:fast` passes, confirming no internal cell enum was renamed.

**Acceptance Scenarios**:

1. **Given** the sweep is complete, **When** any i18n string in `en.json` or `es.json` describes a disc or player color, **Then** it reads "green" or "gray", not "red" or "yellow".
2. **Given** the sweep is complete, **When** any lesson JSON file under `lessons/` contains copy describing a disc or player, **Then** it reads "green" or "gray".
3. **Given** the sweep is complete, **When** a CLI/script tool writes disc-color output to stdout, **Then** the output reads "green" or "gray".
4. **Given** the sweep is complete, **When** `npm run test:fast` runs inside `connect-four/`, **Then** all tests pass (confirming that internal cell enum values `'red'`/`'yellow'` were not renamed).
5. **Given** the sweep is complete, **When** `rg "'red'\|'yellow'" connect-four/src/lib/board.js connect-four/src/components/Board.jsx` is run, **Then** those files still contain `'red'` and `'yellow'` as cell values (internal enum unchanged).

---

### Edge Cases

- A file in `src/screens/` that is not in the SCREENS map but IS imported by a live component (e.g., as a shared sub-panel) — must receive DEFER or SURFACE, never DELETE.
- A server script with a `process.argv` block but ALSO a hardcoded default that runs without arguments — the `process.argv` signal is sufficient to classify it as a server entrypoint (alive).
- `server/scripts/debug-immediate-threat.js` has a hardcoded movestring and no `process.argv` call; it cannot be inferred alive from standard entrypoint signals. Must receive SURFACE verdict.
- An i18n string that contains the word "red" as part of a non-disc-color phrase (e.g., a button labeled "Redirect") — must NOT be changed; only disc-color instances are in scope.
- `boardSpecToBoard` maps `'g'`→`'red'` and `'d'`→`'yellow'`; these string literals appear in source code as internal enum values, not user-facing text, and MUST NOT be changed.
- `playerName` variable in `server/llmCoachHelpers.js` uses `'Green'`/`'Grey'`; the sweep MUST normalize `'Grey'` → `'Gray'` — this is NOT a no-op.
- `getBoardVisualization` in `connect-four/server/scripts/visualize_board.mjs` substitutes `R→Green`, `Y→Grey`; the sweep MUST normalize `'Grey'` → `'Gray'` — this is NOT a no-op.

---

## Requirements *(mandatory)*

### Functional Requirements — Part A: Dead-code Audit & Removal

**FR-001**: Before any file is deleted, the implementer MUST produce the debt inventory document at `specs/032-repo-hygiene-tech-debt/debt-inventory.md` with columns: File | Category | Verdict | Reason.

**FR-002**: The audit MUST cover at minimum: `connect-four/src/screens/`, `connect-four/src/pages/`, `connect-four/src/components/`, `connect-four/src/lib/`, `connect-four/src/context/`, `connect-four/src/store/`, `connect-four/server/` (root), and `connect-four/server/scripts/`.

**FR-003**: Each audited file MUST receive exactly one of three verdicts: DELETE, SURFACE, or DEFER. No other verdict categories are permitted.

**FR-004**: A screen file (`src/screens/*.jsx` or `src/pages/*.jsx`) MUST receive DELETE verdict only when ALL FOUR of the following are true:
  1. Its export name is not a value in the `SCREENS` map in `connect-four/src/lib/screenRegistry.jsx`
  2. It is not lazy-loaded in `connect-four/src/App.jsx`
  3. It is not transitively reachable from any production importer in `src/` (test-only imports do not count)
  4. It has no `go('<key>')` call anywhere in `src/` that references its screen key, AND it has no entry in `URL_MAP` in `connect-four/src/lib/urlMapping.js`

**FR-005**: A component or lib utility file MUST receive DELETE verdict only when it is not transitively reachable from any production importer in `src/` or `server/` (test-only imports do not count).

**FR-006**: A server module MUST receive DELETE verdict only when it is not transitively reachable from the server entrypoint roster. The server entrypoint roster is: `server/index.js`, `server/migrate.js`, all targets listed in `connect-four/package.json` `"scripts"`, all files that contain a `process.argv` reference or `require.main === module` check, and all `*.test.*` files.

**FR-007**: `connect-four/src/pages/PuzzlesPage.jsx` MUST be assigned DELETE verdict (pre-audited: not in SCREENS map, not lazy-loaded in App.jsx, no production importer found in `src/`).

**FR-008**: `connect-four/src/screens/PlaceholderScreen.jsx` MUST be assigned DELETE verdict (pre-audited: not in SCREENS map, not lazy-loaded in App.jsx, no production importer found).

**FR-009**: `connect-four/server/scripts/debug-immediate-threat.js` MUST be assigned SURFACE verdict (pre-audited: no `process.argv` call; purpose is ambiguous without owner clarification).

**FR-010**: After all DELETE-verdict files are removed, ALL import statements referencing deleted files MUST also be removed from any remaining source files.

**FR-011**: After deletions, `npm run test:fast` (run inside `connect-four/`) MUST exit with code 0.

**FR-012**: After deletions, `npm run lint` (run inside `connect-four/`) MUST produce an ESLint error count ≤ the pre-epic baseline recorded in `debt-inventory.md`. Zero new lint errors may be introduced by this epic's changes. Exit code need not be 0 — the codebase has ~170 pre-existing lint errors on files not touched by this epic.

---

### Functional Requirements — Part B: Green/Gray Terminology Sweep

**FR-013**: The implementer MUST run `rg -iw "yellow|red"` across `connect-four/src/`, `connect-four/server/`, `connect-four/lessons/`, `visualize_board.sh`, and `connect-four/server/scripts/` and review every hit for disc-color usage.

**FR-014**: Every i18n string in `connect-four/src/i18n/en.json` and `connect-four/src/i18n/es.json` that refers to a disc color MUST use the canonical color term. For English: "green" or "gray" (not "red" or "yellow"). For Spanish: "verde" or "gris" (not "rojo" or "amarillo"). If no disc-color strings are found in `es.json`, record the scan result as a no-op.

**FR-015**: Every string in lesson JSON files under `connect-four/lessons/` that describes a disc or player color MUST use "green" or "gray".

**FR-016**: Every CLI/script stdout string in `connect-four/server/scripts/` that describes a disc color MUST use "green" or "gray". The primary targets are `connect-four/server/scripts/visualize_board.mjs` and `connect-four/server/scripts/classify_all.mjs` (both emit player/disc-color labels to stdout); `visualize_board.sh` is a thin wrapper with no disc-color strings of its own.

**FR-017**: The internal board-cell enum values `'red'` and `'yellow'` (used as cell values in `board[row][col]` arrays, in `buildBoard`, in `boardSpecToBoard`, in Board component props, and throughout classifier/detector logic) MUST NOT be changed.

**FR-018**: CSS variable names, CSS class names, and CSS token names containing "red" or "yellow" are OUT OF SCOPE and MUST NOT be changed.

**FR-019**: Code comments, variable names, and identifiers containing "red" or "yellow" are OUT OF SCOPE and MUST NOT be changed.

**FR-020**: The implementer MUST normalize `'Grey'` → `'Gray'` in `server/llmCoachHelpers.js` wherever `playerName` emits `'Green'`/`'Grey'` for LLM prompt construction, AND in `server/explainContext.js` wherever `playerName` or `opponentName` is assigned `'Grey'`. Both files are required changes, not no-ops; the current code uses "Grey" which contradicts the canonical "Gray" spelling.

**FR-021**: The implementer MUST normalize `'Grey'` → `'Gray'` in `connect-four/server/scripts/visualize_board.mjs` wherever `getBoardVisualization` substitutes `Y→Grey` in board visualization output. This is a required change, not a no-op; the current code uses "Grey" which contradicts the canonical "Gray" spelling.

**FR-022**: After the sweep, `npm run test:fast` (run inside `connect-four/`) MUST exit with code 0, confirming that no internal enum value was inadvertently renamed.

---

### Key Entities

- **Debt inventory** (`specs/032-repo-hygiene-tech-debt/debt-inventory.md`): A markdown table listing every audited file with its File path, Category (screen/component/lib/server/script), Verdict (DELETE/SURFACE/DEFER), and Reason. Created before any file is deleted; updated with final verdicts after deletion.

- **Dead file**: A file that is not transitively reachable from the entrypoint roster under the rules in FR-004 through FR-006.

- **Internal board-cell enum**: The string literals `'red'` and `'yellow'` used as `board[row][col]` cell values throughout the codebase. These are internal identifiers, not user-facing text. They are the boundary the sweep MUST NOT cross.

- **User-facing disc label**: Any string that is displayed to a user or written to stdout by a CLI tool that describes the color of a disc or player. These are the targets of Part B.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

**SC-001**: The debt inventory document exists at `specs/032-repo-hygiene-tech-debt/debt-inventory.md` with at least one row per audited file in `src/screens/`, `src/pages/`, `src/components/`, `src/lib/`, `src/context/`, `src/store/`, `server/` root, and `server/scripts/`.

**SC-002**: Every file assigned DELETE verdict is absent from the repository after the sweep (verified by `fd` or `find` on the deleted paths).

**SC-003**: `npm run test:fast` (inside `connect-four/`) exits with code 0 after all changes.

**SC-004**: `npm run lint` (inside `connect-four/`) produces an ESLint error count ≤ the pre-epic baseline recorded in `debt-inventory.md` (zero new errors introduced by this epic's changes).

**SC-005**: `rg -iw "yellow|red" connect-four/src/i18n/ connect-four/lessons/ | grep -v "userPerspective\|boardSpec\|goalPredicate\|correctCol\|_boardInstructions"` returns zero hits that refer to disc colors. (The `_boardInstructions` field in lesson JSON is an internal authoring note, not user-facing text, and is excluded from this check.)

**SC-006**: A search for `'red'` and `'yellow'` as cell-value literals in `connect-four/src/lib/board.js` and `connect-four/src/components/Board.jsx` still returns matches (confirming the internal enum was not renamed).

**SC-007**: No import statement anywhere in `connect-four/src/` or `connect-four/server/` references a deleted file.

---

## Assumptions

- `npm run test:fast` is the correct test command (omits `candidate-generator.test.js`, which hangs due to solver IPC deadlock). `npm test` is NOT used.
- Test-only imports (files imported exclusively by `*.test.*` files) do not constitute a "live" reference for the purposes of the dead-code check.
- The audit operates at **file granularity only** — per-symbol dead-export pruning is out of scope.
- The SCREENS map in `screenRegistry.jsx` is authoritative for screen reachability (17 entries as of this spec); changes to it made by concurrent epics are not in scope.
- The two lazy-loaded entry points in `App.jsx` are `AdminCuratePage` (at `/admin`) and `AdminLessonsPage` (at `/admin/lessons`). No other lazy-loaded components exist in `App.jsx`.
- "Gray" (not "grey") is the canonical English spelling for the disc color in user-facing copy. The canonical Spanish equivalents are "verde" (green) and "gris" (gray).
- `getBoardVisualization` in `visualize_board.mjs` and `playerName` in `llmCoachHelpers.js` currently use "Grey" (not "Gray") and MUST be normalized as part of this sweep (see FR-020, FR-021).
- The `visualize_board.sh` shell script at the project root contains no disc-color user-facing strings of its own; the actual output strings live in `connect-four/server/scripts/visualize_board.mjs`.
- No new screens or server modules will be added to the codebase while this epic is in flight (concurrent epic changes are out of scope).
