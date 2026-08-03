---
name: project_dom_test_hang_diagnosis
description: "A hanging jsdom test is almost always assert.equal() formatting a live DOM node (util.inspect walks React Fiber circular refs, 30s+ vs 18ms) — and `ps` showing 0% CPU is a lie, because node --test forks a child per file"
metadata: 
  node_type: memory
  type: project
  originSessionId: 9c3f63f8-6e8f-464e-bb82-6f223dc9e969
  modified: 2026-08-03T12:28:31.199Z
---

**When `npm run test:dom` (or any `node --test` run) appears to hang, or when a DOM test "fails" only as an opaque timeout with no assertion message.**

**First suspect: an assertion whose *actual* operand is a live DOM/React node.** `assert.equal(screen.queryByText('99'), null)` is fine while it passes; the moment it **legitimately fails**, Node builds the failure diff with `util.inspect`, which walks the node's object graph — React Fiber's circular `_debugOwner`/`return`/`child` pointers, `_debugStack` fields holding full `Error` objects, and jsdom's getter-heavy prototype chain. Measured 2026-08-02: **~33.9s and still not returning, versus ~18ms** for the same failure asserted as a boolean. The whole file then collapses to a single `'test failed'` and none of its individual `test()` blocks report.

The fix and the full convention are in `docs/architecture/testing-conventions.md` §"The DOM-assertion trap" — compare a derived primitive (`assert.equal(el === null, true)`). All 19 sites in the suite were converted in spec 055, so a *new* occurrence means someone wrote a new one.

**Second, and the reason this was misdiagnosed for weeks: `ps` CPU readings on the test runner are misleading.** `node --test` given multiple files **forks a subprocess per file**, so sampling the top-level coordinator PID shows **0% CPU** while the child is burning a core. OI-71 was recorded as "a genuine block, not a busy loop (0% CPU, stable RSS across three runs)" — that observation was real and it was an artifact of which PID was sampled. It pointed the investigation at deadlock/jsdom-API theories for weeks when the truth was a runaway computation. **To characterise CPU for a specific test, isolate it** — run the single file, or better a raw repro script, and sample *that* — never the multi-file coordinator.

**Why:** both halves fail the same way — they make an expensive-but-progressing computation look like a stuck one, and "it's hung" sends you hunting for a deadlock that doesn't exist. The spec for this work inherited the 0%-CPU framing as established fact; it was wrong.

**How to apply:** on any DOM-test hang, grep the suite for an `assert` call with a DOM query as an operand before theorising about jsdom, timers, or cleanup. If you need CPU evidence, isolate to one file first. And treat a "0% CPU" claim about a `node --test` run as unverified until you know which PID produced it.

Related: [[feedback_verify_at_the_source_layer]] — the `ps` output was a *representation* of the work, and it lied about which process was doing it.
