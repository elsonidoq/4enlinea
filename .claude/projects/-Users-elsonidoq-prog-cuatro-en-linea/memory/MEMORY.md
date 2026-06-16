# Memory index

- [User profile](user_profile.md) — strong C++/React/algorithms background, empirical debugger-first style, prefers concise responses

## Feedback — behavioral rules

- [Supabase config is modifiable](feedback_supabase_config_modifiable.md) — production Supabase settings can be changed via dashboard; never assume they're locked

- [Spec redesigns: audit existing APIs first](feedback_spec_existing_apis.md) — read current component props before writing spec prop shapes; only change what is strictly necessary
- [AskUserQuestion requires min 2 options](feedback_ask_user_question_min_options.md) — single-option questions throw InputValidationError; always provide at least 2 distinct options
- [Run a critical subagent review after speckit-specify](feedback_spec_review_before_plan.md) — Sonnet subagent vs best_practices_spec_driven_development.md catches blocking issues before plan
- [Prefer empirical testing over theoretical analysis](feedback_empirical_first.md) — run code early; don't spend many rounds on mental analysis before testing
- [ASCII diagrams for UI brainstorming](feedback_ascii_diagrams_brainstorming.md) — use ASCII art for screen layouts; skip the browser visual companion offer entirely
- [Answer questions before editing](feedback_answer_before_editing.md) — always answer the question in text first, then proceed with any file edits or tool calls
- [Never generate random boards](feedback_no_random_boards.md) — random movestrings are not valid game positions; source from DB, git history, or KB examples
- [Never run git stash to check baselines](feedback_no_git_stash.md) — git stash corrupted the index 2026-05-18; use code reasoning instead
- [Mark tasks completed promptly](feedback_update_tasks_promptly.md) — update task status immediately when done, not in batches at end of session
- [Preferred search tools](feedback_use_ripgrep.md) — `rg` for text, `fd` for files, `sg` (ast-grep) for structural patterns, LSP for semantic; never `grep -r`
- [Pre-populate reviewed data — fetch all related fields upfront](feedback_prepopulate_pattern.md) — trace every UI field to its source table before writing the API select
- [Keep hard-derived algorithms in spec](feedback_hard_derived_algorithms_in_spec.md) — don't move costly-to-derive algorithms to plan.md; their presence in spec is a deliberate lock
- [Migration constraint order](feedback_migration_constraint_order.md) — drop constraints before updating data, not after; learned from broken migration 013
- [c4solver binary stale/crash fix](feedback_binary_rebuild.md) — exit 137 or wrong behavior: delete binary and `make` (Makefile copies to server/ automatically)
- [Server restart kills Vite](feedback_server_restart.md) — pkill on server/index.js kills Vite too (same terminal process group); tell user to restart manually
- [Server testing pattern — extract helper + node --test](feedback_server_testing_pattern.md) — no endpoint test harness; extract thin helpers and unit-test with node --test (NOT Jest)
- [LLM perspective bug — name the player explicitly](feedback_llm_perspective_bug.md) — post-move board says "Next: Yellow" → LLM adopts opponent's perspective; fix with `## Move context` section
- [Mobile tap highlight fix](feedback_mobile_tap_highlight.md) — tappable non-button elements need `WebkitTapHighlightColor: transparent` + `userSelect: none`
- [Pedagogy preferences](feedback_pedagogy_preferences.md) — no lost-position lessons; no abstract Allis rules (except Claimeven + Claimodd which are concrete and visual)
- [Opus for critique, Sonnet for applying decisions](feedback_agent_model_selection.md) — use Opus for independent gap analysis; Sonnet for mechanical document updates
- [Mockup-vs-production gap verification](feedback_mockup_production_gap.md) — mockup uses NAV_GROUPS/mkCols/variant rail absent from production; grep src/ before speccing
- [Check CSS exists before using mockup class/token names](feedback_check_css_before_using_mockup_classes.md) — grep tokens.css + index.css before using any class or `--token` from mockup
- [Epic vs speckit scope](feedback_epic_vs_speckit_scope.md) — when auditing an epic doc for speckit, only fix factual errors / cross-epic contracts / mockup-vs-Gap conflicts
- [Don't mix slash commands in a single handoff prompt](feedback_handoff_no_mixed_commands.md) — pre-answer clarifications inline instead of telling agent to run a second command
- ["Heatmap" is ambiguous terminology](feedback_heatmap_terminology.md) — use "column-score overlay" instead; "heatmap" was used for something different in a PoC
- [Auth header required on upgraded fetches](feedback_auth_header_on_fetch.md) — when adding req.user checks server-side, also add Authorization header at the fetch call site
- [Navigator spreads params as direct props](feedback_navigator_params_spread.md) — don't destructure a `params` object in screens; navigation params are spread as individual props
- [Product doc authoring](feedback_product_doc_authoring.md) — MVP product docs state requirements not implementation; anchor principles to llm_feedback rows; reconcile against authoritative docs
- [ChallengeScreen mode extensions — audit `category` references](feedback_challenge_screen_mode_extensions.md) — any new mode must replace bare `category` refs with `effectiveCategory`
- [Express 5 wildcard catch-all syntax](feedback_express5_wildcard.md) — use `app.get('/{*path}', ...)` not `app.get('*', ...)`; bare `*` throws PathError
- [Audit all code paths before writing an epic](feedback_audit_all_paths_before_epic.md) — grep all usages of affected key/function prefix and read every call site
- [Use explicit server flags, not absent-field branching](feedback_explicit_server_flags.md) — send an explicit flag (e.g. `aiMove: true`); other callers may also lack the "distinguishing" field
- [Quarantine before delete](feedback_quarantine_before_delete.md) — move suspected-dead files to quarantine folder first, QA the site, then delete if clean
- [Bulk insert + unique constraint = silent full-batch loss](feedback_bulk_insert_unique_constraint.md) — one duplicate row rolls back the whole batch; treating that error as benign leaves 0 rows written

## References — solver and board mechanics

- [Coordinate convention](reference_coordinate_convention.md) — all internal coords 0-indexed; only two translation boundaries: frontend display + c4solver-wrapper
- [c4solver score semantics](reference_c4solver_scores.md) — sign=current-player perspective; magnitude=speed of outcome; range [-18,+18]; book encodes as score+19
- [c4solver behavioral quirks](reference_c4solver_behavior.md) — returns error (not silent hang) for winning-move strings; scores invalid at won positions; JS formula off-by-1
- [c4solver score universality trap](reference_c4solver_score_universality.md) — max(scores)<0 = ALL moves lose; min(scores)<0 = SOME move loses; sign flip causes false positives
- [Cat 4 forced_win forced-block detection](reference_cat5_forced_block_detection.md) — solver scores can't identify forced block in forced-win terminal; use direct board checkWin
- [classify() vs classifyPattern()](reference_classify_vs_classifyPattern.md) — classify() sync/8-tags/no-perspective; classifyPattern() async/12-tags/perspective-aware/Map result
- [POST /api/scores contract](reference_api_scores_endpoint.md) — POST (not GET); body {moves}; response {scores: number[7]}; INVALID_MOVE=-1000 sentinel

## References — tactical patterns and examples

- [Tactical pattern definitions](reference_tactical_pattern_definitions.md) — formal predicates for j_shape, figure_7, undercut, overcut with canonical coordinates
- [Claimeven detection algorithm](reference_claimeven_detection.md) — simulation-based (Red solver, Black same-column); exact, no false positives; ~20 solver queries
- [Z-threat detection + visualization](reference_z_threat_detection.md) — parity count odd=Z-threat; vertical capsule highlight; count badge above board
- [T4 Case A example movestring](reference_t4_example_movestring.md) — `1115222555577773663636617` solver-verified; two Red odd-row threats at col4, demonstrates T4 no-bonus rule
- [T4 movestring is NOT forced_win](reference_t4_vs_forced_win_trap.md) — `1115222555577773663636617` is 1-indexed and fails ForcedWinStrategy; do not use for forced_win puzzles
- [Allen V-rule example movestrings](reference_allen_v_rule_examples.md) — ALL V1–V5 verified; V1=`44452556366`, V4=`2134124321317273`
- [Allis rule example movestrings](reference_allis_rule_examples.md) — all 9/9 rules verified; baseclaim=`263223362`, specialbefore=`2365555`
- [External reference PDFs](reference_external_pdfs.md) — Allis (91p), Bagan (30p), Allen (276p); pdfminer.six for extraction; key page ranges recorded

## References — tooling

- [Custom slash commands](reference_custom_commands.md) — project commands at `.claude/commands/`; `/mvp-manager`, `/coordinate-implementation`, `/past-games-manager`
- [Multi-agent orchestration patterns](reference_multiagent_orchestration_patterns.md) — handoff context pattern, AskUserQuestion gate, Opus-for-critique/Sonnet-for-create, state persistence

- [PostgREST schema cache](reference_postgrest_schema_cache.md) — adding a column via SQL requires a schema reload or PostgREST returns "Bad Request"
- [deep_reveal_failures table](reference_deep_reveal_failures.md) — logs P5Strong zone-tag validation failures with full prompt + raw LLM output; primary tool for debugging annotation rejections

## References — infrastructure

- [Supabase connection details](reference_supabase_connection.md) — sb_publishable/sb_secret key format; direct DB host fails, use pooler; Node inline query pattern
- [Open Chrome with remote debugging](reference_open_chrome.md) — must use binary directly; `open -a` fails to bind port 9222 on macOS/Chrome 147
- [ReviewScreen navigation contract](reference_review_screen_nav.md) — `go('review', { id: game.id })`; URL is `/game/:id`; screen takes `id` prop (UUID)
- [ReviewScreen.navigateToMistake API](reference_review_screen_navigate_to_mistake.md) — takes a number (user-move ordinal), not a move object; branch on quality via `analysis.moves.find()` first
- [VALID_BLUNDER_TAGS vs VALID_CATEGORIES](reference_valid_blunder_tags.md) — different sets; `server/blunderTags.js` is source of truth for `mistakes.pattern.*` i18n keys
- [Gemini model name](reference_gemini_model.md) — correct model is `gemini-3.1-pro-preview`; use in all MCP Gemini tool calls
- [en.json duplicate mistakes block](reference_en_json_duplicate_mistakes.md) — two top-level "mistakes" keys; only the second (~line 707) is effective

## References — board rendering

- [Board disc color inversion + production Board API](reference_board_color_inversion.md) — `'red'` renders GREEN, `'yellow'` renders GRAY; production Board takes `board[][]` not `cols`/`mkCols`
- [User tier source](reference_tier_source.md) — `session.tier` is always undefined; tier is on the profile, read via `store.getProfile().tier`
- [CSS token pairing — dark vs light surfaces](reference_token_pairing.md) — two token systems; never cross dark-surface tokens with light-text tokens; mockup-first rule
- [CSS width:100% resolves to auto when parent has only maxWidth](reference_css_maxwidth_percentage_trap.md) — must pair maxWidth with explicit width
- [CSS flex-basis percentage doesn't resolve against flexbox-computed height](reference_css_flex_basis_percentage_height_trap.md) — use pixel values via ResizeObserver

## Project — architecture

- [New category wiring checklist](project_new_category_wiring_checklist.md) — 8 files that must be touched when adding a puzzle category; missing candidate-generator.js causes silent failures
- [Puzzles table columns](reference_puzzles_table_columns.md) — use `is_active` (boolean) not `approved`; candidates table uses `status` text column instead
- [Classifier architecture and score convention](project_classifier_architecture.md) — c4solver score encoding, all 6 category detection rules, test fixture locations
- [Server architecture and endpoint map](project_server_architecture.md) — Express structure, auth middleware, rate limits, full endpoint table, tier access rules
- [Frontend architecture and component map](project_frontend_architecture.md) — routing, store layer, component hierarchy, i18n, PWA, build notes
- [SpecKit workflow and feature directory](project_speckit_workflow.md) — where specs live, CLAUDE.md pointer, task ordering rationale
- [AI difficulty — softmax sampling](project_depth_limited_search.md) — T={easy:5.0, medium:3.5, hard:2.5, perfect:0}; depth approach abandoned
- [Interaction mode architecture](project_interaction_mode_architecture.md) — single_move (current) vs sequence (multi-move); interaction_mode DB column

## Project — product decisions and plan

- [MVP epic plan (v4)](project_mvp_epic_plan.md) — 10 epics in ship order; key product decisions gaps 1–30; product-vs-code mismatches
- [New puzzle categories — spec locked](project_new_puzzle_categories.md) — z_threat, claimeven, undercut, overcut, figure_7, j_shape design decisions; highlight_metadata schema
- [Lesson curriculum scope — MVP](project_lesson_curriculum.md) — 11 MVP + 2 post-MVP lessons; parity chain L4→L5→L6→L7; what was cut and why
- [Auth mostly built; payments deferred](project_auth_payments_state.md) — ProfileStore/IndexedDBStore/SupabaseStore/AuthModal exist; Epic 7 is reskin + store extension
- [Stats from puzzle_attempts, not session_stats](project_stats_architecture.md) — GET /api/stats aggregates puzzle_attempts JOIN puzzles; session_stats table orphaned
- [Coach + Deep Reveal product docs](project_coach_deep_reveal_docs.md) — coach_explanation_principles.md + deep_reveal_product.md (AUTHORITATIVE); real new work = server-side validate-then-cache
- [Blunder tagging design decisions](project_blunder_tagging_design.md) — storage gate independent of tagging; forced_win first-class pattern; unknown→suboptimal_move; 4-epic plan
- [Category naming — zugzwang vs forced_win](project_category_cleanup.md) — fork_setup/parity_control removed; future zugzwang will be a distinct category
- [Blunder severity graduated measure](blunder_severity_graduated_measure.md) — bestScore<0 guard removed 2026-06-03; blunder_severity is the primary quality gate; atomic upsert

## Project — local dev / deploy

- [Local Supabase setup](project_local_supabase_setup.md) — URL/key config, Mailpit, service_role grants, dev workflow
- [Migrate endpoint fixes](project_migration_endpoint_fixes.md) — 3 bugs fixed: silent failures, null device_uuid, FK violation fallback
- [Spec 031 — staging/production deploy](project_spec031_staging_production_deploy.md) — Railway + two Supabase projects + migrate.js; 24 tasks; existing Supabase = production; c4solver must compile from source
- [Spec 032 — repo hygiene & tech-debt sweep](project_spec032_repo_hygiene.md) — 25 tasks; dead-code audit (npx dependency-cruiser) + green/gray sweep; PuzzlesPage/PlaceholderScreen pre-confirmed DELETE; lint gate = ≤ baseline (not exit 0)
- [Spec 034 — board interaction feedback](project_spec034_board_interaction.md) — IMPLEMENTED 2026-06-16; 10/10 tasks; Board animation gate, staged continue render, finally→explicit isSubmitting
- [Spec 036 — Google OAuth auth](project_spec036_google_oauth.md) — spec/plan/tasks complete; server-redirect OAuth, DeepRevealPane slug trap, encodeURIComponent load-bearing

## Project — implementation details

- [Epic 2a implementation state](project_epic2a_implementation.md) — challenges done; live endpoints, new screens, stubs for 2b, CSS token bug noted
- [Epic 3a implementation state](project_epic3a_implementation.md) — sparring done; DifficultyPickerScreen + GameScreen; POST /api/games; key contracts for 3b
- [Epic 3b implementation state](project_epic3b_implementation.md) — ReviewScreen + ExplorerScreen done; useGameBoard hook extracted; 3 new endpoints; open cosmetics
- [Epic 4 implementation state](project_epic4_implementation.md) — lesson screens + API shipped; lessons/ at connect-four/lessons/; key gotchas
- [Patterns-blunders Epics 1–3 done](project_patterns_blunders_done.md) — classifyPattern/tagBlunder/explainContext shipped; Epic 2 debug guide; Epic 3 traps
- [Epic A + B annotation gate & coach rebuild — done](project_epic_a_annotation_gate.md) — specs 021+022 shipped; zoneParser, annotationGate, 4-type taxonomy; key contracts
- [Past Games & Blunder Navigation epics](project_past_games_epics.md) — Epics A+B fully implemented; blunderDetail SESSION_ONLY; navigateToMistake takes a number; globalPlyIndex formula
- [Coach commentary epic — board-grounded messages](project_coach_commentary_epic.md) — spec/plan/tasks complete at specs/029; 16 tasks; key architectural decisions locked
- [Spec 030 — server-mediated data access](project_spec030_server_mediated_data_access.md) — spec/plan/tasks done; 43 tasks; session-stats write asymmetry, device_uuid server-derived, migrate covers 5 targets
- [Spec 030 — byPattern computation mismatch](project_spec030_session_stats_bypattern_mismatch.md) — both old and new getAllSessionStats read non-existent fields; byPattern always empty in prod
- [explain-move-llm endpoint + explanation_cache](project_explain_system.md) — data flow, LLM prompt invariants, cache schema, Type 1–4 taxonomy
- [Classifier current state + T037–T048 pending](project_classifier_current_state.md) — Cat1–Cat5 fixes done; J/U/O/F pattern detector bugs NOT yet fixed; FP rates
- [Knowledge base status](project_kb_status.md) — 30 entries done; 9 fact-check errors fixed; 58 gaps; worked_examples PENDING
- [forced_win refactor — done](project_forced_win_refactor.md) — CompletionStrategy interface; bitboard-only AI response; interaction_mode='sequence' on puzzles
- [Puzzle quality + nav fixes](project_puzzle_quality_nav_fixes.md) — isClean() guards per category; forced_win min 5-ply; stable puzzle selection via useRef
- [Claimeven implementation](project_claimeven_implementation.md) — always Yellow perspective; cooperativeAiMoves empty; highlight cell roles userIsYellow-aware
- [Highlight cell colors — player-aware roles](project_highlight_cell_colors.md) — odd steps = user's moves; role must use userIsYellow, not hardcoded red-odd/yellow-even
- [Puzzle advancement requires store.recordPuzzleAttempt](project_puzzle_advancement.md) — must call on correct answers or "Next puzzle" reloads the same puzzle
- [Candidates table — FK dependency](project_candidates_fk.md) — false_positive_records has FK to candidates; delete it first before bulk-deleting candidates
- [correct_col migration gap](project_correct_col_migration.md) — column added by 016_correct_col.sql; needed by claimeven/figure_7/j_shape; confirm applied
- [Supabase explicit grants — migration 012](project_supabase_grants.md) — new frontend tables need explicit GRANTs or PostgREST returns 42501
- [Integration test slowness — use test:fast](project_integration_test_slowness.md) — omits candidate-generator.test.js; `npm test` hangs 10+ min due to solver IPC deadlock
- [recordPuzzleAttempt canonical shape](project_record_puzzle_attempt_shape.md) — 6-field snake_case: puzzle_id, device_uuid, moves_tried, outcome, first_attempt_correct, time_ms
- [SequenceHandler is GONE — logic in ChallengeScreen](project_sequence_handler_ui.md) — SequenceHandler.jsx deleted; forced_win handled inline in ChallengeScreen.handleSequenceClick
- [PAID_CATEGORIES in two files](project_paid_categories_two_files.md) — server/categories.js AND src/lib/categories.js; update both atomically
- [/draw returns snake_case fields](project_draw_endpoint_snake_case.md) — move_string, interaction_mode etc.; components expecting camelCase need a callsite adapter
- [challengeSets.js is server-side only](project_challenge_sets_server_only.md) — no frontend mirror; SetPickerScreen reads from API response
- [ChallengeScreen evaluation shape — polymorphic](project_challenge_evaluation_shape.md) — standard: summaryLineKey; forbidden_columns: summaryLine (pre-rendered)
- [Sparring games table design](project_sparring_games_table.md) — side='first'/'second' enum; anonymous users DO write server rows; GRANT required
- [Light global theme — .dark-surface scoped block](project_light_global_theme.md) — post-spec-033: :root is light, .dark-surface for admin holdout pages; token pairing rule unchanged
- [Spec 033 — global light color scheme](project_spec033_light_color_scheme.md) — IMPLEMENTED 2026-06-14; 22 tasks; .dark-surface for admin holdout; 16 JSX fixes; key traps documented
- [AdminLessonsPage is dark](project_admin_lessons_dark.md) — overrides spec FR-015; user requested dark background during QA; same wrapper pattern as AdminCuratePage

- [Papergames integration](project_papergames_integration.md) — papergames_games table, import script, GET /api/games merge, PastGamesListScreen board thumbnail + chips
- [Spec 034 — board interaction feedback](project_spec034_board_interaction.md) — spec/plan/tasks done; lastDrop wiring in Board.jsx; staged continue render; isSubmitting trap; 11 tasks
- [Candidate generator — mistake probability experiment](project_candidate_generator_mistake_probability.md) — solverWeightedPosition refactored from softmax to MP-based sampling 2026-06-14
- [Epic 6 architecture decisions](project_epic6_architecture.md) — curation-time round robin reindex, shape_key + position columns, canonical key=value serializer, random-offset draw
- [highlight_metadata null per category](reference_highlight_metadata_null_categories.md) — which categories have null vs non-null highlight_metadata on puzzles table; forced_win trap; claimodd gap

## Project — bugs fixed

- [Magic link auth: Navigator strips hash before GoTrueClient processes it](project_magic_link_auth_race.md) — React useEffect race condition; fixed by preserving window.location.hash in replaceState
- [Service worker cache-first breaks app after deploy](bug_service_worker_stale_cache.md) — SW cached index.html permanently → stale JS references → MIME error; fixed with network-first for HTML
- [Deep reveal zone validation fixes](deep_reveal_zone_validation_fixes.md) — P5Strong played-col whitelist, LLM zone tag normalization, prompt format improvements; played-cell whitelist pending

- [Railway trust proxy — express-rate-limit 500](bug_railway_trust_proxy.md) — must set `app.set('trust proxy', 1)`; Railway injects X-Forwarded-For and rate-limit throws without it
- [Supabase trigger doesn't fire — public.users rows missing](bug_supabase_trigger_not_firing.md) — GoTrue bypasses on_auth_user_created; loadUser now auto-creates the row

## Project — open bugs

- [Server parity bug — AI-first games](project_parity_bug_ai_first.md) — human/ai heatmaps swapped when AI opens the game; not yet fixed
- [visualize_board.mjs broken import](bug_visualize_board_broken.md) — imports `buildThreatMap` (renamed to `getMajorThreatCells`); crashes on startup; fix: update import
- [Magic link email broken — emailRedirectTo not allowlisted](bug_auth_magic_link_redirect.md) — Supabase rejects unlisted redirect URLs; needs dashboard fix
