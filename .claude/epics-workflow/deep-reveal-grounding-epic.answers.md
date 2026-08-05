# Answers and decisions (epic_critique)

## Blocking issue 1 — US1 asks for handles a settled design decision forbids (deep fork cells)
Answer: **Offer them, marked as future squares.**

Deep (not-yet-playable) fork cells MAY now be offered as handles, but they must be rendered and
described distinctly as "this square matters later" — a future/deep role, visually and lexically
separated from present, playable structural cells. The prompt must forbid present-tense threat
language for these cells. This is a deliberate, scoped amendment to the prior "structural-only
highlights" decision, not a blanket reversal: the mitigation moves from *exclusion* to *framing*.

Also apply the rest of the recommended resolution: add `docs/architecture/reason-render-grounded-prompt.md`
to the epic's `Authoritative sources of truth`, and record the above as a new numbered Settled decision
that explicitly names what changed relative to the "structural-only highlights" / eval-3 present-threat
rationale in `zoneAnnotations.mjs` (`STRUCTURAL`) and in that design doc.

## Blocking issue 2 — Two "verified at source" Non-obvious facts are wrong
Answer: Accept recommendation (auto-applied — no alternative).

Rewrite both bullets:
- The `zoneAliasMap` drop in `renderReasonModel.mjs` loses no information — each entry in `aliases`
  already carries its `spec` field, and `processAnnotations` reconstructs the same map from `aliases`
  alone. The allowed set is derivable from `aliases[].spec` with **no `renderReasonModel` change**.
  The real reason the grounding check never runs is that the live serving handler in
  `connect-four/server/index.js` never builds an allowed set at all, and `guardExplainMoveLlmPayload`
  (`server/reasonRenderGuard.mjs`) passes a literal `null`. The fix is threading a set derived from
  `aliases` into the guard.
- `[zone:col4]`/`[zone:col2]` are NOT a leak. `col4` is the **expanded spec** of the offered handle
  `better-col`/`played-col`; `processAnnotations` rewrites handle → spec by design. Seeing it in
  cached text is evidence the pipeline worked. Delete the "characterize the drop path" instruction.

Additionally, per the reviewer's systemic finding: sweep the **entire** `Non-obvious facts` section
against the actual symbols, not just these two bullets. The section's framing was inherited from
`docs/open_issues.md` OI-143's narrative rather than from code.

## Blocking issue 3 — US2's required-cell derivation is not derivable from the cited code
Answer: Accept recommendation (auto-applied — no alternative).

Replace the hand-wave with an explicit derivation rule. `classifyCausalLink` returns
`{ id, confidence, covers, guardrail, text }`; `covers` is a list of field-name codes
(e.g. `'lostResource.terminal'`) and every link lists **both** halves, so it cannot by itself
discriminate which half is load-bearing and it names no cells. The epic must state: which field of
which half yields a cell, how that cell is matched to an offered handle, and what happens when the
match fails. Also correct the claim that `processAnnotations` returns the used-spec set — it returns
`zonesEmitted` (boolean) and `keyCells` (specs already expanded into individual cells); the spec set
is a local variable.

## Decision 1 — The non-existent "small-fixes plan" dependency
Answer: **Hard prerequisite on Plan A — do NOT fold the fixes into this epic.**

(The owner initially selected "fold both in as US0", then superseded that with a constraint update:
another session is already executing those fixes as "Plan A". The constraint update governs.)

Record as a stated hard prerequisite with an explicit ordering gate: Plan A lands first, and this
epic builds on the post-Plan-A code. Specifically:
- **Do NOT modify `stripInternalTokens` or `RANGE_RE` in `server/reasonRenderGuard.mjs`.** Plan A owns
  that file: it is widening `RANGE_RE` for en-dashes and routing the TTS seam through the same
  sanitizer. US3's coordinate promotion must be planned as work that **builds on** the post-Plan-A
  version of that function, with the dependency stated explicitly. Writing our own version of that
  function would merge cleanly and be wrong.
- **Plan no TTS work at all.** Plan A is routing `GET /api/user/tts/deep-reveal` through the shared
  sanitizer.

## Decision 2 — Scope of board numbering (US4)
Answer: **Opt-in prop, deep-reveal only for now.**

Add an opt-in prop to the shared board component, enabled on the deep-reveal screen only. Other
screens stay untouched, keeping the visual-regression surface to one screen; enabling it elsewhere
later is a per-screen one-line change, not a rewrite. The wider rollout is left as a cheap follow-up
decision, not foreclosed.

## Cross-lane constraints (owner, mid-turn — these are hard constraints on this epic)

Three sessions are running in parallel worktrees: **Plan A** (eight small fixes), **Plan B** (mobile
viewport), and this epic. Fold these in:

1. `server/reasonRenderGuard.mjs` — `stripInternalTokens` and `RANGE_RE` are **owned by Plan A**;
   do not modify them. Build on the post-Plan-A version and state the dependency. (See Decision 1.)
2. No TTS work — Plan A owns the `GET /api/user/tts/deep-reveal` sanitizer routing. The two-attempt
   `deep_reveal_failures` logging also lives in `server/index.js`: keep it in **its own region** of
   that file, away from the TTS handler.
3. `src/components/Board.jsx` (US4 numbered coordinates) — **Plan B may touch board sizing**. Preserve
   the existing Board API and treat sizing as owned by that lane.
4. Any new open-issue id must use the range **OI-170+** (highest existing is OI-147; all three lanes
   would otherwise claim OI-148). Note US3 **closes the existing OI-143** — do not open a duplicate.
5. `connect-four/package.json` line 17 (`test:fast`) is a single line listing ~180 test files and all
   three lanes append to it. Any test file this epic adds must be listed **explicitly** in the plan.
