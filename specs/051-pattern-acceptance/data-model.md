# Data Model: Pattern Acceptance

## New column: `correct_cols`

Added to both `puzzles` and `candidates` (migration `061_correct_cols.sql`, following the
`016_correct_col.sql` precedent for the existing scalar):

| Column | Type | Nullable | Default | Tables |
|---|---|---|---|---|
| `correct_cols` | `integer[]` | YES | `NULL` | `puzzles`, `candidates` |

- **0-indexed columns** (0–6), same convention as `correct_col` and every other column-index field
  in this codebase (`docs/architecture/index-conventions.md`).
- **Always stored in ascending column-index order** (FR-016a) — enforced once, centrally, at the
  single point both generation and the backfill write from (`checkPredicate` in
  `candidate-generator.js` — see `research.md` Decision D6). The first element carries no ranking
  meaning; it is simply the lowest-indexed accepted column.
- **Populated for every category with a matching pattern** — an empty array (`{}`, i.e. `[]` in
  JS) means the board does not satisfy the category at all and should never reach an active row
  at generation time (`checkPredicate` rejects candidates with an empty `correctCols` via the
  existing `answerSetHolds` gate, unchanged by this feature). **For a pre-existing row the backfill
  touches, an empty-but-non-null result is a data defect, not a valid state for an active row**: per
  FR-016b, the backfill MUST deactivate (`is_active = false`) any row whose recomputed `correctCols`
  comes back empty, rather than writing `{}` to a row left active. This is distinct from `NULL` (a
  row the backfill has not yet processed), which the grading-time fallback (FR-024a, below) handles
  separately — the two states must never be conflated.
- **`forbidden_columns` — corrected 2026-07-29 (owner clarification #5)**: the prior version of this
  document stated that this category's stored columns "are the ones to avoid." That is **factually
  wrong** and is corrected here: `checkForbiddenColumnsPredicate` returns `correctCols: safeCols`
  (`candidate-generator.js:243`) — i.e. `correctCols`/`correct_cols` for this category holds the
  **accepted/safe** columns, exactly like every other category, not the forbidden ones. The error
  originated in a stale comment inside `checkPredicate` itself
  (`candidate-generator.js:476-477`, *"forbidden_columns is exempt: its `correctCols` are the columns
  to AVOID..."*) — that comment must be corrected in the same change (see spec.md FR-020's added
  bullet), not just this doc. What genuinely differs for `forbidden_columns` is the **drill's taught
  answer**, which is the *complement* of the stored/accepted set — the UI teaches "avoid these
  columns," not "play one of these." This two-meanings distinction ("safe columns" for the invariant
  machinery vs. "forbidden columns" for the drill's displayed answer) is a real, open question about
  whether the field should be renamed or split, but it is **explicitly out of scope for this
  feature** (owner clarification #4, 2026-07-29) — noted here for the record, not acted on.
  `correct_cols` is not populated/consulted for this category by the new stored-set grading branch
  (FR-024); `forbidden_columns` grading is unaffected by this feature.

## Relationship to the legacy `correct_col` scalar (FR-017/FR-019)

`correct_col` (existing, `016_correct_col.sql`) is **kept and synced** as `correct_cols[0]` (or
`NULL` when `correct_cols` is empty/absent) — written at both generation time and backfill time,
in the same write that populates `correct_cols` (centralized inside `checkPredicate`, see
`research.md` Decision D6). This is a **deliberate, temporary duplicate** source of truth for the
duration of this feature, not an oversight. Full retirement (migrating the 105 references across
22 files off the scalar, then dropping the column) is tracked separately as `docs/open_issues.md`
OI-81 and is explicitly out of scope here — **no drop migration is part of this feature.**

**Carve-out (Blocking #2a, owner 2026-07-29): `undercut` and `overcut` keep `correct_col = NULL`
regardless of `correct_cols[0]`.** These two categories deliberately store no single correct column
today, per in-code comments at `candidate-generator.js:345,358`. Applying the general sync rule to
them would write a semantically meaningless value (typically column 0, the lowest legal column,
since `undercut`'s accepted set is "every legal column except the killing one") into a scalar that
real consumers already treat as "no scalar for this category" — `src/components/CurationWorkspace.jsx:262-263`
draws a `'hint'` marker at `candidate.correct_col` (today: nothing drawn, because it is `null`),
`src/components/admin/PuzzlePickerModal.jsx:111` prints `col {puzzle.correct_col}`, and
`server/index.js:2445`/`:2497` return `correctCol: puzzle.correct_col` to clients. The sync point
(D6) MUST special-case these two categories to write `NULL` unconditionally, not `correct_cols[0]`.

## Migration: `061_correct_cols.sql`

```sql
-- Migration 061: Add correct_cols column to puzzles and candidates tables.
-- HUMAN REVIEW REQUIRED before applying to production.
--
-- Spec 051 (Epic 1, Pattern Acceptance): the full solver-gated answer SET for a puzzle's taught
-- pattern, computed once at generation time and stored — replacing per-request re-derivation of
-- "which columns count as correct." Sits alongside the existing correct_col scalar (016_correct_col.sql),
-- which is kept and synced as correct_cols[0] for this feature (see docs/open_issues.md OI-81 for
-- the deferred full retirement of correct_col). Always stored in ascending column-index order
-- (no ranking meaning — see docs/architecture/data-model.md "Correct Column Storage").

ALTER TABLE public.puzzles
  ADD COLUMN IF NOT EXISTS correct_cols integer[] DEFAULT NULL;

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS correct_cols integer[] DEFAULT NULL;
```

No `GRANT` statements are needed: `016_correct_col.sql`'s `GRANT SELECT, INSERT, UPDATE, DELETE ON
public.puzzles/candidates TO anon, authenticated` already covers all columns on these tables
(Postgres column-level grants are not used here — table-level grants apply to every column,
including newly added ones); re-verify this against the live schema before applying, since a
column-level `GRANT` policy elsewhere would be a surprise this plan did not anticipate.

## API field mapping

| Field | Direction | Convention |
|---|---|---|
| `puzzleId` (request body, NEW) | client → server | puzzle row UUID, selects the stored-set grading branch (FR-024) |

**`correct_cols` is NOT added to the `/api/evaluate-move` response** (owner clarification #2,
2026-07-29 — see `research.md` Decision D2b: client-side grading was considered and explicitly
rejected as an early optimization, addable later with no rework). The response shape is unchanged;
grading stays server-side on both branches.

**Grading, stored-set branch (FR-024)**: `accepted = puzzle.correct_cols.includes(playedCol)` —
computed directly server-side, with the seven pattern evaluators bypassed entirely (see
`research.md` Decision D2a for the full trace). **If `puzzle.correct_cols` is `NULL`** (row not yet
backfilled), the handler falls through to the row-less, computed-live branch instead of grading
every column wrong (FR-024a) — this is a distinct state from an empty-but-non-null `correct_cols`,
which is a data defect the backfill prevents by deactivating the row (FR-016b, above).

No new frontend-facing index transformation — the existing "0-indexed everywhere except the
display layer" rule (`index-conventions.md`) applies unchanged to every element of `correct_cols`.
