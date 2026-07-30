# Research & Design Decisions: Pattern Acceptance

All code excerpts below were read directly from this worktree on 2026-07-29 (not recalled from
memory or the handoff). Line numbers are current as of that read; treat them as approximate if
this plan is picked up later (locate by symbol name, per CLAUDE.md).

## D1 — The relative solver-safety floor (FR-001)

**Decision**: Add one function to `connect-four/server/answerSetInvariant.js`:

```js
export function isSolverSafe(col, scores) {
  return optimalCols(scores).includes(col);
}
```

**Rationale**: `optimalCols` already exists (`answerSetInvariant.js:24-29`, verified verbatim):

```js
export function optimalCols(scores) {
  const legal = legalCols(scores);
  if (legal.length === 0) return [];
  const max = Math.max(...legal.map(c => scores[c]));
  return legal.filter(c => scores[c] === max);
}
```

`optimalCols` is defined uniformly for both won boards (`scores[C] > 0` and best) and
fully-lost boards (max is negative — the slowest losses) — exactly FR-001's requirement of "one
uniform definition... no per-category allowlist." `isSolverSafe` is a one-line wrapper so every
call site (`checkUndercutPredicate`, `evalUndercut`, and any other per-column safety check this
feature adds) reads `isSolverSafe(col, scores)` instead of restating `optimalCols(scores)
.includes(col)` inline — literally the "one — and preferably only one — obvious way to do it"
principle (Constitution VII), and it directly prevents a repeat of the drift
`answerSetInvariant.js`'s own header warns about ("the same rule was briefly written out twice and
the two copies immediately drifted").

`classifyAnswerSet`'s `LOST-POSITION` branch (`answerSetInvariant.js:50-67`, verified verbatim)
already encodes "safe relative to a losing optimum":

```js
export function classifyAnswerSet(accepted, optimal, scores) {
  if (accepted.length === 0) return 'NO-CONCEPT';
  if (optimal.length === 0) return 'NO-SCORES';
  if (optimal.length > 0 && scores[optimal[0]] < 0) return 'LOST-POSITION';
  if (optimal.some(c => !accepted.includes(c))) return 'AMBIGUOUS';
  if (!accepted.some(c => optimal.includes(c))) return 'SUBOPTIMAL-ANSWER';
  return 'OK';
}
```

This branch is UNCHANGED by this feature — FR-002 only requires that it survive, reinterpreted (it
already IS "the relative floor still applies, relative to a losing optimum": `optimal` here is
`optimalCols(scores)`, which for a lost board is the set of slowest losses, and `LOST-POSITION` is
a *passing* verdict specifically because `accepted` is still required to intersect `optimal` via
the caller's own `acceptedCols`/`answerSetHolds` check — the exemption is from the *AMBIGUOUS/
SUBOPTIMAL-ANSWER strict-equality* framing, not from safety checking altogether). No code change
needed here beyond adding `isSolverSafe` as a convenience wrapper around the same `optimalCols`.

**Alternatives considered**: A per-category allowlist of "already-safe" categories (rejected — FR-001
explicitly forbids this); inlining `optimalCols(scores).includes(col)` at each of the ~6 call
sites (rejected — this is exactly the duplication-and-drift pattern the file's header warns
against).

## D2 — Resolution of Clarification Q2 (FR-028): malformed-request fallback

**Decision**: **Gracefully fall back to the computed-live path.** Concretely: the new stored-set
branch in `evaluateMoveHandler.js` is gated strictly on `req.body.puzzleId` being present
(truthy). When absent, the handler's behavior is **completely unchanged** from today — it computes
everything live from `movestring`/`col`/`category`/`correctCol`/`highlightMetadata`, exactly as it
does now. This is not a new "malformed request" category at all; it is the pre-existing, always
correct request shape that already serves lesson inline challenges (FR-025) and — critically — is
*structurally indistinguishable* from a "stale client that still sends the old
`correctCol`/`highlightMetadata` fields with no id."

**Evidence this rests on** (verified 2026-07-29):

1. `evaluateMoveHandler.js` (128 lines, read in full) has **no puzzle-id lookup of any kind
   today** — line 54: `const { movestring, col, category, correctCol, highlightMetadata } =
   req.body;`. There is no `req.body.id`, no Supabase import, no DB query anywhere in the file.
   Every existing caller — `ChallengeScreen.jsx` (production single-answer/multi-solution
   categories), lesson inline challenges, and the test suite below — already uses this exact
   shape.
2. `tests/integration/evaluateMoveMultiSolution.test.js` (199 lines, read in full) builds request
   bodies with **no `puzzleId`** at lines 142, 157, 178, 190 (e.g. `{ movestring: ms, col: 5,
   category: 'double_threat' }`) and asserts `data.accepted` against real production behavior. This
   file is registered in `test:fast` (`package.json:17`) and, per this plan's Technical Context,
   MUST keep passing (FR-030). If Q2 were resolved as "hard-reject with 400," this exact test file
   — which is not a lesson, and does not send a puzzle id — would start failing, because its
   request shape has neither `puzzleId` nor any field that structurally marks it as
   "lesson-style" (lessons also send `correctCol`/`highlightMetadata`, no id — see
   `tests/lessons/lessonAnswerSets.test.js:64-67`, `acceptedCols(category, ch.moveString, scores, {
   correctCol: ch.correctCol, highlightMetadata: ch.highlightMetadata })`).
3. **There is no field anywhere in the current request/response contract that distinguishes "a
   lesson inline challenge" from "a stale ChallengeScreen client"** — both omit `puzzleId` (a field
   that doesn't exist yet) and both send `category`/`correctCol`/`highlightMetadata`. The spec's
   own FR-028 wording ("a stale client that still sends the old `correctCol`/`highlightMetadata`
   fields with no id") describes exactly the lesson-inline-challenge shape. There is therefore no
   sound way to implement "malformed" as a third state — the only two states the wire format can
   express are "has `puzzleId`" and "does not."

**Consequence for FR-028's documentation obligation**: `api-conventions.md` (FR-029) must state
this precisely — absence of `puzzleId` is not an error condition; it selects the row-less,
computed-live branch, unconditionally, and this is indistinguishable from (and continues to serve)
both lesson inline challenges and any legacy client. A genuinely malformed request (invalid
`movestring` shape, out-of-range `col`) is already 400-rejected by existing validation
(`evaluateMoveHandler.js:57-65`) — unchanged by this feature.

**Alternatives considered**:
- **Hard-reject (400) when `puzzleId` is absent and the category is one that "should" have a
  puzzle row** (rejected — there is no way to know, from the request alone, whether a
  `puzzleId`-less request is a legitimate lesson call or a stale client; rejecting would break
  lessons, which is explicitly forbidden by FR-025/US4).
- **A new explicit boolean flag, e.g. `lessonMode: true`** (rejected as unnecessary scope: it would
  require updating every lesson-content caller to add the flag, for a distinction the server does
  not actually need to make — the computed-live behavior is identical and correct for both cases;
  server-conventions.md's own rule that "new endpoint modes gate on an explicit request flag,
  never absence-of-field" governs *dispatch* to a genuinely different code path, and here both
  "no puzzleId" cases want the exact same code path, so no new flag is needed).

## D2a — Stored-set grading: direct set-membership, evaluators bypassed entirely (resolves Blocking #1)

**Decision (owner, 2026-07-29 — stronger than this research pass's original recommendation)**: a
puzzle row is graded **directly** against its stored `correct_cols` —
`correct_cols.includes(playedCol)` — with the seven pattern evaluators (`evalZThreat`, `evalClaimeven`,
`evalUndercut`, `evalOvercut`, `evalFigure7`, `evalJShape`, `evalOddEvenThreat`) bypassed **structurally**
on that branch, not merely discouraged from re-deriving. The evaluators remain untouched (as widened by
FR-003) for the row-less/lesson branch only.

**Why this replaces the earlier "extend `buildPredicatePuzzle` with an optional `correctCols`" idea**:
that design still routed the stored-set branch through `evaluatePredicate` and the seven `eval*`
functions, each of which reads its own input shape (`highlightMetadata` cells/roles for
undercut/overcut, `highlightMetadata.column` for z_threat, `correctCol`/stored set for the rest) —
leaving a live risk that an evaluator ignores the handed-in set and silently re-derives from
`highlightMetadata` instead, which is exactly the "detector says X, grader independently recomputes
something adjacent to X" drift this whole epic exists to close (US3's framing). Bypassing the
evaluators removes that risk by construction: there is nothing to ignore because they are never called.

**End-to-end value trace** (the seam the critique flagged as unaddressed by the original design):

1. **Generation time**: `checkPredicate` (`candidate-generator.js`, after D6's sort-and-sync) returns
   `result.correctCols` — the solver-gated set for a `(category, movestring)` pair, already floor-checked
   via `isSolverSafe`/`answerSetHolds`.
2. `generateCandidates` writes that array to `candidates.correct_cols` at insert time (FR-014), and it is
   copied to `puzzles.correct_cols` when a candidate is promoted to a served puzzle.
3. **Backfill** (D5) recomputes the identical value for pre-existing rows via the same `checkPredicate`
   call and writes it the same way (FR-015) — never a parallel re-derivation.
4. **Grading time**: `evaluateMoveHandler.js`'s new stored-set branch (FR-024) does, in essence:
   ```js
   const { data: puzzle } = await supabase.from('puzzles')
     .select('id, category, correct_cols, correct_col, highlight_metadata')
     .eq('id', puzzleId).eq('is_active', true).single();
   if (!puzzle) return res.status(404).json({ error: 'puzzle not found' });
   if (puzzle.correct_cols == null) {
     // FR-024a — NULL fallback: fall through to the computed-live branch, do not grade every column wrong
   } else {
     const accepted = puzzle.correct_cols.includes(colInt);
   }
   ```
5. No `evaluatePredicate`, no `buildPredicatePuzzle`, no re-derivation of any kind happens in step 4 — the
   only places the answer set is ever *computed* are steps 1 and 3; step 4 only *reads* it. This is the
   structural meaning of "computed once."

**Consequence for FR-003's scope**: FR-003's widening of the seven evaluators to tri-state set
membership now governs the row-less, computed-live branch **only** (FR-025) — the branch every lesson
inline challenge and `audit_answer_ambiguity.mjs` use, which has no puzzle row and no `correct_cols` to
read. The work is still required (lessons need it), just narrower in blast radius on the serving path
than the original design implied.

**Consequence for FR-026**: "one shared safety definition" is still true, but the *mechanism* differs by
branch — the computed-live branch calls `isSolverSafe`/`optimalCols` directly, at grading time; the
stored-set branch never calls it at grading time. It is safe by construction because the value it reads
was produced by a writer (generation or backfill) that already called it while building `correct_cols`.
Three call sites — generation, backfill, computed-live grading — one imported function; the stored-set
grading branch is not a fourth call site, by design.

**Outstanding gap this creates, closed by FR-023a**: `audit_answer_ambiguity.mjs` today
(`select id, category, move_string, correct_col, highlight_metadata`) never reads `correct_cols` and
recomputes `acceptedCols(...)` live — so it currently audits what the *computed-live* branch would
decide, not what the *stored-set* branch actually serves to players. Per the critique's "still required"
fix, it must be extended to also select `correct_cols` and cross-check the stored value against its own
live re-derivation, flagging any mismatch (FR-023a) — this is the only artifact that proves the two
branches' answers actually agree for real DB rows.

**Alternatives considered**: routing the stored-set branch through `evaluatePredicate` with a handed-in
`correctCols` override (rejected — this is the design the owner explicitly strengthened past; it leaves
the ignore-the-handed-in-set risk described above); pushing `correct_cols` to the client for local
grading (rejected — see D7, a related but distinct question).

## D2b — Why the server keeps grading: client-side grading considered and rejected

**Background**: during review, the owner asked whether `/api/evaluate-move`'s response could include
`correct_cols` so `ChallengeScreen.jsx` could grade the move locally, avoiding a round trip on the
stored-set path.

**Decision**: **No — the server keeps grading.** The client continues to send `puzzleId` (or the
row-less shape) and receive a graded response, exactly as the existing two-branch contract (D2a)
describes. `correct_cols` is **not** added to the response, not even as a client-side hint for instant
UI feedback — that is an early optimization, explicitly deferred by the owner and addable later with
no rework to this feature's design.

**Rationale (owner-accepted)**: the response also carries `quality`, `accepted`, badge and summary
keys, and `ChallengeScreen.jsx`'s promoted/demoted reconciliation (lines 294-303, reading
`acceptedPromoted`/`acceptedDemoted`) needs `accepted` **and** `quality` together. Sending
`correct_cols` and letting the client compute `accepted` itself would not remove the API call (the
client still needs `quality` from the server) — it would only add a **second place where correctness
is computed**, which is exactly the generator/grader duplication this epic exists to eliminate,
merely relocated from server-vs-server to server-vs-client. Lessons compound the argument: they have
no puzzle row and no set to send in the first place, so a client-grading path could never fully
replace the server path anyway.

**Correction to the record**: an earlier objection in this discussion claimed the client could not
grade `forced_win`/`forbidden_columns` locally because correctness there is a solver verdict
(`quality === 'optimal'`, `ChallengeScreen.jsx:288-289`, since neither category is in
`MULTI_SOLUTION_CATEGORIES` nor `SINGLE_ANSWER_CATEGORIES`) computed only at request time. That
objection was **withdrawn** — the solver score is a pure function of a board that is fixed at
generation time, so it is precomputable exactly like `correct_cols`. This does not change the
outcome (the server still grades everything); it is noted here only so this correction is not lost,
and so no future artifact restates the withdrawn claim as a live reason.

**Alternatives considered**: sending `correct_cols` in the response purely as a UI hint, with the
server still computing `accepted`/`quality` authoritatively (rejected for now — explicitly named an
early optimization by the owner; no current UI need justifies the extra response payload, and it can
be added later without touching this feature's grading logic).

## D3 — Tier B detector design: `detectZThreat` / `detectOvercut` set-returning mode (FR-010)

This is the least-specified requirement in the spec (deliberately, per the epic and the handoff) —
there is no existing full-column loop to convert for `detectOvercut`, unlike FR-009's
`checkFigure7Predicate`/`checkJShapePredicate`, which already loop over all 7 columns and only need
their `return` replaced with accumulation into an array.

### `detectZThreat` (`classifier.js:849-896`, read in full)

```js
export function detectZThreat(board, scores, perspective = board.currentPlayer, solver = null) {
  // FR-033: when perspective != current player, recurse into all child moves
  if (perspective !== board.currentPlayer && solver) {
    return (async () => { /* ...unchanged, out of scope... */ })();
  }

  const candidates = [];
  for (let col = 0; col < COLS; col++) {
    if (board.colHeights[col] >= ROWS) continue;
    if (scores[col] <= 0) continue;
    let threatRow = -1;
    for (let row = board.colHeights[col]; row < ROWS; row++) {
      if (checkWin(board.board, row, col, perspective)) { threatRow = row; break; }
    }
    if (threatRow === -1) continue;
    const count = threatRow - board.colHeights[col] + 1;
    if (count % 2 === 1) {
      candidates.push({ col, fromRow: board.colHeights[col], toRow: threatRow, badgeCount: count });
    }
  }

  if (candidates.length !== 1) return { matched: false, cells: [] };
  const { col, fromRow, toRow, badgeCount } = candidates[0];
  return {
    matched: true, cells: [],
    highlightMetadata: { type: 'capsule', column: col, fromRow, toRow, badgeCount },
    categoryEvidence: {},
  };
}
```

**Finding**: this function *already* builds a full `candidates` array via a per-column sweep — it
simply discards it (only checks `.length !== 1`). The epic's framing ("neither has an existing
per-column sweep to convert") is stale for this specific detector; it is accurate for
`detectOvercut` below.

**Design**: add `correctCols: candidates.map(c => c.col)` to **both** existing return branches,
changing nothing else:

```js
  if (candidates.length !== 1) return { matched: false, cells: [], correctCols: candidates.map(c => c.col) };
  const { col, fromRow, toRow, badgeCount } = candidates[0];
  return {
    matched: true, cells: [], correctCols: [col],
    highlightMetadata: { type: 'capsule', column: col, fromRow, toRow, badgeCount },
    categoryEvidence: {},
  };
```

`matched`'s existing truth table (`true` iff exactly one candidate) is **unchanged** — this
preserves `classifyPattern`'s live z_threat tagging exactly as it behaves today (it only reads
`.matched`/`.cells`, never `.correctCols`), and preserves `checkZThreatPredicate`'s existing
"reject boards with 2+ candidates" behavior with zero code change there (it still reads
`result.matched`). The FR-033 async recursion branch (perspective ≠ mover) is untouched —
out of scope per the spec's Assumptions ("perspective-parameter soundness... is Epic 2's concern").

### `detectOvercut` (`classifier.js:1015-1052`, read in full)

```js
export function detectOvercut(board, scores, perspective = board.currentPlayer) {
  const threats = board.reachableThreats(perspective);
  const oppThreats = board.reachableThreats(3 - perspective);

  for (let col = 0; col < COLS; col++) {
    if (board.colHeights[col] >= ROWS) continue;
    if (!scores || scores[col] <= 0) continue;
    const colRows = threats.get(col) ?? [];
    const oppColRows = oppThreats.get(col) ?? [];
    for (const R of colRows) {
      const neutralised = oppColRows.find(rp => rp < R);
      if (neutralised === undefined) continue;
      if (!isT4SameParity(R, neutralised) && !isT5Exception(R, neutralised) &&
          !isT2Blocking(colRows, neutralised)) continue;
      const hCells = [
        { column: col, row: neutralised, role: 'neutralised_threat' },
        { column: col, row: R, role: 'major_threat' },
      ];
      return {
        matched: true,
        reason: isT4SameParity(R, neutralised) ? 'same_parity_t4' : isT5Exception(R, neutralised) ? 'active_forcing' : 'chain_t2',
        cells: hCells.map(c => `c${c.column + 1}r${c.row + 1}`),
        highlightMetadata: { type: 'cells', cells: hCells },
        categoryEvidence: {},
      };
    }
  }
  return { matched: false, cells: [] };
}
```

This one genuinely `return`s on the first (col, R) match — no accumulation. It has **no FR-033
perspective-recursion branch** (confirmed absent by the full read) — `detectOvercut`'s
perspective-soundness is separately tracked as OI-76 and explicitly out of scope here
(server-conventions.md: "`detectOvercut` still takes a `perspective` but ... unsound — OI-76").

**Design**: convert the outer loop from early-`return` to full accumulation, keeping the *first*
match's full return shape (for 100% backward compatibility with every existing caller —
`classifyPattern`, `checkOvercutPredicate`) and adding a `correctCols` array built by continuing
the scan:

```js
export function detectOvercut(board, scores, perspective = board.currentPlayer) {
  const threats = board.reachableThreats(perspective);
  const oppThreats = board.reachableThreats(3 - perspective);
  const matches = []; // { col, R, neutralised, reason, hCells }

  for (let col = 0; col < COLS; col++) {
    if (board.colHeights[col] >= ROWS) continue;
    if (!scores || scores[col] <= 0) continue;
    const colRows = threats.get(col) ?? [];
    const oppColRows = oppThreats.get(col) ?? [];
    for (const R of colRows) {
      const neutralised = oppColRows.find(rp => rp < R);
      if (neutralised === undefined) continue;
      if (!isT4SameParity(R, neutralised) && !isT5Exception(R, neutralised) &&
          !isT2Blocking(colRows, neutralised)) continue;
      matches.push({ col, R, neutralised,
        reason: isT4SameParity(R, neutralised) ? 'same_parity_t4' : isT5Exception(R, neutralised) ? 'active_forcing' : 'chain_t2' });
      break; // preserve existing per-column "first qualifying row wins" behavior
    }
  }

  if (matches.length === 0) return { matched: false, cells: [], correctCols: [] };
  const first = matches[0];
  const hCells = [
    { column: first.col, row: first.neutralised, role: 'neutralised_threat' },
    { column: first.col, row: first.R, role: 'major_threat' },
  ];
  return {
    matched: true,
    reason: first.reason,
    cells: hCells.map(c => `c${c.column + 1}r${c.row + 1}`),
    highlightMetadata: { type: 'cells', cells: hCells },
    categoryEvidence: {},
    correctCols: matches.map(m => m.col),
  };
}
```

`matched`/`cells`/`highlightMetadata`/`reason` are byte-identical to today's output for every board
that has at least one match (same first-found column) — zero behavior change for
`classifyPattern`. `correctCols` is strictly additive.

**Finding F1 (undocumented uniqueness gap — must be closed by this feature)**: `checkOvercutPredicate`
(`candidate-generator.js:351-362`, verified verbatim) is:

```js
export function checkOvercutPredicate(ms, scores) {
  const result = detectOvercut(new Board(ms), scores);
  if (!result.matched) return { passes: false, correctCols: [] };
  const majorCol = result.highlightMetadata.cells.find(c => c.role === 'major_threat').column;
  return { passes: true, correctCols: [majorCol], correct_col: null, ...};
}
```

There is **no explicit rejection of multi-match boards here today**, despite `data-model.md:338`
documenting "`z_threat`/`overcut`... require exactly one correct column." Today, a board with 2+
structurally valid overcut columns silently enters the pool with only the first-found column
recorded as `correctCols`, and `answerSetHolds`'s `optimalCols ⊆ acceptedCols` check never sees the
second column to catch the discrepancy — this is the overcut-side sibling of the OI-61 undercut
defect (a genuinely correct alternative column would grade `wrong`). **This plan's task for FR-010
must add the missing check** (`if (result.correctCols.length !== 1) return { passes: false,
correctCols: [] };`) using the newly-added `correctCols` field, closing this doc/code gap in the
same change — not deferred, since FR-010 already requires exposing the full match count and
leaving the gap open after doing that work would be a known, named, live-discovered defect left
unfixed.

**Alternatives considered**: making `matched` itself `true` only when `matches.length === 1`
(rejected — this would silently flip `classifyPattern`'s live overcut tagging for any currently-
multi-match board, an out-of-scope behavior change per the spec's Assumptions on
perspective/detector soundness being Epic 2's concern, not this feature's).

**Guard rails required by Decision #1 (owner, 2026-07-29)**: Finding F1's fix must not ship as a
silent addition folded into FR-010's general widening. It gets the identical before/after pool-count
and replace-not-exempt discipline (FR-021/FR-022/FR-023) that Blocking #3 already mandates for
`undercut`, extended explicitly to `overcut` (FR-021a/FR-022a — see spec.md): measure the live
`overcut` pool with `audit_answer_ambiguity.mjs --puzzles overcut --env local` **before** the
`if (result.correctCols.length !== 1) return { passes: false, correctCols: [] };` guard lands, record
the after-count once it does, and require FR-023 replacements if the after-count falls below whatever
FR-022 threshold is set for `overcut`. Rationale: `answerSetInvariant.js`'s own header comment records
that a *milder* tightening of the same kind (the undercut floor) already retired 7 perfectly good
puzzles; `overcut` gets no exemption from that risk merely because its fix looks like a one-line guard.

## D4 — FR-022 minimum-viable-pool threshold: methodology, not a number

The spec is explicit: "If no defensible number exists at spec time, this FR requires the FR-021
before/after counts to be produced first, during planning, and the threshold set from that data —
this spec does not invent a number." This plan does not invent one either. The required procedure,
to run as the first task of US2's "before/after counts" work, before any real backfill write:

1. Implement FR-004/FR-005 (the `evalUndercut`/`checkUndercutPredicate` floor) fully, including
   tests.
2. **First, land the `audit_answer_ambiguity.mjs` update required by Blocking #1/FR-023a** (select
   and cross-check `correct_cols`, not just recompute `acceptedCols` live) — per Decision #2, this
   script is the **single measurement path** for both `undercut` and `overcut`, and it must be
   updated before any measurement is taken so the measurement agrees with what the backfill will
   later write, not with a live re-derivation that was never cross-checked against it.
3. Run a **dry-run** measurement — `audit_answer_ambiguity.mjs --puzzles undercut --env local` (now
   reading and cross-checking `correct_cols`, per step 2) — against the current local DB pool (295
   puzzles total across all categories per OI-61's "local DB 295/295" note; the `undercut`-only
   subset is the number that matters here and was not captured in this research pass — running the
   audit is exactly how it gets captured). **Repeat for `overcut`** per D3's Finding F1 guard rails
   (Decision #1) — same script, same ordering requirement, before the F1 uniqueness fix lands.
4. Record the before/after counts this produces (FR-021 for `undercut`, FR-021a for `overcut`).
5. Only then set the FR-022/FR-022a thresholds — e.g. "no fewer than N `<category>` puzzles may
   remain active, where N is derived from [X]% of the current pool, chosen so serving variety is not
   visibly degraded" — as concrete numbers grounded in that data, not guessed in advance.
6. If either after-count falls below its chosen threshold, FR-023's replace-not-exempt remediation
   (`audit_answer_ambiguity.mjs --repair --yes`) runs to top the pool back up before the feature
   ships.

**The backfill script's own `--dry-run` mode (D5) is explicitly NOT a second, competing source of
these numbers** — it prints what it would *write*, which is a useful sanity check, but the audit
script (now cross-checking `correct_cols`, step 2) is the one measurement path this plan commits to,
per Decision #2 — avoiding two tools that could disagree about how many puzzles survive.

**Alternatives considered**: picking an arbitrary round number now (e.g. "20 puzzles minimum")
— rejected explicitly by the spec's own wording; this plan flags the measurement task as
mandatory instead. Using the backfill's `--dry-run` output as the FR-022 measurement instead of the
audit script (rejected — Decision #2 requires one measurement path, and the audit script needs zero
new code to reflect the new floor once evaluators are fixed, whereas treating the backfill's dry-run
as authoritative would require it to also be updated and cross-checked, duplicating the work FR-023a
already does).

## D5 — Backfill script design (`backfill-correct-cols.mjs`)

**Decision**: `connect-four/server/scripts/backfill-correct-cols.mjs`, following
`backfill-lesson-progress.mjs`'s established conventions (the only prior backfill script in this
codebase, read in full, 260 lines):

- `.mjs` extension (house convention — all 32 files in `server/scripts/*.mjs` use it).
- `--help`/`-h` printed and `process.exit(0)` **before** any required-arg validation
  (`feedback_scripts_meaningful_help` convention).
- Manual `.env`/`.env.staging`/`.env.production` parsing (not `dotenv`), reading `SUPABASE_URL` +
  `SUPABASE_SERVICE_ROLE_KEY` (not `SUPABASE_SERVICE_KEY`) — mirrors
  `backfill-lesson-progress.mjs`'s `parseEnv` and `audit_answer_ambiguity.mjs`'s `supabaseFor`.
- `--dry-run` prints the plan (per-category before/after counts) with no writes.
- A typed `"Yes"` confirmation gate before any live write, except under `--dry-run`.
- A single batched `.upsert(...)` (or `.update(...)` per row via `Promise.all` in small batches) —
  not row-by-row awaited sequentially, to avoid an unnecessarily slow backfill over ~295+ rows.

**Critical divergence from a naive backfill**: this script MUST call the **same**
`checkPredicateRaw`/`checkPredicate` (or an exported equivalent) functions that
`candidate-generator.js` uses for fresh generation — per FR-015 ("using the same generalized,
solver-gated detection logic as fresh generation — not a simplified or partial re-derivation").
Concretely: for each active row, re-run `checkPredicate(category, move_string, scores, solver)`
(scores fetched via a fresh `solver.query(move_string)`) and write its `correctCols` (already
ascending-sorted **and scalar-synced per D6, including the `undercut`/`overcut` carve-out**) to
`correct_cols`/`correct_col` — the script itself does not re-implement the sync logic; it inherits
whatever `checkPredicate` already returns (FR-019). **Idempotency (FR-016)** falls out for free from
this design: re-running the backfill recomputes the exact same deterministic function of
`(category, move_string)` each time, and D6 guarantees the same sort order both times.

**Per-category before/after report (FR-021/FR-021a)**: before recomputing, count active rows per
category; after, count how many rows would still pass `answerSetHolds(correctCols, scores)` (they all
should, by construction, but a row whose category's predicate now returns an EMPTY `correctCols` —
e.g. an undercut board where the floor eliminates every column — must be flagged).

**Empty-but-non-null `correct_cols` is a data defect, not a storable state for an active row (FR-016b,
Blocking #3b)**: when `checkPredicate` returns `{ passes: false, correctCols: [] }` for a
previously-active row, the backfill MUST **deactivate** that row (`is_active = false`) rather than
write the empty array while leaving it active — this is a candidate for FR-023's replace-not-exempt
remediation, not a state a served puzzle may sit in. This is distinct from a row the backfill simply
hasn't reached yet (`correct_cols IS NULL` on an as-yet-unprocessed row), which FR-024a's grading-time
fallback handles separately — the two states must not be conflated: NULL is "not yet processed, fall
back to computed-live," empty-non-null is "processed and rejected, must not be served at all until
replaced."

**Alternatives considered**: reimplementing detection logic inline in the backfill script for
speed (rejected — directly contradicts FR-015's explicit "not a simplified or partial
re-derivation" requirement, and reintroduces exactly the two-independent-implementations
drift risk US3 exists to eliminate).

## D6 — Ascending-order enforcement point AND scalar sync, centralized in one place (FR-016a/FR-019)

**Decision**: sort **and** sync the legacy scalar once, centrally, inside `checkPredicate` (the
exported wrapper in `candidate-generator.js`, verified at `candidate-generator.js:468-480` to be the
sole caller of `answerSetHolds` and the function every category's `checkPredicateRaw` result flows
through) — immediately before it returns:

```js
  if (category !== 'forbidden_columns' && !answerSetHolds(result.correctCols, scores)) {
    return { passes: false, correctCols: [] };
  }
  result.correctCols = [...result.correctCols].sort((a, b) => a - b);
  // FR-019 sync, with the FR-019/Blocking #2a carve-out: undercut/overcut store no single
  // correct column today (candidate-generator.js:345,358) and must not start doing so silently.
  result.correct_col = (category === 'undercut' || category === 'overcut')
    ? null
    : (result.correctCols[0] ?? null);
  return result;
```

**Bug fixed here (Blocking #2b)**: an earlier draft of this decision inserted only the
`result.correctCols = [...].sort(...)` line and returned — it never wrote `result.correct_col` at all.
But `correct_col` is set independently *inside each* `check*Predicate` from that detector's own pick
(e.g. `checkOddEvenThreatPredicate` uses `result.correctCol`, `checkFigure7Predicate` uses `col`), and
`generateCandidates` reads `predicateResult.correct_col` (`candidate-generator.js:612`). Left as
originally drafted, generation would have produced `correct_col !== correct_cols[0]` for several
categories — the exact divergence FR-019 exists to prevent. The fix above centralizes the sync in the
same place as the sort, immediately after sorting, subject to the undercut/overcut carve-out.

This guarantees every category's `correct_cols` array is ascending, and every category's `correct_col`
scalar is either `correct_cols[0]` or (for `undercut`/`overcut`) `null`, at the single point both
generation (`candidate-generator.js#generateCandidates` → `checkPredicate`) and the backfill (D5,
which calls the same function) write from — no per-`check*Predicate`-function discipline required,
and no risk of a category-specific function forgetting to sort or sync.

**Required regression test (critique + prior handoff, both flagged this)**: assert that
`checkPredicate`'s output is ascending-sorted **for every category**, not a sampled few, and that
`result.correct_col` matches the FR-019/carve-out rule for every category — otherwise a future
category bypassing this centralized point (or a future edit to the carve-out list) breaks
FR-016a/FR-019 silently, with no test catching it.

**Alternatives considered**: sorting inside each `check*Predicate` function individually (rejected
— seven call sites to remember instead of one, and a future 13th category would need to remember
it too); sorting at write time in the DB layer (rejected — the backfill and generation paths would
each need their own copy of the same one-line sort, reintroducing exactly the "same rule written
out twice" risk `answerSetInvariant.js`'s header already warns about for a different function);
syncing `correct_col` inside each `check*Predicate` individually (rejected for the same reason, and
this is precisely the bug this decision fixes — the sync was drifting exactly because it wasn't
centralized).

## Additional verified facts referenced by the plan

- **`checkPredicate`'s `answerSetHolds` call site** (`candidate-generator.js:468-480`, verified
  verbatim, import at line 2 — `import { answerSetHolds } from './answerSetInvariant.js';`):
  ```js
  if (category !== 'forbidden_columns' && !answerSetHolds(result.correctCols, scores)) {
    return { passes: false, correctCols: [] };
  }
  return result;
  ```
- **`evaluateMoveHandler.js`'s current `accepted` gate** (lines 114-119, verbatim):
  ```js
  let accepted = null;
  if (MULTI_SOLUTION_CATEGORIES.has(category) || SINGLE_ANSWER_CATEGORIES.has(category)) {
    const predicatePuzzle = buildPredicatePuzzle(category, movestring, { correctCol, highlightMetadata });
    const predicateResult = evaluatePredicate(predicatePuzzle, colInt, scores);
    accepted = predicateResult.result === 'correct' || predicateResult.result === 'tied';
  }
  ```
  **Revised per D2a/Blocking #1**: the new stored-set branch (FR-024) sits **before** this block and
  **replaces** it entirely for that request, rather than feeding this block a substitute predicate
  object: when `req.body.puzzleId` is present and resolves to a row with non-null `correct_cols`, the
  handler computes `accepted = correct_cols.includes(colInt)` directly and **does not** call
  `buildPredicatePuzzle`/`evaluatePredicate` at all for that request. This block (the
  `MULTI_SOLUTION_CATEGORIES`/`SINGLE_ANSWER_CATEGORIES` branch shown above) remains exactly as-is and
  continues to run **only** for the computed-live/no-`puzzleId` path (and for the FR-024a NULL-`correct_cols`
  fallback) — the rest of the function (scoring, classification, i18n phrase pools) is unchanged for
  both cases.
- **Existing puzzle-by-id lookup precedent** (`POST /api/puzzles/:id/check`,
  `server/index.js:2452-2543`, read in full) — the query shape FR-024's stored-set branch should
  mirror:
  ```js
  const { data } = await supabase
    .from('puzzles')
    .select('id, category, move_string, goal_prompt, goal_predicate_type, goal_predicate_params, cooperative_ai_moves, interaction_mode, highlight_metadata, correct_col')
    .eq('id', puzzleId)
    .eq('is_active', true)
    .single();
  ```
  FR-024's new branch extends this exact `.select(...)` list with `correct_cols`. This also settles
  the DI question the plan's Project Structure section flags: `evaluateMoveHandler.js`'s factory
  (`createEvaluateMoveHandler({ solver, i18nTranslations })`) needs a third parameter, `supabase`,
  threaded the same way `solver` already is — `server/index.js`'s registration
  (`server/index.js:1780`, `app.post('/api/evaluate-move', createEvaluateMoveHandler({ solver,
  i18nTranslations }))`) becomes `createEvaluateMoveHandler({ solver, i18nTranslations, supabase })`.
- **`categories.js`'s current definitions** (verified verbatim, lines 3-54): `VALID_CATEGORIES` /
  `CATEGORY_ORDER` both already list all 12 slugs including `odd_even_threat`;
  `MULTI_SOLUTION_CATEGORIES` (lines 26-28) = `{immediate_threat, forced_block, double_threat}`,
  unchanged by this feature; `SINGLE_ANSWER_CATEGORIES` (lines 37-39) = `{z_threat, overcut,
  claimeven, undercut, figure_7, j_shape}` — `odd_even_threat` must be added here (FR-007), making
  it 7 entries. `src/lib/categories.js` mirrors this by hand (not cross-imported) and must change
  identically.
- **Migration precedent** (`016_correct_col.sql`, verified verbatim in full):
  ```sql
  -- Migration 016: Add correct_col column to puzzles and candidates tables.
  -- Required by the new tactical puzzle categories (claimeven, figure_7, j_shape)
  -- where the correct column is computed at generation time and stored for play-time evaluation.
  ALTER TABLE public.puzzles
    ADD COLUMN IF NOT EXISTS correct_col integer DEFAULT NULL;
  ALTER TABLE public.candidates
    ADD COLUMN IF NOT EXISTS correct_col integer DEFAULT NULL;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.puzzles TO anon, authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO anon, authenticated;
  ```
  Note: neither this migration nor the most recent one (`060_paddle_rename_and_payment_events.sql`)
  actually includes the "HUMAN REVIEW REQUIRED before applying to production" line that
  `data-model.md`'s documented "Migration Naming" convention mandates — the convention is
  inconsistently followed in practice. This plan's new migration includes the line anyway, per the
  documented MUST.
- **Latest migration confirmed** (`ls connect-four/server/migrations/ | sort -V | tail -5`, run
  2026-07-29): `056_llm_usage.sql`, `057_users_onboarding_status.sql`,
  `058_blunders_device_uuid.sql`, `059_explanation_cache_locale.sql`,
  `060_paddle_rename_and_payment_events.sql` — confirming `061_correct_cols.sql` is the correct
  next number, unchanged from the handoff's claim, re-verified fresh.
- **`puzzles`/`candidates` schema** (`db-schema.md`, verified): both tables already have
  `correct_col integer` (nullable) and `highlight_metadata jsonb` (nullable); `puzzles` has
  `is_active boolean NOT NULL DEFAULT true` (no `approved`/`status` column — approval IS
  `is_active`); `candidates` has `status text NOT NULL DEFAULT 'pending'`. The new `correct_cols
  integer[]` column is nullable (`DEFAULT NULL`) on both, matching the existing scalar's
  nullability, populated at generation/backfill time.
- **No KB entry exists for `undercut` or `odd_even_threat`** (`ls docs/knowledge-base/`, run
  2026-07-29 — 52 entries, no `*undercut*` or `*odd*even*` file). `community-overcut.md` links to a
  `[[community-undercut]]` "mirror concept" that does not exist — a pre-existing KB gap, not
  introduced by this feature. Undercut mechanics for this feature's work are documented instead in
  `docs/architecture/server-conventions.md`'s "Undercut has two sides" section and
  `allen-t2.md`/`allen-t4.md`/`allen-t5.md`. `odd_even_threat`'s KB predicate lives in
  `derived-parity-aligned-threat.md` (cross-checked against `predicates.js:110,358` and
  `categories.js:6,17,47`).
