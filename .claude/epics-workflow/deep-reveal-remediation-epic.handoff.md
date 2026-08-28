## Handoff context (from tasks_create)

Generated `specs/059-deep-reveal-remediation/tasks.md` — **46 tasks**: Setup (T001), Foundational (T002), US1 (T003–T011), US2 (T012–T021), US3 (T022–T039), Polish (T040–T046).

**Key structural decisions:**
- **Encoded the T002 → T017 edge explicitly** (FR-004 / epic task 1.7 → FR-013 / epic task 2.6) — as a Foundational phase note, a task-level "depends on T002", AND a dedicated "The one hard implementation edge" subsection in Dependencies, so it cannot be missed as mere prose.
- Put FR-004 (guard-diagnostics widening) in a **Foundational** phase rather than nested under US1, even though the epic numbers it "1.7" — it is genuinely consumed by both US1 (T004) and US2 (T017). Caveat documented: it does NOT block US3.
- Every US2/US3 task cites its OI-N, FR-NNN and epic task number, and **flags UNVERIFIED line-number citations for symbol-lookup rather than trust**.
- Every PROVISIONAL Q-pick (Q2/Q3/Q4/Q5/Q8) is implemented with an explicit `// QN PROVISIONAL` code-comment instruction, never silently resolved.
- `eval-33` is carried as a named, commented test exemption (T028), with an explicit instruction NOT to implement the deferred board-selection remedy anywhere.
- **T043** extends the existing `docs/deployment_steps.md:1952` PENDING entry (third update, matching the `:1966`/`:1975` precedent shape) rather than creating a new entry, and adds the required "if already marked DONE, run again" sentence. **No new purge script** — confirmed the established pattern is a manually-run SQL command, not tooling.
- **T044** lists the exact **3 new test files** for human `test:fast` registration; no task touches `package.json`.
- **T045 (LLM re-measure) and T046 (deploy) are the only two owner-gated tasks**, both marked `[OWNER APPROVAL REQUIRED]`, both explicitly "no agent may execute this autonomously."
- **T041 (D-log) and T042 (§12)** doc-lockstep tasks enumerate every decision requiring an entry, including Design Decisions 1/2 and all five implemented PROVISIONAL picks.
- **T036** (US3's `causalLinks.test.mjs` extension) is explicitly ordered after **T020** (US2's) since they share a file — called out in both the task text and Parallel Opportunities, since `[P]` markers alone do not capture cross-story same-file conflicts.

**Trade-offs / deferred:**
- Task granularity is finer than the epic's 24-task count (46 here) because each epic task was split into implementation + its own test-extension task, plus explicit doc/registration/deploy tasks the epic's table does not enumerate.
- No task for the OI-186 refactor, the `eval-33` remedy, or a second retry design — all listed in a closing **"Explicitly deferred"** section so a future session does not reintroduce them from task-list absence alone.
- Did not write a full parallel-execution bash example block.

**Uncertainties for the next stage:**
- **All `UNVERIFIED` line-number citations inherited from `plan.md`/`research.md` remain unverified through this stage** and must be re-verified by symbol at implementation time.
- **T043's exact commit range** cannot be filled in until Epic 12's commits exist — the task describes the mechanics; the range is a fill-in-at-completion detail.
- **`/speckit-analyze` was NOT run** by the tasks agent — it flags this as worth doing before implementation starts.

## Standing constraints (carried through every stage)

- **US1-before-US2/US3 is a VALIDATION ordering**, EXCEPT the hard T002 → T017 (1.7 → 2.6) implementation edge. No US2/US3 acceptance may be gated on an LLM re-measure (FR-031).
- **Do not resolve the `[NEEDS CLARIFICATION]` markers** (Q1–Q5, Q7, Q8). **Q6 is RESOLVED.**
- **Q8 / D49:** `disambiguateSiblingRoles` put coordinates in role text on purpose (collisions 48/63 -> 0/63). Any replacement locator must preserve that property.
- **12g trap:** new prompt wording is wording the model echoes — extend the never-repeat list in the same change (epic AC 16 / `reason-render-grounded-prompt.md` 12, extended never contradicted).
- **OI-207 and OI-208 are DIFFERENT issues.** Next free id is OI-209.
- **NEVER read or edit `connect-four/package.json`** — one 7,146-char line; it has killed two agents.
- Baseline `npm run test:fast` -> **1999 pass / 0 fail**, lint clean (lint runs first; a lint *error* means zero tests run).

## Verified at source across stages — reuse verbatim, do NOT re-derive

`guardExplainMoveLlmPayload` **synchronous** `reasonRenderGuard.mjs:418`, returns `{...rest, explanation, prompt, terms}`; `SPAN_CARRYING_CODES` `:354`; `stripFailingZoneSpans` private, no export, `:365-379`; `toAllowedSet` exported `:281`; `validateAnnotation` result computed `:429`, only `console.warn`'d `:434`; `promoteRawCoordinates` `:217` and `humanizeGroundedCoordinates` `:156` **collect nothing internally**. `computeMechanism` signature `:181`, `renderDecision` local `:187`; `missingRequiredGroups` `:85-87`, **single call site `:221` on `attempt1`**, retry trigger `missing.length > 0` at `:227`, amended pass `:227-231`. `renderReasonModel.mjs:137/146`, `:153`, `:172` (3-slot cap), `:604-605`, `:239-250` (`fieldPartition`), `:332`, array branch `:37-41` vs object guard `:43-44`. `index.js:1296/1469/1470`. `docs/deployment_steps.md:1952` purge entry (extended `:1966`, `:1975`); the DONE-flip precedent at `:1826`.

**US1 regression fixture is genuinely HARVESTED:** replaying all 125 records of `fv_suff_answers_boards_subset_2026-08-26T15-47-56Z.jsonl` through the real guard gives raw `cNrM` in served prose **62 -> 0** and **5** runs losing at least one `[zone:]` span — exactly AC 2's figures.

**OI-194 baselines:** `link.text` **20/25**, `zones.aliases[].role` **13/25**, `requiredSet[].role` **10/25**, `alias.spec` **25/25** (exempt by design — it is the `aliasBySpec` key, D2/D43).
