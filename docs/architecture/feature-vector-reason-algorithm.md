> ⛔ **SUPERSEDED / ABANDONED 2026-06-28** — the reason-field design described or assumed here branched off and is no longer the plan. Restarting from `docs/architecture/my_pseudocode.md`. Do NOT use this file as guidance; treat it as historical only.

# How the feature vector explains a blunder — current vs. proposed (conceptual)

**What this document is.** A plain-language, self-contained picture of how the system decides *why a
played move was worse than the best move*, and packages that into the "feature vector" a coach (LLM) reads.
It describes the algorithm **in the codebase today** and the **proposed** replacement
(`docs/epics/unified-blunder-reason-epic.md`). No prior knowledge of the code is assumed; every term is
defined where it first appears.

---

## The setup (the same for both algorithms)

We have a Connect Four position, and two moves to compare:
- the **best move** (what the engine says is optimal), and
- the **played move** (what the human actually did).

We have one oracle, the **solver**: given any board, it tells us, for the side to move, whether the
position is a **win / draw / loss** and *how many moves remain until the game ends*. That's all the ground
truth there is. Everything else is an attempt to turn "the played move is worse" into a concrete,
trustworthy sentence a coach can say — **without ever inventing something the solver doesn't back.**

A **threat / pattern** below just means: a specific set of board squares forming a known tactical shape
(three-in-a-row with an open end, a fork, a named structure like a "z-threat", etc.). A **winning line** /
**winning four** means an actual four-in-a-row that completes the game, named by the square that finishes
it and the four squares it occupies.

---

## PART A — CURRENT algorithm (what runs today)

**Core idea:** look a few moves into the future down *both* branches, collect every tactical pattern that
shows up, and report **what the better move makes possible that the played move does not** — plus whatever
concrete winning four it happened to find, plus some timing/severity numbers. It does **not** produce a
single finished reason; it hands the coach a pile of clues and lets the coach write the sentence.

Step by step, in plain terms:

```
1. Ask the solver the outcome of each move (win/draw/loss for best, and for played).

2. EXPLORE THE FUTURE of each move:
   - From "board + best move", look ahead a fixed number of moves.
   - From "board + played move", do the same.
   - As you go, every time it is the human's turn, write down all the tactical patterns
     present (each as: which pattern, which squares, how many moves from now it appeared).
   - At the opponent's turns, only follow the opponent's strong defensive replies.
   (This forward scan is the only "search"; it collects a bag of patterns for each branch.)

3. DIFF THE TWO BAGS:
   - Find the patterns that appear after the BEST move but NOT after the played move.
     → "these are the good things the better move gives you that your move threw away."
   - Pick the single most important such pattern as the headline.

4. ⚠ STOP EARLY (the key flaw): as soon as step 3 finds ANY such player-side difference,
   the algorithm returns — it never asks "and how does the opponent punish the played move?"
   So when the played move LOSES, the opponent's actual winning line is usually left blank.
   Only if step 3 finds NOTHING on the player's side does it then search the opponent's
   punishing line.

5. TRY TO NAME A WINNING FOUR ("decisiveLine"): from the collected patterns, pull out a
   concrete four-in-a-row window if one is there. (This comes from the pattern bag, which
   can mislabel the real winning four — e.g. tag it a "minor threat" — so the named cell
   is sometimes wrong or missing.)

6. ATTACH NUMBERS:
   - timing: "how many moves to the end" — but stored as |solver score|, which is BACKWARDS
     (a sooner end looks later and vice-versa).
   - reachability: "if the opponent slips, how well could you still do?" — often a phantom
     (it assumes the opponent errs) and often the same for both moves (so it explains nothing).
   - a severity bucket, the blunder's name-tag, the static patterns at each snapshot.

7. HAND ALL OF THAT to the coach. The reason is NOT decided here — the coach must assemble
   it from these scattered, sometimes-contradictory clues.
```

**Why this is being replaced:**
- There is **no single reason** — the explanation is spread across many fields, and the coach can wire them
  together wrongly.
- On a move that **loses**, the **opponent's winning line is usually missing** (the early stop in step 4).
- The **timing number is inverted**.
- The "if the opponent slips…" number is usually a **phantom** and **identical** for both moves, so it
  doesn't distinguish them.
- The named winning four comes from the **pattern bag, which can mislabel it.**

---

## PART B — PROPOSED algorithm (the epic)

**Core idea:** stop collecting bags of patterns. Instead, for each move, have the solver **play out the one
optimal line all the way to the end**, so you see the **actual four-in-a-row that decides the game** on each
branch. Then **compare those two lines** and emit **one finished reason** — or honestly say "there is no
move-level lesson here." The hard rule: **never name a square or a winner the solver doesn't confirm.**

Step by step:

```
1. Ask the solver the outcome of each move (win/draw/loss). Note whether the outcome FLIPS
   (best and played differ) or is the SAME (both win, or both lose).

2. Have the solver PLAY OUT THE OPTIMAL LINE to the end for each move, giving the actual
   winning four on each branch (the finishing square, its four squares, and how many moves
   out it lands) — or "no win" if that branch only draws.
   (When the played move loses, this is how the OPPONENT's winning line is obtained — the
   thing the old algorithm left blank.)

3. DECIDE ONE LABEL ("grain") by comparing the two lines:

   IF the outcome is the SAME (both win / both lose):
       Is there really a mistake to point at? Only if the two lines differ in a meaningful way:
         • a DIFFERENT winning four exists on one branch but not the other, OR
         • (both-lose only) the SAME opponent four lands MATERIALLY sooner after the played move.
       If yes → label "line" (name the four and who it belongs to).
       If no  → label "not_a_blunder": both moves win via the same four (faster is just a
                preference), or you were already lost. Honestly: not a mistake.

   IF the outcome FLIPS:
       Find the four the result hinges on (your forgone win, or the opponent's win you allowed).
       Can we name it AND is it genuinely decisive (it actually completes when the solver plays
       it out — not a square the defender can simply block)?
         • Yes, and it is a STANDING threat already on the board whose OWNER flips
                                 → label "line_parity" (a parity/zugzwang squeeze).
         • Yes, otherwise        → label "line".
         • No nameable four, but the board is near-empty and "being more central = better" actually
           agrees with the solver here → label "opening_principle" (an opening rule of thumb).
         • No nameable four, deep/diffuse position → label "zugzwang_class":
           honestly "this is a deep parity result, there is no single square to point at."

4. WRITE ONE REASON OBJECT: the outcome change, the timing (correctly: moves-to-end), the label,
   who the four belongs to, and a one-sentence "what the better move does" — built ONLY from the
   facts just verified, asserting no mechanism that wasn't checked.
```

**The five possible labels (one is always chosen):**

| label | meaning | gives a square to point at? |
|---|---|---|
| `line` | a concrete winning four decides it | yes |
| `line_parity` | that four is a standing threat whose owner flips (a parity squeeze) | yes |
| `opening_principle` | near-empty board; "more central" really is better here | yes (a count, not a threat) |
| `zugzwang_class` | deep/diffuse; honestly no single square to point at | no — and says so |
| `not_a_blunder` | same outcome, no real difference — honestly not a mistake | no — and says so |

**The one unbreakable rule:** every named square, winner, and controller must be confirmed by the solver
actually playing the line out. Where no honest square exists, the algorithm **says so** (`zugzwang_class` /
`not_a_blunder`) rather than inventing one. The only time it stays silent is a solver error.

---

## The difference in one screen

| | CURRENT | PROPOSED |
|---|---|---|
| what it produces | a pile of clues; coach writes the reason | one finished reason (a label + the four + one sentence) |
| how it looks ahead | scans a few moves, collects every pattern it sees | plays out the single optimal line to the end |
| the opponent's winning line | usually missing when you lose (stops early) | always obtained (plays the losing line out) |
| naming the winning four | pulled from the pattern bag (can be wrong/missing) | the actual finishing square of the played-out line |
| timing | "moves to end", stored backwards | "moves to end", correct |
| "was it even a blunder?" | guesses from "if opponent slips" numbers (often phantom) | compares the two real lines: different four, or materially sooner |
| when there's no real lesson | weak/blank, easy to over-claim | says it plainly: `not_a_blunder` / `zugzwang_class` |
| risk of inventing a reason | high (scattered, mislabeled signals) | guarded: nothing is named unless the solver plays it out |
