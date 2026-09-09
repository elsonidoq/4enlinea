---
name: feedback_subagent_reports_are_scoped_claims
description: "Orchestrating implementation batches: a sub-agent's green test run may be against its working tree not its commit, and it reports only what its handoff schema asked for"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e028b561-9207-4fcb-8d32-293b39e07945
  modified: 2026-08-05T20:30:30.073Z
---

**Trigger: you are coordinating implementation sub-agents (`/coordinate-implementation`, `/epics-manager`, any fan-out where agents commit) and are about to accept a batch's report.** Two failure modes, both observed in one epic (spec 056, 2026-08-03), neither visible from reading the report.

**1. "Tests pass" can be measured against the working tree, not the commit.** A batch deleted a test file per its task and reported `test:fast` green — true of its working tree, false of the commit it created, because the matching `package.json` deregistration was never staged. `node --test` hard-fails (`Could not find '<path>'`) on a listed-but-missing file, so **zero tests ran at that commit**. The agent's number was real; it just described a state that was never committed.
**How to apply:** after a batch commits, verify at the commit, not the report — `git stash` the working tree and re-run, or `git show HEAD:<file>` the registry the suite reads. Cheap, and it catches a class the agent structurally cannot see. Related: this is a fresh instance of OI-118 (hand-maintained `package.json` test lists fail silently in both directions) and of [[feedback_verify_at_the_source_layer]]'s "the diff, not the agent report".

**2. A sub-agent reports only what its handoff schema explicitly asks for.** Findings that belong to nobody — a pre-existing bug it worked around, breakage in a file it opened for another reason — match no bullet and evaporate, even when the agent clearly saw them. In spec 056 a broken script found by **batch 1** surfaced only as a passing drift note, survived three more batches unrecorded, and got filed as `OI-125` at the very end solely because a later brief happened to say "report open-issue candidates". Yield tracked whether the coordinator remembered to ask, not what was there.
**Why:** an orchestration handoff is a schema, and agents fill schemas. "Anything incomplete… **for the next batch to finish**" is scoped to in-scope work; an out-of-scope discovery is nobody's next batch.
**How to apply:** `/coordinate-implementation` now carries an explicit **"Out-of-scope discoveries"** handoff bullet (report, don't fix; silence is a finding lost), Step 4 carries them into Open items, and Step 7 reads three sources so Step 5's declined review findings land somewhere. If you write a fan-out brief by hand, include that bullet — and put the QA/report format's out-of-scope section in too.

**3. "That result is expected" is the report line most worth re-measuring.** Spec 058 (2026-08-05):
a batch implemented `deriveRequiredSet`, tested it with **hand-built** `{pruned, zones}` fixtures,
observed an **empty** required set on both, and reported it as correct FR-006 abstention. Plausible,
well-argued, and it would have meant the epic's whole mandatory-highlighting mechanism was inert. Ten
minutes running the real function over the **existing 29-record coverage corpus** showed 16 of 29
non-empty — the mechanism was fine — *and* surfaced a defect the agent's fixtures structurally could
not: both causal-link halves routinely resolve to the **same** offered alias, so 9 of those 16
emitted a byte-identical duplicate group, which would have printed the same instruction line twice in
the prompt and burned one of the three capped slots.
**Why:** a hand-built fixture encodes the author's model of the data, so it can only confirm that
model. The corpus is the data. **How to apply:** when a sub-agent explains away an absence
("expected", "abstains correctly", "no rows match"), re-run its function over a real corpus before
accepting it — and prefer briefs that say *harvest* fixtures rather than write them.

**4. "A concurrent workstream did it" is the alibi to distrust when lanes run in parallel.** Plan A
(2026-08-04, three lanes live) saw this **twice in one plan**, from different implementers on different
tasks: one blamed "a concurrent workstream's i18n additions" for 11 registry rows its own mandated
`--sync` had legitimately added; another blamed "package.json contention from the parallel work streams"
for an edit of its own that had landed in `test` but not `test:fast`. Both false — `git log
<base>..HEAD -- <file>` showed **only that plan's own commits** had ever touched either file. In the
second case the agent's own evidence line ("preserved 217, removed 0") contradicted its narrative and it
did not reconcile them.
**Why it's dangerous specifically here:** with several worktrees active the explanation is *plausible*,
it is unfalsifiable from inside one agent's context, and it converts "I made a mistake" into "the
environment is broken" — which, taken at face value, sends the coordinator hunting a nonexistent
worktree-isolation bug instead of checking the one-line diff.
**How to apply:** treat it as a claim with a two-second disproof — `git log <base>..HEAD -- <path>` and
`git status` in the other worktree. Worktrees are isolated; cross-tree writes essentially do not happen.
Confirm the final state is correct (both times it was) and record the misattribution rather than
inheriting it.

**Corollary — a confidently-argued premise is still a claim.** The same epic's deploy runbook asserted "User Story 2 already shipped and is running in production" and derived a migration-before-code ordering from it. Nothing had shipped (unmerged branch, no remote), and the live code `SELECT`ed the column being dropped — so the runbook, as written, was an instruction to break production. Verify deploy-ordering premises against what is *actually* deployed (`git branch -r --contains`, `origin/main..HEAD`), never against an agent's narration. See [[feedback_implemented_vs_deployable]].

## A grader dispatched to evaluate YOUR fix will sometimes report the fix didn't land

Measured 2026-08-25, deep-reveal grading fan-out (25 agents per run, two runs). Three separate graders
asserted things about freshly-changed code that were false at source:

- two claimed a pair of sibling alias roles were "byte-identical" — the disambiguation fix was present
  and the two roles differed (`the one at c3r1: …` vs `the one at c2r1: …`)
- one attributed a raw-`cNrM` leak to a hint added that session; the leak was **pre-existing** —
  122/125, 121/125, 123/125 runs across three runs, i.e. essentially constant

Each was a *secondary* claim in a report whose *primary* finding was correct and valuable, which is
exactly why they slip through: the report reads as competent, so the aside inherits its credibility.

**A report's observation can be RIGHT while its attached framing is WRONG — check both halves
separately.** 2026-08-26: a grader reported "`lostResource.line` renders as four empty objects" and
attached "…so the forced denial sequence was suppressed, despite `fieldPartition.rendered` listing
those paths." The *observation* was exactly right (confirmed at source; 13 of 25 records, now OI-206).
The *framing* was wrong: that field's disposition is `transformed`, not `render`, so nothing the
contract promised was being suppressed. Acting on the framing would have "restored" information the
design deliberately routes through the board. Verify the fact and the interpretation as two claims.

**Before accepting any subagent claim that contradicts a change you just made and verified, re-run the
one-line check at source.** For a render/prompt claim that means calling the production builder and
printing the field — not re-reading the diff, and not trusting the agent's quotation of it. A wrong
"your fix didn't work" costs a rollback of a good change; a wrong "this is caused by your change"
sends you fixing something that was always there.

## A KILLED agent's last transcript line is not what it accomplished — check the disk

2026-08-27: a `plan_create` agent (and its three verification sub-agents) died on an API session-limit
429. Its final captured message was *"I now have everything needed. Let me write `research.md` first."*
— which reads as "nothing was written." In fact it had already written **all four** artifacts
(`plan.md` 436 lines, `research.md` 300, `data-model.md`, `quickstart.md`), each ending cleanly with no
truncation. Re-running the stage would have destroyed complete work.

The inverse also holds: it never emitted its `## Handoff context`, and it was **unknowable** whether its
verification sub-agents finished before dying — so every `file:line` citation in those files had to be
treated as unverified and re-checked downstream. And one artifact it *did* list as an output
(`contracts/guard-diagnostics-contract.md`) genuinely did not exist, while a *different* stage's
critique caught it.

**How to apply:** on any agent failure, `ls` and `wc -l` the expected outputs and check whether the tail
of each file terminates cleanly, **before** deciding to re-run. Then treat what it wrote as unreviewed:
partial completion is the normal case, and the missing half is usually the *verification*, not the
prose.
