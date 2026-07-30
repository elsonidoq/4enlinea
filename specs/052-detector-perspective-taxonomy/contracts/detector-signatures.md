# Contracts: Detector & Tag Interface Changes

This is not a network API — the "contracts" this epic changes are internal JS function signatures and
tag-vocabulary registries consumed across `connect-four/server/`. Documented here because multiple call
sites and downstream consumers (tests, `candidate-generator.js`, `explainContext.js`, i18n) depend on
these shapes exactly.

## C1 — `detectOvercutVictim(board, scores)` (new export, US1)

Replaces the `perspective`-taking `detectOvercut`. Mirrors `detectUndercutVictim`
(`classifier.js:981-987`, verified) exactly in parameter shape.

**Predicate — resolved on plan review (the prior prose was ambiguous and internally inconsistent).**
The victim's own threat in column C is neutralized (T2 applies — no T4/T5/chain-T2/active-forcing/
minor-threat exception rescues it), **and** `scores[C] < 0` from the mover's own perspective (entering
C loses for the mover, because the opponent's overcut stands). The victim's threat does **not**
survive — "survives" is the *beneficiary*'s condition (C2), not the victim's; an earlier draft's "survives
(or the mover would lose by entering the column)" conflated the two roles disjunctively. Only the second
clause is correct for Victim.

```js
/**
 * Overcut, VICTIM side: the mover's own major threat in column C is neutralized (T2 applies, no
 * T4/T5/chain-T2/active-forcing/minor-threat rescue), so entering C is losing for the mover
 * (scores[C] < 0) because the opponent's overcut stands. Role is fixed by who is to move — no
 * `perspective` parameter, per FR-002.
 * @param {Board} board
 * @param {number[]} scores
 * @returns {{ matched: boolean, reason?: string, cells: string[], highlightMetadata?: object,
 *             categoryEvidence?: object, correctCols: number[] }}
 */
export function detectOvercutVictim(board, scores) { ... }
```

**Breaking change**: the old 3-argument `detectOvercut(board, scores, perspective = board.currentPlayer)`
export is removed. Every import of `detectOvercut` must be updated (see below) — this is a hard break,
not an additive change, per FR-002 ("`perspective` MUST be dropped from the public interface entirely").

**New code, not a rename — I12 harvest requirement.** Today's `detectOvercut` gates on `scores[C] > 0`
(the beneficiary framing) — `detectOvercutVictim`'s losing-mover predicate has **no existing code path
to characterize**; it must be built fresh from the undercut-victim template, and per I12 (
`reason-INVARIANTS.md`) needs its own counterexample board. The epic's five mandated overcut
counterexamples (same-parity/T4, T5 rows-3/6, chain-T2, minor-threat, active-forcing) are all
**Beneficiary-shaped** (each worked example in `community-overcut.md` describes the mover's threat
surviving) — none of them exercises the Victim predicate. **Add a sixth harvested board** (via
`gameSampling.js`'s `playGame`, per CLAUDE.md's movestring rule — flag as **UNVERIFIED SKETCH —
adapt**) where the mover's threat is legitimately dead and `scores[C] < 0`, and run it through the
production `detectOvercutVictim` before this function ships.

## C2 — `detectOvercutBeneficiary(board, scores)` (new export, US1)

Mirrors `detectUndercutBeneficiary` (`classifier.js:1003-1009`, verified). This is the role today's
single `detectOvercut` actually implements (its gate is `scores[col] > 0` — "overcut requires playing C
to be winning," `classifier.js:1042`) — so this function's body is the closest direct migration of the
existing loop; `detectOvercutVictim` (C1) is the new mirror that must be built from the undercut-victim
template, not a copy of today's code.

```js
export function detectOvercutBeneficiary(board, scores) { ... }
```

## C3 — Removed export: `detectOvercut(board, scores, perspective)`

**All verified current importers that must be migrated:**
| File | Line(s) | Migration |
|---|---|---|
| `connect-four/server/classifier.js` | `:1784` (`classifyPattern`'s detector list) | → **`detectOvercutVictim(board, scores)`** — corrected on plan review; Beneficiary was wrong here. `classifyPattern` is called by `tagBlunder` Phase C on `moves + correctCol` (`classifier.js:1929`), a board where the blunderer has already moved and the side to move is the opponent. Both new functions resolve role from `board.currentPlayer`, so Beneficiary on that board would report the *opponent's* overcut and Phase C would misfile it as the blunderer's own — the same wrong-player defect OI-76 exists to fix. Victim is correct, mirroring `classifyPattern`'s `'undercut'` entry at `:1783` (`detectUndercutVictim`) per the precedent comment at `:1780-1783`. Spec Acceptance Scenario 1 does not confirm Beneficiary — it describes a fresh position with no prior move, not Phase C's post-move board. Add a Phase-C-level regression (not a bare detector unit test) asserting tagged cells belong to the blunderer. |
| `connect-four/server/candidate-generator.js` | `:6` (import), `:368` (call, inside `checkOvercutPredicate`) | → **`detectOvercutBeneficiary`** (resolved on plan review) — the call already runs as the side to move (two args, no `perspective`) and consumes `result.correctCols`; behavior-preserving by construction, the closest direct migration of the existing loop. Independent of the `classifyPattern` call site above; the two roles need not match — they don't. |
| `connect-four/tests/integration/undercut_overcut.test.js` | `:5, 142, 146, 150, 154` | update imports + calls; this file's `describe('detectOvercut — structure and eval', ...)` blocks are the natural home for characterization tests |
| `connect-four/tests/classifier/classifier.test.js` | `:11` | update import |

## C4 — `reason` string vocabulary change (US2, Decision D3)

| Old string | New string | Emitted by |
|---|---|---|
| `'active_forcing'` (on the `isT5Exception` branch, `classifier.js:1052`) | `'t5_row3_row6'` | T5 rows-3/6 branch (unchanged logic, renamed label) |
| *(did not exist)* | `'active_forcing'` | new gravity-top-adjacent branch (Decision D3, matches `community-overcut.md`'s KB term) |
| *(did not exist)* | `'minor_threat'` | new branch for KB mechanism (a) (Decision D2) |

Any code, test, or doc that pattern-matches the literal string `'active_forcing'` must be re-verified
against the new meaning — grep-verified zero player-facing (i18n/lesson) references exist today, so
this is contained to `classifier.js` + new KB cross-references (FR-011) + `reason-DECISIONS.md`.

## C5 — Blunder tag `direction` vocabulary addition (US3, Decision D4)

New value: `'forfeited_win'`, valid only in combination with `pattern_category = 'drawing_move'`.
Emitted by:
- `tagBlunder` Phase E (`classifier.js:2056-2062`) — already computes `preScore`/`postScore`; only the
  emitted `direction` value changes from `'missed_own'` to `'forfeited_win'` when `preScore > 0 &&
  postScore === 0`.

**Corrected on plan review: `classify()` does NOT emit `direction`.** An earlier draft of this contract
had `classify()` emit a `direction` field on its return shape. That is unreachable — `classify()`'s sole
consumer, `evaluateMoveHandler.js:76-83`, looks up phrases by `patternTag`/`category` only and never
reads a `direction` field, so a `direction` emitted from `classify()` would write to nothing the live
coach reads. The live-path fix instead requires `classify()` to compute the same `bestScore > 0 &&
playedScore === 0` condition (via `bestScore = Math.max(...scores.filter(...))`, not currently computed
in `classify()` — verified) and surface a distinct **phrase-pool key**, `'forfeited_win'`, that
`evaluateMoveHandler.js`'s `phrasePoolKey` derivation must consult ahead of its `category || patternTag`
fallback. This requires **new** `coach.spoken.forfeited_win.*` pools authored in both `en.json` and
`es.json` (net-new i18n content, unlike US5's seven candidates which already have pools) — see
`data-model.md`'s "Entity: Live-coach tag vocabulary" correction and research.md Decision D4's live-coach
addendum for the full mechanism.

No change to `pattern_category`'s CHECK constraint or `VALID_BLUNDER_TAGS`.

## C6 — Creation-gate return-shape additions (US4)

`hasDoubleThreat(board, player)` — currently returns `boolean`. New: expose the identifying column set
(its internal `gravityTopCols`, plus Case B's stacked column) so callers can diff before/after sets.
Preserve the existing boolean-returning call site's behavior: `hasDoubleThreat`'s **only** caller is
`classify()`'s Category 3 gate at `:696` (both the `nextBoard` and `board` invocations sit on that one
line). `:702` (Category 4) calls `detectForcedWin`, not `hasDoubleThreat` — do not cite it as a second
`hasDoubleThreat` call site. Phase C's `isUndercutDoubleThreat`/`isUndercutFigure7` helpers at
`:1940-1956` call `detectDoubleThreat` — a third, different function — not `hasDoubleThreat`; confirm
`hasDoubleThreat`'s only caller before changing its signature, and do not conflate any of the three
functions (`hasDoubleThreat`, `detectForcedWin`, `detectDoubleThreat`).

`detectForcedWin(board, perspective, maxDepth)` — currently always returns `cells: []`. New return
shape: `{ matched, cells, blockCol }`, where `blockCol` is the anchoring immediate threat
(`myThreats[0]`, `classifier.js:1673`) that starts the forcing sequence. The creation gate diffs on
this single value (before/after inequality) — not a set, and not the full per-branch forcing-column
recursion (`:1686`), which is out of scope for this story per research.md Decision D5. **Known,
documented limitation**: two distinct forced-win lines sharing the same `blockCol` are not
distinguished — recorded as a new `docs/open_issues.md` entry, not solved here.

## C7 — `classify()`'s live tag vocabulary (US5)

Additive only: `classify()`'s existing `{ tag: string }` return shape is unchanged; the *set* of
possible `tag` values grows by the FR-022-selected subset of `{figure_7, j_shape, z_threat, undercut,
overcut, odd_even_threat, claimeven}`. Each addition must be gated by the transition-gate shape at
`classifier.js:696` (or the US4 per-column diff, optionally per FR-024) and must have a verified
`coach.spoken.<tag>.*` phrase pool in both locales before being enabled (FR-025 — already satisfied for
all 7 candidates per research.md Decision D6, pending the i18n-parity test-scope confirmation noted
there).

**Admission criterion (FR-022)**: a single total-endpoint latency budget for `POST /api/evaluate-move`,
derived from the Explanation Engine's existing 2s explanation-path target — measure with/without each
candidate detector, admit cheapest-first while the running total stays under budget (research.md
Decision D6). This is distinct from US3's `forfeited_win` phrase-pool-key addition (C5) — the two
i18n-authoring surfaces are independent and both required.
