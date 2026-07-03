---
name: integration-test-slowness-apparent-hang
description: candidate-generator.test.js hangs; ALSO test:fast deadlocks when run concurrently with any other solver process (harvest / dev server)
metadata: 
  node_type: memory
  type: project
  originSessionId: 4621a462-669f-4601-9459-1ef3ed718c2a
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

## Concurrency deadlock — `test:fast` itself hangs next to another solver process (2026-07-03)

`npm run test:fast` is normally reliable (~32s, 785–795 passing) — but it **deadlocks on solver IPC when a second solver-heavy process runs concurrently**, starving CPU. Observed: a `select_boards --strategy coverage` harvest (its own c4solver) plus the always-on dev server (`server/index.js` + its c4solver) running at the same time as `test:fast` → `test:fast` hung **35+ minutes** on `tests/integration/puzzles-reindex.test.js` (child node at 0% CPU = blocked on IPC, not computing). Root-caused via scientific-method-debugging: **`puzzles-reindex.test.js` passes 9/9 in 142ms when run ALONE** — it is purely a contention deadlock, not a code bug and not a Phase-4 regression.

**How to prevent:**
- **Never run `test:fast` concurrently with a solver harvest** (or any solver-heavy node job). Run solver-heavy work serially; if a harvest is running in the background, wait for it before `test:fast`.
- Prefer **solver-free tests**: a coverage/acceptance test that calls `computeReason`/the solver inside `test:fast` reinherits this fragility. Materialize evidence once via `compute.mjs` and have the test read the stored `evidence` (as `renderCoverageCorpus.test.mjs` and `renderCoverageUniverse.test.mjs` do) — no in-test solver call.
- When a `test:fast` run appears hung for minutes, check `ps` for other `node .../c4solver` / harvest / dev-server processes before suspecting the test code; kill the contending job and re-run alone.

See [[project_coverage_sampler_rarefill_trap]] for the companion "stuck harvest" gotcha from the same incident.
