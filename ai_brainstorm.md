# AI personalization & user modeling — brainstorm

## Core bet

Skill development needs a feedback loop that *knows you*. The app
already has ground truth (the solver); what's missing is a model of
*this user* — what they know, what they miss, how they miss it, what
they've been taught, and where they're trending. A structured event log
plus AI models for synthesis is how we close that loop.

Two asymmetries to exploit:
1. **Truth is cheap.** The solver gives perfect evaluation for any
   position. We never have to guess whether a move was good.
2. **User state is fuzzy.** Whether the user *understood* a concept,
   *noticed* a threat, or is improving is inherently noisy. This is
   where LLMs earn their keep.

Rule-based code handles (1). AI handles (2) and the synthesis between
them.

---

## 1. What to observe

Every interaction leaves a signal. The question is which signals are
high-information for skill modeling vs. noise.

### 1.1 Per-move signals (live play)

| Signal | Why it matters |
|---|---|
| Position (move string) | Exact context for downstream analysis |
| Move played by user | The decision |
| Solver eval of move played | Absolute quality |
| Solver eval of best move | Delta = blunder severity |
| Time-to-decide | Slow + wrong = calculation error. Fast + wrong = pattern miss. Slow + right = effortful. Fast + right = pattern mastered. All four are distinct learning signals. |
| Hover sequence before click | Which alternatives they *considered* is almost as informative as which they chose |
| Heatmap/hints/scores state at moment of decision | Were they "solving with help" or "solving blind"? |
| Undo events | Undo-after-seeing-consequence is a correction moment |
| Redo events | Did they return to their original plan after exploring? |

### 1.2 Per-game signals

- Final outcome + AI depth + who opened.
- Count of critical moments (score swings > threshold).
- Whether game was played with assistance on / off / mixed.
- Tagged concepts that appeared in the game ("this game featured a
  zugzwang").

### 1.3 Per-puzzle signals

- First-try success / fail.
- Number of retries before solving.
- Time to solution.
- Hints consumed.
- Did the user play *any* correct move in the full sequence, or fail
  early?
- Pattern tag of the puzzle (see §3).

### 1.4 Self-reports (sparse, high-signal)

Periodic low-friction asks:
- "That was" — too easy / right / too hard (one click).
- "Were you surprised by the answer?" — calibration signal.
- "Skill self-rating on double-threat detection: 1–5" once a week.

Self-reports let us detect **miscalibration**: the user who
self-rates 5/5 on forks but fails 60% of fork puzzles is the one who
needs targeted intervention.

### 1.5 Meta-signals

- Session start/end + duration.
- Interval between sessions (spaced-repetition input).
- Which mode the user opens by default (does behavior drift toward
  training-heavy or play-heavy over time?).

---

## 2. Storage design

### 2.1 Raw events are the source of truth

Every observable is emitted as a timestamped event:

```json
{
  "ts": 1735000000000,
  "type": "move_played",
  "session_id": "...",
  "game_id": "...",
  "payload": {
    "position": "44556",
    "player": "human",
    "col": 3,
    "solver_eval_best": 6,
    "solver_eval_played": 2,
    "time_ms": 8400,
    "hover_sequence": [2, 3, 4, 3],
    "assist_state": { "hints": true, "heatmap": false }
  }
}
```

All other views (skill profile, dashboards, session summaries) are
**derived** from this log. Never store anything derived as authoritative
— if we change the model, we re-derive.

### 2.2 Local-first

- Browser IndexedDB for the event log (localStorage is too small for
  thousands of events).
- A companion position cache keyed by move-string → solver eval, to
  avoid re-querying the solver during historical analysis.
- Export / import as JSON for backup and for moving between devices.
- Optional (later): encrypted cloud sync. Not needed for V1.

### 2.3 Derived profile (cache)

Recompute periodically (end of session, or on demand). Stored as a
lightweight JSON blob alongside the event log. Cheap to rebuild.

### 2.4 Event schema discipline

One event type per kind of signal. Adding new signals is just adding
new types — old consumers ignore them. Versioning via a top-level
`schema_version`. This is the cheapest way to keep the log usable
across months of feature churn.

---

## 3. Skill profile — what we derive

The profile is a structured object the app (and AI prompts) can
consult. Sketch:

```json
{
  "tactical_accuracy": {
    "mate_1": { "attempts": 45, "first_try": 42, "median_ms": 3200 },
    "mate_2": { "attempts": 22, "first_try": 11, "median_ms": 14000 },
    "block_1": { ... },
    "block_2": { ... }
  },
  "blunder_profile": {
    "missed_diagonal_up_right": 0.18,
    "missed_vertical": 0.05,
    "hung_fork": 0.22,
    "missed_opponent_double_threat": 0.30
  },
  "depth_limit": {
    "estimated_plies": 2.4,
    "confidence": "medium"
  },
  "time_profile": {
    "fast_right_rate": 0.55,
    "slow_wrong_rate": 0.18
  },
  "concepts": {
    "double_threat": { "exposure": 34, "success_rate": 0.4, "last_seen": "..." },
    "zugzwang_odd": { "exposure": 2, "success_rate": 0.0, "last_seen": "..." }
  },
  "trajectory": {
    "last_7d_vs_prior": { "tactical_accuracy": "+0.08", "blunder_rate": "-0.03" }
  },
  "calibration": {
    "self_vs_observed_delta": -0.12
  }
}
```

Two observations:

- **Weakness taxonomy needs to be concrete.** "Bad at defense" is
  useless. "Misses opponent's diagonal-up-right threat 30% of the
  time" is actionable. The blunder classifier needs to tag each miss
  with a specific pattern — this is rule-based static analysis, not
  AI.
- **Most profile fields are zero until ~20–50 samples.** Cold start
  matters. Until then, use population priors and lean on self-reports.

---

## 4. Where AI models change the experience

### 4.1 Move explanations, tuned to the user

Already: Claude analyzes each move with a generic prompt. Extend: inject
a compact skill profile summary into the system prompt.

**Before** (current): "Explain this move. Here's the board and threats."
**After**: "Explain this move. The user is at ~70% accuracy on mate-in-2
but misses diagonal threats 30% of the time. Vocabulary: they know
'amenaza', 'doble amenaza'; don't over-explain basics. Past mistake
they made twice this week: missing vertical stacking on col4. Keep it
to 2 sentences."

Effect: explanations stop reading like generic coaching and start
referencing the user's actual pattern gaps.

### 4.2 Post-session wrap-up

One Claude call at session end, fed:
- The session's event log (compact form).
- The user's skill profile before and after the session.
- Delta per category.

Output: a 3-4 sentence summary ("You played 6 games, won 4. Strongest:
blocking vertical threats — 100% tonight. Weakest: opponent's
diagonal-right fork, missed 3 times across games 2, 4, 5. Tomorrow's
drill: diagonal-fork defense, 5 puzzles.") plus one concrete next
action.

### 4.3 Conversational coach

Chat surface where the user can ask things the roadmap's UIs don't
anticipate:
- "Why did I lose the last game?"
- "What's a zugzwang?"
- "Show me a puzzle that's harder than the ones I've been doing."
- "Do I play worse when tired?" (meta-question, answered from event
  timestamps.)

The coach has tools: solver queries, event-log queries, puzzle search.
It's grounded in data — it's not allowed to make up positions or
evaluations. This is the single most ambitious AI feature and
correspondingly the last to build.

### 4.4 Contextual mini-lessons on concept labels

When Phase 1.1 (threat labels on hover) ships, each label becomes a
clickable handle to a Claude-generated micro-lesson. First time the
user clicks "amenaza doble": Claude generates a 3-sentence explanation
targeted at a beginner, with a diagram reference. Tenth time: "Same
pattern as game 7. Notice that this version is diagonal instead of
horizontal." Cached so we don't regenerate identical explanations.

### 4.5 Weakness-targeted puzzle selection

Two tiers:
- **Rule-based selector.** Draws puzzles weighted by inverse accuracy
  per category. Deterministic, fast, testable. This is the core loop.
- **AI framing layer.** Generates the short intro text ("We noticed
  you've been missing forks. Five puzzles on that, from easy to hard.")
  and the transitions between puzzles. Purely cosmetic but it's what
  makes the drill feel like a coach rather than a random list.

### 4.6 Natural language puzzle search

User query → embedding → match against tagged puzzle corpus. "Puzzles
where I need to defend against a double threat on the left" becomes a
filter over pattern tags + board geometry predicates. Claude translates
the NL query into a structured filter; search runs locally.

### 4.7 Opponent that adapts — not just in strength, but in *style*

Instead of "AI depth 5", imagine "AI that probes your weakest
pattern". At runtime, pick between several candidate solver moves of
equal or near-equal score, preferring moves whose response requires the
user to solve *their* weak pattern. Still plays well; also plays
pedagogically.

Interaction: no new UI. The existing AI just gets smarter about being a
teacher. The user's profile quietly steers move selection.

### 4.8 Doppelganger mode (speculative, fun)

Train a lightweight imitation policy on the user's move history. Let
them play against their own doppelganger. Unusually motivating —
seeing your own mistakes reflected back is both funny and confronting.
Low priority, high novelty.

### 4.9 Spaced repetition for patterns

Every concept the user struggled with gets re-surfaced at increasing
intervals (1d → 3d → 7d → 21d) until consistently correct. Pure
scheduling logic; no AI needed for the core, but AI writes the
reminder ("Haven't seen you defend a diagonal-left fork in 10 days —
here's one.").

---

## 5. Where AI is the *wrong* tool

Worth naming explicitly so we don't reach for LLMs reflexively.

- **Threat labeling on hover.** Deterministic static analysis. Rule-based.
- **Score reveal and per-move deltas.** Solver output.
- **Puzzle validation.** Solver output.
- **Puzzle selection logic.** A weighted sampler is more reliable and
  debuggable than asking an LLM to "pick a good next puzzle".
- **Skill profile computation.** Summing events. No LLM.
- **Navigation / catalog UIs.** Just UI.

Rule of thumb: if the output can be written as pure functions over the
event log and solver, keep it pure. Bring in the LLM only when the
output is prose, synthesis across heterogeneous data, or open-ended
dialogue.

---

## 6. Privacy, trust, and transparency

- **Local by default.** Event log lives in the browser. Nothing leaves
  the device without an explicit action.
- **Claude calls are visible.** When a call goes out (move explanation,
  session wrap-up), surface a small indicator. Let the user inspect the
  payload if they want. No hidden profile fields sneak into prompts.
- **Export / delete.** One-click to export the whole event log as JSON,
  one-click to wipe it.
- **No gamification of the profile.** The profile is a tool, not a
  grade. Surface it as "here's what I noticed" rather than a score. A
  public ELO number discourages experimentation.
- **Correction loop.** Every AI explanation has a "wrong / already
  knew / too basic / helpful" feedback. These become events too.

---

## 7. Cold start

First 20 games are noisy. Strategies:

- Population priors ("most beginners miss diagonal threats before
  vertical ones"). Blend with user data, weighted by sample count.
- Lean on self-report early; lean on observation late.
- Surface uncertainty honestly. "Still getting to know your game —
  here's a mixed set."
- Detect fast improvement and update priors aggressively. Plateaus
  should shift us toward harder content.

---

## 8. Feedback loops for the system itself

The app's own behavior is an experiment. Log:
- Which AI explanations got "helpful" ratings.
- Which puzzle selections led to solved puzzles vs. abandonment.
- Which session wrap-ups made the user come back the next day.

No ML training needed. Prompt-engineering against these signals is
enough for a long time — tune prompts, tune selection weights, see what
the data says next week.

---

## 9. Prioritization

Mapped against the product roadmap:

### Ship alongside roadmap Phase 1

- **Event logging infrastructure.** Do this before Phase 1.3
  (post-game review) — it's the substrate everything downstream
  reads. A week's work.
- **Minimal skill profile.** Even 3 fields (tactical accuracy,
  blunder count, recent session count) is enough to personalize
  Phase 1 explanations.
- **Inject profile into existing Claude prompts.** Near-zero code
  change, immediate behavior shift.
- **Per-explanation feedback buttons.** Trivial UI; high future
  value.

### Ship alongside roadmap Phase 2–3

- **Pattern-tagging of every puzzle.** Unblocks weakness-targeted
  selection. Initially manual; automate later.
- **Blunder classifier.** Rule-based static analyzer that tags every
  human blunder with a pattern name. Feeds the blunder_profile.
- **Session wrap-ups.** One Claude call per session, surfaced on
  close.

### Ship alongside / after roadmap Phase 4

- **Skill dashboard.** Reads the derived profile, renders trends.
- **Weakness-targeted puzzle selector with AI framing.**
- **Contextual mini-lessons on threat labels.**
- **Spaced-repetition scheduler.**

### Long horizon

- **Conversational coach.** Needs the event log to be mature *and*
  the tooling layer to be solid. Biggest payoff, highest risk.
- **Style-adaptive opponent.**
- **NL puzzle search.**
- **Doppelganger.**

---

## 10. Open questions worth resolving early

- How do we identify "the user" across sessions without a login? A
  random local ID covers the single-device case. Is that enough for
  V1?
- What's the right cadence for self-reports? Too often = annoying;
  too rare = no data.
- How concrete does the blunder taxonomy need to be? Ten categories?
  Fifty? Empirically, what set produces the most actionable
  feedback?
- When do we surface the skill profile to the user directly vs. only
  use it internally? Showing it can motivate; showing it badly can
  deflate.
- Where's the line between "the AI knows the user" and "the AI feels
  creepy"? Referencing "your mistake from Tuesday" is helpful; doing
  it too often is unsettling. Needs user testing.
