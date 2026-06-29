---
name: project_reason_engine_case_classifier_trap
description: my_pseudocode.md's `bestScore*playedScore>0` first branch is a latent bug; win_to_slower_win must be both-POSITIVE
metadata:
  type: project
---

The blunder-reason case classifier (`connect-four/server/scripts/reason_audit/reasonEngine.mjs`)
classifies by the sign pair `(bestScore, playedScore)` where `bestScore = max(legal solver scores)`
and `playedScore = scores[playedCol]`, both **player (side-to-move) perspective**.

**Trap:** `docs/architecture/my_pseudocode.md`'s first branch is written `if bestScore*playedScore>0
→ win_to_slower_win (NotABlunder)`. That product is also positive when BOTH scores are **negative**,
so a literal implementation silently swallows every `lose_to_faster_lose` blunder (both<0) as
"not a blunder." The engine must gate `win_to_slower_win` on **`bestScore>0 && playedScore>0`**, not
the product. Confirmed empirically: the doc's own validated ltfl boards (`3333325662555225`,
`33343022442233255525004414106106605511`) misclassified as win_to_slower_win until fixed.

The companion `docs/architecture/blunder-reason-evidence.md` treats both-negative as in-scope, which
is the correct reading. See [[project_reason_field_unification]] (the ABANDONED predecessor — do not
use). Honest-limits (parity naming deferred, draw-save swindle = null completingCell, non-exhaustive
gate >10 empties, parity-register lines not rendered) live in `blunder-reason-evidence.md §10` — those
are intentional, NOT bugs.
