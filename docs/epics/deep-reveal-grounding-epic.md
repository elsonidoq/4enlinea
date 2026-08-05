# Epic 11 — Deep-Reveal Grounding

> **Invocation:** `/epics-manager docs/epics/deep-reveal-grounding-epic.md 1`
> (this file holds exactly one epic; the id argument is optional)

Every spatial thing a deep-reveal explanation names must be **highlighted on the board**, and the
board must be readable enough to locate it. Today the flagship paid feature routinely names a cell,
a line, or a "key square" that the player has no way to find.

**Distinct from [`feature-vector-grounding-epic.md`](feature-vector-grounding-epic.md).** That epic
asks whether the vector asserts *true* things (the A3/A4 fabrication axes). This one is the **render
layer downstream of it** — the facts are right, they are simply never turned into annotations. Per
reason-DECISIONS **D26**, engine soundness and render pruning are deliberately separate steps; do not
merge these two epics.

**Lane:** touches `server/scripts/reason_engine/zoneAnnotations.mjs`,
`server/scripts/renderReasonModel.mjs`, `server/scripts/compute.mjs`, `server/mechanismExplainer.mjs`
and `src/components/Board.jsx`. Conflicts with any concurrent branch in the reason-engine render path.

**Scope source:** the 4 rows in staging `llm_feedback` (all `feature: past_mistakes`, logged
2026-08-04 16:13–16:21Z), root-caused 2026-08-04 by comparing each row's `llm_response` against the
**raw** `mechanism` in `explanation_cache` and against the exact prompt that produced it.

**Sizing:** 4 user stories, server-side + one frontend affordance, 1 migration. Full speckit.

**Hard prerequisite — Plan A.** A parallel worktree ("Plan A") is landing eight small fixes,
including two this epic depends on: `stripInternalTokens`/`RANGE_RE` in
`connect-four/server/reasonRenderGuard.mjs` (widening `RANGE_RE` for en-dashes) and the
`GET /api/user/tts/deep-reveal` handler in `connect-four/server/index.js` (routing it through the
same sanitizer so audio and text derive from one sanitized string). **This epic must not modify
either.** Sequence: Plan A merges first; this epic's spec/plan is written against the
post-Plan-A version of `reasonRenderGuard.mjs`, stating that dependency explicitly rather than
re-deriving or duplicating the fix.

**Cross-lane constraints (owner, mid-review — hard constraints, not suggestions):**
1. `connect-four/server/reasonRenderGuard.mjs` — `stripInternalTokens` and `RANGE_RE` are owned by
   Plan A. Do not modify them; build on the post-Plan-A version.
2. No TTS work in this epic — Plan A owns the `GET /api/user/tts/deep-reveal` sanitizer routing.
   The two-attempt `deep_reveal_failures` logging (Settled decision 5) also lives in
   `connect-four/server/index.js`: keep it in its own region of that file, away from the TTS
   handler.
3. `connect-four/src/components/Board.jsx` (US4) — a separate parallel worktree ("Plan B") may
   touch board sizing. Preserve the existing `Board.jsx` API; treat sizing as owned by Plan B, not
   this epic.
4. Any new open-issue id this epic's spec/plan opens must use the range **OI-170+** (highest
   existing is OI-147; all three parallel lanes would otherwise collide on OI-148). US3 **closes
   the existing OI-143** — do not open a duplicate issue for it.
5. `connect-four/package.json` line 17 (`test:fast`) is a single line listing ~180 test files, and
   all three lanes append to it concurrently. Any test file this epic's plan adds must be listed
   **explicitly** in the plan so the append is a clean, reviewable diff.

---

## Overview

| # | User story | Primary surface | Why it blocks |
|---|---|---|---|
| **US1** | Every referent the mechanism can name has a legal handle to name it with | `zoneAnnotations.mjs` (`buildAnnotationOffer`) | The model had **no legal way** to highlight the winning line or the key square — the two things the user asked about most |
| **US2** | The engine *requires* the mechanism to be built around the load-bearing cell groups | `renderReasonModel.mjs`, `compute.mjs`, `mechanismExplainer.mjs`, migration | Highlighting is optional today and the model declines: 0 zone tags in 3 of 4 sampled responses |
| **US3** | No coordinate reaches the player unhighlighted, and no unoffered tag is served | `reasonRenderGuard.mjs`, `zoneAnnotations.mjs` (`processAnnotations`) | Safety net under US2; also closes OI-143 so promotion can't launder an ungrounded cell |
| **US4** | The player can locate a column/row reference on the board | `src/components/Board.jsx` | *"The board should have numbered columns and rows"* — even a correct reference costs effort |

**Recommended order:** US1 → US2 → US3 → US4. US1 is a hard prerequisite for US2 (a required group
with no handle is unsatisfiable). US4 is independent and can run in parallel.

---

## The evidence (do not re-derive — this is the whole diagnosis)

For each of the 4 feedback rows, the **raw** cached `mechanism` vs what the user was served:

| movestring | raw in `explanation_cache` | served |
|---|---|---|
| `3154` | "By playing **c5** … **c6** is the tougher defense" | "column 5 … column 6" |
| `315444233213` | "the **c2–c5** strip; `[zone:col4]`column 4`[/zone:col4]`…" | "column 2–column 5 strip" |
| `315444233213134122` | "deep threat at **c1r3**" | "deep threat at **column 1**" |
| `3154442332131341225551` | "winning line at **c7r3** … answer with **c3r5** … wins at **c2r6** and **c5r5**" | "column 7 … column 3 … column 2 and column 5" |

**The annotation gate stripped nothing.** Every difference is `stripInternalTokens` rewriting
coordinates. "A lot of missing highlights" is a *generation* problem, not a gate problem.

---

## Settled decisions (reflect verbatim — do not relitigate)

1. **Required cell groups, not an optional offer.** The prompt already carries a
   `# Highlightable regions` block with 6 handles and the line *"Never write a raw square."* The model
   emitted **zero** zone tags in 3 of 4 responses and wrote **6 raw squares**. A soft offer does not
   work; the load-bearing groups become mandatory.
2. **The required set is derived from the causal link's halves, via an explicit cell-derivation
   rule — not from `covers`.** `renderReasonModel.mjs` imports `classifyCausalLink`
   (`server/scripts/reason_engine/causalLinks.mjs`), which returns
   `{ id, confidence, covers, guardrail, text }`. `covers` is a list of field-name *codes* (e.g.
   `'lostResource.terminal'`, `'opponentPunishment.kind'`) and every matched link lists fields from
   **both** halves — it cannot by itself say which half is load-bearing, and it names no cells.
   **Derivation rule:** for each of `fv.lostResource` and `fv.opponentPunishment`, the load-bearing
   cell (if any) is `half.cell ?? half.completingCell` (the same precedence `causalLinks.mjs`'s own
   `denialCell()` helper uses), or the full `half.window` array when the half's story is a line
   rather than a single square (as several `template` functions already render via `cells(window)`).
   A half with neither field yields no required cell — it is not forced into one (case `T-parity`,
   `covers: ['route', 'lostResource.terminal', 'opponentPunishment.terminal']`, is a real example:
   its own template says "the exact culprit square isn't cleanly isolable" and falls back to
   `lostResource.window`). Each derived cell/window is then **matched to an offered handle** by spec
   equality against `buildAnnotationOffer`'s `aliases[].spec` (a `cNrM`, `colN`, or `windows:…`
   string) — not by re-deriving a new spec format. **On match failure** (the derived cell has no
   offered handle), the group is dropped from the required set rather than left unenforceable;
   Settled decision 3 (required ⊆ offered) makes this the same invariant, just applied at
   derivation time instead of only at validation time. Cap the required set at **1–3 groups**
   (one per half that resolves to a cell, plus at most one line/window).
   *Rationale:* requiring a cell the mechanism does not rest on makes the model manufacture a reason it
   matters — the exact A3/A4 fabrication mode `feature-vector-grounding-epic.md` documents.
3. **Required ⊆ offered, as an enforced invariant.** A required group with no legal handle is
   unsatisfiable and would fail every response. This is what makes US1 a prerequisite rather than a
   nice-to-have, and it is directly unit-testable over the coverage set.
4. **Non-compliance policy: retry once, then serve best effort.** Re-prompt naming the missing groups
   explicitly. If attempt 2 still omits them, serve it with the US3 promotion safety net applied.
   Never fail closed — this is a paid feature and today's miss rate is high.
5. **Both attempts are recorded in `deep_reveal_failures`.** The record must carry attempt-1 output,
   the specific missing handles, attempt-2 output, and which one was served.
6. **Prompt shape: keep the existing offer, add a required block.** A
   `# You MUST build the explanation around these` section listing the required handles with their
   roles, plus the rule that each must appear as a zone tag in `mechanism`. The rest of the prompt is
   working (`better_move` / outcomes are reliable) — minimize regression surface.
7. **Raw coordinates are promoted, not flattened.** `c1r3` becomes
   `[zone:c1r3]column 1, row 3[/zone:c1r3]` rather than the current lossy "column 1". Demoted to a
   safety net under US2, because promotion cannot help a response that contains no coordinates at all
   (row `3154` is exactly that case).
8. **Deep (not-yet-playable) fork cells may be offered as handles, framed as "future squares" —
   amending, not reversing, the structural-only-highlights decision.** `zoneAnnotations.mjs`'s
   `buildAnnotationOffer` currently offers handles only for `STRUCTURAL` tag kinds
   (`immediate`/`major`/`double`) on `NEAR_TERM` boards, and deliberately excludes the vector-named
   *overlay* kinds (`figure_7`/`double_threat`) injected onto the decision board — see the
   `STRUCTURAL` constant and the comment above it in `zoneAnnotations.mjs`, and
   `docs/architecture/reason-render-grounded-prompt.md` §"Structural-only highlights": *"the
   vector-named overlay kinds … are EXCLUDED (they often complete deep → highlighting the empty
   cell is the present-threat illusion)"*. That rationale is eval-3's present-threat trap: a deep,
   currently-empty square rendered as an ordinary highlight reads as "this is happening now."
   **What changes:** a new handle class for deep fork cells (e.g. the `forkCells` named by
   `tacticTag: "double_threat"` on the projected-deep board) may now be offered, but only with a
   distinct role/kind that the prompt and the client render as a *future* square — not a present
   structural threat. Concretely: (a) the offered alias carries a role marking it deep/future
   (distinct from `roleText`'s present-tense "the fork square where you get two winning squares at
   once"), (b) the prompt's `# Highlightable regions` block states the rule explicitly: these cells
   are described in future/conditional language ("this square matters later, once X happens"),
   never as a present threat, and (c) the rendered highlight is visually distinguished on the board
   from a present structural highlight (exact styling is a US1 spec decision, not fixed here). The
   mitigation for the present-threat trap moves from *exclusion* (no handle exists) to *framing*
   (a handle exists, but its role and prose are constrained). This directly unblocks the
   `3154442332131341225551` evidence row, whose `forkCells: ["c2r6","c5r5"]` the user asked about
   by name and which were previously unofferable.

---

## Non-obvious facts (verified at source — the spec/plan must respect these)

- **`buildAnnotationOffer` already returns what US2 needs — but each alias carries `spec` directly,
  not only via `zoneAliasMap`.** `zoneAnnotations.mjs`'s `buildAnnotationOffer` returns
  `{ aliases, zoneAliasMap, terms }`; each entry pushed onto `aliases` is
  `{ handle, spec, role, truthBoard, kbId }` (verified at every `aliases.push(...)` call site in that
  function) — the earlier belief that an alias omits `spec` and that only `zoneAliasMap` carries it
  is wrong. `processAnnotations` proves this: it rebuilds `aliasMap` for its own use straight from
  `zones.aliases` (`Object.fromEntries(zones.aliases.map(a => [a.handle, a.spec]))`) and never reads
  `zoneAliasMap` at all. Marking a subset of `aliases` required is a flag plus a comparison, not new
  machinery.
- **`processAnnotations` returns `zonesEmitted` (a boolean) and `keyCells` (already-expanded
  `cNrM` strings) — not "the used-spec set."** Its `usedSpecs` (the set of offered *specs*, e.g.
  `col4`, before cell-expansion) is a local variable and is not part of the return value
  `{ mechanism, keyCells, zonesEmitted, repairs }`. A plan that needs the spec set itself (as
  opposed to expanded cells or a yes/no) must compute it separately, not read it off this return.
- **`renderReasonModel.mjs` drops `zoneAliasMap`, keeping only `aliases` + `terms` — but this loses
  no information, and it is NOT why `checkP5Strong` never runs.** `zoneAliasMap` is reconstructible
  from `aliases[].spec` alone (see above), so restoring the dropped field is not the fix. The real
  reason `checkP5Strong` — the only guard predicate that checks a highlighted cell against real
  engine evidence — never fires live is that the live serving handler in `connect-four/server/index.js`
  never builds an `allowedSet` at all, and `guardExplainMoveLlmPayload`
  (`connect-four/server/reasonRenderGuard.mjs`) documents this itself: *"`allowedSet` is
  intentionally NOT threaded here — the live call site (`server/index.js`) never builds one … so
  `checkP5Strong` never runs on the live path."* This is OI-143. **US3's fix is threading a set
  derived from `aliases[].spec` into the guard call in `server/index.js`** — not restoring
  `zoneAliasMap` in `renderReasonModel.mjs`, which would be wasted work.
- **`computeMechanism` discards attempt 1 on retry.** `mechanismExplainer.mjs`:
  `let attempt = await runLlmAttempt(...); if (isLlmError(attempt)) attempt = await runLlmAttempt(...)`
  — the first result is overwritten. Returning **both** attempts is a prerequisite for decision 5.
- **`isLlmError` is currently the only retry trigger** (`callError || parseError`). Annotation
  non-compliance is a new trigger, not a new retry loop.
- **`[zone:col4]` and `[zone:col2]` reaching the user (row `315444233213`) is evidence the pipeline
  worked, not a leak — do not task the plan with "characterizing a drop-path failure" that doesn't
  exist.** `col4`/`col2` are not handles at all; they are the **expanded spec** of the offered
  handles `better-col`/`played-col` (`buildAnnotationOffer` builds those as `spec = 'col' + (col+1)`).
  `processAnnotations` rewrites handle → spec by design
  (`text.replaceAll('[zone:' + handle + ']', '[zone:' + spec + ']')`), so seeing the *spec* form in
  cached text is the intended output of a successful expansion, not an unoffered tag slipping past
  `dropUnoffered`.
- **The client already accepts `cNrM` specs.** `isValidSpec` in `connect-four/src/lib/annotatedText.js`
  matches `/^c\d+r\d+$/` (alongside `colN`/`row N`/`cells:`/`windows:`/`tg`). US2/US3 promotion
  renders as a real highlight with **no frontend change**.
- **A text transform at the render seam MUST skip zone-tag delimiters.** `stripInternalTokens`
  (`connect-four/server/reasonRenderGuard.mjs`) splits on `ZONE_TAG_RE` and rewrites only the prose
  *between* delimiters, because rewriting inside a spec turns `[zone:cells:c4r1,c4r2]` into
  `[zone:cells:column 4,column 4]`, which `isValidSpec` then rejects and the client **silently drops
  the highlight**. Any new transform must do the same. Note `RANGE_RE`/`stripInternalTokens` in this
  file are owned by Plan A for this epic's duration (see the cross-lane constraints above) — read
  the behavior, do not edit it here.
- **The engine already knows the answers the user asked for.** For `3154442332131341225551` the
  vector carries `entryCell: "c3r5"`, `forkCells: ["c2r6","c5r5"]`, `tacticTag: "double_threat"` and
  both `forkWindows` — i.e. *"which is the double threat"* was answerable from data already in the
  prompt. This is a rendering gap, not an evidence gap.
- **`deep_reveal_failures` is currently written only on terminal failure**, in
  `connect-four/server/index.js`, on `result.callError || result.parseError || !result.mechanism`.
  Decision 5 widens its meaning from "failures" to "quality incidents"; `raw_llm_output` is
  `NOT NULL` and there is one row per failure, so recording two attempts needs a migration.
- **`classifyCausalLink` returns `{ id, confidence, covers, guardrail, text }`; `covers` names
  field codes, not cells, and cannot discriminate the load-bearing half.** See Settled decision 2
  for the actual cell-derivation rule (`half.cell ?? half.completingCell`, or `half.window`).
- **Pre-launch data rule applies.** Staging/production are disposable; `explanation_cache` should be
  TRUNCATEd on deploy rather than migrated, since cache hits bypass producer guards.

---

## Acceptance criteria (epic-level)

1. For each of the 4 staging boards above, the re-rendered explanation carries a highlight on **every**
   cell, line and square it names — verified by re-running the position, not by a hand-written fixture.
2. No raw square (`cNrM`, `cN`, `cN–cM` in any dash form) reaches the client **on the deep-reveal
   text response**. This criterion is text-only, on the post-Plan-A `stripInternalTokens`/`RANGE_RE`.
   Whether the *spoken* (TTS) surface is also clean is **Plan A's acceptance criterion, not this
   epic's** — Plan A owns routing `GET /api/user/tts/deep-reveal` through the same sanitizer;
   this epic does no TTS work and makes no claim about audio.
3. Required ⊆ offered holds for every board in the coverage set (unit test), including the new
   "future square" handle class (Settled decision 8).
4. A response missing a required group produces exactly one retry, and a `deep_reveal_failures` row
   carrying both attempts and the missing handles.
5. `checkP5Strong` runs live with a real `allowedSet` derived from `aliases[].spec` and threaded
   into `guardExplainMoveLlmPayload` from `server/index.js` (OI-143 closed by this epic — do not
   open a duplicate issue for it).
6. The deep-reveal board renders numbered columns and rows, via a new **opt-in prop** on
   `connect-four/src/components/Board.jsx`, enabled only on the deep-reveal screen. The existing
   `Board.jsx` API is preserved for every other caller; no other screen's rendering changes.
   Sizing/layout changes to `Board.jsx` are out of scope here — a separate parallel worktree ("Plan
   B") owns board sizing; do not touch it.
7. `npm run test:fast` green (baseline is **0** failures since 2026-08-04). Any test file this
   epic's plan adds to the `test:fast` list must be an explicit line-level addition to
   `connect-four/package.json` line 17 (a single line listing ~180 files, appended to concurrently
   by parallel lanes) — never a wholesale rewrite of that line.

---

## NOT included (so scope cannot grow silently)

- **The TTS/text divergence and the en-dash range bug — not this epic's work, at all.** `GET
  /api/user/tts/deep-reveal` (`server/index.js`) reads the **raw** cached text and runs only
  `stripAnnotationsForTTS`, never `stripInternalTokens` — which is why the coach *speaks* "c5"/"c1r3"
  while the screen shows "column 5"/"column 1". And `RANGE_RE = /\bc(\d+)-c(\d+)\b/`
  (`reasonRenderGuard.mjs`) is an ASCII hyphen, so the model's en-dash `c2–c5` misses the range rule
  entirely. Both are owned end-to-end by the parallel **Plan A** worktree, not a "small-fixes plan"
  within this epic — see the **Hard prerequisite — Plan A** section and the cross-lane constraints
  at the top of this file. This epic must not modify `stripInternalTokens`/`RANGE_RE` and must not
  do any TTS work; it is written to build on the post-Plan-A version of `reasonRenderGuard.mjs` and
  states that dependency explicitly rather than duplicating or re-deriving the fix.
- Changing what the feature vector *asserts* — that is `feature-vector-grounding-epic.md`.
- OI-139 (`stripFailingZoneSpans` no-ops on the `!` variant) — latent, no current emitter.
- Coach/lesson audio, non-deep-reveal explanation surfaces.
- Board sizing/layout on `connect-four/src/components/Board.jsx` — owned by the parallel "Plan B"
  worktree; US4 adds an opt-in numbering prop only and must not touch sizing.
- Numbered columns/rows on any board surface other than the deep-reveal screen (game, challenge,
  lesson, admin boards) — deferred, see `### Deferred` below.

### Deferred

- **Board numbering on non-deep-reveal screens.** `Board.jsx` is shared by ~17 screens; rolling
  numbered coordinates out everywhere is a separate visual-regression surface this epic does not
  cover. Deferred per owner decision (opt-in prop, deep-reveal only "for now"): enabling it
  elsewhere is a cheap per-screen follow-up once the prop exists, not foreclosed, just not this
  epic's job.

---

## Authoritative sources of truth

- `docs/architecture/reason-INVARIANTS.md`, `reason-DECISIONS.md`, `reason-case-taxonomy.md`,
  `blunder-reason-evidence.md` — read all four, in order, before touching the engine.
- `docs/architecture/reason-render-grounded-prompt.md` — the annotation subsystem's design record;
  governs `buildAnnotationOffer`'s structural-only-highlights rationale (§"Structural-only
  highlights") that Settled decision 8 amends. Read before speccing US1/US2.
- `docs/architecture/reason-AGENT-PREAMBLE.md` — reuse verbatim to prompt a fresh-context agent.
- `docs/open_issues.md` — OI-143 (the `allowedSet` trace, closed by this epic's US3 — do not open a
  duplicate; any new issue this epic's spec/plan opens uses **OI-170+**), OI-124, OI-126, OI-139.
- Staging `llm_feedback` and `explanation_cache` — the raw evidence above.
