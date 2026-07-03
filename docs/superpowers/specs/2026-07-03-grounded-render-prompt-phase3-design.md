# Grounded-Render Prompt — Phase 3 (Causal Frames) design

**Date:** 2026-07-03
**Branch:** `stagging` (in place)
**Phase-3 base commit:** `208d371` (= P2's `c56c441` + a memory-compaction commit)
**Authoritative spec:** `docs/architecture/reason-render-grounded-prompt.md` (§3, §3b, §3d, §3e, §6, §8)
**Constitution:** `docs/architecture/reason-INVARIANTS.md` (I0 correctness-first; I12 validate-against-case-space)

This is a **render-layer** change. It does NOT change what `computeReason` stores (engine soundness
first — INVARIANTS I0, "engine soundness first, render later"). Every new artifact (composed
sentences, hidden codes, branch-invariance signal, reading key) is derived from evidence the engine
already emits.

---

## 1. Goal

Implement Phase 3 of the phased rollout (spec §5): **one composer (`template`) + one test per causal
link L1–L9**, each producing the frame `{ id, confidence, text, covers[], guardrail }` from the
narrator vector, and **wire real confidence-gated `covers` removal into the completeness assertion**.

Two headline correctness fixes land here:

- **eval-3** — stop presenting a ~28-ply-deep fork as a near-term threat. The deep resource is framed
  *as deep* (`~pliesToEnd` plies, `deep-forced-line`), never "immediate". (Fires **L5**.)
- **eval-23** — an opponent pattern that is present on the after-**best** board too was NOT caused by
  the played move → route to **L3** ("you didn't cause it"), regardless of what `direction` says. This
  must be **computed at render time** from the after-best board's tags, not read off the terse
  `direction` code. (Fires **L3**.)

**Out of scope (Phase 4):** the grader per-link rubric mechanics (G1–G5) and the sampler `link_<id>` /
branch-invariance / board-selection coverage predicates (§3e/§3f). Phase 3 stops at composer + tests +
covers-gating + the condition-D prompt using the composed frames. Phase-4 coordination is **recorded**
here (§8), not built.

## 2. Settled design decisions (brainstorm 2026-07-03)

1. **Branch-invariance signal (L2 vs L3): reuse the P2 board tagger.** `patternOnAfterBestBoard` is
   computed by tagging the after-best board with the same `tagBoard` that draws the glyphs the model
   sees, and checking for an **opponent-owned** tag at the opponent pattern's completing cell. What we
   check equals what the model sees; no extra solver work.
2. **Covers-gating audit is strict and scoped to `causal-code` fields.** Every entry a fired frame
   lists in `covers[]` must resolve to a **present** `causal-code` field, else the assertion throws
   (over-removal bug). Clean L3's `covers` of the statically-excluded plumbing it currently names.
   Confidence is descriptive: each frame's `covers` list already encodes its thinness (L9's is
   minimal), so covers-gating = honor the fired frame's `covers` verbatim; no separate confidence
   multiplier.
3. **A short reading key (~20–30 lines) for the residual JSON fields.** Condition D already omits the
   607-line glossary; a compact key orients the small target model on the few fields that still render
   as JSON (`register`, `pliesToEnd`, `controllingGroup`, `ownDiscs`, `replyHistogram`, parity
   details) + the horizon phrases. The full glossary stays a reference doc.
4. **Validation gate is deterministic; the live LLM ablation is deferred to the owner.** Phase 3's
   blocking gate = per-link tests + eval-3/eval-23 through the production `compute.mjs` condition-D
   prompt-builder + the corpus completeness gate + `npm run test:fast`. The A-vs-D LLM ablation on the
   frozen 29-record set is the acceptance *measurement*, run manually by the owner (needs API keys +
   budget + the P4 grader).
5. **No grader-skill edits in Phase 3.** Phase 3 *records* every render decision that affects grading
   (§8); a Phase-4 task reviews all of phases 1–3 and updates `grade-fv-sufficiency` accordingly.

## 3. Corpus map (verified 2026-07-02 against the frozen 29-record set)

Every one of the nine links fires on a real record, so each per-link composer test can source a real
board (no hand-built movestrings — memory `feedback_no_random_boards`):

| Link | records | notes |
|---|---|---|
| L1 | eval-22, 25, 26, 27, 28, 29 | missed_own |
| L2 | eval-17, eval-21 | enabled_opponent, `win_to_lose`/`draw_to_lose`, pattern **absent** on after-best → genuinely causal |
| L3 | eval-18, 19, 20, eval-23 | enabled_opponent, all `lose_to_faster_lose`, pattern **present** on after-best |
| L4 | eval-4, 5, 7, 12 | defensive_miss |
| L5 | eval-1, **eval-3**, 11, 24 | denied winning line (eval-3 = deep fork, the headline fix) |
| L6 | eval-6, 15, 16 | two winning lines |
| L7 | eval-8, 9, 10, 14 | conditional swindle |
| L8 | eval-2 | draw abandoned |
| L9 | eval-13 | diffuse parity (low-confidence) |

### 3a. The branch-invariance I12 gap (recorded, not a blocker)

The L3 rule fires if `case == lose_to_faster_lose` **OR** `patternOnAfterBestBoard`. All four L3 records
are `lose_to_faster_lose`, so they route to L3 via that disjunct **even without** the branch-invariance
computation. **No corpus board is a `win_to_lose`/`draw_to_lose` + `enabled_opponent` +
pattern-present-on-after-best** — the one case where the render-time computation *flips a would-be-L2
into L3*. So the corpus alone cannot prove the computation is load-bearing.

I12 is satisfied in two layers instead:
- **Computation** (`patternOnAfterBestBoard`) validated against real corpus boards through the
  production `tagBoard` path: `false` on eval-17/eval-21, `true` on eval-18/19/20/23.
- **Routing** (`classifyCausalLink`) validated across both disjunction branches at the unit layer with
  controlled `ctx`: `{ case:'win_to_lose', direction:'enabled_opponent', patternOnAfterBestBoard:true }`
  → L3; `…:false` → L2. This exercises the classifier's own rule (not a hand-rolled detector proxy).

The missing real flip-board is a **documented PROVISIONAL gap** (same honesty pattern as D20/D23's rare
enabled forks). Phase-4 sampler work gets an explicit target (§8).

## 4. Components (what changes)

Four modules change; the engine and the P2 grounding modules are reused unchanged.

### 4a. `reason_engine/causalLinks.mjs` — add composers

Add `template(fv, ctx)` to each L1–L9 entry. `classifyCausalLink(fv, ctx)` returns the matched entry
plus the composed `text` (calling `template`). Templates are horizon-honest plain sentences that
*reference* cells by name (rendered as board glyphs elsewhere) and **never cover cells**. Proposed
wording (cells shown as `cNrM`; columns as `{bestCol+1}` 1-indexed display):

- **L1** (missed_own): "The better move (col {bestCol+1}) completes your {tag} at {completingCell}; the
  played move let the opponent take {denialCell}, denying it."
- **L2** (enabled, genuinely caused): "Your move let the opponent occupy {completingCell}, completing
  their {tag} on {window}; the better move denied it."
- **L3** (enabled, NOT caused): "You were already losing. The opponent's {tag} at {completingCell}
  exists no matter what you play here — your move does **not** create it, it only loses faster. Do not
  say your move caused or enabled it."
- **L4** (defensive_miss): "The better move (col {bestCol+1}) occupies {completingCell}, blocking the
  opponent's {tag} on {window}; the played move skipped it."
- **L5** (denied winning line): "You had a forced win — it resolves ~{pliesToEnd} plies out via a
  {fork/parity} completing at {completingCell}. The played move let the opponent deny it at
  {denialCell}." ← **eval-3 fix: `~N plies out`, horizon-honest deep.**
- **L6** (two winning lines): "You had a forced win via {completingCell} (~{pliesToEnd} plies); the
  played move gives it up AND lets the opponent force their own win via {oppCompletingCell}."
- **L7** (swindle, both lose): "You were already losing. The better move kept a practical swindle (a
  slip in the marked columns within ~{oppPlies} plies lets you back); the played move loses faster.
  **Neither move wins.**"
- **L8** (draw abandoned): "The position was a draw; the better move holds it by occupying
  {completingCell}. The played move abandons it — the opponent now has a forced win (~{pliesToEnd}
  plies, completing at {completingCell})."
- **L9** (diffuse parity, low-confidence): "You had a parity/zugzwang win (resolves deep, ~{pliesToEnd}
  plies); the played move loses the parity battle — the exact culprit square isn't cleanly isolable.
  See the parity group {controllingGroup}."

Templates read only fields that are present after pruning; any referenced field that can be absent is
guarded (omit the clause rather than print `undefined`). Horizon words derive from `register` via the
existing `horizonForRegister`. **Clean L3's `covers`** to drop `lostResource.exhaustive`,
`gate.witness.node`, `gate.witness.devVal` (already statically excluded — they don't need covering).

### 4b. `fieldDisposition.mjs` — real covers-gating

`assertCoverage(prunedFv, firedCovers)`:
1. **(unchanged)** every present leaf path must have a non-null disposition, else throw
   `UncoveredVectorFieldError`.
2. **(new) over-removal audit:** each entry in `firedCovers` MUST resolve to disposition
   `causal-code` **and** be present in `leafPaths(prunedFv)`; otherwise throw (a frame covering an
   absent/non-causal field is a bug).

`causal-code` fields NOT in `firedCovers` fall back to render (they are kept by `renderedFields`), so
they are always accounted for.

### 4c. `renderReasonModel.mjs`

- `renderedFields(prunedFv, firedCovers)` — in addition to dropping `transformed`/`exclude`, also drop
  `causal-code` paths that ARE in `firedCovers`; keep `render` and uncovered `causal-code`.
- `buildReasonRenderModel(nv)`:
  1. `pruned = pruneVector(nv)`.
  2. `ctx = { patternOnAfterBestBoard }` (§4d), computed only when `pruned.direction ===
     'enabled_opponent'`.
  3. `link = classifyCausalLink(pruned, ctx)` — now carries `text`.
  4. `assertCoverage(pruned, link.covers)` — now enforces the covers audit.
  5. `rendered = renderedFields(pruned, link.covers)`.
  6. Expose `frames: [{ id, confidence, text, covers, guardrail }]` (and keep `link` for back-compat).
- `assembleGroundedPrompt(model)` — render the composed `text` + guardrail (replacing the trivial
  passthrough) and prepend the short reading key (§4e). Keeps the boards + threat lists + `# Vector
  facts` JSON.

### 4d. Branch-invariance helper (L2 vs L3)

```js
// present iff the after-best board carries an opponent tag at the opponent pattern's completing cell.
function patternOnAfterBestBoard(fv) {
  const cc = fv.opponentPunishment?.completingCell;
  if (!cc) return false;
  const ms = (fv.movestring ?? '') + String(fv.bestCol);
  return tagBoard(ms, fv.player).some(
    (t) => t.owner === 'opp' && (t.cell === cc || (t.window || []).includes(cc)));
}
```

Fed into the existing `branchInvariant(fv, ctx)` (already reads `ctx.patternOnAfterBestBoard`). The
proxy fallback `fv.case === 'lose_to_faster_lose'` stays as an independent disjunct.

### 4e. Reading key + condition D

A ~20–30 line reading key (a module-level string constant) covers only the fields that still render as
JSON + the horizon phrases. `assembleGroundedPrompt` emits it once. `compute.mjs` keeps the `TASK`
output-contract append after the assembled prompt, so condition D stays gradeable
(`computeConditionD.test.mjs` stays green).

## 5. Task breakdown (for writing-plans)

Ordered; each commits on `stagging` with an explicit `git add <files>` (never `-A`) and the
`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer.

1. **Covers-gating** — `fieldDisposition.assertCoverage` over-removal audit + `renderedFields`
   covers-drop + clean L3's `covers` + unit tests (throws on absent-covered field; drops covered
   codes; keeps uncovered). Foundation — first.
2. **Branch-invariance** — `patternOnAfterBestBoard` helper + wire `ctx` into
   `buildReasonRenderModel`; tests: computation `false` on eval-17/21, `true` on eval-18/19/20/23
   (production `tagBoard` path); routing L3/L2 on synthetic `win_to_lose` ctx (both branches).
3–11. **Nine composers** — one `template` + one test per link L1–L9, each sourcing its corpus record
   (§3). Tests assert the composed `text` names the right cells and (L5/L9) uses deep/horizon wording,
   NOT "immediate".
12. **Prompt assembly** — `assembleGroundedPrompt` renders composed `text` + guardrail + reading key;
   `compute.mjs` condition D stays gradeable; `computeConditionD.test.mjs` green.
13. **Validation** — eval-3 fed through the real condition-D prompt-builder asserts deep-horizon
   framing / no "immediate" wording; eval-23 asserts L3 fired + the no-causation guardrail present;
   corpus completeness gate 29/29 zero-uncovered; `npm run test:fast` green.
14. **Coordination docs** — write §8 into the render spec (`reason-render-grounded-prompt.md` §3e/§3f)
   so the Phase-4 grader + sampler tasks are recorded; no skill/sampler code changes.
15. **Whole-branch review** — spec + quality review over the full P3 diff (most-capable model).

Model tiers (per subagent-driven-development): tasks whose plan carries complete code → cheap tier;
judgment/integration (2, 12, 13) → standard; final review (15) → most-capable.

## 6. Completeness invariant (unchanged, load-bearing)

Every present narrator-vector field must render, be covered by a live frame, or be excluded-with-reason,
else `assertCoverage` throws. `renderCoverageCorpus.test.mjs` must stay green with **zero** uncovered
fields across all 29 records. The field-disposition registry is **closed by design** — do NOT weaken it
to pass the gate; a new field forces a conscious render/exclude decision. No solver scores anywhere in
the render/prompt (already deep-scrubbed upstream by `toNarratorVector`; D21).

## 7. Validation summary

- **Deterministic (blocking):** per-link composer tests · branch-invariance computation + routing
  tests · eval-3/eval-23 through the production condition-D path (I12) · corpus completeness 29/29 ·
  `npm run test:fast` (baseline before P3: 763 passing).
- **Manual acceptance (deferred to owner):** `compute.mjs --llm --condition A,D` on the frozen set;
  success = eval-3 no longer presents the deep fork as near-term, eval-23 stops asserting causation, no
  regression on the other 27.

## 8. Downstream coordination — Phase 4 (recorded, NOT built in P3)

Recorded so a render decision made here is catchable downstream. Phase 4 owns a task to **review all
code from specs Phase 1–3 and update the `grade-fv-sufficiency` skill** to grade condition D against
these decisions. The grader must then account for:

1. **PV-mismatch correctness bug (already manifested).** The skill currently says "trace the solver's
   PV before calling `vector_error`". There are multiple optimal lines; cells must be verified against
   **the engine's own `finalMovestring`**, not an alternate solver PV — the bug that mis-convicted
   eval-1/16/3 in the P1 grading run (memory `project_fv_suff_grader_pv_mismatch.md`). This is
   independently correct even for condition A.
2. **Condition D is a different artifact.** The model saw grounded boards + composed sentences +
   guardrails + a reading key + minimal residual JSON — NOT glossary+JSON. Grade concrete claims
   against the rendered boards/sentences; read `causalLinks.mjs` as the source of truth for each
   record's fired link + `guardrail` + `covers` + `text` (spec §3d/§3f-G1).
3. **Covers-gating changes "missing field".** A code intentionally hidden because the sentence restated
   it must NOT be scored `missing_info`. If an answer was degraded for lack of a *covered* field,
   that's an **over-removal** signal (the removal was wrong) — a distinct attribution.
4. **Two mechanical checks the P3 fixes create.** (L3) an answer claiming "your move caused/enabled the
   pattern" on an L3 record is a **guardrail violation** (the eval-23 check); (deep resources) echoing
   "deep / ~N plies" is **correct reading**, while calling a deep cell a "current threat" is
   `prompt_confusion` (eval-3). When L2/L3 is mis-routed, that is a render bug (branch-invariance
   miscomputed), not a model failure — attributable.

**Sampler (Phase 4, spec §3d/§3e).** The current `REASON_UNIVERSE` induces L1–L9 coverage incidentally
(the corpus spans all nine) but does not isolate them. Phase 4 adds: a `link_<id>` predicate per link;
a **branch-invariance split** predicate (`enabled_causal` vs `enabled_branch_invariant`); and a
**targeted harvest** for the flip-case (`win_to_lose`/`draw_to_lose` + `enabled_opponent` +
pattern-present-on-after-best, §3a) and the other rare links (L3-figure_7, L9, `lost_fork_B`), since
self-play won't reach them. Keep the `discovered ⊆ REASON_UNIVERSE` guard.
