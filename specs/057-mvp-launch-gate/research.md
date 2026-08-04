# Phase 0 Research: MVP Launch Gate

All findings below were produced by re-measurement during this planning session (2026-08-03), not
carried over from the epic's dated research, per Settled Decision 7 ("every measurement in this file
is dated and must be re-taken at the start of the run"). Where a finding contradicts the epic or
spec text, the contradiction is stated explicitly rather than silently corrected.

## Re-measured baseline

### `npm run test:fast` (from `connect-four/`)

1677 tests, 1672 pass, **5 fail** — the same count as the epic's dated "5 RED," but all five share
**one** root cause, not two as the spec's FR-023 framing suggests:

| File | Line | Literal | Failure mode |
|---|---|---|---|
| `server/tests/branchInvariance.test.mjs` | `:12` | `const CORPUS = join(__dirname, '../scripts/reason_evidence_boards_coverage_2026-07-02T11-37-56Z.jsonl');` | ENOENT at module load — 1 test never registers |
| `server/tests/causalLinksComposers.test.mjs` | `:11` | same literal | ENOENT at module load |
| `server/tests/reasonRenderFixes.test.mjs` | `:10` | same literal | ENOENT at module load |
| `server/tests/renderCoverageCorpus.test.mjs` | `:10` | same literal | ENOENT inside a test body — this is the spec's "test #1" |
| `server/tests/renderCoverageUniverse.test.mjs` | `:14` | `const EVIDENCE_FILE = join(__dirname, '../scripts/reason_evidence_boards_coverage_2026-07-03T17-14-51Z.jsonl');` | ENOENT inside a test body — this is the spec's "test #2" |

**Real corpus location** (confirmed via `find` from repo root):
`connect-four/server/scripts/fv_suff/reason_evidence_boards_coverage_2026-07-02T11-37-56Z.jsonl` and
`connect-four/server/scripts/fv_suff/reason_evidence_boards_coverage_2026-07-03T17-14-51Z.jsonl` both
exist. The `reason_evidence_` filename prefix in the epic's dated hint is correct; the only wrong
part of every file's literal is the missing `fv_suff/` directory segment between `../scripts/` and
the filename.

**Decision**: Fix all 5 files' path literal (add `fv_suff/`), not just the 2 the spec names as the
FR-023 floor. **Rationale**: the fix is identical and one line per file; doing all 5 clears
`test:fast` to zero failures, satisfying FR-022's stronger "zero failures, or each carries an OI-N"
bar rather than leaving 3 files' worth of red that would otherwise need their own `OI-N` justification
for no reason — there is no cost difference between fixing 2 and fixing 5. **Alternative considered**:
fix only the 2 FR-023 names and open new `OI-N`s for the other 3 — rejected as pure overhead with the
identical root cause already diagnosed.

**Verification note for tasks.md**: each of the 5 files has its own string literal (not a shared
constant/import) — grep for `reason_evidence_boards_coverage_2026-07-0[23]` across
`server/tests/*.test.mjs` before closing this out, in case a 6th file was added to the same pattern
by a concurrent session since this measurement.

### Pool counts per environment — TODAY (epic's numbers are stale; do not reuse them)

**Local** (`connect-four/server/.env`, floor N=20):

| Category | Active | vs floor | Pending candidates |
|---|---|---|---|
| double_threat | 100 | pass | 3 |
| forced_block | 100 | pass | 30 |
| immediate_threat | 66 | pass | 30 |
| undercut | 25 | pass | 7 |
| forbidden_columns | 30 | **pass (was 0 in epic)** | — |
| forced_win | 1 | BELOW | 2 |
| overcut | 1 | BELOW | 48 (was 9 in epic) |
| figure_7 | 0 | BELOW | 21 |
| j_shape | 0 | BELOW | 14 |
| odd_even_threat | 0 | BELOW | 13 |
| claimeven | 0 | BELOW | 7 |
| z_threat | 0 | BELOW | 3 |

7 of 12 categories below floor locally today, not 8 — `forbidden_columns` cleared itself between the
epic's triage and this session (a concurrent session promoted or generated into it). This is the
"measurements expire" risk from Settled Decision 7 materializing directly, not a hypothetical.

**Staging** (`connect-four/server/.env.staging`) — queried live, read-only, this session:

```
immediate_threat 15, forced_block 10, double_threat 10, forced_win 7, forbidden_columns 10,
odd_even_threat 10, z_threat 10, claimeven 10, undercut 10, overcut 10, figure_7 10, j_shape 10
```

**All 12 categories are below the N=20 floor on staging.** Total active: 122. Staging's `candidates`
table has **zero pending rows for any category** (`status='pending'` query returns empty) — every
category on staging needs fresh generation; promotion alone cannot clear staging's floor for any
category. This directly contradicts the epic's framing ("a category short locally may already clear
the floor on production, or vice versa") in the direction of "worse than assumed," not better.

**Production** (`connect-four/server/.env.production`) — queried live, read-only, this session:

```
claimeven 18, double_threat 25, figure_7 17, forbidden_columns 28, forced_block 30, forced_win 29,
immediate_threat 30, j_shape 31, overcut 11, undercut 30, z_threat 30
```

`odd_even_threat` is **0 active** on production (absent from the grouped query result; confirmed by a
direct `count` query). Below floor on production: `claimeven` 18, `figure_7` 17, `overcut` 11,
`odd_even_threat` 0 — 4 of 12. Production's pending `candidates` cover only `claimeven` (20),
`double_threat` (30), `immediate_threat` (30) — `figure_7`, `overcut`, and `odd_even_threat` have
**no promotable candidates on production** and need fresh generation there specifically.

**Decision**: FR-003/FR-004's "promote first, generate only if needed" split must be evaluated **per
category per environment**, not once per category globally. Example: `overcut` is promotion-eligible
locally (48 pending) but generation-only on both staging and production (0 pending candidates on
either). `tasks.md` should generate one task per (category, environment) pair that is below floor,
each stating whether it's a promotion or a generation task based on that environment's own pending
count — not inherit the local answer. **Rationale**: mechanically, `pool-thresholds.md`'s "how to
fill a category" procedure is per-environment already; this plan makes explicit that the *remedy
type* (not just the count) can differ by environment for the same category.

**These counts are already a SECOND measurement** — `forbidden_columns` self-healed 0→30 between the
epic's original triage and this planning session, purely from a concurrent session's unrelated work.
Treat every count above as dated the moment this file was written, not as current at execution time:
`tasks.md`'s pool-fill tasks MUST re-measure immediately before acting on any of these numbers, per
Settled Decision 7 ("every measurement expires"). This is exactly the failure mode Settled Decision 7
exists to catch, not a hypothetical.

### Pool counts per environment — re-measured 2026-08-04 (T006, Batch 1)

Re-queried read-only, all three environments, via a grouped `count`-per-category query against
`puzzles` (`is_active=true`) and `candidates` (`status='pending'`) for all 12 categories. **Zero
drift from the numbers above** — every count matches the prior dated measurement exactly. Recorded
here per Settled Decision 7 ("every measurement expires") as its own dated snapshot, not a silent
overwrite of the numbers above.

**Local** (`connect-four/server/.env`, floor N=20) — Total active: 323. Below floor (7/12):
`forced_win` 1, `overcut` 1, `figure_7` 0, `j_shape` 0, `odd_even_threat` 0, `claimeven` 0,
`z_threat` 0. All others pass (`double_threat` 100, `forced_block` 100, `immediate_threat` 66,
`undercut` 25, `forbidden_columns` 30).

**Staging** (`connect-four/server/.env.staging`, `jkqilynpshutqcceopdn.supabase.co`) — Total active:
122. **All 12/12 categories still below floor**: `double_threat` 10, `forced_block` 10,
`immediate_threat` 15, `undercut` 10, `forbidden_columns` 10, `forced_win` 7, `overcut` 10,
`figure_7` 10, `j_shape` 10, `odd_even_threat` 10, `claimeven` 10, `z_threat` 10. Pending
`candidates`: 0 for every category (confirmed again — no promotion path exists on staging for any
category).

**Production** (`connect-four/server/.env.production`, `kxtqwsumojtexokrtlfp.supabase.co`) — Total
active: 279. Below floor (4/12): `overcut` 11, `figure_7` 17, `odd_even_threat` 0, `claimeven` 18.
All others pass: `double_threat` 25, `forced_block` 30, `immediate_threat` 30, `undercut` 30,
`forbidden_columns` 28, `forced_win` 29, `j_shape` 31, `z_threat` 30. Pending `candidates`:
`double_threat` 30, `immediate_threat` 30, `claimeven` 20 — `figure_7`, `overcut`,
`odd_even_threat` still have zero promotable candidates on production.

Both staging and production were reachable and queried successfully — neither environment was
unreachable during this measurement. The measurement script used
(`node <script> <envfile>`, read-only `count: 'exact', head: true` queries against `puzzles`/
`candidates`, no writes) is preserved at
`/private/tmp/claude-501/.../scratchpad/pool-counts.mjs` for this session only — it was not checked
into the repo since `fill-candidate-pools.mjs` (T009, a later task in this batch sequence) already
owns per-(category,environment) counting as part of its dry-run report.

### T008 (Batch 1, 2026-08-04) — read-only highlight_metadata audit, overcut/undercut/z_threat, staging + production

Read-only, no writes. Reused `server/scripts/repair-overcut-highlight-metadata.js`'s dry-run/diff
logic (canonicalized-JSON comparison of `highlight_metadata`, driven by `checkOvercutPredicate` /
`checkUndercutPredicate` / `checkZThreatPredicate` in `server/candidate-generator.js`) via a
throwaway audit script, extended to all three metadata-graded categories per this task's widened
scope. The audit queries every row in both `puzzles` and `candidates` for the category (matching the
original script's own query shape — not filtered to `is_active`/`status='approved'` only), against
the CURRENT detector, as changed by T005.

**Important dependency discovered mid-audit**: staging's and production's `puzzles`/`candidates`
tables still carry the LEGACY `correct_col` singular scalar column — **not** `correct_cols` (array)
. Confirmed by selecting a live row's keys on both environments: both list `correct_col`, neither
lists `correct_cols`. This is the same `061_correct_cols.sql` unapplied-migration finding T019
records for a different reason. Consequence for T005 specifically: **the correctCols cross-check
this batch just shipped is INERT on staging and production today** — `puzzle.correctCols` will be
`undefined` for every row built from live data until that migration ships, so T005's fix only
protects `/api/evaluate-move` callers once `061_correct_cols.sql` is applied to both environments.
This audit therefore compares `highlight_metadata` only (matching the original script's own
comparison surface, which never touched `correct_cols` either).

**overcut** — staging: identical 12, stale 4, ambiguous 0, no_longer_matches 4 (across
puzzles+candidates, 10 rows each table = 20 total). production: identical 12, stale 8, ambiguous 0,
no_longer_matches 2 (11 rows each table = 22 total). **These numbers are an EXACT match to the
existing `OI-92` table** (staging: 6+6 identical / 2+2 differs / 2+2 fails = 12/4/4; production:
6+6 identical / 4+4 differs / 1+1 fails = 12/8/2) — overcut has not drifted further since OI-92 was
last measured (2026-07-30).

**undercut** — staging: identical 20, stale 0, ambiguous 0, no_longer_matches 0 (fully clean).
production: identical 56, stale 0, ambiguous 0, no_longer_matches 4 — movestrings
`13365353214264620046` and `35054462343613031`, one puzzles-row and one candidates-row each, no
longer match `detectUndercutVictim` at all under the current detector. **This is NEW drift OI-92
never covered** (OI-92 is scoped to `overcut` only). Zero rows have differing `highlight_metadata`
(the specific shape T005's fix protects against) on either environment — undercut's live drift is
entirely "no longer matches," not "stale metadata."

**z_threat** — staging: identical 20, stale 0, ambiguous 0, no_longer_matches 0. production:
identical 60, stale 0, ambiguous 0, no_longer_matches 0. **Fully clean on both environments** — no
drift of any kind.

**Disposition**: per D1 (retire-and-refill, resolved), all `stale` and `no_longer_matches` rows
above are candidates for `fill-candidate-pools.mjs --apply`'s wholesale category refill (T009,
owner-run per T015) — no in-place repair script is written for undercut/z_threat, matching the
"no second repair script" directive. **The 4 production `undercut` no_longer_matches rows are drift
not yet named in `docs/open_issues.md`** (OI-92 only documents overcut); Batch 2's T016, which closes
out OI-92, should either widen OI-92's scope to cover this or open a new OI-N for it — this batch
(T001-T008) does not touch `docs/open_issues.md` and defers that call to T016 as scoped.

Audit script: throwaway, not checked into the repo (mirrors T009's "no second repair/audit script
lives in the repo" posture); preserved for this session at
`/private/tmp/claude-501/.../scratchpad/audit-t008.mjs`.

### Migration ledger vs disk — the epic's central claim here is stale

`ls connect-four/server/migrations/` (git-clean, `git status --short` empty) shows, among the newest
entries: `...060_paddle_rename_and_payment_events.sql`, **`061_correct_cols.sql`**,
**`061_security_lints.sql`**, `062_candidates_generation_run_unique.sql`,
`063_puzzle_attempts_outcome_narrow.sql`, `064_drop_correct_col.sql`.

`061_security_lints.sql` **is present on disk**, git-committed (`git log`: commit `1fbcd4f`,
"migration: 061_security_lints.sql — Supabase linter security findings"). This directly contradicts
both the epic's and the spec's Non-obvious-fact claim that it is "absent from disk" — that claim has
gone stale since the epic was triaged, exactly the failure mode Settled Decision 7 exists to catch.
**Do not carry the "absent from disk" claim into any OI-105 closeout text.**

Live ledger query (read-only), both environments — `SELECT filename FROM schema_migrations WHERE
filename LIKE '06%'`:

- **staging**: `060_paddle_rename_and_payment_events.sql`, `061_security_lints.sql` — nothing else.
- **production**: identical set.

**Re-derived true state**: both `061` files coexist without conflict under `migrate.js`'s
filename-based tracking (`server/migrate.js:22` `readdirSync(migrationsDir)`; `:28-29` builds a
`Set` of applied filenames from the `schema_migrations.filename` column; `:79-93` applies
disk-minus-applied, in filename sort order — a numeric collision between two *different* filenames
sharing the prefix "061" is not a `migrate.js` bug, since it keys on the full filename string, not
the numeric prefix). The actual gap is a **4-migration backlog**: `061_correct_cols.sql`, `062`,
`063`, `064` have never been applied to staging or production. This is not a "collision to resolve,"
it is "migrations that exist and haven't run yet" — a narrower, more mechanical problem than the
epic's framing suggested.

`064_drop_correct_col.sql` (spec 056, merged to `main` at `9a2b059`) already carries a fully
documented pre-flight check and code-before-migration ordering constraint at
`docs/deployment_steps.md` under "Spec 056 — Legacy `correct_col` scalar retirement." This plan's
US5/FR-025/FR-026 tasks must point at that existing entry for `064`'s own ordering rather than
duplicating it, while still producing:
- OI-31's own required measurement: which connection URL (5432 vs 6543) the live Railway deploy
  actually uses for `migrate.js` on staging (see next section — this is now a documentation-sync
  task more than a discovery task).
- OI-105's own closeout: the true ledger-vs-disk state as measured above, correcting the "absent from
  disk" claim.

### OI-31's "6543 forbidden" framing has already been walked back in the architecture doc

`docs/architecture/server-conventions.md:1501` (confirmed by direct read during the source-citation
research pass for this plan):

> "The **transaction-mode pooler** (port **6543**) is **not the supported configuration** —
> converge on 5432. Two corrections to the previous wording here, both measured 2026-08-02:"

and, per the same research pass, `:1504` states staging's `DATABASE_URL` is on 6543 and has applied 5
migrations successfully through it, with `:1506` explicitly reframing this as "configuration drift to
fix on its own schedule, not... a broken deploy."

**This means `docs/open_issues.md`'s OI-31 entry (still using the original "6543 forbidden for DDL"
rationale as of this session) is itself stale relative to the architecture doc** — the doc was
corrected on 2026-08-02 but the OI entry was not updated to match. FR-025 requires closing OI-31 "by
measuring what URL the deploy actually uses" — that measurement is effectively already recorded in
`server-conventions.md`; this plan's FR-025 task is therefore mostly a **documentation-sync and
issue-closeout task** (update `docs/open_issues.md`'s OI-31 entry to match the already-corrected
architecture doc, and confirm no further code/config change is needed), not a fresh discovery task.
**Decision**: do not re-litigate whether 6543 is safe — the architecture doc has already settled that
empirically; FR-025's job is to propagate that settled answer into `docs/open_issues.md`.

## Owner directive (2026-08-03) — collapses the live-data machinery below

Verbatim from the owner: *"Forget about production data for now. Nobody is using production or
staging, we can drop the entire database and regenerate it if needed. Focus on developing these
fixes as simple as possible, and documenting what should be done in production considering that the
app is not being used yet."* Consequence for this research: nothing below should be read as
justifying idempotent in-place repair machinery, careful retire-vs-repair dispositions, attempt-
history preservation, or multi-phase live rollout choreography. Where regeneration is simpler than
surgical repair, regeneration wins. Production work becomes a `docs/deployment_steps.md` entry —
"deploy, then regenerate" — not tooling whose only purpose is making a live repair safe. This does
**not** weaken the correctness of the detectors/guards/tests themselves.

## D-a (Blocking issue 2) — the named pool-fill tooling cannot reach staging or production

**The problem**: the plan's original tooling for FR-003/FR-004 (`POST
/api/admin/candidates/:id/approve`, `/approve-batch`, `server/scripts/generate_all_candidates.mjs`)
is `requireLocalhost`-gated (`server/adminAuth.js`) and/or solver-bound (the c4solver binary is not
on Railway) — neither can reach staging or production at all, regardless of who runs them.

**Resolution**: a single new owner-run script, `server/scripts/fill-candidate-pools.mjs`, fills a
target environment's pools directly via the Supabase **service-role** client — promoting queued
candidates where they exist, inserting locally-generated rows otherwise (generation itself still
runs locally, against local's c4solver, with the resulting rows exported for the script to insert
remotely). Shape matches the existing `repair-overcut-highlight-metadata.js` precedent exactly:
`--dry-run` is the default posture, a required `--env` flag with no default, a guard that the target
env's `.env` file's project ref matches the named environment, and a typed confirmation before any
write (twice for production). This adds no new serving or auth surface — it is a script, not an
endpoint. Per the owner directive, it does not need to preserve or merge with existing rows;
overwriting/replacing a category's pool wholesale is an acceptable, simpler default. **This same
script is also D1's resolved retire-and-refill mechanism**: stale `overcut`/`undercut`/`z_threat` rows
identified by the audit are retired (`is_active=false`) as part of a category's wholesale refill —
D1 does not require or produce a separate repair script.

## Unresolved Design Decisions — handling in this plan

Per the epic's explicit instruction and the spec's Assumptions section, D1, D3, and D4 were meant to
be resolved via `/speckit-clarify` before planning. This planning run proceeded directly per the
task's instruction. Consistent with Constitution Principle VII ("in the face of ambiguity, refuse the
temptation to guess") and this plan's own Complexity Tracking, D3 and D4 are not silently resolved
here. **D1 was subsequently resolved by the owner (2026-08-03) — see below; it is no longer a
blocking gate.** D3 and D4 are recorded with their options, the evidence gathered this session, and a
recommended default **for planning/task-shape purposes only** — `tasks.md` generation and
implementation MUST treat those two as blocking gates requiring an owner decision (via
`/speckit-clarify` or direct owner sign-off) before the corresponding story's implementation tasks are
executed, not as already-answered.

### D1 (US1) — RESOLVED 2026-08-03: retire and refill

**Options considered**: (a) in-place `UPDATE` of `highlight_metadata` — one write, preserves attempt
history; (b) retire (`is_active=false`) and regenerate fresh candidates to backfill the pool.

**Evidence gathered this session**: The existing `repair-overcut-highlight-metadata.js` script
already implements *both* options for `overcut` specifically (`--apply` for repair, `--apply
--retire` for retirement) — generalizing it was not a build-from-scratch decision, it was a "does the
same two-path script generalize to undercut/z_threat" decision. `evalUndercut`
(`server/predicates.js:348`) additionally checks live solver `scores` for solver-safety beyond just
`highlightMetadata.cells` — a shape difference from `evalOvercut`/`evalZThreat` that any generalized
in-place-repair script would have had to account for with per-category branch logic.

**Owner's answer**: **retire and refill (option b)** — stale `overcut`/`undercut`/`z_threat` rows are
marked inactive and the category is brought back to the N=20 floor by `fill-candidate-pools.mjs`,
which FR-003/FR-004 already require this feature to build. **No second repair script is written**;
`repair-overcut-highlight-metadata.js` is not extended to `undercut`/`z_threat`. Rationale: the
2026-08-03 owner directive (`CLAUDE.md` §"Staging and production databases are disposable
(pre-launch)") removed the "preserves attempt history" weight that used to favor in-place repair — no
row on staging or production is worth keeping — and in-place repair would have required exactly the
per-category branch logic across three different metadata shapes that this plan's own Complexity
Tracking table flagged as the speculative abstraction Constitution II forbids. This does not affect
FR-006's separate grader-correctness requirement (`evalOvercut`/`evalUndercut`/`evalZThreat`
cross-check `correct_cols`, following `evalFigure7`'s pattern) — that fix is still required regardless
of whether the retire-and-refill has run on a given row.

### D3 (US2) — widen the regex only, or wire `validateAnnotation` into the live path?

**Options**: (a) regex-only fix to `CXRY_RE`/`stripInternalTokens` (closes OI-126's specific
reproduction, leaves the systemic "nothing gates the live path" root cause of OI-124/OI-129 open);
(b) wire `annotationGate.js`'s `validateAnnotation` (`server/annotationGate.js:486`) into
`guardExplainMovePayload`/`guardExplainMoveLlmPayload` — closes the systemic gap but adds a
classifier pass to the live explanation hot path (Constitution V's <2s budget) and requires a
failure-policy choice (strip the offending span / retry the LLM / serve-and-log).

**Evidence gathered this session**: `annotationGate.js` is well-tested (per the epic's Non-obvious
facts, 50 unit tests, confirmed still true) and its only current importers are two offline scripts
(`server/scripts/run_eval.mjs`, `server/scripts/corpus_annotation_check.mjs`) plus test files — it
has never been exercised against production latency or production failure volume. No latency
measurement of option (b) exists yet; this is exactly the gap Constitution V flags as needing to be
checked, not assumed, before this decision is finalized.

**Recommended default (planning only)**: regex-only (option a) as the immediately shippable fix for
OI-126's specific, reproduced defect, with option (b) scoped as its own follow-on task **only if** a
latency measurement clears the <2s budget — this avoids blocking OI-126's fix (a known live
reproduction) behind an unmeasured performance question. FR-011's separate measurement (0% or
non-zero failure rate on `explanation_cache` sampling) should run regardless of which option is
chosen, since it's needed to disposition OI-129 either way.

### D4 (US4) — which quality label is authoritative, `scoreMove` or `classifyStoredMistake`?

**Options**: (a) live (`scoreMove`, `server/moveQualityScorer.js:9`) is authoritative — requires
backfilling or re-deriving stored/reconstructed views to match; (b) stored
(`classifyStoredMistake`, `server/mistakeStorageRule.js:81`) is authoritative — requires the *first*
live analysis to stop showing a different answer than what gets stored.

**Evidence gathered this session**: `reconstructAnalysisFromBlunders`
(`server/index.js:2223`, called at `:2378`) already reads from storage — so option (b) is a smaller
code change (align live-analysis-time labeling with the storage rule) than option (a) (which requires
either an on-write backfill or an on-read re-derivation of every reconstructed view). No product
signal was found this session favoring one label's *definition* as more correct than the other's —
this is a genuine product call per the spec's framing, not a code-quality question.

**Recommended default (planning only)**: option (b) — stored (`classifyStoredMistake`) authoritative
— as the lower-risk, smaller-diff path (per Constitution II's preference for the simpler change when
two options are otherwise equal), with the live `scoreMove` call site brought into alignment at the
point of first analysis. **This must be confirmed by the owner before US4's implementation tasks
run.**

## Architecture doc citations used in this plan

- `docs/architecture/api-conventions.md` — Access Guards (`~L145`), `/api/user/*` ownership
  invariants (`~L152`); `GET /api/lessons/:id` entitlement gate (`~L1002`), `GET
  /api/user/entitlement` (`~L1034`).
- `docs/architecture/server-conventions.md` — Category Registry + "Wiring a new puzzle category"
  (`~L87-98`, not touched by this feature — no new category is added, cited only to confirm this
  feature stays within "no new category" per Settled Decision 3); Predicate Evaluator + "Answer sets
  are derived, never re-implemented" (`~L181`); Annotation Gate section (`L1166-1209`); Migration
  Runner + "the ledger tracks FILENAMES, and can diverge from what is on disk" (`~L1493-1513`); the
  6543-pooler correction (`L1501-1506`, quoted above).
- `docs/architecture/data-model.md` — Migration Naming rule (`~L196`): `**MUST**: Use sequential
  3-digit numeric prefix: NNN_slug.sql`, plus the DROP/UPDATE/ADD-constraint ordering rule (relevant
  to US5's migration backlog sequencing).
- `docs/architecture/db-schema.md` — per-table sections: `puzzles` (`~L39`), `candidates` (`~L72`),
  `blunders` (`~L221`), `explanation_cache` (`~L289`); Security posture (`~L372`).
- `docs/architecture/testing-conventions.md` — Test Suite Layout (`~L7`, `connect-four/tests/`
  subdirectory convention: `predicates/`, `classifier/`, `hallucination/`, `integration/`);
  `test:fast` vs `npm test` (`~L514`).

## OI status re-check (16 in-scope issues)

Spot-checked against `docs/open_issues.md` during the source-citation research pass; flagging drift
from the spec's characterization only where found — the full re-verification of each entry's current
text is a task-level activity for the story that owns it, not duplicated here.

- **OI-41**: the spec/epic already correctly narrate this as "verified stale 2026-08-03 and
  narrowed" — confirmed current, no further drift found.
- **OI-31**: drifted, as documented above — the architecture doc's 2026-08-02 correction is not yet
  reflected in the `open_issues.md` entry's rationale text. FR-025's task must close this gap.
- **OI-105**: drifted, as documented above — the "absent from disk" premise is now false. FR-026's
  task must not repeat it.
- All other 13 entries (OI-92, OI-86, OI-83, OI-130, OI-126, OI-124, OI-129, OI-98, OI-95, OI-104,
  OI-125, OI-82, OI-5) were spot-checked for one-line status consistency with the spec's
  characterization and found consistent as of this session — no drift flagged. Re-verify at
  task-execution time regardless, per the "measurements expire" standing risk.
