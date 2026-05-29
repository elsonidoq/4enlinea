---
name: reference-coordinate-convention
description: Project-wide row/col coordinate convention — always 0-indexed internally; two encapsulated translation boundaries
metadata: 
  node_type: memory
  type: reference
  originSessionId: 5685e769-5e00-4ed9-98e2-ed5b1de7ea84
---

All internal coordinates are 0-indexed (row 0 = bottom, row 5 = top; col 0 = leftmost). Project-wide invariant documented in `CLAUDE.md § Row/column coordinate convention`.

Translation boundaries (only two):
- Frontend display — converts to 1-based for the user.
- c4solver — `c4solver-wrapper.js` translates internally; all callers pass 0-indexed.

Never use 1-indexed coordinates in server code, tests, or specs.
