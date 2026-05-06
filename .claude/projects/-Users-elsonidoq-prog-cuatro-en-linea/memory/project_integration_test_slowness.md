---
name: Integration test slowness / apparent hang
description: candidate-generator.test.js takes many minutes or appears to hang; root cause unknown; worth investigating
type: project
---

`connect-four/tests/integration/candidate-generator.test.js` runs the real c4solver binary and generates actual puzzle candidates. In practice it takes **many minutes** per test call (observed: still only 1 line of output after 10+ minutes for a single `generateCandidates(1, 5, 99)` call).

**Why:** The test invokes `generateCandidates` which runs up to 400 rollout attempts, each doing up to ~34 sequential solver queries via IPC (stdin/stdout). With a persistent solver process per run, this is thousands of round-trips. The c4solver processes show 0.0% CPU while waiting, suggesting they are idle (waiting for Node input) rather than computing — which implies the Node side may be blocking somewhere before issuing the next query.

**Symptoms observed:**
- Multiple background test processes all show 0.0% CPU and very low wall-clock CPU time
- Output file stays at 1 line ("generateCandidates called …") for 10+ minutes
- Tests have 60s/120s timeouts but may never actually fail visibly — the async operation keeps running after timeout

**How to apply:** When the integration tests appear stuck, do not assume code correctness. Investigate whether:
1. The solver process is actually receiving queries (add a log before `process.stdin.write`)
2. A terminal position (won board) sent to the solver causes it to not emit output (hanging the queue)
3. Multiple concurrent test processes are competing for resources
4. The `pending` Promise chain in `c4solver-wrapper.js` is deadlocked

The classifier tests (`tests/classifier/classifier.test.js`) are fast and reliable — 22/22 pass in ~56ms. Use those for quick regression checks.
