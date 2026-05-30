# Memory index

- [User profile](user_profile.md) — strong C++/React/algorithms background, empirical debugger-first style, prefers concise responses

## Feedback — behavioral rules

- [Spec redesigns: audit existing APIs first](feedback_spec_existing_apis.md) — read current component props before writing spec prop shapes; only change what is strictly necessary; preserve existing handler/encoding names with an explicit note
- [Run a critical subagent review after speckit-specify](feedback_spec_review_before_plan.md) — Sonnet subagent vs best_practices_spec_driven_development.md catches blocking contract/scope issues before they propagate to plan and tasks

- [Prefer empirical testing over theoretical analysis](feedback_empirical_first.md) — run code early, don't spend many rounds on mental analysis before testing
- [Answer questions before editing](feedback_answer_before_editing.md) — always answer the question in text first, then proceed with any file edits or tool calls
- [Never generate random boards](feedback_no_random_boards.md) — random movestrings are not valid game positions; always source candidates from DB, git history, or KB examples
- [Never run git stash to check baselines](feedback_no_git_stash.md) — git stash failed mid-write on 2026-05-18, corrupted index, staged hundreds of files as deleted; use code reasoning instead
- [Mark tasks completed promptly](feedback_update_tasks_promptly.md) — update task status immediately when work is done, not in batches at end of session
- [Use ripgrep for code search](feedback_use_ripgrep.md) — prefer `rg` over `find | xargs grep`; LSP tool available for semantic search (needs language server)
- [Pre-populate reviewed data — fetch all related fields upfront](feedback_prepopulate_pattern.md) — missed annotator_note join cost many rounds; always trace every UI field to its source table before writing the API select
- [Keep hard-derived algorithms in spec](feedback_hard_derived_algorithms_in_spec.md) — don't move costly-to-derive algorithms to plan.md; their presence in spec is a deliberate lock, not a "how vs. what" violation
- [Migration constraint order](feedback_migration_constraint_order.md) — drop constraints before updating data, not after; learned from broken migration 013
- [c4solver binary stale/crash fix](feedback_binary_rebuild.md) — exit 137 or wrong behavior: delete binary and `make` (Makefile copies to server/ automatically)
- [Server restart kills Vite](feedback_server_restart.md) — pkill on server/index.js kills Vite too (same terminal process group); tell user to restart manually
- [LLM perspective bug — name the player explicitly](feedback_llm_perspective_bug.md) — post-move board says "Next: Yellow" → LLM adopts opponent's perspective; fix with a `## Move context` section
- [Mobile tap highlight fix](feedback_mobile_tap_highlight.md) — tappable non-button elements need `WebkitTapHighlightColor: transparent` + `userSelect: none`; native `<button>` exempt
- [Pedagogy preferences](feedback_pedagogy_preferences.md) — no lost-position lessons; no abstract Allis rules (except Claimeven + Claimodd which are concrete and visual)
- [Opus for critique, Sonnet for applying decisions](feedback_agent_model_selection.md) — use Opus for independent gap analysis; Sonnet for mechanical document updates
- [Epic vs speckit scope](feedback_epic_vs_speckit_scope.md) — when auditing an epic doc that feeds speckit, only fix factual errors / cross-epic contracts / mockup-vs-Gap conflicts at the epic level; leave the rest to specify→plan→tasks
- [Don't mix slash commands in a single handoff prompt](feedback_handoff_no_mixed_commands.md) — a handoff prompt for `/speckit-specify` can't also tell the agent to run `/speckit-clarify`; pre-answer clarifications inline instead
- ["Heatmap" is ambiguous terminology](feedback_heatmap_terminology.md) — a PoC feature used "heatmap" for something different from the Sparring column-score overlay; use "column-score overlay" to be precise

## References — solver and board mechanics

- [Coordinate convention](reference_coordinate_convention.md) — all internal coords 0-indexed; only two translation boundaries: frontend display + c4solver-wrapper
- [c4solver score semantics](reference_c4solver_scores.md) — sign=current-player perspective; magnitude=speed of outcome; range [-18,+18]; book encodes as score+19 (0=not in book)
- [c4solver behavioral quirks](reference_c4solver_behavior.md) — rejects input strings through winning moves; flat scores at forced-win terminals; JS immediateWinScore off-by-1 on odd moveCount
- [Cat 4 forced_win forced-block detection](reference_cat5_forced_block_detection.md) — solver scores can't identify forced block in forced-win terminal; use direct board checkWin instead; concrete example at `77435634165667374673756344`
- [immediateWinScore bug — DELETED](reference_immediateWinScore_bug.md) — formula ambiguous for odd moveCount; deleted from predicates.js + candidate-generator.js; use checkWin at gravity-top instead

## References — tactical patterns and examples

- [Tactical pattern definitions](reference_tactical_pattern_definitions.md) — formal predicates for j_shape, figure_7, undercut, overcut with canonical coordinates
- [Claimeven detection algorithm](reference_claimeven_detection.md) — simulation-based (Red solver, Black same-column); exact, no false positives; ~20 solver queries per candidate
- [Z-threat detection + visualization](reference_z_threat_detection.md) — parity count odd=Z-threat; vertical capsule highlight; count badge above board
- [T4 Case A example movestring](reference_t4_example_movestring.md) — `1115222555577773663636617` solver-verified 2026-05-17; two Red odd-row threats at col4 r3+r5, demonstrates T4 no-bonus rule; canonical regression for T4 detectors
- [Allen V-rule example movestrings](reference_allen_v_rule_examples.md) — ALL V1–V5 verified 2026-05-18; V1=`44452556366`, V4=`2134124321317273`; results in `allen_v_rule_examples.yaml`
- [Allis rule example movestrings](reference_allis_rule_examples.md) — all 9/9 rules verified 2026-05-18; baseclaim=`263223362`, specialbefore=`2365555`; KB files updated
- [External reference PDFs](reference_external_pdfs.md) — Allis (91p), Bagan (30p, Poset games), Allen (276p); pdfminer.six for extraction; key page ranges and canonical facts recorded

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
- [AI difficulty — softmax sampling](project_depth_limited_search.md) — T={easy:5.0, medium:3.5, hard:2.5, perfect:0}; depth approach abandoned (all-zeros in early game); `src/lib/aiDifficulty.js`
- [Interaction mode architecture](project_interaction_mode_architecture.md) — single_move (current) vs sequence (multi-move); new DB column; prerequisite for forced_win refactor

## Project — product decisions

- [Epics doc v4 revision](project_epics_revision.md) — docs/mvp/epics.md structure decisions (2a/2b split, 3c reuses coach queue, Gap-3 free/Pro, odd_even_threat) + product-vs-code mismatches (quota on wrong endpoint, blunders/coach queue already exist, no Gap-1 scorer)
- [New MVP epic breakdown](project_new_mvp_epics.md) — 10 epics (1a, 1b, 7, 2, 3a, 3b, 3c, 4, 5, 6) in `docs/mvp/epics.md`; complete visual redesign; mockup at `docs/mvp/mockup/project/`
- [New MVP key product decisions](project_new_mvp_key_decisions.md) — gaps 18–30 in product_decisions.md; anonymous Deep Reveals, blunder capture, games table, Forbidden Columns multi-select, prompt caching, i18n kept, payments deferred
- [MVP planning — DecodeC4](project_mvp_planning.md) — canonical MVP doc is `mvp_product_spec.md` (2026-04-28); wireframe BUILT (`mvp_wireframe.html`); papergames API blocked (no game history endpoint)
- [MVP v2 scope decisions](project_mvp_v2_scope.md) — what was cut (import, 200+ puzzles, SR scheduler, pattern trends) and the metric gates for Phase 2
- [End-game spec updates](project_end_game_spec.md) — what was added to `end_game_product_specifications.md` on 2026-04-28 (Explanation Engine, Blunder Log, micro-lessons, commit-first, post-game review)
- [Lesson curriculum scope — MVP](project_lesson_curriculum.md) — 11 MVP + 2 post-MVP lessons; lost-position lessons cut; Allis rules cut except Claimeven + Claimodd; parity chain L4→L5→L6→L7
- [Claimeven player perspective](project_claimeven_player_perspective.md) — claimeven is Yellow's strategy; always show as Yellow (userPlayer=2) in curation AND learner view, regardless of move parity
- [Highlight cell colors — player-aware roles](project_highlight_cell_colors.md) — odd steps = user's moves; role must use userIsYellow, not hardcoded red-odd/yellow-even
- [Commit-first: click = immediate commit](project_commit_first_no_confirm.md) — no confirmation step; clicking a column plays the move directly; pendingMove state dead; confirm/cancel buttons removed 2026-05-27
- [forced_win refactor](project_forced_win_refactor.md) — replace stored-sequence with CompletionStrategy interface; solver best response; sequence interaction_mode
- [Auth mostly built; payments deferred](project_auth_payments_state.md) — ProfileStore/IndexedDBStore/SupabaseStore/AuthModal all exist; Epic 7 is reskin + store extension; Stripe routes exist but not wired

## Project — implementation status

- [Dev environment setup](project_dev_env_setup.md) — fully working as of 2026-05-01; server on 3001, 31 tests passing, all migrations applied
- [MVP implementation status](project_mvp_implementation.md) — all code tasks done as of 2026-04-30; what's built, what requires human action, key bugs fixed
- [Puzzle advancement requires store.recordPuzzleAttempt](project_puzzle_advancement.md) — must call on correct answers or "Next puzzle" reloads the same puzzle forever
- [Puzzle accuracy — first-attempt-only rule](project_accuracy_bug_fix.md) — stats recorded only on first attempt; fixed in PuzzlesPage.jsx 2026-05-01
- [Puzzle Factory implementation](project_puzzle_factory.md) — ALL tasks T001–T024 done (including T023 golden path 2026-05-05); one fix: seed column bigint not integer
- [Puzzle gen improvements — spec 004 complete](project_puzzle_gen_improvements.md) — T001–T012 done; softmax generation, per-player temperatures, player-perspective color normalization in CurationWorkspace.jsx
- [Puzzle quality + nav fixes — 2026-05-26](project_puzzle_quality_nav_fixes.md) — isClean() explicit guards per category; forced_win min 5-ply trace; stable puzzle selection via useRef; solved-puzzle exclusion in loadPuzzle()
- [Candidates table — FK dependency](project_candidates_fk.md) — false_positive_records has FK to candidates; delete it first before bulk-deleting candidates
- [Category cleanup 2026-05-13](project_category_cleanup.md) — fork_setup/parity_control removed; zugzwang→forced_win; future proper zugzwang will be a distinct category
- [correct_col migration gap](project_correct_col_migration.md) — column was absent until 016_correct_col.sql; needed by claimeven/figure_7/j_shape; confirm applied before querying it
- [Supabase explicit grants — migration 012](project_supabase_grants.md) — applied 2026-05-13; new frontend tables need explicit GRANTs or PostgREST returns 42501 (enforced Oct 30 2026)
- [New puzzle categories — spec Ready for Plan](project_new_puzzle_categories.md) — spec at `specs/008-new-puzzle-categories/spec.md`; API contract at `contracts/api.md`; highlight_metadata jsonb column needed on puzzles table
- [Curation re-review and delete feature](project_curation_review_feature.md) — Dashboard approved/rejected buttons, Delete in workspace, relaxed server guards, pre-populated modal/panel
- [Claimeven cooperativeAiMoves empty](project_claimeven_cooperative_ai_moves.md) — all claimeven puzzles have empty cooperative_ai_moves; derive mirror sequence algorithmically
- [Integration test slowness](project_integration_test_slowness.md) — candidate-generator.test.js hangs for 10+ min; likely solver IPC deadlock or terminal-position edge case; classifier tests are fast (22/22, ~56ms)
- [Board class refactor — spec 009 complete](project_board_refactor_009.md) — done 2026-05-26; isT2Blocking(colThreats, Rp) drops R (spec listed it but it was dead); getMajorThreatCells is O(672) not O(42)
- [Score proxy refactor — 2026-05-22](project_score_proxy_refactor.md) — removed score>0 gates from evalImmediateThreat + classify(); fixed evalForcedWin guard (>0→>=0, real bug); removed dead scores param from evalForcedBlock/getForcedBlock/detectClaimeven

## Project — classifier

- [Classifier post-audit fixes (008)](project_classifier_audit.md) — 11 spec discrepancies fixed (J1–J4, U1–U3, O1, F1–F3); spec/plan/tasks updated 2026-05-19; classifier.js NOT yet changed; Phase 6 tasks T037–T048 pending
- [Classifier audit v2 (2026-05-20)](project_classifier_audit_v2.md) — j_shape 8/8 FP (broken: 3-of-4 matching, even anchor, wrong player); overcut 2/8 FP (T5 parity + [*] cell); claimeven 1/8 FP (wrong player); figure_7/z_threat/undercut healthy; full report at `reports/candidate-review-v2-2026-05-20.md`
- [Classifier fixes 008 (2026-05-21)](project_classifier_fixes_008.md) — Cat1 outer gate removed; Cat2/Cat5 board-scan replacements; Cat3 rewritten (Case A/B, no countAllReachableThreats); Cat3 checked BEFORE Cat2; Case B generalized (no gravity-top requirement)

## Project — knowledge base

- [Strategy KB migration status](project_kb_migration.md) — ALL STEPS DONE (2026-05-17): 30 entries total; 8 project-local entries created; backlinks + README policy sentence added; PENDING: sextuple-threat + parity-trap worked examples
- [KB fact-check audit](project_kb_audit.md) — 9 errors fixed 2026-05-18 (locations, INCOMPLETE predicates, ghost-threat expected_behavior); worked_examples still PENDING; full original report in `fact_checking_result.md`
- [KB gap analysis](project_kb_gap_analysis.md) — DONE 2026-05-19: final `knowledge-base-gaps.md` has 58 gaps (17 high / 25 medium / 16 low) across all 9 sources
- [Overcut KB entry](project_overcut_kb.md) — `docs/knowledge-base/community-overcut.md` written 2026-05-19; 4 worked examples, 2 false positives; three verified sub-cases: same-parity (T4), active-forcing (odd column), chain-T2

## Project — LLM features

- [LLM explain PoC — design complete, not yet implemented](project_llm_explain_poc.md) — `explain_move.sh`; numPlies=2*rounds+1; contrast=second-best if optimal else best; delta table; OpenAI from connect-four/server/.env; agent prompt written 2026-05-26
- [explain-move-llm endpoint](project_explain_move_llm.md) — POST /api/explain-move-llm; forced_win leaf boards now rendered in prompt; review_feedback.sh for replaying flagged cases; llm_feedback.movestring is pre-move, col parsed from prompt
- [explainSimulate — IMPLEMENTED](project_explain_simulate.md) — forward-looking pattern aggregation; `explainSimulate.js` + CLI `explain_simulate.sh`; numPlies must be odd for user's perspective; claimeven always excluded; 12 integration tests passing (supersedes project_simulate_feature.md)
- [LLM recommend next move — endpoint + UI](project_recommend_next_move.md) — Recommend+Why shipped 2026-05-28; `RecommendCoach.jsx`+`BadgeRow.jsx` replace deleted `RecommendButton.jsx`; `colRankings` added to response; always in sparring footer

## Project — bugs

- [Heatmap bug — FIXED](project_heatmap_bug.md) — was showing forcing-threat cells instead of actual winning line; fixed in Solver.cpp `possibleNonLosingMoves()==0` branch; test in test_explain.cpp
- [Explain endpoint — best-moves filtering](project_explain_best_moves.md) — explainSearch uses book.get() O(1) directly (no scorer instance); explain now loads the book (`['-x']` not `-nb`); deep positions fall back to all non-losing moves; "4" went from 24min → 490ms
- [Server parity bug — AI-first games](project_parity_bug_ai_first.md) — human/ai heatmaps are swapped when AI opens the game; not yet fixed
- [visualize_board.mjs broken import — BUG](bug_visualize_board_broken.md) — imports `buildThreatMap` (renamed to `getMajorThreatCells` in 009 refactor); crashes on startup; prerequisite fix for LLM PoC
