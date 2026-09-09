---
name: project_reason_render_layer
description: Grounded-render prompt (compute.mjs condition D) + the closed field-disposition tripwire
metadata: 
  node_type: memory
  type: project
  originSessionId: 5beb0093-24c2-4a4a-b8b8-28461511fe5b
---

The from-vector LLM answerer (`compute.mjs --llm`) has a NEW render layer producing a grounded,
board-anchored prompt as ablation **condition D** (alongside A/B/C). Read
`docs/architecture/reason-render-grounded-prompt.md` before touching the from-vector prompt. Modules
(all in `connect-four/server/scripts/`): `reason_engine/causalLinks.mjs` (declarative L1–L9
causal-link catalog + `classifyCausalLink`), `fieldDisposition.mjs` (closed field-disposition registry
+ `assertCoverage`), `renderReasonModel.mjs` (`buildReasonRenderModel`/`assembleGroundedPrompt`/
`buildRenderDecision`), `reasonCellGrounding.mjs` (`groundCell` status/horizon/reachableInPlies),
`reasonBoardTags.mjs` (`tagBoard` — reuses classifier.js majors; kind=immediate|major|double +
vector-named fork overlay), `reasonBoardSelect.mjs` (`selectBoards`/`renderBoardAscii`/
`renderThreatList` + `patternOnAfterBestBoard`), `renderUniverse.mjs` (shared render-decision joint
predicate universe, consumed by both `select_boards.mjs --strategy coverage` and the coverage test).
**P1 + P2 (grounding) + P3 (causal frames) + P4 (grader + sampler integration) DONE** (see D28, D29).
P3 landed: a `template(fv,ctx)` per L1–L9 (`classifyCausalLink` returns composed `text`),
confidence-gated `covers` removal now LIVE (`assertCoverage`'s 2nd param), and
horizon-from-`register` framing (`pliesToEnd` is absent corpus-wide, so deep-vs-near comes from
`register`; eval-3 fix).

**SUPERSEDED — do not restore (D30):** this memory used to say the L2-vs-L3 split was a *render-time
branch-invariance* computed from `patternOnAfterBestBoard`. **D30 retired that** and removed the
`branchInvariant` helper: the split now keys on the SIGN `case` in `causalLinks.mjs` — **L3** iff
`route==='realized_denied' && direction==='enabled_opponent' && case==='lose_to_faster_lose'`, **L2**
otherwise. The principle: L3 asserts an OUTCOME ("both moves lose"), while `patternOnAfterBestBoard`
is only GEOMETRY and is NOT equivalent to "the best line loses" — D28 conflated the two, flipping real
win/draw boards (eval-53 `win_to_lose`, eval-51 `draw_to_lose`) into false loss narration.
`patternOnAfterBestBoard` survives as **informational** in `render_decision` and may soften L2's
wording, but must never drive the outcome sentence.

**P4 gotchas (D29):**
- `render_decision` is **condition-D-only** — `compute.mjs` persists it (`renderDecisionForCondition`)
  on condition-D answers lines only, derived purely from `buildRenderDecision(nv)` in the render
  layer. It is NOT an engine/solver call; condition A/B/C rows never carry it.
- The `grade-fv-sufficiency` grader consumes `render_decision` as **GROUND TRUTH** and must NOT
  re-derive routing — never re-run `classifyCausalLink`, recompute board tags, or
  re-select boards inside the grader; that re-derivation is exactly the drift that produced the
  eval-1/16/3 mis-grades (G4: verify cells against the record's own `finalMovestring`, never an
  alternate solver PV).
- The render coverage test (`renderCoverageUniverse.test.mjs`) runs **solver-free** on a
  **freshly-regenerated committed 32-board set**
  (`boards_coverage_p4_2026-07-03T15-54-38Z.jsonl` + its precomputed evidence), asserting all 35
  `RENDER_REQUIRED` predicates covered. The **frozen 29** (`boards_coverage_2026-07-02T11-37-56Z.jsonl`)
  is retained separately as the **ablation input + P1–P3 regression anchor** — do not conflate the
  two sets or assume the 32-board set supersedes the 29.
- `flip_case_l3` (the D28 I12 gap) is **reachable-but-rare, CONFIRMED, gap CLOSED** — two real
  harvested boards in the 32-board set exercise it; see
  `docs/architecture/reason-flip-case-investigation.md`. It stays PROVISIONAL-with-example (rare, not
  blocking) in the coverage universe.
- The A-vs-D LLM ablation itself is NOT run as part of docs/engine work — it needs
  `OPENAI_API_KEY`/budget and is non-deterministic; see
  `docs/architecture/reason-P4-ablation-runbook.md` for the hand-off command + acceptance signals.

**Two P2 traps (non-obvious):**
- **`selectBoards` selection-safety:** the vector-named fork pattern (figure_7/double_threat) is
  overlaid only on the DECISION board's DISPLAYED tags; the after-best/after-played inclusion baseline
  (`decisionKey`, §3e Option A) is computed from the STRUCTURAL tag-set (`tagBoard` with NO opts). Fold
  any display-only tag into that baseline and every after-board spuriously "differs" → always shown.
  Owner of the overlay derives from the half: pattern on `lostResource`→'you', `opponentPunishment`→'opp'.
- **Boards are NOT in the completeness walk:** `assertCoverage`/`renderedFields` operate on the narrator
  vector, not on `model.boards`. Adding/changing board tags cannot trip the corpus gate — but also gets
  no coverage protection. Only narrator-vector leaves are gated by the closed registry.

**P3 covers-gating trap (the audit is STATIC, covers are SUPERSETS — D28):** a fired frame's `covers[]`
may ONLY name `causal-code` fields; `assertCoverage` throws if a covers entry is NOT causal-code (a
`render`/`exclude`/typo entry). But `covers` lists are family-wide SUPERSETS (`CODES_REALIZED`/`CODES_SIGN`),
so every link legitimately names codes ABSENT from a given record — that is NORMAL, not a bug. Do NOT
"fix" absent covers entries and do NOT reintroduce a per-record "covers entry must be present → throw"
check: it is infeasible (would fire on all 29 corpus records) and was explicitly rejected. `renderedFields`
drops causal-code paths that ARE in `covers`; uncovered causal-code still renders (never vanishes). L3's
covers were cleaned of statically-excluded plumbing, L7's of `tie.playedPlies`/`tie.swindlePlies` (render
counts). For P4: the grader must treat a covered-but-ABSENT field as intended, never `missing_info`; it
must consume the per-case `render_decision` record (spec §3f) and NOT re-derive the L1–L9 routing.

**Tripwire (cross-system trap):** `fieldDisposition.mjs` is a CLOSED registry — every narrator-vector
leaf path must map to a disposition (render / causal-code / transformed / exclude). Add or rename a
field on the reason engine's narrator vector and `assertCoverage` throws `UncoveredVectorFieldError`,
breaking `renderCoverageCorpus.test.mjs` (in `test:fast`) until you register it. This is BY DESIGN (no
field silently dropped from the prompt): register the new field's disposition — never weaken the
assertion or add a catch-all.

**Design principle the user requires (spec §3e):** any render decision that selects or prunes what the
LLM sees (causal-frame `covers`, board selection, …) must be a single declared rule consumed by THREE
consumers — the composer/render, the grader (`grade-fv-sufficiency`), AND the sampler
(`select_boards.mjs`). Never a silent local choice; wire all three. See
`docs/architecture/feature-vector-sufficiency-experiment.md` §14, `docs/architecture/reason-INVARIANTS.md` I0b.

**Opening boards ARE now wired (D33, 2026-07-05 — supersedes the old "render layer NOT wired for
openingContext" gap).** Opening-phase decisions render via an ADDITIVE `reason_engine/openingFrame.mjs`
`composeOpeningFrame(prunedFv)` (frames `O1` named/`O2` defense/`O3` centrality), NOT a new causal link:
`classifyCausalLink` (L1–L9) still fires to feed `render_decision` scaffolding + horizon, but its text is
**not rendered** — the opening frame is the sole `frames[0]`, and only the decision board is shown. Three
non-obvious traps here:
- **Deep-cell residue leak (the trap that will bite you):** the opening branch of `buildReasonRenderModel`
  wraps its residue in `pruneOpeningResidue`, reducing `lostResource`/`opponentPunishment` to
  `{register, pliesToEnd}`. WITHOUT it, `renderedFields` dumps a 35-ply `completingCell` (`c6r2`) + window
  into the "Vector facts" block, and the grader's `deepResourceGrounded:false` then FALSE-FAILS any answer
  that grounds it. Do NOT "simplify" the opening branch back to plain `renderedFields`. The non-opening
  path stays plain `renderedFields` — only the opening branch prunes.
- **Two distinct "centralities":** `O3`'s lead is the engine geometry claim
  (`openingContext.centrality.text` + `betterHasMoreLines:true`) — ALWAYS asserted, NOT gated. The
  landing-cell clause ("easier to build a four through `{cell}`") IS gated on `centralityQualitative`
  (heatmap ratio; may be `null`). The grader's qualitative check applies ONLY to the landing-cell clause —
  exempt the geometry lead or you false-fail ~1/6 O3 boards.
- **Heatmap is hardcoded config**, not a branch dep: `reason_engine/data/winning-cell-heatmap.json`
  (copied from the design spec, NOT merged from `worktree-win-dist-grid`); used internally only to pick
  qualitative words, never a number in prose. `fieldDisposition` opening full-path checks run BEFORE the
  leaf fallbacks (else `bestCol`/`playedCol`/`text` leaf collisions win). See D33,
  [[project_reason_opening_traps]].

## Adding a render surface adds VOCABULARY the model echoes (measured, 2026-08-25)

Splitting the single `projectedDeep` board into one per deep half (D50) fixed real board-falsehoods —
and cost the coach-voice axis 12 points, because the model started naming the boards. Two causes, both
of them "new text the model can see":

1. The new board's caption said *"for your opponent's punishment"* — and "opponent punishment" is on
   the coach-voice axis's OWN banned-terminology list. The render supplied the banned phrase; the model
   dutifully echoed it.
2. Having two boards to distinguish, runs started writing "the deep board" / "the deep reply board" /
   "the projected board" — paraphrases of internal ids.

Measured on the answers directly: runs leaking a render/board label went **0/125 → 10/125**, on exactly
the seven records that gained a second board. Not a model regression — a render regression.

**Rule: when you add anything to the assembled prompt, extend `READING_KEY`'s never-repeat list in the
SAME change, and check the new string against the coach-voice banned list before shipping it.** A new
board, alias role, caption or frame is player-visible vocabulary until you forbid it.

See [[project_deep_reveal_eval_harness_gap]] — the same run's "model ignores the required set" failures
were an eval artifact, so read a graded regression carefully before attributing it.

## `alias.spec` / `requiredSet[].spec` is a MATCH KEY, not prompt text — never "clean" it (2026-08-27)

Counting raw `cNrM` occurrences across the render model invites a wrong conclusion. Measured by
replaying all 25 subset `render_decision` records, there are **two** printed producers, not three:
`link.text` **20/25** and `zones.aliases[].role` **13/25** (the required block re-prints 10 of those 13,
because `deriveRequiredSet` copies `role: alias.role` — `renderReasonModel.mjs:153`).

`requiredSet[].spec` is **25/25**, and that number is a trap twice over:
- **`.spec` is never printed into the prompt.** The required block is `renderReasonModel.mjs:604-605` —
  `` `- [zone:${g.handle}] = ${g.role}${g.truthBoard ? …}` `` — handle, role, board. The
  Highlightable-regions block (`:625-660`) has the same shape. No spec.
- **`.spec` MUST stay coordinate-bearing.** It is the key of `aliasBySpec` (`:137`, matched at `:146`),
  the spec-string-equality contract D2/D43 rests on. Strip coordinates from it and required-set
  derivation breaks outright.

So an acceptance criterion asserting "no `cNrM` in any producer" is satisfiable only by breaking the
code. Scope such a rule to the **printed** surfaces and exempt `.spec` explicitly. And remember the
tension the widening creates: D49's `disambiguateSiblingRoles` put those coordinates into role text
**on purpose**, to break `(role, truthBoard)` collisions (48/63 records before, 0 after, §12d) — any
replacement locator has to preserve that property or it trades one defect for another.
