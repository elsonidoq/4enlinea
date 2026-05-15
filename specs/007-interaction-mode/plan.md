# Implementation Plan: Interaction Mode & forced_win Refactor

**Branch**: `007-interaction-mode` | **Date**: 2026-05-14 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/007-interaction-mode/spec.md`

---

## Summary

Replace the fragile stored-sequence `forced_win` model with stateless per-move solver validation driven by a `CompletionStrategy` interface. Add an `interaction_mode` field (`single_move` | `sequence`) to the puzzle schema, route the frontend to different handlers per mode, and drop/regenerate all existing `forced_win` puzzles.

---

## Technical Context

**Language/Version**: Node.js 20 (ESM), React 18  
**Primary Dependencies**: Express 4, Supabase JS v2, @anthropic-ai/sdk, Vite  
**Storage**: PostgreSQL via Supabase (pooler at aws-1-us-west-2.pooler.supabase.com)  
**Testing**: node:test (built-in), fixtures checked into repo  
**Target Platform**: Linux server + browser (480 px app layout)  
**Project Type**: Web application (backend API + React frontend)  
**Performance Goals**: <2 s per sequence move (FR SC-001); bitboard-only validation → well under 100 ms  
**Constraints**: Stateless server (no session state); each move request carries full position; explicit DB GRANTs required (migration 012 pattern)  
**Scale/Scope**: Single-player puzzle app; ~5 active puzzle categories; forced_win is paid tier

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

### Pre-Phase-0 Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I — Explanation Engine as SSOT | **PASS** | Sequence move validation returns structural outcome (`valid`/`fail` with reason), not a pattern label or LLM annotation. Deep Reveal path is unchanged; constitution I applies to pattern-based explanations, not puzzle-flow feedback. |
| II — Code Quality & Simplicity | **PASS** | `CompletionStrategy` is a minimal single-method interface defined in spec. No speculative abstractions; only what spec FR-008 mandates. |
| III — Testing Standards | **PASS (conditional)** | Bitboard-only validation and bitboard AI response — no solver calls anywhere in the sequence flow. Integration tests must verify three named scenarios against real board positions: (a) forcing move → `continue`, (b) non-forcing move → `fail`, (c) double-threat move → `success`. Tier gating (anonymous and free-tier → 403) must also be covered. |
| IV — UX Consistency | **PASS** | Sequence handler reuses existing feedback styling and terminology from PuzzlesPage. |
| V — Performance | **PASS** | Sequence move validation is bitboard-only (O(1)). AI response also bitboard. Both well under 100 ms; no latency risk. |
| VI — Implementation Methodology | **PASS** | Data dependencies mapped in full below (Phase 1). Signal validity pre-verified: bitboard `checkWin`/`countWinningThreats` correctly identifies immediate threats — no solver scores used, so flat-score edge case does not apply. |

**Tier check**: `forced_win` remains in `PAID_CATEGORIES`; no tier logic changes.

---

## Project Structure

### Documentation (this feature)

```text
specs/007-interaction-mode/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code

```text
connect-four/
├── server/
│   ├── completionStrategies.js       # NEW — CompletionStrategy interface + ForcedWinStrategy
│   ├── index.js                      # MODIFIED — new sequence/move endpoint; GET /puzzles/:id adds interactionMode; approve endpoint sets interaction_mode; /check guards sequence-mode puzzles
│   ├── predicates.js                 # UNCHANGED — evalForcedWin stays (sequence mode bypasses it)
│   └── migrations/
│       └── 014_interaction_mode.sql  # NEW
├── src/
│   ├── components/
│   │   └── SequenceHandler.jsx       # NEW — multi-move learner-facing puzzle handler
│   └── pages/
│       └── PuzzlesPage.jsx           # MODIFIED — route by interactionMode
└── tests/
    ├── integration/
    │   └── sequence_check.test.js    # NEW — ForcedWinStrategy: (a) forcing move→continue, (b) non-forcing→fail, (c) double-threat→success, (d) anon/free-tier→403
    └── predicates/
        └── predicates.test.js        # MODIFIED — regression: existing single-move categories unchanged
```

---

## Complexity Tracking

No constitution violations.

---

## Phase 0: Research

### R-001 — Bitboard immediate-threat detection for sequence validation

**Decision**: Use the existing `checkWin`-family and `countWinningThreats` functions (already available in `predicates.js` and `classifier.js`) for all sequence move validation. Do NOT use solver scores.

**Rationale**: FR-006 requires checking (a) no immediate threat before the move, (b) at least one immediate threat after the move. `countWinningThreats` counts cells where placing the current player's piece yields a win — exactly the required signal. Solver scores are intentionally avoided because of the known flat-score behavior at forced-win terminals (see `reference_c4solver_behavior.md`).

**Alternatives considered**: Using solver `immediateWinScore` threshold — rejected due to the off-by-1 on odd `moveCount` and flat-score edge cases. Direct bitboard is unambiguous.

### R-002 — AI response column for sequence continuation

**Decision**: After a valid forcing move, the server identifies the learner's immediate threats (columns where the learner would win next). If exactly one such column exists, the AI plays there (forced block). The AI response is computed purely via bitboard — no solver call needed.

**Rationale**: In a correctly designed forced-win sequence, each forcing move creates exactly one immediate threat (the double threat comes last). The AI "blocks" by playing in the threatened column. This is deterministic, fast, and needs no solver.

**Edge case**: If the forcing move creates zero threats (shouldn't happen — validation already fails), AI response is undefined; this path is unreachable.

**FR-009 compliance**: This is a mechanical default, not a "strategy". The exact AI move selection strategy spec (e.g., softmax-temperature, solver-guided response to non-trivial positions) is deferred per FR-009. This default is intentionally minimal — do not add fallback heuristics, solver-guided selection, or softmax; those are out of scope for this feature.

### R-003 — Where interaction_mode is set during puzzle creation

**Decision**: The `interaction_mode` value is computed server-side at approval time from the candidate's `category`. The approval endpoint (`POST /api/admin/candidates/:id/approve`) sets `interaction_mode = 'sequence'` when `category === 'forced_win'`, `'single_move'` otherwise. No additional input from the curator is needed.

**Rationale**: `interaction_mode` is a deterministic function of `category` for all currently known categories. Asking curators to set it would be redundant and error-prone.

**R-004 — Drop existing forced_win puzzles**

**Decision**: Migration 014 executes `DELETE FROM public.puzzles WHERE category = 'forced_win'` as part of the schema migration. Candidates with `category = 'forced_win'` are retained (they hold valid board positions — only the puzzle records with stored sequences are dropped).

**Rationale**: Existing forced_win puzzle records rely on `cooperative_ai_moves` for validation, which is the stored-sequence model being replaced. Keeping them would require running the old and new models in parallel.

---

## Phase 1: Design & Contracts

### Data Model

See `data-model.md`.

### Data Dependencies Map (Constitution VI requirement)

All fields the UI needs, traced to their source:

| UI Field | Source Table | Column | Change Required |
|----------|-------------|--------|----------------|
| `puzzle.interactionMode` | `puzzles` | `interaction_mode` (NEW) | Add column in migration 014 |
| `puzzle.moveString` | `puzzles` | `move_string` | None |
| `puzzle.goalPrompt` | `puzzles` | `goal_prompt` | None |
| `sequenceOutcome` | Computed server-side | — | New endpoint |
| `aiCol` | Computed server-side | — | New endpoint |

**GET /api/puzzles/:id** must SELECT `interaction_mode` and expose it as `interactionMode` in the response.

**GET /api/puzzles (list)** does NOT need `interaction_mode`. The frontend picks a random puzzle from the list by `id` only, then fetches the full puzzle via `GET /api/puzzles/:id` before routing — routing decisions happen only after the individual puzzle load.

**POST /api/puzzles/:id/sequence/move** takes `{ position, col }` and returns `{ outcome, reason?, aiCol? }`.

### Interface Contracts

See `contracts/`.

### Agent Context

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan at
specs/007-interaction-mode/plan.md
<!-- SPECKIT END -->

---

## Post-Phase-1 Constitution Re-check

| Principle | Status | Notes |
|-----------|--------|-------|
| I — Explanation Engine | **PASS** | No new explanation surfaces; Deep Reveal unchanged. |
| II — Code Quality | **PASS** | `completionStrategies.js` exposes one exported class, one method. `SequenceHandler.jsx` is a focused component; no shared state beyond what PuzzlesPage already manages. |
| III — Testing | **PASS** | `sequence_check.test.js` covers three outcome scenarios (forcing move→continue, non-forcing→fail, double-threat→success) plus two tier-gating cases (anon→403, free→403); `predicates.test.js` verifies existing single-move categories are unaffected. |
| IV — UX Consistency | **PASS** | Sequence handler uses existing feedback panel styles from PuzzlesPage. "Forcing move" / "double threat" terminology matches constitution. |
| V — Performance | **PASS** | All bitboard, O(1). No new solver calls on the hot path. |
| VI — Methodology | **PASS** | Full data-dependency table above; signal validity verified in R-001. |
