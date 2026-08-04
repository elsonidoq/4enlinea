**Verification of the 16 in-scope OIs:** all 16 (OI-92, OI-86, OI-83, OI-130, OI-126, OI-124, OI-129, OI-98, OI-95, OI-41, OI-104, OI-125, OI-82, OI-5, OI-31, OI-105) appear in the spec's Traceability table, each mapped to at least one FR, and FR-027 imposes a blanket closeout obligation. No OI is orphaned. D1–D4 are preserved as instructed, the "NOT included" list matches the epic's 32 exclusions verbatim, and no Settled decision is contradicted. The issues below are substantive gaps, not template violations.

## Blocking issues

**1. FR-003 mandates an outcome that is arithmetically impossible, using numbers from the wrong database.**

FR-003 says seven puzzle categories "MUST be filled by a promotion pass requiring no solver calls." A "promotion pass" means moving already-generated puzzle candidates out of a review queue and marking them live — cheap, because it needs no calls to the solver. The floor is 20 live puzzles per category. But the queued inventory the spec itself cites (spec.md lines 64-66, harvested from `docs/open_issues.md` OI-86) is: `forbidden_columns` 30, `figure_7` 21, `j_shape` 14, `odd_even_threat` 13, `overcut` 9, `claimeven` 7, `z_threat` 3 — against a starting count of **zero live puzzles** in each. Only two of the seven can reach 20 by promotion; five cannot, and `z_threat` misses by 17. Worse, OI-86 states verbatim that all of these are **local-DB** measurements ("the local DB has…"), while FR-001 and SC-001 correctly demand the fix on **staging and production**. Candidates queued in a developer's local database cannot be promoted into production. So the spec's central US1 remedy rests on an inventory that is both insufficient and in the wrong environment.

*Recommended fix:* Restate FR-003 as an outcome ("no category is served below the 20-puzzle floor on staging or production"), not a method. Add a requirement that the queued-candidate inventory be measured **per environment** before any remedy is chosen, and make the remedy conditional on that measurement. Then widen D2 from `forced_win`-only to "any category still short after promotion."

**2. The only fallback remedy — "hide the category from serving" — has no requirement describing it.**

FR-004 permits `forced_win` to be "hidden from serving with the decision recorded," and SC-001 is carefully scoped to "every puzzle category the app **serves**." Both presume the app can be told to stop offering a category. Nothing in the spec requires that capability to exist, describes what a user sees when a category disappears (does the category list shrink? does a menu entry become disabled? does an existing in-progress session break?), or asks for a test. Given issue 1, this is not an edge case for one category — it is the likely remedy for up to six. If the capability does not already exist, it is unbudgeted implementation work sitting on the critical path of the highest-priority story, and it brushes against Settled decision 3 ("no new screen or category behavior").

*Recommended fix:* Add a functional requirement covering below-floor exclusion: the gate's trigger, the user-visible result, and a test. Add an acceptance scenario to US1. Confirm against the code whether the gate exists before planning.

**3. US5's release gate can be satisfied without improving anything.**

US5 exists because `npm run test:fast` currently fails 5 tests, so a green run proves nothing. But FR-022 accepts the suite being "red only for failures individually enumerated and justified," and SC-008 accepts "a failure count that exactly matches a written, justified list." Neither sets a floor. Writing down the five existing failures and calling them justified literally satisfies both — which is the status quo with a document attached. Separately, FR-023 prescribes a specific code change (repoint two tests at `server/scripts/fv_suff/`, dropping a filename prefix) derived from a 2026-08-03 measurement that the spec's own Assumptions section says must be re-taken; and it requires only that those tests "run and assert," not that they pass. A test that runs and then legitimately fails would satisfy FR-023 while leaving the gate red.

*Recommended fix:* Give FR-022 a hard target — zero failures at close, or a named list where each remaining failure carries its own `OI-N` and a stated reason it is out of scope. Require the two repointed tests to **pass**. Rewrite FR-023 as the outcome ("both tests execute their assertions against a corpus that exists") and drop the prescribed path, which belongs in the plan after re-measurement.

## Decisions required

**1. How do we get puzzle categories to the 20-puzzle floor, given that promotion alone cannot?**
- (a) Generate fresh candidates for every short category.
- (b) Hide every below-floor category at launch; log generation as a post-launch `OI-N`.
- (c) Generate only for the categories closest to the floor (`j_shape` 14, `odd_even_threat` 13); hide the rest.

*Recommended default:* **(b)**, with the per-environment measurement taken first. This decision supersedes D2 as currently written, since D2 wrongly assumes `forced_win` is the only category needing it.

**2. Does the stale-answer-data audit cover only `overcut`, or every category graded the same way?**
Reading `connect-four/server/predicates.js`, two other categories grade the identical way — `undercut` (line 349) and `z_threat` (line 309) — and `undercut` has 25 live puzzles. The epic and spec scope the audit to `overcut` alone, but SC-002 promises "zero live puzzle rows grade a mathematically correct player answer as incorrect," a claim broader than the evidence it collects.
- (a) Keep the audit at `overcut`.
- (b) Run the read-only re-derivation audit across all three metadata-graded categories; repair only where drift is found.
- (c) Audit all three and narrow SC-002's wording to `overcut`.

*Recommended default:* **(b)**.

## Smaller findings deliberately dropped (below the top-3/top-2 limit, but real)
- FR-011 lets a 0% measured failure rate close OI-129 with no floor on sample size.
- FR-014's "verified in a real browser" has no named owner and may collide with Settled decision 4.
- The priority numbering (US3 = P5) will make `/speckit-tasks` treat US1 alone as the MVP slice, which is probably not what the owner wants from a launch-gate spec.
