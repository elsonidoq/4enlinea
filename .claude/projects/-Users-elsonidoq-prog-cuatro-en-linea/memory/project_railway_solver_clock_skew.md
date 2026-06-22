---
name: project_railway_solver_clock_skew
description: "Railway builds fail when .depend file timestamp is ahead of builder clock; make skips linking silently, binary absent → all solver queries timeout"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4df31b00-24d6-4eaa-a70c-088e1e45610b
---

## Problem

On 2026-06-21, deploy showed all `[solver.query] TIMEOUT after 30000ms` errors. Root cause:
`make` in `solver-src/` compiled `.o` files but the `.depend` file had a modification time
6s *in the future* relative to the Railway builder clock. `make` printed "Clock skew detected.
Your build may be incomplete." and skipped the linking step. No `c4solver` binary was produced,
but the build continued (no error exit code) → deployed a server with no solver binary.

The `c4solver-wrapper.js` had no `process.on('error')` handler for spawn failures, so a missing
binary produced silent dead process + 30s timeouts on every query.

## Fix (2026-06-21)

**`railpack.json`** — two changes to the build step:
```json
"cd solver-src && make -B SERVER_DIR=../server && test -f ../server/c4solver"
```
- `-B` flag: unconditionally rebuild regardless of timestamps
- `test -f ../server/c4solver`: fails the build immediately if linking didn't produce the binary

**`c4solver-wrapper.js`** — add spawn error handler and binary existence guard (recommended, not yet deployed):
```js
if (!existsSync(BINARY_PATH)) throw new Error('Solver binary not found: ' + BINARY_PATH);
process.on('error', (err) => { /* reject all queued entries */ });
```

## Verification

Before deploying: check Railway build logs for `make -B` output showing the link step completed.
After deploying: `ls -la server/c4solver` in the container should show a recent binary.
