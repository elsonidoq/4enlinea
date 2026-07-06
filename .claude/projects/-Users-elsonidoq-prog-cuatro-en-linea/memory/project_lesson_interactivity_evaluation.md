---
name: project_lesson_interactivity_evaluation
description: How lesson interactivity is evaluated — Socratic is client-side; inline confirmationChallenges are NOT functional (check endpoint needs a DB puzzle row)
metadata:
  type: project
---

Two different evaluation paths for lesson interactivity, with a trap:

- **Socratic** (`SocraticScreen.jsx`): evaluated **purely client-side** — `col === lesson.socratic.correctCol`
  (`SocraticScreen.jsx:~78`). No server call, no solver, no predicate. So any curated `correctCol`
  works (including an empty-board `boardSpec` and deep positions), as long as it's correct.
- **Confirmation‑challenge drills** (`ChallengeScreen` `lessonMode`): evaluated **server-side** via
  `POST /api/puzzles/:id/check`, which **requires a real DB puzzle row** (it `SELECT`s the puzzle by
  `:id`, 404s otherwise, and computes scores from the DB `move_string`). `ChallengeScreen` generates
  `id: ch.puzzleId || 'inline-' + ch.moveString` for inline entries — but that `inline-…` id **404s**.
  **So self-contained/inline confirmationChallenges do NOT work.** A working drill needs either a
  seeded DB puzzle row or a new inline-evaluation server path.

Also: `evaluatePredicate` (`predicates.js`) is **category-keyed** with **no generic best/winning-move
predicate** — an unknown `goalPredicateType` falls through to `{ result: 'wrong' }`.

**Why:** discovered while scoping opening lessons (2026-07-04). It's why opening "find the move"
practice was delivered as one client-side Socratic per lesson and the server-evaluated drills were cut.

**How to apply:** for lesson "pick the column" interactions, prefer the Socratic (client-side
`correctCol`) unless you genuinely need multiple server-scored drills — those require DB puzzles or new
endpoint work. Convert KB movestrings to `boardSpec` with `boardToSpec(parseMovestring(ms))` (`src/lib/movestring.js`).
