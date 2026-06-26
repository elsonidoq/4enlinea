# Deep-Reveal Feature Vector — Glossary for an LLM Reader

You are reading a **feature vector**: a compact, board-grounded description of a single Connect
Four position in which one move (the "played" move) is being compared against the engine's best
move (the "better" move). Your job, when given one, is to explain **why the played move was a
mistake (a "blunder")** using only the facts in the vector and the board it describes — naming
reproducible board features, never inventing tactics that are not present.

This file defines **every field and every enumerated value** the vector can contain. It is
self-contained: you do not need any other document to interpret a vector.

---

## 0. How to read a feature vector (start here)

1. The vector describes **one decision**: at board `movestring`, the player to move played
   column `playedCol` when `bestCol` was at least as good.
2. **`tag` + `direction`** tell you the *kind* of mistake (e.g. "missed an immediate win,"
   "failed to block," "handed the opponent a fork").
3. **`threatStats`** and the **`patterns*`** maps tell you *what is concretely on the board* at
   three snapshots: before the move, after the best move, after the played move.
4. **`lookahead`** tells you *what changes in the near future* between the better and played
   lines — including how best play punishes the blunder.
5. **`gapBucket`** and the **`*Outcome`** labels tell you *how bad* it was, qualitatively.

A field that is absent was empty/zero and was pruned away (see §6). Absence means "this signal
was not present," not "unknown."

---

## 1. Global conventions

- **Coordinates / cell strings.** Every cell is written `cNrM` — **column N, row M, both
  1-indexed for display**: `c1r1` is the bottom-left square, `c7r6` the top-right. Column counts
  left→right (1–7); row counts bottom→top (1–6). (Internally the code is 0-indexed, but every
  cell string you see in the vector is already 1-indexed — read them literally.)
- **Column fields** (`playedCol`, `bestCol`) are **0-indexed** integers (0 = leftmost column,
  i.e. display column 1). Add 1 to match a `cNrM` column number.
- **The two players.** `perspective` identifies the player whose move is being explained — call
  them **"you"**; the other player is **"your opponent."**
  - `perspective: 1` — the **first player** (moves first). Wins by completing four on **odd
    rows** (rows 1, 3, 5). Displayed elsewhere as "Green".
  - `perspective: 2` — the **second player**. Wins on **even rows** (rows 2, 4, 6). Displayed
    as "Gray".
  - All `patterns*` and `threatStats.*.player*` data is from **your** perspective; `*.opponent*`
    and `patternsOpponent` are from the opponent's.
- **`owner` on cell groups.** Every non-empty `cells`/`ways` group carries `owner: "player"`
  (yours) or `owner: "opponent"`. Trust it literally — never re-attribute a cell to the other
  side. An absent `owner` only ever co-occurs with an empty group (pruned away).
- **"Major" vs "minor" vs "immediate" threat.** Non-empty threat groups carry `severity`:
  - `"immediate"` — a major threat whose completing cell is **gravity-top (playable this move /
    win-in-one)**. Structural tactical patterns (`figure_7`, `j_shape`, `undercut`, `overcut`,
    `forced_block`, `forced_win`, `z_threat`, `claimeven`) carry **no `severity`** — the tag
    names the shape, not a threat-window category.
  - `"major"` — a **3-in-window latent threat** whose cell is not immediately playable.
  - `"minor"` — a **2-in-window developing setup** (two-moves-away).
  - Structural tactical patterns carry **no `severity`** — the tag name is the meaning.
  A **major threat** is a 4-in-a-row window holding **three of one player's discs and one empty
  cell** (filling the empty cell wins). A **minor threat** is a window holding **two discs and
  two empties** (a developing, two-moves-away setup).
- **"With best play."** Every outcome word (`win`/`draw`/`loss`) means the game-theoretic result
  **assuming both sides play optimally from here on**. A `win` means you *can force* a win with
  correct continuation — it is **not** a guarantee produced by this single move. The only move
  that guarantees a win by itself is one that completes four-in-a-row (see `immediate_threat`).
  Never tell the player a positive position "wins" as if no further correct play were required.

---

## 2. Top-level fields

| Field | Type | Meaning |
|---|---|---|
| `movestring` | string | The position before the move, as a sequence of played columns (each char a 0-indexed column). Empty string = empty board. The board you reason about. |
| `perspective` | `1` \| `2` | The player who made the move being explained ("you"). See §1. |
| `playedCol` | int (0-indexed) | The column actually played — the move under scrutiny. |
| `bestCol` | int (0-indexed) | The column the engine treats as the better alternative ("the better move"). May equal a different tiebreak than naive expectation; trust this field. |
| `playedCell` | `cNrM` | The exact square the played disc lands on. |
| `bestCell` | `cNrM` | The exact square the better move's disc lands on. |
| `gapBucket` | enum | Qualitative size of the mistake. See §3.3. |
| `tag` | enum | The *kind* of blunder. See §3.1. |
| `direction` | enum | Whose stake the blunder is about (your missed gain vs. opponent's gain). See §3.2. |
| `isSparse` | bool | `true` when the position has little concrete tactical structure (e.g. openings / quiet positions). On a sparse board, expect fewer `patterns*`/`threatStats` entries and rely more on `lookahead` and positional reasoning. |
| `centerDominance` | bool | `true` when the decisive positional factor is control of the center. On early/positional boards this may be the *only* structural signal present. |
| `patternsBest` | map | Named tactical patterns present **after the better move**. See §4 + §5.1. |
| `patternsPreMove` | map | Named tactical patterns present **on the pre-move board** (before either move). See §5.1. |
| `patternsPostBlunder` | map | Named tactical patterns present **after the played move**. See §5.1. |
| `patternsOpponent` | map | Opponent-perspective patterns, a direction-specific augmentation (e.g. the opponent's existing/forced threats). May be absent. |
| `threatStats` | object | Parity-bucketed major/minor threat **counts + cells** at three snapshots. See §5.2. |
| `lookahead` | object \| null | Forward search comparing the better and played lines. See §5.3. |

> **Raw solver scores are intentionally absent.** The vector does **not** include per-column
> engine scores or a numeric gap — their magnitudes are easy to over-read. Use `gapBucket` for
> severity and the `*Outcome` labels for the result.

---

## 3. Scalar value vocabularies

### 3.1 `tag` — the kind of blunder

`tag` is produced by the blunder classifier and is **one** of the following. (This vocabulary is
**distinct** from the pattern-map keys in §4 — see the note at the end.)

**Tactical / decisive:**

| `tag` | Meaning |
|---|---|
| `immediate_threat` | An immediate win-in-one was involved — either you **had** a winning move and didn't play it (`missed_own`), or your move **gave the opponent** a winning move (`enabled_opponent`). |
| `forced_block` | Your opponent had an immediate winning threat and you **failed to block it** (always `defensive_miss`). |
| `forced_win` | A guaranteed multi-step winning sequence was at stake — you let your own forced win slip (`missed_own`) or handed the opponent one (`enabled_opponent`). |
| `double_threat` | A single move creating **two** simultaneous immediate threats (a fork) — the opponent can only block one. You missed building it, or let the opponent build it. |
| `figure_7` | A five-disc "7"-shaped structure generating two major threats in one column (a zugzwang trap the opponent can't block both of). |
| `j_shape` | A four-disc L/J-shaped cluster generating multiple minor threats equivalent to a major odd-row threat — a trap the opponent can't unravel. |
| `undercut` | Your move let the opponent place a disc **below** your threat in the same column, killing your win (their lower threat fires first). Always about *your* exposure. |
| `overcut` | A column where **your** lower-vs-upper threat geometry lets your higher threat win despite the opponent's lower one — you missed playing it. |
| `z_threat` | A major threat with an **odd** count of empty cells beneath it, conferring zugzwang ("parity") control — abandoned or handed away. |
| `claimeven` | An endgame "pairing" of empty cells (lower-odd / upper-even) that hands the controller the even squares — you lost or conceded that control. |

**Parity-aware latent threats** (generic; chosen when no more specific pattern applies):

| `tag` | Meaning |
|---|---|
| `major_threat_parity` | A latent major threat whose empty winning cell sits on **your natural parity row**, so the opponent's claimeven pairing cannot neutralize it — the stronger kind. You could have set one up, or let the opponent get theirs. |
| `major_threat_nonparity` | A latent major threat **off** your parity row — strong but neutralizable. |
| `minor_threat` | A developing two-in-a-window threat aimed at four — a longer-range plan. |

**Fallbacks** (no named pattern matched):

| `tag` | Meaning |
|---|---|
| `drawing_move` | The played move gave up a winning/holding balance for a draw — a better move would have held at least a draw. |
| `suboptimal_move` | A stronger move existed but no specific named pattern characterizes the loss; the move simply gives ground. |

**Valid `tag`+`direction` pairings** (others do not occur):

- `missed_own`: `immediate_threat`, `forced_win`, `double_threat`, `overcut`, `figure_7`,
  `j_shape`, `z_threat`, `major_threat_parity`, `major_threat_nonparity`, `minor_threat`,
  `claimeven`, `drawing_move`, `suboptimal_move`.
- `defensive_miss`: `forced_block` only.
- `enabled_opponent`: `immediate_threat`, `forced_win`, `double_threat`, `undercut`,
  `figure_7`, `j_shape`, `z_threat`, `major_threat_parity`, `major_threat_nonparity`,
  `minor_threat`, `claimeven`.

### 3.2 `direction` — whose stake

| `direction` | Meaning |
|---|---|
| `missed_own` | Playing `bestCol` would have **built `tag` for you** (or taken your own win); the move you played did not. This is about a gain you *forwent*, not necessarily something you already had and lost. |
| `defensive_miss` | The opponent **already had** an immediate threat at the pre-move board and you did not take it off the board. |
| `enabled_opponent` | Your move **handed the opponent** `tag` — a new threat/win that the better move would have avoided. |

### 3.3 `gapBucket` — severity

How much worse the played move is than the better move, qualitatively (small magnitude diffs are
deliberately not exposed).

| `gapBucket` | Meaning |
|---|---|
| `small` | Slight loss of ground; the moves are close in value. |
| `moderate` | A clear mistake; one move crosses a win↔draw or draw↔loss boundary (one side is a draw), or a mid-size score gap. |
| `large` | A severe mistake; the two moves land on **opposite** decisive outcomes (e.g. win vs. loss), or a big score gap. |

---

## 4. Pattern names (keys of the `patterns*` maps)

Each `patterns*` map is `{ <patternTag>: { cells: [<cNrM>, ...], owner, severity? } }`. A key
present means that pattern is detected on that snapshot's board (from the relevant perspective);
`cells` are the grounding squares involved. `patternsBest`/`patternsPreMove`/`patternsPostBlunder`
carry `owner:"player"`; `patternsOpponent` carries `owner:"opponent"`. Threat-window tags also
carry `severity` (see §1); structural shape tags do not. The possible keys:

| Pattern key | Meaning |
|---|---|
| `immediate_threat` | A major threat whose empty cell is **playable right now** (gravity-top) — playing it wins this move. |
| `double_threat` | A fork: two simultaneous immediate threats from one move. |
| `forced_block` | The opponent has an immediate threat and exactly one column prevents the loss. |
| `forced_win` | A guaranteed multi-step winning sequence (threat the opponent must block, then a winning continuation). |
| `forbidden_columns` | In a losing position, the columns whose play would immediately hand the opponent a win (columns you must avoid). |
| `z_threat` | A major threat with an odd number of empty cells beneath it — confers zugzwang/parity control. |
| `odd_even_threat` | A puzzle-detector pattern about choosing which minor threat to promote so the resulting major threat lands on your parity row. **Note:** this is a *detector* tag only — it is **not** a blunder `tag` (see §3.1) and never appears in the top-level `tag` field. |
| `undercut` | Your threat is dead because the opponent has a reachable threat at or below it in the same column. |
| `overcut` | Your higher major threat wins despite the opponent's lower threat in the same column (their lower threat lacks the parity to neutralize yours). |
| `figure_7` | A "7"-shaped five-disc structure generating two major threats in one column (zugzwang trap). |
| `j_shape` | An L/J-shaped four-disc cluster generating minor threats equivalent to a major odd-row threat. |
| `claimeven` | A pairing of empty cells handing the controller the even squares in the endgame. |

**Not in these maps:** `major_threat_parity`, `major_threat_nonparity`, and `minor_threat` are
**deliberately excluded** from the `patterns*` maps because their cells are duplicated — and more
richly classified — inside `threatStats` (§5.2). If you want major/minor parity-threat cells,
read `threatStats`, not `patterns*`. Also note `forbidden_columns` and `odd_even_threat` are
detector-only and never appear as a blunder `tag`.

---

## 5. Nested structures

### 5.1 `patternsBest` / `patternsPreMove` / `patternsPostBlunder` / `patternsOpponent`

Shape: `{ <patternTag>: { cells: [<cNrM>, ...] } }` (keys from §4).

The three board snapshots let you reason about what the blunder **failed to create** or
**allowed**:

- `patternsPreMove` — the baseline: patterns on the board *before* you moved (your decision
  position).
- `patternsBest` — patterns *after the better move* (what the right move would have established).
- `patternsPostBlunder` — patterns *after your move* (what you actually produced).

A pattern present in `patternsBest` but absent in `patternsPostBlunder` is something the better
move would have built and your move did not — usually the heart of a `missed_own` blunder.
`patternsOpponent` (when present) carries opponent-side structure relevant to the `direction`
(e.g. a pre-existing opponent threat for a `defensive_miss`, or the opponent's punishing threat).

### 5.2 `threatStats`

Three snapshots, each with six parity-classified buckets:

```
threatStats: {
  pre:    { ...buckets },   // before the move
  best:   { ...buckets },   // after the better move
  played: { ...buckets },   // after the played move
}
```

Each snapshot has these six buckets, every non-empty one
`{ count: <int>, cells: [<cNrM>, ...], owner, severity }`. The `owner` field matches the bucket
name (`player*` → `"player"`, `opponent*` → `"opponent"`). The `severity` field is `"major"` for
latent major buckets (the cell is not immediately playable), or `"immediate"` if all cells in the
bucket are gravity-top on the snapshot board (vanishingly rare — gravity-top majors are normally
pre-routed to `patterns.immediate_threat`). Minor buckets carry `severity:"minor"`. Empty buckets
have neither field (and are pruned away in the default output).

| Bucket | Meaning |
|---|---|
| `playerMajorParityAligned` | **Your** latent major threats whose empty winning cell is on **your** parity row (odd rows if `perspective:1`, even if `perspective:2`). Strongest — gravity hands you the cell and claimeven cannot neutralize it. |
| `playerMajorNonParity` | Your latent major threats **off** your parity row. |
| `playerMinor` | Your minor threats (two-in-a-window developing setups). |
| `opponentMajorParityAligned` | The opponent's parity-aligned latent major threats. |
| `opponentMajorNonParity` | The opponent's off-parity latent major threats. |
| `opponentMinor` | The opponent's minor threats. |

**Important:** the major buckets count **latent** threats only — a major threat whose cell is
*immediately playable* (gravity-top) is excluded here and instead surfaces as `immediate_threat`
in the `patterns*` maps. So "no major threats in `threatStats`" does **not** mean "no winning
move now" — check `patterns*` for `immediate_threat`.

Compare the same bucket across `pre → best → played` to see what the blunder changed (e.g. a
`playerMajorParityAligned` that appears in `best` but not `played` is a strong threat the better
move would have created).

### 5.3 `lookahead`

A forward search comparing the **better line** and the **played line**, plus how best play
punishes the blunder. `null` when no look-ahead ran.

```
lookahead: {
  case:                <enum>,                       // which comparison was run
  bestOutcome:         <outcome> | null,             // result of the better move, with best play
  postBlunderOutcome:  <outcome> | null,             // result of the played move, with best play
  categoryExamples:    [ { tag, ways: [{ cells, realizedOnPly }], novelInstances }, ... ],
  oppCategoryExamples: [ { tag, ways: [{ cells, realizedOnPly }], novelInstances }, ... ],
  perCategory:         [ { tag, bestInstances, playedInstances }, ... ],
}
```

**`case`** — one of:

| `case` | Meaning |
|---|---|
| `better_holds_played_loses` | The better move holds (wins or draws) but the played move **loses**. The decisive fact is that your move flips the outcome to a loss; `oppCategoryExamples` (if present) grounds how best play punishes it. |
| `both_moves_hold_better_stronger` | **Both** moves hold (neither loses), but the better move is stronger. `categoryExamples` shows the extra structure the better move opens. |
| `losing_either_way` | Even the better move loses. Carries `oppCategoryExamples` (how the opponent punishes, the dominant content) and `categoryExamples` (what *you* could still punish if the opponent slips). |

**`bestOutcome` / `postBlunderOutcome`** — the with-best-play result of each move, one of:

| Outcome | Meaning |
|---|---|
| `win_with_best_play` | This move **can force a win** with correct continuation (not an automatic win — see §1). |
| `draw_with_best_play` | With best play by both sides this move leads to a **draw** (it *holds* the draw). |
| `loss_with_best_play` | With best play the **opponent can force a win** — this move loses. |

Because the better move is never worse than the played move, `bestOutcome` is never worse than
`postBlunderOutcome`. The interesting contrast is when they differ — e.g.
`bestOutcome: draw_with_best_play`, `postBlunderOutcome: loss_with_best_play` means *"the better
move would have held the draw; your move loses."* (`null` = the outcome could not be determined.)

**`categoryExamples` / `oppCategoryExamples`** — grounded novel structure. Each entry:

| Field | Meaning |
|---|---|
| `tag` | A pattern category (from §4's vocabulary) that the search surfaced. |
| `ways` | A list of `{ cells: [<cNrM>...], realizedOnPly }` entries. `cells` are the novel squares; **`realizedOnPly` is how many plies into the future the structure first appears** (1 = the immediate resulting board; larger = a deeper line). A high `realizedOnPly` is a *projected* future structure, **not** a threat on the current board — never describe it as already present. |
| `novelInstances` | Count of distinct novel cell-sets across `ways`. |
| `owner` | `"player"` for `categoryExamples`; `"opponent"` for `oppCategoryExamples`. |
| `severity` | Threat-window severity — `"immediate"`, `"major"`, or `"minor"` — for threat tags; absent for structural tags (same vocabulary as §1 and §4). |

`categoryExamples` = structure the **better move** opens that the played move does not (your side).
`oppCategoryExamples` = the **opponent's** punishing structure on the played line (used in
`losing_either_way`, and when a blunder flips the outcome to a loss).

**`perCategory`** — a per-category instance table over every category the search saw:

| Field | Meaning |
|---|---|
| `tag` | A pattern category. |
| `bestInstances` | Distinct instances of that category on the better line. |
| `playedInstances` | Distinct instances on the played line. |

Use `perCategory` for breadth ("the better move yields more of X across the search"); use
`categoryExamples` for the specific novel squares to point at.

---

## 6. Pruning, absence, and how to avoid fabricating

- **Absence = empty/zero.** Empty maps, empty arrays, all-zero `threatStats` buckets, `null`s,
  and `false`-equivalents are pruned out of the vector. A missing field means that signal was not
  present — treat it as a genuine "nothing here," not as "unknown, fill it in."
- **An honestly quiet position yields a small vector.** If a position has little structure
  (`isSparse: true`, few patterns), do not manufacture tactics to fill space. Lean on `tag`,
  `direction`, `gapBucket`, the `*Outcome` labels, and `centerDominance`.
- **Never overstate an outcome.** A `win_with_best_play` is *winnable with correct play*, not a
  move that wins on its own. The only self-guaranteeing win is `immediate_threat` (a four
  completed this move). The `_with_best_play` suffix is there precisely so you do not claim a
  guaranteed win from a merely-winning position.
- **Only name cells that appear in the vector.** Every square you reference in an explanation
  should come from a `cells` / `ways` list, `playedCell`/`bestCell`, or be directly derivable
  from `movestring`. Do not invent coordinates.

---

## 7. Worked reading (illustrative)

Given (abbreviated):

```jsonc
{
  "movestring": "44", "perspective": 1, "playedCol": 4, "bestCol": 3,
  "playedCell": "c5r1", "bestCell": "c4r1",
  "gapBucket": "moderate", "tag": "drawing_move", "direction": "missed_own",
  "lookahead": {
    "case": "better_holds_played_loses",
    "bestOutcome": "draw_with_best_play",
    "postBlunderOutcome": "loss_with_best_play",
    "oppCategoryExamples": [ { "tag": "double_threat", "ways": [{ "cells": ["c5r4"], "realizedOnPly": 2 }], "novelInstances": 1 } ]
  }
}
```

Reading: *You (first player) played column 5; column 4 was better. The better move would have
**held a draw**; your move **loses** with best play — a moderate-to-decisive error. After your
move, best play lets the opponent build a **double threat** around `c5r4` that you can't answer.
The right move (`c4`, landing on `c4r1`) would have kept the balance.* Note what you must **not**
say: that column 4 "wins" (it only draws), or that your move loses "immediately" (the punishment
is a forced future fork, not a four completed now).
