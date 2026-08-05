---
name: feedback_subagent_reports_are_scoped_claims
description: "Orchestrating implementation batches: a sub-agent's green test run may be against its working tree not its commit, and it reports only what its handoff schema asked for"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e028b561-9207-4fcb-8d32-293b39e07945
  modified: 2026-08-05T20:09:15.928Z
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

**Corollary — a confidently-argued premise is still a claim.** The same epic's deploy runbook asserted "User Story 2 already shipped and is running in production" and derived a migration-before-code ordering from it. Nothing had shipped (unmerged branch, no remote), and the live code `SELECT`ed the column being dropped — so the runbook, as written, was an instruction to break production. Verify deploy-ordering premises against what is *actually* deployed (`git branch -r --contains`, `origin/main..HEAD`), never against an agent's narration. See [[feedback_implemented_vs_deployable]].
