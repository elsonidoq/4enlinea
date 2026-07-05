# Grounded-Render Prompt — Phase 4 design (grader + sampler integration)

**Status:** design, pending user review. Base commit `048a275` on `stagging`.
**Authoritative spec:** `docs/architecture/reason-render-grounded-prompt.md` §3d/§3e/§3f/§6 — this doc
does not restate it; it records the P4 design decisions and the task-shaped plan that operationalize it.
**Reads before implementing (project CLAUDE.md, in order):** `reason-INVARIANTS.md`,
`reason-DECISIONS.md` (esp. D20, D28), `reason-case-taxonomy.md`, `blunder-reason-evidence.md`,
`reason-AGENT-PREAMBLE.md`.

## Goal

Close the render loop: every render decision the pipeline makes is (1) declared once, (2) exercised by
a harvested board (sampler + coverage test), and (3) graded against its output (grader). Three
workstreams — A (`render_decision` emission), B (grader skill for condition D), C (sampler + coverage
test). **No engine / P1–P3 behavior change** (I0 soundness first); P4 = the eval pipeline's
`render_decision`, the grader skill, and the sampler + tests.

## Locked decisions (brainstorm 2026-07-03)

1. **Coverage-test input = a freshly regenerated, committed coverage set** — not the frozen 29.
   Enhance `select_boards.mjs`'s predicate universe with the render-layer axes, regenerate, commit the
   output, and run the P4 coverage test on that committed file. The **frozen 29
   (`reason_evidence_boards_coverage_2026-07-02T11-37-56Z.jsonl`) is kept**, unchanged, for its two
   existing jobs: the completeness **regression** gate (`renderCoverageCorpus.test.mjs`, 0-uncovered —
   must stay green) and the **A-vs-D ablation acceptance anchor** (eval-3 / eval-23 live there). The
   frozen 29 is simply *not* forced to also serve the new coverage-test role — that is the hard/wrong
   path the user vetoed.
2. **A-vs-D ablation = set up + hand off.** P4 ships the render_decision emission, the updated grader,
   and the runnable command. The owner runs `compute.mjs --condition A,D` on the frozen 29 with their
   key + budget and invokes `grade-fv-sufficiency`. Deterministic P4 acceptance = `test:fast` + the new
   coverage test + the regression gate green. (Mirrors P3's validation hand-off.)
3. **Unreachable flip-case → document PROVISIONAL *and* root-cause it.** The targeted harvest tries to
   fill every rare link. Any it cannot reach stays PROVISIONAL / non-blocking, documented as an honest
   I12 limit (extends D28). **Additionally**, a dedicated debugging task investigates *why* the flip-case
   (`win_to_lose`/`draw_to_lose` + `enabled_opponent` + pattern-present-on-after-best) is unreachable —
   using the `scientific-method-debugging` skill. If the cause is an engine/router structural defect, the
   task **surfaces it as a finding** (soundness is frozen in P4 — do not silently patch). Never hand-build
   boards (I12 / `feedback_no_random_boards`).
4. **Targeted rare-fill folds into `--strategy coverage`** — one regeneration run produces the whole
   committed set (the new render-layer predicates + a directed rare-fill post-pass for still-unfilled
   PROVISIONAL links). No separate strategy.

## A. `render_decision` emission (workstream A)

**Where computed.** A new exported `buildRenderDecision(nv)` in
`server/scripts/renderReasonModel.mjs`, derived **purely** from existing helpers — `pruneVector`,
`classifyCausalLink` (+ `patternOnAfterBestBoard` ctx), `selectBoards`, `groundCell` /
`horizonForRegister` / `reachableInPlies` / `statusOf`, and `dispositionOf` for the field partition.
**No `computeReason` call, no new engine work** (§5 / global constraint). It reuses exactly the
computation `buildReasonRenderModel` already runs, plus a small amount the render model discards today
(the *omitted* boards and the covered/excluded partition).

**Where persisted.** `compute.mjs` computes it **once per record, condition D only**, and writes it as a
top-level `render_decision` key on each condition-D answers line, next to `feature_vector`. Non-D lines
have no `render_decision` (absent). It is computed inside the existing condition-D prompt-build path
(reusing the same `buildReasonRenderModel` inputs), so a build failure is already isolated by the
existing per-row try/catch.

**Shape (all fields derivable from `buildRenderDecision(nv)`; spec §3f):**

```json
"render_decision": {
  "case": "win_to_lose",
  "route": "realized_denied",              // or "sign"
  "direction": "enabled_opponent",         // realized_denied only; null otherwise
  "patternOnAfterBestBoard": false,        // the L2-vs-L3 branch-invariance value (D28); null if N/A
  "link": {
    "id": "L2", "confidence": "high",
    "covers": ["route","tag","direction", ...],
    "guardrail": "…",
    "text": "Your move let the opponent occupy c6r5, …"   // verbatim, as the model saw it
  },
  "boards": [
    { "id":"decision",    "shown":true,  "reason":"the position under judgment" },
    { "id":"afterBest",   "shown":false, "reason":"tag-set identical to decision — omitted" },
    { "id":"afterPlayed", "shown":true,  "reason":"the move you played — changes the tactical picture" },
    { "id":"projectedDeep","shown":false,"reason":"resource not deep — absent" }
  ],
  "resource": {
    "completingCell": { "cell":"c6r5","status":"empty","horizon":"deep-forced-line","reachableInPlies":18,"role":"…" },
    "registerToHorizon": { "register":"forced_sequence","horizon":"deep-forced-line" }
  },
  "fieldPartition": {
    "rendered": ["case","bestCol","playedCol","completingCell","window", ...],
    "covered":  ["route","tag","direction", ...],   // present codes hidden by the fired frame
    "excluded": ["gate.ran","discs", ...]           // statically excluded present paths
  },
  "finalMovestring": "463512252326105..."           // the engine's own winning line (G4)
}
```

**`selectBoards` extension.** `selectBoards(fv)` today returns only shown boards. To report
`shown/omitted` for after-best / after-played / projected-deep without changing what the *prompt* draws,
`buildRenderDecision` recomputes the same tag-key comparison `selectBoards` uses and emits a
board-decision list (shown flag + reason) for all four board slots. Option: refactor `selectBoards` to
also export the decision list, or compute it in `buildRenderDecision` from the same helpers — the plan
picks the least-invasive (no change to the boards the prompt renders).

**`finalMovestring` source.** Off whichever half carries the winning/losing line
(`lostResource.finalMovestring` / `opponentPunishment.finalMovestring`) — the same field `selectBoards`
already reads for the projected-deep board and `reachableInPlies` uses.

## B. Grader skill for condition D (workstream B)

The grader (`.claude/skills/grade-fv-sufficiency/SKILL.md`) is a markdown skill driving per-`(id,condition)`
sub-agents. P4 adds condition-D grading (G1–G6) **without JS imports** — the mechanics:

- **Consume `render_decision` from the record, never re-derive.** The orchestrator extracts the answers
  line's `render_decision` and pastes its fields **inline** into the sub-agent prompt as a
  `## Render decision — GROUND TRUTH (do NOT re-derive)` block: `linkId`, `confidence`, `covers[]`,
  `guardrail`, verbatim frame `text`, the board shown/omitted list + reasons, `patternOnAfterBestBoard`,
  the field partition, and `finalMovestring`. Sub-agents never re-run `classifyCausalLink`, recompute
  branch-invariance, or re-select boards (the exact drift the single catalog exists to prevent — and the
  PV-mismatch failure mode).
- **G4 fix (correctness).** Replace every "trace the solver PV" instruction with "trace the engine's OWN
  `finalMovestring`" (the record now carries it). This is the eval-1/16/3 mis-grade fix
  (`project_fv_suff_grader_pv_mismatch`).
- **G1 format-aware.** Grade against the *grounded* artifact the model saw — the rendered boards, the
  plain-language threat list, the composed frame text, the reading key — NOT glossary+JSON.
- **G2 per-link rubric.** For the fired `linkId`: (a) `guardrail` honored (L3 → no "your move
  caused/enabled it"); (b) over-removal audit — a `covers`-hidden code the answer actually *needed* = a
  wrong removal; but per D28 a **covered-but-ABSENT field is normal, not `missing_info`**; (c)
  low-confidence L9 must hedge, not fabricate.
- **G3 board-selection audit.** Given the boards shown/omitted + reasons — over-omission audit: did the
  answer need a board `selectBoards` dropped?
- **G5 threat-list fidelity.** Each rendered threat-list entry must be board-true on its stated board; a
  wrong entry is a render bug to catch, not narrate around.
- **G6 branch-invariance provenance.** Given `patternOnAfterBestBoard` + `linkId`: (a) the answer honored
  the fired link's guardrail; (b) the routing itself was correct for the after-best board — a miscomputed
  `patternOnAfterBestBoard` (wrong L2/L3) is a **render bug, attributable to the pipeline**, never a model
  failure.
- **Read the decision docs.** The skill body instructs consulting `reason-case-taxonomy.md`, D20, D28,
  and `causalLinks.mjs` (as a human-readable reference) once, for rubric understanding — grading a case
  against a re-imagined meaning is the same error class as an alternate PV (G4).
- **Ground truth from RAW evidence.** The grader reads `bestCol`/`playedCol`/outcomes from the RAW
  evidence (`row.evidence` / sibling `groundTruth`), never the deep-scrubbed narrator `feature_vector`
  (D21).

The A1–A4 axes and the condition-A path stay intact; G1–G6 are additive for condition D.

## C. Sampler + coverage test (workstream C)

**Enhance `select_boards.mjs --strategy coverage`.** Extend `REASON_UNIVERSE` (keeping the
`discovered ⊆ REASON_UNIVERSE` guard, D22) with the joint feature-vector × prompt-decision axes (§3e):
- `link_L1` … `link_L9` (one per catalog entry, via `classifyCausalLink`);
- branch-invariance split — `enabled_causal` (L2) vs `enabled_branch_invariant` (L3), keyed on
  `patternOnAfterBestBoard` not `direction` (D28);
- board selection — `board_afterbest_{shown,omitted}`, `board_afterplayed_{shown,omitted}`,
  `board_projecteddeep_{shown,absent}`;
- covers-exercised — per link, at least one record where its `covers` actually hides a present
  causal-code;
- horizon / register — `immediate` / `deep-forced-line` (forced_sequence) / `deep-parity` (parity);
- case × route × direction — every reachable combination.

Computing these requires the coverage harvest to run the **render pipeline** per board
(`toNarratorVector` → `buildRenderDecision`), which the current coverage strategy deliberately skips.
Add that pass; the new predicates come from `render_decision`. **Directed rare-fill post-pass** (folded
into `coverage`, decision 4): after the diversity sweep, for still-unfilled PROVISIONAL links
(L3-figure_7, L9, `lost_fork_B`, the flip-case), run a targeted `playGame` all-suboptimal-column sweep
with a per-predicate property filter (reusing the D23 probing idiom). Whatever it finds joins the
committed set; unreachable ones stay PROVISIONAL.

**Regenerate + commit.** Run the enhanced strategy once to produce a fresh
`boards_coverage_<ts>.jsonl`; commit it as the coverage-test input.

**Coverage test** — new `server/tests/renderCoverageUniverse.test.mjs` (node:test), **added by hand to
`package.json` `test:fast` and `test`** (the list is hardcoded, not a glob — P3 Task-13 lesson). It
loads the committed fresh coverage set, pushes each board through the render pipeline
(`toNarratorVector` → `buildRenderDecision`), collects the predicates each record hits, and asserts
**every REQUIRED joint-universe predicate is covered ≥1** (fail listing uncovered REQUIRED;
PROVISIONAL/rare reported non-blocking).

**Flip-case root-cause task (decision 3).** A separate debugging task, using
`scientific-method-debugging`, investigates why the flip-case is unreachable (hypothesis: a
router-locus / structural constraint like the D23 enabled-fork finding). Deliverable = a written finding
(root cause + evidence); if it is an engine defect, surface it, do not patch (soundness frozen). Its
result informs whether the flip-case predicate is genuinely PROVISIONAL or a fixable gap for a future
engine phase.

## Execution model

`superpowers:writing-plans` → task-by-task plan → `superpowers:subagent-driven-development` (fresh
implementer per task; spec + quality review after each; whole-branch review at the end). Model tiers:
- **cheap** — tasks whose plan carries complete code (grader-skill text edits with exact wording;
  coverage-test scaffolding; `REASON_UNIVERSE` list additions).
- **standard** — judgment/integration: the `render_decision` emission (schema + `selectBoards`
  shown/omitted + compute wiring) and the sampler harvest (render-pipeline pass + directed rare-fill).
- **debugging** — the flip-case root-cause task (`scientific-method-debugging`).
- **most-capable** — the final whole-branch review.

## Global constraints (carried verbatim into the plan)

- No change to what `computeReason` stores or any P1–P3 engine/render behavior (I0). If a P4 finding
  reveals a P3 defect, SURFACE it, do not silently patch.
- Coordinates 0-indexed internally; `cNrM` 1-indexed; `bestCol`/`playedCol` 0-indexed (display = col+1).
- Narrator vector carries NO solver scores (D21). The grader reads ground truth from RAW evidence, never
  the narrator `feature_vector`.
- The grader verifies every cell/line against the engine's OWN `finalMovestring`, never an alternate PV
  (G4).
- Covers audit is a STATIC causal-code check (D28): covered-but-ABSENT = normal, not `missing_info`;
  needed-but-covered = over-removal.
- `renderCoverageCorpus.test.mjs` (frozen 29, 0-uncovered) stays green; closed registry not weakened.
- Never hand-build movestrings; harvest via `playGame` property filter.
- `npm run test:fast` inside `connect-four/` (baseline 785). NEW test files added by hand to `test:fast`
  and `test` in `package.json`. Do NOT run full `npm test`.
- Commit after each task on `stagging` with explicit `git add <files>` (never `-A`; the
  `.claude/worktrees/win-dist-grid` feature must be untouched; leave pre-existing unrelated modified
  files unstaged). Trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Do NOT push / open
  a PR. `.superpowers/sdd/progress.md` is git-ignored scratch — do not `git add` it.

## DONE

- `compute.mjs` emits a per-record `render_decision` on condition-D lines, derived purely from
  `buildRenderDecision(nv)` (no engine change).
- `grade-fv-sufficiency` grades condition D via G1–G6, consuming `render_decision` + the catalog +
  RAW-evidence ground truth, with the solver-PV → `finalMovestring` fix; reads the decision docs; treats
  covered-but-absent as normal (D28).
- `select_boards.mjs --strategy coverage` covers the joint universe (link_<id>, branch-invariance split,
  board_*, covers-exercised, horizon, case×route×direction) with a folded directed rare-fill; a fresh
  committed coverage set is produced.
- A coverage TEST asserts every REQUIRED predicate is hit (green, or a documented PROVISIONAL gap list),
  wired into `test:fast`.
- The flip-case unreachability is root-caused (written finding) and documented PROVISIONAL if genuinely
  unreachable.
- The A-vs-D ablation is set up + handed off with a runnable command.
- `npm run test:fast` green; regression + coverage gates green. Not pushed / no PR.
