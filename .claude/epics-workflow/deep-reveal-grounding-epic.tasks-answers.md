# Answers and decisions (tasks_critique)

## Blocking issue 1 — AC1 and AC3 have zero tasks
Answer: Accept recommendation (auto-applied — no alternative).

Add two tasks at the end of Phase 6:
(a) An **end-to-end acceptance task** that re-runs all four staging movestrings — `3154`,
    `315444233213`, `315444233213134122`, `3154442332131341225551` — through the **real pipeline**
    (not hand-written fixtures), per `quickstart.md`'s "End-to-end acceptance" section, recording the
    offered / required / emitted sets per board. Fold T029's windows-default revisit into this task
    (see Decision A) and fix T029's dangling "revisit … during T032" reference to point at it.
(b) A **required ⊆ offered corpus assertion** added to
    `connect-four/server/tests/renderCoverageCorpus.test.mjs` (existing file, already on line 17 — no
    `package.json` append needed).

Also apply the critique's **systemic** instruction: walk the epic's `Acceptance criteria (epic-level)`
list 1–7 and spec.md's SC-001…SC-008 as an **explicit checklist** and confirm a task ID per line. Add
tasks for any other line with no owner — note AC2 currently has only indirect US3 unit coverage and no
direct verification task, and AC7 (`test:fast` green) has a baseline task (T001) but **no closing
re-run**.

## Blocking issue 2 — T005 targets a test file that does not exist
Answer: Accept recommendation (auto-applied — no alternative).

There is no test file for the server-side zone parser; the only file mentioning `expandSpec`/
`isValidSpec` is `server/tests/reasonRenderGuard.test.mjs`, and only in comments/test names — it never
imports `server/zoneParser.js`. As written, T005's fallback would silently create an unlisted file that
never runs, violating cross-lane constraint 5.

Change T005 to **explicitly create `connect-four/server/tests/zoneParser.test.mjs`**, add it to
plan.md's Testing section list, and give it the **same verbatim line-17 append instruction** T016/T032
carry (append to the single `test:fast` line, read fresh, never rewrite the line). The `future:` prefix
strip lands in `zoneParser.js`'s `isValidSpec`/`expandSpec` and is load-bearing for `checkP1`/`checkP2`/
`checkP5` — it is not safe to ship untested.

## Blocking issue 3 — T024 documents the schema in the wrong file
Answer: Accept recommendation (auto-applied — no alternative).

`deep_reveal_failures` does not appear in `docs/architecture/db-schema.md` at all; it is documented in
`docs/architecture/data-model.md`. Retarget T024 to `docs/architecture/data-model.md`
§"Deep Reveal Failures" and **widen** it to add all six new columns (`attempt1_raw_llm_output`,
`attempt1_mechanism`, `attempt2_raw_llm_output`, `attempt2_mechanism`, `missing_handles`,
`served_attempt`) plus the new `failure_reason` value and the new migration filename. Move it into
Phase 7 next to T035–T037 so it is not buried mid-US2. Constitution Principle VIII makes a lockstep-doc
miss on a migration a definition-of-done failure.

## Decision A — Window/cells alias admission semantics
Answer: **Whole window only.**

An offered `windows:`/`cells:` alias admits **only the full window as a unit**, not each of its cells
individually. Write this into T029's `toAllowedSet` mapping and remove the per-cell default.

**Owner was explicitly warned of the trade-off and chose this anyway**: because T027 adds `P5strong` to
`SPAN_CARRYING_CODES`, spans that fail P5Strong are now genuinely stripped, so a coach highlight of a
single cell inside a window the engine *did* offer will be rejected and removed. The risk of this rule
is **losing real, correct highlights**, not admitting wrong ones. Note also that this diverges from
`checkP5Strong`'s existing `cells:` branch, which treats a multi-cell spec as individually-admissible
cells — so the divergence must be deliberate and commented at the code site, not left to look like an
oversight.

**Required mitigation** (fold into the new end-to-end acceptance task from blocking issue 1): the task
must **measure and record how often whole-window-only rejects a highlight** across the four staging
boards, and report the count per board. The owner wants evidence rather than a guess, and has said they
may flip this decision after seeing it. Make the measurement an explicit, recorded output of that task —
not a side observation.

## Decision B — Nested-promotion guard for `promoteRawCoordinates`
Answer: **Track zone depth; skip promotion while depth > 0.**

Count open/close zone tags across segments and skip promotion whenever depth > 0, so a `cXrY` sitting
inside an existing zone's inner text (`[zone:c4r1]watch c4r1 closely[/zone:c4r1]`) is never re-wrapped.
Splitting on `ZONE_TAG_RE` alone does not solve this, because an open zone's inner text is itself an
even-indexed segment.

Decide it **now**: write the chosen rule into **both T028 (implementation) and T026 case 3 (test)**, and
mark the two tasks **must-be-same-agent / same-commit** — the same treatment T025/T027 already carry.
Remove the "defer to implementation time" and "UNVERIFIED SKETCH — adapt" framing from data-model.md §5
for this specific point. Rejected: net-zero-depth-segments-only, which silently skips promotion in any
segment containing both an opened and a closed zone.

## Also fold in (the critique's smaller findings — apply in this pass)
- **T002's re-verification instruction is anchored to the wrong task ID.** Its body says "immediately
  before **T020** executes" (twice), but the migration is authored in **T022** and consumed by **T038**.
  T020 runs before T022, so the number could still drift in between. Fix the ID to T022/T038.
- **T029 must carry a naming-collision check clause** for the newly-exported `rcToCellStr` (currently a
  module-local const in `zoneAnnotations.mjs`, used once).
- **T038's "Run it" field needs the exact command line** (`node server/migrate.js …`), not the prose
  "apply the `065_...` migration" — `docs/deployment_steps.md`'s template says "exact commands."

## Confirmed correct — do not disturb
T038 matches the deployment_steps template field-for-field and correctly declares "not reversible" for
the TRUNCATE; no cross-lane constraint is violated anywhere (`stripInternalTokens`/`RANGE_RE` untouched
and still ASCII-hyphen — Plan A has NOT merged into this worktree, so do not "fix" the en-dash while
fixing anything else; no TTS task; `Board.jsx` additive-prop-only; OI-143 closed by T031 and OI-170+
reserved by T037; T016/T032 carry correct line-17 append instructions). The combined `checkP5Strong`
task stays combined. `promoteRawCoordinates`' "wrap already-flattened text" constraint survives verbatim
into T028. No fabricated fixtures. `docs/deployment_steps.md` is a work queue — do not add tooling
around T038.
