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
2. **The required set is derived from the causal link, not from everything the engine knows.**
   `renderReasonModel.mjs:6` already imports `classifyCausalLink`; the link names which halves are
   load-bearing (`lostResource`, `opponentPunishment`). Cap the required set at **1–3 groups**.
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

---

## Non-obvious facts (verified at source — the spec/plan must respect these)

- **`buildAnnotationOffer` already returns what US2 needs.** `zoneAnnotations.mjs` returns
  `{ aliases, zoneAliasMap, terms }`, where each alias is `{handle, role, truthBoard}` and
  `zoneAliasMap` maps handle → real cell spec. Marking a subset required is a flag plus a comparison,
  not new machinery. `processAnnotations` already returns `zonesEmitted` and the used-spec set.
- **`renderReasonModel.mjs:235` drops `zoneAliasMap`**, keeping only `aliases` + `terms`. This is
  **OI-143**: it is why `checkP5Strong` — the only predicate that asks whether the engine actually has
  evidence for a highlighted cell — receives a hardcoded `null` `allowedSet` and never runs. US3
  restores it. Without it, US2's promotion can launder an ungrounded cell into a highlight.
- **`computeMechanism` discards attempt 1 on retry.** `mechanismExplainer.mjs`:
  `let attempt = await runLlmAttempt(...); if (isLlmError(attempt)) attempt = await runLlmAttempt(...)`
  — the first result is overwritten. Returning **both** attempts is a prerequisite for decision 5.
- **`isLlmError` is currently the only retry trigger** (`callError || parseError`). Annotation
  non-compliance is a new trigger, not a new retry loop.
- **`[zone:col4]` and `[zone:col2]` are not offered handles and reached the user anyway** (row
  `315444233213`), even though `processAnnotations` is documented to drop unoffered tags. Do not
  assume the existing drop path works — characterize it before relying on it.
- **The client already accepts `cNrM` specs.** `src/lib/annotatedText.js:40` — `/^c\d+r\d+$/` is in
  `isValidSpec`. US2/US3 promotion renders as a real highlight with **no frontend change**.
- **A text transform at the render seam MUST skip zone-tag delimiters.** `stripInternalTokens` splits
  on `ZONE_TAG_RE` and rewrites only the prose *between* delimiters, because rewriting inside a spec
  turns `[zone:cells:c4r1,c4r2]` into `[zone:cells:column 4,column 4]`, which `isValidSpec` then
  rejects and the client **silently drops the highlight**. Any new transform must do the same.
- **The engine already knows the answers the user asked for.** For `3154442332131341225551` the
  vector carries `entryCell: "c3r5"`, `forkCells: ["c2r6","c5r5"]`, `tacticTag: "double_threat"` and
  both `forkWindows` — i.e. *"which is the double threat"* was answerable from data already in the
  prompt. This is a rendering gap, not an evidence gap.
- **`deep_reveal_failures` is currently written only on terminal failure** (`index.js`, on
  `result.callError || result.parseError || !result.mechanism`). Decision 5 widens its meaning from
  "failures" to "quality incidents"; `raw_llm_output` is `NOT NULL` and there is one row per failure,
  so recording two attempts needs a migration.
- **Pre-launch data rule applies.** Staging/production are disposable; `explanation_cache` should be
  TRUNCATEd on deploy rather than migrated, since cache hits bypass producer guards.

---

## Acceptance criteria (epic-level)

1. For each of the 4 staging boards above, the re-rendered explanation carries a highlight on **every**
   cell, line and square it names — verified by re-running the position, not by a hand-written fixture.
2. No raw square (`cNrM`, `cN`, `cN–cM` in any dash form) reaches the client in any response.
3. Required ⊆ offered holds for every board in the coverage set (unit test).
4. A response missing a required group produces exactly one retry, and a `deep_reveal_failures` row
   carrying both attempts and the missing handles.
5. `checkP5Strong` runs live with a real `allowedSet` (OI-143 closed).
6. The deep-reveal board renders numbered columns and rows.
7. `npm run test:fast` green (baseline is **0** failures since 2026-08-04).

---

## NOT included (so scope cannot grow silently)

- **The TTS/text divergence and the en-dash range bug.** `GET /api/user/tts/deep-reveal`
  (`server/index.js`) reads the **raw** cached text and runs only `stripAnnotationsForTTS`, never
  `stripInternalTokens` — which is why the coach *speaks* "c5"/"c1r3" while the screen shows "column
  5"/"column 1". And `RANGE_RE = /\bc(\d+)-c(\d+)\b/` (`reasonRenderGuard.mjs:33`) is an ASCII hyphen,
  so the model's en-dash `c2–c5` misses the range rule entirely. **Both ship first, in the small-fixes
  plan** — this epic depends on text and audio already deriving from one sanitized string, so that
  US2/US3 fix both surfaces at once.
- Changing what the feature vector *asserts* — that is `feature-vector-grounding-epic.md`.
- OI-139 (`stripFailingZoneSpans` no-ops on the `!` variant) — latent, no current emitter.
- Coach/lesson audio, non-deep-reveal explanation surfaces.

---

## Authoritative sources of truth

- `docs/architecture/reason-INVARIANTS.md`, `reason-DECISIONS.md`, `reason-case-taxonomy.md`,
  `blunder-reason-evidence.md` — read all four, in order, before touching the engine.
- `docs/architecture/reason-AGENT-PREAMBLE.md` — reuse verbatim to prompt a fresh-context agent.
- `docs/open_issues.md` — OI-143 (the `allowedSet` trace), OI-124, OI-126, OI-139.
- Staging `llm_feedback` and `explanation_cache` — the raw evidence above.
