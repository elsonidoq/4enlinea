# Research: Deep-Reveal Grounding

All open technical decisions were resolved before this file was written — Epic 11
(`docs/epics/deep-reveal-grounding-epic.md`) already carries 8 "Settled decisions," source-verified
against the codebase, and `spec.md` reproduces the two most implementation-shaping ones (the
Derivation Rule, the Cross-Lane Constraints) verbatim. Per `docs/best_practices_spec_driven_development.md`
("Red flags during epic writing" — "brainstorming section empty → design already resolved, skip
clarify/plan, write tasks directly"), this file documents the *implementation-shape* decisions this
plan makes on top of those settled decisions, each traced to a verified citation, not open questions.

## D1 — Where the required-set derivation lives

**Decision**: a new function, `deriveRequiredSet(pruned, zones)`, added to
`connect-four/server/scripts/renderReasonModel.mjs`, called from both `buildReasonRenderModel` (feeds
the prompt's new required-block) and `buildRenderDecision` (persists the required set for the
retry-compliance check and for the grader/render_decision ground truth).

**Rationale**: `renderReasonModel.mjs` is the only module that already has both halves
(`pruned.lostResource`/`pruned.opponentPunishment`, via `pruneVector(nv)`) and the offered alias set
(`buildAnnotationOffer(pruned, boardSelectionDecisions(pruned))`, called at
`renderReasonModel.mjs:108/125/189` — verified by direct read) in scope simultaneously. Both
`buildReasonRenderModel` (renderReasonModel.mjs:98) and `buildRenderDecision` (renderReasonModel.mjs:183)
already run the identical `pruneVector` → `classifyCausalLink` → `buildAnnotationOffer` sequence, so
adding one derived field to both keeps them in the "identical routing" invariant the module's own
comment states (`renderReasonModel.mjs:180-182`: *"Reuses the same classify+assert path as
buildReasonRenderModel so routing is identical."*).

**Alternative considered and rejected**: deriving the required set inside `causalLinks.mjs`. Rejected
because `classifyCausalLink`'s contract is `{ id, confidence, covers, guardrail, text }` (verified,
`causalLinks.mjs:115` `classifyCausalLink(fv, ctx)`) — extending it with cell-derivation logic would
conflate "which causal frame fired" with "which cells are load-bearing," the exact confusion FR-003
exists to prevent (`covers` names field codes, not cells — spec.md Derivation Rule, quoted verbatim
from the epic).

**Precedent for the `?? completingCell` precedence**: `causalLinks.mjs:23`,
`const denialCell = (h) => h?.cell ?? h?.completingCell ?? null;` — the exact precedence the Derivation
Rule requires reusing (spec.md: *"the same precedence causalLinks.mjs's own denialCell() helper
uses"*). `deriveRequiredSet` reuses this constant directly (`import { denialCell } from
'./reason_engine/causalLinks.mjs'`) rather than reimplementing the `??` chain, per I8
(reason-INVARIANTS.md: "reuse existing detectors as evidence — do not reinvent").

## D2 — Matching a derived cell/window to an offered handle (spec equality)

**Decision**: match by exact string equality against `aliases[].spec`, where a single derived cell
compares against a `cNrM` alias spec, and a derived `half.window` array compares against a
`windows:c1r1,c2r2,...` alias spec built the same way `zoneAnnotations.mjs`'s own `tagSpec()` builds
it (`zoneAnnotations.mjs:44-47`: `'windows:' + tag.window.join(',')`).

**Verified alias shape**: every `aliases.push(...)` call site in `buildAnnotationOffer`
(`zoneAnnotations.mjs:68`, `:82`) pushes `{ handle, spec, role, truthBoard, kbId }` — `spec` is
present on every alias, confirming the epic's non-obvious fact ("each alias carries `spec` directly")
against the actual code, not the doc comment.

**On match failure**: per FR-004/spec Derivation Rule, drop the group from the required set — no
fallback, no substitution. `deriveRequiredSet` returns `[]` entries silently dropped, not an error;
`renderCoverageCorpus.test.mjs`/`renderUniverse.test.mjs` (existing corpus tests) are the place a
regression in match-rate would surface, per the existing coverage-test pattern
(`reason-render-grounded-prompt.md` §3e/§5, "P4 — grader + sampler integration").

## D3 — Retry trigger for required-set non-compliance

**Decision**: extend `mechanismExplainer.mjs`'s existing single-retry loop (`computeMechanism`,
`mechanismExplainer.mjs:98-99`) with a second trigger alongside `isLlmError`, rather than adding a
second retry loop.

**Verified current code** (`mechanismExplainer.mjs:70,98-99`):
```js
const isLlmError = (r) => Boolean(r.callError || r.parseError);
...
let attempt = await runLlmAttempt(prompt, renderDecision, call);
if (isLlmError(attempt)) attempt = await runLlmAttempt(prompt, renderDecision, call); // retry once
```
This confirms the epic's non-obvious fact verbatim: "the first result is overwritten" and "`isLlmError`
is currently the only retry trigger."

**Compliance check — pinned, no hedge (resolves plan-critique blocking issue 3).** An earlier draft
of this decision left two candidate targets ("`[zone:handle]` ... or its already-expanded `spec`,
post `processAnnotations`"). Verified which one is even reachable: `runLlmAttempt`
(`mechanismExplainer.mjs:50-58`) calls `postprocessAnswer` (`compute.mjs:294`), which calls
`processAnnotations` (`zoneAnnotations.mjs:191`), which **rewrites every offered `[zone:{handle}]`
into its expanded `[zone:{spec}]`** before `attempt.mechanism` is ever produced
(`zoneAnnotations.mjs:209-211`: `text.replaceAll(\`[zone:${handle}]\`, \`[zone:${spec}]\`)`). No
handle ever survives to the point `computeMechanism` inspects `attempt.mechanism` — checking for
`[zone:{handle}]` there, as an earlier draft implied, would fail on every single request (the
handle is never present at that point), triggering a retry and a `deep_reveal_failures` row on
every call. The check is therefore pinned to **the expanded `spec`**, and specifically to
`processAnnotations`'s own local `usedSpecs` Set (`zoneAnnotations.mjs:208,210`) rather than a
fresh string search — `usedSpecs` already encodes exactly "was this offered zone actually used,"
correctly excluding a handle that merely appears as a substring of unrelated prose. `usedSpecs` is
not currently returned by `processAnnotations`, `postprocessAnswer`, or `runLlmAttempt` — surfacing
it requires one small, explicit change at each of those three call sites (data-model.md §2,
Consumer 2, has the full three-hop trace with each function's current body quoted verbatim). The
check becomes `requiredSet.every(g => attempt.usedSpecs.includes(g.spec))`.

Per Settled decision 4 (spec.md, US2 Acceptance Scenario 2/3), the retry prompt must explicitly name the
missing required handles; `computeMechanism` must therefore build a second, amended prompt for the
retry call rather than resending the identical `prompt` — this is new logic, since today's retry
resends the same `prompt` unchanged (`mechanismExplainer.mjs:98-99` passes the same `prompt`
variable to both calls).

**Both attempts always kept**: `computeMechanism`'s return shape must widen from "last attempt wins"
(today's `attempt` variable is reassigned, discarding attempt 1 — the exact behavior the epic's
non-obvious fact names) to `{ ...attempt2, attempt1, missingHandles }`, since FR-009/FR-010 require the
second attempt to always be served and both attempts to always be recorded.

## D4 — `deep_reveal_failures` needs a migration for two-attempt recording

**Decision**: add a new migration
(`connect-four/server/migrations/065_deep_reveal_failures_two_attempts.sql` — number verified against
disk at plan time, see D8; this filename is now consistent with plan.md's Source Code map, which is
authoritative — an earlier draft of this decision used a different placeholder filename,
`0NN_deep_reveal_failures_attempts.sql`; re-verify the number at task-execution time via
`ls connect-four/server/migrations/ | tail -5` since two other concurrent worktrees may also be
adding migrations) that adds nullable
columns to the existing table rather than restructuring it, so the existing terminal-failure insert
(`server/index.js:1363-1372`) keeps working unchanged.

**Verified current schema** (`connect-four/server/migrations/031_deep_reveal_failures.sql`, full file
read): every column is `NOT NULL` — `position_hash`, `movestring`, `col`, `endpoint`, `llm_prompt`,
`raw_llm_output`, `failure_reason` — and the table is written from exactly one call site
(`server/index.js:1363`, inside the terminal-failure branch `if (result.callError ||
result.parseError || !result.mechanism)` at `server/index.js:1360`). This confirms the handoff's
claim that a migration is required: a "missing required group after retry" incident is NOT a terminal
failure under today's condition (the retried `result.mechanism` is non-empty; it just failed the new
compliance check), so there is no existing writer for it, and `raw_llm_output text NOT NULL` forces
a schema decision either way (new nullable columns, or leaving the single-attempt columns alone and
adding an attempt-2 column set).

**New columns** (additive, nullable, non-breaking): `attempt1_raw_llm_output text`,
`attempt1_mechanism text`, `attempt2_raw_llm_output text`, `attempt2_mechanism text`,
`missing_handles jsonb`, `served_attempt smallint`. The existing terminal-failure insert continues
writing only `raw_llm_output`/`failure_reason` (unaffected); a new insert site for the "retry due to
missing required squares" case (Settled decision 5) writes the new columns and sets
`failure_reason = 'missing_required_squares'`.

**Deploy prerequisite**: yes — this is a schema migration under `connect-four/server/migrations/`, so
`docs/deployment_steps.md` gets a new entry (standing checklist item 1). No data migration/backfill is
needed (existing `deep_reveal_failures` rows are unaffected by additive nullable columns; pre-launch
disposability per `CLAUDE.md` means no backfill of historical rows into the new columns either).

## D5 — `checkP5Strong` has THREE silent-fallthrough/coverage gaps, not one — a full re-walk of `annotationGate.js` + `reasonRenderGuard.mjs` (plan-critique systemic finding)

**Decision**: fix all three in one task (per the owner's answer):
1. add a `spec.match(/^windows:(.+)$/)` case to `checkP5Strong`
   (`connect-four/server/annotationGate.js:323-403`), alongside its existing
   `colN`/`cNrM`/`cells:`/`rowN` cases;
2. strip a leading `future:` prefix before those same four checks, so a `future:cNrM` or
   `future:windows:...` spec (US1) is checked identically to its unprefixed form;
3. add `'P5strong'` to `SPAN_CARRYING_CODES` in `reasonRenderGuard.mjs:151`.

**Why a full re-walk, not a patch of the one gap the epic's OI-143 write-up named**: the plan-critique
found two more instances of the exact class the plan's own first draft diagnosed for `windows:` — the
owner's answer confirmed both as "real defects with no alternative resolution" and directed
"re-walk `annotationGate.js` + `reasonRenderGuard.mjs` end-to-end ... fix every instance of that class
found." This pass did that read (both files, every exported function) and confirms exactly these
three — no further instance was found in `checkP1`/`checkP2`/`checkP3`/`checkP5`/`checkP6`
(annotationGate.js) or `stripInternalTokens`/`guardExplainMovePayload` (reasonRenderGuard.mjs),
because those all delegate to `zoneParser.js`'s `isValidSpec`/`expandSpec` — the single generic
parser — rather than `checkP5Strong`'s own hand-rolled regex set. (One narrower, pre-existing,
out-of-scope gap was also found in the course of this re-walk — a `P5strong:tg` failure's span is
never stripped even after fix 3, because its failure-code shape has no third `:`-segment for
`reasonRenderGuard.mjs`'s span-extraction to find one; see data-model.md §3, item 3, for the full
trace and why it is left out of scope for this plan.)

1. **`windows:` (originally D5)**: `buildAnnotationOffer`'s `tagSpec()` (`zoneAnnotations.mjs:44-47`)
   emits `windows:c1r1,c2r2,...` for any window-bearing structural tag — confirmed a valid, recognized
   spec format by both `server/zoneParser.js:17` (`isValidSpec`: `|| /^windows:/.test(spec)`) and its
   `expandSpec` case (`zoneParser.js:109-110`). But `checkP5Strong`
   (`annotationGate.js:349-399`, read in full) only branches on `tg`, `^col(\d+)$`, `^c(\d+)r(\d+)$`,
   `^cells:(.+)$`, `^row(\d+)$` — **there is no `windows:` branch**, so a `[zone:windows:...]` spec
   silently falls through every `if`/`continue` in the loop and is never checked, neither admitted nor
   rejected. Since Settled decision 8 (US1) and the Derivation Rule (US2, "the full `half.window`
   array … when the half's story is a line rather than a single square") both produce `windows:`
   specs as a normal, expected case — not an edge case — threading a real `allowedSet` into
   `checkP5Strong` (US3, closing OI-143) without this fix would silently under-check every
   line/window highlight (current behavior: falls through, no failure recorded — effectively always
   "passes" by omission).
2. **`future:` (new, found by the required re-walk)**: the plan's own earlier draft asserted that
   stripping the `future:` prefix inside `zoneParser.js`'s `isValidSpec`/`expandSpec` gives
   `checkP1`/`checkP2`/`checkP5`/`checkP6` coverage "for free" (they call those helpers) — verified
   true for those four, but verified **false** for `checkP5Strong`, which never calls either helper
   and matches raw spec strings with its own regexes. A `future:c2r6` or `future:windows:...` spec
   matches none of `checkP5Strong`'s four branches and falls through identically to gap 1. Since US1
   exists specifically to create `future:` handles and US3 exists to ground them, every future-square
   highlight would be silently unchecked without this fix.
3. **`SPAN_CARRYING_CODES` (new, found by the required re-walk — this one is in the *consumer* file,
   `reasonRenderGuard.mjs`, not `annotationGate.js`)**: verified,
   `reasonRenderGuard.mjs:151`: `const SPAN_CARRYING_CODES = new Set(['P1', 'P2', 'P5', 'P6']);` —
   every code `checkP5Strong` actually emits (`P5strong:tg`, `P5strong:col_not_allowed:*`,
   `P5strong:cell_not_allowed:*`) is absent from that set. `stripFailingZoneSpans`
   (`reasonRenderGuard.mjs:162-177`) only strips a span whose failure code is in
   `SPAN_CARRYING_CODES` (`:166`). So even after gaps 1 and 2 are fixed and a real `allowedSet` is
   threaded, a `checkP5Strong` rejection still flags `validateAnnotation`'s result invalid (firing the
   `console.warn` at `reasonRenderGuard.mjs:216`) but the offending `[zone:...]` span is **not**
   stripped — it reaches the player unchanged. This is exactly the failure mode US3/FR-012/SC-006
   exist to close, and exactly why gap 3 must ship in the same task as gaps 1-2: fixing only the
   spec-matching without this would still serve the ungrounded highlight it now correctly detects.

See data-model.md §3 for the fix in full, including the `AllowedSetEntry` adapter's own separately-
verified defect (an earlier draft's `{ cells: expandSpec(alias.spec) }` fed `checkP5Strong` the wrong
shape — objects, not the 1-indexed strings it expects).

## D6 — Future-square visual mechanism: the palette has 4 colors, not 7

**Decision, carrying forward the owner's mechanism** (per the handoff, not restated in spec.md): a
reserved distinct color for future-square handles, plus future-tense prose — not a `Board.jsx`
render-path change.

**Correction to the handoff**: the handoff describes "the existing 7-colour highlight palette in
`src/lib/annotatedText.js`." Verified by direct read: `ZONE_COLORS` (`annotatedText.js:11-16`) has
exactly **4** entries (`#5B9BD5` blue, `#E8543E` red, `#2FAA5A` green, `#8B5CF6` purple) — the
surrounding comment ("7-color pool for zone highlighting," `annotatedText.js:8`) is stale relative to
the array it describes. `getZoneColor(spec)` (`annotatedText.js:25-32`) hashes the spec string mod
`ZONE_COLORS.length`, so it is genuinely a 4-color pool today, deterministically keyed off the spec
string as the handoff states — only the count is wrong. This plan reserves a 5th, visually distinct
color (e.g. an amber/dashed treatment, chosen at implementation time against the existing 4 for
contrast) for future-square specs specifically, added to `ZONE_COLORS` or a parallel constant, rather
than assuming a 7th slot already exists unused.

**Verbal distinguishing — corrected location**: handled entirely in the prompt, specifically the
`# Highlightable regions` block inside `assembleGroundedPrompt`
(`connect-four/server/scripts/renderReasonModel.mjs`, currently line 311 of that file — verified by
direct read of `export function assembleGroundedPrompt(model)`, which builds `regions` from
`model.zones.aliases` and emits the `'# Highlightable regions'` heading itself). **An earlier draft
of this decision named `compute.mjs`'s `buildPromptForCondition` instead — that is wrong.**
`compute.mjs` never builds this block itself; `buildPromptForCondition` calls
`assembleGroundedPrompt`, which is where the block's literal text lives. plan.md's Source Code map
already correctly omits `compute.mjs` for this reason; this file (and an earlier draft of
data-model.md §2) did not, and both are now corrected to point at `renderReasonModel.mjs`. Verbal
distinguishing is also handled in `roleText()` (`zoneAnnotations.mjs:36-41`) via a new future-tense
role string for the deep fork-cell handle class, per Settled decision 8(a)/8(b).

**Concrete mechanism (see plan.md §"The future-square visual mechanism" for the full design, and
data-model.md §1)**: a `future:` string prefix on the spec itself (e.g. `future:c2r6`), stripped by
one added line in each of `server/zoneParser.js`'s `isValidSpec`/`expandSpec` and
`src/lib/annotatedText.js`'s `isValidSpec`/`getZoneColor`/`zoneToOverlays`/`zoneToWindowGroups`
before delegating to the existing shape checks — so cell *resolution* is byte-identical to today,
and only *validity-recognition* and *color selection* branch on the prefix. `getZoneColor` gains an
early branch returning a new, reserved 5th constant for any `future:`-prefixed spec. **Ambiguity
removed (an earlier draft of this line said the color would be "added to `ZONE_COLORS` or a parallel
constant" — that is now settled, not a choice)**: it must be a **parallel constant, never appended to
`ZONE_COLORS`**, because `getZoneColor(spec)` (`annotatedText.js:25-32`) hashes the spec string
`mod ZONE_COLORS.length` — growing the 4-entry array to 5 would silently reassign the color of every
existing (non-future) spec whose hash now lands on a different modulus, a visible regression to every
already-shipped highlight. plan.md is correct on this point; this file's earlier hedge is the one
being fixed. A concrete hex (plan.md sketches `#D97706`, amber) is an **UNVERIFIED SKETCH — adapt**
against the existing design-token palette and any collision with `Board.jsx`'s inline semantic colors
(`shimStyle`, `Board.jsx:13-42`) before finalizing.

## D7 — US4 board-numbering insertion point

**Decision**: an opt-in `showCoordinates` prop on `BoardImpl` (`connect-four/src/components/Board.jsx:84-106`),
rendered as row/column number labels around the grid, passed only from the deep-reveal-open branch of
`MistakeDetailScreen.jsx`.

**Verified insertion point**: `MistakeDetailScreen.jsx:410` renders `<Board board={boardObj.board}
compact canPlay={false} overlays={overlays} zhCells={zhCells} />` inside the `deepRevealOpen` branch
(`MistakeDetailScreen.jsx:392,395-410`); the structurally identical call at `MistakeDetailScreen.jsx:422`
renders in the non-deep-reveal branch of the same screen. Only the line-410 call site gets the new
prop — the line-422 call site (same screen, deep reveal not yet opened) must NOT change, and no other
of Board.jsx's ~17 callers change at all (spec FR-015). Verified full `BoardImpl` prop list
(`Board.jsx:84-105`): `board, onColumnClick, onCellClick, canPlay, overlays, badge, lastDrop, compact,
fullCols, selectedCols, onColToggle, highlightedCells, stepLabels, zhCells, windowCounts` — no
existing numbering prop, confirming the epic's negative claim first-hand rather than by inference.

## D8 — Open-issue numbering and migration numbering are two different collision risks

The epic reserves **OI-170+** for any new open issue this spec/plan opens (Cross-lane constraint 4,
quoted verbatim in spec.md) — this plan opens none (US3 closes OI-143, no new issue). Migration file
numbers carry no equivalent reserved range in the epic; per memory
`project_migration_ledger_and_pooler` ("schema_migrations tracks FILENAMES — 061 collided"), the exact
number for D4's migration must be verified against the disk state at task-execution time, not assumed
now. (Verified during planning: the correct next number is `065` — highest existing is
`064_drop_correct_col.sql`; `032` is already `032_blunders_new_tags.sql` and must not be reused, an
error an earlier draft of plan.md made and self-corrected.)

## D10 — Raw-coordinate promotion (`promoteRawCoordinates`, US3, FR-011) resolves plan-critique blocking issue 1 and decisions 1/2

**Decision**: a new exported function, `promoteRawCoordinates(text, locale)`, in
`connect-four/server/reasonRenderGuard.mjs`, called from `guardExplainMoveLlmPayload` before
`validateAnnotation` and before the final `stripInternalTokens` call. Full design, including a defect
this planning pass found (a naive design self-rejects via `checkP6`) and why the fallback the owner's
Decision 2 asked for falls out of correct ordering with no new code, is in data-model.md §5 — not
duplicated here. Headline citations: insertion point `reasonRenderGuard.mjs:207-225`
(`guardExplainMoveLlmPayload`'s current body, read in full); detection pattern reuses
`stripInternalTokens`'s own `CXRY_RE` (`reasonRenderGuard.mjs:28`); delimiter-skipping reuses the
existing `ZONE_TAG_RE`/`split` pattern (`reasonRenderGuard.mjs:63,99`); the `checkP6` self-rejection
risk is `annotationGate.js:295-306`, read in full.

**Why a new symbol rather than editing `stripInternalTokens` (Decision 1, owner's answer)**:
Cross-lane constraint 1 forbids modifying `stripInternalTokens`/`RANGE_RE` (Plan A's). A new,
separate export in the same file is a non-overlapping diff against Plan A's edits — same file,
disjoint symbols.

## D11 — `guardExplainMoveLlmPayload` has three call sites; only one can build a real `allowedSet`

**Verified** (`server/index.js`, `grep -n "guardExplainMoveLlmPayload"`): three call sites —
`server/index.js:1316` (cache-hit early return, inside the `explanation_cache` lookup branch),
`server/index.js:1349` (not-a-blunder early return), `server/index.js:1424` (fresh-generation
response, after `await computeMechanism(...)`). Only the third has a `renderDecision` in scope:
`computeMechanism`'s return is `{ notABlunder: false, evidence, nv, prompt, renderDecision,
...attempt }` (`mechanismExplainer.mjs`, full return statement read), and `renderDecision.zones` is
`{ aliases: zones.aliases, terms: zones.terms }` (`renderReasonModel.mjs:235`) — so
`result.renderDecision.zones.aliases` is exactly the offered-handle set `toAllowedSet` (data-model.md
§3) needs, and it is available at `server/index.js:1424`'s call site. The cache-hit and
not-a-blunder branches have no `zones`/`renderDecision` in scope at all (a cache hit reads
`cached.deep_reveal_json` — no aliases were ever recomputed; the not-a-blunder branch returns before
`computeMechanism` runs any prompt/zone logic) — for both, `checkP5Strong` correctly stays un-run
(`allowedSet` stays `null`), same as `reasonRenderGuard.mjs`'s own current doc comment already states
for the pre-this-plan baseline ("`allowedSet` is intentionally NOT threaded here ... a real, currently
accepted coverage gap versus the offline eval path," `reasonRenderGuard.mjs:193-197`) — this plan
narrows, but does not eliminate, that gap: only the fresh-generation path gets `checkP5Strong`
coverage. This must be stated explicitly in plan.md rather than left implied, per the owner's answer.

## D12 — Testing decisions

- **US3's `allowedSet`-threading integration test** lives in `server/tests/reasonRenderGuard.test.mjs`
  (already imports and exercises `guardExplainMoveLlmPayload` — extend in place, no new file). Add
  cases for: (a) `promoteRawCoordinates` promoting a bare `cXrY` to a real highlight when it matches
  an offered alias, (b) the same falling back to flattened "column N" prose (no residual `[zone:...]`
  tag) when `checkP5Strong` rejects it, (c) `SPAN_CARRYING_CODES` actually stripping a `P5strong:*`
  failure's span (this was previously untestable — `allowedSet` was never threaded live).
- **`checkP5Strong`'s new `windows:` branch, `future:`-prefix handling (D5)** are unit-tested in
  `tests/annotationGate.test.js` — verified present in `connect-four/package.json`'s `test:fast` line
  and already the home of `checkP5Strong`'s existing P1-P5Strong coverage; the new branches extend
  that file rather than fragmenting coverage across two files for one function.
- **`processAnnotations`'s new `usedSpecs` return field (D3)** is unit-tested in
  `server/tests/zoneAnnotations.test.mjs` (existing file, already exercises `processAnnotations`);
  the three-hop plumbing through `postprocessAnswer`/`runLlmAttempt` is exercised end-to-end by
  `server/tests/mechanismExplainer.test.mjs`'s existing required-set-miss fixture (US2).
- **Two genuinely new test files** are needed (no existing file's scope naturally covers them):
  `server/deepRevealFailuresLogging.test.mjs` (US2/US3 — the new two-attempt insert path, a behavior
  with no existing test file since today's single-insert terminal-failure path is untested in
  isolation from the rest of the handler) and `tests/unit/boardShowCoordinates.test.js` (US4 — a new
  `Board.jsx` prop plus the "every other screen unchanged" regression guard). Both must be added as
  explicit line-level diffs to `connect-four/package.json` line 17 (cross-lane constraint 5).
