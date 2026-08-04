# Phase 1 Data Model: MVP Launch Gate

This feature introduces **no new tables and no new columns**. It changes the *meaning* of values
already stored under three existing tables, corrects a tooling bug against an existing column, and
adds no new entity. Entities below are the ones this feature reads, writes, or whose invariants it
newly names — carried from `spec.md`'s Key Entities section, expanded with the concrete schema
citations gathered during planning.

## Puzzle pool (`puzzles`, `candidates`)

**Source**: `docs/architecture/db-schema.md` (`puzzles` `~L39`, `candidates` `~L72`).

| Field | Type | Relevant to |
|---|---|---|
| `is_active` | `boolean` | US1 — the real "is this puzzle servable" gate (not `approved`, which does not exist — OI-130) |
| `category` | text/enum | US1 — the N=20 floor is per-category (FR-003) |
| `highlight_metadata` | `jsonb` | US1 — the stored evidence `evalOvercut`/`evalUndercut`/`evalZThreat` grade against as a fallback when `correct_cols` doesn't cover the answer; shape differs by category: `{ column }` for `z_threat` (`predicates.js:309`), `{ cells: [{ role, ... }] }` for `undercut`/`overcut` (`predicates.js:349,365`) with role values `killing_threat` (undercut) vs `major_threat` (overcut) |
| `correct_cols` | `integer[]` | US1/FR-006 — the solver-gated set the grader now cross-checks first, following `evalFigure7`'s pattern, before falling back to `highlight_metadata` (no longer "context only" — this feature's FR-006 change reads it directly in `evalOvercut`/`evalUndercut`/`evalZThreat`) |
| `status` (candidates only) | text/enum | US1 — `'pending'` is the promotable state FR-003/FR-004 count against |

**Meaning change introduced by this feature**: D1 (**RESOLVED 2026-08-03 — retire and refill**) means
a stale `overcut`/`undercut`/`z_threat` row is marked `is_active=false` rather than repaired in place;
the category is then refilled to the N=20 floor by `fill-candidate-pools.mjs`. No schema change; the
owner-run script is the only writer against staging/production, per
`docs/deployment_steps.md`'s Standing Checklist item 2 and the Spec 052 overcut-only precedent. This
is independent of FR-006's grader fix (`correct_cols` cross-check), which protects correct answers
whether or not the retire-and-refill has run yet on a given row.

**Validation rules** (unchanged by this feature, restated for context): `checkOvercutPredicate`'s
singleton guard (`if (result.correctCols.length !== 1) return { passes: false, correctCols: [] }`,
per the epic's Non-obvious facts) means a `highlight_metadata` reflecting more than one valid overcut
column is not a candidate for in-place repair anyway — consistent with D1's retire-and-refill
resolution rather than a per-row repair-vs-retire split.

## `OI-N` issue (`docs/open_issues.md`)

Not a DB entity — a markdown-file record. Carried from spec.md verbatim: this feature's scope is
exactly the 16 named in the Traceability table, each requiring a disposition at close using that
file's existing fully-fixed / partially-fixed / already-resolved / deliberately-not-fixed formats
(FR-027). Two of the 16 (OI-31, OI-105) have **already-stale rationale text** as of this planning
session (see `research.md`) — their closeout entries must correct that text, not merely append a
resolution on top of it.

## Explanation response seam

**Source**: `server/reasonRenderGuard.mjs` (confirmed this session).

The seam is the pair of functions `guardExplainMovePayload({ oneLiner, patternTag, deepReveal })`
(`:80`) and `guardExplainMoveLlmPayload({ explanation, prompt, terms, locale = 'en', ...rest })`
(`:99`), both calling `stripInternalTokens(text, locale = 'en')` (`:41`), which applies
`LABEL_PREFIX_RE` (`:20`, strips `community-`/`allen-` prefixes) then `CXRY_RE` (`:25`,
`/\bc(\d+)r\d+\b/gi` — paired coordinate form only). **No new field or table.** FR-008's change is
purely to `CXRY_RE`'s coverage (add bare `c3` and ranged `c3-c6` forms without eating legitimate
prose) — a regex change, not a data-model change. D3's outcome (if it wires `validateAnnotation` in)
would add a *call*, not a new stored field, to this seam.

## Entitlement signal

**Source**: `docs/architecture/api-conventions.md` `GET /api/user/entitlement` (`~L1034`).

Reused, not extended: the existing response already carries an `authenticated` boolean (confirmed
live by the existing test suite — `server/tests/*entitlement*` per the epic's citations). US3/FR-017
adds **no new field** to this endpoint's contract. **This section previously described a superseded
file map (three lesson screens branching copy) — corrected below; FR-017 in `spec.md` is
authoritative.**

The real chain is `useLessonLockGuard.js` → `sagaLock.js` → `SagaScreen.jsx`/`UpgradeModal.jsx`/
`AuthModal.jsx`, **not** `ConceptScreen.jsx`/`SocraticScreen.jsx`/`CLChallengeScreen.jsx` — those three
screens never render locked-lesson copy at all, because `useLessonLockGuard.js` redirects to `'saga'`
before any of them mount. `useLessonLockGuard.js`'s `authenticated` signal (from
`getEntitlement()`, `src/lib/entitlement.js`) is genuinely new wiring: it is not currently threaded
into `sagaLock.js`'s `tier` parameter. `sagaLock.js` carries three chained functions —
`deriveLockReason` (`'none'|'tier'|'order'|'both'`), `dispatchLockAction`
(`'upgrade'|'orderLock'|'navigate'`), `deriveLessonAccess` (`'allowed'|'upgrade'|'orderLock'`) — and a
new `'signin'` value threads through all three. `SagaScreen.jsx` (`:305`, currently renders
`UpgradeModal.jsx` on `lockAction:'upgrade'`) gets a `lockAction:'signin'` branch that renders the
**already-existing** `AuthModal.jsx` (precedent: `HomeScreen.jsx:156`) instead — no new component, and
`UpgradeModal.jsx` does not need a second copy/CTA personality once that routing exists.

## Mistake/quality label (`blunders.quality`)

**Source**: `docs/architecture/db-schema.md` `blunders` (`~L221`); confirmed columns and code paths
this session.

| Field | Type | Notes |
|---|---|---|
| `quality` | `text`, `∈ {'blunder','suboptimal'}` | Every row is a mistake row regardless of value — OI-125's invariant ("never filter by `quality` when *counting* mistakes") |

**Two producers, currently allowed to diverge (D4's subject)**:
- `scoreMove(scores, playedCol)` (`server/moveQualityScorer.js:9`) — live, request-time solver
  judgment.
- `classifyStoredMistake(bestScore, playedScore, movestring)` (`server/mistakeStorageRule.js:81`) —
  storage-rule threshold, consulted by `reconstructAnalysisFromBlunders({ existingBlunders, moves,
  side, difficulty, created_at, isPapergames })` (`server/index.js:2223`, called at `:2378`) when
  rebuilding a cached view.

**Confirmed call sites reading/writing `quality`** (broader than a literal `.eq('quality'` grep — no
such literal filter exists anywhere; all are in-process equality checks, per this session's
research):
1. `server/evaluateMoveHandler.js:109` (`suppressCreationPraise`)
2. `server/index.js:2249` (`if (blunder.quality === 'suboptimal') cSuboptimal++;`)
3. `server/index.js:2498-2499` (`optimalCount++`/`suboptimalCount++`)
4. `server/gameSampling.js:170`
5. `server/insertGameBlunder.js:28`
6. `server/moveQualityScorer.js:39,55`
7. `server/papergamesImporter.js:116`
8. `server/scripts/debug_blunders_for_room.mjs:84`, `server/scripts/reprocess_blunders.mjs:55`
   (offline scripts — out of scope for the "guard at more than one call site" FR-021 requirement,
   which concerns live-path call sites)

FR-021's "named in code, guarded at more than one of five call sites" requirement should be
re-scoped at task-execution time against this list (8 sites found, broader than "five") and against
`server/blunderCountsForGames.js` specifically (named directly by OI-125's own "Area" field per this
session's research — not yet grepped/confirmed as a `quality`-touching file, flagged as a
task-level TODO, not resolved here).

**Meaning change introduced by this feature**: D4's resolution changes which of the two producers is
authoritative — this is exactly `deployment_steps.md`'s Standing Checklist item 2 ("changed detector
output" analog for a scoring rule rather than a pattern predicate). If D4 resolves toward
`classifyStoredMistake` (this plan's recommended default), the live-analysis path
(`scoreMove`-fed code) is the one that changes behavior; no backfill of already-stored `blunders` rows
is needed since the storage rule is already what's stored. If D4 resolves the other way, a required
deploy step follows — but per the owner directive (no live data worth preserving), it need not be a
careful backfill or on-read re-derivation of every existing row; the simpler option (documented as a
deploy step, not built as repair tooling) is acceptable. **Flagged explicitly** so it is not silently
missed if D4 resolves against this plan's recommendation.

## Migration ledger (`schema_migrations`)

**Source**: `server/migrate.js:22,28-29,79-93`; live query this session (see `research.md`).

| Field | Type | Notes |
|---|---|---|
| `filename` | `TEXT PRIMARY KEY` | Tracked by full filename string, not numeric prefix — two files sharing a numeric prefix (`061_correct_cols.sql`, `061_security_lints.sql`) do not collide in this table |
| `applied_at` | `TIMESTAMPTZ DEFAULT now()` | Not otherwise used by this feature |

**No schema change.** This feature's US5 work applies the existing 4-migration backlog
(`061_correct_cols.sql`, `062`, `063`, `064`) to staging and production, per each migration's own
pre-existing `docs/deployment_steps.md` entry — it does not add a 065th migration file for this
feature's own purposes (no new column/table is introduced).
