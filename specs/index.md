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
| 048-onboarding-experience | Onboarding Experience | Draft | Uniform sparring-first first-run flow for every first-time user — no routing-question gate, no sign-in wall before value; onboarding completes at the first live coach reaction to the user's own move (not game-end); post-aha optional "import your real games" offer leads into the existing authenticated spec-038 Papergames flow; onboarding flag lives on the existing anonymous profile and is carried to the account via the existing migration seam |
| 052-detector-perspective-taxonomy | Detector Perspective Soundness & Blunder Tag Taxonomy | Draft | Fixes `detectOvercut`'s unsound `perspective` parameter (mirrors the shipped undercut fix — OI-76); adds the KB's "active forcing" overcut sub-case as a first-class match (OI-60); distinguishes a forfeited-forced-win from a genuine draw in both the live and stored blunder-tagging paths (OI-48); replaces boolean creation-transition gates with per-column threat diffs (OI-33); scopes which additional tactical patterns earn live-coach praise (OI-30) |

## What each spec folder contains

- **spec.md** — the feature specification: user stories, acceptance criteria, key decisions, and algorithmic definitions. This is the primary source of truth for what is built and why.
- **plan.md** — the implementation plan: component breakdown, file-level changes, and architectural decisions made during planning.
- **tasks.md** — ordered, dependency-resolved task list generated from the plan. Each task maps to a concrete code change.
- **contracts/api.md** (or `admin-api.md`) — the API contract for the feature: endpoints, request/response shapes, status codes.
- **data-model.md** — schema changes introduced by the feature: new tables, columns, constraints, and migrations.
- **research.md** — background research or investigation notes gathered before or during planning.
- **checklists/requirements.md** — generated requirements checklist used to validate spec completeness.
- **quickstart.md** (some specs) — developer quick-start instructions specific to this feature.
