---
name: project_missed_own_capitalize_principle
description: "Established double_threat/figure_7/immediate_threat survive any wrong move — so missed_own means correctCol BUILDS the pattern, never 'you had it and lost it'"
metadata:
  node_type: memory
  type: project
  originSessionId: 7fd2a311-1293-418a-9868-4381d2dfeb33
---

A tactical invariant the user had to teach across three sessions (`4feadfa9`, `7fd2a311`, `c3b1508a`); it is the *reason* `missed_own` was redefined and it is not derivable from the classifier code.

**You cannot destroy an already-built `double_threat`, `figure_7`, or `immediate_threat` by playing the wrong column.** With an immediate threat you either complete the four or you don't — a wrong move does not remove the threat. With a double_threat / figure_7 the fork is still on the board after a bad move. The *only* way one of these is actually lost is **undercut**, which is column- and row-specific: the opponent must have a major threat in the *same* column at a row ≤ the lowest row the fork needs (`7fd2a311` L119/124). Do not assume a generic wrong move "killed" a fork — check undercut per column/row.

**Therefore `missed_own(X)` is NOT "had X, then lost it."** Because if you already held X, a wrong move wouldn't lose it — so that framing can never describe a real blunder. The correct meaning is: **correctCol *builds* X this move; playedCol doesn't** ("if you had placed a disc in the correct column you would have built X, but playing it wrong gave the opponent the chance to block it"). For already-present, indestructible threats the blunder is instead **failure to capitalize immediately** — cashing the win before the opponent gets a turn to win first or undercut.

**Why this stays in memory:** an agent adding a new pattern, writing a blunder narrative, or reasoning about a `missed_own` case will default to "the wrong move destroyed the pattern" and mistag/misnarrate it. See `docs/architecture/server-conventions.md` §`tagBlunder` (the resulting cascade) and `docs/knowledge-base/` (per-pattern `formal_predicate`) (undercut predicate).
