# Memory index — trigger-first gotchas

> Conventions/contracts/schemas live in `docs/architecture/`; reason-engine *decisions* in `reason-DECISIONS.md`. This index is traps only — read the docs.

## Solver, board evaluation, tactical patterns & movestrings

- [c4solver score semantics](reference_c4solver_scores.md) — sign/magnitude, book encoding; trap: max<0=ALL lose vs min<0=SOME lose
- [c4solver behavioral quirks](reference_c4solver_behavior.md) — error vs hang; JS formula off-by-1; exit 137 → delete binary + make
- [Forced-block detection](reference_cat5_forced_block_detection.md) — use checkWin, not flat scores
- [Classify vs classifyPattern](reference_classify_vs_classifyPattern.md) — sync/8-tag vs async/15-detector; +3 parity threats; Map priority
- [Coach creation transition gate](project_coach_creation_transition_gate.md) — classify() double_threat/forced_win fire only on absent→present transition; loose vs strict double-threat predicates coexist (don't dedupe)
- [Integration test hang](project_integration_test_slowness.md) — IPC deadlock; use test:fast; deadlocks w/ concurrent solver harvest
- [generate_all_candidates "fetch failed" flake](project_generate_candidates_fetch_failed_flake.md) — many categories 0 = env flake (just-resumed Docker/concurrent solver load), NOT broken pipeline; re-run standalone
- [Tactical pattern definitions](reference_tactical_pattern_definitions.md) — predicates figure_7/j_shape/undercut/overcut (j_shape/undercut: NO KB)
- [Claimeven detection](reference_claimeven_detection.md) — simulation-based; ~20 solver queries
- [Z-threat detection](reference_z_threat_detection.md) — odd empty cell count; UI viz spec
- [Verified tactical movestrings](reference_verified_tactical_movestrings.md) — KB is source-of-truth: table V1/V5 wrong, V2/V4 1-indexed; T1–T7; open-three≠DT
- [missed_own capitalize principle](project_missed_own_capitalize_principle.md) — double_threat/figure_7/immediate_threat survive wrong moves; missed_own builds pattern; only undercut kills a fork
- [Never generate random boards](feedback_no_random_boards.md) — source from DB, git, or KB
- [Coordinate convention](reference_coordinate_convention.md) — 0-indexed; two translation boundaries only
- [Visualize board script](project_puzzle_quality_nav_fixes.md) — isClean guards; forced_win min 5-ply

## Puzzle categories, challenge & past-games flow

- [Opening theory scoping](project_opening_theory_scoping.md) — NO opening challenge category (won boards have losing side to move); openings → Lessons
- [Lesson interactivity evaluation](project_lesson_interactivity_evaluation.md) — Socratic is client-side col===correctCol; inline confirmationChallenges 404
- [Lesson progression + audio traps](project_lesson_progression_audio_traps.md) — order=filename prefix (JSON ignored; reorder=git mv); audio=ttsProvider.synthesize
- [New-category wiring + locked designs](project_new_category_wiring_checklist.md) — 8-file checklist (missing candidate-generator.js = silent failures)
- [Removed categories](project_category_cleanup.md) — zugzwang≠forced_win; claimodd removed; don't reuse slugs; how to re-add
- [Classifier architecture](project_classifier_architecture.md) — detection pipeline; highlight_metadata schemas + null-vs-non-null per category
- [Puzzle correctness seams](project_puzzle_correctness_seams.md) — dual seam checkPredicate+evaluatePredicate; 'tied'-discard + length===1 multi-solution bug
- [odd_even_threat](project_detect_odd_even_threat_yellow.md) — Yellow support; renamed fields; puzzle-only (off coach + blunder vocab)
- [forced_win refactor](project_forced_win_refactor.md) — CompletionStrategy; bitboard-only AI response; sequence vs single_move mode
- [Spec 037 open QA bugs](project_spec037_review_blunder_sharing.md) — 4 open bugs; is_owner!=false gate

## Server endpoints, API, DB schema, auth & deploy

- [Boot-path .env read crash](project_boot_path_env_read_crash.md) — compute.mjs reads .env at import → ENOENT crash-loop on boot; use boardUtils.loadEnv
- [Secret-scan = placeholders](project_secret_scan_placeholders.md) — git-history secret-shaped strings all placeholders; NO rotation; docs/security_audit_fable.md
- [LLM model env vars](reference_llm_model_env_vars.md) — OPENAI_MODEL=mini (prod); EXPLAIN_MODEL=full (compute.mjs); names mislead; Gemini=gemini-3.1-pro-preview
- [OPENAI_API_KEY is present](feedback_openai_key_present.md) — real key in server/.env; DON'T defer real-TTS/LLM as "no key"; verify on localhost
- [Sparring move algorithm](project_sparring_move_algorithm.md) — server chooseSparringMove via /api/scores?difficulty; aiDifficulty.js DELETED; own-win before roll
- [Admin localhost directive](project_admin_localhost_directive.md) — owner: ALL /admin localhost-only; requireAdmin NO-OP outside NODE_ENV=production
- [index.js hardening traps](project_index_hardening_traps.md) — req.ip XFF-spoofable under trust proxy (use req.socket.remoteAddress); {error}-destructure leak
- [CSP/helmet traps](project_csp_helmet_traps.md) — CSP invisible under Vite dev (test Express-served dist); needs papergames.io wss+img; SW reg in main.jsx
- [Auth flow traps](project_auth_flow_traps.md) — two supabase clients; magic-link hash race; OAuth lands on root + NO route guard → CTA gate ≠ screen gate
- [IndexedDB sign-in hang](project_indexeddb_signin_hang.md) — deleteDatabase blocked by open conn (other tabs) → open() hangs → sign-in stalls; clear stores in place
- [Anon games re-associate on migrate](project_games_dont_migrate.md) — migrate re-keys games by CLIENT body.device_uuid; past-games 401s anon, analyze allows it
- [User column propagation trap](project_user_column_propagation.md) — new users column reaches nothing (no select('*')); edit USER_PROFILE_SELECT_COLUMNS+defaultUserProfile+allowlist
- [Supabase connection & storage](reference_supabase_connection.md) — 3 envs (local/staging jkqi.../prod kxtq...); staging=6543 txn-pooler (no DDL); reset-staging-db.js; storage signedUrl
- [Suboptimal/blunder unification](project_suboptimal_blunder_unification.md) — quality column; ExplorerScreen deleted
- [Mistake storage rule quality seam](project_mistake_storage_rule.md) — classifyStoredMistake gates all writes; badge quality ≠ stored quality; suboptimal may have no row
- [Blunder serving dual paths](project_blunder_serving_dual_paths.md) — TWO independent response builders (:id + map); explanation_cache bypasses producer guards
- [Anon free deep reveal gates](project_anon_deep_reveal_gates.md) — anon blunders device_uuid-keyed (migration 058); 4 server gates + 2 client entry points share one key; QA=clear-IndexedDB
- [Blunder write integrity](project_blunder_write_integrity.md) — /api/games/analyze is a WRITE vector (no device_uuid compare); game_id dedup 3-layer; index-reuse silent no-op
- [Stats architecture](project_stats_architecture.md) — stats from puzzle_attempts; session_stats orphaned; session-stats/all byPattern empty; /api/stats byPattern FINE
- [Spec 030 session-stats write asymmetry](project_spec030_server_mediated_data_access.md) — asymmetric write shapes; must not unify
- [Auth/payments state](project_auth_payments_state.md) — httpOnly cookies only (credentials:'include', NOT Authorization header); PaymentProcessor + Stripe webhook mirror
- [Checkout verify-session fallback](project_checkout_verify_session_fallback.md) — account stays free after paying = no webhook (local needs `stripe listen`); /verify-session now backstops dropped webhooks; charge exists but 0 stripe_events = smoking gun
- [Stripe webhook live testing](project_stripe_webhook_live_testing.md) — mocked tests miss column/grant bugs; `stripe trigger` live (event_type→type, tracks/stripe_events grants)
- [Local Supabase setup](project_local_supabase_setup.md) — JWT format for service_role key; sb_secret_* fails locally; missing grants → 403/42501 (+046/048/055)
- [Spec 039 deploy requirement](project_spec039_audio_interactive_coach.md) — TRUNCATE explanation_cache before deploy; +musicEnabled placeholder, slug-derivation, pre-existing test fails
- [Railway deploy + migration traps](project_spec031_staging_production_deploy.md) — migrate.js baseline mode; c4solver compile; trust proxy or 500s; clock skew -B in railpack.json
- [Offset pagination tiebreaker](project_offset_pagination_tiebreaker.md) — non-unique ORDER BY + range() skips/dupes rows across pages; always append id ASC

## Frontend & board display

- [en.json duplicate mistakes key](reference_en_json_duplicate_mistakes.md) — line ~707 is effective; ~492 is dead
- [i18n switcher + es.json](reference_i18n_english_only.md) — es.json now FULL key-parity (spec 049) in Argentinian voseo; guarded by i18nKeyParity.test.js
- [Spanish = Argentinian voseo](project_spanish_is_argentinian_voseo.md) — es.json MUST be Rioplatense voseo (encontrá/tenés/sos/vos), NOT tú-Spanish; keys unchanged
- [Spanish output silent fallback](project_spanish_output_silent_fallback.md) — es = English-prompt→Spanish-output; NEW string/term/LLM-field ships English SILENTLY; graders English-only
- [TTS audio cached by text](project_tts_audio_cached_by_text.md) — changing TTS model/voice/prompt does NOT regenerate existing clips (coach/lesson/deep-reveal keyed by text hash); regenerate manually
- [DEV board injector](project_dev_board_injector.md) — load any board into Challenge via panel/`?devBoard=`; seed sparring via `/game?devBoard=`; fixtures solver-verified non-terminal
- [Valid blunder tags vs categories](reference_valid_blunder_tags.md) — VALID_BLUNDER_TAGS != VALID_CATEGORIES
- [Highlight cell roles](project_highlight_cell_colors.md) — use userIsYellow for role assignment; claimeven always Yellow perspective; cooperativeAiMoves empty
- [Tier source](reference_tier_source.md) — tier from store.getProfile() not session.tier
- [Mockup vs production gap](feedback_mockup_production_gap.md) — NAV_GROUPS/mkCols/cols don't exist in production
- [Parity bug AI-first](project_parity_bug_ai_first.md) — heatmap inversion on AI-first games (unfixed)
- [Coach board reflow "flicker"](project_coach_board_reflow_flicker.md) — board-moves-when-coach-speaks = reflow from accumulating CoachDialog msgs; fix = `fixed` prop
- [SplitReveal board fit](project_split_reveal_board_fit.md) — spec 042 freeze SUPERSEDED by live-fit; green splitRevealZoom test ≠ board frozen; don't restore freeze

## Production LLM coach / deep reveal (toFeatureVector / explainContext)

- [Prod LLM call graph](project_prod_llm_call_graph.md) — prod deep-reveal = defaultCallLLM (mechanismExplainer), NOT callLLM (offline); +Anthropic +compute.mjs +TTS
- [Feature vector design](feedback_feature_vector_design.md) — toFeatureVector: keep grounded cells, drop plumbing/derivations/occurrence-artifacts; keep instance counts
- [Explain prompt grounding traps](project_explain_prompt_grounding_traps.md) — 3 open explainContext traps (empty section, parity always_include, blunder-threat dir) → fabrication
- [LLM perspective bug](feedback_llm_perspective_bug.md) — name player explicitly in Move context section
- [Explain system](project_explain_system.md) — LLM prompt invariants; explanation_cache schema; NO KB term injects without its pattern firing; + doc map
- [Blunder tagging design](project_blunder_tagging_design.md) — tagBlunder throws NotABlunderError on terminal; missed_own = correctCol builds pattern
- [Pattern KB architecture](project_pattern_kb_architecture.md) — PATTERN_KB entry shapes; alias resolution; Tier-1/2/3 in explainContext.js not classifier.js (3 "tier" meanings)
- [Annotation gate & zones](project_annotation_gate_and_zones.md) — allowedSet shapes (null vs []); zone alias map must match prompt or P1:invalid_spec; deep_reveal_failures table
- [Feature vector content traps](project_feature_vector_content_traps.md) — null outcomes on losing_either_way; patternsOpponent snapshot ambiguity; pliesToEnd inverted (=|score|)
- [Deep reveal product mindset](feedback_deep_reveal_product_mindset.md) — score is a compass not the reason; sparse≠no-reason; never fabricate

## Blunder-REASON evidence engine (reason_engine/) — read the 4 docs + D-log FIRST

- [Reason case → also eval + grader](feedback_reason_case_requires_eval_and_grader.md) — new case/field not done until select_boards derives a predicate AND grader/glossary know it
- [select_boards openings RESOLVED](project_select_boards_skips_openings.md) — fixture additive band + deterministic Phase-1 opening step (--seed); engine=computeOpeningContext.mjs (D31/D32)
- [Reason-engine docs are canonical](project_admin_fv_suff_repurposed.md) — read INVARIANTS/DECISIONS/case-taxonomy/evidence + AGENT-PREAMBLE first; /admin/fv-suff 2-mode; lsof kill 3001
- [immediate_threat phantom cell](project_reason_immediate_threat_phantom.md) — immediate_threat/missed_own detect on PRE-move movestring NOT correctRoot; forks keep correctRoot
- [Grounded-render prompt + tripwire](project_reason_render_layer.md) — condition D; render_decision is grader ground truth (never re-derive); covers are family SUPERSETS (D28); §3e
- [FV-suff grader PV-mismatch trap](project_fv_suff_grader_pv_mismatch.md) — verify vector cells against the engine's OWN finalMovestring, not an alternate solver PV
- [Eval design methodology](feedback_eval_design_methodology.md) — floor test w/ stronger same-vendor model; counterexamples not averages; ablation; separate from run_eval
- [Reproduce one FV case from coverage](feedback_reproduce_fv_case_from_coverage.md) — extract row from frozen boards_coverage_*.jsonl (id=index); glossary read fresh at prompt time
- [Engine soundness first, render later](feedback_engine_soundness_then_render.md) — store soundest/complete evidence; render/prune to LLM is a SEPARATE downstream step (D26)
- [drawing_move mislabels wins](project_drawing_move_mislabels_wins.md) — open bug: win-forfeiting move tagged drawing_move; Fix 6 (upstream tagging) still TODO
- [Lookahead shared seam + unvalidated deepening](project_lookahead_shared_seam.md) — collectNovelOpportunities/compareOpportunities feed FV AND prod gate; sparse deepening NOT re-judged
- [Opening defender reason SHIPPED](project_opening_defender_reason_gap.md) — openingContext.defense (D32); NON-OBVIOUS: centrality NOT suppressed for losing mover (resistAndWait)
- [Coach-voice opening defeatist gap](project_coach_voice_opening_defeatist_gap.md) — RESOLVED (D34): L3/L7 hold-the-line; editing causalLinks link.text ripples to 4 verbatim-asserting tests

## Papergames integration

- [Papergames integration](project_papergames_integration.md) — per-user ownership fixed 053; skipped≠duplicates; live-game 4 bugs; reCAPTCHA blocks server login; loadUser 3-site trap

## QA / app-qa

- [app-qa setup gotchas](project_app_qa_setup_gotchas.md) — dev-skip-auth strands data; resize_page broken (use emulate); session drops → /api/auth/refresh; 3001 no hot-reload

## Simulation, scripts, worktrees, epics & general workflow

- [Game simulation harness](reference_game_simulation_harness.md) — all self-play in server/gameSampling.js (playGame/simulateGame/harvestBlunders/playPolicyGame)
- [Coverage sampler rare-fill trap](project_coverage_sampler_rarefill_trap.md) — near-unreachable REQUIRED predicate → satisfied() never flips → full-budget solver burn; bound loops
- [gameSampling rng determinism trap](project_gamesampling_rng_determinism_trap.md) — changing rng usage shifts candidate-generator output; FR-011 minMoves floor protects T017
- [Inline Node scripts](reference_inline_node_scripts.md) — inspect a reason vector w/ TOOLS/compute_feature_vector.mjs; absolute imports; solver hangs (try/finally); shell for-loop → EMPTY
- [Scripts need meaningful --help](feedback_scripts_meaningful_help.md) — every relevant CLI script ships a real --help/-h; check before required-arg validation
- [Repo worktree setup traps](project_repo_worktree_setup.md) — base defaults to origin/main (stale); set worktree.baseRef=head; npm i no longer needs --legacy-peer-deps; copy server/.env
- [Speckit/epic scoping + scope-by-diff](feedback_speckit_epic_scoping.md) — plan vs speckit vs epic sizing bars; hard algos stay in spec; scope is a diff you MEASURE
- [Polish epics pipeline](project_polish_epics_pipeline.md) — counts ALREADY include suboptimal; epic AND critique-agent premises both proved false
- [Prework discipline](feedback_prework_discipline.md) — answer before editing; empirical-first; audit all code paths before an epic; Sonnet spec-review before plan
- [Proportion process to change](feedback_proportion_process_to_change.md) — small additive skill/doc edit: skip full RED-baseline ceremony; validate by using it once
- [Workflow hygiene](feedback_workflow_hygiene.md) — no destructive git for curiosity; quarantine before delete; rg/fd/sg; don't pkill shared server; commit WIP before SDD
- [Agent & UI workflow](feedback_agent_and_ui_workflow.md) — Opus critique/Sonnet apply; handoff + AskUserQuestion gate patterns; never preview for prose/code options
- [Audit existing APIs before speccing](feedback_spec_existing_apis.md) — preserve existing component API unless the change strictly requires otherwise (CLAUDE.md)
- [callLLM error handling in scripts](feedback_calllm_error_handling.md) — wrap each callLLM call individually; uncaught error silently drops the entry
- [LLM output root-cause](feedback_llm_output_root_cause.md) — goal-first, then RCA across render/context/generator; a missing signal is a question not a fact
- [Occam + principled extrapolation](feedback_occam_principled_extrapolation.md) — one unifying mechanism over many special-case kinds; generalize, don't enumerate
- [One-command pipeline, extend don't add](feedback_one_command_pipeline_extend_dont_add.md) — extend existing command over a new script; keep cases solver-verified + both players
- [Superpowers docs aren't durable](feedback_superpowers_docs_not_durable.md) — docs/superpowers/ is throwaway; migrate durable info to docs/architecture/
- [Explanation/question & doc style](feedback_explanation_and_question_style.md) — pitch to non-internals reader; alternatives carry a recommendation; "column-score overlay" not heatmap
- [Pedagogy preferences](feedback_pedagogy_preferences.md) — no lost-position lessons
- [Open-issues destination](feedback_open_issues_destination.md) — deferred/latent bugs → docs/open_issues.md (OI-N), NOT memory; coordinate-implementation auto-persists

## Reference — project architecture

- [User profile](user_profile.md) — strong C++/React/algorithms background; empirical debugger style
- [SpecKit workflow](project_speckit_workflow.md) — spec directories at specs/; CLAUDE.md pointer
- [Custom commands](reference_custom_commands.md) — /coordinate-implementation; /epics-manager generic (per-epic managers deleted, epics self-carry decisions)
- [Knowledge base status](project_kb_status.md) — naming/gaps/PENDING; opening-theory verified; verify movestrings w/ optimal_line.mjs + Allen-notation traps
- [External PDFs](reference_external_pdfs.md) — Allis/Bagan/Allen PDFs; page ranges; corrections
- [Open Chrome debug](reference_open_chrome.md) — binary launch required; open -a fails on macOS
