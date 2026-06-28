# edgeType Fine-Grained K/D Thresholds Epic

**Status:** ready for direct implementation (created 2026-06-27) — **skips the speckit pipeline; see §3**
**Owner artifact under test:** the **`edgeType` field** of the feature vector (`deriveEdgeType` in
`server/sparseLookahead.js`) + the **glossary** (`docs/architecture/feature-vector-glossary.md` §5.3).
This epic refines *how `edgeType` is classified*, not the model.
**Predecessor:** [feature-vector-grounding-epic.md](./feature-vector-grounding-epic.md) (epic 040,
shipped 2026-06-27). This is the follow-up its `## Deferred` section names.

---

## 1. Why this exists

Epic 040 shipped `edgeType` with a **coarse branch only** and explicitly deferred the **fine-grained
branch**. Quoting 040's `## Deferred`:

> the fine-grained `edgeType` branch (K/D numeric thresholds mapping `pliesToEnd` to
> `tactical` | `positional` | `marginal`) is deferred to a follow-up iteration after Story A lands and
> the frozen vectors are regenerated with real `pliesToEnd` values. … K and D must be derived
> empirically from `pliesToEnd` values in the regenerated frozen set. Those values do not exist until
> Story A ships.

**Those values now exist.** Story A shipped and `eval_set_fv_suff_frozen_vectors.jsonl` was regenerated
on 2026-06-27 with real `outcomeTiming.pliesToEnd` on all 18 records. The precondition that gated this
work is satisfied, so the fine-grained branch is now derivable from data rather than guesswork.

**Two concrete failures of the coarse branch** (visible in the data table in §4) motivate the refinement:

1. **Near-term forced losses are mislabeled `positional`.** The coarse rule sets `positional` whenever
   `decisiveLine` is absent and the outcome doesn't diverge. eval-8 is `loss(1)` vs `loss(2)` — a loss
   forced within **1–2 plies** — yet it is labeled `positional` ("deep / no near-term tactic"), the exact
   opposite of the truth. `pliesToEnd` is available and contradicts the label.
2. **`marginal` collapses "equivalent resistance" with "much better resistance."** The coarse rule labels
   every same-outcome case `marginal`. But eval-42 (`loss(3)` vs `loss(13)`) and eval-56 (`loss(3)` vs
   `loss(4)`) get the **same** `marginal` label, even though eval-42's played move loses **10 moves
   slower** (far more opponent-slip chances — the core "a losing move can still be better" signal from
   040 §6) while eval-56's two moves are genuinely equivalent. The `pliesToEnd` delta distinguishes them
   and is currently thrown away.

The fine-grained branch reads `pliesToEnd` (now present) so `edgeType` stops contradicting it.

## 2. The design rule

`edgeType` must be consistent with `outcomeTiming` on the **Stakes** axis (040 design principle #3):
*what outcome, and how reachable.* The coarse branch answers "what outcome" (divergence) but ignores
"how reachable" (`pliesToEnd`). The fine-grained branch closes that:

- **K — near-term horizon.** A same-outcome forced result whose `pliesToEnd` is **within K of now** is a
  near-term tactic (`tactical`), not `positional`, regardless of whether a `decisiveLine` cell was
  extracted. (Fixes failure 1.)
- **D — equivalence delta.** Two same-outcome lines whose `pliesToEnd` differ by **≤ D** are genuinely
  equivalent (`marginal`). A delta **> D** means one move meaningfully changes resistance quality and must
  NOT read as `marginal`. (Fixes failure 2.)

K and D are **not invented** — they are fit to the 18-case data in §4 so the bands separate the known
correct labels.

## 3. Epic sizing verdict — **skip the speckit pipeline; implement directly**

Per `docs/best_practices_spec_driven_development.md` §"Epic Sizing", the full pipeline pays off only when
**all three** hold. Applying the test honestly:

| Sizing condition | This epic | Verdict |
|---|---|---|
| 8+ expected tasks | ~5 tasks (derive K/D, replace branch, glossary, tests, regen+spot-check) | ✗ |
| ≥1 unresolved design decision | YES — the K and D values (§6) | ✓ |
| Multiple subsystems touched | NO — single function in one file + its glossary entry | ✗ |

Two of three fail. The best-practices doc's red flags also fire: *"the scope section is a single bullet
point → likely too small for speckit"* and *"single component / internal tool → implement directly;
capture decisions in the commit message."* **Decision: do not run `/specify → /clarify → /plan →
/tasks`.** Implement directly from the task list in §5, after resolving §6 from the §4 data. This epic
file IS the spec; the §6 derivation IS the clarify step, done inline against real data.

**One caveat that keeps it from being trivial:** the K/D values are a genuine open decision and getting
them wrong re-mislabels the very cases 040 fixed. So this epic still gets a written file (this document)
and an explicit empirical-derivation gate (§6) — just not the full pipeline ceremony.

## 4. The data (requirements source)

The 18 frozen records as regenerated 2026-06-27 (`pliesToEnd` shown in parentheses; `-` = null/draw;
`dl` = `decisiveLine` present). **This table is the source of truth for fitting K and D.**

| id | category | coarse edgeType | best outcome(pliesToEnd) | played outcome(pliesToEnd) | dl | Δ pliesToEnd |
|----|----------|-----------------|--------------------------|----------------------------|----|----|
| eval-0  | drawing_move     | tactical   | win(1)   | draw(–)  | – | – (diverge) |
| eval-1  | suboptimal_move  | tactical   | draw(–)  | loss(1)  | – | – (diverge) |
| eval-2  | drawing_move     | tactical   | win(1)   | draw(–)  | – | – (diverge) |
| eval-6  | undercut         | tactical   | draw(–)  | loss(1)  | – | – (diverge) |
| eval-7  | forced_block     | marginal   | loss(1)  | loss(11) | Y | **10** |
| eval-8  | suboptimal_move  | **positional** | loss(1) | loss(2) | – | **1** |
| eval-10 | j_shape          | positional | loss(5)  | loss(6)  | – | 1 |
| eval-11 | immediate_threat | marginal   | loss(5)  | loss(14) | Y | **9** |
| eval-12 | immediate_threat | marginal   | loss(2)  | loss(5)  | Y | 3 |
| eval-15 | double_threat    | tactical   | win(2)   | loss(6)  | Y | – (diverge) |
| eval-29 | double_threat    | tactical   | win(2)   | loss(18) | – | – (diverge) |
| eval-38 | overcut          | marginal   | loss(3)  | loss(10) | Y | **7** |
| eval-42 | forced_win       | marginal   | loss(3)  | loss(13) | Y | **10** |
| eval-43 | forced_win       | marginal   | win(13)  | win(3)   | Y | **10** |
| eval-49 | z_threat         | tactical   | win(3)   | draw(–)  | Y | – (diverge) |
| eval-51 | figure_7         | tactical   | draw(–)  | loss(13) | – | – (diverge) |
| eval-56 | odd_even_threat  | marginal   | loss(3)  | loss(4)  | Y | 1 |
| eval-59 | claimeven        | marginal   | win(2)   | win(1)   | Y | 1 |

**What the data already shows (the §6 derivation, sketched):**

- **Outcome divergence stays `tactical`** (eval-0,1,2,6,15,29,49,51). The fine-grained branch does NOT
  touch diverging cases — divergence is the strongest tactical signal. (Open question 6.3: do deep
  diverging losses like eval-29 `loss(18)` / eval-51 `loss(13)` warrant a `positional`-flavored nuance?
  Default: no — keep `tactical`.)
- **Same-outcome Δ clusters cleanly:** small `{eval-8:1, eval-10:1, eval-56:1, eval-59:1, eval-12:3}` vs
  large `{eval-38:7, eval-11:9, eval-7:10, eval-42:10, eval-43:10}`. **Any D in [4,6] separates them.**
  Small-Δ → `marginal`; large-Δ → a non-marginal same-outcome label (see 6.2 for the name).
- **K (near-term) catches eval-8** (`loss(1/2)`): its `min(pliesToEnd)=1` is tiny → `tactical`, retiring
  the `positional` mislabel. eval-10 (`loss(5/6)`) sits near the boundary — its `min=5` is the K probe
  case. **K likely in [2,4].**

## 5. Task list (direct implementation — no pipeline)

1. **Derive K and D (§6 gate — do this FIRST, against the §4 data).** Pick K and D so the resulting labels
   match the intended column in §4. Document the chosen values + the one-line justification per band in
   the implementation commit message AND in glossary §5.3. Do NOT use round-number constants without
   checking them against all 18 rows.
2. **Replace the coarse branch in `deriveEdgeType`** (`server/sparseLookahead.js`) with the fine-grained
   total ordered if/else. **Keep divergence as the first test** (`tactical`). Then apply K (near-term →
   `tactical`) and D (small Δ → `marginal`, large Δ → the non-marginal same-outcome label). Preserve the
   "always a truthy enum on all four return paths" invariant (040 §6 pruning trap) — every path still
   returns a non-empty string.
3. **Glossary §5.3 lockstep:** document both branches (coarse, retained as the fallback when `pliesToEnd`
   is null on a side; fine-grained, now active), the K and D values + their derivation, and the band rule.
   Keep the 040 honesty wording ("within the search," never "provably").
4. **Unit tests** in `server/tests/sparseLookahead.test.js`: near-term forced loss → `tactical` (eval-8
   shape); small-Δ same outcome → `marginal` (eval-56 shape); large-Δ same outcome → non-marginal
   (eval-42 shape); divergence still → `tactical` (eval-15 shape); a null-`pliesToEnd` side → coarse
   fallback. Run `npm run test:fast` (inside `connect-four/`); the SC-003 characterization snapshot must
   stay byte-identical (this epic does not touch the shared seam).
5. **Regenerate + spot-check.** ⚠️ Use the exact resume-safe command (memory
   `project_run_eval_resume_mode_trap`): `rm -f` the output first, pass explicit input/output:
   ```
   cd connect-four
   rm -f server/scripts/eval_set_fv_suff_frozen_vectors.jsonl
   node server/scripts/run_eval.mjs \
     server/scripts/eval_set_fv_suff_frozen.json \
     server/scripts/eval_set_fv_suff_frozen_vectors.jsonl --no-llm
   ```
   Confirm eval-8 is no longer `positional`, eval-42 and eval-56 now carry **different** labels, and no
   row regressed against its §4 intended label.

## 6. Open design decisions (resolve from §4 data BEFORE coding — do NOT invent silently)

1. **K (near-term horizon).** The `pliesToEnd` ceiling below which a same-outcome forced result is
   `tactical` rather than `positional`. Probe cases: eval-8 `min=1` (must become `tactical`), eval-10
   `min=5` (boundary — `tactical` or `positional`?). Candidate K ∈ [2,4]; fit so eval-8 flips and eval-10
   lands where a board spot-check says it should.
2. **D (equivalence delta) and the large-Δ label name.** Δ ≤ D → `marginal`; Δ > D → a same-outcome label
   that signals "meaningfully better resistance / more opponent-slip chances." Candidate D ∈ [4,6] (cleanly
   splits the §4 clusters). **The label name is itself open:** reuse `tactical`? introduce a new enum value
   (e.g. `resistance`)? A NEW enum value is a glossary contract change and a new pruning-safe truthy string
   — decide explicitly and document. Default proposal: reuse the existing three-value enum, mapping large-Δ
   same-outcome to `tactical` (a sharp difference IS tactical), avoiding an enum expansion. Confirm against
   eval-43 (`win(13)` vs `win(3)`, Δ=10) — both win, so "tactical" must read sensibly there.
3. **Deep diverging losses.** eval-29 (`loss(18)`) / eval-51 (`loss(13)`) diverge in outcome but the loss
   is far off. Default: keep `tactical` (divergence dominates). Only revisit if a board spot-check shows
   the `tactical` label misleads.

## 7. Settled decisions (carry over from 040 — do not re-derive)

- **`edgeType` is a truthy enum on all four return paths** (pruning trap, 040 §6). The fine-grained branch
  must not introduce an undefined/empty path.
- **Coarse branch is retained as the fallback**, not deleted: when either side's `pliesToEnd` is null (draw
  or solver error), Δ is undefined, so the fine-grained Δ rule cannot apply — fall back to the coarse
  same-outcome → `marginal` rule. Divergence is always decidable from `outcome` alone.
- **Glossary is the model's only spec** — every change is a lockstep glossary edit.
- **Never re-mislabel the cases 040 fixed.** The §9 traceability of 040 is the regression bar: a K/D choice
  that re-breaks any retired counterexample is wrong by definition.
- **Scope is `edgeType` derivation + glossary only.** No new fields, no seam edits, no production prompt
  change, no re-grade inside the epic.

## 8. Non-obvious facts (traps)

- **`pliesToEnd` is per-side and may be null on one side while present on the other** (e.g. eval-0
  `win(1)`/`draw(null)`). The Δ rule needs both sides non-null; guard for it (→ coarse fallback).
- **`decisiveLine` presence is NOT the near-term signal** — eval-8 has no `decisiveLine` yet is near-term
  (`loss(1)`). Use `pliesToEnd`, not `decisiveLine` presence, for the K test. (This is precisely the coarse
  branch's bug.)
- **`pliesToEnd` is optimal-play distance-to-decisive-event, not mistake-branch depth** (`realizedOnPly`)
  and not raw score magnitude — 040 FR-A04. Do not conflate when reasoning about K.
- **The regen silently no-ops without `rm -f`** (memory `project_run_eval_resume_mode_trap`): the frozen
  output uses resume mode and skips ids already present, and the default input is a missing file. Always
  `rm -f` first and pass explicit input/output; verify the file mtime is newer than the source after.
- **Frozen vectors are `prune:false`** (`explainContext.js:1048`) — `edgeType` always serializes; a bad
  value won't be hidden by pruning. Good for spot-checking, but means a wrong label is fully visible.
- **No production-depth analysis here.** Eval depth is 20; production tiers are 10/8/4. `pliesToEnd` at
  shallow production depth may differ — out of scope (a separate trajectory step), noted so a reader
  doesn't assume production K/D behavior from the frozen set.

## 9. NOT included (out of scope)

- No new feature-vector fields (only `edgeType`'s value changes).
- No edit to `collectNovelOpportunities` / `compareOpportunities` or any shared seam.
- No production `lookaheadSection` prompt change.
- No re-run of the `gpt-5.4` answerer / re-grade inside the epic (separate, user-triggered).
- No production depth-tier analysis.
- No change to `outcomeTiming`, `decisiveLine`, `reachability`, or `categoryExamples`.

## 10. Acceptance criteria

- K and D documented with their §4-data justification (glossary §5.3 + commit message).
- `deriveEdgeType` fine-grained branch implemented; coarse branch retained as the null-`pliesToEnd`
  fallback; `edgeType` still a truthy enum on all four return paths.
- Glossary §5.3 updated in lockstep (both branches, K/D values, band rule, honesty wording).
- `npm run test:fast` green, including the new band tests and the byte-identical SC-003 snapshot.
- Frozen vectors regenerated (resume-safe command); eval-8 no longer `positional`; eval-42 vs eval-56 now
  carry different labels; no §4 row regressed; no 040 §9 counterexample re-broken.
- **Separate, user-triggered:** re-run `explain_from_vector.mjs` + `grade-fv-sufficiency` to measure the
  A3/A4 delta from the sharper `edgeType`.

## 11. Authoritative sources of truth

- [feature-vector-grounding-epic.md](./feature-vector-grounding-epic.md) — predecessor; §6 settled
  decisions, §9 traceability (the regression bar), `## Deferred` (this epic's mandate).
- `specs/040-fv-grounding/` — `spec.md` (FR-B06 coarse/fine-grained split), `data-model.md` §1.4
  (`edgeType`), `research.md` §R5 (deferral rationale + deferred method).
- `connect-four/server/sparseLookahead.js` — `deriveEdgeType` (the function to change).
- `connect-four/server/scripts/eval_set_fv_suff_frozen_vectors.jsonl` — the 18 records carrying real
  `pliesToEnd` (the §4 data; the K/D fitting set).
- `docs/architecture/feature-vector-glossary.md` §5.3 — the contract under test.
- `docs/best_practices_spec_driven_development.md` §"Epic Sizing" — the basis for §3's skip-pipeline
  verdict.
- Memory `project_run_eval_resume_mode_trap` — the resume-safe regen command (§5 task 5).
