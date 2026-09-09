---
name: project_fv_suff_answers_layer_trap
description: Measuring anything in an fv_suff answers file requires naming WHICH string layer — raw / tags-stripped prose / post-guard served — or the number is meaningless; this produced two wrong findings in one session
metadata: 
  node_type: memory
  type: project
  originSessionId: 206ad236-6ab0-4d8e-abe1-95eb876caf01
  modified: 2026-08-28T18:35:25.078Z
---

**Trigger: about to count, grep, or regex anything inside `fv_suff_answers_*.jsonl`.** Stop and name
the layer first. `answer.mechanism` exists at three different layers and they give different answers to
the same question. Two confident findings were published and retracted in one session (2026-08-26) for
exactly this reason.

| layer | how to get it | what it is |
|---|---|---|
| **raw** | `answer.mechanism` as stored | post-`processAnnotations`, **pre-guard**; includes `[zone:…]`/`[term:…]` markup. **NOT what ships.** |
| **prose** | raw, with `/\[\/?(zone\|term):[^\]]*\]/g` removed | what the A5 rubric actually grades (`GRADER_INSTRUCTIONS_v1.md:116` orders markup stripped) |
| **served** | run it through `guardExplainMoveLlmPayload` (`server/reasonRenderGuard.mjs`) with a real `board` + `allowedSet` | what the player receives |

**The two wrong findings, both from measuring at the wrong layer:**

1. *"~70% of A6 failures name the better square as raw `cNrM`, so A6 is capped by OI-194."* **False.**
   `mentionsBetterColumn` runs `stripInternalTokens` **first**, which already rewrites `cNrM`/`cN`/`colN`
   → "column N" — so an answer naming the better column as `c4r3` **already passes A6**. Probe:
   `stripInternalTokens('you should have played c2r1 next')` → `'you should have played column 2 next'`.
   Real decomposition of the 27 A6 failures: 12 name some *other* column, 15 name none, **0** raw cells.
2. *"raw-`cNrM` incidence is flat (123 → 121 → 120), so graders charged it inconsistently."* **False.**
   That regex counted `[zone:c6r2]` **tags** as prose. At the prose layer it is **109 → 89 → 62** — the
   defect roughly halved. Graders were largely *consistent* within a run (49/50 fails vs 13/75 passes
   carry a prose `cNrM`); what moved was the cross-run **charge rate: 14% → 28% → 79%**.

**Two facts that follow and are easy to get backwards:**

- **Raw `cNrM` never reaches players: 0/125 at the served layer.** Production defends three deep —
  `humanizeGroundedCoordinates` → `promoteRawCoordinates` → `stripInternalTokens`. So OI-194 is prompt
  hygiene, **not** a player-facing leak. Its real measured cost is different: the guard reaches zero
  partly by *destroying* highlights — 5 of 125 runs lose one `[zone:…]` span each to
  `P6:raw_coordinate` (5 of 340 spans). Note the net span count *rises* (340→341) because
  `promoteRawCoordinates` mints spans, so a regression test on total span count goes green while the
  losses persist.
- **`grade_mechanical.mjs`'s A6 is already effectively post-guard** (it imports production's
  `mentionsBetterColumn`); the agent-graded judgment axes (A5, A7b, G1, G7) are the ones grading a
  string no player receives. That gap is the subject of Epic 12 / US1.

**Use the regex in the table verbatim — a near-miss variant fails silently and loudly.** The tags come
in a spec-bearing closing form, `[/zone:future:windows:c2r5,c3r5]`, not a bare `[/zone]`. A
plausible-looking two-step strip —
`.replace(/\[(zone|term):[^\]]*\]/g,'').replace(/\[\/?(zone|term)\]/g,'')` — removes the *opening*
tags and leaves every *closing* tag's spec in the text, so a perfectly clean served string measures as
100% raw-coordinate-bearing. Done 2026-08-28: reported "rawCoord 16/16 on both sides", which
contradicted the epic's own founding 0/125 claim; the served prose was in fact clean
("you take the square at column 5, row 3"). **When a layer measurement contradicts a well-established
number, suspect your regex before you suspect the claim.**

**How to apply:** whenever you report a count from an answers file, state the layer in the same
sentence as the number. If you cannot say which layer you measured, you do not have a finding.
Related: [[feedback_verify_at_the_source_layer]], [[project_deep_reveal_eval_harness_gap]],
[[feedback_eval_design_methodology]].

## The same trap exists on the PROMPT side, and it cost several graders a wrong attribution

`assembleGroundedPrompt(buildReasonRenderModel(fv))` is **not** the prompt the model saw.
`buildPromptForCondition` (`server/scripts/compute.mjs`) returns
`assembleGroundedPrompt(...) + "\n---\n" + buildTask(budget) + localeSuffix`.

So "I grepped the assembled prompt and the word isn't there" is only a claim about the **grounded
body**. Measured 2026-08-31: five separate graders reported "the prompt contains no colour word" for
Spanish runs and charged colour-naming to the model. The colour instruction lives in
`SPANISH_OUTPUT_DIRECTIVE`, appended *after* the body — building the full prompt for `eval-36` shows
the `es` prompt contains "verde"/"gris" AND `buildTask`'s "never by color", while `en` contains
neither. The prompt contradicts itself; the model was obeying it. (OI-217.)

**Always build the FULL prompt via `buildPromptForCondition(null, nv, 'D', locale)` before concluding
a fact was absent from it** — and pass the locale, or you are checking the English prompt.


## The `usedSpecs` instance (2026-09-01) — it returns a PLAUSIBLE number, not an error

Same trap, one layer deeper, and it caught two independent agents in one session.

To ask "did this run emit its required handles?" you need `usedSpecs`. If you recompute it from the
row's stored `answer`, **you get an empty list for every row** — measured 42/42 — because
`postprocessAnswer` has already rewritten handles to specs in `answer.mechanism`, and
`processAnnotations` collects `usedSpecs` only by matching `[zone:<handle>]`. Spec-form tags are not
handles, and `dropUnoffered` unwraps anything not in the offer set.

The failure mode is the dangerous kind: no exception, no empty result you'd notice — you get
"every run is missing every required handle", which reads as a *finding* ("the model never complies")
rather than a bug. It was caught only because the arithmetic was impossible: "missing 1 -> 3" after a
retry that can only add handles.

**Correct recipe:** `parseAnswer(row.raw)` -> `postprocessAnswer(answer, row.render_decision)` -> use
its `usedSpecs`. The row stores `raw` for exactly this. Then subtract
`guardDiagnostics.strippedSpecs` if you want production's guard-aware view (D51).

## The two helper wrappers — a wrong call returns CONFIDENT ZEROS, not an error (2026-09-02)

Reconstructing an attempt from a stored row goes through two functions whose return shapes are easy
to get wrong, and both failures are silent:

- `parseAnswer(raw)` (`server/mechanismExplainer.mjs`) returns **`{ answer, parse_error }`** — not the answer.
- `postprocessAnswer(answer, render_decision)` (`server/scripts/compute.mjs`) returns
  **`{ answer, repairs, usedSpecs }`** — the mechanism is at `.answer.mechanism`, `usedSpecs` is top-level.

Pass either wrapper where an attempt is expected and `attempt.mechanism` is `undefined`. Then
`mentionsBetterColumn` hits its `if (!mechanism) return true` abstain branch and reports that EVERY run
named the better column, while `missingRequiredGroups` sees `usedSpecs: []` and reports every required
handle missing. The output is a clean table of plausible numbers with no error anywhere.

Measured cost, one session: this produced "better-column: fixed 0, regressed 11" (an artifact — the
fix count is structurally unreachable when `c1` is always `true`), and then, after a partial fix, an
all-zeros table that looked like "the change had no effect". Correct call:
`parseAnswer(raw)` → `.answer` → `postprocessAnswer(...)` → `{ mechanism: pp.answer.mechanism, usedSpecs: pp.usedSpecs }`.

**Also: guard-aware vs raw counts differ.** `missingRequiredGroups` on raw `usedSpecs` is NOT what
production computes — `scoreAttempt`/`decideRetry` (`server/retryDecision.mjs`) first re-run
`guardExplainMoveLlmPayload` and drop `diagnostics.strippedSpecs` to get `survivedSpecs`. Measuring
without that filter overstated required-set regressions 6 vs the true 4. Use `scoreAttempt` rather than
rebuilding the comparison by hand.

## A deterministic repair stage can silently turn a grading axis into a constant (2026-09-03)

D63/OI-224 added `ensureBetterColumnMention` — a post-LLM repair that appends "…column N…" when the
served text never names the better column. In the harness it **overwrites `answer.mechanism`**.

`grade_mechanical.mjs` computes axis **A6** ("did the prose name the better column?") from that same
field. Left alone, A6 would have become a **constant `pass` on every `--retry` run** — still printing a
confident number, measuring nothing. Nothing would have errored.

The fix, and the shape to reuse: `compute.mjs` emits `mechanism_pre_repair` (the model's own text;
`null` when no repair fired) and the grader reads `row.mechanism_pre_repair ?? a.mechanism`. So A6
keeps measuring the **model unaided** and stays comparable with pre-D63 baselines.

**`??` is load-bearing, and no test caught it at first.** `||` would fall through on the empty string
and grade the repaired text again — re-creating the exact failure. Substituting `||` left the whole
suite green until a test was added asserting `row({ mechanism_pre_repair: '' })` grades A6 `fail`.

**The generalization, which is the part worth remembering:** whenever you add a pipeline stage that
REWRITES a field a grader reads, you have silently changed what that axis measures. Ask "which field
does each axis read, and did I just rewrite it?" in the same change — and note that the judgment axes
(A3/A4/A5/A7/G1, G7's judgment half) grade `answer.mechanism`/`servedExplanation` too, so they are also
no longer strictly comparable across that change on the repaired rows (~7% of `--retry` rows).

The rubric is part of the instrument here: `.claude/skills/grade-fv-sufficiency/SKILL.md` and
`GRADER_INSTRUCTIONS_v2.md` both still described A6 as "the text the player is served". A fresh grading
session trusting that would have "corrected" `grade_mechanical.mjs` back and re-destroyed the axis —
both files had to be re-scoped in the same change.
