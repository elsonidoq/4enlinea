# Feature Specification: DecodeC4 MVP

**Feature Branch**: `001-decodec4-mvp`
**Created**: 2026-04-30
**Status**: Draft
**Source docs**: `docs/mvp/mvp_product_spec.md`, `docs/product/end_game_product_specifications.md`

---

## Overview

DecodeC4 is a Connect Four training application whose core value proposition is
explaining *why* moves are good — not just *which* moves are good. The MVP answers
one question: will serious Connect Four players return repeatedly to a tool that
explains positions in human language grounded in solver truth?

The MVP ships three features: a Puzzle Trainer, a Commit-first Sparring mode, and
a Personal AI Coach (paid). All three share a single Explanation Engine that produces
consistent, pattern-grounded explanations across every surface.

**Compatibility note**: every architectural decision in this MVP must leave room for
the end-game product (Concept Micro-lessons, Papergames integration, Premium Analytics,
Advanced Training Paths, full post-game review). The MVP must not close off any of these
paths.

---

## Cross-cutting: Explanation Engine

The Explanation Engine is not a feature — it is the substrate shared by all features.
It operates in three layers and must ship with the first puzzle:

1. The solver produces exact scores for every legal column.
2. A rule-based pattern classifier tags what is structurally happening (double threat,
   fork, immediate block, zugzwang, parity control, etc.).
3. An AI composer generates a concise natural-language annotation grounded solely in
   classifier output — never speculating beyond what the classifier found.

**Output format**: one-line summary always visible; full **Deep Reveal** (pattern tags,
continuation lines, visual annotation) available on explicit user tap.

**Deep Reveal access**:
- Anonymous users: no Deep Reveals; one-line summaries only.
- Signed-in free users: 3 Deep Reveals per day, shared across puzzles and sparring,
  resetting at midnight UTC. Auto-reveals after a wrong answer never consume the quota.
- Paid users: unlimited Deep Reveals.

The Deep Reveal limit is the primary motivation for anonymous users to create an account.

---

## Pattern Categories

Six pattern categories, from foundational to advanced. Free/paid split is a single
configuration value — adjustable post-launch without code changes.

| # | Category | Availability |
|---|---|---|
| 1 | Immediate Threat | Free |
| 2 | Forced Block | Free |
| 3 | Double Threat | Free |
| 4 | Fork Setup (multi-move) | Paid |
| 5 | Zugzwang | Paid |
| 6 | Parity Control | Paid |

---

## Account Tiers

| Area | Anonymous | Signed-in (Free) | Paid |
|---|---|---|---|
| Puzzle Trainer | Categories 1–3 | Categories 1–3 | All 6 categories |
| Deep Reveals | None | 3 per day | Unlimited |
| Explanation summaries | One-line only | One-line only | Full on tap |
| Sparring | Full, all difficulties | Full + reveals | Full + unlimited reveals |
| Personal AI Coach | — | — | Persistent tracking + review queue |
| Session stats | In-session only | In-session only | + delta vs. last session |
| Cross-device sync | — | — | Included |

Pricing: $4.99/month · $39/year.

---

## User Scenarios & Testing

### User Story 1 — Puzzle Trainer Core Loop (Priority: P1)

A serious amateur lands on the training screen, picks a pattern category, and is
presented with a half-played Connect Four board and a goal prompt (e.g., "You are
red — find the immediate win" or "Block the double threat"). They click a column,
receive immediate feedback (correct / incorrect / tied), and can tap to see the full
explanation of why that move was or wasn't optimal.

**Why this priority**: This is the core learning loop. Without it, the product has no
value and no data. Every other feature depends on this loop being proven.

**Independent Test**: A user can open the app, navigate to any free-tier puzzle
category, attempt to solve a puzzle, receive feedback, and optionally view the full
explanation — all without creating an account.

**Acceptance Scenarios**:

1. **Given** an anonymous user on the training screen,
   **When** they attempt a puzzle and click the correct column on the first try,
   **Then** the board flashes green and a one-line explanation appears immediately;
   a "See why" button is visible but the Deep Reveal is not auto-expanded.

2. **Given** an anonymous user attempting a puzzle,
   **When** they click an incorrect column,
   **Then** the board shows a "not the best move — try again" message and the column
   is available to try again; no reveal is shown.

3. **Given** an anonymous user who has failed the same puzzle twice,
   **When** they fail a third time (or after 2 failed attempts per spec),
   **Then** the correct column is highlighted and the full explanation is shown without
   consuming any Deep Reveal quota.

4. **Given** an anonymous user who clicks "See why" on a one-line explanation,
   **Then** a sign-in gate appears explaining that Deep Reveals require an account.

5. **Given** a signed-in free user who has used all 3 daily Deep Reveals,
   **When** they tap "See why" on any puzzle,
   **Then** an upgrade prompt appears explaining the paid tier offers unlimited reveals.

6. **Given** a paid user solving a puzzle,
   **When** they tap "See why" after any move,
   **Then** the full Deep Reveal expands inline: pattern tag, continuation line, and
   visual board annotation — with no gate or quota message.

7. **Given** a free user browsing the puzzle category list,
   **When** they see categories 4–6 (Fork Setup, Zugzwang, Parity Control),
   **Then** those categories render as locked preview cards with an upgrade prompt; they
   are not hidden.

8. **Given** a paid user on a multi-move puzzle (Fork Setup or Parity Control),
   **When** they make their first move, the AI plays a cooperative response (legal and
   plausible but not blocking the pattern), and they make their second move,
   **Then** the goal predicate is evaluated after their final move, not after each move.

9. **Given** a user whose move is scored equally by the solver to the intended answer,
   **When** feedback is shown,
   **Then** the message reads "Also works — ties with col X in the engine's analysis"
   and the move is counted as correct for stats purposes.

---

### User Story 2 — Commit-first Sparring (Priority: P2)

A user plays a sparring game against the AI with the Commit-first toggle enabled.
All hints, scores, and heatmaps are hidden while they deliberate. After they click
a column (commit), a brief reveal shows the score of their move, the engine's best
move, and — if there was a meaningful difference — the pattern at play.

**Why this priority**: Commit-first converts existing sparring into implicit self-testing.
It generates the "aha" moment without requiring the user to go to the Puzzle Trainer
first. It is the lowest-effort path to demonstrating the Explanation Engine's value.

**Independent Test**: A user can enable the Commit-first toggle during any sparring
game, commit a move, and receive a post-move reveal comparing their move to the best
move — without completing a single puzzle first.

**Acceptance Scenarios**:

1. **Given** a user in a sparring game with Commit-first ON,
   **When** it is their turn to move,
   **Then** the board shows no hints, scores, column highlights, or heatmaps, regardless
   of any other settings that were active before the toggle was enabled.

2. **Given** a user who commits a move in Commit-first mode,
   **When** the reveal appears,
   **Then** it shows: (a) the score of the move played, (b) the engine's best move and
   its score, and (c) if there was a meaningful difference, the pattern label and a
   one-line explanation from the Explanation Engine.

3. **Given** a signed-in free user who has used 2 of their 3 daily Deep Reveals in
   the Puzzle Trainer,
   **When** they commit a move in Commit-first sparring that triggers a Deep Reveal,
   **Then** the reveal is shown and their daily quota drops to 0; the next Deep Reveal
   request (in puzzles or sparring) shows the upgrade gate.

4. **Given** a user in Commit-first mode who commits the engine's best move,
   **When** the reveal appears,
   **Then** it confirms the move was optimal and no upgrade gate is shown for the
   one-line summary, regardless of tier.

---

### User Story 3 — Personal AI Coach (Priority: P3, Paid Only)

A paid user navigates to their Personal AI Coach. They see a weakness map showing
their failure rate by pattern category. They work through their review queue —
positions they previously failed, presented as fresh puzzles with no indication they
were failures. Solving one removes it from the queue; failing again keeps it.

**Why this priority**: The Coach is the primary justification for the paid tier and the
feature that compounds in value over time. It requires puzzle data to be meaningful, so
it naturally comes after the Puzzle Trainer is validated.

**Independent Test**: A paid user who has failed at least one puzzle can open the
Coach, see their weakness map, and attempt a review puzzle — all without leaving the
Coach flow.

**Acceptance Scenarios**:

1. **Given** a paid user who has attempted at least 5 puzzles across categories,
   **When** they open the Personal AI Coach,
   **Then** they see a weakness map listing each category, the number of puzzles
   attempted, and the first-attempt failure rate per category — sorted by failure rate
   descending.

2. **Given** a paid user with items in their review queue,
   **When** they open the review queue,
   **Then** puzzles appear as fresh boards with no visual indication they were
   previously failed; the queue is served oldest-captured first.

3. **Given** a paid user in the review queue who solves a puzzle correctly,
   **When** feedback is shown,
   **Then** the position is removed from the queue and the next queued position loads.

4. **Given** a paid user in the review queue who fails a puzzle again,
   **When** feedback is shown (after 2 failed attempts, correct move is revealed),
   **Then** the position remains in the queue and moves to the back (oldest-unreviewed
   logic is preserved).

5. **Given** a paid user whose review queue is empty,
   **When** they open the Personal AI Coach,
   **Then** an empty-state message is shown ("No positions in queue — keep training to
   build your personal curriculum") and the weakness map is still visible.

---

### User Story 4 — Account & Paywall Gating (Priority: P4)

An anonymous user hits the sign-in gate when requesting a Deep Reveal. A signed-in
free user hits the payment gate when trying to access a paid pattern category or after
exhausting their daily Deep Reveals. Completing sign-up or payment immediately unlocks
the relevant tier without requiring a page reload.

**Why this priority**: The gates must work correctly for monetization, but they are not
the core learning experience. They gate the higher-priority stories.

**Independent Test**: An anonymous user can trigger the sign-in gate, create an account
in under 2 minutes, and immediately receive a Deep Reveal — all in a single flow.

**Acceptance Scenarios**:

1. **Given** an anonymous user who taps "See why" on a puzzle explanation,
   **When** the sign-in gate appears,
   **Then** it clearly states the benefit ("Create a free account to unlock 3 Deep
   Reveals per day") and offers sign-in and registration options.

2. **Given** a new user completing registration,
   **When** they submit valid credentials,
   **Then** their anonymous session state (puzzle progress, in-session stats) migrates
   to their new account with no data loss.

3. **Given** a signed-in free user who clicks a locked category (4–6),
   **When** the upgrade prompt appears,
   **Then** it shows the price ($4.99/mo · $39/yr) and a direct path to payment.

4. **Given** a user who completes payment,
   **When** the confirmation is received,
   **Then** paid-tier features (all 6 categories, unlimited Deep Reveals, Personal AI
   Coach) are available immediately in the same session.

---

### Edge Cases

- What happens if the solver takes longer than expected for a position?
  → A loading indicator appears within 200 ms; the board is non-interactive during solve.
- What happens if the AI explanation service is unavailable?
  → The one-line pattern tag from the classifier is shown alone; no generic fallback text.
- What happens if a user's daily Deep Reveal quota resets mid-session?
  → The new quota is reflected immediately on the next Deep Reveal request.
- What happens if an anonymous user's local state cannot be migrated on signup?
  → The signup completes but in-session stats are reset; the user is informed.
- What happens if a multi-move puzzle's cooperative AI makes a mistake?
  → The goal predicate is evaluated strictly; if the AI's response accidentally blocks
    the pattern, the puzzle is treated as a data error and skipped silently.

---

## Requirements

### Functional Requirements

**Puzzle Trainer**

- **FR-001**: The system MUST present each puzzle as a static board position with a
  visible goal prompt describing what the user must achieve.
- **FR-002**: The system MUST evaluate user moves against a goal predicate specific to
  the puzzle type, not solely by solver score.
- **FR-003**: The system MUST provide immediate feedback on each move attempt:
  correct (first attempt), incorrect (with retry), tied (alternative valid), or
  revealed (after 2 failed attempts).
- **FR-004**: Correct moves after 2 failed attempts MUST show the full explanation
  without consuming any Deep Reveal quota.
- **FR-005**: Multi-move puzzles MUST interleave user moves with cooperative AI
  responses; the goal predicate is evaluated only after the user's final move.
- **FR-006**: The system MUST display per-session accuracy by category at the top of
  the training screen.
- **FR-007**: Paid users MUST have persistent accuracy stats across sessions; free
  and anonymous users see in-session stats only.
- **FR-008**: Free users MUST see categories 4–6 as locked preview cards — not hidden,
  not broken — with a visible upgrade prompt.

**Explanation Engine**

- **FR-009**: All move explanations MUST be produced by the shared Explanation Engine
  (solver → classifier → AI annotation). No feature may generate explanations
  independently.
- **FR-010**: The AI annotation MUST be grounded solely in classifier output; it MUST
  NOT speculate beyond what the classifier found.
- **FR-011**: Every explanation MUST present a one-line summary by default; the full
  Deep Reveal is available only on explicit user tap.
- **FR-012**: Auto-reveals triggered after 2 failed puzzle attempts MUST NOT consume
  a user's daily Deep Reveal quota.
- **FR-013**: The Deep Reveal daily quota (3 for free users) MUST be shared across all
  product surfaces (puzzles and sparring) and MUST reset at midnight UTC.
- **FR-014**: Explanations for identical positions MUST be consistent across users and
  sessions (cached by position and move).

**Commit-first Sparring**

- **FR-015**: When Commit-first mode is enabled, ALL evaluative information (hints,
  scores, heatmaps, column highlights) MUST be hidden until the user commits a move.
- **FR-016**: After a committed move, the system MUST show: the score of the move
  played, the engine's best move and its score, and the Explanation Engine output if
  there was a meaningful score difference.
- **FR-017**: Deep Reveals in sparring MUST share the same quota as puzzle Deep Reveals.

**Personal AI Coach (Paid)**

- **FR-018**: Every puzzle failed on the first attempt MUST be silently captured:
  board state, move played, correct move, pattern category, timestamp.
- **FR-019**: The coach MUST surface a weakness map aggregating first-attempt failure
  rates by pattern category.
- **FR-020**: The review queue MUST present captured positions as fresh puzzles with no
  indication of prior failure.
- **FR-021**: The queue MUST be served oldest-captured first; solving correctly removes
  the entry; failing again keeps it in the queue.

**Account & Tier Gating**

- **FR-022**: All tier enforcement MUST be applied server-side; client-side gating is
  presentational only.
- **FR-023**: The free/paid category split MUST be a single configuration value, not
  hard-coded per feature.
- **FR-024**: On signup, anonymous session state (puzzle progress, in-session stats)
  MUST migrate to the new account.
- **FR-025**: Tier upgrades MUST take effect immediately in the active session.

**Analytics**

- **FR-026**: The system MUST record all user interactions in a structured event log.
  Events at launch: session_start, puzzle_attempted, puzzle_solved_correct,
  puzzle_solved_wrong, deep_reveal_viewed, signup_completed, paywall_viewed,
  upgrade_completed.
- **FR-027**: Analytics writes MUST be fire-and-forget and MUST NOT block any
  user-facing interaction.

### Key Entities

- **Puzzle**: a board position, goal prompt, goal predicate type, pattern category,
  and ordered set of expected moves (for multi-move puzzles). Hand-curated; 50 at
  launch.
- **PuzzleAttempt**: one user session on one puzzle. Records: puzzle ID, user/device,
  moves tried (in order), outcome (correct/failed/revealed), time taken,
  first-attempt result, timestamp.
- **Explanation**: cached output of the Explanation Engine for a given (position hash,
  move) pair. Contains: solver scores, pattern tag, one-line summary, full Deep Reveal
  text, visual annotation data.
- **DeepRevealQuota**: per-user daily counter. Tracks: user ID (or device UUID for
  anonymous), date, count consumed. Resets at midnight UTC.
- **BlunderEntry**: a PuzzleAttempt where first-attempt result was incorrect, stored in
  the Personal AI Coach's review queue. Contains: board state, move played, correct move,
  pattern category, capture timestamp, review status.
- **UserProfile**: device-bound UUID (anonymous) or authenticated account. Carries: tier,
  session stats, cross-device sync flag.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: 20% of users who attempt at least one puzzle return within 7 days
  (D7 retention ≥ 20%).
- **SC-002**: Users complete an average of at least 8 puzzles per session.
- **SC-003**: At least 40% of captured blunder positions are reviewed within 7 days of
  capture (blunder review rate ≥ 40%).
- **SC-004**: At least 2% of active free users convert to paid within 30 days of first
  use (free → paid conversion ≥ 2%).
- **SC-005**: The Explanation Engine returns a complete response (pattern tag + AI
  annotation) in under 2 seconds for any position encountered in normal gameplay.
- **SC-006**: The sign-up-to-first-Deep-Reveal flow completes in under 2 minutes.
- **SC-007**: The hallucination rate of the AI annotation (explanations that reference
  patterns not confirmed by the classifier) is below 2% across 100 positions × 5
  generations before launch.

---

## Assumptions

- The existing C++ solver binary and Node.js server wrapper are kept as-is; no
  significant changes to the solve layer are needed for the MVP.
- The 50 hand-curated puzzles will be authored and validated before development begins;
  the puzzle authoring tool (if needed) is out of scope for this spec.
- The sparring game engine (play against AI at multiple difficulty levels) already
  exists and works correctly; the MVP only adds the Commit-first toggle on top of it.
- Mobile-first layout is required; the app must be fully usable on a phone screen.
- English is the only language at launch; the i18n wiring is in scope but no
  translations are required for MVP.
- The cooperative AI behavior in multi-move puzzles (plays legal, plausible moves that
  deliberately avoid blocking the taught pattern) is pre-scripted per puzzle, not
  dynamically computed.
- Anonymous users persist state on the device they are using; there is no cross-device
  experience for anonymous users.
- The Papergames.io integration, Concept Micro-lessons, Post-game sparring review,
  Adaptive puzzle selection, and Premium Analytics are explicitly out of scope for this
  MVP and MUST NOT be designed in ways that block their later addition.
