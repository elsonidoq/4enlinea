# Memory index — trigger-first

## Before driving a speckit epic / looking for a `*-manager` command

- [Epics-manager consolidation](project_epics_manager_consolidation.md) — 8 per-epic managers deleted; use generic `/epics-manager <epic-file> [epic-id]`; epics must self-carry Settled decisions/Non-obvious facts/Authoritative sources

## Before writing a game simulation / random-position loop

- [Game simulation harness](reference_game_simulation_harness.md) — all self-play centralized in server/gameSampling.js (playGame/simulateGame/harvestBlunders); don't hand-roll
- [gameSampling rng determinism trap](project_gamesampling_rng_determinism_trap.md) — changing rng usage shifts candidate-generator output; FR-011 minMoves floor protects T017

## Before touching the solver or board evaluation

- [c4solver score semantics](reference_c4solver_scores.md) — sign/magnitude, book encoding
- [Score universality trap](reference_c4solver_score_universality.md) — max<0=ALL lose vs min<0=SOME lose
- [c4solver behavioral quirks](reference_c4solver_behavior.md) — error vs hang; JS formula off-by-1
- [Forced-block detection](reference_cat5_forced_block_detection.md) — use checkWin, not flat scores
- [Binary stale/crash fix](feedback_binary_rebuild.md) — delete + make to recompile
- [Railway clock skew](project_railway_solver_clock_skew.md) — -B flag + test -f guard in railpack.json
- [Classify vs classifyPattern](reference_classify_vs_classifyPattern.md) — sync/8-tag vs async/15-detector; +3 parity threats; Map priority
- [Integration test hang](project_integration_test_slowness.md) — IPC deadlock; use test:fast

## Before adding a puzzle category

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
- [odd_even_threat is puzzle-only](project_odd_even_threat_puzzle_only.md) — still a classifyPattern tag + category, but de-listed from coach + blunder vocab (2026-06-25)

## Before writing a server endpoint

- [POST /api/scores contract](reference_api_scores_endpoint.md) — POST not GET; INVALID_MOVE=-1000 sentinel
- [Express 5 wildcard](feedback_express5_wildcard.md) — use /{*path} not *
- [Explicit server flags](feedback_explicit_server_flags.md) — use aiMove:true flag, not absence-of-field
- [Auth header on upgraded fetches](feedback_auth_header_on_fetch.md) — add Authorization when req.user check added
- [trust proxy on Railway](bug_railway_trust_proxy.md) — required or rate-limit throws 500
- [Server architecture](project_server_architecture.md) — endpoint map; tier access; rate limits
- [Supabase session contamination](bug_supabase_js_session_contamination.md) — two clients: supabase (DB) + authClient (auth)
- [GoTrue trigger not firing](bug_supabase_trigger_not_firing.md) — loadUser auto-creates public.users row
- [Error logging](feedback_server_testing_pattern.md) — extract helper + node --test (no endpoint harness)
- [eval-results field whitelist](project_eval_results_field_whitelist.md) — /api/admin/eval-results/:filename whitelists row fields; new run_eval fields dropped unless added there too

## Before writing a DB migration

- [Constraint order](feedback_migration_constraint_order.md) — drop constraints BEFORE updating data
- [Explicit grants required](project_supabase_grants.md) — Oct 30 2026 deadline; pattern from migration 012
- [Candidates FK dependency](project_candidates_fk.md) — delete false_positive_records first
- [PostgREST schema cache](reference_postgrest_schema_cache.md) — reload schema after adding column
- [Bulk insert + unique constraint](feedback_bulk_insert_unique_constraint.md) — one dupe rolls back whole batch
- [is_active not approved](reference_puzzles_table_columns.md) — puzzles uses is_active; candidates uses status

## Before deploying

- [Spec 039 deploy requirement](project_spec039_audio_interactive_coach.md) — TRUNCATE explanation_cache before deploy
- [Railway clock skew](project_railway_solver_clock_skew.md) — -B + test -f in railpack.json
- [Trust proxy](bug_railway_trust_proxy.md) — must be set or Railway returns 500 on rate-limited routes
- [Service worker cache](bug_service_worker_stale_cache.md) — network-first for HTML; cache-first for hashed assets
- [Migration runner](project_spec031_staging_production_deploy.md) — migrate.js; baseline mode; c4solver compile from source

## When debugging auth

- [Magic link hash race](project_magic_link_auth_race.md) — replaceState must preserve window.location.hash
- [Magic link redirect URL](bug_auth_magic_link_redirect.md) — URL must be allowlisted in Supabase
- [Google OAuth state](project_spec036_google_oauth.md) — encodeURIComponent load-bearing; DeepRevealPane trap
- [Auth/payments state](project_auth_payments_state.md) — client SDK removed; httpOnly cookies only; Stripe deferred
- [Supabase config modifiable](feedback_supabase_config_modifiable.md) — production settings can be changed via dashboard
- [Local Supabase setup](project_local_supabase_setup.md) — JWT format for service_role key; sb_secret_* doesn't work locally

## When the board looks wrong

- [Board color inversion](reference_board_color_inversion.md) — 'red' renders green; Board takes board[][] not cols
- [CSS token pairing](reference_token_pairing.md) — dark-surface tokens vs light-surface tokens; pairing rule
- [Highlight cell roles](project_highlight_cell_colors.md) — use userIsYellow for role assignment
- [Claimeven highlight roles](project_claimeven_implementation.md) — Yellow perspective; cooperativeAiMoves always empty
- [Tier source](reference_tier_source.md) — tier from store.getProfile() not session.tier
- [Mockup vs production gap](feedback_mockup_production_gap.md) — NAV_GROUPS/mkCols/cols don't exist in production
- [Parity bug AI-first](project_parity_bug_ai_first.md) — heatmap inversion on AI-first games (unfixed)

## When reasoning about tactical patterns

- [Tactical pattern definitions](reference_tactical_pattern_definitions.md) — formal predicates for figure_7/j_shape/undercut/overcut
- [c4solver score universality](reference_c4solver_score_universality.md) — max<0 vs min<0 semantics
- [Claimeven detection](reference_claimeven_detection.md) — simulation-based algorithm; ~20 solver queries
- [Z-threat detection](reference_z_threat_detection.md) — odd empty cell count; UI visualization spec
- [Allen V-rule examples](reference_allen_v_rule_examples.md) — verified movestrings V1–V5
- [Allis rule examples](reference_allis_rule_examples.md) — verified movestrings for all 9 rules
- [T4 example movestring](reference_t4_example_movestring.md) — Case A example; PENDING movestrings noted
- [T4 vs forced_win trap](reference_t4_vs_forced_win_trap.md) — T4 movestring is 1-indexed; fails forced_win
- [Cat 5 forced-block detection](reference_cat5_forced_block_detection.md) — all scores equal; use checkWin directly
- [missed_own capitalize principle](project_missed_own_capitalize_principle.md) — established double_threat/figure_7/immediate_threat survive wrong moves; missed_own = correctCol BUILDS pattern, not "had it & lost it"; only undercut (same col, row≤) kills a fork

## When working with movestrings

- [Never generate random boards](feedback_no_random_boards.md) — source from DB, git history, or KB
- [Coordinate convention](reference_coordinate_convention.md) — 0-indexed; two translation boundaries only
- [Visualize board script](project_puzzle_quality_nav_fixes.md) — isClean guards; forced_win min 5-ply
- [T4 vs forced_win trap](reference_t4_vs_forced_win_trap.md) — T4 movestring is 1-indexed

## When working with the DB schema

- [Supabase connection](reference_supabase_connection.md) — sb_secret format; session pooler; Node inline pattern
- [Supabase storage API](reference_supabase_storage_api.md) — upload/createSignedUrl shapes; signedUrl not url
- [PostgREST schema cache](reference_postgrest_schema_cache.md) — reload after adding column
- [Blunder severity measure](blunder_severity_graduated_measure.md) — bestScore<0 guard removed; atomic upsert
- [Suboptimal/blunder unification](project_suboptimal_blunder_unification.md) — quality column; ExplorerScreen deleted
- [Stats architecture](project_stats_architecture.md) — stats from puzzle_attempts; session_stats orphaned
- [Data model gotchas](reference_puzzles_table_columns.md) — is_active not approved; candidates uses status
- [Spec 030 session-stats write asymmetry](project_spec030_server_mediated_data_access.md) — asymmetric write shapes; must not unify
- [byPattern always empty](project_spec030_session_stats_bypattern_mismatch.md) — stored shape mismatch

## When writing inline Node.js scripts

- [Inline Node scripts](reference_inline_node_scripts.md) — absolute imports; export `createSolverProcess`; solver hangs (try/finally+close); solver.query is async—await it (else `{}`)

## When touching the LLM coach / deep reveal

- [Deep reveal eval harness](reference_deep_reveal_eval_harness.md) — run_eval.mjs (solver ground-truth) + /judge-deep-reveals (3 axes); admin flag→feedback sidecar left-joined by id
- [Feature vector design](feedback_feature_vector_design.md) — toFeatureVector: keep grounded cells, drop plumbing/derivations/occurrence-artifacts; keep instance counts
- [Explain prompt grounding traps](project_explain_prompt_grounding_traps.md) — 3 open explainContext traps (empty section, parity always_include, blunder-threat direction mismatch) drive fabrication
- [LLM perspective bug](feedback_llm_perspective_bug.md) — name player explicitly in Move context section
- [Explain system](project_explain_system.md) — LLM prompt invariants; explanation_cache schema; data flow; threat comparison format; major/minor threat KB terms conditional
- [always_include mechanism removed](project_kb_major_minor_threat_not_always_include.md) — NO KB term injects without its pattern firing; parity/gravity_top also removed 2026-06-25; do not revert
- [Zone alias must match prompt](project_zone_alias_must_match_prompt.md) — alias absent from map → P1:invalid_spec; major=always, minor=conditional
- [Blunder tagging design](project_blunder_tagging_design.md) — tagBlunder throws NotABlunderError on terminal; missed_own = correctCol builds pattern
- [Pattern tier definitions](project_pattern_tier_definitions.md) — Tier-1/2/3 live in explainContext.js not classifier.js; 3 unrelated "tier" meanings
- [Pattern KB architecture](project_pattern_kb_architecture.md) — PATTERN_KB entry shapes; popup checklist
- [Pattern KB alias resolution](project_pattern_kb_alias_resolution.md) — alias resolution fix 2026-06-21
- [Coach deep reveal docs](project_coach_deep_reveal_docs.md) — authoritative docs; Epic A/B contracts
- [Annotation gate](project_epic_a_annotation_gate.md) — allowedSet shapes; findMajorThreatWindows |
- [Patterns blunders done](project_patterns_blunders_done.md) — inverted semantic; allowedSet=null vs []; debug guide
- [Deep reveal zone fixes](deep_reveal_zone_validation_fixes.md) — P5strong:tg zero-count trap; P3 markup stripping; normalizeZoneTags
- [Deep reveal failures table](reference_deep_reveal_failures.md) — debugging tool for annotation rejections
- [eval_set_large_3_sparse subset](reference_eval_set_large_3_sparse_subset.md) — strict subset of eval_set_large_3.json; don't combine
- [Feature vector content traps](project_feature_vector_content_traps.md) — null outcomes on losing_either_way; patternsOpponent snapshot ambiguity; pliesToEnd inverted (=|score|); immediate_threat severity from tag; wrong field worse than absent
- [Reason-engine reorg 2026-06-30](project_reason_engine_reorg.md) — reason_audit→server/scripts/reason_engine/ (scaffolding deleted); from-vector eval now on the reason vector via toNarratorVector; OLD toFeatureVector STILL feeds production /api/explain* (don't delete); reasonEngine tests now in test:fast; scripts-folder split principle
- [Reason-field unification](project_reason_field_unification.md) — the 5 blunder-reason kinds collapse to ONE rule: exhibit the winning connect-4 line(s) + compare timing/availability across branches; no opponent line reachable → OMIT (not a blunder)
- [Reason-engine docs are canonical](project_admin_fv_suff_repurposed.md) — before reason_engine/ work read the 4 docs (reason-INVARIANTS/DECISIONS, my_pseudocode, blunder-reason-evidence) + reason-AGENT-PREAMBLE; engine emits tacticTag(gated)/tie/parityAttribution/anchorCells + fork-stop & unified occupation-denial witness (DECISIONS D13-D18, INVARIANT I12); /admin/fv-suff = reason browser (restart server gotcha)
- [Reason-engine case classifier trap](project_reason_engine_case_classifier_trap.md) — win_to_slower_win gated on bestScore>0 && playedScore>0, NOT bestScore*playedScore>0 (which swallows lose_to_faster_lose)
- [Denial is always occupation](project_reason_denial_always_occupation.md) — D18: unified PV witness (BFS retired); no_occupation:exhaustive=true is structurally impossible (depth artifact); D17 §3 / opponentPunishment-spec describe the superseded design
- [Deep reveal TTS](project_deep_reveal_tts.md) — TTS streaming; audio keyed by text hash not position
- [Deep reveal product mindset](feedback_deep_reveal_product_mindset.md) — score is a compass not the reason; sparse≠no-reason; "better"=breadth of punishable opponent mistakes; never fabricate
- [Eval design methodology](feedback_eval_design_methodology.md) — when validating LLM artifacts: floor test w/ stronger same-vendor model, counterexamples not averages, ablation, separate from run_eval
- [FV-grounding correctness over speed](feedback_fv_grounding_correctness_over_speed.md) — spec 040 premise; extra solver passes OK; reachability ceiling via real mistake-mode search; optimize only after soundness proven
- [Sparse look-ahead unvalidated](project_sparse_lookahead_unvalidated.md) — judged 2026-06-25; case1&2 deepening + INITIAL depth tier added (NOT re-judged); pre-move-query + DFS-budget test traps
- [drawing_move mislabels wins](project_drawing_move_mislabels_wins.md) — open bug: win-forfeiting move tagged drawing_move; Fix 4 patched rule text, Fix 6 (upstream tagging) still TODO
- [Lookahead shared seam](project_lookahead_shared_seam.md) — collectNovelOpportunities/compareOpportunities feed BOTH feature vector AND production annotation gate; characterize before editing; FV-grounding epic+/fv-grounding-manager
- [run_eval resume-mode trap](project_run_eval_resume_mode_trap.md) — regen silently skips ids already in output jsonl; rm -f first + pass explicit input/output; frozen vectors are prune:false

## When working on the past-games / review flow

- [ReviewScreen nav contract](reference_review_screen_nav.md) — go('review', { id }) not moveString
- [navigateToMistake API](reference_review_screen_navigate_to_mistake.md) — takes number; blunderDetail only since 2026-06-21
- [Past games epics decisions](project_past_games_epics.md) — globalPlyIndex formula; locked nav decisions
- [Spec 037 open QA bugs](project_spec037_review_blunder_sharing.md) — 4 open bugs; is_owner!=false gate
- [SequenceHandler is gone](project_sequence_handler_ui.md) — ChallengeScreen.handleSequenceClick has the logic
- [Spec 034 isSubmitting trap](project_spec034_board_interaction.md) — explicit per-branch, not finally

## When touching the challenge / puzzle flow

- [Challenge evaluation shape](project_challenge_evaluation_shape.md) — summaryLine vs summaryLineKey polymorphism
- [ChallengeScreen mode extensions](feedback_challenge_screen_mode_extensions.md) — audit bare `category` refs
- [Challenge sets server only](project_challenge_sets_server_only.md) — no frontend mirror
- [/draw returns snake_case](project_draw_endpoint_snake_case.md) — /puzzles/:id returns camelCase
- [recordPuzzleAttempt shape](project_record_puzzle_attempt_shape.md) — 6-field snake_case; spec 030 change
- [Puzzle advancement](project_puzzle_advancement.md) — must call recordPuzzleAttempt on correct answer
- [forced_win refactor](project_forced_win_refactor.md) — CompletionStrategy; bitboard-only AI response
- [Interaction mode](project_interaction_mode_architecture.md) — sequence vs single_move

## When working on the frontend

- [CSS flex-basis % trap](reference_css_flex_basis_percentage_height_trap.md) — use px via ResizeObserver
- [SplitReveal minHeight:0 trap](reference_split_reveal_min_height.md) — containing flex item needs minHeight:0 or board fills viewport; siblings in bounded column must move inside scrollable area
- [CSS maxWidth % trap](reference_css_maxwidth_percentage_trap.md) — pair maxWidth with explicit width
- [#root max-width cap](reference_root_maxwidth_cap.md) — #root globally capped at 480px (mobile shell); full-width admin pages override #root inline on mount/restore on unmount
- [Check CSS before using mockup class names](feedback_check_css_before_using_mockup_classes.md) — grep tokens.css first
- [Mobile tap highlight](feedback_mobile_tap_highlight.md) — WebkitTapHighlightColor on tappable divs
- [Navigator params spread](feedback_navigator_params_spread.md) — params spread as direct props
- [Frontend architecture](project_frontend_architecture.md) — routes; component map; store layer
- [en.json duplicate mistakes key](reference_en_json_duplicate_mistakes.md) — line ~707 is effective; ~492 is dead
- [Valid blunder tags vs categories](reference_valid_blunder_tags.md) — VALID_BLUNDER_TAGS != VALID_CATEGORIES

## When working on papergames integration

- [Papergames auth API](reference_papergames_auth.md) — reCAPTCHA blocks server login; refresh workaround
- [Papergames integration](project_papergames_integration.md) — API path bug; bulk insert dedup bug
- [Papergames live game](project_papergames_live_game_integration.md) — 4 known bugs (uncommitted on stagging)
- [Spec 038 import](project_spec038_papergames_self_service_import.md) — loadUser 3-site trap for new columns

## General behavioral rules (always apply)

- [callLLM error handling in scripts](feedback_calllm_error_handling.md) — wrap each callLLM call individually; uncaught error silently drops the entry
- [Answer before editing](feedback_answer_before_editing.md)
- [Empirical first](feedback_empirical_first.md)
- [LLM output root-cause](feedback_llm_output_root_cause.md) — goal-first, then RCA across render/context/generator; a missing signal is a question, not a fact; observe with tools
- [Occam + principled extrapolation](feedback_occam_principled_extrapolation.md) — one unifying mechanism over many special-case kinds; generalize from examples, don't enumerate cases

- [Use rg/fd/sg not grep/find](feedback_use_ripgrep.md)
- [Mark tasks completed promptly](feedback_update_tasks_promptly.md)
- [Quarantine before delete](feedback_quarantine_before_delete.md)
- [No random boards](feedback_no_random_boards.md)
- [No git stash](feedback_no_git_stash.md)
- [Audit all code paths before epic](feedback_audit_all_paths_before_epic.md)
- [Spec review before plan](feedback_spec_review_before_plan.md)
- [Audit existing APIs before speccing](feedback_spec_existing_apis.md)
- [Epic+manager sizing](feedback_epic_manager_sizing.md) — bespoke speckit manager command only for ≥2 stories × ≥7 tasks; else writing-plans
- [Product doc authoring](feedback_product_doc_authoring.md)
- [Superpowers docs aren't durable](feedback_superpowers_docs_not_durable.md) — design docs/plans under docs/superpowers/ are throwaway; migrate durable info to docs/architecture/, agents never read them
- [Hard-derived algorithms in spec](feedback_hard_derived_algorithms_in_spec.md)
- [Epic sizing for speckit](feedback_epic_sizing_speckit.md)
- [Epic vs speckit scope](feedback_epic_vs_speckit_scope.md)
- [Handoff prompt: single slash command only](feedback_handoff_no_mixed_commands.md)
- [ASCII diagrams for UI brainstorming](feedback_ascii_diagrams_brainstorming.md)
- [Opus for critique, Sonnet for apply](feedback_agent_model_selection.md)
- [Background subagents get Edit/Write denied](feedback_subagent_write_permissions.md)
- [Prepopulate reviewed data upfront](feedback_prepopulate_pattern.md)
- [AskUserQuestion needs ≥2 options](feedback_ask_user_question_min_options.md)
- [Explanation/question style](feedback_explanation_and_question_style.md) — pitch to a non-internals reader; alternatives carry a recommendation; no vague clarifying questions
- [Heatmap terminology](feedback_heatmap_terminology.md) — use "column-score overlay"
- [Server restart kills Vite](feedback_server_restart.md)
- [Pedagogy preferences](feedback_pedagogy_preferences.md) — no lost-position lessons
- [Mockup vs production gap](feedback_mockup_production_gap.md)
- [Supabase config modifiable](feedback_supabase_config_modifiable.md)

## Reference — project architecture

- [User profile](user_profile.md) — strong C++/React/algorithms background; empirical debugger style
- [Classifier architecture](project_classifier_architecture.md) — pipeline; category detection rules
- [Server architecture](project_server_architecture.md) — endpoint map; auth middleware; rate limits
- [Frontend architecture](project_frontend_architecture.md) — routes; store; component map
- [SpecKit workflow](project_speckit_workflow.md) — spec directories at specs/; CLAUDE.md pointer
- [MVP epic plan](project_mvp_epic_plan.md) — 10 epics in ship order; product-vs-code mismatches
- [Custom commands](reference_custom_commands.md) — /mvp-manager, /coordinate-implementation, /past-games-manager
- [Multi-agent orchestration patterns](reference_multiagent_orchestration_patterns.md) — handoff; AskUserQuestion gate
- [Knowledge base status](project_kb_status.md) — 38 entries; 58 gaps; worked_examples PENDING
- [External PDFs](reference_external_pdfs.md) — Allis/Bagan/Allen PDFs; page ranges; corrections
- [Open Chrome debug](reference_open_chrome.md) — binary launch required; open -a fails on macOS
