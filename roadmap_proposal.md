# Product Roadmap — Connect 4 skill development

## Goal

Turn the app from "Connect 4 with AI help" into a tool that actually develops
the user's skill: pattern recognition, threat reading, and forward calculation
that transfers to games played without assistance.

## Guiding principles

1. **Incrementality.** Each phase ships something the user can exercise end to
   end. Later phases build on the infrastructure and UX primitives introduced
   earlier — no speculative plumbing.
2. **Low-hanging fruit first.** Before new systems, squeeze pedagogical value
   out of what already works (solver scores, heatmap, move history, Claude
   analysis). Each feature is ranked by `impact / effort`.
3. **Empirical validation.** Every feature must be testable against a concrete
   scenario the moment it ships. No feature lands "in anticipation" of a later
   one.

---

## Phase 0 — What already exists

Infrastructure we reuse across all phases:
- Pascal Pons solver (`c4solver -x -b 7x6.book`) with per-column scores and
  heatmap export.
- React board renderer driven by `moveHistory`.
- Hints (`suggestedCols`) + column scores + heatmap overlay.
- Claude analysis after each human move (`analyzeHumanMove`).
- Undo/redo (just added).

---

## Phase 1 — Extract more signal from existing features

Goal: give the user richer feedback loops with minimal new code. All of these
piggyback on infrastructure that already works.

### 1.1 Threat labels on column hover — **SMALL effort, HIGH impact**

Static board analysis of 3-in-a-row windows (we already compute this for
Claude prompts in `getActiveThreats`). Exposed as UI chips.

**User interaction:** on hover over a legal column, a small label appears
above the board showing what the move *does*: "crea amenaza ↗", "bloquea
vertical col3", "doble amenaza", "movida neutra". One concept = one chip.

**Why now:** the heatmap shows *where* the plan lives but never names
*what* you're doing. Labels give the user a vocabulary they can
internalize and later apply without the app.

**Test:** hand-construct 5 board states with known threats, verify chips
appear correctly.

### 1.2 "Commit-first" mode — **TINY effort, MEDIUM impact**

A toggle that hides the heatmap / scores / suggestions *until the user
clicks a column*. Once committed, the tooltip reveals whether the choice
matched the engine and what the top alternative was.

**User interaction:** toggle "🎯 Probar primero". Board looks clean. On
click, a small banner: "Jugaste col4 (score 2). Mejor: col3 (score 6).
Diferencia: col3 crea amenaza doble." Then the move is played normally.

**Why now:** this converts normal play into implicit self-testing without
any puzzle infrastructure. Dirt cheap to build.

**Test:** play a game with the toggle on, verify reveal matches
`solverScores`.

### 1.3 Post-game review — **MEDIUM effort, HIGH impact**

After the game ends, walk through every move with the solver's
evaluation. Highlight the N biggest score swings ("puntos de quiebre"),
i.e. the moves where the outcome tilted most. Let the user re-play from
any point to try a different line.

**User interaction:** once `gameOver`, a "Revisar partida" button
appears. Clicking opens a timeline: one tile per move, colored by score
delta (green = kept best, yellow = small mistake, red = blunder). Click a
tile → board rewinds to that position → user can try an alternative
move; the AI plays its forced best response so the user sees the
consequence.

**Why now:** we already have `fetchScores` and full `moveHistory`. This
is a batch call to the solver plus a timeline UI. Dramatically more
useful than per-move Claude analysis because the user sees the *shape*
of where their games go wrong.

**Test:** play a game with a deliberate blunder, verify it shows up as
the top red tile.

---

## Phase 2 — Puzzle foundation (static positions, one-move answers)

Goal: introduce the puzzle paradigm with the minimum possible machinery.
Everything in Phase 3+ depends on this shipping first.

### 2.1 Puzzle viewer infrastructure — **MEDIUM effort, foundational**

Board renderer accepting a position *not* derived from a live
`moveHistory`: encoded as a Pascal Pons move string (e.g.
`"4445567"`). Solver verifies the user's answer. Reuses the existing
board component, gated by a `mode === "puzzle"` flag.

**User interaction:** new "🎓 Entrenamiento" tab / route. Shows a board
with the prompt "Te toca mover. Encontrá la mejor jugada." User clicks a
column. Three outcomes:
- Correct best move → green flash, "Exacto. Esta jugada [concept]".
- Tied best move → "También funciona — empata con col X en el análisis".
- Suboptimal → red flash, "Había algo mejor. Probá de nuevo". After 2
  wrong tries, reveal and explain.

First release: 10 hand-crafted puzzles in a JSON file. No generator yet.

**Test:** manually curate 10 positions (mix of win-now, block-now,
quiet-positional), play each through the viewer, verify feedback is
correct.

### 2.2 Mate-en-1 and Bloqueo-en-1 generator — **SMALL effort, HIGH impact**

Position generator: play thousands of random self-play games, scan every
intermediate position, classify each with the solver. Keep positions
where:
- `canWinNext()` returns a move (→ "Mate en 1" puzzle), or
- opponent has `canWinNext()` and exactly one column blocks it (→
  "Bloqueo en 1" puzzle).

Dump a curated set (say 200 of each) to JSON.

**User interaction:** "Entrenamiento" screen now has difficulty tabs:
`Mate en 1 · Bloqueo en 1`. Each tab pulls from its puzzle set and
serves them in random order. Score + streak counter per session.

**Why now:** this is the cheapest way to validate the full puzzle loop
with real generated content. Generation is a few dozen lines on top of
the existing solver server.

**Test:** solve 20 puzzles by hand, confirm the generator never
classifies a wrong answer as correct.

---

## Phase 3 — Multi-move tactical puzzles

Goal: extend the puzzle loop from single-move recognition to calculated
sequences. This is where skill transfer compounds.

### 3.1 Mate-en-N (offensive) with gradual reveal — **MEDIUM effort**

Generator uses the solver's `analyze` output to tag positions where the
side to move has a forced win in N plies (N ∈ {2, 3}) but no win in N−1.

**User interaction:** the puzzle doesn't end after the first correct
move. Instead, the opponent plays its forced best reply, and the user
must continue the sequence until the win materializes. Each correct
sub-move is confirmed inline; one wrong sub-move reveals the full
continuation. Counter shows "paso 2 / 3".

**Why now:** forces the user to *verify* their plan by executing it, not
just spotting the first move. Builds real calculation muscle.

**Test:** use a handful of well-known Connect 4 tactical positions from
the literature, verify the puzzle plays through exactly as expected.

### 3.2 Defensa-en-N (your original idea) — **MEDIUM-HIGH effort**

Generator looks for positions where if the user plays anything other
than the single correct move, the opponent has a forced double-threat
(or forced win) in N plies. The puzzle asks the user to find that
unique defensive move.

**User interaction:** same multi-step viewer as 3.1, labeled "Defensa en
N". Bonus UI: if the user picks a losing move, show the opponent's
forced continuation to illustrate *why* that move loses. That
consequence-display is the learning moment.

**Why after 3.1:** reuses the multi-step viewer from 3.1. Also the
harder of the two to generate cleanly (need to filter out positions
with multiple defending moves), so we ship offensive first.

**Test:** seed with 5 hand-crafted "only move defends" positions,
verify generator finds them and rejects positions with multiple
defenders.

---

## Phase 4 — Learning loop

Goal: turn the puzzle pool into a system that adapts to the user and
builds long-term retention.

### 4.1 Session stats and streaks — **SMALL effort**

Persist per-category counters (attempts, solved-first-try, avg time) in
localStorage. Show a session summary at the top of the training screen:
"Hoy: 12 puzzles, 8 al primer intento. Mate en 2 es tu punto débil."

**Test:** solve 5 puzzles, refresh page, verify stats survive and
aggregate correctly.

### 4.2 Adaptive puzzle selection — **MEDIUM effort**

Weight the next puzzle draw toward categories where the user is
underperforming. Simple heuristic first: exponential moving average of
first-try accuracy per category, draw probability inversely proportional
to accuracy.

**Test:** deliberately fail all "Defensa en 2" puzzles for a session,
verify the next session surfaces more of them.

### 4.3 Named-pattern catalog — **MEDIUM effort**

Each puzzle is tagged with a pattern concept: `double_threat`,
`zugzwang_odd`, `column_4_control`, `even_threat_defense`, etc.
"Entrenamiento" screen exposes a catalog view: pick a concept, drill
puzzles of just that kind.

**Why now:** by this phase we have hundreds of puzzles; users need a way
to deliberately train one concept at a time rather than rolling
randomly.

**Test:** tag 50 puzzles manually, verify concept filter returns only
matching positions.

---

## Phase 5 — Advanced concepts (sketch)

Longer-horizon work, only pursued once phases 1–4 are solid:

- **Parity / zugzwang training set** — curated endgame positions that
  isolate the odd/even threat strategy, paired with a short
  explanation. This is the concept most responsible for the gap between
  intermediate and expert play, and it's nearly invisible from normal
  game experience.
- **Concept micro-lessons** — short text+diagram pages (2–3 minutes
  each) explaining a concept, followed by a curated puzzle set from the
  Phase 4 catalog. Turns the catalog from drill material into a
  curriculum.
- **"Guess the engine"** mode during live play — before the AI moves,
  the user guesses which column it will play. Trains opponent modeling
  with zero new infrastructure.

---

## What we are deliberately *not* doing yet

- ELO / ranking systems — premature without a stable puzzle pool.
- Multiplayer / friends — unrelated to skill development.
- Rebuilding the heatmap UI — it works; adding labels (1.1) is the
  cheap win.
- Generating puzzles from the user's own past games — deferred until
  Phase 4 exists as a home for them.

---

## Suggested first sprint

If the goal is "ship something useful this week":
1. **1.1 Threat labels on hover** — ~1 day.
2. **1.2 Commit-first mode** — ~0.5 day.
3. **1.3 Post-game review** — ~2 days.

That combination already changes the character of the app from "helper"
to "teacher" before any puzzle infrastructure exists, and it's the
foundation the rest of the roadmap builds on.
