# FR-022 / FR-022a minimum-viable-pool threshold

## The threshold: N = 20 active puzzles, for EVERY category

**Owner decision, 2026-07-30**: *"The thresholds should be the same for all categories, unless we
have a clear reason to do something different for a specific category."* There is currently **no
such reason for any category**, so one number governs all twelve. The per-category numbers an
earlier pass set (`undercut` 14, `overcut` 1) are superseded by this and kept below only as the
measurement record that produced them.

**Why 20, grounded in measured data rather than invented** (Decision D4): the pools that actually
serve today are `double_threat` 100, `forced_block` 100, `immediate_threat` 66, `undercut` 25.
The smallest pool anyone currently considers serviceable is `undercut` at 25, so the floor sits
just under it. Below ~20 a learner drilling a single category starts seeing the same board twice
in one session, which is the point at which pool size becomes visible to the user.

### What the threshold gates — read this before applying it

**The threshold is absolute. A category below 20 active puzzles is not servable, whatever put it
there.** There is no "pre-existing" exemption: a category at 0 cannot serve a single drill, and
that is the most depleted state possible — exactly what FR-022 exists to stop shipping silently.

**The remedy is always the same: generate and promote more puzzles. Never lower the threshold, and
never exempt a category for having been broken already** (owner, 2026-07-30: *"why don't just
generate more puzzles if the threshold is not met?"*). Note `audit_answer_ambiguity.mjs --repair`
can only *replace* rows, never seed a category from zero — it throws
`'no existing <category> row to inherit goal_prompt from'` — so a zero-row category needs a
generation + promotion pass instead. Valid, unpromoted candidates are usually already waiting; see
memory `feedback_generate_puzzles_for_local_qa`.

**"Caused by this change" is for diagnosis, not exemption.** Recording whether a change depleted a
pool, or merely inherited an empty one, tells you *which* remedy to reach for — FR-023's
replace-not-exempt repair for a change-caused drop, a generation + promotion pass for an empty
category. It never decides whether the category is allowed to ship below the floor. It isn't.

*(An earlier version of this section exempted already-below-threshold categories on the grounds
that the gate would otherwise "block every future change forever." That was wrong twice over: the
block lasts only until the pools are filled — a finite job, with candidates already queued for
every empty category — and exempting the worst-depleted categories reopens precisely the loophole
FR-022 was written to close. The real risk it was reaching for is alert fatigue, when a gate is red
for reasons unrelated to your diff; the answer to that is to fill the pools so the gate is
meaningfully green, not to stop counting the failures.)*

### Status of all twelve categories against N = 20 (local DB, post-backfill 2026-07-30)

| Category | Active puzzles | vs. N=20 | Remedy needed (diagnosis only — every "below" is a blocker) |
|---|---|---|---|
| `double_threat` | 100 | pass | — |
| `forced_block` | 100 | pass | — |
| `immediate_threat` | 66 | pass | — |
| `undercut` | 25 | pass | — (28 → 25 under the new floor, still above N) |
| `forced_win` | 0 | **BELOW — blocks** | 1 → 0; the backfill retired its only row as AMBIGUOUS (OI-83). 2 valid candidates pending promotion. |
| `overcut` | 0 | **BELOW — blocks** | never curated here; 9 valid candidates pending promotion |
| `figure_7` | 0 | **BELOW — blocks** | never curated here; 21 valid candidates pending promotion |
| `j_shape` | 0 | **BELOW — blocks** | never curated here; 14 valid candidates pending promotion |
| `odd_even_threat` | 0 | **BELOW — blocks** | never curated here; 13 valid candidates pending promotion |
| `claimeven` | 0 | **BELOW — blocks** | never curated here; 7 valid candidates pending promotion |
| `z_threat` | 0 | **BELOW — blocks** | never curated here; 3 valid candidates pending promotion |
| `forbidden_columns` | 0 | **BELOW — blocks** | never curated here; 30 valid candidates pending promotion |

**Eight of twelve categories are below the floor in the local DB and each one is a blocker.** All
eight have valid, `correct_cols`-populated candidates already sitting in the curation queue, so
clearing this is a promotion pass, not a generation project. Measured against **local** only —
staging and production have their own pools, unmeasured here.

---

## Measurement record (supersedes nothing above — this is how the original per-category numbers were derived)

# FR-022 / FR-022a minimum-viable-pool thresholds — undercut & overcut

Recorded 2026-07-29, US2 (T024–T035). Per research.md Decision D4, these thresholds are set
**from measured before/after data**, not invented in advance. Measurement path: `node
server/scripts/audit_answer_ambiguity.mjs --puzzles <category> --env local` (T004's
cross-checked script) — the single measurement path per Decision #2. Both measurements below are
**pre-backfill dry runs**: `correct_cols` is `NULL` for every row at measurement time (no
backfill has run); only the in-memory code fix (T024/T025 for undercut, T032 for overcut) was
toggled in/out of the working tree between the "before" and "after" runs.

## undercut (FR-021/FR-022)

**Before** (T028 — `checkUndercutPredicate`/`evalUndercut` pre-fix, i.e. the OI-61-item-1 defect
still live: every non-killing column marked correct with no score check):

```
28 board(s) audited — LOST-POSITION: 21, OK: 7
```
28/28 active rows pass (as expected — the unfixed code cannot fail its own audit).

**After** (T029 — same 28 rows, `checkUndercutPredicate`/`evalUndercut` with the T024/T025
relative-solver-safety-floor fix applied):

```
>> NO-CONCEPT  puzzle 4e192c6b-26f1-42ee-a069-bed436bbce77 (undercut)
               board 3333334512652222610601001264
               accepted []  optimal [4] (display 5)  scores [-7,-7,-1000,-1000,-1,-7,-7]
>> NO-CONCEPT  puzzle add44b30-abef-49f6-85bf-2fdff09793b6 (undercut)
               board 2422424220446111113
               accepted []  optimal [3] (display 4)  scores [-11,-11,-1000,-2,-11,-11,-11]
>> NO-CONCEPT  puzzle e8010e1f-a3c1-47fc-9962-4aa4ad8bd7e4 (undercut)
               board 333302050055533515111212
               accepted []  optimal [2] (display 3)  scores [-9,-9,-2,-1000,-9,-1000,-9]

28 board(s) audited — LOST-POSITION: 18, OK: 7, NO-CONCEPT: 3
```

**Delta**: 28 passing → 25 passing (7 OK + 18 LOST-POSITION), 3 newly-failing as `NO-CONCEPT`
(their entire non-killing answer set collapsed under the floor — every non-killing column on
those three boards concedes strictly worse than the board's own optimum). Retention: 25/28 =
**89.3%**.

**Threshold set (FR-022)** *(SUPERSEDED 2026-07-30 by the uniform N = 20 above — retained as the
measurement record)*: **N = 14** active `undercut` puzzles (50% of the pre-fix pool of 28),
chosen as a round, defensible floor below which serving variety would visibly degrade (fewer than
~half the original pool risks the same board repeating too often for a learner drilling this
category). The measured after-count (25) is well above this floor (25 ≥ 14) —
**no remediation required** for undercut. If a future change (e.g. the US3 backfill, run against
the real `checkPredicate` for every row) drops the active undercut count below 14, that MUST
trigger `audit_answer_ambiguity.mjs --repair --yes --puzzles undercut` (FR-023, replace-not-exempt)
before ship.

## overcut (FR-021a/FR-022a)

**Before** (T031 — pre-F1-fix `checkOvercutPredicate`, no uniqueness guard):

```
0 board(s) audited —
```

**After** (T033 — post-F1-fix `checkOvercutPredicate`, `if (result.correctCols.length !== 1)
return { passes: false, correctCols: [] }` guard added):

```
0 board(s) audited —
```

**Delta**: 0 → 0. Direct DB query (`puzzles` table, `is_active = true`, grouped by `category`)
confirms the local DB has **zero** `overcut` rows at all — the active-row categories present
locally are only `double_threat` (100), `forced_block` (100), `immediate_threat` (66),
`undercut` (28), and `forced_win` (1); `overcut`, `z_threat`, `claimeven`, `figure_7`, `j_shape`,
and `odd_even_threat` all have 0 active rows in this local DB. This is a **pre-existing gap
unrelated to this feature** — no overcut puzzle has ever been generated/promoted into this local
`puzzles` table — not something T032's uniqueness-guard fix caused or could have caused (a guard
cannot shrink a pool that was already empty).

**Threshold set (FR-022a)** *(SUPERSEDED 2026-07-30 by the uniform N = 20 above)*: **N = 1** (the only floor that is meaningful against a zero-row
baseline: any future overcut generation/backfill must not *knowingly* leave the category at zero
active rows once puzzles for it exist — this is a placeholder floor to be revisited with real
data once `overcut` candidates are actually generated and promoted, per this feature's own
Correction note that "a milder tightening... retired 7 perfectly good undercut puzzles" — the same
risk cannot be assessed for overcut today because there is no live pool to measure a tightening
against).

**Remediation**: **not triggered and not possible from this batch.** `audit_answer_ambiguity.mjs
--repair --yes --puzzles overcut` requires at least one existing failing row to retire and to use
as a template (`repairPuzzles` throws `'no existing <category> row to inherit goal_prompt from —
repair by hand'` when the category has zero rows). Populating `overcut` puzzles from scratch is
candidate generation/curation work, out of scope for T024–T035 (which only fixes the *predicate*,
not the empty pool) — flagged here as a gap for whoever next runs the real backfill (US3, T048)
or generates fresh `overcut` candidates, not silently left unmeasured.
