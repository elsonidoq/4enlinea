# Deep-reveal render remediation — state of play (2026-08-11)

Reference summary written mid-execution. Companion to
`2026-08-11-deep-reveal-render-remediation.md` (the plan) and
`2026-08-11-baseline-numbers.md` (the measured baseline).

---

## 1. Findings from the 2026-08-06 grading

63 cases, 126 answers, condition D, model `gpt-5.4-mini`.

- **5/63 cases passed.** Per-run axis rates: A1 126/126 · A2 126/126 · A3 99 · A4 101 · A5 116 ·
  **A6 76** · **A7 55**. G2 108 · G3 120 · G4 118 · G5 116 · G7 103.
- **Triage: 0 `vector_error`, 0 `missing_info`; 41 `prompt_confusion`, 17 `render_bug`.** The reason
  engine's evidence was correct and complete in *every* failing case — the entire loss is downstream
  of `computeReason`.
- **11 of the 41 `prompt_confusion` verdicts were mis-attributed.** They blamed
  `render_decision.link.text` that the model provably never saw: `assembleGroundedPrompt` prints only
  `frames`, and an opening record's `frames` is `[openingFrame]`. Verified on eval-12 —
  `prompt.includes(link.text)` is `false` and the completing cell `c2r5` appears nowhere. Corrected
  split ≈ **30 prompt / 28 render**.
- **The opening path is the dominant failure driver.** 30 of 63 cases take it; **1 passes**. It
  suppresses the half-geometry alias family, prunes both halves to `{register, pliesToEnd}`, and drops
  the causal sentence from the prompt: 3.7 aliases vs 8.9, requiredSet 1.02 vs 2.29.
- **Flakiness is the most trustworthy signal in the run.** 44/63 cases have at least one axis that
  scores differently across the two runs. The asymmetry is what makes it useful: *flaky ⇒ the context
  sufficed* (existence proof — one run complied). A7 is the **least** flaky axis (31%) and fails
  deterministically 80% of the time on opening boards — the model cannot point at handles that were
  never offered. A5/A4/G7/A6 are 89/75/72/61% flaky: information present, used about half the time.
- **The run used the production model, not a stronger one.** The rubric assumed a floor test, so every
  `prompt_confusion` verdict was ambiguous between prompt design and model capability.

## 2. What has actually been fixed

**No render fix has landed yet.** Tasks 4–9 — every actual render change — are still ahead.

### Grader correctness (`grade-fv-sufficiency` skill)
- Floor-test premise is now **conditional on the actual `model` field**, with the two regimes spelled
  out; a production-fidelity run must report that `prompt_confusion` cannot be separated from capability.
- **Mandatory prompt check**: before any "the model ignored X" finding, rebuild the prompt and confirm
  X is in it. If absent → `render_bug`, never `prompt_confusion`.
- **A6 redefined to what the player is served** (production's own `mentionsBetterColumn`, which tests
  through the guard's `stripInternalTokens`). Moved 15/126 runs and collapsed the apparent
  prose-vs-parenthetical gap from 50%→9% down to 9%→0%.
- **G7 split**: offered-set membership is mechanical; role-binding and over-wrapping stay judgments.
- Two cost rules: **never batch cases** (agent input is superlinear in turns — 58k/turn at 10–15 turns,
  97k at 30+), and sub-sample runs only for the deferred axes, never for the axis under measurement.

### Measurement instrument (4 commits, `test:fast` 1935/0)
| commit | what |
|---|---|
| `f378fb1` | 25-board subset frozen by set-cover over failure strata; all 5 passing cases kept as controls |
| `059e9dc` | `--sentence-budget` on the answerer |
| `d0536db` | `grade_mechanical.mjs` — deterministic A1/A2/A6/G7-membership |
| `7995a87` | answers written to `reason_corpus/runs/`, where the admin browser reads (found by a smoke run, not by reading code) |

### Process
CLAUDE.md rule + memory `feedback_dont_let_motive_rewrite_analysis.md`: answer the question asked,
never infer motive, reconcile rather than replace when corrected, announce your own reversals.

## 3. Hypotheses and what the experiments say

| hypothesis | status | evidence |
|---|---|---|
| **Suppression** — the opening path withholds the geometry, so the model *cannot* comply | **Standing, strongly supported. Untested until Task 6.** | Source: `link.text` and its cells absent from opening prompts (eval-12). Independent: A7 fails deterministically 80% on opening vs 53% mid/late; 78% when ≤4 aliases are offered vs 58% when more. |
| **Salience** — templates that never name the column lose it | **Confirmed on the shipped model; scope narrowed.** | Pre-fix A6 on `gpt-5.4-mini`: column-absent **43%** pooled (0/5 mid/late, 15/30 opening) vs parenthetical 87% and prose 100%. Task 4 cut to L5/L6/L9; the parenthetical rewrite was dropped once the corrected A6 definition collapsed its gap. |
| **Length** — the coach drops content because 1–3 sentences is too tight | **FALSIFIED by controlled arm.** | Same 13 boards, same model, budget the only variable: 2.1 → **4.1** mean sentences and 58 → **103** median words (the manipulation worked), but A6 **66% → 69%** — noise at n=65. G7b did not improve either (75% → 77%). Earlier corroboration: the ceiling was never binding (94% of runs wrote 2 of an allowed 3 sentences) and the within-case paired test was null. |
| **Capability** — the deficit is the model, not the context | **Live and large.** | A6 **68%** on `gpt-5.4-mini` vs **92%** on `gpt-5.4`, same prompts, same boards, same unmodified render. A1/A2 100% on both ⇒ the deficit is composition, not extraction. |

### The open strategic question
Part of what Phase B engineers around may be cheaper to buy by shipping a stronger model for deep
reveals. The Phase B fixes remain justified — they target things **no** model can do (name a handle
that was never offered, or a cell absent from the prompt) — but the capability arm bounds how much of
the *remaining* gap is worth engineering against. Decide after Task 10, not before.

### Methodological note worth keeping
Running production fidelity as the **primary** arm was load-bearing. Had we run only the stronger
model (the "floor test" the rubric originally assumed), the column-absent templates would have scored
67%/94% and Task 4 would have looked nearly unnecessary. On the model that actually ships they score
0%/50%.
