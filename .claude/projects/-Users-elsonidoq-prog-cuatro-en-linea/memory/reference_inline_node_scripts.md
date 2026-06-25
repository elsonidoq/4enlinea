---
name: reference_inline_node_scripts
description: "How to run one-off Node.js scripts against server code (solver, classifier, etc.) without path/import failures"
metadata: 
  node_type: memory
  type: reference
  originSessionId: ca8663ad-69f8-477d-b5b5-bb00ae8d5a58
---

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

**Problem 4 — `solver.query()` is async; you MUST `await` it**
`solver.query(moveString)` returns a **Promise** that resolves to the 7-element per-column score array — it does NOT return the array directly. Forgetting `await` gives you the Promise object, which serializes to `{}` in JSON (a silent failure that passes any "is it set?" check). Always `await solver.query(...)`. The query also takes a **0-indexed** movestring (the wrapper converts to 1-indexed internally) and **rejects** terminal/won positions with `Error: Invalid position` — guard each call in its own try/catch if appending moves that may complete a line.
