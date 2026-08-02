# Lesson window-count overlay — design

**Date:** 2026-07-28
**Status:** approved design, not yet planned
**Scope:** `lesson-04-opening-centre`, `lesson-15-opening-sharp`

## Problem

`lesson-04` slide 4 asserts per-cell numbers in prose — *"The next cell up the
centre column sits on 13 different four-in-a-row lines — a corner cell sits on
just 3"* — and renders only two `claim` rings, asking the learner to do the
counting mentally. No lesson has ever shown a per-cell quantity; there is no
numeric-on-empty-cell and no continuous colour ramp anywhere in the app.

## Decision: geometry, not simulation

The original idea was to source the overlay from
`win_distribution_data` (Monte-Carlo `P(cell ∈ winning four | player wins)`).
Rejected in favour of exact window counts. Evidence:

Share of winning-line cells per column, simulation vs. pure counting:

| source | c1 | c2 | c3 | **c4** | c5 | c6 | c7 |
|---|---|---|---|---|---|---|---|
| static window count | .087 | .130 | .174 | **.217** | .174 | .130 | .087 |
| mp10:mp10 P1 | .073 | .123 | .183 | **.235** | .183 | .126 | .077 |
| mp25:mp25 P1 | .075 | .129 | .181 | **.231** | .178 | .130 | .077 |
| blocker:blocker P1 | .064 | .127 | .192 | **.239** | .189 | .126 | .063 |
| optimal:optimal P1 | .074 | .121 | .183 | **.241** | .183 | .123 | .074 |

The simulation reproduces the geometry and adds only a slight centre
amplification. Counting is exact, needs no confidence interval, bakes in no
policy assumption, and is already what the lesson's prose claims.

The **row** marginal is the opposite — strongly policy-dependent
(`optimal:optimal` P1 puts 92% of its mass on one row, because perfect play runs
41 plies and the win lands near the top; `mp25:mp25` P1 puts 28% on the bottom
row). A 2D simulation overlay would therefore be a picture of simulated game
length as much as of cell value. Not shipped.

The simulation retains one asset counting cannot produce: parity (P1 wins on odd
rows, P2 on even). That belongs to a future parity lesson, not here. Out of
scope.

## Semantics

For each **empty** cell, the stored number is the count of four-windows through
that cell containing **no opponent disc**, from the perspective of the player to
move. Own discs do not reduce the count; only the opponent's do.

- **Mover** is derived from movestring parity. No perspective field.
- **Occupied cells** carry no number.
- On an empty board no window has an opponent disc, so the count is exactly the
  geometric constant. One formula covers both cases:

```
row5   3  4  5  7  5  4  3
row4   4  6  8 10  8  6  4
row3   5  8 11 13 11  8  5      69 windows total
row2   5  8 11 13 11  8  5
row1   4  6  8 10  8  6  4
row0   3  4  5  7  5  4  3
```

Worked example — `lesson-15` slide 2, movestring `3332223362`, green to move
(movestring digits are **0-indexed**; digit `3` is display column 4):

```
  2   4   3   6   4   3   3
  2   2   3   O   3   4   2
  4   4   O   X   7   5   5
  4   4   O   X   7   5   5
  2   2   X   O   3   4   2
  1   2   O   X   2   2   X
```

Column 2 has collapsed to 2–4 where gray owns cells, while column 4 still holds
7. That decay is the teaching point.

## Rendering

- Background tint at `count / 13` — a **fixed** scale, identical on every board.
  A mid-game board reads visibly dimmer than the opening, which preserves the
  decay signal across slides. A per-board max was considered and rejected: it
  renormalises the decay away, so shade would mean "best here" and never "good".
- The integer is drawn in the cell alongside the tint. The gradient carries the
  message pre-attentively; the number makes the prose land exactly.
- Cells at 0 render the digit with no tint — "nothing can ever be won through
  here".
- Hue: red `--red` `#e8392e` (rgb 232,57,46), per a post-implementation request
  (2026-07-28). Originally shipped violet `#8b5cf6`.

  Caveat accepted with the change: red is also the app's danger colour —
  `--threat-red` is rgb(232,84,62), used by the `tr` overlay — so an adjacent hue
  now carries the opposite meaning (opportunity, not danger). The two can never
  land on one cell, because the tint is suppressed wherever a per-cell `overlays`
  entry already colours it, and that covers every `tr` case. A unit test pins that
  the tint is not the `tr` triple.

## Storage — precomputed cache, never hand-authored

The counts are written into the lesson JSON as a derived cache; serving is a
plain field read.

- Pure `computeWindowCounts(movestring)` lives server-side only. The client
  never computes — it renders a stored array.
- `saveLessonFile(dir, lesson, oldId)` (`server/lessonAdmin.js:18`) is the single
  write seam for both `POST /api/admin/lessons` and `PUT /api/admin/lessons/:id`
  (`server/index.js:886`, `:902`). Recomputing there covers every write path, so
  editing a board in the editor recomputes the counts with nothing for the author
  to remember.
- A content test recomputes from `slide.movestring` and asserts deep equality
  with the stored array. Staleness becomes a red test, not a wrong number on
  screen.
- `localizeLesson` starts from `stripEsKeys(slide)`
  (`server/lessonLoader.js:276`), so a new non-localized slide field passes
  through untouched. No loader change needed for the counts.
- `validateLesson` gets a permissive shape check only. The loader **excludes an
  invalid file entirely** (`lessonLoader.js:79-160`), so strictness lives in the
  content test, not the validator — same split already used for
  `windowHighlights`.

Known limitation: the editor's live Board preview shows the previous counts until
save, because recompute happens server-side. Accepted; the admin API already
calls `reloadLessons()`, so the refresh is immediate after save.

### Shape

Concept-slide field `windowCounts`: a 6×7 array with row 0 = bottom (matching the
project's 0-indexed convention and the `win_distribution` heatmap layout), `null`
for occupied cells. The Board prop carries the same name.

### Slides that opt in

`lesson-04` slides 1, 2 and 4; all three `lesson-15` concept slides. Socratic
nodes are excluded — concept slides only, as with `windowHighlights`.

### Legend copy

- `label`: "Four-in-a-rows still open to you through each square"
- `label_es`: "Líneas de cuatro todavía abiertas para vos por cada casilla"

Wording is deliberate: **open to you**, not *winnable by you*. See "Parity is out of scope".

## Parity is out of scope — deliberately

Window counts are vertically symmetric, so the overlay expresses the **column** fact and
cannot express the **row** fact. Checked against the simulation before accepting this:

- **Parity is a robust fact.** P1's odd-row win mass exceeds 0.5 in all 14 pairings where
  P1 wins; P2's even-row mass exceeds 0.5 in all 12 where P2 wins. Direction never flips
  (magnitude ranges 0.54–0.96).
- **The hottest single cell is not.** Column 4 is hottest in 15/15 pairings, but the row
  swings: `mp10:mp10` → row 5 (.363), `mp25:mp25` → row 1 (.286), `blocker:blocker` →
  row 3 (.329), `optimal:blocker` → row 1 (.333). The 0.36 at row 5 col 4 is the
  `mp10:mp10` signature, not a property of the board — at a 25% mistake rate that same
  cell falls to .129. Teaching it would teach the simulated opponent's error rate.

Conclusion: column is geometry, row is parity, the specific cell is noise. Parity is
already owned by `lesson-07-odd-rows-belong-to-red` ("Odd Rows Belong to Green"), three
lessons downstream, so nothing is lost by leaving it out of lessons 04 and 15.

The residual hazard is a learner reading the two 13-cells on slide 1 as "the best squares".
Handled with copy, not code: the legend says lines *open through* a square, and slides 1
and 4 each carry a sentence scoping the claim and forward-referencing the parity lesson.

## Plumbing

- New Board prop rendering as a third branch of the existing `zhSvg` memo, which
  already has `center(col,row)` and `cellW` (`Board.jsx:130-138`) and mounts an
  absolutely-positioned `pointerEvents:'none'` SVG at `zIndex:2`
  (`Board.jsx:191`).
- `stepLabels` is **unusable** here: it is keyed `"row,col"` (row-major, unlike
  every other overlay's `{c,r}`) and renders only when `value !== 'empty'`
  (`Board.jsx:341`), i.e. occupied cells only.
- `overlays` is a locked cross-epic enum (`tg/td/tr/claim/win`,
  `frontend-conventions.md:283`) and is not extended.
- `ConceptScreen` must `useMemo` the new array prop — `boardPropsAreEqual`
  value-compares `board` only and falls back to `Object.is` for everything else
  (`src/lib/board.js:190-202`).
- Legend row with an `_es` sibling, following `windowHighlights`' pattern of
  rendering its own legend rows rather than routing through `legendItems`
  (`ConceptScreen.jsx:197-214`) — `legendItems` is gated on a matching overlay
  type (`tests/unit/lessonContent.test.js:117-118`) and would reject this.

## Content change: lesson-04 slide 4

Slide 4's board is `333` with **gray** to move. Live counts there are 10 at
`(c3,r3)` and 2 at `(c0,r0)`, not the 13 and 3 the coach text claims. Both drops
are correct: green's discs at `(3,0)` and `(3,2)` kill all three vertical windows
through `(3,3)`, and green's disc at `(3,0)` kills the corner's horizontal
window.

**Resolution: update the prose to 10 and 2.** One formula everywhere, no
geometric/live mode switch, and the numbers on screen match the text. The lesson
becomes a claim about the actual position rather than about abstract board
geometry. `infoProse` on that slide (which cites 69 total, 13/7/3) needs the same
treatment.

## Out of scope

- Simulation-backed overlays of any kind.
- A parity lesson.
- Any lesson other than 04 and 15. The flag is per-slide, so extending later is
  content work, not code work.
