---
name: feedback-verify-at-the-source-layer
description: "Every false belief hides in a layer of representation — verify at the layer where the truth lives (signature not doc comment, diff not report, real output not your fixture, the app's request not your curl, all instances not a sample, call sites not tests, working tree not file list)"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: beac6818-214f-4294-b8d7-b0f88677a1a0
---

**You trust representations of reality over reality itself. That is one mistake, and it wears many costumes.**

Whenever you are about to believe something about a system, ask: *is this the truth, or a representation of the truth?* Then go down one layer, to where the truth actually lives.

| The representation you'll be tempted to trust | The reality to check instead |
|---|---|
| A doc comment / file header / README | **The signature.** Comments go stale and actively lie |
| A subagent's exploration report or summary | **The file.** A report summarizing a stale comment inherits the lie |
| A fix/implementer agent's report of what it did | **The diff.** Reports silently omit things |
| Your mental model of a data shape | **The producer's real output** (`node -e`, `curl`, `console.log`) |
| A test fixture you authored | **A value the code actually emits.** Your fixture tests your belief |
| A curl/request you hand-constructed | **The request the app actually sends** |
| A sample of 3 | **All N.** Sample only if it covers the variation |
| A helper's passing unit tests | **Its call sites.** A tested function nobody calls is dead code |
| "Already satisfied / no task needed" | **The code that allegedly satisfies it.** Highest-risk claim there is |
| A disjoint file list = "isolated" | **The shared working tree.** Isolation is about the write surface |
| A line number | **The symbol name.** Line refs drift; names don't |

**Why (2026-07-16 QA-remediation session — 19 errors, one root cause):**

- **Fixtures I authored → green tests, broken app.** Encoded anon as `tier: undefined`; `IndexedDBStore` actually makes `{device_uuid, tier:'free'}` — the UI would have told anonymous users "20 of 20 Deep Reveals left" when they get **one**. Treated Stripe prices as cents; they're `PriceInfo{amount,currency,interval}` — `monthly*12` → `NaN` → "Save NaN%". **Both had passing unit tests**, because the fixtures fed shapes the app never produces.
- **A doc comment became a plan fact.** Asserted `ttsProvider.synthesize(text)` "takes no lang arg" and needed widening. It was already `synthesize(text, opts={})`, and `buildTtsInstructions(basePrompt, lang)` already shipped. The claim came from a stale comment, laundered through an exploration agent's summary. It **manufactured scope for a seam that already existed**.
- **I verified with an input the app never sends.** "Confirmed" a server locale seam by curling `Accept-Language: es`. The client (`ConceptScreen`/`SocraticScreen`) sends **no headers at all**, so the whole feature — server seam, translated content, three data-loss fixes — would have rendered English to every user. The verification passed on a request I invented.
- **A 3-file sample nearly reverted a correct fix.** Concluded `socratic.goalPrompt` didn't exist; it's in **9 of 13** lessons. Almost dropped a real data-loss fix as "scope creep."
- **Tests-in-isolation hid dead code.** Extracted `effectiveDeepRevealCount` as the "one rule"; **nothing called it** — both production sites inlined the rule, a third copy was inbound, and its tests validated a variant (truthy null-check) production never ran. I'd inspected the code and still missed it, because I asked "do the copies agree?" instead of "is it called?"
- **A decision recorded as a no-op.** A shipped design doc said "blunders only — no task needed, `selectStep` already only navigates for blunder rows." `selectStep` gates on `quality !== 'optimal'`. The premise was false, so an unimplemented constraint was recorded as satisfied, contradicted a shipped spec, and survived for months until QA filed the *correct* behavior as a bug.
- **File-disjoint ≠ isolated.** Ran a fix agent alongside a batch agent; files were disjoint, the **working tree** was not, so one agent's `git add` swept the other's uncommitted work into its commit.

**The lesson that generalizes past all of it:** I first wrote these rules scoped to *plan authoring* — and then made three more of the same errors, in *verification*, *code review*, and *orchestration*. **A rule scoped to one costume does not transfer.** The principle is the deliverable, not the checklist.

**How to apply:**
1. **Name the layer.** Before believing a claim, say what layer it's from and what layer the truth is on. Go there.
2. **If you can't paste it, you didn't read it.** Cite `file:line` and paste the verbatim line. Paraphrase is where staleness hides.
3. **A green test is not evidence.** It must exercise the production path, use a real value, and RED for the right reason. If you wrote the fixture, you tested your belief.
4. **Verify with the real input**, never a constructed one. If you hand-built the request, you proved nothing about the caller.
5. **Sample only if it covers the variation.** Parse all instances when the corpus is small enough — 13 files is not too many.
6. **Ask "is it called?"** before "are the copies consistent?" Grep for call sites, not for agreement.
7. **Treat "already satisfied" as unverified** until you read the code that satisfies it.
8. **Serialize write-capable agents**, or give one `isolation: "worktree"`. Never two in one tree.
9. **Locate by symbol, not line.**

Related: [[feedback-spec-existing-apis]], [[feedback-llm-output-root-cause]], [[feedback-engine-soundness-then-render]], [[feedback-occam-principled-extrapolation]].
