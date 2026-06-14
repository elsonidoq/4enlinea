# Tasks: Global Light Color Scheme

**Input**: Design documents from `specs/033-global-light-color-scheme/`
**Prerequisites**: plan.md ✅, spec.md ✅

**Tests**: No automated tests — this is a pure CSS/JSX token-plumbing change. Manual visual verification is the acceptance gate (spec §"Testing Standards").

**Organization**: Tasks reflect 3 user stories. All implementation changes (US1, US2, US3) land in a single atomic commit (FR-012). Visual acceptance and doc update follow in separate steps.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on in-progress tasks)
- **[Story]**: Maps to user story from spec.md
- All paths are relative to `connect-four/src/` unless noted

---

## Phase 1: Setup (Grep Verification)

**Purpose**: Empirically confirm the dark-token use count before touching any file. If the grep count differs from 16, halt and reconcile with the spec before proceeding. This is the sole prerequisite for the atomic commit.

**⚠️ CRITICAL**: Do NOT touch any file until T001 passes with exactly 16 hits.

- [ ] T001 Run dark-token grep across user-facing JSX to verify exactly 16 occurrences in exactly 7 files. Command: `rg 'var\(--(bg|surface|surface-2|surface-3|border|border-dim|text|text-sub|text-muted)\)' connect-four/src/ --glob '*.jsx' --glob '!**/pages/Admin*.jsx' --glob '!**/CurationWorkspace*' --glob '!**/CandidateDashboard*' --glob '!**/MultiMoveSequencer*' --glob '!**/PredicateChecklist*' --glob '!**/RejectModal*' --glob '!**/Board.jsx' --count-matches`. This prints a per-file occurrence count (e.g. `ChallengeScreen.jsx:4`). Sum all the numbers — expected total: 16. Note: one line in ChallengeScreen.jsx contains 3 matches; `--count-matches` counts occurrences, not lines, so the total is 16 even though there are only 14 matching lines. If the summed total ≠ 16, stop — do not proceed to T002.

**Checkpoint**: Grep confirms 16 uses. Atomic commit can now be built.

---

## Phase 2: Atomic Implementation (US1 + US2 + US3 — one commit, FR-012)

**Purpose**: All code changes for all three user stories land in a single commit. The `:root` flip (US1) immediately invalidates the 16 dark-token references; US2's `.dark-surface` block and US3's `.modal-card` removal must be present in the same commit or the app is broken mid-way. T002–T015 make all edits and stage all 9 files; the actual commit (T016) is deferred until T017–T020 QA all pass.

**⚠️ CRITICAL**: Do NOT commit any partial subset of T002–T015. Stage all 9 files together, but do NOT commit yet — T016 (commit) runs only after T017–T020 pass.

### US1 — index.css global block changes

Changes to `connect-four/src/index.css`. These 6 tasks edit different CSS blocks in the same file; apply them in order within the file.

- [ ] T002 [US1] Rewrite `:root` block in `connect-four/src/index.css`: replace `color-scheme: dark` → `color-scheme: light`; replace `color: var(--text)` → `color: var(--ink)`; replace `background: #060c14` → `background: #fbf4e8`; remove all 9 dark token variable declarations (`--bg`, `--surface`, `--surface-2`, `--surface-3`, `--border`, `--border-dim`, `--text`, `--text-sub`, `--text-muted`); replace the existing warning comment above `:root` with a one-liner: `/* Light default — dark surfaces use .dark-surface */` (FR-001–FR-004, FR-016)

- [ ] T003 [US2] Add `.dark-surface` block to `connect-four/src/index.css` immediately after the `:root` block (before `*, *::before, *::after`). Move the old dark-theme warning comment (removed from above `:root` in T002) to sit immediately above this new block. Block content: `color-scheme: dark; color: var(--text); background: var(--bg);` plus all 9 dark token vars: `--bg: #0d1520`, `--surface: #162032`, `--surface-2: #1e2d42`, `--surface-3: #253347`, `--border: #2d4060`, `--border-dim: #1a2840`, `--text: #e2eaf5`, `--text-sub: #8ba3c0`, `--text-muted: #4a6480` (FR-010)

- [ ] T004 [US1] Update `body` block in `connect-four/src/index.css`: replace `background: #060c14` → `background: #fbf4e8`; delete the entire `background-image` property declaration (its value is only the two atmospheric radial-gradients — removing just the gradient lines leaves a dangling declaration) (FR-005, FR-006)

- [ ] T005 [US1] Update `#root` block in `connect-four/src/index.css`: replace `background: var(--bg)` → `background: #fbf4e8` (literal hex, NOT `var(--bg-home)`) (FR-007)

- [ ] T006 [US1] Update `h1, h2, h3` rule in `connect-four/src/index.css`: replace `color: var(--text)` → `color: var(--ink)` (FR-008)

- [ ] T007 [US3] Remove `color-scheme: light` declaration from `.modal-card` block in `connect-four/src/index.css` (now redundant once `:root` is light) (FR-009, FR-016)

### US2 — AdminCuratePage.jsx wrapper

- [ ] T008 [US2] Refactor `connect-four/src/pages/AdminCuratePage.jsx` to wrap its conditional render in a single `.dark-surface` wrapper div: extract the conditional into a `const content = selection !== null ? <CurationWorkspace ... /> : <CandidateDashboard ... />;` variable, then return `<div className="dark-surface" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{content}</div>`. The flex sizing is required: `CurationWorkspace` uses `height: 100%` and `CandidateDashboard` uses `minHeight: 100%`, both resolved against the `#root` flex column — a bare wrapper div clips the dark background to content height only (FR-011)

### US1 — User-facing dark-token replacements (7 files, all parallelizable)

Apply the token map: `--border` → `--line`, `--border-dim` → `--line`, `--surface` → `--card`, `--surface-2` → `--line`, `--surface-3` → `--line`, `--text` → `--ink`, `--text-sub` → `--ink-soft`, `--text-muted` → `--ink-faint`.

- [ ] T009 [P] [US1] Replace 1 dark-token reference in `connect-four/src/components/MistakesGate.jsx` line 81: `var(--border)` → `var(--line)` (FR-013)

- [ ] T010 [P] [US1] Replace 1 dark-token reference in `connect-four/src/components/DeepRevealPane.jsx` line 199: `var(--border-dim)` → `var(--line)` (FR-013)

- [ ] T011 [P] [US1] Replace 2 dark-token references in `connect-four/src/screens/StatsScreen.jsx` lines 114 and 150: both `var(--border)` → `var(--line)` (FR-013)

- [ ] T012 [P] [US1] Replace 1 dark-token reference in `connect-four/src/screens/MistakesListScreen.jsx` line 169: `var(--border)` → `var(--line)` (FR-013)

- [ ] T013 [P] [US1] Replace 3 dark-token references in `connect-four/src/screens/PastGamesListScreen.jsx`: line 53 `var(--surface-2)` → `var(--line)`; lines 227 and 278 `var(--border)` → `var(--line)` (FR-013)

- [ ] T014 [P] [US1] Replace 4 dark-token references in `connect-four/src/screens/MistakeDetailScreen.jsx` lines 277, 300, 328, 361. All 4 are `var(--border)` → `var(--line)`. SPECIAL CASE at line 300: the ternary is `resolving ? 'var(--border)' : 'var(--green)'` — replace only `var(--border)` → `var(--line)`; do NOT touch `var(--green)` (FR-013)

- [ ] T015 [P] [US1] Replace 4 dark-token references in `connect-four/src/screens/ChallengeScreen.jsx`: line 478 `var(--text-sub)` → `var(--ink-soft)`; line 480 `var(--surface-3)` → `var(--line)`; line 480 `var(--surface-2)` → `var(--line)`; line 480 `var(--text)` → `var(--ink)` (FR-013)

### Stage all changes (commit deferred — see T016 in Phase 3)

After completing T002–T015, stage all 9 changed files: `connect-four/src/index.css`, `connect-four/src/pages/AdminCuratePage.jsx`, and the 7 user-facing JSX files. Verify with `git diff --cached` (or `git status`) that exactly these 9 files are staged and no others. Do NOT commit yet — T016 commits only after T017–T020 all pass.

**Checkpoint**: All 9 files staged. T017–T020 QA can now run against the staged working tree.

---

## Phase 3: Acceptance Verification + Atomic Commit (US1 + US2 + US3)

**Purpose**: Run QA against the staged working tree (before committing), then seal the atomic commit once all checks pass. T017–T020 are prerequisites for T016. If any check fails, fix the working-tree files and re-run the failing check before proceeding to T016.

**⚠️ MANDATORY HUMAN GATE**: T017 and T018 are human visual passes. A human must physically open the app in a browser and inspect every route (T017) and the curation tool (T018). These cannot be skipped or delegated to grep. T016 (commit) must not run until both T017 and T018 are signed off by a human.

**Independent Test for US1**: Open the app and navigate every route in `connect-four/src/screenRegistry.jsx`. All text must be legible (dark ink on cream background). No invisible text.

**Independent Test for US2**: Open `/admin/curate` (both `CandidateDashboard` and `CurationWorkspace` views) and confirm dark background with light text, visually unchanged from pre-flip.

- [ ] T017 [US1] **MANDATORY HUMAN VISUAL PASS** — SC-001: open the app in the browser, navigate to every route listed in `connect-four/src/screenRegistry.jsx`, and confirm all text is legible (dark ink on cream `#fbf4e8` background) with no white-on-white or dark-on-dark combinations. Verify modals and bottom sheets show dark ink on white card background (spec User Story 1, Acceptance Scenarios 1–3). This runs against the staged working tree (before T016 commits). T016 must not proceed until this passes.

- [ ] T018 [US2] **MANDATORY HUMAN VISUAL PASS** — SC-002: open `/admin/curate` in the browser; confirm `CandidateDashboard` shows dark background (`#0d1520`) and light text (`#e2eaf5`); select a puzzle category and confirm `CurationWorkspace` also shows dark background with light text; verify the board shim in `CurationWorkspace` renders without broken colors (FR-014 — `shimStyle()` in `Board.jsx` uses `--bg` and `--border-dim` which now resolve via the `.dark-surface` ancestor). This runs against the staged working tree (before T016 commits). T016 must not proceed until this passes.

- [ ] T019 Run SC-003 grep to confirm zero unexpected dark-token refs in user-facing files. Command: `rg 'var\(--(bg|surface|surface-2|surface-3|border|border-dim|text|text-sub|text-muted)\)' connect-four/src/ --glob '*.jsx' --glob '!**/pages/Admin*.jsx' --glob '!**/CurationWorkspace*' --glob '!**/CandidateDashboard*' --glob '!**/MultiMoveSequencer*' --glob '!**/PredicateChecklist*' --glob '!**/RejectModal*' --glob '!**/Board.jsx' -n`. Expected result: 0 matches. Any match is a real failure — fix the file and re-run before proceeding to T016.

- [ ] T020 Run SC-004 grep to confirm zero dark-token refs remain in `:root`. Command: `rg '\-\-(bg|surface|surface-2|surface-3|border|border-dim|text|text-sub|text-muted)\s*:' connect-four/src/index.css -n`. Expected: all matches are inside the `.dark-surface` block, none inside `:root`. Manually confirm the `:root` block has `color-scheme: light`, `color: var(--ink)`, and `background: #fbf4e8` (SC-004, SC-005). Fix and re-run if needed before proceeding to T016.

- [ ] T016 Once T017, T018, T019, and T020 all pass: create the single atomic commit containing all 9 staged files (`connect-four/src/index.css`, `connect-four/src/pages/AdminCuratePage.jsx`, and the 7 user-facing JSX files). Verify with `git diff --cached` that exactly these 9 files are staged and no others. Commit message must reference FR-012 atomicity (SC-006). Post-merge regressions are new defects tracked separately — do not amend this commit.

**Checkpoint**: All acceptance checks pass and atomic commit is landed. Feature is visually correct, grep-clean, and committed.

---

## Phase 4: Architecture Doc Update (US1/US2/US3 — separate commit, FR-017)

**Purpose**: Update `docs/architecture/frontend-conventions.md` to reflect the new light-default model. This is a MANDATORY architecture doc update (Constitution Principle VIII). It lands in its own commit, immediately after T016 (the atomic commit).

**Independent Test for US3** (doc correctness): A developer reading `frontend-conventions.md` after this commit should understand: (a) `:root` is now light; (b) `.dark-surface` is the sole home of dark tokens; (c) the two-token-system pairing rule is unchanged.

- [ ] T021 [US3] Update `docs/architecture/frontend-conventions.md` — rewrite the CSS Token Systems section to reflect the new model: (a) remove the stale "Dark surfaces" row that mapped `index.css` to `:root` dark tokens; (b) add that `:root` is now `color-scheme: light` with `background: #fbf4e8` and `color: var(--ink)` — all user-facing surfaces inherit these defaults; (c) add that `.dark-surface` (defined in `index.css`) is the sole home of the 9 dark tokens and `color-scheme: dark` — any component on a dark surface MUST be a descendant of `.dark-surface`; (d) keep the two-token-system pairing rule but update its enforcement point; (e) delete the "White cards on dark pages" note — the equivalent post-flip concern is: a dark component placed in a light context without `.dark-surface` will have unresolved tokens (visible failure, not silent); (f) update any cross-reference to `project_dark_global_theme.md` to reflect that the global theme is now light. IMPORTANT: Read `connect-four/src/index.css` directly to understand the post-flip state — do NOT rely on the stale doc text (FR-017)

- [ ] T022 Stage only `docs/architecture/frontend-conventions.md` and commit. Verify with `git diff --cached` that no other files are staged. This commit must be separate from T016 (SC-006 requires Commit 1 and Commit 2 to be distinct git commits).

**Checkpoint**: Architecture doc reflects the new model. Feature is complete and documented.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Grep verify)**: No dependencies — start here
- **Phase 2 (Edits + stage)**: Depends on T001 passing with exactly 16 summed occurrences — BLOCKS all implementation. Ends with all 9 files staged but not yet committed.
- **Phase 3 (QA + commit)**: T017–T020 run against the staged working tree (no commit yet). T016 commits only after T017, T018, T019, and T020 all pass.
- **Phase 4 (Doc update)**: Depends on T016 (atomic commit) landing — doc should not be committed before the feature is verified correct and committed.

### Hard Ordering Constraint

T001 → T002–T015 (all staged, not committed) → T017–T020 (QA against staged tree) → T016 (commit) → T021–T022

**T016 cannot be split.** Committing the `:root` flip (T002) without the `.dark-surface` block (T003), the AdminCuratePage wrapper (T008), or the 7 user-facing replacements (T009–T015) produces broken app state (invisible text or broken curation tool) in the committed code. All 9 files must be staged together; T016 is the single commit that seals them, and it runs only after T017–T020 pass.

### Within Phase 2 (Atomic Commit)

- T002–T007: sequential edits to the same file (`index.css`) — apply in any order, but keep in one edit session
- T003 must come after T002 (the comment being moved from above `:root` must be placed above `.dark-surface`)
- T008: independent of T002–T007 (different file) — can be done in parallel
- T009–T015: all independent of each other (different files) — can be done in parallel with each other and with T008

### User Story Dependencies

- **US1 (P1)**: T002, T004–T006, T009–T015 — light global flip + 7-file sweep
- **US2 (P1)**: T003, T008 — dark-surface block + AdminCuratePage wrapper
- **US3 (P2)**: T007, T021–T022 — modal-card cleanup + doc update
- All three stories are implementation-complete only when T016 is committed

---

## Parallel Opportunities

### Within Phase 2 (after T002–T007 complete on index.css)

```bash
# These 8 tasks can run in parallel — all different files, no shared dependencies:
T008: AdminCuratePage.jsx wrapper
T009: MistakesGate.jsx (1 replacement)
T010: DeepRevealPane.jsx (1 replacement)
T011: StatsScreen.jsx (2 replacements)
T012: MistakesListScreen.jsx (1 replacement)
T013: PastGamesListScreen.jsx (3 replacements)
T014: MistakeDetailScreen.jsx (4 replacements — note special case at line 300)
T015: ChallengeScreen.jsx (4 replacements)
```

### Within Phase 3 (T017–T020 can run in parallel; T016 runs after all four pass)

```bash
T017: Visual QA all routes (browser) — mandatory human pass
T018: Visual QA /admin/curate (browser) — mandatory human pass
T019: SC-003 grep (terminal)
T020: SC-004 grep (terminal)
# After all four pass:
T016: Atomic commit
```

---

## Implementation Strategy

### Minimum Viable (US1 + US2 required for any ship — they're both P1)

1. Complete Phase 1: T001 (grep verify — sum per-file counts, expect 16)
2. Complete Phase 2: T002–T015 (all edits made, all 9 files staged — do NOT commit yet)
3. Complete Phase 3 QA: T017–T020 (browser QA + grep checks against staged working tree)
4. **STOP and VALIDATE** — if any check fails, fix and re-run before proceeding to T016
5. T016 — commit atomically (only after T017–T020 all pass)
6. Complete Phase 4: T021–T022 (doc update + separate commit)

### Single-developer execution order (recommended)

1. T001 — grep verify (sum `--count-matches` output, expect 16 total)
2. Edit `connect-four/src/index.css` (T002 → T003 → T004 → T005 → T006 → T007 in sequence)
3. Edit `connect-four/src/pages/AdminCuratePage.jsx` (T008)
4. Edit the 7 user-facing JSX files (T009–T015, any order)
5. Stage all 9 files (`git add` the 9 files); verify with `git diff --cached` — do NOT commit yet
6. T017–T020 — browser QA (mandatory human for T017/T018) + grep checks against staged tree
7. T016 — commit atomically (all 4 QA checks must pass first)
8. T021–T022 — doc update + separate commit

---

## Notes

- [P] tasks = different files, no dependencies on in-progress tasks in the same group
- [Story] label maps each task to its user story for traceability
- The atomicity constraint (FR-012) is the dominant scheduling rule — it overrides the usual "one story per commit" advice
- T014 has a special case: line 300 is a ternary `'var(--border)' : 'var(--green)'` — only replace `--border`, never touch `var(--green)`
- `Board.jsx` shimStyle() uses `--bg` and `--border-dim` intentionally — FR-014 says do NOT modify it; T018 verifies it renders correctly via the `.dark-surface` ancestor
- `AdminLessonsPage.jsx` has zero dark-token dependencies — no task needed (FR-015)
- `tokens.css` is NOT touched — its pairing-rule comment remains accurate after the flip
- The `index.css` header comment update (one-liner above `:root`) is part of T002, not a separate task
