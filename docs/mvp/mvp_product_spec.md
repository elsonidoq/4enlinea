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

The full output of the engine — pattern tags, continuation lines, and
visual annotation — is called a **Deep Reveal**.

**Deep Reveal access rules:**
- Anonymous users: no Deep Reveals. One-line summaries only.
- Signed-in free users: 3 Deep Reveals per day (shared across puzzles and
  sparring). Resets at midnight UTC.
- Paid users: unlimited Deep Reveals.

Deep Reveals are always **user-initiated** ("tap to see why"). Auto-
revealed text after a wrong answer or a correct move is always a one-liner
regardless of account tier. The cap is never consumed by auto-reveals.

The Deep Reveal limit is the primary motivation for anonymous users to
create an account.

---

## Pattern Categories

The MVP organizes puzzles into 6 categories, from foundational to advanced.
The free/paid split is a single configuration value — easy to adjust
post-launch based on conversion data.

**Free (no solver required — bitboard detection only):**

1. **Immediate Threat** — a move wins the game outright, or the opponent's
   next move wins if not blocked.
2. **Forced Block** — the opponent has an active immediate winning threat;
   any other move loses. Defensive mirror of Immediate Threat.
3. **Double Threat** — a single move creates two simultaneous winning
   threats that cannot both be blocked in one response.

**Paid (solver required — significance depends on board-wide analysis):**

4. **Fork Setup** — a multi-move sequence that constructs a double threat;
   AI plays cooperatively to allow the pattern to be built.
5. **Zugzwang** — a board state where any move by one player is
   disadvantageous; the solver confirms forced endgame control.
6. **Parity Control** — odd/even row dominance (encompasses Claimeven,
   Lowinverse, Highinverse from Allis's rules); the player who controls
   parity controls the endgame.

---

## Features

### 1. Puzzle Trainer

**What the user does:** lands on a mid-game board with a prompt ("you are
red — find the immediate win", "block the threat", "create a double threat
in two moves"). Clicks a column. Gets immediate feedback and an explanation
from the Explanation Engine.

**Content:** 50 hand-curated positions distributed across the 6 pattern
categories above (~8 puzzles per category). Hand-curation is intentional —
it ensures quality and forces understanding of what makes a good teaching
position. Puzzle count scales post-validation.

**Pattern tiering:** Free users access categories 1–3. Paid users access
all 6. Free users see a locked preview card for categories 4–6 with a soft
upgrade prompt.

**Goal predicate:** Puzzles are not "find the highest solver score." Each
puzzle has a goal predicate that defines what constitutes a correct
solution:
- Immediate Threat: the move scores as a forced win by the solver.
- Forced Block: the move eliminates the opponent's immediate win; a non-
  blocking move is rejected even if it has the same solver score elsewhere.
- Double Threat: after the move, ≥2 distinct winning threats exist for the
  user simultaneously.
- Fork Setup: after the full multi-move sequence, a double threat is
  established on the final board state.
- Zugzwang: the move preserves zugzwang control, confirmed by solver.
- Parity Control: the move maintains or gains parity advantage, confirmed
  by solver.

Evaluation combines solver score + pattern classifier output, not score
alone.

**Multi-move puzzles (Fork Setup, Parity Control):** the experience mirrors
a real game — user plays, AI responds, user plays again. The AI plays
cooperatively: moves are game-legal and plausible but deliberately avoid
blocking the pattern the puzzle is teaching. The goal predicate is
evaluated after the final user move in the sequence.

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

### 2. Personal AI Coach (Paid)

**What it is:** a persistent system that tracks where *this specific user*
consistently fails, identifies recurring weakness patterns by category,
and surfaces targeted review drills.

**Auto-capture:** every puzzle the user fails on the first attempt is
silently logged: board state, move played, correct move, pattern missed,
date.

**Pattern diagnosis:** the coach aggregates failures by category and
surfaces the user's weakest areas — e.g., "Fork Setup: missed 5 of 8 —
your weakest pattern." This is personal data, not a comparison to
averages.

**Review queue:** captured positions are re-presented as fresh puzzles —
no indication they were previously failed. Solving correctly removes the
entry; failing again keeps it. Served oldest-unreviewed first.

**Why it matters:** the coach becomes a personal curriculum that compounds
in value the longer the user trains. No two users get the same experience
— it reflects exactly where *that* user breaks down, not the average
player. This is the core justification for the paid tier.

**No spaced-repetition scheduler at launch.** The queue is always
available, served oldest-unreviewed first. SR scheduling is a Phase 2
feature, gated on blunder review rate ≥ 40%.

**What is NOT in MVP:** prescriptive drill programs, statistical
benchmarking vs. average users, opening habit tracking, win-rate
analytics. These require accumulated data and are Phase 2.

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

**Deep Reveals in sparring:** the post-move reveal is a Deep Reveal —
pattern tag, score comparison, and continuation line. Free users receive
3 Deep Reveals per day shared across puzzles and sparring. Paid users
receive unlimited Deep Reveals.

**What is NOT in MVP:** post-game review timeline, blunder capture from
sparring games. These are Phase 2 once the puzzle loop is validated.

---

## Account Tiers

Three tiers, two gates: sign-in (unlocks Deep Reveals) and payment
(unlocks advanced patterns + Personal AI Coach).

| Area | Anonymous | Signed-in (Free) | Paid ($4.99/mo · $39/yr) |
|---|---|---|---|
| Puzzle trainer | Categories 1–3 (free patterns) | Categories 1–3 | All 6 categories |
| Deep Reveals | None | 3 per day | Unlimited |
| Explanation Engine | One-line summary | One-line summary | Full on tap |
| Sparring | Full, all difficulty levels | Full + reveals | Full + unlimited reveals |
| Personal AI Coach | — | — | Persistent tracking + review queue |
| Session stats | In-session only | In-session only | + delta vs. last session |
| Cross-device sync | — | — | Included |

The first gate (sign-in) is hit when a user wants a Deep Reveal. The
second gate (payment) is hit when they want to train advanced patterns or
access their Personal AI Coach history across sessions.

---

## What is deliberately excluded from MVP

| Cut feature | Reason | Phase 2 gate |
|---|---|---|
| Concept micro-lessons | The Engine explanation after each puzzle is the lesson. Build lessons once blunder data reveals which 2-3 patterns users consistently fail. | Blunder log data |
| Post-game sparring review | Validate puzzle retention first. | D30 retention ≥ 10% |
| Papergames.io integration | Their API does not expose game history. No move sequences = can't run solver = can't find blunders. Blocked on data access. | Partnership or browser extension |
| Adaptive puzzle selection | Need data before adapting. Collect it in MVP. | Blunder review rate data |
| SR scheduling | Validate that users return to the queue before investing in scheduling logic. | Blunder review rate ≥ 40% |
| Progress dashboards | Session accuracy count is enough signal at launch. | Post D30 validation |
| Premium Analytics | Win rate by opening, error trends, tactical accuracy score, rating progression — need data to make meaningful. | 3+ months of coach data |
| Advanced Training Paths | Curated programs (e.g., "Anti-fork mastery") require pattern failure data to prescribe correctly. | Personal AI Coach data at scale |
| Benchmarking vs. average users | Requires a user base to compare against. | Post D30, 500+ active users |

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

- **Frontend:** React PWA, mobile-first, rebuilt with proper routing and
  component architecture. i18n wired from day 1 (`react-i18next`); English
  at launch, Spanish post-launch.
- **Solver:** Pascal Pons `c4solver` via Node.js server (already built,
  keep as-is).
- **Explanation Engine:** rule-based pattern classifier + Claude Sonnet.
  Prompt caching by `(position_hash, move)` — explanations are shared
  across users, computed once.
- **State management:** storage-agnostic abstraction layer. Anonymous
  users: IndexedDB with a device-bound UUID profile. On signup, local state
  migrates to the backend and the anonymous profile is superseded. All app
  components are unaware of which backend is in use.
- **Persistence:** IndexedDB (anonymous/free). Postgres + Supabase Auth
  (signed-in users).
- **Backend:** Node.js service deployed on Railway (serves static frontend
  + API). Supabase for DB + auth. Cloudflare for DNS + DDoS protection.
- **Payments:** Stripe ($4.99/mo, $39/yr).
- **Analytics:** `tracks` table (uid, user_id, path, event_data JSON,
  created_at). uid is a device hash — always present regardless of auth
  state. user_id is the Supabase user ID when signed in. Designed to
  capture all interactions; initially instruments only the events needed to
  compute launch KPIs (session_start, puzzle_attempted,
  puzzle_solved_correct, puzzle_solved_wrong, deep_reveal_viewed,
  signup_completed, paywall_viewed, upgrade_completed).

---

## Timeline (one engineer + Claude Code)

| Weeks | Deliverable |
|---|---|
| 1-2 | Puzzle infrastructure + 50 curated positions + session UI |
| 3-4 | Explanation Engine (pattern classifier + LLM integration + caching) |
| 5-6 | Personal AI Coach + Supabase auth + Stripe paywall + commit-first toggle |
| 7 | End-to-end QA, mobile polish |
| 8 | Soft launch — Papergames.io community, Reddit r/connectfour |

---

## Primary risk

The Explanation Engine is the product. If the pattern classifier
mislabels positions, or the LLM prose feels generic, users won't feel the
"aha" moment that drives retention. Budget extra iteration time on the
classifier before launch. The hallucination acceptance threshold is < 2%
error rate across 100 positions × 5 generations before shipping.
