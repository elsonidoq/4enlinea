---

description: "Task list for Feature 058 — Deep-Reveal Grounding"
---

# Tasks: Deep-Reveal Grounding

**Input**: Design documents from `specs/058-deep-reveal-grounding/` (`spec.md`, `plan.md`, `research.md`,
`data-model.md`, `contracts/deep-reveal-grounding-contracts.md`, `quickstart.md`)
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`
(all present)
**Handoff**: `.claude/epics-workflow/deep-reveal-grounding-epic.handoff.md` — binding design facts
folded in below; do not re-derive `promoteRawCoordinates`'s inner-text design, the `usedSpecs`
3-file plumbing, or the `P5strong:tg` out-of-scope carve-out.
**Epic**: `docs/epics/deep-reveal-grounding-epic.md` ("Epic 11 — Deep-Reveal Grounding")

**Tests**: Requested throughout spec.md and plan.md's Testing section — every story ships with
regression tests, several against real staging movestrings, not hand-written fixtures (per
`CLAUDE.md`'s "Verifying any claim about this codebase").

**Paths**: everything under `connect-four/` unless stated otherwise (`docs/` and this spec's own
files are the only exceptions).

## Hard prerequisite — read before starting any task

This plan is written against the **post-Plan-A** version of
`connect-four/server/reasonRenderGuard.mjs`. Before T001, confirm
`git log --oneline -- connect-four/server/reasonRenderGuard.mjs` shows Plan A's en-dash `RANGE_RE`
widening and the `GET /api/user/tts/deep-reveal` sanitizer routing. If it does not, **stop** — do
not implement any US3 task against the pre-Plan-A file (quickstart.md, "Hard prerequisite").

## Cross-lane constraints (binding on every task below — copied from spec.md / the epic, verbatim in force)

1. `connect-four/server/reasonRenderGuard.mjs` — `stripInternalTokens` and `RANGE_RE` are Plan A's.
   No task below may modify them.
2. No TTS work. The two-attempt `deep_reveal_failures` logging lives in `server/index.js` in its
   own region, away from the TTS handler.
3. `connect-four/src/components/Board.jsx` — Plan B owns sizing/layout. US4 tasks are additive-prop
   only.
4. Any new open-issue id uses **OI-170+**. This plan opens none (US3 closes the existing OI-143 —
   do not open a duplicate).
5. `connect-four/package.json` line 17 (`test:fast`) is a single line. Every task that adds a test
   file appends it as an **explicit line-level diff** — never a rewrite of the line. Three lanes
   append to this line concurrently; read the line fresh immediately before editing it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US4, per spec.md's priorities (P1=US1, P1=US2, P2=US3, P3=US4)

---

## Acceptance criteria coverage checklist (added post-critique — every line below owned by a task ID)

Per the tasks-critique's systemic finding: every line of the epic's `Acceptance criteria (epic-level)`
1–7 and spec.md's `SC-001`–`SC-008` is walked here explicitly against the task(s) that own it, so a
missing owner is visible rather than silently absent (this is how blocking issue 1 — AC1/AC3/SC-001/
SC-004 having zero owning task — was found).

| Epic AC | spec.md SC | Owning task(s) |
|---|---|---|
| AC1 (every named square/line/future square highlighted, re-run not fixture) | SC-001 | T004–T010 (US1 offer), **T040** (end-to-end re-run of all 4 staging boards through the real pipeline) |
| AC2 (no raw square reaches the client, text-only, post-Plan-A) | SC-002 | T026 (`reasonRenderGuard.test.mjs` — promote/flatten, no residual `[zone:...]`), T028 (`promoteRawCoordinates` impl) — indirect coverage only; no task re-asserts SC-002 end-to-end beyond T026's unit cases and **T040**'s per-board recording |
| AC3 (required ⊆ offered holds for every board in the coverage set — unit test) | SC-004 | **T041** (new `renderCoverageCorpus.test.mjs` assertion) |
| AC4 (miss → exactly one retry, both attempts + missing handles logged) | SC-005 | T011–T023 (US2 tests + impl) |
| AC5 (`checkP5Strong` live with a real `allowedSet` from `server/index.js`, OI-143 closed) | SC-006 | T025–T031 (US3) |
| AC6 (deep-reveal board numbered via opt-in prop, no other screen/API change) | SC-003, SC-007 | T008–T010 (future-square visual distinction), T032–T034 (US4) |
| AC7 (`npm run test:fast` green, baseline 0 failures, no scenario reduction) | SC-008 | T001 (baseline capture) — **no closing re-run task existed; see T042 below** |

Two lines had no owner and are now covered by new tasks appended below: **AC1/AC3/SC-001/SC-004 → T040/
T041** (Phase 6.5), and **AC7/SC-008's closing re-run → T042** (Phase 7, end).

---

## Phase 1: Setup

**Purpose**: Confirm baseline and re-verify the two facts research.md flags as time-sensitive
before any implementation task depends on them.

- [x] T001 Run `eval "$(./worktree-ports.sh)"` from repo root, then `cd connect-four && npm run
  test:fast` and confirm the baseline is **0 failures** (per `CLAUDE.md`, confirmed since
  2026-08-04). Record the count; any task below that turns this red is a regression, not
  pre-existing flake.
- [x] T002 [P] **Re-verify the `065` migration number immediately before T022 executes** (the task
  that authors the migration file) **and again before T038 executes** (the task that documents it
  in the runbook) — not just once at plan time: `ls connect-four/server/migrations/ | tail -5`.
  research.md D8/D4 and plan.md's Source Code map name `065_deep_reveal_failures_two_attempts.sql`
  as the verified-at-plan-time next number (highest existing was `064_drop_correct_col.sql`), but
  two other concurrent worktrees (Plan A, Plan B) may add migrations first — if the highest existing
  number has advanced past `064`, rename the new migration file accordingly before T022 and update
  every reference to `065_...` in this tasks file, `plan.md`, and `data-model.md` §4 to match. Do not
  proceed with a stale number. (Corrected: an earlier draft of this task anchored the re-check to
  "T020," which is US2's `postprocessAnswer` plumbing task and has nothing to do with the migration
  file — T020 always runs before T022 regardless, so anchoring there was conservative-but-wrong and
  could still let the number drift between T020 and T022.)
- [x] T003 [P] Confirm the hard prerequisite above (Plan A merged into this branch/base) via
  `git log --oneline -- connect-four/server/reasonRenderGuard.mjs`. If Plan A's en-dash fix is
  absent, stop and escalate — do not begin any US3 task.

---

## Phase 2: Foundational

*(None required — the four stories are independently testable per spec.md, and US1 is a
prerequisite for US2/US3 by design (a required group with no legal handle is unsatisfiable), not
by a shared setup step. US4 has no dependency on US1–US3 and may run in parallel with them.)*

---

## Phase 3: User Story 1 — The coach has a legal way to point at every square it names (Priority: P1) 🎯

**Goal**: Every square/line class the mechanism might reference — including a deep, not-yet-
playable fork square — has a legal handle; a future-square handle is distinguishable (role text +
color) from a present-tense one.

**Independent Test** (spec.md): re-run the `3154442332131341225551` staging movestring, whose
`forkCells: ["c2r6","c5r5"]` (epic evidence row) were previously unofferable, and confirm the
offered `aliases[]` now includes a distinct future-square entry for them.

### Tests for User Story 1

- [x] T004 [P] [US1] Extend `connect-four/server/tests/zoneAnnotations.test.mjs`: assert
  `buildAnnotationOffer` emits a `future:cNrM`/`future:windows:...`-prefixed alias for a
  `forkCells` deep-fork board (use `3154442332131341225551`, solver-verified per
  `./visualize_board.sh`, not a hand-built board), with `role` text distinct from the present-tense
  structural `roleText()` output (FR-001/FR-002).
- [x] T005 [P] [US1] **Create `connect-four/server/tests/zoneParser.test.mjs` (NEW file — corrected
  from an earlier draft of this task that said "or the nearest existing test file... do not create a
  new file"; verified there is none).** Grepping `connect-four/tests/` and
  `connect-four/server/tests/` for `expandSpec`/`isValidSpec` finds only
  `server/tests/reasonRenderGuard.test.mjs`, which mentions them in comments/test names but never
  imports `server/scripts/reason_engine/zoneParser.js` — there is no existing test file for the
  server-side zone parser to extend. Assert `future:c2r6` and `future:windows:c2r6,c5r5` are
  recognized as valid specs by `isValidSpec` and expand via `expandSpec` to the same cells as their
  unprefixed form. **Append this file explicitly to `connect-four/package.json` line 17's
  `test:fast` list** — read the line fresh immediately before editing (cross-lane constraint 5); do
  not rewrite the line. (This is load-bearing, not optional: the `future:` prefix strip lands in
  `isValidSpec`/`expandSpec` and is a dependency of `checkP1`/`checkP2`/`checkP5` — shipping it
  untested is the exact silent-failure shape constraint 5 exists to prevent.)
- [x] T006 [P] [US1] Extend `connect-four/tests/unit/annotatedText.test.js` (or nearest existing
  test file covering `src/lib/annotatedText.js` — locate by grep): assert `isValidSpec` accepts a
  `future:`-prefixed spec, `getZoneColor` returns the new reserved future-square constant for any
  `future:`-prefixed spec (not one of the 4 `ZONE_COLORS` hash-pool entries), and
  `zoneToOverlays`/`zoneToWindowGroups` resolve the same cells for `future:cNrM` as for `cNrM`.

### Implementation for User Story 1

- [x] T007 [US1] In `connect-four/server/scripts/reason_engine/zoneParser.js`: add a one-line
  `future:` prefix strip at the top of `isValidSpec` and of `expandSpec`, before delegating to the
  existing shape checks (plan.md §"The future-square visual mechanism"; data-model.md §1). Cell
  *resolution* must stay byte-identical to the unprefixed form.
- [x] T008 [US1] **Pin the future-square hex colour** (currently `UNVERIFIED SKETCH — adapt` per
  research.md D6/plan.md's Deploy prerequisites framing — this is implementation work, not a
  deploy step). In `connect-four/src/lib/annotatedText.js`: add a new, reserved **parallel**
  constant (e.g. `FUTURE_ZONE_COLOR`) — it must NOT be appended to the `ZONE_COLORS` array, because
  `getZoneColor` hashes `spec` mod `ZONE_COLORS.length` and growing that array would silently
  reassign the color of every existing non-future highlight (research.md D6, the "ambiguity
  removed" paragraph — this is settled, not a choice). Before finalizing the hex, check it against
  the 4 existing `ZONE_COLORS` values (`#5B9BD5` blue, `#E8543E` red, `#2FAA5A` green, `#8B5CF6`
  purple) for contrast and against `Board.jsx`'s inline semantic colors (`shimStyle`,
  `Board.jsx:13-42`) for collision. Add the one-line `spec.startsWith('future:')` early-return
  branch to `getZoneColor`, and the same prefix-strip line to `isValidSpec`,
  `zoneToOverlays`, `zoneToWindowGroups` (data-model.md §1; plan.md's per-file breakdown).
- [x] T009 [US1] In `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs`: add a new
  handle-class source in `buildAnnotationOffer` for deep fork cells named by `tacticTag:
  "double_threat"` on the projected-deep board (Settled decision 8), pushing
  `{ handle, spec: 'future:' + <cNrM or windows:...>, role, truthBoard, kbId }` aliases alongside
  the existing `STRUCTURAL` (`immediate`/`major`/`double`) source. Add a future-tense branch to
  `roleText()` (`:36-41`) selected by the `future:` prefix on the derived spec, e.g. "this square
  matters later, once the forced sequence reaches it — not a threat right now" (FR-002).
- [x] T010 [US1] In `connect-four/server/scripts/renderReasonModel.mjs`'s `assembleGroundedPrompt`
  (the `# Highlightable regions` block, currently ~line 311 — locate by symbol, not line number):
  state explicitly that a `future:`-prefixed handle must be described in future/conditional
  language, never as a present threat (Settled decision 8(b)).

**Checkpoint**: US1 is independently testable now — re-run the Independent Test above before
starting US2.

---

## Phase 4: User Story 2 — Highlighting the load-bearing squares is required, not optional (Priority: P1) 🎯

**Goal**: The system derives a 1–3-group required set per the Derivation Rule, requires the coach
to highlight every entry, retries exactly once on a miss naming what was missed, always serves the
second attempt, and records both attempts.

**Independent Test** (spec.md): run the 4 staging positions through the pipeline in isolation
(assuming US1 shipped); confirm each explanation's required set is computed correctly, an omission
triggers exactly one named retry, and both attempts + the outcome are recorded.

**Depends on**: US1 (a required group with no offered handle is unsatisfiable by the Derivation
Rule's own match-and-drop step).

### Tests for User Story 2

- [x] T011 [P] [US2] Extend `connect-four/server/tests/causalLinks.test.mjs`: assert `denialCell`
  is now exported from `causalLinks.mjs` and its `h?.cell ?? h?.completingCell ?? null` precedence
  is unchanged (research.md D1 — `deriveRequiredSet` imports and reuses this constant rather than
  reimplementing the `??` chain).
- [x] T012 [P] [US2] Extend `connect-four/server/tests/renderReasonModel.test.mjs`: assert
  `deriveRequiredSet(pruned, zones)` (a) returns 1–3 entries with `{half, spec, handle, role}`
  matched against `zones.aliases[].spec` by exact string equality (D2), (b) drops a group silently
  (no error, no placeholder) when the derived cell/window has no offered handle (FR-004/FR-006),
  and (c) covers the `T-parity` case (`covers: ['route', 'lostResource.terminal',
  'opponentPunishment.terminal']`) falling back to `lostResource.window` per the Derivation Rule's
  own worked example (spec.md, verbatim from the epic).
- [x] T013 [P] [US2] Extend `connect-four/server/tests/zoneAnnotations.test.mjs`: assert
  `processAnnotations`'s return widens to include `usedSpecs: [...usedSpecs]` (data-model.md §2,
  hop 1) alongside the existing `{mechanism, keyCells, zonesEmitted, repairs}` fields, and that
  `usedSpecs` contains only specs whose handle actually appeared as `[zone:{handle}]` in the input
  text.
- [x] T014 [P] [US2] Extend `connect-four/server/tests/computeConditionD.test.mjs` (already the
  file that owns `postprocessAnswer` coverage per plan.md's Testing section — verified, do not
  create a new file): assert `postprocessAnswer` destructures and returns `usedSpecs` on its return
  value (data-model.md §2, hop 2), including the `usedSpecs: []` case on the early-return branch
  (`!answer || !render_decision?.zones`).
- [x] T015 [P] [US2] Extend `connect-four/server/tests/mechanismExplainer.test.mjs` with a
  required-set-miss fixture: a synthetic first-attempt answer whose `mechanism` omits a required
  handle triggers exactly one retry with an amended prompt explicitly naming the missing
  handle(s); the returned shape is `{...attempt2, attempt1, missingHandles}` (both attempts
  present, `attempt1` never silently dropped — research.md D3); the compliance check is
  `requiredSet.every(g => attempt.usedSpecs.includes(g.spec))`, not a raw `[zone:handle]` string
  search (Corrections item 4 — a handle-string check would fail on every single request, since
  `processAnnotations` has already rewritten every handle to its expanded spec before this check
  runs). Also assert `runLlmAttempt` (`mechanismExplainer.mjs:50-58`) now surfaces `usedSpecs` on
  its returned `attempt` object (data-model.md §2, hop 3).
- [x] T016 [US2] **NEW test file** `server/deepRevealFailuresLogging.test.mjs` — the two-attempt
  insert path (no existing file tests today's single-insert terminal-failure path in isolation).
  Assert: a "missing required squares after retry" incident writes `attempt1_raw_llm_output`,
  `attempt1_mechanism`, `attempt2_raw_llm_output`, `attempt2_mechanism`, `missing_handles` (jsonb),
  `served_attempt = 2`, `failure_reason = 'missing_required_squares'`; and that the existing
  terminal-failure insert (`callError`/`parseError`/empty mechanism`) still writes only
  `raw_llm_output`/`failure_reason` unaffected (contracts/deep-reveal-grounding-contracts.md §1).
  **Append this file explicitly to `connect-four/package.json` line 17's `test:fast` list** — read
  the line fresh immediately before editing (cross-lane constraint 5); do not rewrite the line.

### Implementation for User Story 2

- [x] T017 [US2] In `connect-four/server/scripts/reason_engine/causalLinks.mjs`: export the
  existing `denialCell` (`:23`) — no behavior change, just widen its export (research.md D1).
- [x] T018 [US2] In `connect-four/server/scripts/renderReasonModel.mjs`: add
  `deriveRequiredSet(pruned, zones)` per the Derivation Rule (spec.md, copied verbatim from the
  epic — do not re-derive or re-word it). Call it from both `buildReasonRenderModel` and
  `buildRenderDecision` (research.md D1 — both already share the identical `pruneVector` →
  `classifyCausalLink` → `buildAnnotationOffer` sequence). Extend `buildRenderDecision`'s persisted
  `render_decision` output with a sibling `requiredSet` field (data-model.md §2, Consumer 3) for
  grader ground truth. Add the `# You MUST build the explanation around these` prompt block inside
  `assembleGroundedPrompt` (**not** `compute.mjs`'s `buildPromptForCondition` — Corrections item 5 /
  research.md D6), naming each required handle + role and the rule that each must appear as a zone
  tag in `mechanism` (Settled decision 6).
- [x] T019 [US2] In `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs`: widen
  `processAnnotations`'s return (`:216`) to `{ mechanism, keyCells, zonesEmitted, repairs,
  usedSpecs: [...usedSpecs] }` — data-model.md §2 hop 1, quoted verbatim.
- [x] T020 [US2] In `connect-four/server/scripts/compute.mjs`: widen `postprocessAnswer`'s
  (`:294`) return to also destructure and return `usedSpecs` from `processAnnotations`'s result —
  data-model.md §2 hop 2, quoted verbatim, including the early-return branch returning
  `usedSpecs: []`.
- [x] T021 [US2] In `connect-four/server/mechanismExplainer.mjs`: widen `runLlmAttempt`'s
  (`:50-58`) return to include `usedSpecs` from `postprocessAnswer`'s result — data-model.md §2 hop
  3, quoted verbatim. Then extend `computeMechanism`'s retry loop (`:98-99`) with a second trigger
  alongside `isLlmError`: after attempt 1, compute `requiredSet.every(g =>
  attempt.usedSpecs.includes(g.spec))`; on a miss, build a second, amended prompt explicitly naming
  the missing handles (Settled decision 4 / FR-008) and re-run `runLlmAttempt` — never resend the
  identical `prompt` (research.md D3 notes today's retry does exactly that for `isLlmError`; this
  new trigger must not). Widen the return shape to `{ ...attempt2, attempt1, missingHandles }`
  (FR-009/FR-010 — both attempts always kept, second attempt always served, never re-evaluated for
  quality against the first).
- [x] T022 [US2] In `connect-four/server/migrations/065_deep_reveal_failures_two_attempts.sql`
  (number per T002's re-verification): add the six nullable columns from data-model.md §4
  (`attempt1_raw_llm_output text`, `attempt1_mechanism text`, `attempt2_raw_llm_output text`,
  `attempt2_mechanism text`, `missing_handles jsonb`, `served_attempt smallint`) to
  `deep_reveal_failures`, additive only — the existing terminal-failure insert
  (`server/index.js:1363-1372`) must keep working unchanged.
- [x] T023 [US2] In `connect-four/server/index.js`: add a new insert site (in its own region, away
  from the TTS handler — cross-lane constraint 2) for the "retry still omitted required squares"
  case, writing the six new columns and `failure_reason = 'missing_required_squares'`. Keep the
  existing terminal-failure insert (`:1363-1372`) untouched.
- [x] T024 — **moved to Phase 7 (see below); relocated and retargeted per tasks-critique blocking
  issue 3.**

**Checkpoint**: US1 + US2 together are independently testable — re-run the Independent Test above
before starting US3.

---

## Phase 5: User Story 3 — Nothing ungrounded reaches the player, ever (Priority: P2) 🎯

**Goal**: A raw board coordinate in prose is promoted to a real highlight (falling back to today's
flattened prose only if the reasoning engine never actually offered that coordinate); every
highlight is validated live against the real offered set, closing OI-143; `checkP5Strong`'s three
coverage gaps are fixed together.

**Independent Test** (spec.md): feed the guard layer a synthetic explanation containing (a) a raw,
un-highlighted coordinate and (b) a highlight naming a square outside the offered set; confirm the
first is promoted and the second is caught and stripped, independent of US2's retry logic.

**Depends on**: US1 (offered set must exist to validate against), US2 (the required/offered sets
this story checks against).

### Tests for User Story 3

- [x] T025 [US3] **Combined task — do not split.** Extend `connect-four/tests/annotationGate.test.js`
  (verified the file that owns `checkP5Strong`'s existing P1–P5Strong coverage today — plan.md's
  Testing section) with cases for **all three** `checkP5Strong` gaps, shipped as one PR/commit per
  the owner's explicit decision (data-model.md §3, research.md D5: "landing them separately leaves
  a class of highlight silently unchecked in the interim"):
  1. a `windows:c1r1,c2r2` spec is now checked (not silently admitted) — every cell in the window
     must be in `concreteCells`, mirroring the existing `cells:` branch;
  2. a `future:cNrM` and a `future:windows:...` spec are checked identically to their unprefixed
     form (strip-then-delegate);
  3. a `checkP5Strong` rejection (e.g. `P5strong:cell_not_allowed:c4r3`) actually has its
     `[zone:...]` span stripped by `stripFailingZoneSpans` once `'P5strong'` is added to
     `SPAN_CARRYING_CODES` — assert the span is gone from the output, not just that `valid: false`
     is flagged.
  Also assert the **note carried forward, not fixed**: a `P5strong:tg` rejection's span is still
  NOT stripped after this task (its failure-code shape has no third `:`-segment for
  `reasonRenderGuard.mjs`'s span extraction to find — data-model.md §3 item 3, "pre-existing,
  narrower gap ... deliberately out of scope for this plan, not introduced by this plan"). Assert
  this explicitly as a documented-gap regression guard (a test that currently fails would mean the
  gap silently closed or silently widened) rather than leaving it unasserted.
- [x] T026 [US3] **Must land in the same commit as T028 (same treatment as T025/T027) — the nested-
  promotion guard rule (item 3 below) is now decided (Decision B) and this test must encode exactly
  that rule, not whatever the implementer of T028 picks independently.** Extend
  `connect-four/server/tests/reasonRenderGuard.test.mjs` (already imports
  `guardExplainMoveLlmPayload` — extend in place, no new file, per research.md D12):
  1. `promoteRawCoordinates` promotes a bare `cXrY` to `[zone:cXrY]column N, row M[/zone:cXrY]`
     when it matches an offered alias (real, clickable highlight survives);
  2. the same falls back to flattened "column N" prose with **no residual `[zone:...]` tag** when
     `checkP5Strong` rejects it (Decision 2's fallback, delivered by ordering alone per data-model.md
     §5 — assert no leftover wrapper, since a leftover here is a regression `stripInternalTokens`
     alone would have caught pre-feature);
  3. **Decision B (settled, not open).** A `cXrY` token already inside an *existing* zone's own
     inner text (e.g. `[zone:c4r1]watch c4r1 closely[/zone:c4r1]`) is left alone — not re-wrapped
     into a nested/malformed pair. The resolution is: **track open/close zone-tag depth across the
     `ZONE_TAG_RE`-split segments and skip promotion in any segment where depth > 0** (splitting on
     `ZONE_TAG_RE` alone is insufficient — an open zone's inner text is itself an even-indexed
     segment, so depth tracking, not segment parity, is what distinguishes it). The rejected
     alternative (net-zero-depth-segments-only) is out — it silently skips promotion in any segment
     containing both an open and a close tag. Assert this exact depth-tracking behavior, not just
     "some cell was left alone";
  4. `SPAN_CARRYING_CODES` including `'P5strong'` actually strips a `P5strong:*` failure's span end
     to end through `guardExplainMoveLlmPayload` (not just unit-tested in isolation per T025);
  5. a fully valid, fully grounded explanation passes through `guardExplainMoveLlmPayload`
     unaltered (FR-013 — nothing is stripped or changed).

### Implementation for User Story 3

- [x] T027 [US3] **Combined task, matching T025 — do not split.** In
  `connect-four/server/annotationGate.js`'s `checkP5Strong` (`:323-403`):
  1. add a `windows:(.+)` branch mirroring the existing `cells:` branch (`:380-389`) — split on
     `,`, require every resulting cell in `concreteCells`;
  2. strip a leading `future:` prefix before the four existing regex tests (`tg`/`col(\d+)`/
     `c(\d+)r(\d+)`/`cells:(.+)`/`row(\d+)`), so one branch handles both prefixed and unprefixed
     forms.
  In `connect-four/server/reasonRenderGuard.mjs`: 3. add `'P5strong'` to `SPAN_CARRYING_CODES`
  (`:151`). All three land in the same commit (owner's explicit decision, data-model.md §3/research.md
  D5) — do not merge 1–2 without 3, or the newly-detected rejections still reach the player
  unchanged.
  4. **Required addendum for Decision A (whole-window-only admission, see T029) to have any actual
     effect.** `checkP5Strong`'s pre-processing loop (`:332-347`) currently flattens **every**
     `entry.cells` from `allowedSet` into one shared `concreteCells` Set — an `entry.cells` array of
     length 1 (single-cell alias) and one of length 3 (window alias) are indistinguishable once
     added, so a standalone `cNrM` check (`:372-378`, `concreteCells.has(spec)`) would silently
     admit an individual window-member cell exactly as if it had been offered standalone — the
     opposite of what Decision A requires. To make whole-window-only real: build `concreteCells`
     (and `concreteRows`/`concreteCols`) **only** from `allowedSet` entries T029 marks as
     single-cell-eligible (see T029's `windowOnly` flag below); build a **separate**
     `offeredWindowSignatures` Set of sorted, comma-joined cell strings, one per `windowOnly` entry.
     Change the new `windows:(.+)` branch from (1) above to require an **exact signature match**
     against `offeredWindowSignatures` (sort the highlight's own comma-split cells, join, compare)
     rather than "every cell individually in `concreteCells`" — a highlight naming a subset of an
     offered window's cells must **not** pass by falling back to per-cell membership. **Comment this
     at the code site**: `// Deliberate divergence from the single-cell cNrM/cells: matching above:
     a windows:-offered alias is only satisfiable as the exact same window, never per-cell (owner
     decision, deep-reveal-grounding tasks-answers.md Decision A — a single-cell highlight from
     inside an offered window is a KNOWN, ACCEPTED false-rejection; measured per T040).` This is not
     an oversight — it must read as a deliberate choice at the code site.
- [x] T028 [US3] **Must land in the same commit as T026 (Decision B is settled — see below; do not
  pick independently).** In `connect-four/server/reasonRenderGuard.mjs`: add a **new exported
  function** `promoteRawCoordinates(text, locale)` — a new symbol, leaving Plan A's
  `stripInternalTokens` and `RANGE_RE` in this file byte-identical (cross-lane constraint 1;
  data-model.md §5; contracts/deep-reveal-grounding-contracts.md §2). Detection reuses
  `stripInternalTokens`'s own `CXRY_RE` (`/\bc(\d+)r\d+\b/gi`, `:28`); delimiter-skipping reuses the
  existing `ZONE_TAG_RE`/`split` pattern (`:63,99`). **The wrapped inner text must be the
  already-flattened word** (`[zone:c4r3]column 4[/zone:c4r3]`), **never the raw token**
  (`[zone:c4r3]c4r3[/zone:c4r3]`) — wrapping the raw token makes `checkP6`
  (`annotationGate.js:295-306`) unconditionally reject the zone regardless of `allowedSet` (its
  `rawCoordRegex` test runs on inner text with no `allowedSet` gate), self-destructing the
  promotion before `checkP5Strong` ever runs. This is the handoff's single most load-bearing fact —
  do not "simplify" this to wrap the raw token. **Decision B (settled — data-model.md §5's
  "UNVERIFIED SKETCH" framing is resolved, not an implementation-time choice anymore): track
  open/close zone-tag depth across the `ZONE_TAG_RE`-split segments and skip promotion in any
  segment where depth > 0** — a `cXrY` token already inside an *existing* zone's own inner text
  (e.g. `[zone:c4r1]watch c4r1 closely[/zone:c4r1]`) must not be re-wrapped, and splitting on
  `ZONE_TAG_RE` alone does not solve this because an open zone's inner text is itself an
  even-indexed segment — depth, not segment parity, is what distinguishes it. (Rejected: restricting
  promotion to net-zero-depth segments — it silently skips promotion in any segment containing both
  an open and a close tag.) T026 case 3 encodes and tests this exact rule; both tasks must ship
  together. Call `promoteRawCoordinates` from `guardExplainMoveLlmPayload` (`:207-225`) as the
  **first** step, before `validateAnnotation` and before the final `stripInternalTokens` call
  (contracts §2's fixed ordering: `promoteRawCoordinates` → `validateAnnotation` →
  `stripFailingZoneSpans` → `stripInternalTokens`).
- [x] T029 [US3] In `connect-four/server/reasonRenderGuard.mjs`: add a `toAllowedSet(aliases)`
  adapter mapping `zones.aliases[]` into `AllowedSetEntry[]` for `checkP5Strong`. **Use the
  corrected mapping, not the earlier-drafted defective one**: for a `cells:`/`windows:` alias, map
  each `{col,row}` (from `expandSpec`, 0-indexed) through the `c${col+1}r${row+1}` conversion
  `zoneAnnotations.mjs`'s local `rcToCellStr` (`:138`) already uses — export `rcToCellStr` from
  `zoneAnnotations.mjs` (it is not currently exported) and reuse it, rather than
  `{ cells: expandSpec(alias.spec) }` directly, which feeds `checkP5Strong`'s `concreteCells` Set
  (1-indexed strings) an array of `{col,row}` objects that would never match (data-model.md §3, the
  `AllowedSetEntry` correction). **Check the newly-exported `rcToCellStr` name for a call-site
  collision** before exporting — it is currently a module-local `const` used once
  (`zoneAnnotations.mjs:138`); confirm no other export in that file already uses the name.

  **Admission default — Decision A (owner's explicit call, against the reviewer's own
  recommendation of per-cell admission): whole-window-only.** An offered `windows:`/`cells:` alias
  admits **only the full window as a single unit** — a highlight naming just one cell that is
  merely a *member* of an offered multi-cell window (but was never itself offered as its own
  standalone single-cell alias) is **rejected**, not silently admitted via per-cell membership.
  Concretely: for each `aliases[]` entry, if `expandSpec(alias.spec)` yields exactly one cell, push
  `{ cells: [rcToCellStr(...)] }` (a normal, single-cell-eligible entry — unaffected by this
  decision). If it yields more than one cell (a `windows:`/multi-cell `cells:` alias), push
  `{ cells: [...cells.map(rcToCellStr)], windowOnly: true }` — the new `windowOnly` flag is
  `checkP5Strong`'s signal (see T027 item 4) to exclude this entry's cells from the shared
  `concreteCells`/`concreteRows`/`concreteCols` Sets used by standalone `cNrM`/`col`/`row` checks,
  and instead register it only in the exact-match `offeredWindowSignatures` Set T027 item 4 adds.

  **This diverges deliberately from `checkP5Strong`'s existing `cells:` highlight-branch design**
  (`annotationGate.js:380-389`), which already treats a multi-cell *highlight* spec as satisfied by
  per-cell membership in the aggregate `concreteCells` Set — that existing branch's semantics are
  unchanged for a `cells:` alias whose members were each independently offered, but no longer apply
  to a window-decomposed cell that was only ever offered as part of a group. **Comment this at the
  `toAllowedSet` code site** (per T027's matching comment) so it reads as a deliberate, sourced
  decision, not an oversight.

  **Owner was warned of the risk and chose this anyway**: because T027 adds `'P5strong'` to
  `SPAN_CARRYING_CODES`, a rejection here now actually strips the span — so this choice risks
  **losing real, correct single-cell highlights** drawn from inside an offered window, not
  admitting wrong ones. The owner may revisit after seeing evidence. **The required mitigation is
  T040 (Phase 6.5, new)**: it must measure and record, per staging board, how often whole-window-
  only rejects a highlight that a per-cell admission rule would have kept. (Corrected: an earlier
  draft of this task said "revisit this default against the four staging boards during T032" — T032
  is the unrelated `boardShowCoordinates.test.js` US4 task and never revisits anything; the
  reference now correctly points at T040.)
- [x] T030 [US3] In `connect-four/server/index.js`: thread a real `allowedSet` (via `toAllowedSet`,
  built from `result.renderDecision.zones.aliases`) into `guardExplainMoveLlmPayload`, **only at
  the fresh-generation call site** (`:1424`, after `computeMechanism` returns). **Do not** add
  `allowedSet` construction at the cache-hit (`:1316`) or not-a-blunder (`:1349`) call sites — they
  have no `renderDecision`/`zones` in scope at all; both keep `allowedSet: null` (research.md D11 —
  this narrows, does not eliminate, the pre-existing coverage gap; state this explicitly in a code
  comment at both unchanged call sites so a future reader does not treat it as an oversight to
  "complete"). This closes OI-143 — do not open a duplicate issue (cross-lane constraint 4).
- [x] T031 [US3] Mark **OI-143 resolved** in `docs/open_issues.md`, referencing this spec (058) and
  T030 as the closing change. Do not open a new issue for it.

**Checkpoint**: US1 + US2 + US3 together are independently testable — re-run all three Independent
Tests before starting US4 (if not already run in parallel).

---

## Phase 6: User Story 4 — The player can find the column and row a reference points to (Priority: P3)

**Goal**: The deep-reveal screen's board shows visible column/row numbering; no other screen
changes.

**Independent Test** (spec.md): open the deep-reveal screen, confirm numbering; open any other
board-showing screen, confirm no change. Independent of US1–US3 — may run in parallel with any of
them.

### Tests for User Story 4

- [x] T032 [US4] **NEW test file** `tests/unit/boardShowCoordinates.test.js` — assert (a)
  `Board.jsx`'s new `showCoordinates` prop defaults to `false` and, when `true`, renders visible
  column (1–7) and row (1–6, per `CLAUDE.md`'s frontend 1-indexed display convention) numbering
  additive to the existing grid, without changing cell size or grid dimensions; (b) every other
  existing `Board.jsx` prop's name/type/default is unchanged (regression guard against the ~17
  other callers, FR-015/SC-007) — assert the full prop list from `BoardImpl`
  (`board, onColumnClick, onCellClick, canPlay, overlays, badge, lastDrop, compact, fullCols,
  selectedCols, onColToggle, highlightedCells, stepLabels, zhCells, windowCounts`, D7) still
  type-checks/renders with `showCoordinates` omitted. **Append this file explicitly to
  `connect-four/package.json` line 17's `test:fast` list** — read the line fresh immediately before
  editing (cross-lane constraint 5); do not rewrite the line.

### Implementation for User Story 4

- [x] T033 [US4] In `connect-four/src/components/Board.jsx`: add an opt-in `showCoordinates` prop
  (default `false`) to `BoardImpl` (`:84-106`), additive only — do not rename, retype, or change
  the default of any existing prop (preserving the existing API per cross-lane constraint 3; Board
  sizing/layout stays Plan B's). When `true`, render column/row number labels around the grid.
- [x] T034 [US4] In `connect-four/src/screens/MistakeDetailScreen.jsx`: pass
  `showCoordinates={true}` **only** to the `<Board>` instance inside the `deepRevealOpen` branch
  (`:410`) — the structurally identical call at `:422` (non-deep-reveal branch, same screen) must
  **not** change (D7's verified insertion point). No other of `Board.jsx`'s ~17 callers change at
  all.

**Checkpoint**: All four user stories independently testable.

---

## Phase 6.5: End-to-end acceptance (all stories) — added post-critique, closes blocking issue 1

**Why this phase exists**: the tasks-critique found the epic's own two headline acceptance criteria
(AC1/SC-001 and AC3/SC-004) had zero owning task in the original T001–T039 list — the four staging
movestrings appeared only in checkpoint prose, never in an executable task. These two tasks close
that gap. **Depends on US1 + US2 + US3 (T004–T031)**; independent of US4 (T032–T034).

- [x] T040 **End-to-end acceptance — re-run the 4 real staging boards through the real pipeline.**
  Per `quickstart.md`'s "End-to-end acceptance (epic AC1)" section, for each of
  `3154`, `315444233213`, `315444233213134122`, `3154442332131341225551` (the epic's own evidence
  table, `docs/epics/deep-reveal-grounding-epic.md`): re-run the explanation through the deployed
  pipeline (not a hand-written fixture — same "real pipeline" bar as T004) and record, per board:
  (a) the offered `aliases[]` spec set, (b) the derived `requiredSet[]` spec set, (c) the set of
  `[zone:...]` specs actually emitted in the served `mechanism` text. Confirm every named
  square/line/future square carries a highlight (SC-001) and that `requiredSet ⊆ emitted` holds for
  all four boards (a live-pipeline companion to T041's static corpus assertion, not a duplicate —
  T041 runs the corpus offline; this task runs the real HTTP/pipeline path). **Required
  measurement (Decision A mitigation, folded in from T029)**: for each board, additionally record
  how many candidate single-cell highlights inside an offered `windows:`/multi-cell `cells:` alias
  were rejected under the whole-window-only rule (T029/T027) that a per-cell admission rule would
  have kept — report a per-board count. This is the owner's explicitly required evidence for a
  possible future revisit of Decision A; it must be a recorded output of this task, not a side
  observation.
- [x] T041 [P] **Required ⊆ offered corpus assertion (AC3/SC-004 — unit test).** Add a new test
  to the existing `connect-four/server/tests/renderCoverageCorpus.test.mjs` (already on
  `package.json` line 17 — no new line-17 entry needed; verified the file already builds
  `buildReasonRenderModel(toNarratorVector(row.evidence))` per corpus row, which is where
  `deriveRequiredSet` and `zones.aliases` are both in scope on the returned model). For every corpus
  record that renders successfully, assert every `requiredSet[].spec` is present among
  `zones.aliases[].spec` (exact string equality, per data-model.md §2's D2 matching rule) — a
  required group whose spec has no offered alias is a hard failure of the Derivation Rule's own
  match-and-drop step (data-model.md §2: "A half with neither a resolvable cell nor a window yields
  **no entry**" — so this assertion should never legitimately fail if `deriveRequiredSet` is
  correct; a failure here is a real regression, not a fixture problem).

**Checkpoint**: AC1/SC-001 and AC3/SC-004 both have a passing, executed task before Documentation.

---

## Phase 7: Documentation (lockstep, per the epic + Constitution Check)

- [x] T035 [P] Add an addendum to `docs/architecture/reason-render-grounded-prompt.md` documenting
  (a) the required-set Derivation Rule and its `deriveRequiredSet` implementation, (b) the
  `future:` spec-prefix mechanism (no prior art in the codebase before this feature — plan.md's
  Constitution Check flags this as the one undocumented convention this plan resolves, not defers).
- [x] T036 [P] Add a new decision entry (**D35**) to `docs/architecture/reason-DECISIONS.md`
  recording: the two-attempt-logging schema (T022's six columns + `served_attempt` semantics), the
  `future:` spec convention, and the explicit carve-out that `checkP5Strong` coverage remains
  partial by design even after this epic (only the fresh-generation call site builds a real
  `allowedSet` — research.md D11; this is a documented, accepted scope boundary, not a residual bug
  to silently "complete" in a later pass).
- [x] T037 [P] **Carry forward the deliberately out-of-scope `P5strong:tg` strip gap.** Add an entry
  to `docs/open_issues.md` (or confirm it's already tracked — check first) describing: a
  `P5strong:tg` failure's span is never stripped even after T027's `SPAN_CARRYING_CODES` fix,
  because its failure-code shape (`P5strong:tg`, no third `:`-segment) doesn't fit
  `stripFailingZoneSpans`'s `spec = specParts.join(':')` extraction (data-model.md §3 item 3, full
  trace). This is narrower than the three gaps the owner named as required, and `tg` is essentially
  never offered as an alias `spec` in practice — flagged for completeness (invariant I12,
  "counterexample per case"), not required for this epic to close. If a new issue id is needed, use
  **OI-170+** (cross-lane constraint 4).
- [x] T024 [P] **Document the schema change (relocated from Phase 4 / US2, retargeted per
  tasks-critique blocking issue 3).** `deep_reveal_failures` does not appear anywhere in
  `docs/architecture/db-schema.md` — it is documented in `docs/architecture/data-model.md` (full
  column list + `Migration: 031_deep_reveal_failures.sql` footer), which the constitution's
  Principle VIII names as the destination for DB schema decisions. Add to
  `docs/architecture/data-model.md` §"Deep Reveal Failures": the six new nullable columns
  (`attempt1_raw_llm_output text`, `attempt1_mechanism text`, `attempt2_raw_llm_output text`,
  `attempt2_mechanism text`, `missing_handles jsonb`, `served_attempt smallint` — per this spec's
  own data-model.md §4), the new `failure_reason` value (`'missing_required_squares'`), and the new
  migration filename (`065_deep_reveal_failures_two_attempts.sql`, number per T002's re-verification).
  A new enum-like value on an existing free-text column needs no migration of its own, only this
  documentation.
- [x] T042 **AC7/SC-008 closing re-run (added post-critique — T001 only captures the baseline, no
  task previously re-ran it after implementation).** After T001–T041 (all implementation, tests, and
  the end-to-end acceptance tasks) are complete: run `eval "$(./worktree-ports.sh)"` then `cd
  connect-four && npm run test:fast` again and confirm **0 failures**, with **no reduction** in the
  number of scenarios covered relative to T001's baseline count (SC-008's explicit "no reduction"
  clause — compare `node --test`'s reported pass/total counts, not just the failure count, since a
  test silently deleted rather than fixed would still show 0 failures).

---

## Phase 8: Deploy prerequisites (local-only — documentation, not tooling against a live env)

Per `CLAUDE.md`'s pre-launch disposability rule: no task in this phase writes to staging or
production. Every live-data action becomes a runbook entry the owner executes personally.

- [x] T038 Append the "Spec 058 — Deep-Reveal Grounding" entry to `docs/deployment_steps.md`,
  following the file's own "Template for new entries" section (Status / When / Blocks / Applies to
  / What's wrong / Run it / Verify — command **and** success condition / Roll back). Content per
  plan.md's "Deploy prerequisites" section (already drafted there, source-verified — copy forward,
  updating the migration filename per T002's re-verified number):
  - **Status**: PENDING
  - **When**: migration before the code deploy; `explanation_cache` TRUNCATE any time before real
    traffic resumes post-deploy
  - **Blocks**: the two-attempt `deep_reveal_failures` INSERT (US2) fails against the pre-epic
    schema without the migration; a stale `explanation_cache` row keeps serving pre-epic,
    ungrounded content without the TRUNCATE
  - **Applies to**: staging / production
  - **Run it** (exact commands, per `docs/deployment_steps.md`'s own template requirement and the
    house convention already used for `061`–`063`/`064` in that file):
    1. Staging: `node --env-file=server/.env.staging server/migrate.js`
       Production: `node --env-file=server/.env.production server/migrate.js`
       (applies `065_...` — T002's re-verified number — plus any other still-unapplied migrations in
       that environment; `migrate.js` is idempotent per-migration via the ledger table)
    2. `TRUNCATE TABLE explanation_cache;` run directly against the target environment's DB
  - **Verify**: `\d deep_reveal_failures` shows the six new columns; a fresh
    `/api/explain-move-llm` call after deploy returns a freshly-generated (non-`cached: true`)
    response
  - **Roll back**: not reversible in a data sense (TRUNCATE) — pre-launch disposability rule
    applies, no backup needed (owner directive 2026-08-03, `CLAUDE.md`)
  - Note explicitly in the entry: **Plan A merges first** (hard prerequisite) — this epic's own
    migration/TRUNCATE steps are independent of Plan A's changes but should not be run before Plan
    A's code is live, since this epic's code depends on the post-Plan-A `reasonRenderGuard.mjs`.
- [x] T039 Confirm no new script is needed for T038's two commands. **Reasoning to verify, not
  assume**: the migration step is a standard `migrate.js` run (`connect-four/server/migrate.js`,
  already the house tool for applying numbered migrations — no per-migration script exists or is
  needed for any other spec's migrations) and the TRUNCATE is a single documented SQL statement the
  owner runs directly (per `staging_checks.md`/`deployment_steps.md` precedent — other TRUNCATE
  steps in this file are plain SQL, not wrapped in a script). If, when drafting T038's exact
  commands, either step turns out to need a repeatable script (e.g. the TRUNCATE needs to run
  against both staging and production with drift verification), write it following house
  conventions verified at `connect-four/server/scripts/reset-staging-db.js`: a real `--help` that
  exits 0 before any required-arg validation; `--dry-run` as the default posture (destructive
  action requires an explicit opt-out flag, not opt-in); a required `--env` flag with **no
  default**; a guard comparing the target `.env.<env>` file's Supabase project ref against a
  hard-coded known-good ref for that environment name (refusing to run against production's ref
  under a `--env staging` invocation or vice versa, mirroring `STAGING_REF`/`PRODUCTION_REF` in
  `reset-staging-db.js`); a typed `"Yes"` confirmation before any write, required **twice** if
  `--env production`; and a distinct exit code for "drift found" (e.g. project-ref mismatch)
  separate from ordinary success/failure exit codes.

---

## Dependencies & execution order

- **Setup (T001–T003)** before everything else.
- **US1 (T004–T010)** before US2 and US3 — a required group with no offered handle is
  unsatisfiable by design (Derivation Rule's own match-and-drop step assumes handles already
  exist).
- **US2 (T011–T023)** before US3 — US3's `checkP5Strong` threading validates against the offered
  *and* required sets US1/US2 produce; US3's `promoteRawCoordinates` promotion also needs a real
  `allowedSet` (built from `renderDecision.zones.aliases`, which US2's `deriveRequiredSet` sits
  alongside). (T024, US2's schema-doc task, is relocated to Phase 7 — see below.)
- **US3 (T025–T031)** depends on US1 + US2.
- **US4 (T032–T034)** is independent — may run in parallel with US1/US2/US3 at any point after
  Setup.
- **Phase 6.5 (end-to-end acceptance, T040–T041)** depends on US1 + US2 + US3 (T004–T031) —
  independent of US4; may run before or after US4.
- **Phase 7 (docs, T035–T037, T024, T042)** — T035–T037 can start as soon as the relevant
  implementation task lands (T035 after T018/T009; T036 after T022/T009; T037 after T027); T024
  after T022; **T042 (the closing `test:fast` re-run) depends on everything above (T001–T041) and
  must be the last Phase 7 task closed** — do not block T035–T037/T024 on every story finishing,
  but do not run T042 early.
- **Phase 8 (deploy prerequisites, T038–T039)** depends on T022 (the migration file must exist to
  be named correctly in the runbook) and should be the last phase closed, since it documents the
  final, as-shipped migration number.

## Parallel execution notes

- T004–T006 (US1 tests) are parallel — different files.
- T011–T015 (US2 tests) are parallel — different files; T016 is a new file, also parallel with
  those, but its assertions depend on T017–T021's real column names, so implement after skimming
  T022's column list even though the test file itself can be scaffolded early.
- T025 and T026 (US3 tests) touch different files and can run in parallel, but both depend on
  T027–T030 landing first to go green (write them red first, per TDD convention, if the team
  follows red-green-refactor for this feature). **T026 and T028 must land in the same commit**
  (Decision B), exactly as **T025 and T027 must land in the same commit** (the pre-existing
  combined-task rule) — both pairs encode/implement the same settled rule and must not diverge.
- T040 and T041 are parallel with each other (different files/paths) but both depend on US1+US2+US3.
- T035–T037, T024 (docs) are parallel with each other and with T032–T034 (US4). T042 is not
  parallel with anything — it is the final task.
