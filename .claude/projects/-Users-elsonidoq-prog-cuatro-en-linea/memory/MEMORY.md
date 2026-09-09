# Memory index — trigger-first gotchas

> Conventions/contracts/schemas live in `docs/architecture/`; reason-engine *decisions* in `reason-DECISIONS.md`; deferred bugs in `docs/open_issues.md`. This index is traps only — read the docs.

## Solver, board evaluation, tactical patterns & movestrings

- [c4solver scores + quirks](reference_c4solver.md) — max<0=ALL lose vs min<0=SOME lose; book offset; error-not-hang; exit 137 → rebuild; forced-win terminals go FLAT — use checkWin; skip-worktree makes `git status`+`file` lie
- [Coach creation transition gate](project_coach_creation_transition_gate.md) — classify() DT/forced_win fire only absent→present; loose vs strict DT predicates — don't dedupe
- [Verified tactical movestrings](reference_verified_tactical_movestrings.md) — KB is source-of-truth (V1/V5 were WRONG, V2/V4 1-indexed); open-three ≠ double_threat
- [missed_own capitalize principle](project_missed_own_capitalize_principle.md) — DT/figure_7/immediate_threat survive wrong moves; only undercut kills a fork
- [classifyPattern perspective trap](project_classify_pattern_perspective_trap.md) — perspective ≠ side-to-move is the COMMON prod path; `_scores` reads nothing; detectOvercut unsound (OI-76)
- [generate_candidates "fetch failed"](project_generate_candidates_fetch_failed_flake.md) — many categories 0 = env flake (Docker/solver load), not broken; re-run standalone

## Puzzle categories, challenge & lessons

- [New-category wiring](project_new_category_wiring_checklist.md) — missing candidate-generator.js = SILENT failure; per-category predicates DRIFT from the shared accept rule (symptom = low match rate)
- [Grading reads STORED metadata](project_puzzle_grading_reads_stored_metadata.md) — a detector change silently invalidates live rows; graders NOT uniform (only evalFigure7 cross-checks correct_cols)
- [puzzle_attempts write traps](project_puzzle_attempt_outcome_traps.md) — ALL 4 writers fire-and-forget ⇒ CHECK/type errors vanish; moves_tried is integer[]; a green store-mock test proves nothing
- [correct_cols engine traps](project_correct_cols_engine_traps.md) — undercut/overcut "show nothing" is EMERGENT from a NULL (`correct_cols[0]` renders col 0); checkPredicate ≠ checkPredicateRaw; circular import; mass backfill rejections usually stale data
- [Generate puzzles for local QA](feedback_generate_puzzles_for_local_qa.md) — local `puzzles` is EMPTY for most categories; YOU can generate+promote (localhost-gated; `--port` defaults to a WRONG 3001 in worktrees) — never call it unreachable or let an empty pool become a SPEC decision
- [Lesson interactivity](project_lesson_interactivity_evaluation.md) — Socratic = client-side col===correctCol; inline challenges DO work (/api/evaluate-move, no DB row)
- [Lesson board sourcing traps](project_lesson_answer_set_invariant.md) — undercut boards valid for ONE side only; a `boardSpec` slide is NOT a movestring ⇒ visualize_board.sh is the WRONG oracle
- [Lesson fields NOT rendered](project_lesson_json_fields_not_rendered.md) — socratic.goalPrompt/overlays/userPerspective dead, but challenge goalPrompt now RENDERS+narrates; color = movestring parity
- [Lesson/coach audio traps](project_lesson_progression_audio_traps.md) — lesson order = FILENAME prefix; CoachDialog never speaks; only coach.spoken.* synthesized; /admin/audio has TWO players on different paths
- [Lesson+coach audio generation traps](project_lesson_audio_generation_traps.md) — lesson: no `locator` = ALL; coach: `--all-new` sweeps OTHERS' pending keys; `awaiting_approval` can't be green (OI-184)
- [Lesson write lands elsewhere](project_lesson_disk_edit_cache_clobber.md) — a 200 ≠ it saw your file, or wrote the one you watch (slug≠id forks it)
- [New lesson slide field wiring](project_lesson_slide_field_wiring.md) — 6 wiring points; the SlideEditor control is forgotten EVERY time (OI-67, then showWindowCounts)
- [Locked-lesson copy is NOT in the lesson screens](project_lesson_lock_copy_lives_in_saga.md) — useLessonLockGuard redirects BEFORE mount ⇒ copy lives in SagaScreen/UpgradeModal; sagaLock = 3 chained fns; getEntitlement() drops `authenticated`
- [Lesson unlock is pairwise, not furthest-pointer](project_lesson_progress_unlock_is_pairwise.md) — editing one lesson_progress row doesn't unblock earlier ones; use backfill-lesson-progress.mjs
- [windowHighlights capsule traps](project_lesson_window_highlights_traps.md) — cells must be ORDERED (drawn first→last, unchecked); opaque colours only; never via legendItems
- [Lesson text clips silently](project_lesson_text_overflow_traps.md) — PARTLY FIXED: cap is now a `maxBubblesHeight` prop (ConceptScreen=200); infoProse ALWAYS scrolled — it lacked an affordance

## Server, API, DB schema, auth, payments & deploy

- [Admin gate reality](project_admin_localhost_directive.md) — requireAdmin is a NO-OP outside NODE_ENV=production; requireLocalhost is the only real gate
- [CSP invisible under Vite dev](project_csp_helmet_traps.md) — never lands under npm run dev; server reads dist at BOOT (restart after rebuild); placeholder Paddle token suffices
- [Entitlement client cache traps](project_entitlement_client_cache_traps.md) — cache is module- not account-scoped; sign-out needs clearEntitlement or fail-open re-pins stale entitled:true forever
- [Auth flow traps](project_auth_flow_traps.md) — NO email sign-in exists (Google only; app-qa brief is stale); a REAL session can leave the screen unchanged (routing, not auth)
- [Migration ledger vs disk + pooler myth](project_migration_ledger_and_pooler.md) — schema_migrations tracks FILENAMES (061 collided); "6543 forbidden" rationale is wrong — staging ships on it
- [Unapplied migration = silent 204](project_user_column_propagation.md) — PostgREST drops unknown columns AND `undefined` values from UPDATE → silent partial write; no server hot-reload
- [Adding a puzzles/candidates column](project_puzzle_row_write_sites.md) — 5 hand-written insert sites, none shared; candidate-generator.js never touches the DB
- [Supabase linter triage](project_supabase_linter_traps.md) — 0012 anon-policy warns are WAI (anon sign-ins ⇒ `authenticated`); migrate.js-bootstrapped tables escape the RLS/grant sweeps; RLS ≠ TRUNCATE
- [Supabase envs & poolers](reference_supabase_connection.md) — STAGING PROJECT GONE (NXDOMAIN 2026-08-25); local needs the JWT key, not sb_secret_*
- [Paddle integration](project_paddle_integration.md) — sandbox/live from key PREFIX; local Paddle WORKS; sandbox dunning card does NOT decline on a forced renewal; rollback must NULL paddle_customer_id
- [Paddle SDK + ledger traps](project_paddle_sdk_and_ledger_traps.md) — subscriptions.list() = lazy Collection NOT a promise; sigs die in 5s; payment_events has no per-account col; set-tier.js = tier only
- [Webhook payload layer](project_paddle_webhook_payload_layer.md) — payment_events stores the UNMARSHALED camelCase entity NOT Paddle's snake_case wire payload; a renamed field VANISHES from the row
- [explanation_cache bypasses producers](project_blunder_serving_dual_paths.md) — TWO response seams read it; TTS didn't sanitize ⇒ voice said "c1r3", text "column 1"; sanitizer change orphans audio; **cache key = position only, NO render version ⇒ a render fix is invisible on cached positions — purge after deploy**
- [Railway logs](reference_railway_staging_logs.md) — MCP ids; get-logs NEEDS a filter (rest blocked); import 404 = wrong account id, not an outage
- [Stats accuracy is PUZZLE accuracy](project_stats_architecture.md) — no game-accuracy aggregate exists; avg_accuracy is a LABEL key; byPattern always empty (open bug)
- [Deploy EXECUTION traps](project_deploy_execution_traps.md) — auto-runner defeats "after the code deploy"; ADD COLUMN never populates; prompts exit 0 writing NOTHING; prod=main, staging=stagging (133 AHEAD ⇒ hotfix main)
- [OPENAI_API_KEY is present](feedback_openai_key_present.md) — real key in server/.env; never defer TTS/LLM as "needs a key"; verify on localhost (remote containers have NO .env — check)

## Frontend, board display & i18n

- [Consolidating two homes drops localization](feedback_consolidating_two_homes_drops_localization.md) — deleting the "duplicate" i18n copy deleted the only translations; a rule can outlive its reason
- [Spanish output silent fallback](project_spanish_output_silent_fallback.md) — a new string/term/LLM-field ships English SILENTLY via graceful fallback; graders English-only
- [TTS audio naming is NOT uniform](project_tts_audio_cached_by_text.md) — lesson/deep-reveal text-hashed, COACH keyed by i18n key ⇒ dynamic coach text ships silent or stale
- [Coach phrase key drives TWO lookups](project_coach_phrase_pool_dual_lookup.md) — `coach.spoken.*` AND `eval.*.summary`; `eval.*` has 6 keys only; parity test is presence-only
- [DEV board injector](project_dev_board_injector.md) — load any board into Challenge via panel/`?devBoard=`; seed sparring via `/game?devBoard=`; fixtures solver-verified

## Production LLM coach / deep reveal (toFeatureVector / explainContext)

> FV/deep-reveal content traps + toFeatureVector field rules: `docs/architecture/feature-vector-sufficiency-experiment.md` §"content traps"/13/14. Prod LLM call graph: `server-conventions.md` §"Which function actually serves production deep-reveal".
- [Deep-reveal eval harness gap](project_deep_reveal_eval_harness_gap.md) — compute.mjs skips prod's retry: 38% of graded runs WOULD have retried ⇒ "model ignores required set" is an EVAL ARTIFACT, enforcement already exists
- [Annotation gate debugging](project_annotation_gate_and_zones.md) — P5Strong RUNS since 058 (fresh-gen only, OI-143 closed); 4 old warnings stale; OI-171 RESOLVED (D43/D45), OI-172 mitigated
- [Require, don't suggest, LLM handles](feedback_require_dont_suggest_llm_handles.md) — prompt wording measured INERT (0/12); only the REQUIRED set moved it (12/12); 1 run is a sample
- [Grounded-annotation + layer-attribution traps](project_grounded_annotation_traps.md) — term+zone can NEVER co-wrap (leaks raw tags on screen); diff SERVED vs RAW mechanism FIRST; a RENDERED highlight ≠ a grounded one (OI-173)
- [Creation tags aren't score-gated](project_creation_tags_not_score_gated.md) — double_threat/forced_win/figure_7/j_shape fire on a LOSING move too; never key their phrase pool off raw `quality`
- [Deep reveal product mindset](feedback_deep_reveal_product_mindset.md) — score is a compass not the reason; sparse ≠ no-reason; never fabricate

## Blunder-REASON evidence engine — read the 4 docs + D-log FIRST

> FV case reproduction (grep-by-id, compute.mjs --llm invocation): `docs/architecture/feature-vector-sufficiency-experiment.md` §14.
- [Opening reason traps (D31–D34)](project_reason_opening_traps.md) — opening preds stay PROVISIONAL; centrality NOT suppressed for a losing mover; causalLinks text = 4 verbatim tests
- [immediate_threat phantom cell](project_reason_immediate_threat_phantom.md) — standing-threat tags detect on the PRE-move movestring, not correctRoot; forks keep correctRoot
- [Fork/threat claim oracles](project_fork_claim_oracle_traps.md) — GRAVITY-TOP or the number is wrong; forkCells-length and all-completing-cells each gave a confident WRONG answer, opposite directions
- [Grounded-render traps](project_reason_render_layer.md) — closed registry breaks test:fast by design; boards escape the coverage walk; adding a board adds VOCABULARY the model echoes (0→10/125)
- [FV-suff answers LAYER trap](project_fv_suff_answers_layer_trap.md) — name the layer before counting: raw ≠ tags-stripped prose ≠ post-guard served; ALSO prompt-side — assembleGroundedPrompt ≠ the full prompt (task + locale suffix appended after); usedSpecs MUST come from `raw` — from the stored `answer` it is empty 42/42 and reads as a finding, not a bug; parseAnswer/postprocessAnswer return WRAPPERS ⇒ a wrong call yields confident ZEROS, not an error
- [render_decision truthBoard semantics](project_render_decision_truthboard_semantics.md) — an occupied `future:` cell is NORMAL on projected boards; a detector without a truthBoard filter fires 37/63 and is ~97% false positives
- [Grader contamination signal](project_grader_contamination_signal.md) — two graders citing the SAME cell for DIFFERENT records = one graded the wrong board; the file is schema-valid and confident; cross cited cells against the record's own feature_vector
- [Eval run comparison traps](project_eval_run_comparison_traps.md) — `--model` defaults to gpt-5.4 but baselines are mini; case-pass NOT comparable across n; every rate is a FLOOR; ±20% grader error on A4/A7/G1; **rubric CANNOT check role text (zones = ground truth by design); a before/after diff needs a prompt-unchanged CONTROL ARM — control churned MORE than treatment**
- [Eval design methodology](feedback_eval_design_methodology.md) — floor-test w/ a stronger SAME-vendor model; counterexamples not averages; ablate; keep off run_eval
- [drawing_move mislabels wins](project_drawing_move_mislabels_wins.md) — the tag conflates "best draws" with "best WINS"; never trust it to mean no win was available (OI-48)
- [Lookahead shared seam](project_lookahead_shared_seam.md) — collectNovelOpportunities feeds the FV AND the prod annotation gate; no tests; characterize first

## Simulation, scripts, sampling & epics

- [Coverage rare-fill trap](project_coverage_sampler_rarefill_trap.md) — REQUIRED-but-unreachable → satisfied() never flips, looks hung; phase_opening REQUIRED but opening-THEORY preds PROVISIONAL
- [win_distribution row vs column](project_win_distribution_row_vs_column.md) — COLUMN marginal is policy-invariant (safe); ROW marginal is an artifact of mistake rate; only parity DIRECTION is robust
- [gameSampling rng determinism](project_gamesampling_rng_determinism_trap.md) — one extra rng() call shifts every candidate; the FR-011 minMoves floor protects T017
- [Inline Node scripts](reference_inline_node_scripts.md) — TOOLS/compute_feature_vector.mjs first; absolute imports; solver hangs (try/finally); shell for-loop → EMPTY
- [Rate limit kills bulk loops](project_api_rate_limit_breaks_bulk_scripts.md) — 120/min per IP shared with browser QA; PLAIN-TEXT 429 → opaque JSON decode error; no handler log line
- [Open-issues epic backlog](reference_open_issues_epics.md) — epic #s LANE-major not priority; launch blockers in a SEPARATE file; first-line-only status scan undercounts resolved; 042/043 have no feat() commit

## QA, worktrees & Papergames

- [test:dom is a SECOND gate](project_test_dom_is_a_second_gate.md) — screen tests are NOT in test:fast; a broken screen ships green. Report both numbers
- [DOM test hang diagnosis](project_dom_test_hang_diagnosis.md) — a hanging jsdom test = assert.equal() on a live DOM node (util.inspect walks Fiber, 33.9s vs 18ms); `ps` 0% CPU lies
- [app-qa traps](project_app_qa_setup_gotchas.md) — autoplay faked; board fills in ~2s so a fast read looks EMPTY; fresh worktree has NO node_modules/.env; Paddle iframe IS drivable
- [Worktree setup traps](project_repo_worktree_setup.md) — baseRef is a Claude-Code setting NOT git config; copy server/.env or tests ENOENT; res.sendFile needs dotfiles:'allow'; test:fast baseline is GREEN (judge vs 0)
- [Editing test:fast kills agents](project_test_fast_edit_hazard.md) — ONE 7146-char line of 184 files; 2 agents died on that exact-match edit. Do the append yourself, not via an agent
- [ESLint flat-config traps](project_eslint_config_traps.md) — lint is a REAL gate: `test:fast` runs it first (error ⇒ zero tests run) + pre-commit; 47 warnings = healthy
- [Papergames integration](project_papergames_integration.md) — OWNER: live Play-Online was JUST A TEST, don't work on it or OI-175 (it hits real opponents); import is separate

## Workflow, agents & process

- [Artifacts are detritus, not baselines](feedback_artifacts_are_detritus_not_baselines.md) — many timestamped eval files = debugging residue; owner wants ONE canonical file at a STABLE path
- [File mtime is never evidence](project_file_mtime_is_never_evidence.md) — mtime = the checkout, not the write; all 565 mp3s share one stamp. Date from `generated_at` or `git log --diff-filter=A`
- [Shell tools lie silently](project_grep_silent_zero_matches.md) — multibyte ⇒ grep/diff go "binary" (diff -a); `grep -rln` matches COMMENTS so it can't count call sites; zsh eats `:c`
- [A plan can contradict its own research](feedback_plan_can_contradict_its_own_research.md) — plan.md paraphrased research.md and INVERTED it; /speckit-tasks reads plan.md
- [Verify at the source layer](feedback_verify_at_the_source_layer.md) — signature NOT doc comment, diff NOT agent report, real output NOT your fixture; cite file:line or say UNVERIFIED; R12: text layer ≠ RUNTIME layer
- [Don't let a stated motive rewrite the analysis](feedback_dont_let_motive_rewrite_analysis.md) — answer the question, never infer WHY; on a correction reconcile, don't replace; a preference change ≠ a reason for facts to change
- [A plan's Deferred section is a TASK LIST](feedback_deferred_sections_are_a_task_list.md) — "revisit only if X" = a trigger to evaluate against the final numbers, not discarded scope
- [Measurements expire](feedback_measurement_expires.md) — re-measure vs FINAL code; UNCHANGED line ≠ unfixed bug; a recorded BLOCKER expires too — "owner-confirmed" dates the symptom
- [Live envs have NO real users (pre-launch)](project_live_envs_have_no_real_users.md) — staging/prod DBs are DISPOSABLE until the owner says released; regenerate > repair; prod work = docs not tooling
- [Implemented ≠ deployable](feedback_implemented_vs_deployable.md) — answer both; per-change prereqs → `docs/deployment_steps.md` = a WORK QUEUE (non-empty = not shipped); standing procedure → `deploy-runbook.md`; `staging_checks.md` is at REPO ROOT
- [A wrong test is part of the bug](feedback_wrong_test_is_part_of_the_bug.md) — never keep a test green over a fix; read the fixture not its name; a test can be VACUOUS: f(a)===f(a) reads as coverage
- [Sub-agent reports are scoped claims](feedback_subagent_reports_are_scoped_claims.md) — green run may be its WORKING TREE; a grader will assert YOUR just-made fix didn't land — recheck at source
- [Concurrent agents clobber](feedback_concurrent_agents_clobber.md) — the user runs agents in parallel; two in one tree overwrite SILENTLY; line numbers stale within the hour
- [External auto-backup commits](project_external_auto_backup_commits.md) — a background process auto-commits STAGED work unpredictably (once broke HEAD); stage explicit paths, never git add -A
- [Isolated review misses seams](feedback_isolated_review_misses_seams.md) — the JOIN of two correct halves; 1-instance tests miss N-instance clashes
- [plan.md's file map is the coverage frontier](feedback_plan_file_map_is_coverage_frontier.md) — /speckit-tasks reads the Source Code map, NOT prose; a file named only in research/contracts silently gets NO task
- [Critique the PLAN before executing it](feedback_critique_the_plan_before_executing.md) — owner-requested; caught a task testing a nonexistent undo button + 21/30 wrong claims
- [QA subagents append on discovery](feedback_qa_subagents_append_on_discovery.md) — a stalled agent that buffered its writes loses the whole group; coordinator owns the summary
- [Process & agent preferences](feedback_process_and_agent_preferences.md) — sizing bars; scope is a diff you MEASURE; Opus critique/Sonnet apply; AskUserQuestion ≥2 opts, never `preview` for text
- [Open-issues destination](feedback_open_issues_destination.md) — deferred/latent bugs → docs/open_issues.md (OI-N), NOT memory
- [Superpowers docs aren't durable](feedback_superpowers_docs_not_durable.md) — docs/superpowers/ is throwaway; migrate durable info to docs/architecture/
- [Explanation/question & doc style](feedback_explanation_and_question_style.md) — pitch to a non-internals reader; alternatives carry a recommendation; "column-score overlay" not heatmap
- [LLM output root-cause](feedback_llm_output_root_cause.md) — goal-first, then RCA across render/context/generator; a missing signal is a question, not a fact
- [Occam + extend-don't-add](feedback_occam_principled_extrapolation.md) — one unifying mechanism over many special-case kinds; extend the ONE command, never a sibling script or new --strategy
- [Pedagogy preferences](feedback_pedagogy_preferences.md) — no lost-position lessons; no abstract Allis rules
- [Never print secrets](feedback_never_print_secrets.md) — no exceptions for "low-risk sandbox"; verify via hash/prefix; git-history hits are ALL placeholders, see security_audit_fable.md; offer rotation

## Reference

- [User profile](user_profile.md) — strong C++/React/algorithms; empirical debugger; commits WIP himself — never auto-commit, quarantine before delete
- [Custom commands + SpecKit](reference_custom_commands.md) — /create-epic (verify→AskUserQuestion→size→epic); /epics-manager generic; /coordinate-implementation
- [Knowledge base status](project_kb_status.md) — every entry is prefixed (`docs/knowledge-base/undercut.md` NEVER exists — ls first); verify movestrings w/ optimal_line.mjs; Allen-notation traps
- [External PDFs](reference_external_pdfs.md) — Allis/Bagan/Allen page ranges; corrected rule outcomes are counter-intuitive (1R vs 1B = Draw; Bagan ≠ C4 parity)
- [Open Chrome debug](reference_open_chrome.md) — binary launch; sibling locks MCP browser → own 9222 + CDP; seed progress status:'complete'
