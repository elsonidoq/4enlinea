# Memory index — trigger-first gotchas

> Conventions/contracts/schemas live in `docs/architecture/`; reason-engine *decisions* in `reason-DECISIONS.md`; deferred bugs in `docs/open_issues.md`. This index is traps only — read the docs.

## Solver, board evaluation, tactical patterns & movestrings

- [c4solver scores + quirks](reference_c4solver.md) — max<0=ALL lose vs min<0=SOME lose; book offset; error-not-hang; exit 137 → rebuild; skip-worktree makes `git status`+`file` lie
- [Forced-block detection](reference_cat5_forced_block_detection.md) — forced-win terminals: scores go FLAT; use checkWin per column, not scores
- [Coach creation transition gate](project_coach_creation_transition_gate.md) — classify() DT/forced_win fire only absent→present; loose vs strict DT predicates — don't dedupe
- [Verified tactical movestrings](reference_verified_tactical_movestrings.md) — KB is source-of-truth (V1/V5 were WRONG, V2/V4 1-indexed); open-three ≠ double_threat
- [missed_own capitalize principle](project_missed_own_capitalize_principle.md) — DT/figure_7/immediate_threat survive wrong moves; only undercut kills a fork
- [classifyPattern perspective trap](project_classify_pattern_perspective_trap.md) — perspective ≠ side-to-move is the COMMON prod path; `_scores` = reads nothing; detectOvercut still unsound (OI-76)
- [generate_candidates "fetch failed"](project_generate_candidates_fetch_failed_flake.md) — many categories 0 = env flake (Docker/solver load), not broken; re-run standalone

## Puzzle categories, challenge & lessons

- [New-category wiring](project_new_category_wiring_checklist.md) — before adding a category read server-conventions §Category Registry; missing candidate-generator.js = SILENT failure
- [Opening theory scoping](project_opening_theory_scoping.md) — NO opening challenge category (won boards have losing side to move); openings → Lessons
- [Lesson interactivity](project_lesson_interactivity_evaluation.md) — Socratic = client-side col===correctCol; inline challenges DO work (/api/evaluate-move, no DB row)
- [Lesson board sourcing traps](project_lesson_answer_set_invariant.md) — undercut boards are valid for ONE side only; lesson-11 MUST fail detectUndercutVictim; JSONB key-order false drift
- [Lesson fields NOT rendered](project_lesson_json_fields_not_rendered.md) — goalPrompt/socratic.overlays/userPerspective are dead; socratic color = movestring parity
- [Lesson/coach audio traps](project_lesson_progression_audio_traps.md) — CoachDialog never speaks; only coach.spoken.* synthesized; :3001 won't serve public/ (test :5173)
- [Lesson write lands elsewhere](project_lesson_disk_edit_cache_clobber.md) — a 200 ≠ it saw your file, or wrote the one you watch (slug≠id forks it)
- [odd_even_threat split life](project_detect_odd_even_threat_yellow.md) — still a classifyPattern tag + puzzle category, but OFF the coach prompt & blunder vocab
- [New lesson slide field wiring](project_lesson_slide_field_wiring.md) — 6 wiring points; the SlideEditor control is forgotten EVERY time (OI-67, then showWindowCounts)
- [Lesson unlock is pairwise, not furthest-pointer](project_lesson_progress_unlock_is_pairwise.md) — editing one lesson_progress row doesn't unblock earlier ones; use backfill-lesson-progress.mjs
- [windowHighlights capsule traps](project_lesson_window_highlights_traps.md) — cells must be ORDERED (drawn first→last, unchecked); opaque colours only; never via legendItems
- [Lesson text clips silently](project_lesson_text_overflow_traps.md) — 120px coach cap on EVERY screen (not just `fixed`); splitting a message makes it WORSE; ES binds; a wrapping legend row steals visible infoProse

## Server, API, DB schema, auth, payments & deploy

- [Admin gate reality](project_admin_localhost_directive.md) — requireAdmin is a NO-OP outside NODE_ENV=production; requireLocalhost is the only real gate
- [CSP invisible under Vite dev](project_csp_helmet_traps.md) — Express CSP never lands under npm run dev; test the Express-served dist; SW reg in main.jsx
- [Auth flow traps](project_auth_flow_traps.md) — two supabase clients; GoTrue skips on_auth_user_created; NO route guard → CTA gate ≠ screen gate; deleteDatabase hangs sign-in
- [Unapplied migration = silent 204](project_user_column_propagation.md) — PostgREST drops unknown columns from UPDATE → 204 persists nothing; no server hot-reload
- [Supabase envs & poolers](reference_supabase_connection.md) — staging=6543 txn-pooler (NO DDL); local needs the JWT service key, not sb_secret_*; storage signedUrl; delete-staging-user-by-email.js
- [Stripe traps](project_stripe_traps.md) — OBSOLETE 2026-07-18 (Stripe fully removed); historical context only, do not use for current work
- [Paddle integration](project_paddle_integration.md) — sandbox/live from key prefix NOT NODE_ENV/MODE; CSP=5-round discovery; domain resubmit=remove+re-add; checkout_not_enabled≠domain gate; fulfillment checklist needs 6 events + a REAL delivery
- [explanation_cache bypasses producers](project_blunder_serving_dual_paths.md) — cache-hit path skips the producer guards; sanitize at the response seam + TRUNCATE on deploy
- [session-stats byPattern always empty](project_stats_architecture.md) — /api/user/session-stats/all reads stats.byPattern; stored shape is flat category keys (open bug)
- [Deploy: invisible strict npm ci](project_spec031_staging_production_deploy.md) — railpack.json hides the auto-injected npm ci; peer conflicts fail the build; npm ci --dry-run
- [Secret-scan = placeholders](project_secret_scan_placeholders.md) — git-history secret hits are ALL placeholders; NO rotation; docs/security_audit_fable.md
- [OPENAI_API_KEY is present](feedback_openai_key_present.md) — real key in server/.env; never defer TTS/LLM as "needs a key"; verify on localhost

## Frontend, board display & i18n

- [Spanish output silent fallback](project_spanish_output_silent_fallback.md) — a new string/term/LLM-field ships English SILENTLY via graceful fallback; graders English-only
- [TTS audio cached by text](project_tts_audio_cached_by_text.md) — model/voice/prompt change does NOT regenerate coach/deep-reveal clips (text-hash keyed); audition via /admin/audio
- [DEV board injector](project_dev_board_injector.md) — load any board into Challenge via panel/`?devBoard=`; seed sparring via `/game?devBoard=`; fixtures solver-verified

## Production LLM coach / deep reveal (toFeatureVector / explainContext)

- [Prod LLM call graph](project_prod_llm_call_graph.md) — prod deep-reveal = defaultCallLLM (mechanismExplainer); callLLM is offline-only; the doc diagrams still lie
- [Feature vector design](feedback_feature_vector_design.md) — toFeatureVector: keep grounded cells, drop plumbing/derivations; keep instance counts
- [Feature vector content traps](project_feature_vector_content_traps.md) — null outcomes on losing_either_way; patternsOpponent snapshot ambiguity; pliesToEnd = |score|
- [Annotation gate debugging](project_annotation_gate_and_zones.md) — classifyPattern Map order non-deterministic (PRIORITY.find); blunders-not-populated ladder; `inverted`=OPTIMAL
- [Explain system](project_explain_system.md) — LLM prompt invariants; explanation_cache schema; NO KB term injects without its pattern firing
- [LLM perspective bug](feedback_llm_perspective_bug.md) — the post-move board's "Next:" label hijacks LLM perspective; name the mover explicitly
- [Deep reveal product mindset](feedback_deep_reveal_product_mindset.md) — score is a compass not the reason; sparse ≠ no-reason; never fabricate

## Blunder-REASON evidence engine — read the 4 docs + D-log FIRST

- [Reason case → eval + grader](feedback_reason_case_requires_eval_and_grader.md) — a new case/field also needs a select_boards predicate + glossary + grader
- [Opening reason traps (D31–D34)](project_reason_opening_traps.md) — opening preds stay PROVISIONAL; centrality NOT suppressed for a losing mover; causalLinks text = 4 verbatim tests
- [immediate_threat phantom cell](project_reason_immediate_threat_phantom.md) — standing-threat tags detect on the PRE-move movestring, not correctRoot; forks keep correctRoot
- [Grounded-render traps](project_reason_render_layer.md) — fieldDisposition closed registry breaks test:fast by design; decisionKey uses STRUCTURAL tags; boards escape the coverage walk
- [FV-suff grader PV trap](project_fv_suff_grader_pv_mismatch.md) — verify cells against the engine's OWN finalMovestring; many optimal PVs exist
- [Eval design methodology](feedback_eval_design_methodology.md) — floor-test w/ a stronger SAME-vendor model; counterexamples not averages; ablate; keep off run_eval
- [Reproduce one FV case](feedback_reproduce_fv_case_from_coverage.md) — extract the row from frozen boards_coverage_*.jsonl (id = index); glossary reads fresh at prompt time
- [Engine soundness before render](feedback_engine_soundness_then_render.md) — store the soundest/complete evidence; pruning for the LLM is a SEPARATE downstream step (D26)
- [drawing_move mislabels wins](project_drawing_move_mislabels_wins.md) — the tag conflates "best draws" with "best WINS"; upstream fix open (OI-48)
- [Lookahead shared seam](project_lookahead_shared_seam.md) — collectNovelOpportunities feeds the FV AND the prod annotation gate; no tests; characterize first

## Simulation, scripts, sampling & epics

- [Coverage rare-fill trap](project_coverage_sampler_rarefill_trap.md) — a REQUIRED-but-unreachable predicate → satisfied() never flips, looks hung; opp_neutralization may be DEAD not rare
- [win_distribution row vs column](project_win_distribution_row_vs_column.md) — COLUMN marginal is policy-invariant (safe); ROW marginal is an artifact of mistake rate; only parity DIRECTION is robust
- [gameSampling rng determinism](project_gamesampling_rng_determinism_trap.md) — one extra rng() call shifts every candidate; the FR-011 minMoves floor protects T017
- [Inline Node scripts](reference_inline_node_scripts.md) — TOOLS/compute_feature_vector.mjs first; absolute imports; solver hangs (try/finally); shell for-loop → EMPTY
- [Rate limit kills bulk loops](project_api_rate_limit_breaks_bulk_scripts.md) — 120/min per IP shared with browser QA; PLAIN-TEXT 429 → opaque JSON decode error; no handler log line
- [Scripts need real --help](feedback_scripts_meaningful_help.md) — purpose + options + defaults, exit 0 BEFORE required-arg validation
- [Open-issues epic backlog](reference_open_issues_epics.md) — epic #s are LANE-major not priority; closing the OI entry is acceptance criteria; 7 OIs already stale-resolved

## QA, worktrees & Papergames

- [app-qa traps](project_app_qa_setup_gotchas.md) — automation Chrome fakes autoplay (audio ships silent); discs are background-image; resize_page dead → emulate
- [Worktree setup traps](project_repo_worktree_setup.md) — baseRef is a Claude-Code setting (.claude/settings.json), NOT git config; copy server/.env or reason tests ENOENT
- [Papergames integration](project_papergames_integration.md) — skipped ≠ duplicates (don't "fix"); reCAPTCHA blocks server login; loadUser 3-site trap

## Workflow, agents & process

- [Verify at the source layer](feedback_verify_at_the_source_layer.md) — every false belief hides in a layer: signature NOT doc comment, diff NOT agent report, real output NOT your fixture, all-N NOT a sample
- [A wrong test is part of the bug](feedback_wrong_test_is_part_of_the_bug.md) — never shape a fix to keep an existing test green; read the fixture, not its name; a defect in a fixture is usually in the data too
- [Concurrent agents clobber](feedback_concurrent_agents_clobber.md) — the user runs agents in parallel; two in one tree overwrite SILENTLY; line numbers stale within the hour
- [External auto-backup commits](project_external_auto_backup_commits.md) — a background process auto-commits STAGED work unpredictably (once broke HEAD); stage explicit paths only, never git add -A, git status --short before commit
- [Isolated review misses seams](feedback_isolated_review_misses_seams.md) — the JOIN of two correct halves; 1-instance tests miss N-instance clashes
- [Process & agent preferences](feedback_process_and_agent_preferences.md) — sizing bars; scope is a diff you MEASURE; Opus critique/Sonnet apply; AskUserQuestion ≥2 opts, never `preview` for text
- [Open-issues destination](feedback_open_issues_destination.md) — deferred/latent bugs → docs/open_issues.md (OI-N), NOT memory
- [Superpowers docs aren't durable](feedback_superpowers_docs_not_durable.md) — docs/superpowers/ is throwaway; migrate durable info to docs/architecture/
- [Explanation/question & doc style](feedback_explanation_and_question_style.md) — pitch to a non-internals reader; alternatives carry a recommendation; "column-score overlay" not heatmap
- [LLM output root-cause](feedback_llm_output_root_cause.md) — goal-first, then RCA across render/context/generator; a missing signal is a question, not a fact
- [Occam + principled extrapolation](feedback_occam_principled_extrapolation.md) — one unifying mechanism over many special-case kinds; generalize, don't enumerate
- [One-command pipeline](feedback_one_command_pipeline_extend_dont_add.md) — extend the existing command over a new script; keep cases solver-verified + both players
- [Pedagogy preferences](feedback_pedagogy_preferences.md) — no lost-position lessons; no abstract Allis rules
- [Never print secrets](feedback_never_print_secrets.md) — no exceptions for "low-risk sandbox"; verify via hash/length/prefix or point to the source instead; offer rotation if leaked

## Reference

- [User profile](user_profile.md) — strong C++/React/algorithms; empirical debugger; commits WIP himself — never auto-commit, quarantine before delete
- [SpecKit workflow](project_speckit_workflow.md) — specs at specs/; check-prerequisites errors on main (non-fatal, proceed)
- [Custom commands](reference_custom_commands.md) — /coordinate-implementation; /epics-manager generic (per-epic managers DELETED; epics self-carry decisions)
- [Knowledge base status](project_kb_status.md) — every entry is prefixed (`docs/knowledge-base/undercut.md` NEVER exists — ls first); verify movestrings w/ optimal_line.mjs; Allen-notation traps
- [External PDFs](reference_external_pdfs.md) — Allis/Bagan/Allen page ranges; corrected rule outcomes are counter-intuitive (1R vs 1B = Draw; Bagan ≠ C4 parity)
- [Open Chrome debug](reference_open_chrome.md) — binary launch; sibling locks MCP browser → own 9222 + CDP; seed progress status:'complete'
