# Quickstart: Verifying Epic 2 (Detector Perspective Soundness & Blunder Tag Taxonomy)

This is an internal-correctness/content-migration epic — there is no new UI flow to click through.
"Quickstart" here means: how to verify each story's fix directly against the production code, per
`CLAUDE.md`'s "Verifying any claim about this codebase" rule (real output, not a fixture you authored).

## Prerequisites

```bash
cd connect-four
eval "$(../worktree-ports.sh)"   # ports, even though no server is required for most checks below
npm run test:fast                # baseline green before starting any story
```

## US1 — `detectOvercut` perspective fix

1. Characterize current (pre-fix) behavior — from `connect-four/`:
   ```bash
   node -e "
   import('./server/classifier.js').then(({ Board, detectOvercut }) => {
     // Use a harvested movestring exhibiting the structural overcut pattern —
     // e.g. one of community-overcut.md's worked examples, NOT a hand-built string.
     const ms = '26533454144531123345224155';
     const b = new Board(ms);
     // scores must come from the real solver in practice; for a quick smoke check use
     // server/c4solver-wrapper.js's createSolverProcess().query(ms).
   });
   "
   ```
2. After the split, re-run `tests/integration/undercut_overcut.test.js` and
   `tests/classifier/classifier.test.js` and confirm `detectOvercutVictim`/`detectOvercutBeneficiary`
   are both exported and neither accepts a third argument.
3. Fix the `classifyPattern` call site (`classifier.js:1784`) to call **`detectOvercutVictim(board,
   scores)`**, not Beneficiary — verified: Phase C (`classifier.js:1929`) calls `classifyPattern` on
   `moves + correctCol`, a board where the side to move is the opponent, not the blunderer; Victim is
   the role-correct call, mirroring `classifyPattern`'s existing `'undercut'` entry. Add a **Phase-C-level
   regression** (constructs a real blunder board, runs the full `tagBlunder` pipeline, asserts the tagged
   cells belong to the blunderer) — a bare `detectOvercutVictim` unit test does not catch a correct
   function wired to the wrong call site.
4. Harvest a sixth counterexample board (via `gameSampling.js`'s `playGame`) exercising
   `detectOvercutVictim`'s losing-mover predicate specifically (mover's threat legitimately dead,
   `scores[C] < 0`) — the epic's five mandated counterexamples are all Beneficiary-shaped and do not
   cover this function (contracts C1).
5. **Only after step 3 is complete**, re-run the fixture generator and diff:
   ```bash
   node server/scripts/generate_tagblunder_fixtures.mjs
   git diff tests/blunder/fixtures/tagBlunderFixtures.json
   ```
   Every `overcut`-tagged row in the diff (new or changed) must be read and approved by a human before
   committing (FR-005) — do not accept a bulk regeneration. Do not run this step against an
   intermediate state that still calls Beneficiary at the `classifyPattern` call site — the corpus
   would reflect the wrong-player tag and the human review would be approving mislabeled data.
6. Re-measure the active `overcut` puzzle/candidate pool count (FR-006):
   ```bash
   # from connect-four/server, per memory reference_supabase_connection.md conventions
   node -e "/* count public.candidates/public.puzzles rows WHERE category='overcut' AND is_active=true, local first, then staging/production if reachable */"
   ```
   If staging/production is unreachable, record that explicitly — do not assume zero.

## US2 — Active-forcing branch + label decision

1. Confirm the `reason-DECISIONS.md` entry for the `active_forcing`/`t5_row3_row6` rename exists
   *before* `classifier.js:1052` is touched (FR-008).
2. Run each of the 5 sub-case counterexamples through the **production** detector (I12) — the 4
   already-worked KB examples plus the newly-added minor-threat case (Decision D2). The minor-threat
   branch's match condition is: current player has a major threat at R **and** the opponent has a
   minor threat strictly below R in the column — no "or none" clause; an opponent-threat-free column
   below R is NOT a match under this branch.
   ```bash
   ./visualize_board.sh 26533454144531123345224155   # T4 same-parity
   ./visualize_board.sh 2365213030023306446354465055546   # active-forcing
   ./visualize_board.sh 32640344326334662063620   # chain-T2
   # T5 rows-3/6 and minor-threat counterexamples: harvest via gameSampling.js's playGame,
   # do not hand-construct (per CLAUDE.md movestring rule).
   ```
3. Confirm the two documented false positives still correctly fail to match:
   `331324244556605142` (T2 legitimately fires) and `10231405030112342031435` (mutual `[*]` threat —
   active-forcing must not backfire).
4. **Before tasking the minor-threat branch for implementation**: run the corrected predicate (minor
   threat strictly below R, no "or none") over the fixture corpus (existing
   `tests/blunder/fixtures/tagBlunderFixtures.json` plus a fresh `generate_tagblunder_fixtures.mjs` run)
   and record the match-count delta versus today's `detectOvercut` output (today: 0 `overcut` fixture
   rows). If the delta materially exceeds today's rate, escalate to the epic owner rather than
   absorbing it silently.
5. Run `npm run sync-kb` after editing `docs/knowledge-base/community-overcut.md` and the three
   `allen-t*.md` files; confirm `tests/unit/kbSync.test.js` passes.

## US3 — `drawing_move` outcome-flip

1. Live path repro (FR-012): use a near-empty board where center is a forced win and a side column
   only draws (harvest via `gameSampling.js`, do not hand-build). Call `classify(moves, sideCol,
   scores)` and confirm `classify()` computes `bestScore > 0 && playedScore === 0` and surfaces a
   distinct phrase-pool key (`'forfeited_win'`) — **not** a `direction` field, which `classify()`'s
   sole consumer (`evaluateMoveHandler.js`) never reads.
2. Exercise the full live path via `POST /api/evaluate-move` (not just `classify()` in isolation) and
   confirm `evaluateMoveHandler.js`'s `phrasePoolKey` resolves to `'forfeited_win'` for this position,
   and that `coach.spoken.forfeited_win.*` renders in **both** `en` and `es` — this is new i18n content
   that must be authored, not verified-as-already-present (unlike US5's seven candidates).
3. Confirm whether `tests/unit/i18nKeyParity.test.js` walks the `coach.spoken.*` subtree; if it does
   not, extend it so a missing `es.json` pool fails CI rather than silently falling back to English.
4. Stored path repro (FR-013): run the equivalent position through `tagBlunder` and confirm
   `direction === 'forfeited_win'`.
5. Genuine draw-to-draw regression (FR-017): construct/harvest a position where the best move and the
   played move both only draw; confirm `direction` remains `'missed_own'` (unchanged), and confirm the
   live path's phrase-pool key resolution does not divert this case to `'forfeited_win'`.
6. Re-read `llmCoachHelpers.js`'s Fix 4 grounding-rule block (`:723-724`) against the shipped behavior
   (FR-016) — confirm it still reads correctly for both sub-cases, or correct it.
7. Trace `blunderReasons.js:60`'s bare `POSITIVE_TEMPLATES.get('drawing_move')` call site(s) and
   confirm whether it is reachable on a forfeited-win position; correct its text only if reachable
   there (per the amended FR-014 — it is verified to be an optimal/praise-path string today, not
   necessarily reachable on a blunder).

## US4 — Creation-gate residuals

1. Harvest (via `gameSampling.js`'s `playGame`) a board where the mover holds a fork in columns A/B and
   creates a second, distinct fork in C/D with their move. Confirm `classify()` now returns
   `'double_threat'` for that move (today: suppressed).
2. Harvest a board where the move does not change fork columns — confirm no regression (still no
   `'double_threat'` tag).
3. Repeat for `detectForcedWin`'s equivalent gate — confirm it now returns `{ matched, cells, blockCol
   }` and the gate diffs on `blockCol` (before/after inequality). Confirm the known collision (two
   distinct forced-win lines sharing the same `blockCol` are not distinguished) is recorded as a new
   `docs/open_issues.md` entry, not silently left undocumented.
4. Run the new `test:fast`-safe regression covering `candidate-generator.js:668`'s `cls.tag` consumer
   without invoking the real solver (FR-021) and confirm it fails on the old boolean gate / passes on
   the new diff.

## US5 — Live coach vocabulary

1. Measure `POST /api/evaluate-move`'s real end-to-end latency with and without each candidate
   detector (`detectZThreat`, `detectOddEvenThreat`, `detectClaimeven` — solver-calling; `figure_7`,
   `j_shape`, `undercut`, `overcut` — pure geometry) against a representative mid-game position, derive
   the remaining headroom versus the Explanation Engine's existing 2s target, and admit patterns
   cheapest-first while the running total stays under that single derived budget (FR-022) — do not
   guess, and do not evaluate each detector against an independent per-detector ceiling.
2. For each pattern selected, play a live sparring move (via the actual `/api/evaluate-move` endpoint,
   not a unit-level `classify()` call, to exercise the full path) that newly creates the pattern and
   confirm the coach praises it exactly once, not on subsequent persist-only moves (FR-023).
3. Confirm `coach.spoken.<tag>.*` renders in both `en` and `es` for each newly-enabled pattern (FR-025).

## Final gate (every story)

```bash
cd connect-four && npm run test:fast   # MUST be green after every story (FR-027, SC-007)
```

Confirm `docs/open_issues.md`'s OI-76/OI-60/OI-48/OI-33/OI-30 entries are updated per the Issue
closeout convention (`docs/epics/open-issues-epics.md` top matter) in the same change that ships each
fix (FR-026), **and** that a new entry for the forced-win creation-gate's `blockCol`-collision
limitation (research.md Decision D5) has been added — this is a fresh open issue, not part of OI-33's
closeout.
