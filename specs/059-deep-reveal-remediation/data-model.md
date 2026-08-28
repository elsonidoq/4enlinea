# Data Model: Deep-Reveal Remediation

No database schema changes. Every entity below is an in-memory JS shape or a JSONL record field; none
is persisted to Supabase. This section documents the shapes this epic reads, extends, or newly
introduces, per `spec.md`'s "Key Entities" section, with the field-level detail a plan needs and the
spec did not carry.

## Answers row (`compute.mjs`'s recorded output, one JSONL line per model call)

Existing fields (read-only, unless noted):
- `feature_vector` — the narrator vector, incl. `movestring` (`Board`-constructible).
- `render_decision` — incl. `zones.aliases` (handle → `{ role, spec, truthBoard }`), `zones.terms`,
  `requiredSet`, `fieldPartition` (`{ rendered: string[], covered: string[], excluded: string[] }`).
- `mechanism` — the pre-guard, post-`processAnnotations` model output string. **Retained unchanged**
  (Q1 provisional decision: kept, not replaced).

**New fields this epic adds** (FR-001/FR-002):
- `servedExplanation` (string) — the post-guard string, produced by calling
  `guardExplainMoveLlmPayload({ explanation: mechanism, board, allowedSet, diagnostics: true, ... })`
  and reading its `.explanation`. This is what a player actually receives.
- `guardDiagnostics` (object) — the new `diagnostics` field FR-004 adds to
  `guardExplainMoveLlmPayload`'s return, verbatim (not recomputed). Its mandatory core is exactly two
  fields:
  ```
  {
    failures: string[],          // e.g. ["P6:raw_coordinate:c1r3", "P5strong:cell_not_allowed:..."]
                                  // validateAnnotation's own array, reasonRenderGuard.mjs:429,
                                  // currently only console.warn'd at :434
    strippedSpecs: string[],     // specs whose [zone:spec] span was stripped from prose — the same
                                  // `specs` Set stripFailingZoneSpans already builds internally,
                                  // reasonRenderGuard.mjs:366-372, threaded out not recomputed
  }
  ```
  **`promotedCoordinates`/`humanizedCoordinates` are CUT, not deferred-but-planned.** Owner decision:
  `promoteRawCoordinates` (`reasonRenderGuard.mjs:217-241`) is a bare `seg.replace(CXRY_RE, …)` with
  zero internal collection, and `humanizeGroundedCoordinates` (`:156-181`) has exactly one `push` — the
  zone-tag depth stack, not a record of what it rewrote. Exposing either would require **new
  instrumentation inside two production text-rewriting functions**, the opposite of the "thread out,
  don't recompute" house rule this FR follows for `failures`/`strippedSpecs`. See
  `contracts/guard-diagnostics-contract.md` for the full before/after return shape.
- `oiAttribution` (object, FR-007) — a code → OI-N mapping computed once (not per-row; could be a
  shared lookup table applied when the row is written), e.g.
  `{ "P6:raw_coordinate": "OI-194", "P5strong:cell_not_allowed": "OI-172", "P5strong:tg": "OI-170",
  "unclosed_tag": "OI-208" }` — plus an ordering-caveat note for OI-140 (P6 runs before
  token-stripping, so some `P6:raw_coordinate` codes may really be an OI-140 ordering artifact, not an
  OI-194 cost; the mapping records the code, the attribution note lives in the FR-007 task's own
  report, not in this per-row field).

## `guardExplainMoveLlmPayload`'s widened return shape (FR-004)

See `contracts/guard-diagnostics-contract.md` for the full before/after contract.

## `survivedSpecs` (Design Decision 1, transient — not persisted)

**Corrected to match `research.md`'s Decision 1 (source of truth) — runs BEFORE the existing retry,
on `attempt1`, not after `finalAttempt` is produced.** An earlier draft of this section described
computing this post-retry, on `finalAttempt.usedSpecs`, and feeding it into a call to
`missingRequiredGroups` "in place of `finalAttempt.usedSpecs` directly" — that call site does not
exist. `missingRequiredGroups` is called exactly once, at `mechanismExplainer.mjs:221`, on `attempt1`,
and its result IS the retry trigger (`missing.length > 0` at `:227`).

Computed inside `computeMechanism`, immediately before the existing `missing =
missingRequiredGroups(requiredSet, attempt1)` call (`mechanismExplainer.mjs:221`), not stored on the
answers row (that is `compute.mjs`'s own, separate call site):
`survivedSpecs = attempt1.usedSpecs.filter(spec => !diagnostics.strippedSpecs.includes(spec))`, where
`diagnostics` comes from `guardExplainMoveLlmPayload({ explanation: attempt1.mechanism, board,
allowedSet, diagnostics: true })`. Feeds the **existing**
`missingRequiredGroups(requiredSet, { usedSpecs: survivedSpecs })` call at `:221`, replacing the raw
`attempt1.usedSpecs` that call reads today (FR-013). Consequence: more records retry — the 5 runs that
lose a `[zone:…]` span become retry candidates that did not retry before. This is the intended fix for
OI-177, not a diagnostics-only side effect.

## `fieldPartition`'s `.line`-carve-out check (Design Decision 2, test-only, not a new persisted shape)

For each corpus record, for each leaf path in `render_decision.fieldPartition.rendered` matching
`/(^|\.)line(\[\]|\.|$)/`: verify the path's owning half's board (`lostResource` → the half's own
board key; `opponentPunishment` similarly) is among that record's selected/rendered boards
(`boardSelectionDecisions`'s output — exact shape to be read at implementation time), OR a
`zones.aliases` entry derived from `.line` exists (e.g. a `forkPivotCell` handle). This is a
**test-time derived check**, not a new field written anywhere. `eval-33`'s `lostResource.line` fails
this check today (its board is not among the record's selected boards) and is carried as a named,
commented exemption in the test rather than silently passed — the board-selection remedy that would
make it pass is deferred out of this epic (see `docs/epics/deep-reveal-remediation-epic.md`
"### Deferred" under Epic 12); the check must still go RED-for-real on every other record.

## `GRADER_INSTRUCTIONS_v2.md` (FR-003, new file)

Not a code data structure — a checked-in markdown file. Shape: `GRADER_INSTRUCTIONS_v1.md`'s full
byte content, unchanged, plus a new section (placement: after the existing pass-rule/triage section,
before or after — exact placement decided at task-authoring time, not load-bearing here) stating, per
axis (A5, A6, A7, G1, G7 at minimum — the axes the epic names as served-string-graded), which of
`mechanism` (pre-guard) or `servedExplanation` (post-guard) that axis grades. A6 is explicitly a
special case: `grade_mechanical.mjs`'s A6 already imports production's `mentionsBetterColumn` and is
effectively post-guard already (verified epic citation, `grade_mechanical.mjs:12,42-43` — not
re-verified in this session; treat as UNVERIFIED-but-inherited if a future session needs to rely on
the exact line numbers).
