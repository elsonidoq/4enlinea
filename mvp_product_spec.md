# MVP Product Spec — DecodeC4

## The one question this MVP answers

Will serious Connect 4 players return repeatedly to a tool that explains
*why* moves are good — not just *which* moves are good?

Everything in this spec exists to answer that question. Everything else is
Phase 2.

---

## Core hypothesis

A serious amateur who experiences a position they failed, explained in
human language grounded in solver truth, will (a) feel genuine improvement
in pattern recognition and (b) attribute that improvement to the product.
That attribution is what drives retention and conversion.

---

## Cross-cutting: Explanation Engine

All features that expose a move or position share a single explanation
engine. It operates in three layers:

1. The solver produces exact scores for every legal column.
2. A rule-based pattern classifier tags what is structurally happening
   (double threat, fork, immediate block, zugzwang, etc.).
3. An LLM composes a concise natural-language annotation grounded in
   those tags — never speculating beyond what the classifier found.

Output format: one-line summary by default, full explanation on tap.
Example: *"Optimal move. Builds a diagonal fork between col 3 and col 4,
forcing a double threat the opponent cannot answer in one move."*

This engine is not a standalone feature. It is the substrate that makes
puzzles and sparring review speak the same language and deliver the "aha"
moment that drives retention. It must ship with the first puzzle — a
puzzle trainer without explanations is just another solver.

---

## Features

### 1. Puzzle Trainer

**What the user does:** lands on a mid-game board with a prompt ("find the
best move", "you are red — avoid the double threat", "create a fork in two
moves"). Clicks a column. Gets immediate feedback and an explanation from
the Explanation Engine.

**Content:** 50 hand-curated positions across 4-5 pattern categories:
immediate threat, block, double threat, fork setup, zugzwang. Hand-
curation is intentional — it ensures quality and forces understanding of
what makes a good teaching position. Puzzle count scales post-validation.

**Feedback flow:**
- Correct on first attempt → green flash + one-line explanation. Full
  explanation on tap.
- Wrong attempt → "not the best move, try again". After 2 failed attempts,
  reveal the correct move with full explanation.
- Tied move (solver scores it equally) → "also works — ties with col X in
  the engine's analysis".

**Stats:** per-session accuracy by category, visible at the top of the
training screen. Persistent across sessions for paid users.

---

### 2. Blunder Log

**What it is:** a persistent, automatically-maintained queue of positions
where the user failed on first attempt.

**Auto-capture:** every puzzle the user gets wrong on the first try is
silently added to the log with: board state, move played, correct move,
pattern missed, date.

**Review flow:** the user opens the queue and is presented with each
captured position as a fresh puzzle — no indication it was previously
failed. Solving it correctly removes it from the queue. Getting it wrong
again keeps it in.

**Why it matters:** the log is a personal curriculum that reflects exactly
where *that* user fails, not where the average player fails. It compounds
in value the longer the user trains. It is also the paywall trigger — see
Free vs. Paid below.

**No spaced-repetition scheduler at launch.** The queue is always
available, served oldest-unreviewed first. SR scheduling is a Phase 2
feature, gated on the blunder review rate metric.

---

### 3. Sparring with Commit-first Mode

**What already exists:** play against the AI at varying difficulty (easy,
medium, hard, perfect), with optional hint suggestions.

**New in MVP — Commit-first toggle:** when enabled, all hints, scores, and
heatmaps are hidden until the user commits a move. After committing, a
brief reveal shows:
- The score of the move played.
- The engine's best move and its score.
- The pattern at play (from the Explanation Engine), if there was a
  meaningful difference.

This converts normal sparring into implicit self-testing without changing
the game flow. Hints-on mode remains available for users who want it.

**What is NOT in MVP:** post-game review timeline, blunder capture from
sparring games. These are Phase 2 once the puzzle loop is validated.

---

## Free vs. Paid Tier

The paywall is encountered at peak motivation: after the user has failed
enough puzzles to have a meaningful blunder queue, they close the tab —
and the queue disappears unless they create an account.

| | Free | Paid ($4.99/mo · $39/yr) |
|---|---|---|
| Puzzle trainer | All 50 puzzles | Full library as it grows |
| Explanation Engine | One-line summary only | Full explanation on tap |
| Blunder log | In-session only, lost on close | Persistent + review queue |
| Session stats | In-session accuracy | + delta vs. last session |
| Cross-device sync | — | Included |

---

## What is deliberately excluded from MVP

| Cut feature | Reason | Phase 2 gate |
|---|---|---|
| Concept micro-lessons | The X-AI explanation after each puzzle is the lesson. Build lessons once blunder data reveals which 2-3 patterns users consistently fail. | Blunder log data |
| Post-game sparring review | Validate puzzle retention first. | D30 retention ≥ 10% |
| Papergames.io integration | Their API does not expose game history. No move sequences = can't run solver = can't find blunders. Blocked on data access. | Partnership or browser extension |
| Adaptive puzzle selection | Need data before adapting. Collect it in MVP. | Blunder review rate data |
| SR scheduling | Validate that users return to the queue before investing in scheduling logic. | Blunder review rate ≥ 40% |
| Progress dashboards | Session accuracy count is enough signal at launch. | Post D30 validation |

---

## Success metrics

| Metric | Target | What it tells you |
|---|---|---|
| D7 retention | ≥ 20% | Users find a reason to return |
| Puzzles per session | ≥ 8 | Users are engaged, not just sampling |
| Blunder review rate | ≥ 40% within 7 days of capture | Queue is sticky enough to justify SR scheduler |
| Free → paid conversion at 30 days | ≥ 2% | Paywall moment works |

**Phase 2 gates:**
- Build SR scheduler only if blunder review rate ≥ 40%.
- Build post-game sparring review only if D30 retention ≥ 10%.
- Build papergames integration only if a data access path is confirmed
  (partnership, browser extension, or manual input with sufficient adoption).

---

## Technical stack

- **Frontend:** React PWA, mobile-first (existing codebase).
- **Solver:** Pascal Pons `c4solver` via Node.js server (already built).
- **Explanation Engine:** rule-based pattern classifier + Claude Sonnet.
  Prompt caching by `(position_hash, move)` — explanations are shared
  across users, computed once.
- **Persistence:** IndexedDB local-first (free tier). Postgres + Supabase
  Auth for paid tier.
- **Payments:** Stripe ($4.99/mo, $39/yr).

---

## Timeline (one engineer + Claude Code)

| Weeks | Deliverable |
|---|---|
| 1-2 | Puzzle infrastructure + 50 curated positions + session UI |
| 3-4 | Explanation Engine (pattern classifier + LLM integration + caching) |
| 5-6 | Blunder log + Supabase auth + Stripe paywall + commit-first toggle |
| 7 | End-to-end QA, mobile polish |
| 8 | Soft launch — Papergames.io community, Reddit r/connectfour |

---

## Primary risk

The Explanation Engine is the product. If the pattern classifier
mislabels positions, or the LLM prose feels generic, users won't feel the
"aha" moment that drives retention. Budget extra iteration time on the
classifier before launch. The hallucination acceptance threshold is < 2%
error rate across 100 positions × 5 generations before shipping.
