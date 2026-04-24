# MVP Proposal v2: DecodeC4 — Honest Minimum

This document is a trimmed revision of `mvp_proposal.md`. It applies
one filter: keep only what is necessary to test the core hypothesis.
Everything cut is explicitly moved to Phase 2.

---

## 1. Executive Summary

- **Vision Statement:** Become the "DecodeChess for Connect 4" — a
  pedagogical mastery platform that teaches serious amateurs *why*
  moves are good, not just *which* moves are good.
- **The "Why Now":** Connect 4 is mathematically solved, yet every
  existing tool shows the *what* (column scores) and none teaches the
  *why* (strategic motifs, trap patterns, zugzwang). Modern LLMs, for
  the first time, can translate perfect engine evaluations into
  natural-language strategic reasoning at near-zero marginal cost —
  collapsing the Comprehension Gap that has defined the category for a
  decade.

---

## 2. Problem Statement

*(Unchanged from v1.)*

- **Core Pain Point:** Competitive amateurs plateau because they can
  *see* that a move is better but cannot *internalize* why. Current
  tools evaluate; none teach.
- **Zero competitors offer a curated mid-game puzzle library** — an
  unclaimed gap explicitly called out in market research.

---

## 3. Product Hypothesis

If we provide serious-amateur Connect 4 players with (a) a curated
mid-game tactics trainer and (b) AI-generated strategic explanations
grounded in solver truth, they will return for repeated sessions and
convert from free to paid at above-benchmark rates (≥ 2%) — because
they will feel measurable improvement in pattern recognition within
their first month.

The blunder log is the conversion mechanism: it turns their own puzzle
failures into a personalized curriculum that requires identity (i.e.,
an account) to persist, creating a natural paywall at the moment of
highest motivation.

**What this hypothesis does NOT require to be tested:**
- Game import from external platforms.
- More than 50 puzzles at launch.
- A full spaced-repetition scheduler.
- Pattern accuracy trends or graduation badges.

---

## 4. Core Feature Set (Honest Minimum)

Three features. Each is necessary; none is sufficient alone.

- **Feature 1 — Mid-game Tactics Trainer (50 hand-curated puzzles).**
  Library of positions categorized by pattern (Mate-in-N, Fork Setup,
  Double Threat, Zugzwang). The user lands on a mid-game board, must
  find the correct continuation, and plays it through against the
  engine's forced responses. 50 puzzles is enough to deliver value to
  free users and surface pattern weaknesses. *Puzzle count scales
  post-validation, not pre-launch.*

- **Feature 2 — Explainable Move Analysis (X-AI annotations).**
  Every puzzle solution and every blunder-log review receives a
  pattern-tagged, natural-language annotation: *"Jugada óptima.
  Construye un fork con la diagonal de col 3 y la vertical de col 4."*
  Grounded in solver evaluation + rule-based pattern classifier + LLM
  composition. Progressive disclosure: one-line summary by default,
  full explanation on tap. Scoped strictly to post-solve and post-
  review paths — no real-time in-game annotation. *Benefit:* closes
  the Comprehension Gap.

- **Feature 3 — Personal Blunder Log (simple queue, no scheduler).**
  Every puzzle a user fails (wrong move on first attempt) is auto-
  captured with the position, the move played, the best move, the
  pattern missed, and the date. Surfaced as a simple review queue —
  oldest unreviewed blunder first. No spaced-repetition scheduling at
  launch; the queue is always available, not date-gated. Requires an
  account (paid) to persist across sessions. *Benefit:* transforms
  puzzle failures into a personal curriculum. This is the retention
  engine and the paywall mechanism.

  *SR scheduling (1d/3d/7d/21d intervals) moves to Phase 2. It is a
  retention optimization, not a hypothesis test. Validate that users
  return to review blunders before investing in scheduling logic.*

**Session snapshot (lightweight, both tiers).** After every session
a one-screen summary shows puzzles attempted, first-try accuracy, and
patterns practiced. Free tier: in-session stats only. Paid tier: adds
accuracy delta vs. last session. This is not a standalone feature —
it is a single aggregate view of the event log, implemented in an
afternoon. It prevents the churn scenario where a user sees no
progress signal and concludes the product doesn't work.

**Deliberately excluded from MVP:**
- Game import from Papergames / Ludoteka. *(Phase 2 — complex,
  growth-oriented, not needed to test the core loop.)*
- 200+ puzzle library. *(Phase 2 — build the pipeline once you know
  which pattern categories resonate.)*
- Full SR scheduler. *(Phase 2 — add after validating blunder review
  rate.)*
- Pattern accuracy trends and graduation badges. *(Phase 2 — add
  after validating retention.)*
- Online multiplayer, ELO ladders, AR scanner, neural-network
  visualizer, Socratic hint mode.

---

## 4b. Free vs. Paid Tier

The conversion trigger is the blunder log: it requires identity across
sessions, personalizes to *your* failure history, and compounds in
value the longer you use it. A user who has logged 10 blunders has
a personal drill set competitors cannot replicate for them.

| | Free | Paid ($4.99/mo · $39/yr) |
|---|---|---|
| Tactics puzzles | 50 puzzles, fixed rotation | Full library (grows post-launch), all pattern categories |
| Post-puzzle X-AI annotation | Generic (pattern name + one-line) | Personalized (references user's blunder history) |
| Blunder log | In-session only, lost on close | Persistent across sessions + simple review queue |
| Session snapshot | ✓ in-session accuracy | ✓ + delta vs. last session |
| Cross-device sync | — | Included |

**Why this split works:**

- *Free tier is genuinely useful.* 50 puzzles with solver-grounded
  annotations is already better than every competitor. Users arrive
  sceptical and leave convinced the core product works.
- *The paywall is encountered at peak motivation.* After solving
  puzzle 50, the user is told which patterns they missed and shown
  a blunder queue — but it will vanish when they close the tab unless
  they create an account. That is the moment to convert.
- *Paid value compounds without import.* Personalized annotations
  require knowing the user's blunder history. That data exists only
  for paid users who return. The longer they pay, the more tailored
  the experience — creating switching cost without artificial lock-in.

---

## 5. Target Audience & User Persona

*(Unchanged from v1.)*

**Primary User:** The Serious Amateur. Plays Connect 4 weekly on
Papergames.io or Ludoteka, has an ELO identity there, has hit a
plateau, and can feel they're "missing something" but can't self-
diagnose what. Age 20-45. Mobile-first. Will pay for a tool that
demonstrably moves their rating.

**Not** the MVP's target: casual players, kids, educational B2B.

---

## 6. Success Metrics (KPIs)

- **Primary (North Star): Weekly Active Learner (WAL).** A user who
  completes ≥ 1 puzzle or reviews ≥ 1 blunder-log entry in the
  trailing 7 days.
- **Secondary Metrics:**
  - Free-to-paid conversion at 30 days. Target: ≥ 2%.
  - D7 / D30 retention cohorts. Target: D7 ≥ 20%, D30 ≥ 10%.
  - Puzzles attempted per WAL per week. Target: ≥ 8.
  - Blunder-log review rate: % of logged blunders reviewed within
    7 days of capture. Target: ≥ 40%. *(This validates SR before
    building the scheduler.)*
  - Self-reported rating change at 30 days (opt-in survey).
    Target: ≥ 50 ELO median improvement among users with ≥ 4 sessions.
- **Phase 2 gate:** Build SR scheduler only if blunder review rate ≥
  40%. Build game import only if paid users explicitly request it in
  session surveys.

---

## 7. Technical Stack & Feasibility

- **Model:** Claude Sonnet 4.6 for X-AI annotations. Prompt caching
  by `(position_hash, move, user_level_bucket)` — puzzle explanations
  are shared across users, computed once.
- **Architecture:**
  - React PWA, mobile-first (existing codebase).
  - Node.js + `c4solver` for ground-truth evaluation (already built).
  - Puzzle library: precomputed JSON shipped with the PWA.
  - Persistence: IndexedDB local-first (free tier). Postgres +
    Supabase Auth for paid tier (blunder log, personalized annotation
    context, sync, subscription state).
  - Payments: Stripe ($4.99/mo, $39/yr).
- **What is NOT needed for this scope:**
  - External game parser (Papergames / Ludoteka format).
  - SR scheduling logic.
  - Puzzle generation pipeline (50 puzzles are hand-curated).

---

## 8. Roadmap

- **Weeks 1-2:** Rule-based pattern classifier + 50 hand-curated
  puzzles + puzzle viewer UI + session snapshot.
- **Weeks 3-4:** X-AI annotations on puzzle solutions (solver →
  pattern classifier → Claude → cached). Hallucination regression
  test: 100 positions × 5 generations, < 2% error rate is the gate.
- **Weeks 5-6:** Blunder log (auto-capture from puzzle failures) +
  simple review queue + X-AI annotations on blunder review. Supabase
  Auth + Postgres sync for paid users.
- **Week 7:** Stripe paywall. Session snapshot delta (paid tier).
  End-to-end test of the full free → paywall → paid flow.
- **Week 8:** Pilot launch to early-adopter niche (Papergames.io
  community, Reddit r/connectfour).

**Phase 2 — Post-Validation (months 3-6), conditioned on metrics:**
- SR scheduler (if blunder review rate ≥ 40%).
- Puzzle generation pipeline → expand to 200+ puzzles.
- Game import from Papergames / Ludoteka.
- Pattern accuracy trends + graduation badges.
- Socratic hint mode.

**Phase 3 — Differentiation Moat (months 6+):**
- Online sandbox play with skill-matched opponents.
- AR board scanner.
- Natural-language coach chat grounded in event log + solver.
- Doppelganger opponent trained on user's own move history.

---

## 9. Risks & Mitigations

*(Same as v1 except import-related risk is moot.)*

- **LLM hallucinating patterns.** Mitigation: rule-based classifier
  produces structured pattern list; Claude composes prose only.
  Regression test before launch.
- **Claude API cost at scale.** Mitigation: cache by
  `(position, move, user_bucket)`. Projected ≈ $50/month at 500 WAL.
- **Niche smaller than expected.** Mitigation: pre-launch waitlist
  + CPI test. Launch gate: CPI ≤ $3 and ≥ 500 waitlist signups.
- **Blunder log insufficiently sticky without SR.** Mitigation: this
  is exactly what the 40% review-rate metric measures. If the simple
  queue achieves ≥ 40% review rate, SR is a confirmed investment.
  If not, SR would not have saved it.
- **Security / Ethics:** Local-first event log, opt-in sync, no
  third-party trackers. No streaks that punish absence.
