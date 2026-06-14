# Implementation Plan: Global Light Color Scheme

**Branch**: `101-new-design` | **Date**: 2026-06-14 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/033-global-light-color-scheme/spec.md`

## Summary

Flip the global CSS cascade root from dark to light by rewriting `:root` in `connect-four/src/index.css`, moving all 9 dark token definitions to a new `.dark-surface` scoped block, wrapping `AdminCuratePage`'s render in `<div className="dark-surface">`, and replacing all 16 dark-token references in 7 user-facing JSX files with their light equivalents — all in a single atomic commit. A separate second commit updates `docs/architecture/frontend-conventions.md` only (`tokens.css` and `index.css` header comment updates are handled in Commit 1).

No server changes, no DB migrations, no new design tokens. All light replacements already exist in `connect-four/src/styles/tokens.css`.

## Technical Context

**Language/Version**: JavaScript (ES2022), React 18, CSS custom properties  
**Primary Dependencies**: Vite (build), React (UI) — no new dependencies introduced  
**Storage**: N/A (pure frontend change)  
**Testing**: Manual visual verification per Constitution §III (UI features must be manually verified on golden path and at least one edge case). No automated tests required for pure CSS/token plumbing.  
**Target Platform**: Web (mobile-first, 480px max-width `#root`)  
**Project Type**: Web application — frontend-only  
**Performance Goals**: No performance impact; CSS custom property resolution is instantaneous  
**Constraints**: Must not break the curation admin tool at `/admin/curate`. The `:root` flip and all dependent changes MUST land atomically (FR-012).  
**Scale/Scope**: 2 CSS files + 1 JSX page + 7 JSX screens/components + 1 architecture doc

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I — Explanation Engine (N/A)
No move evaluation, pattern labels, or natural-language annotations are introduced or modified. ✅ Not applicable.

### Principle II — Code Quality & Simplicity
- No speculative abstractions introduced — this is pure token plumbing.
- The `.dark-surface` scoped block is the single mechanism for dark-surface isolation; no per-component workarounds remain after this change.
- The storage-agnostic interface is not touched. ✅ Compliant.

### Principle III — Testing Standards
- UI features must be manually verified on golden path and at least one edge case. Covered by SC-001 (all routes visual pass) and SC-002 (curation admin dark rendering).
- No solver, pattern classification, or puzzle goal logic is modified. ✅ Compliant.

### Principle IV — UX Consistency
- No board visualizations, color scales, or terminology are changed. Disc colors are unchanged (FR-014, FR-015).
- All light-surface token replacements are drawn from the existing `tokens.css` system — the two-token-system pairing rule is maintained. ✅ Compliant.

### Principle V — Performance (N/A)
No new network calls, no solver queries, no LLM calls. ✅ Not applicable.

### Principle VI — Implementation Methodology
- The 16-use count stated in the spec must be empirically verified by grep before any edits are made. This is a grounding fact; if it has drifted, the task list must be updated before proceeding.
- All affected files are identified (see Project Structure below). ✅ Compliant.

### Principle VII — Software Design Philosophy
- Explicit is better than implicit: `.dark-surface` makes the dark scope explicit rather than relying on global override chains.
- There should be one obvious way: dark surfaces use `.dark-surface`, light surfaces use `:root`. ✅ Compliant.

### Principle VIII — Documentation (MUST check before planning)
- [x] Architecture docs read: `docs/architecture/frontend-conventions.md` (two-token-system section, pairing rule, dark global theme references) — all read before this plan was drafted.
- [x] No undocumented conventions discovered that need documentation before planning continues.
- [x] A doc update task (FR-017) is included: `frontend-conventions.md` must be rewritten to reflect the new model post-flip. The stale header comment in `index.css` is refreshed in Commit 1 (moved from above `:root` to above `.dark-surface`). `tokens.css` is left untouched — its pairing-rule comment is still accurate. The doc update is in a separate commit immediately after the atomic commit.

## Project Structure

### Documentation (this feature)

```text
specs/033-global-light-color-scheme/
├── plan.md              # This file
├── research.md          # Skipped (no unknowns; see Phase 0 note)
├── data-model.md        # Skipped (no DB/entity changes)
├── quickstart.md        # Skipped (no new setup steps)
├── contracts/           # Skipped (no new API endpoints)
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

**Phase 0 note**: All unknowns are already resolved by the spec and grounded by the actual file state verified above. No research tasks are open. Phase 0 is satisfied in-plan.

### Source Code (files touched)

```text
connect-four/src/index.css                                    # CSS changes (Commit 1)
connect-four/src/pages/AdminCuratePage.jsx                    # JSX wrapper (Commit 1)
connect-four/src/screens/ChallengeScreen.jsx                  # 4 dark-token replacements (Commit 1)
connect-four/src/screens/MistakeDetailScreen.jsx              # 4 dark-token replacements (Commit 1)
connect-four/src/screens/PastGamesListScreen.jsx              # 3 dark-token replacements (Commit 1)
connect-four/src/screens/StatsScreen.jsx                      # 2 dark-token replacements (Commit 1)
connect-four/src/screens/MistakesListScreen.jsx               # 1 dark-token replacement (Commit 1)
connect-four/src/components/MistakesGate.jsx                  # 1 dark-token replacement (Commit 1)
connect-four/src/components/DeepRevealPane.jsx                # 1 dark-token replacement (Commit 1)
docs/architecture/frontend-conventions.md                     # Doc update (Commit 2)
```

**Verification-only (no code change needed):**
```text
connect-four/src/components/Board.jsx                         # shimStyle() — verify only (FR-014)
connect-four/src/pages/AdminLessonsPage.jsx                   # no dark tokens — verify only (FR-015)
```

## Complexity Tracking

No constitution violations. No complexity table needed.

---

## Phase 0: Research

**All unknowns are pre-resolved. No open research tasks.**

Grounding facts verified against actual source files before this plan was written:

| Fact | Verified value |
|---|---|
| Dark token grep across user-facing JSX | 16 uses across 7 files (matches spec) |
| `ChallengeScreen.jsx` dark tokens | lines 478 (`--text-sub`), 480 (`--surface-3`, `--surface-2`, `--text`) — 4 uses |
| `MistakeDetailScreen.jsx` dark tokens | lines 277, 300, 328, 361 — 4 uses of `--border`; line 300 is the ternary with `var(--green)` |
| `PastGamesListScreen.jsx` dark tokens | lines 53 (`--surface-2`), 227 (`--border`), 278 (`--border`) — 3 uses |
| `StatsScreen.jsx` dark tokens | lines 114 (`--border`), 150 (`--border`) — 2 uses |
| `MistakesListScreen.jsx` dark tokens | line 169 (`--border`) — 1 use |
| `MistakesGate.jsx` dark tokens | line 81 (`--border`) — 1 use |
| `DeepRevealPane.jsx` dark tokens | line 199 (`--border-dim`) — 1 use |
| `AdminCuratePage.jsx` current structure | bare conditional render with no wrapper div — needs wrapper added (FR-011) |
| `index.css` `:root` current state | `color-scheme: dark`, `color: var(--text)`, `background: #060c14`; 9 dark token vars |
| `index.css` `body` current state | `background: #060c14` + 2 atmospheric radial-gradients |
| `index.css` `#root` current state | `background: var(--bg)` |
| `index.css` `h1, h2, h3` current state | `color: var(--text)` |
| `index.css` `.modal-card` current state | has `color-scheme: light` (to be removed per FR-009) |
| `.dark-surface` block | does not yet exist in `index.css` (to be added per FR-010) |

**Token map (authoritative — from spec FR-013):**

| Dark token | Light replacement |
|---|---|
| `--border` | `--line` |
| `--border-dim` | `--line` |
| `--surface` | `--card` |
| `--surface-2` | `--line` |
| `--surface-3` | `--line` |
| `--text` | `--ink` |
| `--text-sub` | `--ink-soft` |
| `--text-muted` | `--ink-faint` |
| `--bg` (body/root) | `#fbf4e8` (direct value) |

---

## Phase 1: Design

### Data Model

No entity changes. No DB schema changes. No new tokens.

### Contracts

No new API endpoints or server contracts. No contracts/ directory needed.

### Implementation Design

#### Commit 1 — Atomic (FR-012): index.css + AdminCuratePage.jsx + 7 user-facing files

All changes in this commit must be applied together. The `:root` flip immediately invalidates all 16 dark-token references in user-facing files; those replacements cannot be deferred.

**index.css changes (in order, within the same file):**

1. **`:root` block** (FR-001 through FR-004, FR-016):
   - Replace `color-scheme: dark` → `color-scheme: light`
   - Replace `color: var(--text)` → `color: var(--ink)`
   - Replace `background: #060c14` → `background: #fbf4e8`
   - Remove all 9 dark token variable declarations (`--bg`, `--surface`, `--surface-2`, `--surface-3`, `--border`, `--border-dim`, `--text`, `--text-sub`, `--text-muted`) from the `:root` block
   - Replace the existing warning comment above `:root` with a one-line light-default note (e.g. `/* Light default — dark surfaces use .dark-surface */`). The warning comment itself moves to sit above the new `.dark-surface` block (see step 6 below), where it accurately describes the dark tokens that now live there.

2. **`body` block** (FR-005, FR-006):
   - Replace `background: #060c14` → `background: #fbf4e8`
   - Delete the entire `background-image` property declaration (its value is exclusively the two atmospheric radial gradients; removing only the gradient value lines leaves a dangling `background-image:` with no value)

3. **`#root` block** (FR-007):
   - Replace `background: var(--bg)` → `background: #fbf4e8` (literal — not `var(--bg-home)`)

4. **`h1, h2, h3` rule** (FR-008):
   - Replace `color: var(--text)` → `color: var(--ink)`

5. **`.modal-card` block** (FR-009, FR-016):
   - Remove `color-scheme: light` declaration (now redundant)

6. **Add `.dark-surface` block** (FR-010):
   - Add immediately after the `:root` block (before `*, *::before, *::after`).
   - Place the existing dark-theme warning comment (moved from above `:root` in step 1) immediately above this block.
   - Content:
     ```css
     /* ⚠️ Dark-theme tokens: pair with --text/--text-sub/... — descendants of .dark-surface only */
     .dark-surface {
       color-scheme: dark;
       color: var(--text);
       background: var(--bg);
       --bg: #0d1520;
       --surface: #162032;
       --surface-2: #1e2d42;
       --surface-3: #253347;
       --border: #2d4060;
       --border-dim: #1a2840;
       --text: #e2eaf5;
       --text-sub: #8ba3c0;
       --text-muted: #4a6480;
     }
     ```

**AdminCuratePage.jsx** (FR-011):
- Use a ternary refactor (Option A): extract the conditional into a `content` variable and return a single wrapper div:
  ```jsx
  const content = selection !== null ? <CurationWorkspace ... /> : <CandidateDashboard ... />;
  return (
    <div className="dark-surface" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {content}
    </div>
  );
  ```
- One wrapper div covers both branches — no duplication, no nested returns inside the wrapper.
- The flex sizing (`flex: 1, display: 'flex', flexDirection: 'column'`) is required because `CurationWorkspace` uses `height: 100%` and `CandidateDashboard` uses `minHeight: 100%` — both resolve against the `#root` flex column chain. A bare wrapper div would clip the dark background to content height only.

**7 user-facing JSX files — dark-token replacements** (FR-013):

Apply the token map. Special case for `MistakeDetailScreen.jsx` line 300: the ternary is `resolving ? 'var(--border)' : 'var(--green)'` — replace only `var(--border)` → `var(--line)`; do not touch `var(--green)`.

Summary of replacements per file:
- `MistakesGate.jsx` (1 use): `var(--border)` → `var(--line)`
- `DeepRevealPane.jsx` (1 use): `var(--border-dim)` → `var(--line)`
- `StatsScreen.jsx` (2 uses): `var(--border)` → `var(--line)` × 2
- `MistakesListScreen.jsx` (1 use): `var(--border)` → `var(--line)`
- `PastGamesListScreen.jsx` (3 uses): `var(--surface-2)` → `var(--line)`, `var(--border)` → `var(--line)` × 2
- `MistakeDetailScreen.jsx` (4 uses): `var(--border)` → `var(--line)` × 4 (line 300 touches only `--border` in the ternary)
- `ChallengeScreen.jsx` (4 uses): `var(--text-sub)` → `var(--ink-soft)`, `var(--surface-3)` → `var(--line)`, `var(--surface-2)` → `var(--line)`, `var(--text)` → `var(--ink)`

**Verification checks (not code changes):**
- `Board.jsx` `shimStyle()` function: uses `--bg` and `--border-dim`. After this commit, `CurationWorkspace` is inside `.dark-surface`, so these tokens will resolve correctly. Open `/admin/curate`, select a category, and confirm the board shim renders without broken colors (FR-014).
- `AdminLessonsPage.jsx`: no dark tokens, no action required (FR-015).

#### Commit 2 — Docs (FR-017): Separate commit immediately after Commit 1

**Scope**: This commit touches only `docs/architecture/frontend-conventions.md`. The `index.css` header comment update is handled in Commit 1 (step 1 above). `tokens.css` is left untouched — its pairing rule ('dark bg → --text family; light bg → --ink family') remains accurate after the flip.

**`docs/architecture/frontend-conventions.md`** — CSS Token Systems section must be rewritten:
- Remove: "Dark surfaces" row mapping `index.css` to `--surface`/`--text` family at `:root`.
- New model:
  - `:root` is now `color-scheme: light` with `background: #fbf4e8` and `color: var(--ink)`. All user-facing surfaces inherit these defaults.
  - `.dark-surface` (defined in `index.css`) is the sole home of the 9 dark tokens and `color-scheme: dark`. Any component that must render on a dark surface MUST be a descendant of a `.dark-surface` element.
  - The two-token-system pairing rule is unchanged: dark surface descendants use `--text`/`--surface` family; light surface descendants use `--ink`/`--card` family. Mixing across systems is still forbidden.
  - The "White cards on dark pages" note is no longer accurate — delete it. The equivalent concern post-flip is: if a dark card is placed inside a light context without `.dark-surface`, its `--text`/`--surface` tokens will be unresolved (visible failure, not silent).
  - Update the `project_dark_global_theme.md` cross-reference to reflect that the global theme is now light.
- **Important**: Do NOT rely on the current `frontend-conventions.md` text to understand the pre-flip state when writing this update — read `index.css` directly instead, since the doc itself will be stale after Commit 1 lands.

---

## Constitution Check (Post-Design)

Re-checked after Phase 1 design:

- **Principle I**: No explanation engine impact. ✅
- **Principle II**: `.dark-surface` is a single, explicit isolation boundary. No per-component workarounds remain. ✅
- **Principle III**: Manual visual verification tasks are defined (SC-001, SC-002). ✅
- **Principle IV**: Token pairing rule upheld — all 16 replacements use light-surface tokens on light-surface components. ✅
- **Principle V**: No performance impact. ✅
- **Principle VI**: Grep-verify the 16-use count before touching files (empirical grounding). Special case on line 300 is explicitly named. ✅
- **Principle VII**: One mechanism (`.dark-surface`) for all dark surfaces. Explicit is better than implicit. ✅
- **Principle VIII**: FR-017 doc update is a required task (separate commit). ✅

---

## Task Generation Notes (for /speckit-tasks)

The following task ordering constraints MUST be encoded:

1. **Task 0 — Grep-verify** (prerequisite for all edits): Run `rg` to confirm exactly 16 dark-token uses in user-facing files. If count differs from 16, halt and reconcile before proceeding.

2. **Task 1 — Atomic commit** (single unit of work): All of the following in one commit, one git operation:
   - FR-001–FR-004 + FR-016: `:root` block rewrite in `index.css`
   - FR-005–FR-006: `body` block rewrite in `index.css`
   - FR-007: `#root` block rewrite in `index.css`
   - FR-008: `h1, h2, h3` rule update in `index.css`
   - FR-009: `.modal-card` `color-scheme: light` removal in `index.css`
   - FR-010: `.dark-surface` block addition in `index.css`
   - FR-011: `AdminCuratePage.jsx` wrapper div with flex sizing
   - FR-013: All 16 replacements across 7 user-facing files

3. **Task 2 — Acceptance checks** (after Task 1, before Task 3):
   - Visually verify SC-001: open app, navigate all routes in `screenRegistry.jsx`, confirm legible text
   - Visually verify SC-002: open `/admin/curate`, confirm dark background preserved in both `CandidateDashboard` and `CurationWorkspace` views
   - Verify `Board.jsx` shimStyle() renders correctly inside `/admin/curate` (FR-014)
   - Grep SC-003: confirm zero dark token refs remain in user-facing files **excluding** intentional holdouts. Run the grep with explicit exclusions:
     - Exclude `Board.jsx` (shimStyle() intentionally retains `var(--bg)` and `var(--border-dim)` — it renders inside `.dark-surface` via CurationWorkspace)
     - Exclude curation components: `CurationWorkspace`, `CandidateDashboard`, `MultiMoveSequencer`, `PredicateChecklist`, `RejectModal`
     - Expected non-zero remainder: exactly 2 dark-token uses in `Board.jsx` shimStyle() (`var(--bg)` and `var(--border-dim)`). Any other non-zero result is a real failure.
   - Grep SC-004: confirm zero dark token refs remain in `:root` (this grep has no exclusions — the tokens live only in `.dark-surface`)

4. **Task 3 — Docs commit** (separate commit, immediately after Task 2 passes):
   - FR-017: Rewrite CSS Token Systems section of `docs/architecture/frontend-conventions.md` only
   - Note: `index.css` header comment is already updated in Task 1 (step 1 of the `:root` block changes). `tokens.css` is NOT touched — its pairing-rule comment remains accurate as-is.

**Task 1 cannot be split.** Committing the `:root` flip without the 16 user-facing replacements causes invisible text in production. Committing the replacements without the `.dark-surface` block causes the curation tool to inherit a broken light theme.
