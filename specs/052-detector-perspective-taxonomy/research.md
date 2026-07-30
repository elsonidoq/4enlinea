# Phase 0 Research: Detector Perspective Soundness & Blunder Tag Taxonomy

## Sources read (Constitution Principle VIII gate)

- `docs/epics/open-issues-epics.md` §Overview + §"## Epic 2" (Settled decisions, Non-obvious facts,
  Authoritative sources of truth, Acceptance criteria, NOT included, Open questions) — read in full,
  reflected verbatim below, not re-derived.
- `docs/architecture/reason-INVARIANTS.md` (all 13, I10 and I12 quoted below), `reason-DECISIONS.md`
  (tail — D34/D35 as the citation-format precedent), `reason-case-taxonomy.md` (`win_to_draw` case),
  `blunder-reason-evidence.md`.
- `docs/architecture/server-conventions.md` §"Undercut has two sides", §"Blunder Tag Registry".
- `docs/knowledge-base/community-overcut.md`, `allen-t2.md`/`allen-t4.md`/`allen-t5.md` (referenced;
  community-overcut.md read in full — it is the case-space enumeration FR-009 requires).
- `docs/open_issues.md` — OI-74 (resolved, the template), OI-76, OI-60, OI-48, OI-33, OI-30 (read in
  full, quoted below).
- `docs/best_practices_spec_driven_development.md`.
- Source code: `connect-four/server/classifier.js` (detectOvercut, detectUndercutVictim/Beneficiary,
  isT4SameParity/isT5Exception/isT2Blocking, classify(), tagBlunder Phase C/D/E, hasDoubleThreat,
  detectForcedWin, classifyPattern's detector list/PRIORITY arrays), `blunderReasons.js`,
  `blunderTags.js`, `explainContext.js`, `llmCoachHelpers.js`, `candidate-generator.js`,
  `migrations/052_blunders_parity_threat_tags.sql`, `src/i18n/en.json`/`es.json`,
  `docs/architecture/data-model.md`/`db-schema.md`/`feature-vector-glossary.md`.

## Epic constraints reflected verbatim (not re-derived)

**Settled decisions** (from `open-issues-epics.md` § Epic 2):
1. OI-76 resolves by mirroring undercut: drop `perspective`, split into two role-named functions. Do
   **not** take the FR-033 child-position-recursion route.
2. The set-valued/`correctCols` conversion (spec 051 T015) is **already satisfied** for `detectOvercut`
   — no story here may redo it.
3. Blunder-tag changes validated per I12 — full case space + counterexample per case, through the
   production detector.
4. OI-60 resolves by **extending the detector**, not re-scoping lesson 12 — the KB already documents
   active forcing as part of the concept.

**NOT included** (hard constraint): `detectFigure7`/`detectJShape` signature changes; the
acceptance/grading model (Epic 1 — already shipped in this worktree per spec 051); re-generating the
puzzle pool for categories whose metadata does not change.

## Decision D1 — US1: `detectOvercut` split (FR-001/002/003)

**Decision**: Split into `detectOvercutVictim(board, scores)` and `detectOvercutBeneficiary(board,
scores)`, byte-for-byte mirroring the shipped undercut pair.

**Verified template** (`connect-four/server/classifier.js:981-1004`):
```js
export function detectUndercutVictim(board, scores) {
  const mover = board.currentPlayer;
  return detectUndercutCore(board, scores, {
    victim: mover, beneficiary: 3 - mover, scoreOk: s => s < 0,
  });
}
export function detectUndercutBeneficiary(board, scores) {
  const mover = board.currentPlayer;
  return detectUndercutCore(board, scores, {
    victim: 3 - mover, beneficiary: mover, scoreOk: s => s > 0,
  });
}
```
Undercut factors the shared geometry into `detectUndercutCore(board, scores, {victim, beneficiary,
scoreOk})`. `detectOvercut`'s current body (`classifier.js:1020-1073`) is **not yet factored this
way** — it inlines `threats`/`oppThreats`/the T4/T5/T2 checks directly. The task must extract an
equivalent `detectOvercutCore(board, scores, {beneficiary, victim, scoreOk})` (or inline the mover
resolution directly into two functions without a shared core — undercut's core-sharing is a
convenience, not a mandated shape; FR-003 only mandates the two exported signatures and the
role-resolves-by-mover behavior, not that a `detectOvercutCore` helper must exist).

**Call-site fix (FR-003 "every call site... MUST be updated")** — verified all current callers:
- `classifier.js:1784` — `classifyPattern`'s detector list: `['overcut', () =>
  detectOvercut(board, scores, perspective)]`. Since `classifyPattern(ms, perspective, solver)` is
  itself called with `perspective` sometimes `!== board.currentPlayer` (per OI-76's own text: "OI-76
  says ... `classifyAiMove` / `explainContext` reach it with `perspective !== board.currentPlayer` in
  production" — quoted from OI-74's resolution text, same call graph), this call site is the actual
  production repro. **Decision (corrected during plan review — supersedes the earlier Beneficiary
  lean below): this call site MUST be replaced with `detectOvercutVictim(board, scores)`, not
  Beneficiary.** Verified at the source layer: `tagBlunder`'s Phase C (`classifier.js:1929`) calls
  `classifyPattern(moves + correctCol, blunderer, ...)` — a board where the blunderer has *already*
  played `correctCol`, so the side to move on that board is the **opponent**, not the blunderer. Both
  new functions resolve their role by `board.currentPlayer` (the mover), so on that board
  `detectOvercutBeneficiary` would report the *opponent's* overcut, and Phase C would misfile it as
  the blunderer's own missed opportunity — the identical wrong-player defect OI-76 exists to fix,
  merely relocated. `detectOvercutVictim` is correct here for the same reason undercut's precedent
  comment (`:1780-1783`) gives: "the side to move is the victim by construction, so the tag is the
  same for both perspectives — for the mover it reads 'the column you must not enter', for the player
  who just moved it reads 'the undercut you just landed'" — `classifyPattern`'s `'undercut'` entry at
  `:1783` calls `detectUndercutVictim` for exactly this reason, and `'overcut'` at `:1784` must mirror
  it. Spec Acceptance Scenario 1 does **not** confirm Beneficiary here — it describes a fresh position
  with no prior move (the mover evaluating their own board), not Phase C's post-move board; it is
  evidence for what a *fresh-position* caller wants, not for what `classifyPattern`'s production call
  site wants. `data-model.md` and `contracts/detector-signatures.md` C3 are corrected accordingly
  (see below) — do not treat their Beneficiary assertion as settled.

  **Task addition**: because `MISSED_OWN_PRIORITY` is a stored, user-visible tag, the validation for
  this call site MUST be a **Phase-C-level regression** (constructs a real blunder board, runs the
  full `tagBlunder` pipeline, asserts the tagged cells belong to the blunderer), not a bare
  `detectOvercutVictim` unit test in isolation — a unit test alone cannot catch a correct function
  wired to the wrong call site.

  **`contracts/C1` ambiguity — must be resolved into one predicate before implementation**: C1's prose
  ("the side to move's threat... survives (or the mover would lose by entering the column)") describes
  two different conditions disjunctively. Victim's actual predicate (mirroring
  `detectUndercutVictim`'s `scoreOk: s => s < 0`) is: the mover's own major threat in column C is
  neutralized/dead (T2 applies, no T4/T5/chain exception) **and** `scores[C] < 0` from the mover's
  perspective — i.e., entering C is losing for the mover because the opponent's overcut stands. "The
  threat survives" is the *beneficiary*'s condition, not the victim's — C1's parenthetical "or" is the
  actual correct case; the first clause is a leftover from conflating the two roles and must be
  dropped when C1 is rewritten (see contracts file edit).

  **Harvest gap — the epic's five mandated counterexamples are all Beneficiary-shaped** (same-parity/T4,
  T5 rows-3/6, chain-T2, minor-threat, active-forcing — each worked example in `community-overcut.md`
  describes the mover's threat *surviving*). None of them exercises `detectOvercutVictim`'s losing-mover
  case. Add a sixth harvested board (via `gameSampling.js`'s `playGame`, per CLAUDE.md's movestring
  rule — flagged **UNVERIFIED SKETCH — adapt**) where the mover's threat is legitimately dead and
  `scores[C] < 0`, to satisfy I12 for the newly-introduced Victim function specifically (this function
  has no existing semantics to characterize — see the note below).
- `classifier.js:1961-1970` (`MISSED_OWN_PRIORITY`, evaluated inside `tagBlunder`'s Phase C on
  `moves + correctCol`, blunderer ≠ mover of that position) — this is OI-76's "blast radius": the
  unsound branch production always takes today. After the split, this call reaches `classifyPattern`
  indirectly (`pAfterCorrectBlunderer` etc. are `Map`s built from `classifyPattern` calls) — so fixing
  the `classifyPattern` call site above is what actually fixes this path; Phase C does not call
  `detectOvercut` directly.
- `connect-four/server/candidate-generator.js:6,368` — `checkOvercutPredicate`'s `const result =
  detectOvercut(new Board(ms), scores);` (no `perspective` arg passed — already implicitly
  `board.currentPlayer`), consumes `result.correctCols`. **Decision (resolved on plan review, epic-owner
  confirmation): rename to `detectOvercutBeneficiary`** — the closest direct migration of the existing
  loop (contracts C2), behavior-preserving by construction since the call already ran as the side to
  move. This matters because the `overcut` fixture/candidate corpus is currently empty (zero rows, T002),
  so a re-derivation that silently flipped this to Victim would ship uncaught.
- `connect-four/tests/integration/undercut_overcut.test.js:5,142,146,150,154` and
  `connect-four/tests/classifier/classifier.test.js:11` — test imports must be updated to the new
  names; existing `describe('detectOvercut — structure and eval', ...)` blocks are the primary place
  characterization-test tasks (US1's "characterize current behavior with a fixture per branch," per
  the epic's US2.1 task list) should land, run *before* the split (captures today's — possibly buggy
  — behavior) and again *after* (confirms the fix, per I12's "counterexample per case" discipline).

**Zero current fixture risk, but re-run required**: `grep -c "'overcut'" tests/blunder/fixtures/tagBlunderFixtures.json` → **0** (verified). No `overcut`-tagged golden fixture exists today, so FR-005's
"every changed fixture individually reviewed" has no existing rows to review *yet* — but
`scripts/generate_tagblunder_fixtures.mjs` samples from **real games** (`gameSampling.harvestBlunders`),
so re-running it after the fix is the only way to know whether the corrected detector makes `overcut`
newly reachable in the fixture corpus (this is the epic's own "false negative fixed, not just a false
positive" edge case, spec.md line 140). Task must re-run the generator and treat any new `overcut`
fixture as requiring the same human-review discipline as a changed one.

**Sequencing constraint (added on plan review)**: the fixture generator MUST be re-run **after** the
`classifier.js:1784` call-site mapping is settled to `detectOvercutVictim` (above), not before. Running
it against an intermediate state that still calls Beneficiary at that site would produce a fixture
corpus reflecting the wrong-player tag, and the human review in FR-005 would be reviewing (and likely
approving) mislabeled data. Task order: (1) split the detector, (2) fix the `classifyPattern` call
site to Victim, (3) re-run the fixture generator, (4) human-review the diff.

## Decision D2 — US2: the minor-threat exception is structurally unreachable today (new finding)

**This was not in the epic text — verified independently at the source layer, per
`feedback_verify_at_the_source_layer` (a real negative claim opened, not assumed).**

FR-009 requires a dedicated counterexample for **each** of 5 mechanisms: minor-threat, T4, T5,
chain-T2, active-forcing. Verified at `classifier.js:1020-1073`:
```js
const threats    = board.reachableThreats(perspective);
const oppThreats = board.reachableThreats(3 - perspective);
...
const oppColRows = oppThreats.get(col) ?? [];
for (const R of colRows) {
  const neutralised = oppColRows.find(rp => rp < R);
  if (neutralised === undefined) continue;
  if (!isT4SameParity(R, neutralised) && !isT5Exception(R, neutralised) &&
      !isT2Blocking(colRows, neutralised)) continue;
  ...
```
`Board.reachableThreats(player)` (`classifier.js:552-563`, doc comment: "Returns Map<col, row[]> of
all empty cells at or above colHeight where player wins") returns **major threats only** — confirmed
by its usage pattern (a "win" completion = 3-in-a-row + empty = major threat by definition; minor
threats are a separate 2-of-4 concept computed via `getMinorThreatWindows` — see
`detectMinorThreat`/`categorizeThreats`, `classifier.js:298-328`, which draws minor-threat cells from a
**different** source, `getMinorThreatWindows(board.board, persp)`, not `reachableThreats`).

**Consequence**: if the opponent's lower "threat" in a column is *minor* (not major), it never appears
in `oppColRows`, so `oppColRows.find(rp => rp < R)` returns `undefined` for it, and the loop
`continue`s — **no overcut match is reported at all** for the minor-threat case, even though
`community-overcut.md`'s precondition (a) says this should be an automatic overcut (T2 only applies to
major-vs-major threat pairs; a minor lower threat can never neutralize an upper major one, regardless
of parity). The current code cannot express "opponent has no major threat below R, or only a minor
one" as a *positive* match condition — it only ever matches when a major lower threat is found *and*
fails to neutralize via T4/T5/chain-T2.

**Decision**: US2's task list (which the epic already scopes to "add a branch to `detectOvercut`" and
"validate per I12: full case space, one counterexample per branch") must include sourcing minor-threat
data — via `getMinorThreatWindows(board.board, opponent)` filtered to the target column, or reusing
`categorizeThreats(board, opponent).player.minor.cells` — and adding a fifth match branch: "current
player has a major threat at R; opponent's **has** a minor threat strictly below R in the column."
This is a **case-space completeness fix required by FR-009**, not a scope-creep addition — the KB's
own `formal_predicate` lists mechanism (a) first and `worked_examples`/`false_positives` in
`community-overcut.md` do not include a minor-threat-specific worked example (all four given examples
are major-vs-major), so this may need a **harvested fixture via `gameSampling.js`'s `playGame`**, not a
hand-built movestring (per CLAUDE.md's movestring rule) — flag as **UNVERIFIED SKETCH — adapt** for the
task that harvests it.

**Corrected on plan review — drop the "(or none)" clause.** An earlier draft of this branch matched
when the opponent's threat below R was minor **"or absent entirely."** That is wrong: dropping the
existence requirement removes the precondition that an opposing threat exist at all in the column below
R — an overcut is, by definition, a cut *over* something. On the always-taken production path for a
stored, player-visible tag, "or none" would fire on essentially any winning column where the mover holds
a reachable major threat, since most columns have no opposing threat below R at all. It would also push
US2 past the epic's Settled decision 4, which authorizes exactly one new branch (active forcing), not a
broadened base case. The corrected match condition **requires a minor opposing threat strictly below
R** — no minor threat, no match, same as today.

**Required pre-tasking step**: before this branch is tasked for implementation, run the corrected
predicate (minor-threat-strictly-below-R only, no "or none") over the existing fixture corpus
(`tests/blunder/fixtures/tagBlunderFixtures.json` plus a fresh `generate_tagblunder_fixtures.mjs` run)
and record the match-count delta versus today's `detectOvercut` output. If the delta materially exceeds
today's `overcut` match rate (today: 0 fixture rows, per the grep above), escalate to the epic owner
before absorbing it silently — do not assume the corrected predicate is low-blast-radius just because
"(or none)" was removed.

## Decision D3 — Open Question 1: the `active_forcing` label (FR-008, US2)

**Verified case-space** (`docs/knowledge-base/community-overcut.md`, `statement` block, quoted
verbatim): *"In the active-forcing sub-case, the current player plays into the column voluntarily
with odd-column parity, blocking the opponent's lower threat and immediately threatening from R."*
This exactly matches lesson 12's taught shape (per OI-60 and the epic's Settled decision 4) and **does
not** match `classifier.js:1052`'s current `isT5Exception` branch, which fires only for the specific
row pair `{3, 6}` (0-indexed `{5,2}`, `classifier.js:356-358`) regardless of adjacency or column
parity.

**Decision (planning-phase resolution, per the epic's own instruction that Open Questions are "left
open for the planning phase to resolve")**: **Option (b)** — rename the existing
`isT5Exception`-driven branch's emitted `reason` string from `'active_forcing'` to
`'t5_row3_row6'` (the epic's own suggested name, `open-issues-epics.md`: *"e.g. `t5_row3_row6`"*), and
reserve `'active_forcing'` for the new KB-matching branch added under Decision D2/FR-007.

**Rationale**: 
- This is the epic's own stated "likely resolution" (`open-issues-epics.md` § Non-obvious facts:
  "The likely resolution is to rename the misapplied T5 branch to something T5-specific ... and
  reserve `active_forcing` for the new first-class branch"), so choosing it is not a fresh guess — it
  is executing the epic author's own documented leaning, made now because Open Question 1 explicitly
  requires this decision before `classifier.js:1052` can be touched (FR-008).
- It matches the KB's own vocabulary (`community-overcut.md`'s `formal_predicate` names the T5 branch
  `"t5_exception"` in its Python sketch, and the active-forcing case `"active_forcing"` — distinct
  strings for distinct mechanisms), so post-fix the code's reason strings and the KB's terminology
  converge instead of diverging further.
- Option (a) (keep `active_forcing` on the T5 branch, invent a new name for the real active-forcing
  case) would perpetuate the exact naming mismatch OI-60 opened — the new branch is the one lesson 12
  and the community's own term describe; keeping the misnomer on the *unrelated* branch just moves the
  confusion instead of resolving it.

**Consequence for FR-010/FR-011**: lesson 12's copy and any deep-reveal shape-naming text must use
`active_forcing` only for the new branch (grep-verified: `active_forcing` currently appears in
production code only at `classifier.js:1052`; no lesson JSON, deep-reveal renderer, or i18n string
currently references the literal string `active_forcing` — verified via
`grep -rn "active_forcing" connect-four/ docs/` — so there is **no existing player-facing text to
migrate**, only the code's internal `reason` value and the forthcoming KB cross-references).
**Record this decision in `reason-DECISIONS.md` as a new `D3x` entry before implementation touches
`classifier.js:1052`, per FR-008.**

## Decision D4 — Open Question 2: `drawing_move` taxonomy (FR-014, US3)

**Both producers, verified**:
- `classify()` (live path), `classifier.js:736-737` (NOT `:743-744`, which sits inside an unrelated
  JSDoc block — locate by the `score === 0` return, not the line number):
  ```js
  if (score > 0) return { tag: 'best_move' };
  if (score === 0) return { tag: 'drawing_move' };
  ```
  `score = scores[candidateCol]` (`classifier.js:673`) — there is **no comparison to the best
  available score anywhere in `classify()` today**. The forfeited-win case (best score > 0, played
  score = 0) and the genuine draw-to-draw case (best score = 0, played score = 0) are indistinguishable
  in the current code — `classify()` never computes `Math.max(...scores)`.
- `tagBlunder` Phase E, `classifier.js:2056-2062`:
  ```js
  const preScore  = Math.max(...preScores);
  const postScore = Math.max(...postScores);
  if (preScore > 0 && postScore === 0) {
    return { tag: 'drawing_move', direction: 'missed_own',
             reason: 'win dropped to draw, no pattern detected' };
  }
  ```
  This path **already computes** the forfeited-win condition (`preScore > 0 && postScore === 0`) but
  still emits the same `drawing_move` tag/direction as it would for any other draw-preserving case —
  it has the *signal* but not the *distinct label*.

**Decision**: **Refine the existing `drawing_move` tag's `direction` field — do not mint a new tag.**
Introduce a new `direction` value, e.g. `'forfeited_win'`, emitted only when `bestScore > 0 &&
playedScore === 0` (both producers); keep `direction: 'missed_own'` for the genuine
best-is-a-draw case (FR-017's "unchanged" requirement).

**Rationale (cost/risk comparison, both options satisfy FR-012/013's user-visible distinction)**:
- `direction` is **explicitly designed for exactly this kind of forward-compatible extension** —
  verified at `docs/architecture/db-schema.md`: *"`direction`: One of three known values (`missed_own`,
  `enabled_opponent`, `defensive_miss`) with **no CHECK constraint for forward compatibility — future
  directions may be added**."* Adding a fourth value requires **zero schema migration**, in contrast to
  minting a new `pattern_category` value, which requires editing the CHECK constraint
  (`migrations/052_blunders_parity_threat_tags.sql`'s pattern: `DROP CONSTRAINT ... ADD CONSTRAINT ...
  CHECK (pattern_category IN (...))`) **and** a backfill migration to reclassify historical
  `drawing_move` rows that actually match the forfeited-win predicate (FR-014's own text flags this
  backfill cost explicitly for the new-tag path).
- The composite-key hazard FR-014 calls out (`blunderReasons.js:43` `'drawing_move:missed_own'`, `:60`
  bare `'drawing_move'`) is resolved either way by adding a new
  `'drawing_move:forfeited_win'` key to `REASON_TEMPLATES` — the bare `POSITIVE_TEMPLATES` entry at
  `:60` ("You found the drawing resource — the only move that prevents a loss") is keyed by `tag` alone
  with **no direction distinction at all**, so it is used only for a genuinely-optimal drawing move
  (a *good* move, not a blunder) — confirm this at the call site during implementation (its usage is
  in the LLM praise path, not the blunder-explanation path) before assuming it needs a
  `direction`-aware fix; if it is only ever reached for `quality === 'optimal'` positions, its current
  text is already correct and FR-014's "actively wrong" framing applies specifically to a
  **hypothetical bare-key fallback in the blunder-explanation path**, not necessarily this exact
  string — **verify the call site (grep every `POSITIVE_TEMPLATES.get('drawing_move')` /
  `REASON_TEMPLATES.get(...)` caller) before editing**, per "open every negative claim at source."
- Keeping `pattern_category = 'drawing_move'` for both cases means **no CHECK constraint edit**, so
  `data-model.md:20-21`/`db-schema.md`'s "15/18 valid values" tables need only a `direction` column note
  update, not a new enumerated value — a smaller, lower-risk doc diff.

**Corrected on plan review — the `direction` fix alone does not reach the live coach.** `direction` is
a `tagBlunder`/stored-path field only. The live path's sole consumer of a per-move tag is
`evaluateMoveHandler.js:76-83`, which uses `patternTag` (from `classify()`'s `{ tag }`) to build
`phrasePoolKey = category || patternTag` and look up `coach.spoken.<phrasePoolKey>.<quality>` — there is
no `direction`-aware branch anywhere in that lookup, and `classify()` itself returns `{ tag }` only
(verified `classifier.js:736-737`, NOT `:743-744`), never a `direction` field. Emitting `direction: 'forfeited_win'`
from `classify()` (as C5 currently specifies) would write to a field nothing reads on the live path —
the fix would be invisible to players in live sparring, contradicting FR-012/SC-004's explicit "both the
live sparring coach and the stored post-game review" requirement. `data-model.md:100-107`'s claim that
"the live tag set only grows under US5 and no i18n change is needed" for this story is also wrong under
this decision and must be corrected.

**Decision: make the live lookup direction-aware.** Keep the stored-path fix as planned
(`direction: 'forfeited_win'` from `tagBlunder` Phase E), and additionally:
1. Have `classify()` compute the same `bestScore > 0 && playedScore === 0` condition it already needs
   for FR-012 and surface it — e.g. `phrasePoolKey = 'forfeited_win'` (a distinct pool key, not a
   `direction` field threaded through `classify()`'s `{ tag }` shape) — when the condition holds and the
   tag would otherwise be `drawing_move`.
2. Update `evaluateMoveHandler.js`'s `phrasePoolKey` derivation to consult this signal ahead of the
   plain `category || patternTag` fallback, so a forfeited-win move resolves to the new pool key instead
   of `drawing_move`.
3. Author **new** `coach.spoken.forfeited_win.*` phrase pools in **both** `en.json` and `es.json` — this
   is net-new i18n content, not covered by Decision D6's "all 7 candidates already have pools" finding
   (that finding is about US5's seven *pattern* tags, unrelated to this tag). Per
   `feedback_spanish_output_silent_fallback` (memory), a missing Spanish pool ships English silently —
   task this explicitly rather than assuming the existing `drawing_move` pool covers it.
4. **Verify, do not assume**, whether `tests/unit/i18nKeyParity.test.js` actually walks the
   `coach.spoken.*` subtree (left unverified by the plan reviewer) — this test is the only thing that
   would catch a missing `es.json` pool automatically; if it does not cover that subtree, add a task to
   extend it, since it gates the parity guarantee FR-015/FR-025-style requirements depend on elsewhere
   in this epic.

This resolution keeps `pattern_category`/`direction`'s DB shape exactly as Decision D4 already
specified (no migration) — it only adds a live-path consumer of the same underlying condition, computed
independently in `classify()` since that function has no access to a stored `direction` column.

**Still required regardless of this decision** (FR-015's six touchpoints, all independently verified
to exist at the cited locations):
1. `server/migrations/052_blunders_parity_threat_tags.sql` — **not touched** under this decision (no
   new `pattern_category` value). Confirm no migration is needed as part of Decision D4's write-up.
2. `server/blunderTags.js` — **not touched** (still `'drawing_move'`, `VALID_BLUNDER_TAGS` unchanged).
3. `docs/architecture/data-model.md`, `db-schema.md`, `server-conventions.md` (§"Blunder Tag Registry",
   currently at the line drift-flagged `:142`, "Any tag not in this set is substituted with
   `'suboptimal_move'`") — **direction semantics note added**, not a new registry entry.
4. `src/i18n/en.json:894`/`es.json:894` (`"drawing_move": "Drawing move"` — the pattern *label*, not
   direction-specific) — likely **unchanged** if the UI never surfaces `direction` directly as a
   distinct label; verify whether any UI string is keyed by `direction` before concluding "no i18n
   change needed" (open the negative claim).
5. `server/blunderReasons.js` — **new key** `'drawing_move:forfeited_win'` in `REASON_TEMPLATES`; verify
   `POSITIVE_TEMPLATES`'s bare `'drawing_move'` entry per the bullet above.
6. `server/explainContext.js` (`POSITIVE_CASCADE` array, `:401-416` — `'drawing_move'` verified present
   at line 415) and `docs/architecture/feature-vector-glossary.md:337`'s
   `drawing_move` row ("Score fallback: a win dropped to a draw with no named pattern") — **glossary row
   text must be corrected** to state that this description now applies specifically to
   `direction !== 'forfeited_win'`; the `forfeited_win` direction gets its own glossary row/note.

**FR-016** (Fix 4 grounding-rule re-check): verified at `llmCoachHelpers.js:723-724`:
```js
if (tag === 'drawing_move') {
  groundingLines.push('The move you played results in a draw, but a stronger move was available...
  (A better move may itself have been stronger than a draw — do not deny that a better option
  existed.)');
}
```
This text is keyed by `tag === 'drawing_move'` only, **not** by `direction` — it already reads
correctly for both the forfeited-win and genuine-draw sub-cases (it explicitly already allows "a
better move may itself have been stronger than a draw"). **Preliminary read: no change needed**, but
FR-016 requires this be *confirmed*, not assumed — re-read it once the `direction` value is emitted in
practice and check whether the `groundingLines` block should branch on `direction` to say something
more specific for the forfeited-win sub-case (e.g., naming that the better move was an outright forced
win, not merely "stronger").

## Decision D5 — US4: per-column diff for the creation gate (FR-018/019)

**Current boolean gate**, `classify()` Category 3/4 (`classifier.js:696,702`):
```js
if (hasDoubleThreat(nextBoard, player) && !hasDoubleThreat(board, player)) {
  return { tag: 'double_threat' };
}
...
if (detectForcedWin(nextBoard, player).matched && !detectForcedWin(board, player).matched) {
  return { tag: 'forced_win' };
}
```
`hasDoubleThreat(board, player)` (`classifier.js:635-659`) returns a **plain boolean** — it internally
computes `gravityTopCols` (a `Set`) and per-column stacked-pair rows, but returns only whether *any*
qualifying structure exists, discarding which columns. Per OI-33 item 1 (verified, quoted above): "The
gate suppresses the tag whenever the mover *already* held the pattern pre-move... If a player already
holds a standing fork in cols A&B and this move *creates a second, distinct* fork in cols C&D, the new
creation is suppressed too."

**Decision**: `hasDoubleThreat` must be refactored (or wrapped) to return the **identifying column
set** (its existing internal `gravityTopCols` `Set<number>`, plus the stacked-pair column for Case B),
not just a boolean; the gate becomes `newCols = colsAfter - colsBefore; if (newCols.size > 0) { ... }`.
Spec's edge case (spec.md line 142): a fork sharing one column (A/B → C/A) must count as "one new
column, one retained," not "fully new"/"no change" — a **set difference**, not an equality check,
satisfies this: `colsAfter \ colsBefore = {C}`, non-empty ⇒ creation, and the diff naturally handles
partial overlap.

`detectForcedWin`'s equivalent per-column identity is **verified absent, not merely under-specified**:
read in full at `classifier.js:1664-1697`. Every return path is either `{ matched: false, cells: [] }`
or `{ matched: true, cells: [] }` — `cells` is **always the empty array**, on both the immediate-win
terminal (`afterUser.checkWin(...)`), the double-threat terminal (delegates to
`detectDoubleThreat(afterUser, perspective).matched`, itself boolean), and the recursive-chain case.
The only identifying datum computed internally is `blockCol = myThreats[0]` (`:1673` — the single
immediate-threat column that anchors the whole forcing sequence) and the recursion's per-branch `col`
loop variable (`:1686`) — neither is returned today.

**Consequence for FR-019**: there is **no existing return-shape data to diff** — this is not a
refactor of an existing per-column signal (unlike `hasDoubleThreat`'s already-internally-computed
`gravityTopCols`), it requires **adding new identity to `detectForcedWin`'s return contract**: at
minimum, the anchoring `blockCol` (the immediate threat that starts the forced sequence) must be
threaded through and returned (e.g. `{ matched, cells, blockCol }`), so a second, distinct forced-win
line (different `blockCol`) can be told apart from the first. This is a larger, more invasive change
than US4's fork-diff (Decision D5's `hasDoubleThreat` diff), since two different forcing chains could
in principle share the same `blockCol` but diverge later in the recursion.

**Decision (resolved on plan review): return the anchoring column, do not thread the full forcing set.**
`detectForcedWin` is changed to return `{ matched, cells, blockCol }`, where `blockCol` is the immediate
threat that starts the forcing sequence (`:1673`'s `myThreats[0]`). The creation gate diffs on
`blockCol` alone (single value, not a set) — a new, different `blockCol` between before/after is treated
as a new forced-win instance. Do **not** thread the full set of forcing columns through the recursion
(`:1686`'s per-branch `col` loop variable) to build a richer identity key — that would enlarge this
story into per-instance forced-win-line tracking, which is shared infrastructure beyond what US4's
sizing (a single creation-gate fix) authorizes, and risks the same overreach FR-024 explicitly guards
against for US5.

**Known collision, to be documented, not solved, in this epic**: two different winning forced-win lines
that happen to share the same anchoring `blockCol` (e.g., the same immediate threat column, but the
forcing sequence diverges afterward into two distinct lines) will be treated as the same instance by
this diff — a genuinely new second forced-win line sharing the first's anchor would still be suppressed.
This is an accepted, documented limitation of the minimal fix, not silently swept aside: add a **new**
entry to `docs/open_issues.md` (per the file's Issue closeout convention) describing the collision,
scoped explicitly as "forced-win creation-gate identity is anchor-column-only; two distinct lines
sharing an anchor are not distinguished" — do not fold this into OI-33's closeout, since OI-33's
acceptance criterion (the boolean→diff fix landing) is satisfied by the `blockCol` diff; the collision is
a new, narrower residual.

**FR-021** (test:fast-safe candidate-generator regression): verified consumer at
`candidate-generator.js:668`: `if (cls?.tag) tags.push(cls.tag);` — currently exercised only by
`tests/integration/candidate-generator.test.js`, excluded from `test:fast` (real solver, up to 400
calls/test, hangs). The new regression must exercise this specific line's behavior (that a genuinely
new fork's tag is pushed) **without invoking the real solver** — likely by stubbing/mocking the solver
dependency injected into `candidate-generator.js` (verify its solver-injection seam — is it a parameter
or a module-level import? — before designing the mock), or by constructing a fixture board where
`classify()`'s pure-geometry gate (Category 3, no solver call) is exercised directly, bypassing the
solver-dependent parts of the pipeline.

## Decision D6 — US5: live-coach pattern selection (FR-022)

**Verified async/solver-calling detectors** (`classifier.js` detector list at `:1768-1793`, comments
already annotate this): `detectZThreat`, `detectOddEvenThreat` (both take `solver` — "for the recursive
perspective case (FR-033)"), `detectClaimeven` ("Async detector (uses solver internally for
simulation)"). Sync, no-solver: `detectFigure7`, `detectJShape` (pure kernel convolutions per OI-76's
own "not affected" note), `detectUndercutVictim`/`detectOvercutVictim`/`detectOvercutBeneficiary`
(scores-gated but no solver call inside the detector itself — `scores` is already computed once per
position by the caller).

**Decision (deferred to task-time measurement, per FR-022's own text: "should be made once the latency
of each candidate detector is actually measured")**: this plan does **not** pre-select which of the 7
patterns ship to live recognition — FR-022 explicitly frames this as an empirical decision requiring a
measurement task, not a design-time judgment call. The **research-phase recommendation** is:
`undercut`/`overcut`/`figure_7`/`j_shape` are strong candidates (no solver call beyond the
already-computed `scores` array the live path already has from `scoreMove`), while `z_threat`,
`odd_even_threat`, `claimeven` require a dedicated latency-measurement task (each takes `solver` and
calls it internally) before inclusion — consistent with OI-30's own text ("multi-tag detectors are
`async` and several call the solver... unlike the pure geometry checks `classify()` uses on the live
per-move path").

**Measurement acceptance criterion (resolved on plan review): a single total-endpoint budget, not a
per-detector ceiling.** The US5 measurement task's acceptance criterion is defined as one end-to-end
latency budget for `POST /api/evaluate-move`, derived from the Explanation Engine's existing 2s
explanation-path target (Constitution Principle V, this plan's Technical Context "Performance Goals").
The task must measure the move-evaluation endpoint's real latency with **and without** each candidate
detector enabled, then admit patterns **cheapest-first** while the running total stays under budget —
i.e., this is a knapsack-style admission over one shared budget, not five independent per-detector
thresholds. Record the derived numeric budget explicitly during the measurement task (e.g., "existing
non-detector endpoint latency measured at Xms; remaining headroom to the 2s target is Yms; admit
detectors in ascending cost order until Yms is exhausted") so the task is decidable rather than a
subjective judgment call. Note as separately verified: all seven candidate patterns already have
complete `coach.spoken.<tag>.*` English phrase pools (Decision D6, below), so admission under this
budget is gated purely on latency cost, not on any missing content-authoring dependency.

**Phrase-pool precondition (FR-025) — already satisfied for all 7 candidates**, verified via direct
JSON inspection of `connect-four/src/i18n/en.json`'s `coach.spoken.<tag>` object for each of
`figure_7`, `j_shape`, `z_threat`, `undercut`, `overcut`, `odd_even_threat`, `claimeven`: each already
has `{prompt, hint, optimal, suboptimal, blunder}` keys. The consuming call site is
`server/evaluateMoveHandler.js:81-83`: `phrasePoolKey = category || patternTag;` →
`pickFromPool(i18nTranslations, \`coach.spoken.${phrasePoolKey}.${quality}\`)` — so no new i18n
authoring is required for FR-025's precondition check itself; the task is to **verify** (not create)
parity between `en.json` and `es.json` for these keys, which `tests/unit/i18nKeyParity.test.js`
(already in `test:fast`) should already enforce structurally — confirm this test's scope actually
covers the `coach.spoken.*` subtree before treating parity as pre-verified by CI.

**FR-023's transition gate**: `classify()`'s existing pattern at `classifier.js:696` (quoted verbatim
in FR-023 itself) is the literal template — every newly-added pattern needs its own
`hasX(nextBoard) && !hasX(board)` (or, if it ships after US4, the per-column-diff form from Decision
D5) wired into `classify()`'s branch order, gated by the FR-022 selection.

## Documentation lockstep obligations (carried into every task, per FR-027/Constitution Principle VIII)

- `docs/architecture/reason-DECISIONS.md` gains at least three new entries: the
  `classifyPattern`/Phase C call-site mapping to `detectOvercutVictim` (new — the plan-review
  correction above), the `active_forcing`/`t5_row3_row6` rename (Decision D3, FR-008), and the
  `drawing_move` direction-refinement choice plus its live-path phrase-pool-key mechanism (Decision D4,
  FR-014) — follow the D34/D35 citation format (Context / Decision / Rationale / Source — module +
  invariant references) already used in that file.
- `docs/open_issues.md` — five closeouts (FR-026): OI-76 (US1, format: RESOLVED like OI-74's own
  closeout, the file's stated worked example), OI-60 (US2 — **and** its body-text "lesson 07" → "lesson
  12" correction, per FR-026's explicit callout), OI-48 (US3), OI-33 (US4 — both item 1 and item 2 must
  close, or the entry must state precisely which half remains, per the file's own "partially fixed"
  convention), OI-30 (US5) — **plus one new entry** (not a closeout): the forced-win creation-gate's
  `blockCol`-only collision (Decision D5 above), opened fresh rather than folded into OI-33.
- `docs/architecture/server-conventions.md` — §"Undercut has two sides" precedent extended to overcut
  (US1); §"Blunder Tag Registry" (US3, `direction` semantics).
- `docs/knowledge-base/community-overcut.md` + `allen-t2.md`/`allen-t4.md`/`allen-t5.md` — FR-011 cross
  references, **then `npm run sync-kb`** (verified requirement: `tests/unit/kbSync.test.js`, part of
  `test:fast`, fails if `server/kb/` drifts from `docs/knowledge-base/`).
- Lesson 12 — verified path `connect-four/lessons/lesson-12-overcut.json` — FR-010.
