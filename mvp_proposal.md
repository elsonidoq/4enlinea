# MVP Proposal: DecodeC4 — Explainable Mastery for Connect 4

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

## 2. Problem Statement

- **Core Pain Point:** Competitive amateurs from platforms like
  Papergames.io (~1.14M monthly visits) plateau because they can *see*
  that a move is better (solvers tell them) but cannot *internalize*
  why. Improvement requires pattern recognition and tactical calculation
  that current tools do not teach — they evaluate.
- **Current Alternatives:**
  - *GameSolver.org* — shows exact outcome per column; no explanation.
  - *Connect4 Solver AI* (iOS) — real-time forced-win detection; no
    teaching layer.
  - *4 in a row Tutor* (Android) — best-in-class, with a neural-network
    visualizer, but still leaves the user to infer concepts themselves.
  - All three start from an empty board; none offer a mid-game tactics
    trainer, despite mastery being overwhelmingly a mid-game skill.
- **Evidence:**
  - 74,000 monthly searches on "Connect 4" drive the top organic
    channel of a competitor doing 1.14M visits/month.
  - Zero competitors offer a curated mid-game puzzle library — an
    unclaimed gap explicitly called out in market research.
  - Industry conversion benchmark of 1.2% free-to-paid implies ~165k
    free users → ~2,000 paying users is achievable.

## 3. Proposed Solution (The AI Edge)

- **Product Hypothesis:** If we provide serious-amateur Connect 4
  players with (a) a curated mid-game tactics trainer, (b) AI-generated
  strategic explanations grounded in solver truth, and (c) a personal
  blunder log with spaced repetition, they will convert from free to
  paid at above-benchmark rates (≥ 2%) because they will experience
  measurable rating improvement within their first month of use.
- **AI Value Add:**
  - **Explanation, not evaluation.** The solver already knows the
    right answer; what's novel is an LLM translating `col 4 = +12`
    into *"crea una amenaza doble: vertical en col 4 y diagonal ↗
    desde fila 3. La IA no puede bloquear ambas."*
  - **Personalization grounded in real data.** LLM composes prose
    around the user's actual blunder history ("tercera vez esta
    semana que te comés una diagonal hacia abajo") — impossible
    without both a skill model and natural-language synthesis.
  - **Scalable puzzle generation.** Solver + rule-based pattern
    classifier produces candidate puzzles; LLM writes the prompt,
    the concept tag, and the post-solve explanation. Content at
    scale without content creators.

## 4. Core Feature Set (The "Minimum")

Four non-negotiable features. Each maps directly to a validated market
gap.

- **Feature 1 — Mid-game Tactics Trainer (200+ curated puzzles).**
  Library of positions categorized by pattern (Mate-in-N, Defensa-en-N,
  Forks, Zugzwang). The user lands on a mid-game board, must find the
  correct continuation, and plays it through against the engine's
  forced responses. *Benefit:* trains the pattern recognition that
  real games actually require — something no competitor offers.

- **Feature 2 — Explainable Move Analysis (X-AI annotations).**
  Every move, both in puzzles and in live play, receives a pattern-
  tagged, natural-language annotation: *"Jugada óptima. Construye un
  fork con la diagonal de col 3 y la vertical de col 4."* Grounded in
  solver evaluation + rule-based pattern classifier + LLM composition.
  Progressive disclosure: one-line summary by default, full
  explanation on tap. *Benefit:* closes the Comprehension Gap.

- **Feature 3 — Personal Blunder Log with Spaced Repetition.**
  Every real-game blunder (score delta above threshold) is auto-
  captured with the position, the move played, the best move, the
  pattern missed, and the date. Re-surfaced as mini-puzzles at
  1d / 3d / 7d / 21d intervals until consistently solved. *Benefit:*
  transforms losses into durable skill gains. This is the retention
  engine.

- **Feature 4 — Game Import from Papergames / Ludoteka.**
  Paste a game URL or move sequence from the two sites where the
  target user already plays. Get a full post-game review with
  per-move X-AI annotations and every blunder auto-logged. *Benefit:*
  acquisition hook — meets users where they already are, without
  building multiplayer ourselves.

- **Feature 5 — Progress Visibility & Micro-Feedback.**
  Three lightweight mechanisms that make improvement tangible:
  1. *Session snapshot.* After every session a one-screen summary
     shows puzzles solved, blunders reviewed, and the week-over-week
     accuracy delta for the patterns practiced. Gives the micro-
     feedback loop that brings users back the next day.
  2. *Pattern accuracy trend.* Per-pattern solve rate tracked across
     sessions and displayed on the dashboard (e.g. "Fork detection:
     40% → 75% this month"). Users need a visible signal that
     practice is working at the pattern level, not just in aggregate.
  3. *Pattern graduation.* When a blunder category reaches a
     consistent-solve threshold in SR, the user sees a "Pattern
     mastered" moment. This is the concrete feeling of improvement
     that closes the loop between drilling and skill gain.
  All three are pure event-log aggregation — no LLM, no extra
  server calls. Pattern accuracy trend and graduation are paid-tier
  (requires cross-session history); session snapshot is free-tier.
  *Benefit:* prevents the critical churn scenario where a user
  completes 10 puzzles, loses their next Papergames game, and
  concludes the product doesn't work — even if their pattern
  recognition improved.

Deliberately excluded from MVP: online multiplayer, ELO ladders, AR
board scanner, neural-network visualizer, Socratic hint mode. All are
strong Phase 2 candidates; none are necessary for the core hypothesis.

## 4b. Free vs. Paid Tier

The conversion trigger must be a feature the user *experiences losing*
when their session ends — not a convenience like sync. The blunder log
is that feature: it requires identity across sessions, personalizes to
*your* weakness history, and becomes more valuable the longer you use
it. A user who has logged 20 blunders has a personal curriculum
competitors cannot replicate for them.

| | Free | Paid ($4.99/mo · $39/yr) |
|---|---|---|
| Tactics puzzles | 50 puzzles, fixed rotation | Full 200+ library, all pattern categories |
| Post-puzzle X-AI annotation | Generic (pattern name + one-line) | Personalized ("tercera vez que te comés una diagonal ↗") |
| Post-game X-AI annotation | — | Full per-move review on imported games |
| Blunder log | — | Auto-capture + spaced repetition across sessions |
| Game import (Papergames / Ludoteka) | — | Unlimited |
| Session snapshot | ✓ (in-session accuracy only) | ✓ (includes week-over-week delta) |
| Pattern accuracy trends | — | ✓ per-pattern solve rate over time |
| Pattern graduation | — | ✓ "Pattern mastered" milestone |
| Cross-device sync | — | Included |

**Why this split works:**

- *Free tier is genuinely useful.* 50 puzzles with solver-grounded
  annotations is already better than every competitor. Users arrive
  sceptical and leave convinced the core product works.
- *The paywall is encountered naturally.* After the first real-game
  loss a free user wants to review it. Import is gated. After solving
  their 50th puzzle they want to do more and know which patterns to
  drill. Both paths hit the paywall at the moment of highest
  motivation.
- *Paid value compounds.* Generic X-AI annotations are stateless and
  cheap to generate once. Personalized annotations require knowing the
  user's blunder history — that data only exists for paid users.
  The longer someone pays, the more the product knows them, and the
  more useful the personalization becomes. This creates switching cost
  without artificial lock-in.

## 5. Target Audience & User Persona

- **Primary User:** The Serious Amateur. Plays Connect 4 weekly on
  Papergames.io or Ludoteka, has an ELO identity there, has hit a
  plateau between 1400-1800 and can feel they're "missing something"
  but can't self-diagnose what. Age 20-45. Mobile-first. Will pay for
  a tool that demonstrably moves their rating.
- **Key Motivations:**
  - Rating improvement on their home platform (external validation).
  - Understanding *why* they lose — the self-knowledge payoff.
  - 5-15 minute commuter sessions (portrait, one-handed).
- **Early Adopters:** The top 10% of the Papergames.io Connect 4
  community — tournament participants and forum-active users. Reachable
  via: (a) targeted ads on those platforms, (b) community forums /
  Discord / Reddit r/connectfour, (c) content partnership with a
  known player doing coaching content. Pilot target: 500 signups
  from this niche within 30 days of launch.

**Not** the MVP's target: casual players, kids, educational B2B.
Educational market is a validated Phase 2 segment but requires
different UX, pricing, and sales motion. Disciplined focus on one
segment per the "narrow early wedge" principle.

## 6. Success Metrics (KPIs)

- **Primary (North Star): Weekly Active Learner (WAL).** A user who
  either (a) completes ≥ 1 puzzle or (b) reviews ≥ 1 blunder-log entry
  in the trailing 7 days. Chosen over DAU because it captures
  pedagogical engagement specifically — pure gameplay doesn't count.
- **Secondary Metrics:**
  - Free-to-paid conversion at 30 days. Target: ≥ 2% (beats 1.2%
    benchmark).
  - D7 / D30 retention cohorts. Target: D7 ≥ 20%, D30 ≥ 10%.
  - Puzzles attempted per WAL per week. Target: ≥ 8.
  - Blunder-log review rate: % of logged blunders attempted within
    scheduled SR window. Target: ≥ 40%.
  - Self-reported rating change at 30 days (opt-in survey).
    Target: ≥ 50 ELO median improvement among users with ≥ 4 sessions.
- **Success Threshold for Pilot (first 90 days):**
  - 1,500 signups (validates acquisition channels).
  - 500 WAL in week 12 (validates retention).
  - 2% converted to paid (validates willingness to pay).
  - Qualitative: ≥ 30 user testimonials mentioning rating improvement
    or specific pattern-recognition wins.

## 7. Technical Stack & Feasibility

- **Model Selection:**
  - **Claude Sonnet 4.6** (current) for X-AI annotations and blunder-
    log reviews. Rationale: strong reasoning, Spanish fluency (target
    LATAM + ES), and prompt caching available for per-user profile
    context. Latency acceptable for non-realtime paths (post-move
    analysis, puzzle explanations).
  - **No model for realtime paths.** Hover labels, score deltas, and
    pattern classification are deterministic rule-based code on top
    of the solver. Faster, free, testable.
- **Architecture:**
  - React PWA, mobile-first portrait layout (existing codebase).
  - Node.js backend spawning `c4solver` (Pascal Pons, C++ bitboards)
    for ground-truth position evaluation. Already built.
  - Claude API calls are server-side proxied, aggressively cached by
    `(position_hash, move, user_level_bucket)` — identical
    explanations are computed once per player bucket.
  - Puzzle library: precomputed JSON, shipped with the PWA. Generated
    offline via a solver-driven pipeline that scans random self-play
    games and classifies tactical positions.
  - Persistence: IndexedDB local-first (free tier — no account
    required, no data leaves the device). Postgres + Supabase Auth
    for paid tier — blunder-log history, personalized annotation
    context, cross-device sync, subscription state.
  - Payments: Stripe ($4.99/mo, $39/yr — inside the $5-$10
    specialized-analysis band from market benchmarks). Paywall
    encountered at two natural moments: game import and exhausting
    the 50-puzzle free rotation.
- **Data Strategy:**
  - **Ground truth for move quality:** solver. Perfect.
  - **Ground truth for pattern tags:** rule-based static analyzer
    (forks, threats, zugzwang have mechanical definitions). Seeded
    with a hand-labeled test set of 100 positions for regression
    testing.
  - **Ground truth for explanations:** none — but Claude is grounded
    in solver facts and pattern tags, never asked to evaluate. It
    *composes* from structured input only. Hallucination surface area
    is small and detectable.
  - **User data:** raw event log (moves, times, blunders, puzzle
    attempts). Local-first; synced to Postgres only for paid users
    with explicit opt-in.

## 8. Roadmap & Phased Approach

- **Phase 1 — MVP (weeks 1-12):**
  - Weeks 1-3: rule-based pattern classifier + 50 hand-curated
    puzzles + puzzle viewer UI.
  - Weeks 4-6: puzzle generation pipeline → expand to 200 puzzles.
    X-AI annotations on puzzle solutions.
  - Weeks 7-9: blunder log + spaced repetition scheduler + X-AI
    annotations in live play.
  - Weeks 10-11: Papergames/Ludoteka import + Stripe paywall +
    Postgres sync.
  - Week 12: pilot launch to early-adopter niche.
- **Phase 2 — Post-Launch (months 4-9):**
  - Full 1,000+ puzzle library.
  - Socratic hint mode (asks "what's the opponent's threat?" before
    revealing).
  - Performance ELO for training accuracy (not gameplay).
  - Online sandbox play with opponents matched by skill profile.
  - Educational B2B package (school pricing, classroom mode).
- **Phase 3 — Differentiation Moat (months 9+):**
  - AR board scanner (iOS/Android).
  - Neural-network visualizer.
  - Natural-language coach chat (grounded in event log + solver).
  - Doppelganger opponent trained on user's own move history.

## 9. Risks & Mitigations

- **Technical Risk — LLM hallucinating patterns.**
  Claude could confidently describe a "diagonal fork" that doesn't
  exist on the board.
  *Mitigation:* rule-based classifier runs first and produces the
  structured list of real patterns. Claude composes prose over that
  list only — never "looks at the board." Automated regression test:
  100 positions × 5 generations each, checked against ground-truth
  pattern labels. Hallucination rate < 2% is the launch gate.

- **Technical Risk — Claude API cost at scale.**
  A single explanation costs a few cents; 500 WAL × 8 puzzles × 4
  weeks = 16,000 calls/month.
  *Mitigation:* cache by `(position, move, user_bucket)`. Puzzles are
  shared across users — one generation serves thousands. Projected
  steady-state cost ≈ $50/month at 500 WAL. Live-play analysis is
  per-user but gated to paid tier.

- **Market Risk — Niche smaller than 165k free users.**
  *Mitigation:* validate acquisition CPI before committing to build.
  Run a pre-launch landing page with a waitlist + Papergames.io /
  Reddit ads. Launch gate: signup CPI ≤ $3 and waitlist ≥ 500
  before starting week 1.

- **Market Risk — "4 in a row Tutor" copies the puzzle trainer.**
  *Mitigation:* the moat is not the mechanic but the curated puzzle
  taxonomy + blunder-log personalization. Puzzle quality compounds:
  every user session generates data that improves selection and
  tagging. First-mover advantage in a niche this size is durable if
  we ship fast.

- **Security / Ethics:**
  - *Data privacy:* event log is local-first; server sync is opt-in
    and limited to paid tier. No third-party trackers. Full export /
    delete in-app.
  - *AI safety:* Claude outputs are bounded to Connect 4 content and
    grounded in structured solver + pattern input; jailbreak surface
    is minimal. No user-to-user content, so no moderation burden.
  - *Addictive design:* no loot boxes, no streaks that punish
    absence, no notifications that manufacture anxiety. The product
    sells skill gain, not dopamine.
