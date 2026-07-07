# Documentation Index

## Root

### Connect Four Strategy (canonical — use these)

[connect-four-strategy-reference.md](connect-four-strategy-reference.md) — **CANONICAL** — parity theory, zugzwang, claimeven, threat taxonomy, J-shape, Figure-7, sextuple, TSS/VCF/VCT, openings — understanding *why* positions win or lose

[connect-four-implementation-guide.md](connect-four-implementation-guide.md) — **CANONICAL** — bitboard encoding, win detection, pattern predicates, solver integration, TSS algorithm, puzzle generation pipeline, explanation templates — implementing detection and search

[connect-four-curriculum-guide.md](connect-four-curriculum-guide.md) — **CANONICAL** — 7 puzzle archetypes, 5-phase curriculum, learning analytics, admin dashboard — designing the teaching system

### Connect Four Strategy (superseded — kept for reference only)

[old_dont_read/architectural_blueprint_and_algorithmic_operationalization_for_an_intelligent_connect_4_training_system.md](architectural_blueprint_and_algorithmic_operationalization_for_an_intelligent_connect_4_training_system.md) — superseded by connect-four-implementation-guide.md and connect-four-curriculum-guide.md

[old_dont_read/Connect_4_Training_Material_Design_2026-05-14.md](Connect_4_Training_Material_Design_2026-05-14.md) — superseded by connect-four-strategy-reference.md

[old_dont_read/Connect_4_Training_Material_Generation_2026-05-14.md](Connect_4_Training_Material_Generation_2026-05-14.md) — superseded by connect-four-strategy-reference.md and connect-four-implementation-guide.md

[old_dont_read/connect_four_strategy_pattern_analysis.md](connect_four_strategy_pattern_analysis.md) — superseded by connect-four-strategy-reference.md

[old_dont_read/connect_four_training_application_design.md](connect_four_training_application_design.md) — superseded by connect-four-implementation-guide.md and connect-four-curriculum-guide.md

### LLM Coach

[deep-reveal-eval.md](deep-reveal-eval.md) — 3-layer evaluation framework for deep reveal explanations: deterministic checks, LLM-as-judge, and golden set regression — implementing or running evals after prompt changes

### Other

[best_practices_spec_driven_development.md](best_practices_spec_driven_development.md) — spec-driven development methodology using SpecKit + Claude Code for solo founders — understanding the workflow that drives this project's spec → plan → tasks pipeline

[cloud_provider_research.md](cloud_provider_research.md) — VPS vs PaaS vs Serverless trade-offs for a solver-heavy app — choosing a cloud provider

[launch_tactic.md](launch_tactic.md) — go-to-market plan for DecodeC4 MVP, retention metric gate (7-day unprompted return) — understanding launch success criteria

[lean_app_development_to_profitability.md](lean_app_development_to_profitability.md) — stage-gated framework (ideation → validation → build → launch) for lean startup execution — product strategy and prioritisation decisions

[principal_engineer_roadmap_considerations.md](principal_engineer_roadmap_considerations.md) — constraints and heuristics for solo-founder AI-assisted engineering (ship fast, low complexity) — architectural trade-off decisions

## architecture

[architecture/index.md](architecture/index.md) — grouped index of all architecture docs (conventions, LLM coach, reason engine) — start here to browse the directory

[architecture/api-conventions.md](architecture/api-conventions.md) — MUST rules for route naming, HTTP status codes, error shape, and auth threading — adding or modifying any server route

[architecture/data-model.md](architecture/data-model.md) — MUST rules for primary keys, column naming, category slugs, soft delete, and jsonb usage — schema changes or new migrations

[architecture/frontend-conventions.md](architecture/frontend-conventions.md) — state management (ProfileStore/Context only), store interface contract, IndexedDB schema — adding frontend state or storage logic

[architecture/gap-report.md](architecture/gap-report.md) — unresolved architectural questions (goal_predicate_params, cooperative_ai_moves, user_player, classifier/predicate separation) — investigating unexplained columns or implicit design choices

[architecture/server-conventions.md](architecture/server-conventions.md) — solver IPC modes (persistent vs one-shot), move string format, board representation — touching c4solver integration or board-level server code

[architecture/lesson-editor.md](architecture/lesson-editor.md) — in-app admin tool at `/admin/lessons` for visually authoring lesson JSON: movestring-driven boards, overlay placement, hot-reload preview, component map, and gotchas — adding lesson editor features or debugging the authoring workflow

[architecture/llm-coach-endpoints.md](architecture/llm-coach-endpoints.md) — `explain_move` and `recommend_next_move` PoC architecture: shared infrastructure, data flows, prompt structures, flat table format, server endpoint conversion guide — adding LLM coaching features or converting CLI scripts to server routes

[architecture/feature-vector-glossary.md](architecture/feature-vector-glossary.md) — field-by-field semantics of the **blunder-reason** feature vector (`computeReason`) for an LLM reader: the 5-case taxonomy, the two halves (`lostResource`/`opponentPunishment`), `tie`, denial/occupation local-vs-global, `register`/`line`, `parityAttribution`/`anchorCells`/`tacticTag`, `replyHistogram`/`gate`, pruning/absence + anti-fabrication rules — reading/extending the reason vector or building a prompt from it

[architecture/feature-vector-sufficiency-experiment.md](architecture/feature-vector-sufficiency-experiment.md) — experiment design testing whether the reason vector + glossary is enough context to explain a blunder: isolated OpenAI answerer (`explain_from_vector.mjs`) + tools-enabled Claude grader (`grade-fv-sufficiency`), frozen set from the reason corpus, ablation, counterexample output — running or extending the sufficiency experiment

[architecture/reason-render-grounded-prompt.md](architecture/reason-render-grounded-prompt.md) — proposal for restructuring how the reason vector is presented to the answerer LLM (esp. `gpt-5.4-mini`): move cell-grounding + board rendering from the LLM into the engine's render step, stage the prompt by altitude (situation frame / pre-rendered boards / status-tagged cells / headline+horizon / contrast / do-not guardrails). Grounded in the 2026-07-02 FV-sufficiency failures (altitude + false-causality) — read before redesigning the from-vector prompt

[reason-render-opening-known-issues/README.md](reason-render-opening-known-issues/README.md) — **KNOWN-ISSUES BACKLOG** (unfixed) — frozen snapshot of the 2026-07-06 opening-cluster FV-sufficiency run (54/57 pass) with the 3 failing evals documented + root-caused: eval-50 (`causalLinks.mjs` L2 grounds an empty threat cell), eval-26 (`openingFrame.mjs:65` O1 guardrail mandates a parity lens with no `parityFavor.favorsMover===false` suppressor), eval-20 (model inverts "central file"). Includes the graded boards/compute-output/grades in `data/` — read before fixing opening-frame render or L2 realized_denied cell-grounding

### Blunder-`reason` engine (read all four before touching it)

[architecture/reason-INVARIANTS.md](architecture/reason-INVARIANTS.md) — **CONSTITUTION** — 12 non-negotiable principles for the blunder-`reason` engine (I0 = correctness over optimization; vector-is-the-artifact; no-fabrication; two-halves; bounded-by-depth; reuse classifier detectors) — before any reason-engine change

[architecture/reason-DECISIONS.md](architecture/reason-DECISIONS.md) — **DECISION LOG** — append-only resolved decisions + rationale (restart/quarantine, gate, provisional thresholds, fixture strategy) — do not relitigate these

[architecture/reason-case-taxonomy.md](architecture/reason-case-taxonomy.md) — **AUTHORITATIVE** — the `(bestScore, playedScore)` 5-case taxonomy keyed by sign comparison

[architecture/blunder-reason-evidence.md](architecture/blunder-reason-evidence.md) — the two-halves evidence engine, register selection, the `lose_to_faster_lose` gate, validated boards, tooling + implementation map

[architecture/reason-AGENT-PREAMBLE.md](architecture/reason-AGENT-PREAMBLE.md) — reusable prompt preamble for fresh-context reason-engine agents — paste verbatim instead of re-typing constraints

[architecture/testing-conventions.md](architecture/testing-conventions.md) — test runner (node:test), fixture format, suite layout — writing or running tests

[architecture/index-conventions.md](architecture/index-conventions.md) — 0-indexed vs 1-indexed breakdown for move strings, DB columns, API fields, and frontend state — diagnosing off-by-one bugs or adding new coordinate-bearing fields

[architecture/db-schema.md](architecture/db-schema.md) — live table schemas: columns, types, PKs, FKs, and defaults for all 10 public tables — writing DB queries or migrations

## mvp

[mvp/mvp_product_spec.md](mvp/mvp_product_spec.md) — canonical MVP product spec: Puzzle Trainer, Sparring, AI Coach; the single question the MVP answers — understanding overall product scope and what is Phase 2

[mvp/internal_tool.md](mvp/internal_tool.md) — Puzzle Factory spec: Generate→Filter→Curate pipeline for populating puzzle DB — understanding the internal curation workflow

[mvp/technical_roadmap.md](mvp/technical_roadmap.md) — 8-week solo-founder technical roadmap to soft launch — understanding original shipping milestones

[mvp/v1_gaps.md](mvp/v1_gaps.md) — gap analysis of v1 implementation vs mvp_product_spec.md — understanding what was broken after the initial build (superseded by spec 002)

[mvp/v2_gaps.md](mvp/v2_gaps.md) — gap analysis of v2 implementation after spec 002 fixes — understanding remaining bugs after the gap-fix sprint

[mvp/feedback_for_generate.md](mvp/feedback_for_generate.md) — first-iteration annotator feedback: classifier bugs and sparse boards — root causes behind spec 004 and 005

[mvp/feedback_for_generate_v2.md](mvp/feedback_for_generate_v2.md) — second-iteration annotator feedback: debugging trace, skip-to-next, curation UX — root causes behind spec 005 UX stories

[mvp/feedback_for_generate_v3.md](mvp/feedback_for_generate_v3.md) — third-iteration annotator feedback: old UI still present, classifier bugs, naming convention, annotator_note location — root causes behind spec 006 slug rename

[mvp/thoughts_on_generate_feedback.md](mvp/thoughts_on_generate_feedback.md) — root-cause analysis of classifier bugs from feedback_for_generate.md — debugging the immediateWinScore off-by-one and related predicate errors

## product

[product/competing_apps.md](product/competing_apps.md) — competitive landscape table for Connect 4 training apps — positioning decisions and feature differentiation

[product/end_game_product_specifications.md](product/end_game_product_specifications.md) — full product vision: Explanation Engine, pattern categories, Blunder Log, micro-lessons, post-game review — understanding long-term feature roadmap beyond MVP

[product/market_size.md](product/market_size.md) — market size analysis (Papergames traffic, search volume, paying user potential) — validating addressable market assumptions

[product/product_killer_features.md](product/product_killer_features.md) — killer features for mastery: X-AI overlays, Socratic Ghost Coach, Tactics Trainer library — prioritising differentiating features

## templates

[templates/launch_tactic_structure.md](templates/launch_tactic_structure.md) — reusable template for writing a launch tactic doc — creating a new launch tactic document

[templates/mvp_structure.md](templates/mvp_structure.md) — reusable template for writing an MVP proposal — creating a new MVP proposal document
