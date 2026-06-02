# Memory index

- [User profile](user_profile.md) — strong C++/React/algorithms background, empirical debugger-first style, prefers concise responses

## Feedback — behavioral rules

- [Spec redesigns: audit existing APIs first](feedback_spec_existing_apis.md) — read current component props before writing spec prop shapes; only change what is strictly necessary; preserve existing handler/encoding names with an explicit note
- [AskUserQuestion requires min 2 options](feedback_ask_user_question_min_options.md) — single-option questions throw InputValidationError; always provide at least 2 distinct options per question
- [Run a critical subagent review after speckit-specify](feedback_spec_review_before_plan.md) — Sonnet subagent vs best_practices_spec_driven_development.md catches blocking contract/scope issues before they propagate to plan and tasks
- [Prefer empirical testing over theoretical analysis](feedback_empirical_first.md) — run code early, don't spend many rounds on mental analysis before testing
- [Answer questions before editing](feedback_answer_before_editing.md) — always answer the question in text first, then proceed with any file edits or tool calls
- [Never generate random boards](feedback_no_random_boards.md) — random movestrings are not valid game positions; always source candidates from DB, git history, or KB examples
- [Never run git stash to check baselines](feedback_no_git_stash.md) — git stash failed mid-write on 2026-05-18, corrupted index; use code reasoning instead
- [Mark tasks completed promptly](feedback_update_tasks_promptly.md) — update task status immediately when work is done, not in batches at end of session
- [Preferred search tools](feedback_use_ripgrep.md) — `rg` for text, `fd` for files, `sg` (ast-grep) for structural patterns, LSP for semantic; never use `grep -r` or `find -name`
- [Pre-populate reviewed data — fetch all related fields upfront](feedback_prepopulate_pattern.md) — always trace every UI field to its source table before writing the API select
- [Keep hard-derived algorithms in spec](feedback_hard_derived_algorithms_in_spec.md) — don't move costly-to-derive algorithms to plan.md; their presence in spec is a deliberate lock
- [Migration constraint order](feedback_migration_constraint_order.md) — drop constraints before updating data, not after; learned from broken migration 013
- [c4solver binary stale/crash fix](feedback_binary_rebuild.md) — exit 137 or wrong behavior: delete binary and `make` (Makefile copies to server/ automatically)
- [Server restart kills Vite](feedback_server_restart.md) — pkill on server/index.js kills Vite too (same terminal process group); tell user to restart manually
- [LLM perspective bug — name the player explicitly](feedback_llm_perspective_bug.md) — post-move board says "Next: Yellow" → LLM adopts opponent's perspective; fix with a `## Move context` section
- [Mobile tap highlight fix](feedback_mobile_tap_highlight.md) — tappable non-button elements need `WebkitTapHighlightColor: transparent` + `userSelect: none`; native `<button>` exempt
- [Pedagogy preferences](feedback_pedagogy_preferences.md) — no lost-position lessons; no abstract Allis rules (except Claimeven + Claimodd which are concrete and visual)
- [Opus for critique, Sonnet for applying decisions](feedback_agent_model_selection.md) — use Opus for independent gap analysis; Sonnet for mechanical document updates
- [Check CSS exists before using mockup class/token names](feedback_check_css_before_using_mockup_classes.md) — grep in src/styles/tokens.css + src/index.css before using any class or `--token` from mockup; `--bg-chal` not `--bg-challenges`
- [Epic vs speckit scope](feedback_epic_vs_speckit_scope.md) — when auditing an epic doc that feeds speckit, only fix factual errors / cross-epic contracts / mockup-vs-Gap conflicts at the epic level
- [Don't mix slash commands in a single handoff prompt](feedback_handoff_no_mixed_commands.md) — a handoff prompt for `/speckit-specify` can't also tell the agent to run `/speckit-clarify`; pre-answer clarifications inline instead
- ["Heatmap" is ambiguous terminology](feedback_heatmap_terminology.md) — use "column-score overlay" instead; "heatmap" was used for something different in a PoC feature
- [Auth header required on upgraded fetches](feedback_auth_header_on_fetch.md) — when adding req.user checks server-side, also add Authorization header at the fetch call site; loadUser only reads the header
- [Navigator spreads params as direct props](feedback_navigator_params_spread.md) — don't destructure a `params` object in screens; navigation params are spread as individual props

## References — solver and board mechanics

- [Coordinate convention](reference_coordinate_convention.md) — all internal coords 0-indexed; only two translation boundaries: frontend display + c4solver-wrapper
- [c4solver score semantics](reference_c4solver_scores.md) — sign=current-player perspective; magnitude=speed of outcome; range [-18,+18]; book encodes as score+19 (0=not in book)
- [c4solver behavioral quirks](reference_c4solver_behavior.md) — hangs on strings through winning moves; flat scores at forced-win terminals; JS score formula off-by-1 on odd moveCount; never use score threshold to detect immediate wins
- [Cat 4 forced_win forced-block detection](reference_cat5_forced_block_detection.md) — solver scores can't identify forced block in forced-win terminal; use direct board checkWin instead
- [POST /api/scores contract](reference_api_scores_endpoint.md) — POST (not GET); body {moves}; response {scores: number[7]}; INVALID_MOVE=-1000 sentinel; filter strictly before ranking

## References — tactical patterns and examples

- [Tactical pattern definitions](reference_tactical_pattern_definitions.md) — formal predicates for j_shape, figure_7, undercut, overcut with canonical coordinates
- [Claimeven detection algorithm](reference_claimeven_detection.md) — simulation-based (Red solver, Black same-column); exact, no false positives; ~20 solver queries per candidate
- [Z-threat detection + visualization](reference_z_threat_detection.md) — parity count odd=Z-threat; vertical capsule highlight; count badge above board
- [T4 Case A example movestring](reference_t4_example_movestring.md) — `1115222555577773663636617` solver-verified; two Red odd-row threats at col4 r3+r5, demonstrates T4 no-bonus rule
- [Allen V-rule example movestrings](reference_allen_v_rule_examples.md) — ALL V1–V5 verified; V1=`44452556366`, V4=`2134124321317273`; results in `allen_v_rule_examples.yaml`
- [Allis rule example movestrings](reference_allis_rule_examples.md) — all 9/9 rules verified; baseclaim=`263223362`, specialbefore=`2365555`; KB files updated
- [External reference PDFs](reference_external_pdfs.md) — Allis (91p), Bagan (30p), Allen (276p); pdfminer.six for extraction; key page ranges recorded

## References — tooling

- [Custom slash commands](reference_custom_commands.md) — project commands at `/Users/elsonidoq/prog/cuatro_en_linea/.claude/commands/`; `/mvp-manager` and `/coordinate-implementation`
- [Multi-agent orchestration patterns](reference_multiagent_orchestration_patterns.md) — handoff context pattern, AskUserQuestion gate, Opus-for-critique/Sonnet-for-create, state persistence

## References — infrastructure

- [Supabase connection details](reference_supabase_connection.md) — new key format (sb_publishable/sb_secret); direct DB host fails, use pooler at aws-1-us-west-2.pooler.supabase.com
- [Open Chrome with remote debugging](reference_open_chrome.md) — must use binary directly; `open -a` fails to bind port 9222 on macOS/Chrome 147
- [Gemini model name](reference_gemini_model.md) — correct model is `gemini-3.1-pro-preview`; use in all MCP Gemini tool calls

## Project — architecture

- [Classifier architecture and score convention](project_classifier_architecture.md) — c4solver score encoding, all 6 category detection rules, test fixture locations
- [Server architecture and endpoint map](project_server_architecture.md) — Express structure, auth middleware, rate limits, full endpoint table, tier access rules
- [Frontend architecture and component map](project_frontend_architecture.md) — routing, store layer, component hierarchy, i18n, PWA, build notes
- [SpecKit workflow and feature directory](project_speckit_workflow.md) — where specs live, CLAUDE.md pointer, task ordering rationale
- [AI difficulty — softmax sampling](project_depth_limited_search.md) — T={easy:5.0, medium:3.5, hard:2.5, perfect:0}; depth approach abandoned; `src/lib/aiDifficulty.js`
- [Interaction mode architecture](project_interaction_mode_architecture.md) — single_move (current) vs sequence (multi-move); interaction_mode DB column

## Project — product decisions and plan

- [MVP epic plan (v4)](project_mvp_epic_plan.md) — 10 epics in ship order; key product decisions gaps 1–30; product-vs-code mismatches (quota, blunders, PAID_CATEGORIES, Gap-1 scorer)
- [New puzzle categories — spec locked](project_new_puzzle_categories.md) — z_threat, claimeven, undercut, overcut, figure_7, j_shape design decisions; highlight_metadata schema
- [Lesson curriculum scope — MVP](project_lesson_curriculum.md) — 11 MVP + 2 post-MVP lessons; parity chain L4→L5→L6→L7; what was cut and why
- [Auth mostly built; payments deferred](project_auth_payments_state.md) — ProfileStore/IndexedDBStore/SupabaseStore/AuthModal exist; Epic 7 is reskin + store extension; Stripe deferred
- [Stats from puzzle_attempts, not session_stats](project_stats_architecture.md) — GET /api/stats aggregates puzzle_attempts JOIN puzzles; session_stats table orphaned for challenge data; SupabaseStore.getStats() calls the endpoint
- [Epic 2a implementation state](project_epic2a_implementation.md) — live endpoints, new screens, stubs for Epic 2b, known CSS token bug (`--bg-chal` vs `--bg-challenges` in surfaceGroups.js)
- [Epic 3a implementation state](project_epic3a_implementation.md) — 18 tasks done, DifficultyPickerScreen + GameScreen, POST /api/games endpoint, 2 QA bug fixes, handoff context for Epic 3b
- [Epic 3b implementation state](project_epic3b_implementation.md) — ReviewScreen + ExplorerScreen done; useGameBoard hook extracted; 3 new endpoints; react-markdown in Explorer; open: explorerTitle i18n key, td overlays
- [forced_win refactor — done](project_forced_win_refactor.md) — CompletionStrategy interface; bitboard-only AI response; interaction_mode='sequence' on puzzles
- [Commit-first: click = immediate commit](project_commit_first_no_confirm.md) — no confirmation step; pendingMove state dead; confirm/cancel buttons removed 2026-05-27
- [Category naming — zugzwang vs forced_win](project_category_cleanup.md) — fork_setup/parity_control removed; future zugzwang will be a distinct category; don't reuse the slug

## Project — implementation details

- [Classifier current state + T037–T048 pending](project_classifier_current_state.md) — Cat1–Cat5 score-proxy fixes done; J/U/O/F pattern detector bugs NOT yet fixed; FP rates from v2 review
- [Knowledge base status](project_kb_status.md) — 30 entries done; 9 fact-check errors fixed; 58 gaps in knowledge-base-gaps.md; worked_examples PENDING
- [LLM explain system](project_explain_system.md) — POST /api/explain-move-llm; data flow, prompt structure, getPositionTier, forced_win leaf boards; review_feedback.sh
- [explanation_cache stores prompt; buildExplainContext helper](project_explain_cache_schema.md) — deep_reveal_json={explanation,bestLine,prompt}; flag endpoint rebuilds prompt from cache or simulation if empty; migration 023 makes llm_prompt nullable
- [explainSimulate — implementation](project_explain_simulate.md) — DETECTOR_REGISTRY; leaf taxonomy; pattern ratio denominator; transposition dedup; numPlies must be odd for user's perspective
- [LLM recommend next move](project_recommend_next_move.md) — POST /api/recommend-move; RecommendCoach.jsx + BadgeRow.jsx; colRankings; sparring footer
- [explain endpoint — best-moves filtering](project_explain_best_moves.md) — explainSearch uses book.get() O(1); explain loads book (`['-x']` not `-nb`); timing results
- [Dark global theme — light component overrides](project_dark_global_theme.md) — index.css sets dark color-scheme globally; light-bg cards need color-scheme:light + scoped h/input overrides
- [CSS token pairing — dark vs light surfaces](reference_token_pairing.md) — two token systems; never cross dark-surface tokens with light-text tokens; mockup-first rule
- [Board class refactor — spec 009](project_board_refactor_009.md) — done; isT2Blocking(colThreats, Rp) drops R (spec listed it but dead); getMajorThreatCells is O(672)
- [Puzzle quality + nav fixes](project_puzzle_quality_nav_fixes.md) — isClean() guards per category; forced_win min 5-ply; stable puzzle selection via useRef; solved-puzzle exclusion
- [Overcut KB entry](project_overcut_kb.md) — community-overcut.md; 4 worked examples; 3 sub-cases: same-parity (T4), active-forcing, chain-T2
- [Claimeven player perspective](project_claimeven_player_perspective.md) — claimeven is Yellow's strategy; always show as Yellow (userPlayer=2) in curation AND learner view
- [Highlight cell colors — player-aware roles](project_highlight_cell_colors.md) — odd steps = user's moves; role must use userIsYellow, not hardcoded red-odd/yellow-even
- [Claimeven cooperativeAiMoves empty](project_claimeven_cooperative_ai_moves.md) — all claimeven puzzles have empty cooperative_ai_moves; derive mirror sequence algorithmically
- [Puzzle advancement requires store.recordPuzzleAttempt](project_puzzle_advancement.md) — must call on correct answers or "Next puzzle" reloads the same puzzle
- [Candidates table — FK dependency](project_candidates_fk.md) — false_positive_records has FK to candidates; delete it first before bulk-deleting candidates
- [correct_col migration gap](project_correct_col_migration.md) — column added by 016_correct_col.sql; needed by claimeven/figure_7/j_shape; confirm applied before querying
- [Supabase explicit grants — migration 012](project_supabase_grants.md) — new frontend tables need explicit GRANTs or PostgREST returns 42501 (enforced Oct 30 2026)
- [Integration test slowness — use test:fast](project_integration_test_slowness.md) — use `npm run test:fast` (omits candidate-generator.test.js); `npm test` hangs 10+ min due to solver IPC deadlock

## References — board rendering

- [Board disc color inversion](reference_board_color_inversion.md) — `'red'` value renders as GREEN disc, `'yellow'` as GRAY; even move_string length → green; odd → gray

- [recordPuzzleAttempt canonical shape](project_record_puzzle_attempt_shape.md) — 6-field snake_case: puzzle_id, device_uuid, moves_tried, outcome, first_attempt_correct, time_ms; wrong shape silently corrupts stats
- [SequenceHandler owns its entire UI](project_sequence_handler_ui.md) — self-contained Board/prompt/banners/Next; hardcoded English banners; onNext has no args (success-only); use takeover mode or refactor
- [PAID_CATEGORIES in two files](project_paid_categories_two_files.md) — server/categories.js (gates /draw 403) AND src/lib/categories.js (gates SetPicker lock icon); update both atomically
- [/draw returns snake_case fields](project_draw_endpoint_snake_case.md) — move_string, interaction_mode etc.; components expecting camelCase need a callsite adapter
- [challengeSets.js is server-side only](project_challenge_sets_server_only.md) — connect-four/server/challengeSets.js only; no frontend mirror; SetPickerScreen reads from API response; entries use displayNameKey/descriptionKey (i18n)
- [ChallengeScreen evaluation shape — polymorphic](project_challenge_evaluation_shape.md) — standard categories: summaryLineKey; forbidden_columns: summaryLine (pre-rendered); always render `evaluation.summaryLine ?? t(evaluation.summaryLineKey)`

- [Sparring games table design](project_sparring_games_table.md) — side='first'/'second' enum; anonymous users DO write server rows; Epic 3b dependency on game_id; GRANT required
- [checkWin extraction needed](project_checkwin_extraction.md) — private fn in HomePage.jsx line 39; signature (board,row,col,color); must extract to src/lib/board.js before GameScreen

## Project — open bugs

- [Server parity bug — AI-first games](project_parity_bug_ai_first.md) — human/ai heatmaps swapped when AI opens the game; not yet fixed
- [visualize_board.mjs broken import](bug_visualize_board_broken.md) — imports `buildThreatMap` (renamed to `getMajorThreatCells` in 009 refactor); crashes on startup
- [Magic link email broken — emailRedirectTo not allowlisted](bug_auth_magic_link_redirect.md) — Supabase silently rejects unlisted redirect URLs; catch block swallows error; needs Supabase dashboard fix
