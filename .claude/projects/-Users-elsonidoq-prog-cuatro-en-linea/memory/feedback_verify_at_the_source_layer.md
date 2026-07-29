---
name: feedback-verify-at-the-source-layer
description: "Every false belief hides in a layer of representation — verify at the layer where the truth lives (signature not doc comment, diff not report, real output not your fixture, the app's request not your curl, all instances not a sample, call sites not tests, working tree not file list)"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: beac6818-214f-4294-b8d7-b0f88677a1a0
  modified: 2026-07-28T16:15:56.228Z
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
| An empty result from a command you wrote | **The command.** `rg -rn "x" f` finds nothing because `-r` is `--replace`, not "recursive" — a malformed command's silence reads exactly like proof of absence |
| A test summary saying `fail 0` | **The test's own case names in the output.** `node --test` silently skips a missing file *in a list*, and — measured on Node v23.11.0 — the **exit code is 0 and `grep -c "Could not find"` is 0** too, so neither of those catches it (they only fire when the missing file is the sole argument). `test:fast` is always a list. See `docs/architecture/testing-conventions.md` §`test:fast` |
| An Opus critique agent's confident, specific premise | **The code it names.** Critique agents assert false premises as fluently as implementers ("StatsScreen reuses its existing AuthModal" → StatsScreen has no AuthModal). Give every fix agent a **stop-and-report** instruction instead of a fix-it mandate, so a false premise surfaces rather than getting built on |
| A line number | **The symbol name.** Line refs drift; names don't |

**Why (2026-07-16 QA-remediation session — 19 errors, one root cause):**

- **Fixtures I authored → green tests, broken app.** Encoded anon as `tier: undefined`; `IndexedDBStore` actually makes `{device_uuid, tier:'free'}` — the UI would have told anonymous users "20 of 20 Deep Reveals left" when they get **one**. Treated Stripe prices as cents; they're `PriceInfo{amount,currency,interval}` — `monthly*12` → `NaN` → "Save NaN%". **Both had passing unit tests**, because the fixtures fed shapes the app never produces.
- **A doc comment became a plan fact.** Asserted `ttsProvider.synthesize(text)` "takes no lang arg" and needed widening. It was already `synthesize(text, opts={})`, and `buildTtsInstructions(basePrompt, lang)` already shipped. The claim came from a stale comment, laundered through an exploration agent's summary. It **manufactured scope for a seam that already existed**.
- **I verified with an input the app never sends.** "Confirmed" a server locale seam by curling `Accept-Language: es`. The client (`ConceptScreen`/`SocraticScreen`) sends **no headers at all**, so the whole feature — server seam, translated content, three data-loss fixes — would have rendered English to every user. The verification passed on a request I invented.
- **A 3-file sample nearly reverted a correct fix.** Concluded `socratic.goalPrompt` didn't exist; it's in **9 of 13** lessons. Almost dropped a real data-loss fix as "scope creep."
- **Tests-in-isolation hid dead code.** Extracted `effectiveDeepRevealCount` as the "one rule"; **nothing called it** — both production sites inlined the rule, a third copy was inbound, and its tests validated a variant (truthy null-check) production never ran. I'd inspected the code and still missed it, because I asked "do the copies agree?" instead of "is it called?"
- **A decision recorded as a no-op.** A shipped design doc said "blunders only — no task needed, `selectStep` already only navigates for blunder rows." `selectStep` gates on `quality !== 'optimal'`. The premise was false, so an unimplemented constraint was recorded as satisfied, contradicted a shipped spec, and survived for months until QA filed the *correct* behavior as a bug.
- **File-disjoint ≠ isolated.** Ran a fix agent alongside a batch agent; files were disjoint, the **working tree** was not, so one agent's `git add` swept the other's uncommitted work into its commit.
- **My own broken command almost became a fact.** `rg -rn "AdminLessonEditorScreen" src/lib/…` returned nothing, so I reported the editor screen "isn't routed" — `-r` is ripgrep's `--replace`. It was routed all along (`App.jsx` pathname checks, not `screenRegistry`). I noticed the empty output, mentioned it in passing, and *let it stand for a whole turn*. An empty result is a claim about your command before it's a claim about the code.
- **A green suite I'd filtered.** Reported "1378 pass, 0 fail" by grepping the summary lines — never checking the exit code, while a registered-but-deleted test file was being silently skipped. I built the filter that hid the evidence.
- **An assertion that compared a literal to itself.** A plan I authored shipped `assert.equal(WINDOW_COUNT_MAX, 13)` where `WINDOW_COUNT_MAX` **is** the literal `13` one file away. It can never fail: change the board geometry that produces the 13 and every tint mis-scales with the suite fully green. A sibling test asserted a render guard no fixture exercised — deleting `&& value === 'empty'` left all three tests passing. Both survived a spec, a plan, six task reviews *and* a whole-branch review. Fixed by deriving the expectation from the real geometry (`Math.max(...computeWindowCounts('', 'red').flat())`). **A tautological assertion is worse than no test — it occupies the slot where a real one would go, and reads as coverage.**

**The lesson that generalizes past all of it:** I first wrote these rules scoped to *plan authoring* — and then made three more of the same errors, in *verification*, *code review*, and *orchestration*. **A rule scoped to one costume does not transfer.** The principle is the deliverable, not the checklist.

**How to apply:**
1. **Name the layer.** Before believing a claim, say what layer it's from and what layer the truth is on. Go there.
2. **If you can't paste it, you didn't read it.** Cite `file:line` and paste the verbatim line. Paraphrase is where staleness hides.
3. **A green test is not evidence.** It must exercise the production path, use a real value, and RED for the right reason. If you wrote the fixture, you tested your belief. **Prove it by mutation:** break the guard, watch the test fail, restore. For a constant, derive the expectation from whatever produces it — never restate the literal.
4. **Verify with the real input**, never a constructed one. If you hand-built the request, you proved nothing about the caller.
5. **Sample only if it covers the variation.** Parse all instances when the corpus is small enough — 13 files is not too many.
6. **Ask "is it called?"** before "are the copies consistent?" Grep for call sites, not for agreement.
7. **Treat "already satisfied" as unverified** until you read the code that satisfies it.
8. **Serialize write-capable agents**, or give one `isolation: "worktree"`. Never two in one tree.
9. **Locate by symbol, not line.**

Related: `CLAUDE.md` §"When writing specs for existing components", [[feedback_llm_output_root_cause]], [[feedback_engine_soundness_then_render]], [[feedback_occam_principled_extrapolation]].
