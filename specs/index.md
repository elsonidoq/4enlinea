# Specs Index

| Spec folder | Feature name | Status | Key decision / summary |
|---|---|---|---|
| 001-decodec4-mvp | DecodeC4 MVP | Done | Three-feature MVP (Puzzle Trainer, Sparring, AI Coach) built on a shared Explanation Engine; core question: will players return for explained positions? |
| 002-mvp-gap-fixes | MVP Gap Fixes | Done | Fixed 24 gaps blocking end-to-end use: empty states, broken puzzle loop, score display, store interface mismatches |
| 003-puzzle-factory | Puzzle Factory (Internal Tool) | Done | Generate→Filter→Curate pipeline with solver-weighted sampling; human annotator does final approval; false positives are flagged with annotator notes |
| 004-puzzle-gen-improvements | Puzzle Generator Improvements | Done | Replaced random move selection with softmax-weighted solver sampling + opening book; boards now median ≥ 14 moves; deterministic via seeded PRNG |
| 005-puzzle-curation-fixes | Puzzle Curation & Classifier Fixes | Done | Fixed three systematic classifier bugs (immediateWinScore off-by-one, forced-block detection, forbidden-column edge cases); added curation UX improvements |
| 006-category-slugs | Category Slug Refactor | Done | Replaced integer category IDs with text slugs end-to-end (DB, server, frontend); tables emptied and recreated; no backfill required |
| 007-interaction-mode | Interaction Mode & forced_win Refactor | Active | Introduces `interaction_mode` column (single_move vs sequence); replaces pre-stored move sequences with stateless per-move solver validation via `CompletionStrategy` interface |
| 008-new-puzzle-categories | New Puzzle Categories | Planned | Adds six single-move categories: z_threat, claimeven, undercut, overcut, figure_7, j_shape; each with server predicates, DB slug constraints, highlights, and explanations |
| 044-puzzle-generation-correctness | Puzzle Generation & Correctness | Draft | Audits existing dual-layer correctness predicates (generation `check*Predicate` + solve-time `evaluatePredicate`); fixes color-casting for immediate_threat/forced_block, rejects stray forced_block, accepts any generating column (incl. 'tied') for multi-solution categories without weakening undercut/unique-answer categories; adds net-new Allen T1–T7 transforms + verified V1–V5/T4-Case-A operators |

## What each spec folder contains

- **spec.md** — the feature specification: user stories, acceptance criteria, key decisions, and algorithmic definitions. This is the primary source of truth for what is built and why.
- **plan.md** — the implementation plan: component breakdown, file-level changes, and architectural decisions made during planning.
- **tasks.md** — ordered, dependency-resolved task list generated from the plan. Each task maps to a concrete code change.
- **contracts/api.md** (or `admin-api.md`) — the API contract for the feature: endpoints, request/response shapes, status codes.
- **data-model.md** — schema changes introduced by the feature: new tables, columns, constraints, and migrations.
- **research.md** — background research or investigation notes gathered before or during planning.
- **checklists/requirements.md** — generated requirements checklist used to validate spec completeness.
- **quickstart.md** (some specs) — developer quick-start instructions specific to this feature.
