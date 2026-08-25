<!-- Execution ledger, copied out of the git-ignored SDD workspace so it survives. -->
# Execution ledger — deep-reveal render remediation (2026-08-11 → 2026-08-25)

Original location: `.superpowers/sdd/2026-08-11-deep-reveal-render-remediation/progress.md`
(`.superpowers/` is git-ignored and the SDD workspace is deleted when a plan finishes).

**What this is:** the append-only working record of the plan's execution — every task's verification,
every review finding, every measurement, and the traps that cost time. It is the most detailed account
of *why* things were done, and it holds findings that are not in the committed reports, notably which
failures reproduced across two independent grading runs (the test that separates real defects from
n=5 noise).

**Authoritative status lives elsewhere:** the plan's own STATUS block
(`2026-08-11-deep-reveal-render-remediation.md`), the backlog (`docs/open_issues.md`, OI-182…OI-197),
and D48 (`docs/architecture/reason-DECISIONS.md`). Where this ledger and those disagree, they win —
this file records what was believed at each point, including claims later corrected.

---

# SDD ledger — plan: docs/superpowers/plans/2026-08-11-deep-reveal-render-remediation.md

Mode: subagent-driven, NO per-task review agent (owner directive 2026-08-11). Controller verifies each
task by running `npm run test:fast` and reading the diff at source. Single whole-branch review at end.

Task 1: complete (commit f378fb1, controller-verified: 25 rows verbatim from boards.jsonl, 5/5 passing
  controls present, test:fast 1927/0, commit touched only its own 3 files)
Task 1: note — boards_subset.jsonl is NOT tracked (.gitignore:6 `*jsonl`; boards.jsonl + evidence.jsonl
  are untracked too). The freeze lives in the committed SUBSET_IDS constant; the .jsonl is regenerated
  by `node server/scripts/reason_corpus/build_boards_subset.mjs`. Later tasks must not assume git has it.
Task 2: complete (commit 059e9dc, controller-verified: full wiring argVal -> buildTask ->
  buildPromptForCondition -> call site; confirmed the budget reaches the REAL condition-D prompt for
  eval-12 at both "1-3" and "4-6"; test:fast 1928/0)
Task 2b: attempt 1 FAILED (API error, connection closed mid-response) — nothing written, tree clean.
Task 2b: attempt 2 FAILED (stalled 600s, no progress) — nothing written, tree clean. Both attempts died
  at the same point: handling connect-four/package.json, whose `test:fast` value is ONE 7146-char line
  of 184 test files. Exact-match editing that line is the hazard.
Task 2b: controller pre-applied the package.json append (1-line diff, uncommitted, verified) and
  attempt 3 dispatched with an explicit prohibition on reading/editing package.json.
Task 2b: complete (commit d0536db, attempt 3; controller-verified: commit = exactly its 3 files;
  script independently reproduces A1 126/126, A2 126/126, A6 91/126, G7a 124/126, G7b 109/126 over the
  2026-08-06 corpus — A6's 15 disagreements vs the agents are the adopted production-served definition,
  all script-pass/agent-fail, zero agent-pass/script-fail; test:fast 1935/0)

--- PHASE A code complete. Task 3 is the paid measurement run, not an implementation task. ---

Controller fix (commit 7995a87, NOT a plan task): compute.mjs wrote answers to server/scripts/ while
  GET /api/admin/fv-suff reads reason_corpus/runs/. Found by a 1-board smoke run before the arms.

Task 3 arm 1 (BASELINE, gpt-5.4-mini, n=5, 25 boards): COMPLETE — verified 125 rows, 25 ids x 5 runs,
  models=[gpt-5.4-mini], 0 parse/call errors, condition D.
  File: server/scripts/reason_corpus/runs/fv_suff_answers_boards_subset_2026-08-11T18-32-47Z.jsonl
Task 3 arm 2 (CAPABILITY, gpt-5.4, n=3): COMPLETE — 75 rows, 25 ids x 3, models=[gpt-5.4], 0 errors.
  File: .../runs/fv_suff_answers_boards_subset_2026-08-11T18-38-17Z.jsonl
Controller note: do NOT combine Bash run_in_background with an inner `nohup ... &` — the wrapper exits
  immediately and the harness reports exit 0 for a process that is still running. Cost me a false
  "silent truncation" read on arm 1.
Task 3 arm 3 (BUDGET, gpt-5.4-mini, "4-6", n=5, 13 A7-deterministic boards): COMPLETE — 65 rows,
  13 ids x 5, models=[gpt-5.4-mini], 0 errors.
  File: .../runs/fv_suff_answers_boards_subset_2026-08-11T18-43-54Z.jsonl
Task 3: mechanical grading done on ALL THREE arms (_mechanical.json beside each answers file).
  KEY RESULTS (pre-fix baseline, recorded in docs/superpowers/plans/2026-08-11-baseline-numbers.md):
   - A6: mini 85/125 (68%) vs gpt-5.4 69/75 (92%) — a 24-pt pure-capability gap. A1/A2 100% on both.
   - A6 by template group on mini: prose 100%, parenthetical 87%, column-ABSENT 43% pooled
     (0/5 mid/late, 15/30 opening) -> Task 4's L5/L6/L9 scope CONFIRMED on the shipped model.
   - BUDGET HYPOTHESIS FALSIFIED (like-for-like, same 13 boards): 2.1 -> 4.1 mean sentences and
     58 -> 103 median words, but A6 66% -> 69% (noise). Room was never the constraint.
Task 3: REMAINING — Step 4 (grade-fv-sufficiency agent passes, judgment axes) + Step 5 (record).
Task 3: run files RENAMED to declarative arm stems (verified still listed by GET /api/admin/fv-suff):
  arm1-baseline-mini-n5 / arm2-capability-gpt5.4-n3 / arm3-budget4-6-mini-n5 (+ _mechanical.json each).
  Manifest: connect-four/server/scripts/reason_corpus/runs/README.md
  State-of-play summary: docs/superpowers/plans/2026-08-11-render-remediation-state-of-play.md
Task 3 Step 4: grading ARM 1 only (25 per-case agents). Arms 2/3 grading deferred pending owner call.
Task 3 Step 4: ARM 1 GRADED (25 cases, 125 runs). grades sidecar written next to the answers file.
  6 passed / 19 failed / 16 intermittent. Triage: render_bug 7, prompt_confusion 11, missing_info 1,
  vector_error 0. Per-axis: A1 100% A2 100% A3 90%(50) A4 86%(50) A5 90% A6 68% A7 76%
  G1 84%(50) G2 86%(50) G3 100%(50) G4 96%(50) G5 92%(50) G6 100%(50) G7 78%.
  A7 subtests: A7b 18, A7c 9, A7a 7, A7d 5.
Task 3: arms 2 and 3 NOT graded — deferred by evidence (see below), not skipped.
PLAN UPDATED from arm-1 evidence: Task 4 keeps its scope + gains the measured 5/5 deterministic
  evidence AND a verified note that requiredSet is NOT a substitute (the required tag can wrap
  "the central column" and A6 still fails). NEW Tasks 9b (never display an unoffered term slug —
  100% vs 82% G7b split), 9c (L4 hold-the-line guardrail, eval-39 5/5), 9d (no book-line vocabulary
  when openingContext.lead is null, eval-11 3/5). Task 6 gains a boards-agreement assertion.
Task 4: complete (commit 2647bf0, controller-verified: exactly 3 template lines changed — L5/L6/L9 by
  their text; L1/L2/L4/L8 still emit "(col N)" and L3/L7 still prose, so the control group is intact;
  all 9 links now satisfy production's mentionsBetterColumn on their pin board; test:fast 1944/0).
Task 5: complete (commit 6180fec, controller-verified: all 30 opening frames in the corpus now emit
  ZERO engine vocabulary (plies/solver/horizon/register) — eval-9 and eval-16, the two measured
  leakers, are clean; eval-21 suppresses the centrality clause AND now carries the prohibition;
  GUARDRAIL constant left untouched for Task 6; test:fast 1947/0).
Task 6: complete (commit e6eaed2 — NOTE: first commit swept docs/open_issues.md (133 lines of owner WIP)
  because the controller's own brief listed it; commit rewritten to its 5 own files, WIP restored to
  uncommitted, and open_issues.md removed from every remaining task's git-add list).
  Controller-verified live-vs-live at 7995a87 -> HEAD: opening mean aliases 2.60 -> 6.63, non-opening
  7.97 -> 7.97 (IDENTICAL, no regression); link.text in prompt 0/30 -> 30/30; every shown board now
  printed 30/30; render_decision zones == prompt zones 30/30 (Step 3b mirror holds); test:fast 1949/0.
  NOTE: the "8.9 non-opening aliases" figure used earlier was from render_decision blocks STORED in the
  2026-08-06 answers file (old code) — not a valid baseline. Compare live-to-live only.
Task 7: complete (commit e5c0c75, closes OI-184). Controller-verified halfOwner in BOTH directions
  (lostResource+denial -> opp; opponentPunishment+denial -> you; winning_line -> unchanged); 37 of 126
  halves flip owner. Agent deviated by also staging mechanismExplainer.test.mjs to relabel a fixture
  opp-key-square -> you-key-square; verified CORRECT (that board's opponentPunishment is kind:denial,
  the window is the mover's own) — the old fixture encoded the bug. test:fast 1950/0.

=== SESSION CLOSE 2026-08-21 ===
Handoff prompt: docs/superpowers/plans/2026-08-11-render-remediation-HANDOFF.md (self-contained).
Remaining: Tasks 8, 9, 9b, 9c, 9d, then 10. Review at 3 CHECKPOINTS (after 8+9; after 9b+9c+9d;
  whole-branch before Task 10) rather than after each task — owner directive.
Closeout artifacts: memory project_test_fast_edit_hazard (new) + feedback_measurement_expires and
  reference_inline_node_scripts (updated); reason-DECISIONS.md D46 (opening merge reversal, with its
  revert trigger) + D47 (owner derives from half kind); OI-187/188/189; deployment_steps entry for the
  explanation_cache purge. MEMORY.md at 22.3KB — compact in the fresh context.

=== SESSION 2026-08-21 (resumed; base e5c0c75) ===
Task 8: complete (commit 0d6f818, controller-verified: code matches the brief verbatim; the
  `${owner}-fork-pivot` handle derives owner from halfOwner() (Task 7/D47) via the geometry loop's
  existing binding, NOT a positional map; all three fork gates now use FORK_TAGS so figure_7 gets
  aliases; deriveRequiredSet's pivot loop sits AFTER the cell loop and BEFORE the line/window slot.
  Commit = exactly its 3 files, owner WIP untouched. test:fast 1952/0 (1950 + 2 new tests).)
Task 9: complete (commit c9d8e06, controller-verified: dropUnoffered returns {text,repairs}; the OLD
  `const repairs = []` was MOVED up, not duplicated — the three `const repairs` in the file are in three
  distinct function scopes (dropUnoffered :304, stripUnclosedTags :343, processAnnotations :361), so
  unoffered_* and unclosed_tag:* land in ONE returned array. test:fast 1955/0.)
CHECKPOINT A (Tasks 8+9, opus reviewer, diff e5c0c75..c9d8e06): Task 8 spec OK, Task 9 spec OK.
  Reviewer independently reproduced over the corpus against the real modules: 20/20 fork halves
  (6 figure_7 + 14 double_threat), pivot offered 18/20, in the required set 20/20, ZERO cases where the
  pivot equals entryCell or a forkCell, and pivot mover matches halfOwner on 20/20.
  1 Important finding -> fix loop (round 1). Deferred minors, for the final whole-branch review:
Task 8: minor (deferred): the pivot is absorbed by the first-offer-wins `seen` dedupe on 2/20 fork
  halves (eval-26 lostResource c5r5, pin-L6 lostResource c1r5), so the geometry is still required but
  under the OTHER alias's role text — OI-182's pedagogical point is lost on ~10% of forks.
Task 8: minor (deferred): forkPivotCell abstains via the forkCells check only; a `line[last].mover`
  check would make the abstention robust rather than emergent (holds 20/20 today, min line length 3).
Task 8: PLAN-MANDATED tradeoff, NOT a defect — the pivot loop evicts the line/window slot on every fork
  record (all forks now reqN=3 with no `windows:` group). This is the brief's explicit
  {fork cells, pivot, line} priority and FR-005 permits zero line slots, but it de facto reverts D45's
  "the line is now required, not merely offered" FOR FORK RECORDS. Flag to the owner at close.
Task 9: note (out of scope, real): grade_mechanical.mjs:47-50 derives G7a/G7b from `row.raw`, NOT from
  annotationRepairs, deliberately ("must behave identically on the pre-fix baseline"). So Task 9's
  stated motivation is not yet wired to a gate — the record is correct and inert until a consumer reads
  it. mechanismExplainer.mjs:63-76 unchanged; no production behaviour change.
Pre-existing (not from this diff): roleText's `major` fallback renders "a single square completing
  you's four-in-a-row line" — ungrammatical text reaching the prompt (pin-L6 you-major).
Task 9c: complete (commit e2b230e, controller-verified: `guardrail` made polymorphic (string OR
  (fv,ctx)=>string) and RESOLVED in classifyCausalLink — extend-don't-add, no sibling field, no new
  link id. L4 alone is a function; the non-lose_to_faster_lose branch returns the ORIGINAL string
  verbatim. Agent grepped every reader of `.guardrail`: only renderReasonModel.mjs, and it reads the
  resolved return value, never CAUSAL_LINKS directly. test:fast 1957/0.)
Task 8: fix round 1/5 dispatched (resumed the original implementer) — Important finding: the
  `fork-pivot` role text hardcodes "matters later", bypassing the loop's isFuture switch, so an
  immediate-register fork half would get a present-board alias carrying a future-tense claim.
Task 8: fix round 1/5 (1 addressed, 0 open; commit d6afe43). Scoped re-review verdict ADDRESSED:
  roleText gains `fork-pivot-now` (same CREATE/makes-both-live clause, "matters later" removed) and
  the push at :223 reuses the loop's EXISTING isFuture binding (:199) — the same variable driving
  `pre` (:200), cellKind/lineKind (:201-202) and truthBoard (:233), so prefix/board/role text cannot
  diverge. New test calls the REAL buildAnnotationOffer on a hand-built immediate-register fork half
  (justified: no corpus record has one) and asserts BOTH directions. Handle name unchanged, so Task 8's
  `.endsWith('-fork-pivot')` assertion still matches. No new breakage. test:fast 1958/0.
Task 8: complete (commits 0d6f818..d6afe43, review clean)
Task 9: complete (commit c9d8e06, review clean)
Task 9b: implemented (commit 81de283) — corpus violations 49/63 -> 0/63; display-side only, zones.terms
  NOT widened. claimeven measured 0 violations so the invariant stayed STRICT (the TAG_PHRASE.claimeven
  == 'claimeven' collision is live but unreached, documented in code).
Task 9b: fix round 1/5 dispatched (controller-found, resumed the implementer). 3 findings:
  (1) IMPORTANT — the `exampleSlug = ... ?? 'the_idea'` fallback REINTRODUCES the defect: on a record
      with zero offered terms the prompt still demos [term:the_idea] 4x, teaching a term tag on exactly
      the records where none is offered. Swaps an invented-real-slug leak for an invented-fake-slug one;
      Task 9 now records it as unoffered_term:the_idea. The 9b test cannot catch it (not in TERM_KB).
      Fix: make the term worked-examples conditional; no-terms records get a zone-based open/close
      example plus an explicit "do not use [term:] tags" line.
  (2) IMPORTANT — example prose vs example slug can contradict: ":531-534 wraps the literal words
      "a double threat" in [term:${exampleSlug}], which may be claimeven/immediate_threat/figure_7.
      Fix: wrap that term's own canonicalPhrase.
  (3) MINOR — OFFERABLE_SLUGS duplicates TERM_KB's keys with a keep-in-sync comment (caused by MY
      concurrency prohibition, now lifted). Export the set from zoneAnnotations.mjs and import it.
Task 9b: fix round 1/5 (3 addressed, 0 open; commit 5e0429b). Controller-verified at source: the term
  worked-examples are now gated on `hasTerms`, with a zone-based open/close example when the record
  offers aliases but no terms and an abstract <handle> form when it offers neither; the no-terms branch
  states plainly that no term tag may be used and the prompt contains NO `[term:` substring at all.
  Example prose now uses the offered term's OWN canonicalPhrase, so tag and words cannot contradict.
  OFFERABLE_TERM_SLUGS is exported from zoneAnnotations.mjs (Object.keys(TERM_KB)) — mirrored literal
  gone. TWO pre-existing tests asserted term-syntax on a no-terms record (i.e. they pinned the bug);
  they were RE-POINTED, not deleted, and the term-syntax coverage is preserved by a new test that
  supplies an offered term. test:fast 1964/0.
Task 9b: minor (deferred, PRE-EXISTING not from this diff): the "Good" adjacency example still
  hardcodes `[zone:opp-fork-lines]`, a handle the record may not offer — the same leak class as the
  term slugs, one level over. Task 9 now records it as unoffered_zone:opp-fork-lines if the model
  copies it. `exampleAlias` is already in scope if this is worth closing. For the checkpoint reviewer.
Task 9b: complete (commits 81de283..5e0429b)
Task 9d: implemented (commit 144bf37, DONE_WITH_CONCERNS) — reading key gated on frame kind: O1/O2
  keep the book-line bullets, O3 gets centrality+parity only. test:fast 1966/0.
Task 9d: fix round 1/5 dispatched. The agent's concern is REAL and controller-verified at source:
  openingFrame.mjs:63's shared GUARDRAIL opens with "Explain the blunder through the opening — book
  line, centrality, parity." and reaches EVERY opening record via mk() at :79 — so on an O3 record the
  guardrail alone still directs the model at the fabrication the task exists to prevent, and gating
  only the reading key leaves the task half-done. CONTROLLER RULING: my "leave openingFrame.mjs alone"
  prohibition was about D46's SUBSTANCE, which is the second sentence (the deep resource "matters
  LATER…"). The book-line enumeration in the first sentence was never what D46 decided. Prohibition
  lifted for that first clause only; the D46 sentence must stay byte-identical, and GUARDRAIL_NO_
  CENTRALITY + the `clause === ''` gate (eval-21) stay intact.
Task 9d: fix round 1/5 (1 addressed, 0 open; commit d722221). Controller-verified: GUARDRAIL split
  into GUARDRAIL_ADMISSIBLE_FRAMINGS_BOOK_LINE / _CENTRALITY_ONLY + GUARDRAIL_DEEP_RESOURCE; mk()
  selects on `kind === 'centrality'`. D46's deep-resource sentence is BYTE-IDENTICAL in both branches.
  GUARDRAIL_NO_CENTRALITY still appends after whichever framing sentence applies (eval-21 gate intact).
  Both pinned assertions passed UNMODIFIED. test:fast 1966/0.
Task 9d: note for the checkpoint reviewer — on an O3 record that ALSO suppresses its centrality clause,
  the guardrail now offers "centrality, parity" as framings while GUARDRAIL_NO_CENTRALITY simultaneously
  forbids centrality comparisons. Milder pre-existing tension (book line was offered there too), not
  introduced by this diff, but it is now the only framing left standing.
Task 9c: complete (commit e2b230e)
Task 9d: complete (commits 144bf37..d722221)
CHECKPOINT B (Tasks 9b+9c+9d, opus reviewer, diff d6afe43..d722221): all three spec OK.
  Reviewer INDEPENDENTLY re-derived 9b's invariant over all 63 corpus records against the production
  modules: 49/63 records / 83 slug instances before -> 0/63 / 0 after. Verified the 23 zero-term records
  contain no `[term:` substring at all and the open/close RULE survives in all three branches; verified
  every `.guardrail` reader goes through classifyCausalLink's resolved value (the two raw-CAUSAL_LINKS
  iterators read only id/covers/when/family/confidence); verified D46's deep-resource sentence is ONE
  distinct string across all 30 opening records, byte-identical to the pre-split concatenation; verified
  the L1/L2/L4/L8 "(col N)" + L3/L7 prose control group is intact and 9c did not touch L4's template;
  verified the two re-pointed 9b tests were TIGHTENED, not loosened, with the lost coverage replaced
  twice (synthetic + real-data eval-7).
  4 Important -> ONE fix dispatch (round 2), see below. Minor 8 DEFERRED, recorded:
Task 9d: minor (deferred): on an O3 record with an empty centrality clause the guardrail now offers
  "centrality, parity" as framings while GUARDRAIL_NO_CENTRALITY forbids centrality comparisons in the
  next sentence (live on eval-11). Pre-existing composition; the centrality-only framing makes it
  visible. Not fixed in this branch.
CHECKPOINT B fix wave (round 2/5, dispatched to the 9b implementer):
  IMP-1: unoffered ZONE handles taught on 44/63 records — `[zone:opp-fork-lines]` hardcoded at :585
    (36 records, inside the hasTerms branch) and `you-key-square`/`you-key-line` at :538-541 (33/28
    records, UNCONDITIONAL). Same mechanism as the term leak, one level over, on the G7a axis the paid
    run grades. Fix: derive from model.zones.aliases + abstract <line-handle>/<square-handle> fallback.
  IMP-2: the redaction is a silent NO-OP for claimeven (TAG_PHRASE.claimeven === 'claimeven'), and
    claimeven is a live tag (reasonEngine.mjs:105,114). Corpus never reaches it, so no test can fail.
  IMP-3: z_threat is displayed unoffered on 5/63 TODAY; no TAG_PHRASE entry, so `?? slug` leaves the
    raw slug in the Tactics lines — violates the global "any raw tag slug" ban.
    TRAP recorded for IMP-2/3: do NOT add a z_threat key to TAG_PHRASE. plainTag() reads it and feeds
    the L1/L2/L3 TEMPLATES, so a new key would change link.text on every z_threat record and corrupt
    the frozen control group. The fix must be a render-layer display-phrase map consulted AFTER
    TAG_PHRASE.
  IMP-4: renderReasonModel.test.mjs:170 `/book line|opening/i` is VACUOUS — it matches every prompt
    because the tag-pairing instruction contains "an opening and a closing tag". Already vacuous before
    9d; 9d only removed the alternative that had been carrying it on O3. After fixing it, NO test
    asserts what an O3 record positively receives (only 3 doesNotMatch) — add a positive one.
  + minors 5 (test mirrors TERM_KB keys instead of importing OFFERABLE_TERM_SLUGS), 6 (pointless
    rename of an imported binding), 7 (`exampleTerm?.slug` optional chaining in a provably-non-null
    branch would render [term:undefined]), 9 (zero-alias branch unexercised, 0/63).
CHECKPOINT B fix wave: commit f05e5d9. Implementer's re-derivation: TERM violations 0/63 (unchanged),
  ZONE handle violations 44 -> 0 records (130 -> 0 instances), z_threat raw leaks 5 -> 0.
  Controller ran `npm run test:fast` INDEPENDENTLY on this commit: 1968 pass / 0 fail.
  Shape: specKind() classifies an alias spec as line (windows:) / column (colN) / square (cNrM) so the
  worked examples pick a REAL offered alias of each shape, with per-slot abstract <line-handle> /
  <square-handle> fallbacks; the adjacency example uses pointersFor(exampleTerm.slug) — a handle tied
  to the demonstrated term's OWN geometry — then any real alias, then an abstract placeholder.
  TAG_PHRASE untouched: findings 2/3 fixed via a render-layer-only RENDER_DISPLAY_PHRASE map consulted
  AFTER TAG_PHRASE (claimeven wording mirrors TERM_KB's description; z_threat wording sourced from
  docs/knowledge-base/community-z-threat.md).
Controller note for the final review: REDACTABLE_TAG_SLUGS mirrors reasonEngine.mjs's TAG_PRIORITY with
  a keep-in-sync comment, because the plan forbids touching reasonEngine.mjs. Also, the list entries
  with NO phrase in either map (forced_win, j_shape, undercut, ...) fall through to the raw slug, so
  adding them is currently a no-op — measured unreachable, but it is inert coverage, not real coverage.
CHECKPOINT B fix wave, scoped re-review: findings 1,3,4,5,6,7,9 ADDRESSED and independently verified
  against the real modules/corpus (0 zone-handle violations, 0 z_threat leaks, specKind routes colN to
  'column' never 'square', causalLinks.mjs diff EMPTY so TAG_PHRASE is untouched).
  Finding 2 NOT ADDRESSED — round 2 REINTRODUCED it: displayPhraseFor is
  `TAG_PHRASE[slug] ?? RENDER_DISPLAY_PHRASE[slug] ?? slug`, and TAG_PHRASE.claimeven === 'claimeven'
  is TRUTHY, so `??` never falls through and RENDER_DISPLAY_PHRASE.claimeven is dead code. Controller
  reproduced: `node -e "console.log('claimeven' ?? 'x')"` prints claimeven.
  LESSON worth keeping: the guard must test "is the canonical phrase DIFFERENT from the slug", not
  "does a canonical phrase exist". `??` only catches null/undefined, never an identity value.
Task 9b: fix round 3/5 dispatched — generic identity-collision fix + a test that must go RED first
  through the PRODUCTION path (a unit test on displayPhraseFor alone would have passed round 2's dead
  branch), plus a full resolution table for every REDACTABLE_TAG_SLUGS entry.
Task 9b: fix round 3/5 (commit 77e8024). displayPhraseFor now prefers a TAG_PHRASE value ONLY when it
  DIFFERS from the slug, then RENDER_DISPLAY_PHRASE, then the slug — generic, not a claimeven special
  case. The implementer confirmed the new production-path test went RED first against round-2 code.
  While building the requested resolution table it surfaced FOUR MORE live identity holes beyond
  claimeven/z_threat: forced_block (eval-32), minor_threat (11 records incl. eval-5/eval-9),
  major_threat_parity (eval-31), major_threat_nonparity (eval-36) — all leaking the bare slug into the
  JSON residue TODAY. Phrases added for all four; the remaining 6 (forced_win, odd_even_threat, j_shape,
  undercut, overcut, forbidden_columns) measured 0 occurrences and were left without an entry rather
  than inventing unverified wording.
  Controller ran test:fast INDEPENDENTLY on this commit: 1969 pass / 0 fail.
CONTROLLER DECISION: round 3's scoped re-review is FOLDED INTO Checkpoint C rather than run separately
  — C runs immediately next on the most capable model over a superset diff, and was dispatched with an
  explicit instruction to verdict finding 2 and to audit round 3's new player-facing wording. Recorded
  so this is a routing decision, not a skipped review.
Task 9b: complete (commits 81de283..77e8024)
--- ALL IMPLEMENTATION TASKS COMPLETE (8, 9, 9b, 9c, 9d). Branch e5c0c75..77e8024 = 10 commits. ---
CHECKPOINT C (whole-branch, opus) dispatched. It is the GATE on the paid Task 10 run.
CHECKPOINT C RESULT (whole-branch, opus): **BLOCKED** on 4 Important findings, 3 of which land on
  boards INSIDE the 25-board measurement subset. Method: re-rendered all 63 corpus records through the
  REAL buildReasonRenderModel + assembleGroundedPrompt at BOTH e5c0c75 (base, via git archive) and
  77e8024 (HEAD) and diffed section by section. Live-to-live, as required.
  WHAT HELD UP (verified, not trusted): 0 unoffered bare slugs across 16 REDACTABLE_TAG_SLUGS x 63
  prompts; 0 unoffered concrete [zone:] handles; frame text and link.text BYTE-IDENTICAL base->head on
  all 63 records (only guardrails on 11 records + Tactics/JSON-residue changed);
  REDACTABLE_TAG_SLUGS == TAG_PRIORITY's 15 slugs element-by-element; grade_mechanical.mjs:25-66 reads
  only answer/feature_vector/render_decision, never a prompt field VALUE, so the residue rewrite cannot
  touch A1/A2/A6/G7.
  RULING A: round-3 displayPhraseFor is correct AND generic (identity test, not a claimeven special
    case); only claimeven is an identity value among TAG_PHRASE's 5 entries; the new test WOULD have
    been red on round 2. Caveat: claimeven is never a board tag (the engine emits only major/immediate/
    double/double_threat/figure_7), so the reachable path for all six new phrases is the JSON residue.
  RULING C: residue rewrite is SAFE for fields_relied_on — paths untouched, only leaf tag/tacticTag/
    basis VALUES change, and the judgment agents grade against the unredacted row.feature_vector.
    Residual: the prompt's residue now diverges from the stored feature_vector, so a future grader that
    diffs "what was shown" vs the stored vector will see noise.
  RULING D: the TAG_PRIORITY mirror is ACCEPTABLE — the mandate is file-scoped, the mirror is exact
    15/15, the comment names the source. Export it in a follow-up branch, not here.
  RULING E: CONTROL GROUP INTACT. TAG_PHRASE untouched; L1/L2/L4/L8 still emit "(col N)"; L3/L7 still
    prose; L5/L6/L9 prose per Task 4; frame + link text byte-identical across all 63.
  RULING F: the cross-task seams DO compose — 15 records are simultaneously opening AND fork;
    composeOpeningFrame's `kind === 'centrality'` is exactly equivalent to "no namedOpening and no
    defense" (openingFrame.mjs:94-110). One exception = finding 3 below.
  RULING G / LEDGER CORRECTION: my earlier entry "the pivot loop evicts the line/window slot on EVERY
    fork record" is FACTUALLY WRONG. Measured: 14 of 18 fork records. eval-11/eval-12/eval-30 KEEP
    their *-key-line, and eval-15/eval-16 GAINED a slot (base had only 2). The D45 tradeoff still
    stands (FR-005 permits zero line slots) but it IS a real confound when comparing G-axis results to
    the pre-fix baseline and must be named in the write-up.
  Deferred minors CONFIRMED as standing: forkPivotCell's emergent abstention; Task 9's repairs inert
    until a consumer reads them; the O3 centrality/GUARDRAIL_NO_CENTRALITY tension; roleText's "you's
    four-in-a-row line" (confirmed PRE-EXISTING — same 20 records at base and at HEAD).
FINAL FIX WAVE dispatched (one agent, opus, all six items):
  IMP-1: the six RENDER_DISPLAY_PHRASE entries assert the PLAYER's perspective but land in WHICHEVER
    half carries the tag — false on eval-21/31/36/38 under opponentPunishment (3 of them in the
    subset). At base these were raw slugs: uninterpretable but not FALSE. Fix: owner-neutral wording.
  IMP-2: roleText's two new fork-pivot branches skip the verb agreement the sibling branches do at :59
    -> "the square you plays to CREATE the fork", 0 records at base -> 13 at HEAD, TWICE each, in the
    block the prompt calls mandatory. 4 subset boards.
  IMP-3: on eval-11/eval-12 the pivot's first-offer-wins dedupe EVICTS opp-key-square and relabels the
    OPPONENT's completingCell as YOUR pivot (eval-11: lostResource.line's last ply c2r4 == oppPunish-
    ment.completingCell c2r4), contradicting link.text in the same prompt. eval-11 is in the subset AND
    is Task 9d's named board, so a failure there would be unattributable between 9d and Task 8.
    Fix: abstain when the pivot equals the other half's completing cell.
  IMP-4: minor_threat's phrase contains "window" — a token the reading key at :336 forbids the model to
    repeat — and drops the KB's "and no opponent disc" (allen-minor-threat.md). 11 records.
  MIN-5: the adjacency example falls back to an unrelated REAL handle (better-col) on 8 records, 2 in
    the subset — not a leak, but a false worked example the model imitates.
  MIN-6: the corpus invariant test loops only OFFERABLE_TERM_SLUGS (4 of 15) — this is the exact blind
    spot that let the claimeven bug survive a whole round. Widen to REDACTABLE_TAG_SLUGS.
FINAL FIX WAVE: commit 3771fba (3 files). Controller ran test:fast INDEPENDENTLY: 1976 pass / 0 fail
  (1969 + 7 new tests); all 7 verified RED first against reverted sources by the implementer.
  F1 six phrases owner-neutral (controller read them: zero second-person tokens). F2 both fork-pivot
  branches conjugate via `owner === 'you' ? 'you play' : 'your opponent plays'`. F3 the pivot abstains
  when its cell is in the OTHER half's {completingCell, cell} — offering 18->16 records, required
  18->16, ONLY eval-11/eval-12 drop and both regain opp-key-square=future:c2r4, so the feature is
  abstaining, not disabled. F4 "window" gone, KB predicate restored. F5 adjacency falls back to the
  abstract <handle>, never an unrelated real handle. F6 the corpus loop now sweeps all 15
  REDACTABLE_TAG_SLUGS (the implementer demonstrated it catching a minor_threat leak the old 4-slug
  loop missed).
  Implementer found a THIRD clashing record the reviewer never named: eval-26.
  Owner's 21 WIP files untouched by every commit in this branch.
Task 10 PRE-FLIGHT (controller): boards_subset.jsonl = 25 rows, frozen ids intact (eval-2, eval-5,
  eval-6, eval-9, eval-11, eval-13, eval-16, eval-20, eval-21, eval-32..eval-41, eval-47, eval-50,
  pin-L2-enabled-opponent, pin-L5-deep-fork, pin-L9-hedged-parity, pin-branch-invariance-true-1/2).
  server/.env confirms OPENAI_MODEL=gpt-5.4-mini (production) and EXPLAIN_MODEL=gpt-5.4 (eval-only).
FINAL FIX WAVE scoped re-review: ALL SIX findings ADDRESSED, independently re-derived — 0 second-person
  tokens in the phrases AND across all 63 prompts; 0 "you plays"/"opponent play " occurrences; pivot
  offered 16/63 and required 16/63 (abstaining, NOT disabled) with eval-11/eval-12 both restoring
  opp-key-square=future:c2r4; 0 banned tokens in any phrase; all 31 records with a real adjacency
  handle use a GENUINE pointer for the demonstrated term (0 mismatches) and 9 correctly fall back to
  the abstract <handle>; the sweep loop now covers all 15 slugs. eval-26's third clash verified as
  correctly abstained (lostResource pivot c5r5 == oppPunishment.completingCell, while
  opponentPunishment's own pivot c5r4 does not clash and is still offered — no cell double-labelled).
  All six phrases checked against the KB (community-z-threat, community-forced-block,
  allen-minor-threat, derived-parity-aligned-threat/allen-major-threat): no misstatements.
  Frozen control group confirmed: `git diff --stat 77e8024..3771fba -- causalLinks.mjs reasonEngine.mjs`
  is EMPTY. No new breakage. VERDICT: safe to proceed with the paid eval run.
=== PHASE C — TASK 10 (paid measurement) BEGINS. Branch HEAD 3771fba. ===
Task 10 Step 1: arm 1 (BASELINE, gpt-5.4-mini, n=5, 25 boards) launched with an EXPLICIT --model.
Task 10 Step 1: ARM 1 COMPLETE (post-fix baseline). 125 ok / 0 failed. Verified 125 rows, 25 ids x 5
  runs, models=[gpt-5.4-mini], condition D, 0 parse/call errors.
  File: server/scripts/reason_corpus/runs/fv_suff_answers_boards_subset_2026-08-21T21-19-32Z.jsonl
Task 10 Step 1: arm 2 (CAPABILITY, gpt-5.4, n=3) launched with an explicit --model.
Task 10 Step 2: MECHANICAL grading of arm 1 done. Headline, BEFORE -> AFTER (arm1 pre-fix vs post-fix,
  same 25 frozen boards, same model, same n):
   A1 100% -> 100%   A2 100% -> 100%   G7a 100% -> 100%
   G7b  109/125 (87%) -> 123/125 (98%)   [mid/late 92%->100%, opening 82%->97%]  <- Task 9b CONFIRMED
   A6   85/125 (68%) -> 95/125 (76%)     [mid/late 83%->80%, opening 52%->72%]
  A6 BY TEMPLATE GROUP (the falsifiable prediction; link ids derived live via classifyCausalLink):
   TREATED L5/L6/L9 mid/late (pin-L5-deep-fork only): 0/5 -> 2/5 pass
   TREATED L5/L6/L9 opening (eval-9/11/16/20/35, pin-L9): 15/30 -> 17/30 pass
   TREATED pooled: 15/35 (43%) -> 19/35 (54%) pass. The plan predicted per-run FAILURE "~58% -> near
     zero"; actual 57% -> 46%. IMPROVED BUT PREDICTION NOT MET.
   CONTROL L1/L2/L4/L8 mid/late: 39/45 (87%) -> 35/45 (78%) pass. The plan says this stratum MUST stay
     flat at ~9% fail or "the attribution is broken". It moved 13% -> 22% fail (4 runs of 45, ~1.7 sd).
     Read as noise-or-worse, NOT as support for the naming hypothesis.
   L3/L7 prose mid/late: 15/15 -> 15/15 (flat, both 100%).
   L3/L7 prose opening: 16/25 (64%) -> 22/25 (88%) pass.
  CONTROLLER READ (pre-judgment-axes): G7b is a clean, large, predicted win. A6's headline +8pts is
  driven by the OPENING stratum, which the plan itself declares CONFOUNDED (Task 4 + Task 6 land in the
  same pass) and says MUST NOT be read as evidence for the salience hypothesis. On the stratum the
  prediction was actually scoped to, the movement is small and the control group drifted the wrong way.
Task 10 Step 2: judgment-axis grading of arm 1 dispatched — 25 per-case sub-agents (wave of 20 + 5),
  one case each, each writing its OWN part file; controller concatenates. Instructions written once to
  scratchpad/GRADER_INSTRUCTIONS.md. Deviation from the skill, deliberate: agents READ their own rows
  from _mechanical.json rather than having them pasted into the dispatch — same data, no transcription
  risk. Agents told explicitly this is a PRODUCTION-FIDELITY run (gpt-5.4-mini), so prompt_confusion
  cannot be separated from model capability.
Task 10 Step 1: ARM 2 COMPLETE (post-fix capability). 75 ok / 0 failed; verified 75 rows, 25 ids x 3,
  models=[gpt-5.4], 0 errors.
  File: server/scripts/reason_corpus/runs/fv_suff_answers_boards_subset_2026-08-21T21-25-35Z.jsonl
  Mechanical: A1 100%, A2 100%, A6 67/75 (89%), G7a 100%, G7b 73/75 (97%).
  CAPABILITY GAP ON A6 NARROWED: pre-fix mini 68% vs gpt-5.4 92% = 24 pts. Post-fix mini 76% vs
  gpt-5.4 89% = 13 pts. The shipped model closed roughly half the gap; the full model's own 92->89
  (2 runs of 75) is within noise. This is the arm whose grading was deferred pending exactly this
  question ("is the residual gap worth engineering against, or ship a stronger model for deep
  reveals?") — the gap is now materially smaller, which weakens the ship-a-stronger-model case.
DO NOT RENAME the two post-fix run files to declarative stems until the 25 grading sub-agents finish —
  they are reading the current paths, and gradesFilenameFor derives the grades/mechanical filenames
  from the answers stem.
Task 10 grading TRAP (controller, new): grading sub-agents write SCRATCH files into the parts dir
  (eval-50-D-prompt.txt, row_71.json, ...), even though the skill says nothing else writes there.
  Concatenate by the EXACT expected part filenames per dispatched id — never by globbing the directory,
  or the scratch files corrupt the JSONL.
Task 10 grading, early signal: eval-36 (an L8 CONTROL board, parenthetical form) fails A6 on 5/5 runs
  DETERMINISTICALLY — the assembled prompt literally says "the better move (col 3)" and no run's
  mechanism ever names column 3. This localizes the control-group A6 drift (13%->22% fail) to a
  specific board rather than leaving it as diffuse noise, and it is direct evidence for the plan's OWN
  alternative hypothesis: the parenthetical "(col N)" template form is weaker than prose even though
  Task 4 deliberately left L1/L2/L4/L8 untouched as controls. Task 4's premise was that the
  column-ABSENT templates were the problem; eval-36 says the parenthetical form has its own failure.
Task 10 grading, NEW RENDER DEFECT (eval-9, model-INDEPENDENT so it survives a change of model):
  render_decision.zones.aliases offers `you-key-square` (spec future:c6r5) and `you-key-square-2`
  (spec future:c3r5) with BYTE-IDENTICAL role text and no cell hint, so no model can deterministically
  bind handle -> cell. Runs 1 and 3 SWAPPED the bindings (G7/A7b fail, the on-board highlight
  mis-locates the named square); run 0 dropped all three required handles. Runs 2/4 bound correctly.
  This is a render-layer fix for the NEXT round (disambiguate sibling aliases' role text), not
  something this branch introduced. Candidate OI entry.
Task 10 grading, TASK 9 VALIDATED IN THE WILD: eval-13 run 4 emitted an unoffered
  `[term:central-column opening]`, and it now appears in `annotationRepairs` -> G7c auto-fail fired.
  Pre-Task-9 that tag was stripped with NO record and the grader's auto-fail could never fire. The
  defect class is now observable downstream, which was the whole point of the task.
Task 10 grading, SECOND LATENT RENDER DEFECT (eval-21, found by the grader, unused by those 5 runs so
  not scored against them): the offered `opp-key-line` alias declares truthBoard "projectedDeep", but
  its window (c4r3,c5r3,c6r3,c7r3) is NOT a completed line on that board — it completes only on
  opponentPunishment.finalMovestring, a DIFFERENT continuation. The projectedDeep board actually shown
  is built from lostResource.finalMovestring (reasonBoardSelect.mjs), not the top-level
  render_decision.finalMovestring. A G5-class defect (offered alias board-false on its own truthBoard).
  Candidate OI entry for the next round; not introduced by this branch.
Task 10 grading, TASK 8 WORKING AS DESIGNED (eval-20): the fork pivot IS now offered AND required
  (you-fork-pivot / c5r4); 4 of 5 runs use it, run 0 drops it -> A7c fails on that run only. This is
  precisely the plan's predicted shift from "impossible to comply" to "intermittent compliance", where
  the next lever is ENFORCEMENT, not offering.
Task 10 grading, THE HEADLINE NEW DEFECT (eval-5 generalizes eval-21; SYSTEMATIC, model-INDEPENDENT):
  reasonBoardSelect.mjs's `deepHalf` picker ALWAYS prefers lostResource's finalMovestring when building
  the SHARED `projectedDeep` board. So any opponentPunishment-owned alias carrying
  truthBoard:"projectedDeep" is BOARD-FALSE — it is verified against a continuation that is not the one
  it belongs to. Verified on eval-5: c2r3 is filled by YOU on the rendered projectedDeep board even
  though it truly belongs to the OPPONENT on opponentPunishment's own finalMovestring.
  Downstream symptom on the same board: runs 0/2 mislabel the key squares as c6r6/c6r5 — numbers lifted
  verbatim from that board's unrelated Tactics list instead of the real completingCells c6r4/c2r3.
  This is one root cause behind several G5/G7/A7b failures across the corpus. It is NOT introduced by
  this branch and is the strongest candidate for the next round's first fix. Candidate OI entry.
Task 10 grading, TASK 9d VALIDATED (eval-11, its named target board): pre-fix, 3/5 runs fabricated
  specific book-line adherence the record cannot support (A4/A7b). Post-fix the grader reports NO
  book-line fabrication on any run — A3/A4 pass on the sub-sampled runs and A6 passes 5/5. The two
  residual failures are a raw-coordinate leak (run 2, A5) and one unlocated referent (run 1, A7b),
  neither of which is the book-line defect. eval-11 is also the board Checkpoint C's finding 3 was
  about, so both fixes on it held.
Task 10 grading, RECURRING MODEL-SIDE FAILURE (eval-37 5/5 deterministic, eval-11 run 2, eval-38 runs
  0/2): raw internal cell notation ("c1r4", "c4r1,c3r2,c2r3,c1r4") leaks into player-facing prose even
  AFTER zone-tag stripping, despite the reading key explicitly saying cNrM is internal-only and "Never
  write a raw square". Info present and unambiguous => instruction-following, not a render gap. NOTE
  the production-fidelity caveat: this run IS the shipped model, so prompt_confusion here cannot be
  separated from model capability. A5-visible; A6 is unaffected because production's guard rewrites a
  bare cNrM into "column N" before serving.
Task 10 grading, THIRD RENDER DEFECT (eval-33, 5/5 deterministic, model-INDEPENDENT) — and it UPGRADES
  a minor this session deferred at Checkpoint A. The REQUIRED handle opp-key-line (windows
  c4r6-c5r6-c6r6-c7r6) carries role text "not a threat right now", but buildAnnotationOffer's
  FIRST-OFFER-WINS dedupe lets lostResource's forced_sequence framing claim that window before
  opponentPunishment (register=immediate, tag=immediate_threat) can offer it PRESENT-tense. The
  identical window is tagged "immediate at c5r6" on the shown afterPlayed board (verified with
  visualize_board.sh on finalMovestring 33333111155545355220244122462616660064).
  ALL 5 RUNS read the board correctly and described the line as present/immediate — i.e. the MODEL was
  right and the RENDER was wrong. Triage render_bug, not prompt_confusion.
  CONNECTION: Checkpoint A logged "the pivot is absorbed by the first-offer-wins `seen` dedupe on 2/20
  fork halves" as a deferred MINOR. eval-33 shows the same dedupe can attach the WRONG HORIZON FRAMING
  to a shared geometry on a REQUIRED handle, which is not minor. First-offer-wins needs to become
  horizon-aware (or owner-aware) in the next round. Candidate OI entry.
Task 10 grading, TASK 8 COVERAGE GAP — HONEST LIMIT, diagnosed at source by the controller (eval-47,
  A7c fails 5/5). Task 8's forkPivotCell requires half.tacticTag in {double_threat, figure_7} AND
  half.forkCells. On eval-47 NEITHER half carries a tacticTag or forkCells at all (both undefined) —
  the fork is represented as BOARD TAGS instead (offered as `you-double=windows:c3r6,c6r5,c7r2` and
  `you-double-2=windows:c5r4,c7r4`). So forkPivotCell returns null on the tag check, BEFORE this
  session's abstain-on-the-other-half's-cell fix is ever reached. Confirmed NOT a regression from that
  fix; it is a coverage gap in Task 8's derivation.
  Consequence for the write-up: "20/20 fork halves get a pivot" is true ONLY for the tagged-half
  definition of a fork. Boards whose fork lives in the board tags are still uncovered, and A7c still
  fails deterministically there. Do not report Task 8 as closing A7c generally.
Task 10 grading, FOURTH RENDER DEFECT (eval-47, G5): the DECISION-board Tactics line says
  "double_threat at c3r6", but visualize_board.sh shows c3r6 is only a MINOR (2/4) threat pre-move and
  becomes major/double only AFTER the best move is played — the threat list is describing a different
  board than the one it is attached to. Candidate OI entry.
Task 10 grading, TASK 9c VALIDATED (eval-39, its named target board): pre-fix the L4 route carried NO
  hold-the-line reframe and the board failed 5/5 DETERMINISTICALLY. Post-fix 4/5 runs carry the reframe;
  run 4 garbles it (misattributes "the toughest defense" to the opponent). Deterministic -> flaky,
  which the plan explicitly defines as SUCCESS with enforcement as the next lever.
Task 10 grading, EVIDENCE AGAINST THE NAMING HYPOTHESIS on central/opening boards (both L9, both
  TREATED by Task 4): pin-L9-hedged-parity A6 fails 5/5 and eval-35 A6 fails 4/5 — in BOTH the prompt
  states "Better move: column 4" verbatim and the model paraphrases it as "the central move" /
  "central book move" rather than naming the digit. Task 4's premise was that the column-ABSENT
  templates were the blocker; these two boards show that naming the column IN the template does not
  make the model reproduce it when a "central" paraphrase is available. Combined with eval-36 (an L8
  CONTROL board failing A6 5/5 on the parenthetical form), the A6 story is NOT "prose beats
  parenthetical" — it is that a paraphrase-friendly board defeats both forms.
Task 10 grading, *** A DEFECT THIS BRANCH INTRODUCED, caught by the measurement *** (pin-L5-deep-fork,
  3/5 runs, a SUBSET board). Controller confirmed at source (zoneAnnotations.mjs:65 vs :71):
    future-fork role  = "...it matters later, once the forced sequence reaches it, NOT RIGHT NOW"
    fork-pivot role   = "...it matters later, once the forced sequence reaches it"   <-- no contrast
  Task 8's pivot role text omits the explicit "not right now" disclaimer its sibling carries, so 3/5
  runs CONFLATE the deep (28-ply, unreachable this turn) fork-creating cell c7r6 with the actual
  immediate best move (column 1). Secondary on the same board: runs 0/4 mislabel opponentPunishment's
  denial cell c6r5 as completing the PLAYER's own line, contradicting the rendered L5 text.
  This is the exact failure class D46 names as its REVERT TRIGGER ("if a post-fix grading run shows
  deep cells narrated as present threats"). The fix is one clause — append ", not right now" to the
  fork-pivot role — but the recorded subset numbers were produced by 3771fba, BEFORE any such fix, so
  applying it invalidates like-for-like comparison and a clean re-read costs another paid arm-1 run.
  DECISION DEFERRED TO THE OWNER; do not silently patch and leave the numbers stale, and do not leave
  the defect unrecorded. Candidate OI entry either way.
Task 10 CONTROL REGRESSION + CODE-LEVEL BISECT (no paid re-run needed). The plan requires bisecting any
  regression among the passing controls. BEFORE 6 passed (eval-32/34/37/41, pin-bi1, pin-bi2); AFTER 5
  pass — eval-37 REGRESSED, now failing A5 on 5/5 runs by leaking a raw coordinate list
  ("c4r1, c3r2, c2r3, c1r4") into player-facing prose. No case newly passes.
  BISECT METHOD: rendered eval-37's assembled prompt at e5c0c75 (throwaway git worktree + symlinked
  node_modules, corpus read from the main worktree) and at HEAD, and diffed. Result: the ONLY changes
  are Task 9b's worked-example substitutions. "Never write a raw square" is byte-identical in both, and
  the exemplar coordinate "on c2" is present in BOTH — so no instruction was lost.
  HYPOTHESIS (stated as such, not a finding): this session's Checkpoint-B finding-2 fix made the worked
  example wrap the term's canonicalPhrase as its words, turning
    before: [term:immediate_threat]the threat you need to keep alive[/term:immediate_threat]
    after:  [term:double_threat]double threat (two winning squares at once)[/term:double_threat]
  The "after" exemplar is ungrammatical in its own sentence ("you handed him double threat (two winning
  squares at once)") and models an inline technical parenthetical inside coach prose. eval-37 fails by
  dumping an inline technical coordinate list. Models imitate exemplars, so there is a plausible causal
  path from that fix to an A5 prose regression. A 5/5 -> 0/5 flip is too clean to read as sampling
  noise. CONFIRMING IT needs one targeted re-run; NOT done, cost is the owner's call.
  If confirmed, the fix is to keep the canonicalPhrase BINDING (which removed a real false pairing) but
  restore natural exemplar prose — e.g. wrap natural words and put the canonical phrase adjacent, so
  the example is both correctly paired AND grammatical.
Task 10 Steps 2/3/5: COMPLETE. 25/25 cases graded, grades sidecar written
  (fv_suff_answers_boards_subset_2026-08-21T21-19-32Z_grades.jsonl, 25 lines, 0 sub-agent errors).
  Cases 6->5 pass, intermittent 16->14. Triage: prompt_confusion 14, render_bug 6, missing_info 0,
  vector_error 0 (ZERO reason-engine failures again).
  Per-run: A3 90->92, A4 86->87, A5 90->93, A6 68->76, A7 76->83 (A7a 7->3, A7b 18->13, A7c 9->6,
  A7d 5->1), G2 86->91, G4 96->91, G5 92->91, G7 78->71. G1/G3/G6 NOT comparable (50 vs 125 runs
  graded — different sub-sampling between the two grading passes; do not quote those three as a delta).
  G7's decline is only ~2 runs of instrumentation artifact (annotationRepairs 0 -> 2 runs, both
  unoffered_term, now tripping G7c); the rest is real mis-bound/dropped required handles, and the offer
  set GREW (Task 6 + Task 8), so there is more to bind and more to drop.
  Report: runs/..._grade_report.md. Numbers: docs/superpowers/plans/2026-08-11-baseline-numbers.md.
  D-log: D48 added. Committed as 4319b2e — staged EXACTLY the intended paths; docs/open_issues.md was
  NOT staged (the plan's own Step 5 says `git add docs/`, which would have swept 20 files of owner WIP
  — do not follow that instruction literally).
Task 10 Step 4 (full-corpus 63-board sweep): DELIBERATELY NOT RUN. The plan gates it on "the subset
  shows the predicted movement". It partly does not, AND the subset surfaced a defect this branch
  introduced (pin-L5-deep-fork role text) plus a control regression (eval-37). Sweeping 63 boards
  before those are resolved would spend money measuring known-defective code. Owner's call.
=== TASK 10 COMPLETE except Step 4. ALL PLAN TASKS DONE. ===

=== OWNER DECISIONS 2026-08-23 (AskUserQuestion) ===
1. pin-L5 fork-pivot defect: FIX THE CLAUSE AND RE-RUN ARM 1 (numbers must match shipped code).
2. Task 10 Step 4 full-corpus sweep: DEFER until the fixes land.
3. eval-37 exemplar prose: FIX IT, folded into the same re-run (no separate confirmation probe).
4. The four render defects: owner told me to commit their open_issues.md WIP, then file.
DONE for (4): committed the owner's OI-183..OI-189 WIP as aaf25da (its own commit, attributed to them),
  then filed OI-190..OI-193 as 76e652d. NOTE: my eval-47 "decision-board Tactics list is board-false"
  finding was ALREADY covered by the owner's OI-188, so it was not re-filed — only 3 genuinely new
  defects plus the OI-182 coverage limit (OI-193) were added.
Post-measure fix dispatched (both fixes in one agent, red-first tests required):
  FIX 1 zoneAnnotations.mjs roleText 'fork-pivot' gains the "not right now" contrast its three sibling
    future-kinds all carry. 'fork-pivot-now' deliberately left alone (immediate register, no "later").
  FIX 2 renderReasonModel.mjs adjacency worked example: KEEP the canonicalPhrase binding (it removed a
    real false pairing — a hardcoded "a double threat" wrapped in [term:claimeven]) but make the
    sentence grammatical, so the exemplar stops modelling an inline technical parenthetical.
Post-measure fixes COMPLETE (commit 2ef3ccb). Controller-verified at source; test:fast 1979/0
  (1976 + 3 new tests, all confirmed RED first by the implementer); owner's 19 WIP files untouched.
  FIX 1 final: `...it matters later, once the forced sequence reaches it — it is NOT the move to play
    right now`. 'fork-pivot-now' correctly left alone.
  FIX 2 final: the adjacency example derives a natural noun phrase FROM the term's own canonicalPhrase
    (strips a trailing parenthetical gloss, adds a/an) instead of hardcoding one — so
    "you handed him [term:double_threat]a double threat[/term:double_threat] on [zone:...]where it
    lives[/zone:...]". The tag/word DENOTATION stays honest (that binding exists because a hardcoded
    "a double threat" was once wrapped in [term:claimeven]); only the grammar is repaired.
Task 10 RE-RUN: arm 1 relaunched on the fixed code (3771fba -> 2ef3ccb) with an explicit
  --model gpt-5.4-mini, same frozen 25-board subset, same --n 5, condition D. The 2026-08-21T21-19-32Z
  numbers now describe SUPERSEDED code and must be relabelled as such once the re-run is graded.
Task 10 RE-RUN COMPLETE (post-fix code 2ef3ccb): 125 rows, 25 ids x 5, models=[gpt-5.4-mini], 0 errors,
  3 runs with non-empty annotationRepairs. File: runs/fv_suff_answers_boards_subset_2026-08-23T15-16-19Z.jsonl
  MECHANICAL, three-way (pre-fix 08-11 | post-fix-v1 08-21 | post-fix-v2 08-23):
   A6 ALL              68% | 76% | 84%
   A6 mid/late         83% | 80% | 86%
   A6 opening          52% | 72% | 82%
   A6 TREATED L5/L6/L9 43% | 54% | 74%
   A6 CONTROL (all)    78% | 78% | 82%
   A6 L3/L7 prose      78% | 93% | 95%
   G7b ALL             87% | 98% | 98%
  *** METHODOLOGICAL CORRECTION TO MY OWN EARLIER READ ***
  1. The "control group moved the wrong way (87%->78%)" claim I made after the 08-21 run was computed on
     the MID/LATE-RESTRICTED control slice (45 runs). On the full control slice (all 10 L1/L2/L4/L8
     boards, 50 runs) the control is 78% | 78% | 82% — FLAT between pre-fix and 08-21. Both numbers are
     real; they are different slices. Report the slice with the number, always.
  2. Per-board A6 at n=5 is VERY noisy. Between 08-21 and 08-23 — two runs whose ONLY code difference is
     two wording changes — pin-L9-hedged-parity went 0/5 -> 4/5 and eval-35 went 1/5 -> 4/5. Swings of
     that size mean single-run per-board A6 deltas cannot support attribution, and my earlier
     board-level conclusions (incl. "the control drifted") were over-read from one sample.
  3. What survives all three runs: A6 rises monotonically 68 -> 76 -> 84, the TREATED group rises
     43 -> 54 -> 74, and G7b jumps 87 -> 98 and HOLDS. Those are the defensible findings.
  4. NOTE the 08-23 gain came from two changes made AFTER the plan's tasks — the fork-pivot horizon
     clause and the worked-example prose. An exemplar-quality change moving A6 by 8 points is itself a
     finding, and it cuts against the earlier memory that prompt WORDING is inert (only the required set
     moved it). Worth a memory update if it replicates.
Task 10 regrade of the 08-23 run dispatched (25 per-case agents against GRADER_INSTRUCTIONS2.md, new
  parts dir fv-suff-parts2). Two dispatch failures to retry: eval-13 (agent died — "computer went to
  sleep mid-response") and eval-47 (classifier rate-limited). eval-13 relaunched.
Task 10 regrade, per-board signals landing so far (08-23 run vs the 08-21 run):
  eval-20: A7c now PASSES on ALL 5 runs — the fork pivot is named. Task 8's headline axis confirmed on
    a fork board post-fix. The case still fails only on G7, because runs 0/3 invented an unoffered
    [term:central-column opening] — visible ONLY because of Task 9's repair recording.
  eval-50: fail -> PASS.
  eval-38: the raw-coordinate A5 leak (runs 0/2 at 08-21) is GONE; only A6 paraphrase remains.
  eval-36: A6 5/5 deterministic fail -> 3/5 intermittent.
  eval-9 / eval-6 / eval-2: still failing, but now on DROPPED or MIS-BOUND required handles rather than
    on anything this branch changed — the recurring theme is enforcement, not offering.
  *** eval-37 (the regressed CONTROL, and the board the exemplar hypothesis was built on): the A5
    raw-coordinate leak that failed it 5/5 at 08-21 is GONE at 08-23. Now 4/5 pass; run 4 fails only by
    dropping the required opp-major-line handle. This is the direction the hypothesis predicted, and it
    is the closest thing to a confirmation available without a dedicated A/B — but it is ONE run, and
    the fork-pivot clause landed in the same commit, so it remains a strong hypothesis, NOT a proof.
    Do not write it up as established causation.
  REPRODUCIBILITY CHECK across the two independent runs (this is what separates real defects from the
  n=5 noise): eval-33 reproduced IDENTICALLY (5/5, render_bug, the OI-192 first-offer-wins horizon
  contradiction) and eval-39 reproduced its failure on the SAME run index 4 (garbled hold-the-line
  reframe). Both are therefore stable defects, not sampling artifacts. By contrast the A6 per-board
  results moved wildly between the two runs — so treat DETERMINISTIC failures as findings and
  INTERMITTENT per-board A6 deltas as noise until replicated.
  OI-190 CONFIRMED ON A THIRD BOARD (eval-11, 08-23 regrade, DETERMINISTIC across all runs): the
  REQUIRED opp-key-square is declared truthBoard:'projectedDeep', but that board is always built from
  lostResource.finalMovestring when BOTH halves are deep — so c2r4 is occupied by the mover's own disc
  there, and the required handle is bound to a board-false claim on every run (A4/G4 fail).
  OI-190 now has eval-5, eval-21 and eval-11 behind it, one of them deterministic. It is the strongest
  next-round fix and the entry should be updated to note "when both halves are deep" as the trigger.
  eval-32 FLIPPED pass (08-11 AND 08-21) -> fail 5/5 (08-23), attributed render_bug: causalLinks.mjs's
    L4 TEMPLATE embeds raw cNrM notation (c6r2, and the window c7r1/c6r2/c5r3/c4r4) into the frame text
    shown to the model, contradicting the prompt's own "Never write a raw square" rule; all 5 runs echo
    it. CONTROLLER CHECK: L4's template is UNCHANGED by this branch (Checkpoint C verified link.text
    byte-identical base->head on all 63 records, and the causalLinks diff is the guardrail + the
    resolver line only). So this is a PRE-EXISTING template defect, and eval-32's flip is model and/or
    GRADER variance on it, NOT a regression this branch caused. Two graders reading the same
    pre-existing text reached opposite verdicts — record that as grader variance, not as a code change.
    NEW candidate OI: causal-link templates embed raw cNrM into text the prompt then forbids the model
    to write. L1/L4/L8 all interpolate completingCell/window cells.
  eval-47 (the OI-193 uncovered fork): 4/5 runs conflate the played blunder cell c3r6 with the fork's
    finishing square, and runs 3/4 RECOMMEND PLAYING COLUMN 3 — the exact column the player just
    blundered. Severe content failure on the board whose fork carries no pivot handle. Strengthens
    OI-193's priority.
  *** pin-L5-deep-fork — THE FIX LANDED, and the evidence is the TRIAGE SHIFT, not the pass/fail:
    08-21: triage render_bug — "you-fork-pivot role text OMITS the 'not a threat right now' disclaimer
      its siblings carry; runs 1,2,4 consequently bind it to present-tense/immediate phrasing".
    08-23: triage prompt_confusion — the handle "was mishandled in 3/5 runs DESPITE BEING UNAMBIGUOUSLY
      SPECIFIED IN THE PROMPT".
    i.e. the render no longer invites the conflation; what remains is model compliance. D46's revert
    trigger is DEFUSED — the deep cell is no longer narrated as a present move BECAUSE OF the role
    text. The case still fails (dropped/mis-bound handle on 3/5), which is the same enforcement gap
    seen everywhere else. Do NOT report this as "pin-L5 now passes" — it does not.

=== FINAL RE-MEASURE COMPLETE (08-23, code 2ef3ccb) — SUPERSEDES the 08-21 numbers ===
All 25 cases regraded. 5 pass, 15 intermittent. Triage: prompt_confusion 15, render_bug 5,
  missing_info 0, vector_error 0.
Per-run axes (pre-fix | 08-21 | FINAL):
  A3 90|92|98   A4 86|87|81   A5 90|93|94   A6 68|76|84   A7 76|83|81
  G2 86|91|91   G4 96|91|89   G5 92|91|96   G7 78|71|66   G7b(mech) 87|98|98
  cases 6|5|5   render_bug 7|6|5   prompt_confusion 11|14|15   vector_error 0|0|0
  A7c run-failures 9|6|4
THE HONEST HEADLINE: the branch removed RENDER defects and shifted the residual to MODEL COMPLIANCE.
  G7's 78->66 decline is REAL, not an artifact (only 3 runs carry annotationRepairs): Tasks 6 and 8
  GREW the offered/required set, so there are strictly more handles to bind, and the model drops or
  mis-binds them. Every G7 failure now reads "required handle omitted / wrapped around the wrong cell",
  never "handle not offered". ENFORCEMENT is the next lever, not offering. That is the finding.
Filed from this measurement: OI-190..OI-196 (7 entries). OI-196 (the required-handle block drops the
  "(on the ... board)" disambiguator that renderReasonModel.mjs:564 carries but :600 omits — verified at
  source, one-line fix, drives eval-47's 4/5 conflation) and OI-190 (projectedDeep built from one half's
  line, deterministic on eval-11) are the highest-value next fixes and both drive the G7 decline.
Commits this session: 0d6f818 c9d8e06 e2b230e d6afe43 81de283 5e0429b f05e5d9 77e8024 3771fba (code)
  + 2ef3ccb (post-measure fixes) + 4319b2e aaf25da 76e652d 799b576 a658dd2 4b9e78d (docs/results).
  test:fast 1979/0. Owner's 19 WIP files untouched throughout.
REMAINING: Task 10 Step 4 (63-board sweep) is now UNBLOCKED — the fixes are in and the subset shows the
  predicted movement on A6 and A7c. Owner deferred it pending exactly this.
