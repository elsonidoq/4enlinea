## Blocking issues

### 1. `plan.md`'s central design decision contradicts its own `research.md` — and contradicts the spec's acceptance criterion it exists to satisfy

Bug **OI-177**: the generator's post-check reads the model's *raw* answer, so a highlight the guard is about to delete still counts as "present" — the retry that should have fired never fires.

Three artifacts say three different things:

| Artifact | Where the guard-aware check runs | Does it change what retries? |
|---|---|---|
| `spec.md:136-141` (AC 6) | the existing post-check | **"so that spec does trigger a retry"** |
| `research.md:74-83` | "Immediately before the existing `missing = missingRequiredGroups(requiredSet, attempt1)` call (`mechanismExplainer.mjs:221`)", on `attempt1.mechanism` | yes — changes the `missing.length > 0` trigger population |
| `plan.md:130-160` + `data-model.md:50-55` | "after `finalAttempt` is produced (i.e. after any existing retry has already run)", on `finalAttempt.usedSpecs` | **"it does not trigger a second retry… this decision computes the right verdict, it does not re-open the retry design"** |

`plan.md` is the one `/speckit-tasks` reads. Under its version, OI-177 is **not fixed** — the retry still reads the raw string and still never fires; only the recorded diagnostics change. That fails spec AC 6 and epic task 2.6.

**Two further problems, verified at source.** `missingRequiredGroups` is called exactly once, at `mechanismExplainer.mjs:221`, on `attempt1`, and its result *is* the retry trigger — there is no post-retry call site. `plan.md:138` ("Feed **that** array … into `missingRequiredGroups`") and `data-model.md:53` ("in place of `finalAttempt.usedSpecs` directly") both describe editing a call that does not exist. And `missingHandles` (the value `compute.mjs` records) is already computed from `attempt1`.

**Why the plan's stated reason is unfounded.** `plan.md:154` justifies moving the check late with "there is no budget for one; Settled decision 4 stands." Settled decision 4 (epic `:239-250`) forbids adding *a second retry, a second budget, or a new trigger kind*. Making the **existing** single pre-retry check guard-aware adds none of those.

**Fix.** Replace `plan.md`'s Decision 1 body and `data-model.md`'s `postGuardUsedSpecs` section with `research.md`'s version verbatim: guard call on `attempt1.mechanism` immediately before `mechanismExplainer.mjs:221`, `survivedSpecs = attempt1.usedSpecs.filter(...)` passed into the existing `missingRequiredGroups` call. Delete the "does not trigger a second retry" paragraph.

### 2. The FR-004 diagnostics contract is missing, and half of it is unsatisfiable as written

`plan.md:305-306` lists `contracts/guard-diagnostics-contract.md` as a Phase 1 output and `data-model.md:47` defers "the full before/after contract" to it. **That file does not exist** — the planning agent died before writing it. FR-013, task 1.2, task 1.7 and AC 2a all depend on it.

The shape `data-model.md:21-36` sketches cannot be built as instructed. Verified at source:
- `failures` — real. `validateAnnotation`'s array, computed at `reasonRenderGuard.mjs:429`, currently only `console.warn`'d at `:434`. Threadable.
- `strippedSpecs` — real. The `specs` Set built inside `stripFailingZoneSpans` (`:366-372`). Threadable (needs that private function's return widened).
- `promotedCoordinates` / `humanizedCoordinates` — **not threadable.** `promoteRawCoordinates` (`:217-241`) is a bare `seg.replace(CXRY_RE, …)` with zero collection. `humanizeGroundedCoordinates` (`:156-181`) has exactly one `push`, and it is the zone-tag depth stack (`open.push`), not a record of what it rewrote. Getting these requires **new instrumentation inside both functions**, the opposite of what `data-model.md` and epic AC 1 ("not recomputed") direct.

Note `spec.md:287-288` (FR-004) names the field list as "failures, promotions, humanizations" — it never mentions `strippedSpecs`, the one field FR-013 actually consumes.

**Fix.** Write `contracts/guard-diagnostics-contract.md` before `/speckit-tasks` runs; make `failures` + `strippedSpecs` the mandatory core; mark `promotedCoordinates`/`humanizedCoordinates` explicitly as *new instrumentation*, or cut them. Add `strippedSpecs` to FR-004's field list in `spec.md`.

### 3. Decision 2 step 3 invents an unscoped, self-declared unverified change to board selection

`plan.md:225-233` handles one corpus record (`eval-33`) whose `lostResource.line` is classified as "shown to the model" but is arguably shown nowhere. The plan's remedy is to **make that record's board selectable** — "a `reasonBoardSelect.mjs`-side fix, likely folding the denial half's board into `selectBoards`'s existing selection logic for this record — the plan defers the exact mechanism to the implementation task, since it depends on that function's current board-selection rule set, **which was not re-derived in this planning session**."

(a) It is the plan's only explicitly self-labelled unverified step, and no task can implement it — no mechanism, no citation, one record. (b) No requirement asks for it: FR-019 (`spec.md:355-362`) requires only that a `rendered` path not be invisible in *both* the JSON residue and the boards. (c) Real blast radius the plan does not weigh — the epic's own §12g trap (epic `:296-298`): *"Adding anything to the prompt adds VOCABULARY the model echoes — the second projected board's caption alone moved render-label leakage 0/125 → 10/125."*

**Fix.** Downgrade step 3 to what is specified: land FR-018 (array-emptiness fix — citations verified, `renderReasonModel.mjs:37-41` array branch vs `:43-44` object branch) plus the FR-019(b) corpus test, and file the board-selection remedy as its own scoped item.

---

## Decisions required

### A. Should the FR-013 fix change which records retry — yes or no?

| Option | What happens | Evidence |
|---|---|---|
| **A1 (recommended)** — guard-aware check *before* the retry, per `research.md` and `spec.md:136-141` | More records retry (the 5 runs that lose a span become retry candidates). OI-177 genuinely closed. Adds no second retry, no second budget, no new trigger kind — Settled decision 4 (epic `:239-250`) is untouched. | Retry is a single amended pass already in place at `mechanismExplainer.mjs:227-231`; trigger is `missing.length > 0` at `:227` |
| A2 — guard-aware check *after* the retry, per current `plan.md` | Nothing about serving changes; only recorded `missingHandles`/diagnostics improve. OI-177 stays open. | `plan.md:152-160` |

**Recommended: A1.** Cost is one extra guard invocation per generation — pure string/regex work, no solver, LLM, DB or network call (`reasonRenderGuard.mjs:418-443`).

### B. Extend the existing cache-purge entry, or add a new one?

Verified: the entry exists at `docs/deployment_steps.md:1952` ("Spec 058 render remediation — purge cached deep reveals generated by the OLD render layer"), status `PENDING`, and was extended **twice** — 2026-08-25 for `0d6f818..2ef3ccb` (`:1966`) and 2026-08-26 for `b9be303..086b8ea` (`:1975`). Extending is *not* "engineering around" the purge.

The real hazard: if the owner runs that purge before Epic 12 merges, the entry flips to DONE and Epic 12's purge silently disappears. **This already happened once in this file** — `docs/deployment_steps.md:1826`: *"Staging's 058 TRUNCATE is already marked DONE 2026-08-04 — i.e. it ran BEFORE this code — so on staging it must be run again."*

| Option | Trade-off |
|---|---|
| **B1 (recommended)** — extend the existing entry, and add one line naming Epic 12's commit range with an explicit "if this entry was already marked DONE before Epic 12 merged, run it again" note | Follows the file's own twice-used precedent; closes the exact hole that bit the 058 entry |
| B2 — new standalone entry | Satisfies `spec.md:392` FR-029 ("MUST append an entry") most literally; cost is a third near-identical purge entry |

Also reconcile FR-029's literal "append an entry" wording with the plan's "do not create a second purge entry" so a task agent doesn't split the difference badly.
