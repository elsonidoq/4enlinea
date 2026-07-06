# Memory index — trigger-first gotchas

> Conventions/contracts/schemas live in `docs/architecture/` (CLAUDE.md mandatory reads); reason-engine *decisions* in `reason-DECISIONS.md` (D1–D27). This index is traps only — read the docs, not a memory summary.

## Solver, board evaluation, tactical patterns & movestrings

- [c4solver score semantics](reference_c4solver_scores.md) — sign/magnitude, book encoding
- [Score universality trap](reference_c4solver_score_universality.md) — max<0=ALL lose vs min<0=SOME lose
- [c4solver behavioral quirks](reference_c4solver_behavior.md) — error vs hang; JS formula off-by-1
- [Forced-block detection](reference_cat5_forced_block_detection.md) — use checkWin, not flat scores
- [Binary stale/crash fix](feedback_binary_rebuild.md) — delete + make to recompile
- [Classify vs classifyPattern](reference_classify_vs_classifyPattern.md) — sync/8-tag vs async/15-detector; +3 parity threats; Map priority
- [Integration test hang](project_integration_test_slowness.md) — IPC deadlock; use test:fast; ALSO test:fast itself deadlocks if run concurrently with any solver harvest/dev server
- [Tactical pattern definitions](reference_tactical_pattern_definitions.md) — formal predicates for figure_7/j_shape/undercut/overcut
- [Claimeven detection](reference_claimeven_detection.md) — simulation-based algorithm; ~20 solver queries
- [Z-threat detection](reference_z_threat_detection.md) — odd empty cell count; UI visualization spec
- [Verified tactical movestrings](reference_verified_tactical_movestrings.md) — Allen V1–V5 + Allis 9 rules + T4 Case-A regression; verified solver examples
- [T4 vs forced_win trap](reference_t4_vs_forced_win_trap.md) — T4 movestring is 1-indexed; fails forced_win
- [missed_own capitalize principle](project_missed_own_capitalize_principle.md) — double_threat/figure_7/immediate_threat survive wrong moves; missed_own = correctCol BUILDS pattern; only undercut (same col, row≤) kills a fork
- [Never generate random boards](feedback_no_random_boards.md) — source from DB, git history, or KB
- [Coordinate convention](reference_coordinate_convention.md) — 0-indexed; two translation boundaries only
- [Visualize board script](project_puzzle_quality_nav_fixes.md) — isClean guards; forced_win min 5-ply

## Puzzle categories, challenge & past-games flow

- [Opening theory scoping](project_opening_theory_scoping.md) — NO opening challenge category (won-position boards have losing side to move); openings go to Lessons + reason "book-deviation"
- [Lesson interactivity evaluation](project_lesson_interactivity_evaluation.md) — Socratic is client-side col===correctCol; inline confirmationChallenges 404 (check needs a DB puzzle row)
- [8-file wiring checklist](project_new_category_wiring_checklist.md) — missing candidate-generator.js = silent failures
- [Paid categories in two files](project_paid_categories_two_files.md) — server + src/lib must be updated atomically
- [Category wiring reference](project_new_puzzle_categories.md) — locked design decisions for z_threat/claimeven/undercut/overcut/figure_7/j_shape
- [Claimodd removal](project_claimodd_removal.md) — removed 2026-06-17; how to correctly re-add
- [Category cleanup](project_category_cleanup.md) — zugzwang≠forced_win; don't reuse the slug
- [highlight_metadata null table](reference_highlight_metadata_null_categories.md) — which categories have null vs non-null
- [correct_col migration gap](project_correct_col_migration.md) — migration 016 adds correct_col to puzzles + candidates
- [Classifier architecture](project_classifier_architecture.md) — detection pipeline; highlight_metadata schemas per category
- [Classifier current state](project_classifier_current_state.md) — convolution refactor; pre-existing test failures
- [detectOddEvenThreat Yellow](project_detect_odd_even_threat_yellow.md) — Yellow support added; renamed fields
- [odd_even_threat is puzzle-only](project_odd_even_threat_puzzle_only.md) — still a classifyPattern tag + category, de-listed from coach + blunder vocab (2026-06-25)
- [Challenge evaluation shape](project_challenge_evaluation_shape.md) — summaryLine vs summaryLineKey polymorphism
- [ChallengeScreen mode extensions](feedback_challenge_screen_mode_extensions.md) — audit bare `category` refs
- [Challenge sets server only](project_challenge_sets_server_only.md) — no frontend mirror
- [/draw returns snake_case](project_draw_endpoint_snake_case.md) — /puzzles/:id returns camelCase
- [recordPuzzleAttempt shape](project_record_puzzle_attempt_shape.md) — 6-field snake_case; spec 030 change
- [Puzzle advancement](project_puzzle_advancement.md) — must call recordPuzzleAttempt on correct answer
- [forced_win refactor](project_forced_win_refactor.md) — CompletionStrategy; bitboard-only AI response; sequence vs single_move interaction mode
- [ReviewScreen nav contract](reference_review_screen_nav.md) — go('review', { id }) not moveString
- [navigateToMistake API](reference_review_screen_navigate_to_mistake.md) — takes number; blunderDetail only since 2026-06-21
- [Past games epics decisions](project_past_games_epics.md) — globalPlyIndex formula; locked nav decisions
- [Spec 037 open QA bugs](project_spec037_review_blunder_sharing.md) — 4 open bugs; is_owner!=false gate
- [SequenceHandler is gone](project_sequence_handler_ui.md) — ChallengeScreen.handleSequenceClick has the logic
- [Spec 034 isSubmitting trap](project_spec034_board_interaction.md) — explicit per-branch, not finally

## Server endpoints, API, DB schema, auth & deploy

- [trust proxy on Railway](bug_railway_trust_proxy.md) — required or rate-limit throws 500
- [Server architecture](project_server_architecture.md) — endpoint map; tier access; rate limits
- [Supabase session contamination](bug_supabase_js_session_contamination.md) — two clients: supabase (DB) + authClient (auth)
- [GoTrue trigger not firing](bug_supabase_trigger_not_firing.md) — loadUser auto-creates public.users row
- [Error logging](feedback_server_testing_pattern.md) — extract helper + node --test (no endpoint harness)
- [Supabase connection](reference_supabase_connection.md) — sb_secret format; session pooler; Node inline pattern
- [Supabase storage API](reference_supabase_storage_api.md) — upload/createSignedUrl shapes; signedUrl not url
- [Blunder severity measure](blunder_severity_graduated_measure.md) — bestScore<0 guard removed; atomic upsert
- [Suboptimal/blunder unification](project_suboptimal_blunder_unification.md) — quality column; ExplorerScreen deleted
- [Stats architecture](project_stats_architecture.md) — stats from puzzle_attempts; session_stats orphaned
- [Spec 030 session-stats write asymmetry](project_spec030_server_mediated_data_access.md) — asymmetric write shapes; must not unify
- [byPattern always empty](project_spec030_session_stats_bypattern_mismatch.md) — stored shape mismatch
- [Magic link hash race](project_magic_link_auth_race.md) — replaceState must preserve window.location.hash
- [Magic link redirect URL](bug_auth_magic_link_redirect.md) — URL must be allowlisted in Supabase
- [Google OAuth state](project_spec036_google_oauth.md) — encodeURIComponent load-bearing; DeepRevealPane trap
- [Auth/payments state](project_auth_payments_state.md) — client SDK removed; httpOnly cookies only (credentials:'include', NOT Authorization header); Stripe deferred
- [Supabase config modifiable](feedback_supabase_config_modifiable.md) — production settings can be changed via dashboard
- [Local Supabase setup](project_local_supabase_setup.md) — JWT format for service_role key; sb_secret_* doesn't work locally
- [Spec 039 deploy requirement](project_spec039_audio_interactive_coach.md) — TRUNCATE explanation_cache before deploy
- [Railway clock skew](project_railway_solver_clock_skew.md) — -B flag + test -f guard in railpack.json
- [Service worker cache](bug_service_worker_stale_cache.md) — network-first for HTML; cache-first for hashed assets
- [Migration runner](project_spec031_staging_production_deploy.md) — migrate.js; baseline mode; c4solver compile from source

## Frontend & board display

- [Frontend architecture](project_frontend_architecture.md) — routes; component map; store layer
- [en.json duplicate mistakes key](reference_en_json_duplicate_mistakes.md) — line ~707 is effective; ~492 is dead
- [Valid blunder tags vs categories](reference_valid_blunder_tags.md) — VALID_BLUNDER_TAGS != VALID_CATEGORIES
- [Highlight cell roles](project_highlight_cell_colors.md) — use userIsYellow for role assignment
- [Claimeven highlight roles](project_claimeven_implementation.md) — Yellow perspective; cooperativeAiMoves always empty
- [Tier source](reference_tier_source.md) — tier from store.getProfile() not session.tier
- [Mockup vs production gap](feedback_mockup_production_gap.md) — NAV_GROUPS/mkCols/cols don't exist in production
- [Parity bug AI-first](project_parity_bug_ai_first.md) — heatmap inversion on AI-first games (unfixed)

## Production LLM coach / deep reveal (toFeatureVector / explainContext)

- [Feature vector design](feedback_feature_vector_design.md) — toFeatureVector: keep grounded cells, drop plumbing/derivations/occurrence-artifacts; keep instance counts
- [Explain prompt grounding traps](project_explain_prompt_grounding_traps.md) — 3 open explainContext traps (empty section, parity always_include, blunder-threat direction mismatch) drive fabrication
- [LLM perspective bug](feedback_llm_perspective_bug.md) — name player explicitly in Move context section
- [Explain system](project_explain_system.md) — LLM prompt invariants; explanation_cache schema; data flow; threat comparison format; major/minor threat KB terms conditional
- [always_include mechanism removed](project_kb_major_minor_threat_not_always_include.md) — NO KB term injects without its pattern firing; parity/gravity_top also removed 2026-06-25; do not revert
- [Zone alias must match prompt](project_zone_alias_must_match_prompt.md) — alias absent from map → P1:invalid_spec; major=always, minor=conditional
- [Blunder tagging design](project_blunder_tagging_design.md) — tagBlunder throws NotABlunderError on terminal; missed_own = correctCol builds pattern
- [Pattern tier definitions](project_pattern_tier_definitions.md) — Tier-1/2/3 live in explainContext.js not classifier.js; 3 unrelated "tier" meanings
- [Pattern KB architecture](project_pattern_kb_architecture.md) — PATTERN_KB entry shapes; popup checklist; alias resolution
- [Coach deep reveal docs](project_coach_deep_reveal_docs.md) — authoritative docs; Epic A/B contracts
- [Annotation gate & zones](project_annotation_gate_and_zones.md) — allowedSet shapes (null vs []); P5strong:tg/P3 zone traps; deep_reveal_failures debug table; blunders-not-populated guide
- [eval_set_large_3_sparse subset](reference_eval_set_large_3_sparse_subset.md) — strict subset of eval_set_large_3.json; don't combine
- [Feature vector content traps](project_feature_vector_content_traps.md) — null outcomes on losing_either_way; patternsOpponent snapshot ambiguity; pliesToEnd inverted (=|score|); immediate_threat severity from tag; wrong field worse than absent
- [Deep reveal TTS](project_deep_reveal_tts.md) — TTS streaming; audio keyed by text hash not position
- [Deep reveal product mindset](feedback_deep_reveal_product_mindset.md) — score is a compass not the reason; sparse≠no-reason; "better"=breadth of punishable opponent mistakes; never fabricate

## Blunder-REASON evidence engine (reason_engine/) — read the 4 docs + D-log FIRST

- [Reason case → also eval + grader](feedback_reason_case_requires_eval_and_grader.md) — adding an engine case/field is not done until select_boards derives a predicate (+REASON_UNIVERSE) AND grade-fv-sufficiency/glossary know it
- [select_boards openings RESOLVED](project_select_boards_skips_openings.md) — fixture additive band + coverage deterministic Phase-1 opening step (seed-local RNG, --seed); 3 PROVISIONAL predicates (named_line/defense/centrality); engine = computeOpeningContext.mjs (D31/D32)
- [Reason-engine docs are canonical](project_admin_fv_suff_repurposed.md) — before reason_engine/ work read reason-INVARIANTS/DECISIONS(D1–D29)/case-taxonomy/blunder-reason-evidence + reason-AGENT-PREAMBLE; /admin/fv-suff = 2-mode browser (Evidence vectors + Eval-answers LLM/grade); stale-server restart trap (lsof kill 3001)
- [immediate_threat phantom cell](project_reason_immediate_threat_phantom.md) — immediate_threat/missed_own detects on PRE-move movestring, NOT correctRoot (already-won → phantom win-in-1 one row up: eval-26 c2r5 vs c2r4); forks keep correctRoot
- [Grounded-render prompt + tripwire](project_reason_render_layer.md) — compute.mjs condition D; P1+P2+P3+P4 DONE (D29); render_decision is condition-D-only ground truth for the grader (never re-derive routing); closed fieldDisposition tripwire; covers are family SUPERSETS + STATIC causal-code audit (covered-but-absent is normal, D28); selectBoards selection-safety; boards NOT in coverage walk; §3e one rule × 3 consumers; flip_case_l3 gap CLOSED
- [FV-suff grader PV-mismatch trap](project_fv_suff_grader_pv_mismatch.md) — verify vector cells against the engine's OWN finalMovestring, not an alternate solver PV; multiple optimal lines; mis-convicted eval-1/16/3 in the P1 grading run
- [Eval design methodology](feedback_eval_design_methodology.md) — validating LLM artifacts: floor test w/ stronger same-vendor model, counterexamples not averages, ablation, separate from run_eval
- [Reproduce one FV case from coverage](feedback_reproduce_fv_case_from_coverage.md) — extract the row from the frozen boards_coverage_*.jsonl (id=index unless explicit); glossary read fresh at prompt time; don't hand-build input
- [Engine soundness first, render later](feedback_engine_soundness_then_render.md) — store soundest/complete evidence; render/prune to LLM is a SEPARATE downstream step; don't let render rules narrow what the engine stores (D26)
- [Sparse look-ahead unvalidated](project_sparse_lookahead_unvalidated.md) — judged 2026-06-25; case1&2 deepening + INITIAL depth tier added (NOT re-judged); pre-move-query + DFS-budget test traps
- [drawing_move mislabels wins](project_drawing_move_mislabels_wins.md) — open bug: win-forfeiting move tagged drawing_move; Fix 4 patched rule text, Fix 6 (upstream tagging) still TODO
- [Lookahead shared seam](project_lookahead_shared_seam.md) — collectNovelOpportunities/compareOpportunities feed BOTH feature vector AND production annotation gate; characterize before editing
- [Opening defender reason SHIPPED](project_opening_defender_reason_gap.md) — openingContext.defense (P2 hold-the-line) implemented (D32); NON-OBVIOUS: centrality NOT suppressed for losing mover (resistAndWait + conditional even-row canon instead)

## Papergames integration

- [Papergames auth API](reference_papergames_auth.md) — reCAPTCHA blocks server login; refresh workaround
- [Papergames integration](project_papergames_integration.md) — API path bug; bulk insert dedup bug
- [Papergames live game](project_papergames_live_game_integration.md) — 4 known bugs (uncommitted on stagging)
- [Spec 038 import](project_spec038_papergames_self_service_import.md) — loadUser 3-site trap for new columns

## Simulation, scripts, worktrees, epics & general workflow

- [Game simulation harness](reference_game_simulation_harness.md) — all self-play centralized in server/gameSampling.js (playGame/simulateGame/harvestBlunders/playPolicyGame); don't hand-roll
- [Coverage sampler rare-fill trap](project_coverage_sampler_rarefill_trap.md) — select_boards coverage "stuck": a near-unreachable REQUIRED predicate makes satisfied() never flip → full-budget solver burn; bound any harvest-until-satisfied loop
- [gameSampling rng determinism trap](project_gamesampling_rng_determinism_trap.md) — changing rng usage shifts candidate-generator output; FR-011 minMoves floor protects T017
- [Inline Node scripts](reference_inline_node_scripts.md) — to inspect a reason vector use TOOLS/compute_feature_vector.mjs (don't hand-roll); wrapper=server/c4solver-wrapper.js; absolute imports; solver hangs (try/finally); await query; shell for-loop → EMPTY stdout
- [Scripts need meaningful --help](feedback_scripts_meaningful_help.md) — every relevant CLI script ships a real --help/-h (purpose+options+defaults); check before required-arg validation; inside import.meta entry guard if also imported
- [Repo worktree setup traps](project_repo_worktree_setup.md) — worktree base defaults to origin/main (172 commits behind stagging, no gameSampling.js); reset to stagging HEAD; copy gitignored server/.env in or reason tests ENOENT
- [Win-dist pending merge](project_win_distribution_pending_merge.md) — winning-cell distribution pipeline complete but UNMERGED on branch worktree-win-dist-grid; user deferred merge to stagging
- [Epics-manager consolidation](project_epics_manager_consolidation.md) — 8 per-epic managers deleted; use generic `/epics-manager <epic-file> [epic-id]`; epics self-carry Settled decisions/Non-obvious facts/Authoritative sources
- [Speckit/epic scoping](feedback_speckit_epic_scoping.md) — plan vs speckit vs epic+manager sizing bars; what belongs in an epic doc vs the pipeline; hard algos stay in spec; handoff = one command
- [Prework discipline](feedback_prework_discipline.md) — answer before editing; empirical-first; audit all code paths before an epic; Sonnet spec-review before plan
- [Workflow hygiene](feedback_workflow_hygiene.md) — no destructive git for curiosity; quarantine before delete; mark tasks done; rg/fd/sg; don't pkill shared server; bg subagents can't write
- [Agent & UI workflow](feedback_agent_and_ui_workflow.md) — Opus critique/Sonnet apply; prepopulate reviewed data in one shot; ASCII diagrams; AskUserQuestion ≥2 options
- [Audit existing APIs before speccing](feedback_spec_existing_apis.md) — preserve existing component API unless the change strictly requires otherwise (CLAUDE.md-referenced)
- [callLLM error handling in scripts](feedback_calllm_error_handling.md) — wrap each callLLM call individually; uncaught error silently drops the entry
- [LLM output root-cause](feedback_llm_output_root_cause.md) — goal-first, then RCA across render/context/generator; a missing signal is a question, not a fact; observe with tools
- [Occam + principled extrapolation](feedback_occam_principled_extrapolation.md) — one unifying mechanism over many special-case kinds; generalize from examples, don't enumerate cases
- [One-command pipeline, extend don't add](feedback_one_command_pipeline_extend_dont_add.md) — extend the existing command over a new script/strategy; one command feeds the next stage; keep cases solver-verified + both players
- [Product doc authoring](feedback_product_doc_authoring.md)
- [Superpowers docs aren't durable](feedback_superpowers_docs_not_durable.md) — design docs/plans under docs/superpowers/ are throwaway; migrate durable info to docs/architecture/
- [Explanation/question style](feedback_explanation_and_question_style.md) — pitch to a non-internals reader; alternatives carry a recommendation; no vague clarifying questions
- [Heatmap terminology](feedback_heatmap_terminology.md) — use "column-score overlay"
- [Pedagogy preferences](feedback_pedagogy_preferences.md) — no lost-position lessons

## Reference — project architecture

- [User profile](user_profile.md) — strong C++/React/algorithms background; empirical debugger style
- [SpecKit workflow](project_speckit_workflow.md) — spec directories at specs/; CLAUDE.md pointer
- [MVP epic plan](project_mvp_epic_plan.md) — 10 epics in ship order; product-vs-code mismatches
- [Custom commands](reference_custom_commands.md) — /mvp-manager, /coordinate-implementation, /past-games-manager
- [Multi-agent orchestration patterns](reference_multiagent_orchestration_patterns.md) — handoff; AskUserQuestion gate
- [Knowledge base status](project_kb_status.md) — naming/gaps/PENDING; opening-theory cluster (fully verified); verify movestrings w/ optimal_line.mjs + Allen-notation traps
- [External PDFs](reference_external_pdfs.md) — Allis/Bagan/Allen PDFs; page ranges; corrections
- [Open Chrome debug](reference_open_chrome.md) — binary launch required; open -a fails on macOS
