---
name: project_explain_simulate
description: explainSimulate feature — forward-looking pattern aggregation for the coach LLM; implementation status and key design contracts
metadata:
  type: project
---

`explainSimulate(movestring, numPlies, anchorCell, perspective, solver)` is implemented in `connect-four/server/explainSimulate.js` (exported). CLI at `connect-four/server/scripts/explain_simulate.mjs`, shell wrapper `explain_simulate.sh` at project root.

**Contract**:
- `movestring` already includes the candidate move (caller appends col before calling)
- `anchorCell = { col, row: new Board(movesBeforePlay).colHeights[col] }`
- `perspective` (1=Red, 2=Yellow): only leaves where `currentPlayer === perspective` contribute to `frequency`; all leaves count toward `total`
- Returns `{ totalLeaves, anchorCell, perspective, patterns }` where `patterns` has all 11 detector names. `claimeven` is always `frequency: 0` (excluded — ~20 solver calls/leaf)

**numPlies / perspective parity rule** (load-bearing):
`explainSimulate` receives the post-move string. For the perspective player's patterns to appear at leaves, numPlies must be **odd** in all cases:
- User is Red (post-move string length odd): odd + odd = even → Red's turn at leaf ✓
- User is Yellow (post-move string length even): even + odd = odd → Yellow's turn at leaf ✓

CLI auto perspective = `(movestring.length + numPlies) % 2 === 0 ? 1 : 2` (player to move at leaves).

**Pattern types in output**:
- Coordinate (cellHistogram): `z_threat`, `undercut`, `overcut`, `figure_7`, `j_shape`
- Directional (colHistogram): `immediate_threat`, `double_threat`, `forced_block`, `forced_win`, `forbidden_columns`
- Boolean (neither): `claimeven`

**Cost** (claimeven excluded): numPlies=3 (rounds=1) ~40 solver calls; numPlies=5 ~120 solver calls.

Integration tests: `connect-four/tests/integration/explain_simulate.test.js` (12 tests, all passing, uses real solver binary).

**Why**: feeds the coach LLM context: "this move sets up figure_7 in 7/9 optimal continuations."

[[project_llm_explain_poc]]
[[reference_c4solver_behavior]]
