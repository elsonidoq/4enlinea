# Spec critique (Opus, source-verified) — specs/058-deep-reveal-grounding

## Blocking issues

**1. The single most load-bearing rule in the epic — how the "required squares" are computed — is not in the spec, and the one sentence that gestures at it does not exclude the wrong answer.**

Background: this feature forces the AI coach to highlight the squares its explanation rests on. Deciding *which* squares those are is the whole design. The epic (Settled decision 2) fixes it precisely: for each of the two halves of the reasoning record (`fv.lostResource`, `fv.opponentPunishment`), take `half.cell ?? half.completingCell`, or the whole `half.window` when the story is a line; match each result by exact string equality against the offered handle list (`aliases[].spec`); drop it if there's no match; cap the whole set at 1–3 groups. The epic explicitly forbids deriving it from `classifyCausalLink`'s `covers` field — confirmed at source that `covers` lists field-name codes from *both* halves (`connect-four/server/scripts/reason_engine/causalLinks.mjs`, e.g. `covers: ['route','lostResource.terminal','opponentPunishment.terminal']`) and so cannot say which half is load-bearing, and names no cells. The precedence rule the epic cites is real: `causalLinks.mjs:23` — `const denialCell = (h) => h?.cell ?? h?.completingCell ?? null;`

The spec reduces all of that to FR-003: "derive … directly from the same evidence used to generate the explanation (not from an unrelated summary of that evidence)." `covers` **is** part of the same evidence and is not "unrelated" — a plan author reading only spec.md can satisfy FR-003 with exactly the implementation the epic rules out, and it will look compliant. FR-005 likewise softens the hard "1–3 groups" cap to "a handful of groups."

Two related defects in the same area: the required→offered *matching* step (spec equality against the offered handles) is absent entirely — FR-004 states the invariant but not how it is enforced; and Edge Case 5 invents a rule that is nowhere in the epic ("two required squares colliding on one handle → drop the lower-priority group"). There is no priority ordering anywhere in this design. The epic's real drop rule is on *match failure*, not collision. A fabricated edge case in a spec becomes a fabricated task.

*Fix*: restate Settled decision 2 verbatim in spec.md — either as a bounded "Derivation rule" subsection under Requirements or as the definition of the **Required set** key entity. Replace "a handful" with "1–3". Replace Edge Case 5 with the epic's actual match-failure rule.

**2. Every cross-lane constraint that keeps three concurrent worktrees from colliding is missing from the artifact the planner actually scans.**

Three branches are being developed in parallel against this same code. The epic lists five hard constraints from the owner: (a) do not touch `stripInternalTokens`/`RANGE_RE` in `reasonRenderGuard.mjs` — another lane owns them; (b) no TTS work; (c) preserve the existing `Board.jsx` API, sizing owned by the other lane; (d) any new tracked issue must be numbered **OI-170+** because all three lanes would otherwise collide on OI-148; (e) any new test file must be an explicit, line-level append to the single ~180-file line in `connect-four/package.json`, never a rewrite of that line.

spec.md paraphrases (a)–(c) loosely inside Assumptions and omits (d) and (e) altogether. The spec author's handoff acknowledges this and relies on "`/speckit-plan` must re-read the epic verbatim." That delegation is not safe here — it is precisely the failure this project has already recorded: a constraint that lives only in prose outside the artifact the next tool scans gets silently dropped, and (d)/(e) are exactly the kind of constraint whose violation shows up only as a painful merge conflict days later.

*Fix*: add a short "Constraints (cross-lane)" section to spec.md carrying the five constraints verbatim, including the OI-170+ range and the package.json append discipline. These are not implementation details; they are hard boundaries on the deliverable.

**3. The "future square" visual treatment — a requirement with real frontend cost — has no owner, no design decision, and no success criterion.**

FR-002 requires that a deep, not-yet-playable fork square be *rendered* to the player differently from a present threat. This is the safety mechanism for the epic's whole reason for relaxing an earlier decision: highlighting a currently-empty square that only matters in five moves reads to a learner as "this is happening now."

Three problems. First, the epic states this styling is a **spec-level** decision ("exact styling is a US1 spec decision, not fixed here"); the spec punted it to the plan. Second, no Success Criterion covers FR-002 at all — SC-001…SC-007 verify highlighting, grounding, retry, numbering and tests, but nothing verifies the present/future distinction, so it can ship unimplemented and every measurable outcome still passes. Third, the spec's Assumptions imply the only frontend work is board numbering, but this requirement is not free on the client. The render chain is `MistakeDetailScreen.jsx` → `AnnotatedExplanation.jsx` → `Board.jsx`'s `zhCells` prop, and highlight colors come from a fixed 7-color pool deterministically keyed off the spec string (`connect-four/src/lib/annotatedText.js:8-23`). Distinguishing a future square means changing that assignment and/or the `zhCells` renderer inside `Board.jsx` — the same file another lane is editing.

*Fix*: decide the treatment in the spec (see Decision 2), and add an SC that a future-square highlight is visually and verbally distinguishable from a present one on the deep-reveal screen.

## Decisions required

**1. When the coach fails twice, which of the two explanations does the player actually see?** The design gives the AI coach one retry when it forgets to highlight a required square. If the retry also fails, the epic's settled policy is: never fail closed, serve the second attempt with the safety net applied. The spec instead leaves this open — its Edge Cases say "which of the two attempts gets served must be a stated, recorded decision," which states that a decision is needed without making it. Options: (A, recommended, matches the epic) always serve attempt 2 — simple, deterministic, always the attempt that saw the explicit "you missed these squares" instruction; (B) serve whichever attempt covers more of the required squares — better average output, but non-deterministic and harder to reason about when reviewing logged failures. Either way the choice must be written into the spec as a requirement and recorded per-incident.

**2. How should a "later, not now" square look on the board?** Options, in increasing cost: (A, recommended) verbal + role framing only, plus a reserved distinct colour from the existing highlight palette — lowest frontend surface, touches the colour-assignment helper, not the board renderer, so it stays clear of the parallel lane editing `Board.jsx`; (B) a distinct visual form (dashed outline / ghosted disc) — clearest to the player, but requires editing the board's highlight renderer inside `Board.jsx`, which another worktree currently owns; (C) wording only, no visual difference — cheapest, and the weakest guard against exactly the misreading this feature exists to prevent.

## Handoff context

**Decisions made and why**
- Treated "outcome-oriented phrasing" as legitimate spec-kit style *except* where it destroys a decision that was already settled with source-verified precision. FR-003/FR-005 are the case where it did: the abstraction is not merely vague, it fails to exclude the specific implementation the epic forbids. That is the difference between an acceptable abstraction and a hollowed-out requirement.
- Verified the epic's own factual claims at source rather than trusting them, since the spec inherits them. All checked hold: `zoneAnnotations.mjs:19` `const STRUCTURAL = new Set(['immediate','major','double'])` and the `!STRUCTURAL.has(tag.kind)) continue` skip at :77 confirm deep fork cells are currently unofferable; `aliases.push` at :68 and :82 both carry `spec`, so the epic's correction of the earlier "alias omits spec" belief is right; `reasonRenderGuard.mjs:193-195` self-documents that `allowedSet` is never threaded so `checkP5Strong` never runs live (OI-143 is real); `src/lib/annotatedText.js:38-45` confirms the client already accepts `cNrM`; `server/migrations/031_deep_reveal_failures.sql:11` confirms `raw_llm_output text NOT NULL`, so recording two attempts genuinely needs a migration; `causalLinks.mjs:23` confirms the `cell ?? completingCell` precedence.
- Did **not** raise the missing migration as a blocking issue. The spec's Key Entities "Explanation attempt record" plus FR-010 give the plan enough to derive it, and prescribing schema in a spec is against convention. Worth a mention to the plan author, not a block.

**Trade-offs / intentionally left out** (dropped to respect the top-3 limit; fold into the revision pass)
- (i) Raw-coordinate promotion appears both as US2 Acceptance Scenario 4 and as US3/FR-011, which risks two lanes of work for one behaviour — the epic assigns it to US3 only.
- (ii) SC-006's "pixel-for-pixel unchanged" is unverifiable in practice because the parallel lane is changing board sizing concurrently — it should be scoped to "unchanged by *this* feature".
- (iii) SC-007 does not carry the epic's 0-failure baseline.
- Did not judge whether the epic's Settled decision 8 (relaxing structural-only highlights) is itself correct — settled decisions are non-relitigable.

**Fragile areas for whoever acts next**
- Blocking issue 3 is the one most likely to be waved off as "just styling." It is not: it is the only mitigation for the present-threat misreading, and it carries unbudgeted frontend work in a file another worktree owns. If applied superficially (prose wording only), the epic's rationale for offering deep cells at all is undermined.
- If the spec is revised to restate the derivation rule, it must be **copied** from the epic, not re-worded. The rule already survived one lossy paraphrase; a second one is how the wrong implementation ships looking compliant.
- The spec's Edge Case 5 "collision" scenario is invented. If it survives into the plan it will manufacture a priority-ordering concept that exists nowhere in this design.
