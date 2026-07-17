---
name: reference_inline_node_scripts
description: "How to run one-off Node.js scripts against server code (solver, classifier, etc.) without path/import failures"
metadata: 
  node_type: memory
  type: reference
  originSessionId: ca8663ad-69f8-477d-b5b5-bb00ae8d5a58
---

## FIRST: to inspect a reason vector, don't hand-roll — use the TOOLS CLI
Before writing any scratch script to see what `computeReason` produces for a board, use
`connect-four/server/scripts/reason_engine/TOOLS/compute_feature_vector.mjs <movestring> <playedCol>`
(0-indexed; `--narrator` for the pruned view; `--help`). It prints the full vector + `matchOpeningPrefix`.
Path traps if you DO write inline (both bit repeatedly): `createSolverProcess` lives at
`connect-four/server/c4solver-wrapper.js` (NOT `server/scripts/`); the narrator pruner is
`server/scripts/reasonNarratorVector.mjs` (NOT `reason_engine/lib/`); `computeReason(ms, playedCol, { solver })`
takes the solver as a 3rd-arg object. See [[project_reason_render_layer]].

## Running inline Node.js scripts against server modules

**Problem 1 — `node --input-type=module <<'EOF'` with relative imports fails**
Relative imports like `'./server/classifier.js'` resolve against the CWD when stdin is used, but the shell context may not be the project root. The script also runs as an anonymous module with no `__filename`, so relative resolution is unreliable.

**Fix:** Write the script to a temp file with **absolute paths** in every import, then run it:
```js
// use /absolute/path/to/server/classifier.js in import statements
import { tagBlunder } from '/Users/elsonidoq/prog/cuatro_en_linea/connect-four/server/classifier.js';
```
Write to scratchpad, run with `node /path/to/scratchpad/script.mjs`.

**Problem 2 — wrong export name from `c4solver-wrapper.js`**
The export is `createSolverProcess` (not `createSolver`, not `c4solver`).
```js
import { createSolverProcess } from '/Users/.../connect-four/server/c4solver-wrapper.js';
const solver = createSolverProcess();
// ...
solver.close?.();
```

**Problem 3 — solver process hangs on exit**
The solver subprocess does not terminate automatically when the script ends. Wrap in try/finally and call `solver.close?.()`. The script may exit with code 143 (SIGTERM) even after producing output — that's normal; check stdout for results.

**Problem 5 — solver-backed scripts in a shell `for` loop yield EMPTY stdout**
Running a solver-backed CLI (e.g. `reasonEngine.mjs`) back-to-back inside a single bash `for … do … done`
loop reproducibly produces empty output (downstream `JSON.parse` → "Unexpected end of JSON input"),
even though the *identical* command run standalone writes full output (verified: `wc -c` = 5052 bytes
standalone vs 0 in-loop, on the very first iteration). Root cause unconfirmed (likely
`createSolverProcess` child-process spawn/IPC colliding across rapid same-shell invocations). **Fix:**
run each invocation as its own separate command/tool-call (or a separate `node` process per board), not
a shell loop; redirect stdout to a file (`1>out.json 2>/dev/null`) and read the file — do NOT pipe the
CLI straight into another `node -e` (the pipe also races empty). Don't burn turns debugging the parse
error — it's the loop, not your script.

**Problem 4 — `solver.query()` is async; you MUST `await` it**
`solver.query(moveString)` returns a **Promise** that resolves to the 7-element per-column score array — it does NOT return the array directly. Forgetting `await` gives you the Promise object, which serializes to `{}` in JSON (a silent failure that passes any "is it set?" check). Always `await solver.query(...)`. The query also takes a **0-indexed** movestring (the wrapper converts to 1-indexed internally) and **rejects** terminal/won positions with `Error: Invalid position` — guard each call in its own try/catch if appending moves that may complete a line.
