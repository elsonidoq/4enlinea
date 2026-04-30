# Launch Tactic: DecodeC4 MVP

## 1. Launch Objective

Validate that mid-game tactics puzzles with pattern-named explanations
solve a real pain point for serious amateurs — measured by unprompted
return within 7 days, not by sign-ups or revenue.

Sign-ups can be manufactured with ads. Unprompted return cannot. If
users come back without a push notification or email, the core feature
is useful. That is the only thing worth knowing at launch.

## 2. Launch Hypothesis

If we launch DecodeC4 to competitive Connect 4 players (1400–1800 ELO
on Papergames.io and Ludoteka) with 50 free mid-game tactics puzzles
featuring pattern-named explanations, then within 30 days:
- ≥ 20% of users who solve ≥ 3 puzzles return within 7 days without
  any notification.
- ≥ 5% exhaust all 50 free puzzles, hitting the natural paywall.

If both numbers hold, demand is validated and conversion optimization
begins. If neither holds, the core feature is wrong, not the pricing.

## 3. Narrow Initial Audience

**Segment:** Competitive players ranked 1400–1800 ELO on Papergames.io
and Ludoteka. Not casual players. Not kids. Not chess players who dabble.

**Where they gather:**
- Papergames.io tournament lobby and forums.
- Reddit r/connectfour — small but self-selected; posters are
  specifically motivated by strategy, not casual play.
- Ludoteka ranked ladders (European community, similar profile).
- Discord servers dedicated to abstract strategy games.

**Why they feel pain sharply enough to try something new:**
They are stuck. They can see from any solver that col 4 was +12 and they
played col 2 at +3. They don't know why. They lose the same types of
games repeatedly and cannot self-diagnose because no existing tool
teaches patterns — every tool just evaluates positions. This frustration
is explicit in forum posts ("I know I should play center but I don't
understand when or why").

**Starting point:** 20 users from r/connectfour before any public
launch. The subreddit is small enough that a genuine "I built this,
want feedback" post is not spam.

## 4. Core Offer at Launch

**What users get immediately (no account required):**
- 50 mid-game puzzle positions, categorized by pattern type (Mate-in-2,
  Fork Setup, Double-Threat Defense, Zugzwang).
- For each puzzle: play the correct continuation against the engine's
  forced responses, then read a two-sentence explanation naming the
  pattern and why it works.
- Immediate visual feedback: correct move flashes green; wrong move says
  "Not quite — try again" (one retry before hint).

**What is NOT at launch:**
- Blunder log (requires account).
- Personalized annotations (requires history).
- Game import (requires backend integration).
- Paid tier (appears only when puzzle limit is hit).
- Any account creation before puzzle 50.

**The "this is useful" moment:** Solving the first puzzle and reading
*"You found a double-threat setup. The opponent can block one threat but
not both — that's why this move wins."* The user should feel, for the
first time, that they understand *why* rather than just that they got
it right.

## 5. Positioning & Messaging

**Problem it solves:**
"You already know which move the solver prefers. You don't know why —
and that's why you keep plateauing."

**Why current alternatives fail:**
- Solvers (GameSolver.org, Connect4 Solver AI) show numbers, not
  concepts. They tell you what to play; they don't teach you to think.
- Tutorial content starts from empty boards. Real games are lost and
  won in mid-game positions that tutorials never show.
- "4 in a row Tutor" visualizes the neural network but still leaves the
  player to infer the strategic concept themselves.

**Why this is different now:**
Perfect engine evaluation has existed for years. What's new is the
ability to translate `col 4 = +12` into *"this creates a fork: vertical
on col 4 and diagonal on col 3 — the opponent cannot block both"* at
zero marginal cost per user. That translation is what turns evaluation
into education.

**One clear promise:**
"Solve 10 mid-game puzzles a week. You'll start seeing patterns you
used to miss."

**What not to say:** "AI-powered." "Revolutionary." "The best Connect 4
app." Serious players are sceptical. Let the puzzles speak.

## 6. Acquisition Channels (Ranked)

### 1. Reddit r/connectfour — first priority

- **Audience match:** Exact. Posters discuss strategy explicitly.
- **Speed to test:** Same day.
- **Cost:** Free.
- **Credibility:** A genuine "I built this for players like you" post
  from someone who can discuss tactics in the comments lands well.
  A marketing post gets flagged.
- **Tactic:** Post one puzzle image with its explanation revealed as a
  demo. "Built a mid-game tactics trainer — 50 free puzzles, no
  account. Looking for feedback from people who actually play
  competitively." Stay in the comments. Answer every reply.

### 2. Direct outreach to top-ranked Papergames.io players

- **Audience match:** Exact — highest ELO = highest pain from plateau.
- **Speed to test:** 2–3 days to get responses.
- **Cost:** Free.
- **Credibility:** Very high if the message is specific ("I saw your
  game vs. player X, this type of position is exactly what the trainer
  covers").
- **Tactic:** 15 personal DMs to top-100 Papergames players. Not a
  mass template — reference their games. Ask them to try 5 puzzles and
  reply with whether the explanations match how they think about the
  position. These users become the first testimonials.

### 3. Discord strategy game servers

- **Audience match:** Moderate — abstract strategy fans, not all
  Connect 4 specialists.
- **Speed to test:** 2–4 days.
- **Cost:** Free.
- **Credibility:** Medium. Requires finding the right channel within
  larger servers.
- **Tactic:** Post in #board-games or #abstract-strategy channels with
  the puzzle image demo. Gauge interest before investing more time.

### 4. SEO landing page ("Connect 4 puzzle trainer", "how to improve
   at Connect 4")

- **Audience match:** High — search intent is exactly the pain point.
- **Speed to test:** Weeks to months.
- **Cost:** Free (time investment only).
- **Credibility:** High if content is genuinely useful (e.g., a free
  article explaining the double-threat concept with diagrams).
- **Tactic:** Publish one long-form article at launch explaining the
  "Fork" pattern in Connect 4 with examples. Embed the puzzle trainer
  inline. Start indexing now — it will compound.

### 5. Paid display ads on Papergames.io (if available)

- **Audience match:** Very high.
- **Speed to test:** 1 week after setup.
- **Cost:** Unknown — requires contacting the site directly.
- **Credibility:** Paid placement, not organic. Lower trust than
  community posts.
- **Tactic:** Only pursue after channels 1–3 have validated the pitch.
  Use the testimonials from direct outreach as ad creative.

## 7. Pre-Launch Setup

**Landing page (required before any outreach):**
- Headline: "Stop guessing. Start understanding."
- Sub-headline: "50 mid-game Connect 4 puzzles with pattern-named
  explanations. No account. Free."
- One playable demo puzzle embedded inline — visitor must be able to
  solve a puzzle without clicking anywhere else.
- After demo: "Want 49 more?" → enters the trainer.
- Email capture below the demo: "Get notified when personalized
  coaching launches." No forced gate.

**Analytics events (instrument before first user arrives):**
- `puzzle_started` (which puzzle, which category)
- `puzzle_solved_correct` (first try vs. retry)
- `puzzle_abandoned` (left without solving)
- `explanation_expanded` (tapped to read full explanation)
- `free_limit_hit` (reached puzzle 50)
- `email_captured`
- `paid_cta_clicked`

No analytics = no iteration. This ships before any outreach.

**Email capture sequence (3 emails, automated):**
1. Day 0 — confirmation: "You've got 50 puzzles waiting."
2. Day 3 — concept hook: "The pattern behind 30% of mid-game losses"
   (one-paragraph explainer on double threats with a link back).
3. Day 14 — paid launch: "Personalized coaching is live. Your blunder
   log is ready."

**Pricing page:** Not live at launch. Pricing is revealed only when
the user hits the puzzle limit. Premature pricing pages create
objections before value is experienced.

## 8. Launch Mechanics

### Soft Launch (week −2 to 0)

20 invitations to r/connectfour users who have posted strategic
questions in the past 6 months. Personal DM with a link and a specific
ask: "Does the difficulty feel right? Is the explanation useful or
does it state something obvious?" Two specific questions, not "any
feedback."

Watch for:
- Puzzle abandonment rate > 50% → too hard, wrong difficulty
  calibration.
- "The explanation just says what I already knew" → explanations are
  too shallow; need to name the strategic *consequence*, not just the
  pattern.
- "I don't understand what I'm supposed to do" → onboarding unclear.

Fix those before public launch.

### Public Launch (week 0)

- r/connectfour post with the puzzle image + explanation screenshot.
  Title: "I built a mid-game tactics trainer for serious players —
  50 free puzzles, no account. Roast it."
- Simultaneously: 15 personal DMs to top Papergames.io players.
- Reply to every comment within the first 24 hours. The launch post IS
  a user interview.
- CTA everywhere: "Try a puzzle — no sign-up, just play."

Do not announce on Product Hunt, Hacker News, or broad tech channels
at this stage. Those audiences are not the target. Premature broad
exposure dilutes the signal.

## 9. Onboarding Flow

**Target: first solved puzzle within 60 seconds of landing.**

1. User lands → sees a mid-game board, a text prompt ("Your turn.
   Find the best move."), and 7 clickable columns. No tutorial. No
   splash. No "how to play" modal.
2. User clicks a column → immediate feedback. Correct: green flash +
   "Yes — now the opponent must respond here." Wrong: red flash +
   "Not the best move here. Try again."
3. One retry allowed. After two wrong attempts: a hint appears naming
   the pattern ("Hint: look for a move that creates two threats at
   once.").
4. After solving → full explanation: pattern name (bold) + two
   sentences explaining the strategic consequence + "Next puzzle →"
   button.
5. After puzzle 5 → one-sentence concept reinforcement: "You've now
   seen three Fork setups. That's the most common mid-game winning
   pattern."
6. After puzzle 10 → one-question in-app pulse: "Was the explanation
   useful?" (Yes / Somewhat / No). No friction — tap one button,
   moves on.
7. After puzzle 50 → paywall: "You've completed the free set. Unlock
   150 more puzzles + your personal blunder log." Email capture
   option for users not ready to pay.

**Account creation:** never required for the free tier. When the user
hits the paywall and chooses to pay, account creation is part of the
Stripe checkout flow — not a separate step before it.

## 10. Conversion Trigger

Two moments where a free user naturally wants what only the paid tier
offers. Both happen after value is already experienced.

**Trigger 1 — Puzzle exhaustion (puzzle 50).**
The user has solved 50 puzzles and wants more. The desire is already
present; the paywall names what they get: 150 more puzzles organized
by the pattern category they struggled with most during the free set.
Copy: "You missed 4 Fork puzzles. There are 40 more in the full
library."

**Trigger 2 — Post-game import.**
The user finishes a real game on Papergames.io, loses, and wants to
know what they missed. Import is gated. The paywall shows at exactly
the moment of highest motivation: right after a loss.
Copy: "Paste your game. We'll find every blunder and add them to your
training queue."

**Why paid value compounds:**
The blunder log is the compounding asset. Month 2 it knows 40 of your
mistakes. Month 6 it knows 200. Cancelling means losing that personal
curriculum. Staying means the product becomes more useful over time
without the user doing extra work. This is switching cost built from
genuine value, not artificial lock-in.

## 11. Retention Loop

**For free users — weekly new puzzle pack:**
5 new puzzles added each Monday in the same category the user solved
fastest (signal: they find that pattern most engaging). Announced via
email only — no push notifications.

**For paid users — blunder log review cadence:**
Spaced repetition surfaces 5–8 blunders each week based on the
standard SR intervals (1d → 3d → 7d → 21d). Email subject: "5
positions from your games are ready for review." No streak mechanic.
No punishment for missing a week. The positions just wait.

**Core habit the loop builds:**
Open app once a week, solve 5–10 puzzles or blunder reviews, read what
pattern was at play. Leaves in 10 minutes feeling sharper. This is
tied to the user's real ELO motivation on Papergames — the external
reward is a rating number that moves, not a badge inside the app.

## 12. Metrics Dashboard

### Acquisition
| Metric | Goal |
|---|---|
| Unique visits (week 1) | ≥ 300 |
| Signup rate at puzzle limit | ≥ 15% |
| CAC from paid channels | ≤ $3 |

### Activation
| Metric | Goal |
|---|---|
| % of visitors who solve ≥ 3 puzzles | ≥ 40% |
| % who solve ≥ 10 puzzles | ≥ 20% |
| Median time to first solved puzzle | ≤ 90 seconds |

### Retention
| Metric | Goal |
|---|---|
| D7 (among users who solved ≥ 3 puzzles) | ≥ 20% |
| D30 | ≥ 10% |
| Weekly Active Learner (week 12) | ≥ 500 |

### Revenue
| Metric | Goal |
|---|---|
| % of free users hitting puzzle limit | ≥ 5% within 14 days |
| Free-to-paid conversion at 30 days | ≥ 2% |
| Month-2 churn | ≤ 15% |

## 13. Feedback Capture System

**In-app (passive, zero friction):**
- Pulse at puzzle 10: "Was the explanation useful?" (one tap).
- Pulse at puzzle 50: "What's missing?" (optional open text before
  the paywall screen).

**Exit survey (email, sent day 3 to non-returners):**
Three questions only:
1. "You solved X puzzles. What stopped you from coming back?"
2. "Did the difficulty feel right — too easy, about right, too hard?"
3. "What would make you pay $4.99/month for this?"

**User interviews (manual):**
Email the first 30 users who solved ≥ 20 puzzles. Ask for a 20-minute
call. These are the people whose opinion matters most — they got value
and can explain why, or they got close and can explain what blocked
conversion.

**Community monitoring:**
Check r/connectfour and the Papergames forum weekly for any mention of
the product. Read all replies to the launch post. Do not respond
defensively to criticism — screenshot it and fix it.

**What to ignore:**
One-off feature requests from single users. Focus only on complaints
that appear in ≥ 3 independent sources.

## 14. 30-Day Iteration Plan

**Week 1 — Fix onboarding friction.**
Track where users abandon. If puzzle abandonment > 50%: puzzles are
too hard for the entry point, add an "intro" category with forced-win-
in-1 positions before mid-game content. If explanation "Somewhat" rate
> 40%: explanations are too shallow, rewrite to name the strategic
*consequence* not just the pattern type.

**Week 2 — Improve the explanation quality.**
Take every "Not really" response from the puzzle-10 pulse and read the
explanation that generated it. Rewrite it. Test whether the revised
version gets a higher "Yes" rate for the same puzzle. The explanation
is the product's core differentiator — it must earn that status.

**Week 3 — Test conversion copy at the paywall.**
Two variants:
- A: "Unlock 150 more puzzles."
- B: "Start your blunder log — built from your 50 practice positions
  and every game you import."
Measure % who click "Subscribe" vs. % who enter email only. The winner
determines which value prop resonates more: content volume or
personalization.

**Week 4 — Double down on the best acquisition channel.**
By now: one channel is sending users who solve ≥ 10 puzzles at a lower
CAC than others. Put all outreach effort there. Kill channels where
users abandon after 1–2 puzzles — wrong audience, not wrong product.

## 15. Kill / Scale Decision Rules

### Scale if (at day 60):
- D7 ≥ 20% among users who solved ≥ 3 puzzles.
- At least 3 unsolicited testimonials mentioning a specific pattern
  they now recognize in real games.
- Free-to-paid conversion ≥ 2%.

All three must hold. Two out of three means one pillar is broken and
fixing it takes priority over scaling.

### Pivot if:
- D7 < 10% but puzzle completion is high → users enjoy the session but
  have no reason to return. Ship the blunder log sooner; the product
  needs a weekly hook tied to real games.
- D7 ok but conversion < 0.5% after testing two paywall variants →
  free tier is too generous or paid value proposition is not landing.
  Tighten the free rotation to 20 puzzles, or pre-announce the blunder
  log to build anticipation before the paywall.

### Kill if:
- Puzzle completion rate < 30% after two onboarding rewrites.
- D7 < 5% even among users who completed ≥ 10 puzzles.
- Both hold after honest iteration with real feedback, not assumptions.

A product this niche does not get a third chance at a first impression
with the same community. If the signal is "interesting but not
compelling" after 60 days of iteration, the core premise is wrong:
either serious amateurs don't want to train (unlikely given forum
behavior) or they don't believe a puzzle trainer will move their ELO
(the real risk). Pivoting would mean testing a different entry point
into the same user's life — perhaps game import + post-game analysis
as the core offer, with puzzles as secondary.
