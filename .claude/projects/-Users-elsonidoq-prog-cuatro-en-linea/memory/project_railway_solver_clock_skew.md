---
name: project_railway_solver_clock_skew
description: "Railway builds fail when .depend file timestamp is ahead of builder clock; make skips linking silently, binary absent → all solver queries timeout"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4df31b00-24d6-4eaa-a70c-088e1e45610b
---

## Trap

Railway's builder clock can be skewed relative to `.depend` file timestamps. When `.depend` is
in the future, `make` prints "Clock skew detected. Your build may be incomplete." and silently
skips the linking step — no `c4solver` binary is produced, but the build exits 0. Result: every
solver query times out at 30 s with `[solver.query] TIMEOUT`.

## Required build command in `railpack.json`

```json
"cd solver-src && make -B SERVER_DIR=../server && test -f ../server/c4solver"
```
- `-B`: unconditionally rebuild, ignoring timestamps
- `test -f ../server/c4solver`: fails the build immediately if the binary is absent

## Guard to add in `c4solver-wrapper.js`

```js
if (!existsSync(BINARY_PATH)) throw new Error('Solver binary not found: ' + BINARY_PATH);
process.on('error', (err) => { /* reject all queued entries */ });
```
Without this, a missing binary produces a silent dead process and 30 s timeouts on every query.

## Verification

Before deploying: check Railway build logs for `make -B` output showing the link step completed.
After deploying: `ls -la server/c4solver` in the container should show a recent binary.
