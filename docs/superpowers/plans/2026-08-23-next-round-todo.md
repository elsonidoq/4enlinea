# Deep reveal — remaining work after the 2026-08-11 remediation plan (as of 2026-08-23)

**Status of the old plan: COMPLETE.** Tasks 1–9d are implemented, reviewed and committed
(`0d6f818`..`3771fba`), plus two post-measurement fixes (`2ef3ccb`). Task 10 is done except Step 4.
`test:fast` 1979/0. Nothing from that plan is in progress.

> This file is throwaway scratch. The durable record is `docs/open_issues.md` (OI-190..OI-196) and
> `docs/architecture/reason-DECISIONS.md` D48.

---

## 0. The one unfinished plan task

- [ ] **Task 10 Step 4 — full-corpus sweep (63 boards, n=3, `--model gpt-5.4-mini`).**
  Purely a MEASUREMENT — it fixes nothing. Its job is regression detection on the 38 boards the frozen
  subset cannot see. Cost: 189 answerer calls + a 63-case grading fan-out (the fan-out dominates).
  **Recommendation: do NOT run it yet — see §1.** Running it now buys a baseline for code we are about
  to change, which is exactly the mistake the 08-21 run made.

## 1. G7 annotation fidelity — NOT covered by any remaining task

G7 fell 78% → 71% → 66% while every other axis rose. Decomposed over the final run's **43 failing
runs**: 3 are membership failures, 3 are the `annotationRepairs` auto-fail, and **40 are judgment-half
only** — the handle was offered and well-formed, but wrapped words that do not match its role.

The plan only ever addressed membership (Task 9b, G7b 87%→98%). The judgment half had no task, no
target and no guard, and it got harder because Tasks 6 and 8 deliberately grew the required set.

23 of those 40 concentrate on five boards that map onto filed defects. These are code-verified and
model-independent — fix the render, not the model:

- [ ] **OI-196 — required block drops the board disambiguator. ONE-LINE FIX. Do this first.**
  `renderReasonModel.mjs:564` appends `(on the ${a.truthBoard} board)`; `:600` — the block the prompt
  calls mandatory — omits it. `eval-47`: two required handles on different boards restate identically,
  4/5 runs conflate them and two recommend the column the player just blundered.
- [ ] **OI-192 — first-offer-wins dedupe attaches the wrong horizon.** `eval-33`, 5/5, reproduced across
  both runs. The required `opp-key-line` says "not a threat right now" while the same window is
  immediate on the shown board; all 5 runs read the board correctly and contradicted the handle.
  Make the dedupe horizon-aware (and probably owner-aware).
- [ ] **OI-191 — sibling aliases carry byte-identical role text.** `eval-9`, `pin-L2`. `mkHandle`
  disambiguates the handle; `roleText` does not disambiguate the role. Give each sibling a
  distinguishing role (name its cell or its line).
- [ ] **OI-195 — L2 template names the wrong occupied cell.** `pin-L2`, 4/5 claim the opponent occupied
  a square that is still empty on the engine's own `finalMovestring`. A correctness bug, not wording.
- [ ] **OI-190 — `projectedDeep` is built from one half's line.** Deterministic on `eval-11`, also
  `eval-5`/`eval-21`. Any `opponentPunishment`-owned alias with `truthBoard:"projectedDeep"` is verified
  against the wrong continuation. Larger than the others: needs a per-half projected board, or a
  `truthBoard` that names the half.
- [ ] **OI-194 — L1/L4/L8 templates embed raw `cNrM` into text the prompt forbids echoing.** `eval-32`,
  5/5. Note this one is grader-variable: the same pre-existing text passed two earlier runs.
- [ ] **OI-193 — `forkPivotCell` misses forks carried by board tags, not a tagged half.** `eval-47`.
  A7c improved 9→4 run-failures but is not closed; do not report OI-182 as closing it.

**Sequencing recommendation:** OI-196 + OI-191 + OI-192 + OI-195 are one coherent unit (role text and
disambiguation, same file cluster, all small). Land them, re-run the 25-board subset ONCE to read G7,
and only then spend on the 63-board sweep — so the sweep measures fixed code.

## 2. The residual after §1 — enforcement, not offering

Every remaining G7/A7b failure now reads "required handle omitted" or "wrapped around the wrong cell",
never "handle not offered". That is a compliance problem and it is **not designed yet**. Options worth
brainstorming before building: a post-generation validator that rejects a mechanism missing a required
handle and retries; tightening the required set to fewer, better handles rather than more; or accepting
it and measuring the served-quality cost. Do not start coding this before §1 — §1 removes the defects
that currently make compliance ambiguous.

## 3. Housekeeping

- [ ] `MEMORY.md` is ~20.3 KB / 137 lines, marginally over the 20 KB compaction threshold.
- [ ] Candidate memory update: exemplar QUALITY in the prompt moved A6 ~8 points (68→76→84 across the
  three runs, with the worked-example prose repair in the last step). This cuts against the recorded
  finding that prompt wording is inert and only the required set moves behaviour. **One run — replicate
  before writing it as fact.**
- [ ] Branch integration decision for `worktree-deep-reveal-grounding` (18 commits, green).
