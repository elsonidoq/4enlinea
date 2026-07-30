# Data Model: Detector Perspective Soundness & Blunder Tag Taxonomy

No new tables. This epic changes the **shape and semantics** of existing entities; every change below
must land in the same commit as the corresponding doc update (FR-015, FR-027, Constitution Principle
VIII).

## Entity: Detector match result

**Current shape** (unchanged by this epic, verified at `detectUndercutVictim`/`detectOvercut` today):
```js
{
  matched: boolean,
  reason?: string,          // sub-case label, e.g. 'same_parity_t4' | 't5_row3_row6' (renamed) | 'chain_t2' | 'active_forcing' (new meaning) | 'minor_threat' (new)
  cells: string[],          // e.g. ['c3r5', 'c3r4'], 1-indexed per I10
  highlightMetadata?: { type: 'cells', cells: [{ column, row, role }] },
  categoryEvidence?: object,
  correctCols?: number[],   // set-valued, already shipped (spec 051 T015) — precondition, not a task
}
```

**Change 1 (US1, FR-001/002/003)**: `detectOvercut(board, scores, perspective)` → two functions,
neither accepting `perspective`:
```js
detectOvercutVictim(board, scores)      // mover is the victim: scoreOk = s => s < 0 (analogous to undercut victim, but see note below)
detectOvercutBeneficiary(board, scores) // mover is the beneficiary: scoreOk = s => s > 0 (today's `scores[col] > 0` gate)
```
**Note — do not assume the undercut victim/beneficiary scoreOk polarity carries over unexamined.**
Undercut's beneficiary is `scoreOk: s => s > 0` (playing the column wins) and its victim is
`scoreOk: s => s < 0` (playing the column loses). Overcut's existing single-function gate is
`scores[col] > 0` (`classifier.js:1042`, "overcut requires playing C to be winning") — i.e. **today's
`detectOvercut` only ever matches the beneficiary case** (playing the column wins for whoever's threats
were passed as `perspective`). A "victim" overcut function is the mirror: the position where the
*opponent* holds the surviving upper threat and the *mover* would lose by entering the column
(`scores[col] < 0` from the mover's perspective, using the opponent's reachable threats).

**Call-site mapping — corrected on plan review, Beneficiary was wrong.** `MISSED_OWN_PRIORITY`
(`classifier.js:1961`) is evaluated inside `tagBlunder` Phase C on `moves + correctCol`
(`classifier.js:1929`) — a board where the blunderer has *already played* `correctCol`, so the side to
move on that board is the **opponent**, not the blunderer. Since both new functions resolve their role
from `board.currentPlayer` (the mover of the position handed in), calling `detectOvercutBeneficiary` on
that board reports the *opponent's* overcut, and Phase C would misfile it as the blunderer's own missed
opportunity — the wrong-player defect OI-76 exists to fix, merely relocated to the new function. The
correct call is **`detectOvercutVictim(board, scores)`** here — mirroring `classifyPattern`'s existing
`'undercut'` entry (`:1783`), which calls `detectUndercutVictim` for the documented reason (comment at
`:1779-1783`): "the side to move is the victim by construction, so the tag is the same for both
perspectives." Spec Acceptance Scenario 1 ("side to move owns a major threat... reports the mover as
the beneficiary") does **not** confirm Beneficiary for this call site — it describes a fresh position
being evaluated from the mover's own point of view (no prior move on that exact board), not Phase C's
post-move board; it is evidence for what a fresh-position caller wants, not for `classifyPattern`'s
production usage inside Phase C. See `research.md` D1 and `contracts/detector-signatures.md` C3 for the
corrected call-site table.

**Change 2 (US2, FR-007/FR-008, Decision D2/D3)**: new `reason` values —
`'minor_threat'` (new match branch, Decision D2) and `'active_forcing'` reassigned to the new
gravity-top-adjacent branch (Decision D3); the existing T5-rows-3/6 branch's `reason` renamed from
`'active_forcing'` to `'t5_row3_row6'`. `'same_parity_t4'` and `'chain_t2'` are unchanged.

## Entity: Blunder tag (stored)

**Table**: `public.blunders`. Columns relevant to this epic (verified `db-schema.md`):
- `pattern_category` — CHECK-constrained (`migrations/052_blunders_parity_threat_tags.sql`). **No new
  value added by Decision D4** (drawing_move taxonomy resolved via `direction`, not a new tag) — but
  **if a future implementer overturns Decision D4 and mints a new tag instead, the CHECK constraint,
  a new migration file, and a backfill migration are required** — see FR-014's own text for the
  full cost of that path; this plan does not take it.
- `direction` — nullable, **no CHECK constraint** ("forward compatibility," `db-schema.md`). Current
  known values: `missed_own`, `enabled_opponent`, `defensive_miss`. **New value added by Decision D4**:
  `forfeited_win` — emitted only when `pattern_category = 'drawing_move'` **and** the underlying
  condition is `bestScore > 0 && playedScore === 0` (a forced win was available and forfeited), by
  `tagBlunder` Phase E (the stored/reviewed path). `missed_own` continues to mean "best available
  outcome was genuinely a draw" for `drawing_move` rows (FR-017: unchanged in this sub-case).
  **Corrected on plan review**: `classify()` (the live path) does **not** emit a `direction` field at
  all — it returns `{ tag: string }` only (verified `classifier.js:736-737`, NOT `:743-744`, which sits
  inside an unrelated JSDoc block), and nothing on the live
  path reads a `direction` column (`evaluateMoveHandler.js:76-83` keys its phrase-pool lookup off
  `patternTag`/`category`, never `direction`). The live path's equivalent fix is a distinct
  **phrase-pool key** (`'forfeited_win'`, computed from the same `bestScore > 0 && playedScore === 0`
  condition, independently in `classify()`), not a `direction` value — see the "Entity: Live-coach tag
  vocabulary" section below for the full mechanism. Do not conflate the two producers' representations:
  stored rows get a `direction` column value; the live coach gets a distinct phrase-pool key.
- `reason` — free text, e.g. `'win dropped to draw, no pattern detected'`
  (`classifier.js:2060`) → must be updated to distinguish the two cases in its text even though it is
  not machine-parsed (nullable, human/debug-facing only per `db-schema.md`).

**Migration decision**: **none required** for `direction` (no CHECK constraint to alter). If Decision
D4 is later overturned in favor of a new tag, a migration IS required — this plan's Decision D4
explicitly avoids that path and its associated backfill.

## Entity: Blunder-tag vocabulary registries (code, not DB)

Six touchpoints verified to exist (FR-015) — each must move in lockstep whenever `pattern_category` or
`direction`'s *meaning* changes, even when the underlying SET of `pattern_category` values does not:

| Touchpoint | File:line (verified) | Change under Decision D4 |
|---|---|---|
| DB CHECK constraint | `server/migrations/052_blunders_parity_threat_tags.sql` | none (no new tag) |
| Tag registry | `server/blunderTags.js:25` (`'drawing_move'` in `VALID_BLUNDER_TAGS`) | none (no new tag) |
| Architecture docs | `docs/architecture/data-model.md:19-21`, `db-schema.md:261-266`, `server-conventions.md` §"Blunder Tag Registry" | `direction` semantics note added |
| Locale display text | `src/i18n/en.json:894`, `es.json:894` (`"drawing_move": "Drawing move"`) | verify whether any UI copy is keyed by `direction` before concluding "unchanged" |
| Reason/explanation vocabulary | `server/blunderReasons.js:43` (`'drawing_move:missed_own'`), `:60` (bare `'drawing_move'`) | new key `'drawing_move:forfeited_win'`; verify bare-key caller before editing (Decision D4) |
| LLM-context tag list + glossary | `server/explainContext.js:415` (`POSITIVE_CASCADE`), `docs/architecture/feature-vector-glossary.md:337` | glossary row split: `drawing_move` (missed_own) vs the new `forfeited_win` direction |

## Entity: Creation-gate identity (US4)

**Before** (verified): a plain `boolean` from `hasDoubleThreat(board, player)` / `detectForcedWin(board,
perspective).matched`.

**After**: each gate must expose an **instance-identifying set**:
- Fork: the `Set<number>` of gravity-top columns (`hasDoubleThreat`'s internal `gravityTopCols`) plus,
  for Case B (stacked pair), an identity for the stacked column. Diff = `colsAfter \ colsBefore`
  (set difference); non-empty ⇒ new creation. Handles the spec's A/B→C/A partial-overlap edge case
  (spec.md line 142) correctly because it is a set operation, not an equality check.
- Forced win: **no existing identity to diff** (verified — `detectForcedWin` always returns `cells:
  []`). **Decision (resolved on plan review): return the anchoring `blockCol`** (`classifier.js:1673`'s
  `myThreats[0]`, the immediate threat that starts the forcing sequence) as a new `blockCol` field on
  the return shape (`{ matched, cells, blockCol }`); the creation gate diffs on this single value
  (before/after inequality), not a set. Do **not** thread the full set of forcing columns through the
  recursion (`:1686`) to build a richer identity — that enlarges this story past its authorized scope
  (see research.md Decision D5). **Known, documented limitation**: two distinct forced-win lines sharing
  the same anchoring `blockCol` are not distinguished by this diff and would be treated as one instance
  — recorded as a new `docs/open_issues.md` entry (research.md Decision D5), not solved in this epic.

## Entity: Live-coach tag vocabulary (US5, FR-022/023/025)

`classify()`'s return shape (`{ tag: string }`) is unchanged **for US5's seven candidate patterns**. The
**input set of reachable tags** grows by a subset of `{figure_7, j_shape, z_threat, undercut, overcut,
odd_even_threat, claimeven}`, selected per FR-022's latency measurement (research.md Decision D6 — not
pre-selected in this plan). Each newly-added tag must pass through the existing `hasX(nextBoard) &&
!hasX(board)` transition-gate shape (`classifier.js:696`) or, once available, the per-column-diff shape
from US4 (FR-024, optional, non-blocking). No DB schema impact — `classify()`'s output was never
persisted with new columns; it flows into `coach.spoken.<tag>.<quality>` phrase-pool lookup only
(`evaluateMoveHandler.js:81-83`, verified), whose keys already exist for all 7 candidates (Decision D6).

**Correction — US3's live-path fix is a separate, additional i18n change, not "none needed."** An
earlier draft of this section (and the plan's Summary) stated that the live tag set only grows under
US5 and that no i18n change is required elsewhere. That is incorrect: US3's live-path fix (research.md
Decision D4's live-coach addendum) requires `evaluateMoveHandler.js`'s phrase-pool-key derivation to
resolve to a distinct `'forfeited_win'` key (computed from `bestScore > 0 && playedScore === 0` inside
`classify()`) ahead of the plain `category || patternTag` fallback, and **new** `coach.spoken.
forfeited_win.*` pools must be authored in both `en.json` and `es.json` — this is net-new content
authoring, unlike US5's seven candidates, which already have complete pools. Treat US3 and US5 as two
independent i18n-authoring surfaces in this epic, not one.
