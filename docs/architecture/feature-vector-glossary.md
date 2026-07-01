# Blunder-Reason Feature Vector — Glossary for an LLM Reader

You are reading a **blunder-reason feature vector**: a compact, solver-grounded description of a
single Connect Four decision in which the move actually **played** is compared against the engine's
**best** move. Your job, when given one, is to explain **why the played move was a blunder** using
only the facts in this vector and the board its `movestring` describes — naming reproducible board
features, never inventing tactics, cells, or lines that the vector does not carry.

This vector is produced by the reason engine (`computeReason(movestring, playedCol)`). In production
it is computed **live from the game position**; for offline evaluation a frozen subset is read from a
corpus. Either way the shape is identical, and **everything you need is in the vector** — if a fact
isn't here, treat it as "not established," not "go derive it from the board."

This file defines **every field and every enumerated value** the vector can contain. It is
self-contained.

**The vector comes in two shapes, decided by the top-level `route` field.** Read `route` first:

- **`route: "realized_denied"`** — a *tag-first* explanation for a short, cell-nameable tactic
  (a conceded/handed/missed immediate threat or fork). Its halves are a **`realized_pattern`** (the
  one-move tactic) and a **`denial`** (the solver proof it is prevented). See §3b. `tag`/`direction`
  are present; `gate` is `null`.
- **`route` absent** — the default *sign-taxonomy* explanation (the 5 `case`s, §2), whose halves are
  `winning_line` / `denial` / `neutralization` / `conditional_swindle`.

Every other field below is shared. Where a field behaves differently under `route: "realized_denied"`,
it is called out.

---

## 0. How to read a reason vector (start here)

1. The vector describes **one decision**: at board `movestring`, the player to move played column
   `playedCol` when `bestCol` was better.
2. **Check `route` first.** If `route: "realized_denied"`, jump to §3b — the explanation is a named
   tactic (`tag`) that was missed, conceded, or handed over (`direction`), and its two halves are a
   `realized_pattern` + a `denial`. If `route` is absent, use the 5-case sign taxonomy below.
   (`case` is still set on a `realized_denied` vector for continuity, but `route` governs the shape.)
3. **`case`** is the single most important field of a **sign-taxonomy** vector. It is one of five
   sign-classified outcomes (§2) and tells you the *shape* of the whole explanation — e.g.
   `win_to_draw` = "you had a forced win and threw it away to a draw."
4. The reason always has **two halves, in two separate fields** (§3):
   - **`lostResource`** — what the **best** move preserved (the win, the draw-holding defense, or the
     surviving swindle).
   - **`opponentPunishment`** — how the **played** move loses or fails to win (the opponent's reply).
   These are **never merged.** A cell in one half is not a cell in the other unless the `tie` (§4)
   explicitly says they coincide. (On a `realized_denied` vector the two halves are still
   `lostResource`/`opponentPunishment`, but which one is the tactic vs. the proof depends on
   `direction` — see §3b.)
5. **`opponentPunishment.tie`** states the verified *relationship* between the two halves — whether
   the punishment exploits the very resource you gave up (`tied`), is unrelated to it
   (`independent`), or is a speed comparison (`temporal`). `independent` is honest information, not a
   gap.
6. **`replyHistogram`** and **`gate`** quantify how much counterplay survived.

A field that is **absent** was empty/null/zero-length and was pruned away (§ pruning). Absence means
"this signal was not present" — never "unknown, fill it in."

---

## 1. Global conventions

- **Cell strings `cNrM`.** Every cell is `cNrM` = **column N, row M, both 1-indexed for display**:
  `c1r1` is bottom-left, `c7r6` top-right. Columns count left→right (1–7), rows bottom→top (1–6).
  (Internally the engine is 0-indexed, but every `cNrM` string you see is already 1-indexed — read
  it literally.)
- **Column integers are 0-indexed.** `playedCol`, `bestCol`, and the per-move `col` inside a `line`
  are **0-indexed** (0 = leftmost = display column 1). **Add 1** to get the display column / the `cN`
  of a cell. (So `bestCol: 1` means "play column 2 in display.")
- **Who is "you".** `player` is the side whose move is being explained — call them **"you"**;
  `opponent` is the other side. Both are `1` or `2`.
  - `player: 1` — the **first player** (moved first); wins by completing four on **odd** rows
    (1, 3, 5). Displayed elsewhere as "Green".
  - `player: 2` — the **second player**; wins on **even** rows (2, 4, 6). Displayed as "Gray".
  - The `lostResource` half is always **your** resource; the `opponentPunishment` half is always the
    **opponent's** reply.
- **No solver scores.** You do **not** receive the solver's numeric evaluations — not the
  per-column array, not `bestScore`/`playedScore`, not the per-move `score` inside a `line`. They are
  deliberately withheld so your explanation is grounded in the **board structure**, never in a number
  like "+18". The outcome (win / draw / loss, for both the best and the played move) comes entirely
  from **`case`** (§2), whose name IS the sign pair. Never assert or invent a score, a "you win in N,"
  or a "how soon" magnitude — if you feel the need to cite a number, you are grounding on data you
  were not given. Use `pliesToEnd` (§ register) when you need "how far off" — it is a *counted* ply
  distance along a walked line, the only distance signal in the vector.
- **"With best play."** Every outcome word means the game-theoretic result **assuming both sides
  play optimally from here on**. A win means you *can force* a win with correct continuation — it is
  **not** guaranteed by the single move. The only move that wins by itself is one that completes
  four-in-a-row (`register: immediate` on an immediate win).
- **`register`** (on each half) says **how far** the resolution is and therefore **how to render**
  it — `immediate`, `forced_sequence`, or `parity`. See § register. It governs whether a literal
  move `line` is shown.

---

## 2. Top-level fields and the 5-case taxonomy

| Field | Type | Meaning |
|---|---|---|
| `movestring` | string | The board **before** the move: a sequence of 0-indexed columns. `""` = empty board. The board you reason about. |
| `playedCol` | int (0-indexed) | The column actually played — the move under scrutiny. |
| `bestCol` | int (0-indexed) | The column the engine treats as best (the "better move"). Trust this field; add 1 for display. |
| `discs` | int | Number of discs on `movestring` (its length). |
| `boardState` | enum | `opening` (<15 discs) / `mid-game` (<30) / `closing` (≥30). Coarse phase only. |
| `player` | `1`\|`2` | The side who made the move ("you"). |
| `opponent` | `1`\|`2` | The other side. |
| `case` | enum | The sign-classified outcome — the shape of a **sign-taxonomy** explanation, and your ONLY source for the win/draw/loss outcomes (the underlying `bestScore`/`playedScore` are withheld, §1). Still set on a `realized_denied` vector, but there `route` governs the shape. |
| `route` | `"realized_denied"`\|absent | Present (= `"realized_denied"`) when a tag-first tactic explanation applies (§3b). Absent = the default sign-taxonomy shape. **Read this before `case`.** |
| `tag` | enum\|absent | `realized_denied` only: the named tactic (§3b tag list) — the *what*. |
| `direction` | enum\|absent | `realized_denied` only: `missed_own` / `enabled_opponent` / `defensive_miss` — the *who* (§3b). |
| `notABlunder` | bool | `true` only for out-of-scope decisions (`win_to_slower_win`, exhausted `lose_to_faster_lose`, draws). In a blunder vector this is `false`. |
| `lostResource` | object | Half (a): what the **best** move preserved. §3, § per-case. |
| `opponentPunishment` | object | Half (b): how the **played** move loses/fails. §3, § per-case. |
| `replyHistogram` | object\|absent | Counterplay counts after each move. § replyHistogram. |
| `gate` | object\|absent | `lose_to_faster_lose` only: the swindle-gate result. § gate. |

### The five cases (`case`)

`case` **is** the `(bestScore, playedScore)` sign pair (the scores themselves are withheld — §1).
Read the outcome off the case name; each has a fixed **narrative shape** — the one sentence your
explanation should produce:

| `case` | Signs (best, played) | What happened | Shape of your explanation |
|---|---|---|---|
| `win_to_draw` | (+, 0) | You had a forced win; the played move only draws. | "You could have forced a win (`lostResource`); the move you played lets the opponent neutralize every threat (`opponentPunishment`), so it only draws." |
| `win_to_lose` | (+, −) | You had a forced win; the played move loses. | "You had a forced win (`lostResource`); your move instead lets the opponent force *their* win (`opponentPunishment`)." |
| `draw_to_lose` | (0, −) | You were holding a draw; the played move loses. | "You were holding the draw by occupying `lostResource.cell` (inside the opponent's winning window); your move gives that square up and the opponent now completes their four (`opponentPunishment`)." |
| `lose_to_faster_lose` | (−, −) | You were already losing, but the best move kept a practical swindle; the played move loses faster. | "You were lost either way, but the best move kept a real swindle (`lostResource`: if the opponent slips you still win); your move throws it away and loses sooner (`tie.temporal`)." |
| `win_to_slower_win` | (+, +) | You'd still win, just slower. | **Out of scope** — `notABlunder: true`; you will not be asked to explain these. |

> **No solver scores at all.** The vector deliberately omits every solver evaluation — the full
> per-column array **and** `bestScore`/`playedScore`. Read the outcome from `case`; do not claim a
> score, a per-column value, or a numeric "how soon."

---

## 3. The two halves — `lostResource` and `opponentPunishment`

Every blunder reason is **two solver-grounded walks**, kept in **two separate fields** (this
separation is a hard invariant — never merge their cells):

- **`lostResource`** (half a) — one bounded optimal-line walk from `movestring + bestCol`. It is
  **what the best move preserved**: a winning line/fork, a draw-holding defensive occupation, or a
  surviving swindle. Its `kind` varies by case (§ per-case).
- **`opponentPunishment`** (half b) — one opponent-optimal walk from `movestring + playedCol`. It is
  **how the played move is punished**: the opponent's winning line, their fork-denial, or their one
  saving reply.

Both halves share a common sub-shape (fields that are present depend on `kind`/`register`):

| Field | Meaning |
|---|---|
| `kind` | What this half *is*: `winning_line` / `denial` / `neutralization` / `conditional_swindle` (sign-taxonomy), or `realized_pattern` (`realized_denied` route, §3b). See § per-case. |
| `register` | `immediate` / `forced_sequence` / `parity` — how far off, and whether the `line` is shown. § register. |
| `completingCell` | The `cNrM` square that completes the four (or, for a fork, a representative fork cell). |
| `window` | The 4-cell winning window `[cNrM×4]` the line/fork rides. |
| `pliesToEnd` | Counted plies from this half's root to its terminal/fork (a real move count; the only distance signal — solver scores are withheld). |
| `line` | The literal move sequence `[{ply, mover, col, cell}, …]` **when the register shows it**; `null`/absent for `parity` (too long to teach). Teaches the move order and squares — no per-move score is included. § register. |
| `finalMovestring` | The board on which `completingCell` is occupied (the end of the walk). |
| `entryCell` | The square where this half's action begins (first move of `line`, or the completing/occupying cell). |
| `anchorCells` | The **move-level** squares that *define* this resource — the squares the `tie` (§4) is checked against. For a fork: all cells of the fork windows. For a non-fork win: the winning-move landing squares. For a draw-hold denial: the single occupied cell. |
| `tacticTag` | A named tactic (§ tactic naming) or **`null`**. Null is correct, not a gap. |
| `tacticCells` | The cells of the named tactic (present only when `tacticTag` is non-null). |
| `tacticFromDiff` | `true` if the tactic is something the best move builds that the played move does not. |

Forks, denials, parity wins, swindles, and neutralizations each add their own fields — defined
per-case next.

---

## 3a. Per-case field shapes

### `win_to_draw` and `win_to_lose` — `lostResource.kind = "winning_line"`

The best move's winning walk. **Two sub-shapes:**

- **Fork-stopped** (the common, teachable shape): the walk stops at the deciding **double-threat
  fork** rather than walking to the completed four. Extra fields:
  - `terminal: "fork"`, `forkCase: "A"` (≥2 gravity-top winning cells) or `"B"` (a stacked
    pair in one column),
  - `forkCells` — the fork's key squares, `forkWindows` — the 4-windows that make it unstoppable.
  - `register` is `immediate` (fork already present at the decision) or `forced_sequence` (a short
    line leads to it); `anchorCells` = every cell of the fork windows.
  - Narrative: "the best move builds an unstoppable fork at `forkCells` — two threats the opponent
    can't both answer."
- **Parity win** (no fork on the whole line — a deep zugzwang win): `register: "parity"`, `line:
  null`, plus **`parityAttribution`** (§ parityAttribution) describing the controlling group instead
  of a literal line. `anchorCells` = the winning-move landing squares.

For `win_to_lose`, `opponentPunishment.kind = "winning_line"` too — the **opponent's** own
fork-stopped/parity winning walk (the same shape, opponent perspective). Its `tie` (§4) is spatial.

### `win_to_draw` — `opponentPunishment` is a **denial** or a **neutralization**

- **Fork case → `kind: "denial"`** (an occupation witness). The opponent, under optimal play,
  **occupies a cell of your lost fork's window**, killing it:
  - `verdict: "occupation"` — fields `cell` (the killing square), `window` (the window it killed),
    `line` (the optimal walk to that moment), `finalMovestring`, `exhaustive: true`.
  - `verdict: "no_occupation"` — the draw held within the depth cap without the opponent ever taking
    a pattern cell; `exhaustive` distinguishes a confirmed full-walk (`true`) from a budget cap
    (`false`). No `cell`.
  - **Read denial as TWO separate claims, never collapsed** (§ denial semantics).
- **Non-fork case → `kind: "neutralization"`** — the opponent's **single saving reply**:
  `completingCell` = the save square, `savingCol` (0-indexed), `savingReplyCount` (= 1 when it is
  the only drawing reply). Narrative: "the square that would have won for you is the opponent's only
  drawing reply."

### `draw_to_lose` — `lostResource.kind = "denial"`, `opponentPunishment.kind = "winning_line"`

This case is **computed half-(b)-first**: the engine finds the opponent's winning line after the
played move (`opponentPunishment`), then shows how the **best** move denied that exact window.

- `opponentPunishment` = the opponent's winning walk (`winning_line`; often `register: parity` with
  `parityAttribution`, `line: null`). `completingCell`/`window` = where/how the opponent now wins.
- `lostResource` = `kind: "denial"`, `verdict: "occupation"` (normally): `cell` = the square the
  **best** move occupies **inside the opponent's conceded `window`**, holding the draw. `register`
  is `immediate` (the defensive occupation is the best move itself — a ply-0 hold) or
  `forced_sequence`. `anchorCells = [cell]`.
- The `tie` is **constructive and window-aware**: `opponentPunishment.tie = { kind: "tied",
  sharedCells: [lostResource.cell] }` — the very square that held the draw lies inside the window the
  opponent now completes. **The two halves still describe different things** (your defensive
  occupation vs. their completing cell `opponentPunishment.completingCell`); the tie only asserts the
  hold-square is *inside* the opponent's window. Narrative: "your best move sits on `cell`, plugging
  the opponent's winning window `window`; the move you played vacates it and the opponent fills it."

### `lose_to_faster_lose` — `lostResource.kind = "conditional_swindle"`, `opponentPunishment.kind = "winning_line"`

You are losing either way; the move is a blunder only because the best move kept a **practical
swindle** (a reachable opponent mistake that would let you win/draw) that the played move discards.

- `lostResource` = `conditional_swindle` — the win you'd get **if the opponent slips**. Extra field
  `witness: { node, devCol, devCols, oppPlies }`: `devCols` = the opponent replies that would let you
  back in (0-indexed columns), `oppPlies` = how deep the slip is (0 = the opponent's very next move —
  the most practical chance). It may itself fork-stop (`terminal: "fork"`). `anchorCells` = the
  deviation/practical-chance square.
- `opponentPunishment` = the **faster** forced loss your played move walks into (`winning_line`,
  opponent perspective).
- `tie.kind = "temporal"` (§4): `playedPlies` vs `swindlePlies`, `tied: true` when the played loss is
  strictly faster. Narrative: "you were lost, but the best move kept a swindle — if the opponent
  played any of `devCols` you'd still win; your move loses in `playedPlies` plies instead."
- See also `gate` (§ gate) for whether the swindle search was exhaustive.

---

## 3b. The realized/denied route (`route: "realized_denied"`)

When the blunder is a **short, cell-nameable tactic**, the vector uses a tag-first shape instead of
the sign taxonomy. It answers two questions directly:

- **`tag`** — *what* tactic is at stake (a name from `tagBlunder`, §3b tag list).
- **`direction`** — *who* the tactic belongs to and how it changed hands:
  - **`missed_own`** — **you** could have formed/held the tactic and didn't.
  - **`enabled_opponent`** — your move **handed the opponent** the tactic (a new one).
  - **`defensive_miss`** — the opponent **already had** the tactic (an immediate threat) and you
    failed to remove it.

The two halves are still `lostResource` (a) and `opponentPunishment` (b), but each is one of:

- **`kind: "realized_pattern"`** — the tactic **formed in one move**, read straight from the board
  detectors (no search). Fields: `tag`, `owner` (`1`\|`2`, who holds the pattern), `cells` (its key
  squares), `windows` (the 4-cell winning windows), `completingCell`/`window`, `register:
  "immediate"`, `finalMovestring`, `entryCell`, `anchorCells`. Narrative: "one drop makes it — here
  are the cells."
- **`kind: "denial"`** — the **solver proof** the tactic is (or would be) prevented under optimal
  play: an occupation witness, identical in shape to the sign-engine denial (§5). `verdict:
  "occupation"` carries the killing `cell` + `window` + `line`; `no_occupation` is the honest "no
  witness within budget." For `immediate_threat`/`forced_block` the denial is a **single block** (a
  ply-0 occupation); for `double_threat`/`figure_7` it is the multi-move fork-dismantling walk.

**Which half is which depends on who OWNS the tactic** (the `owner` of the `realized_pattern`):

| `direction` | pattern owner | `lostResource` (a) | `opponentPunishment` (b) |
|---|---|---|---|
| `missed_own` | **you** | `realized_pattern` — the tactic you could have formed | `denial` — the opponent prevents you re-forming it |
| `enabled_opponent` | opponent | `denial` — the defense you had (you would have prevented it) | `realized_pattern` — the tactic you handed over |
| `defensive_miss` | opponent | `denial` — the block you had | `realized_pattern` — the threat the opponent completes |

`opponentPunishment.tie` is set the same way as everywhere else (§4): `tied` with
`sharedCells: [cell]` when the denial's occupied cell coincides with the pattern (the usual case for
a conceded/missed immediate threat), else `independent`. `gate` is `null` on this route.

### `tag` — the full `tagBlunder` vocabulary

`tag` (and the half-level `tacticTag`, §7) are drawn from this fixed set. Only the **four routed**
tags produce a `realized_denied` vector; every other tag is explained through the sign taxonomy (its
board simply wasn't a one-move tactic — a deep fork, a structural/zugzwang pattern, or no pattern at
all — so it fell through).

| `tag` | Meaning | Routed to realized/denied? |
|---|---|---|
| `immediate_threat` | A win-in-one (three-in-line with a gravity-top open fourth). | **Yes** |
| `forced_block` | The opponent has an immediate threat that must be blocked (only ever `defensive_miss`). | **Yes** |
| `double_threat` | A fork: two winning threats the opponent can't both answer (Case A = ≥2 gravity-top; Case B = stacked pair in one column). | **Yes** |
| `figure_7` | A Case-B stacked fork, named specifically. **`tagBlunder` never assigns this** (it prefers `double_threat`); the router *refines* a Case-B fork's emitted `tag` to `figure_7` via `forkCase`. | **Yes** |
| `forced_win` | A forced winning sequence (not a one-move pattern). | No → sign taxonomy |
| `j_shape` | Allen J-configuration (three minor threats winning in zugzwang — a precursor). | No |
| `z_threat` | Odd/even zugzwang threat. | No |
| `overcut` / `undercut` | A threat overcut/undercut in the same column (`undercut` uses direction `enabled_self`). | No |
| `claimeven` | Claimeven parity control. | No |
| `major_threat_parity` / `major_threat_nonparity` | A major (3-of-4) threat, parity-aligned or not. | No |
| `minor_threat` | A minor (2-of-4) latent threat. | No |
| `drawing_move` | Score fallback: a win dropped to a draw with no named pattern. | No |
| `suboptimal_move` | Score fallback: sub-optimal with no named pattern. | No |

`direction` values across the whole vocabulary: `missed_own`, `enabled_opponent`, `defensive_miss`,
and `enabled_self` (the last used only by `undercut`, which is never routed). On a `realized_denied`
vector `direction` is always one of the first three.

### Worked reading — a `defensive_miss` (board `3321234543`, you = player 1, played col 0, best col 3)

```jsonc
{
  "movestring": "3321234543", "playedCol": 0, "bestCol": 3,
  "player": 1, "opponent": 2,
  "case": "lose_to_faster_lose", "route": "realized_denied",
  "tag": "forced_block", "direction": "defensive_miss", "gate": null,
  "lostResource": {
    "kind": "denial", "verdict": "occupation", "register": "immediate",
    "cell": "c4r5", "window": ["c4r2","c4r3","c4r4","c4r5"], "anchorCells": ["c4r5"]
  },
  "opponentPunishment": {
    "kind": "realized_pattern", "tag": "forced_block", "owner": 2,
    "completingCell": "c4r5", "window": ["c4r2","c4r3","c4r4","c4r5"],
    "tie": { "kind": "tied", "sharedCells": ["c4r5"] }
  }
}
```

Reading: *You (player 1) are losing either way, but that is not the lesson. The opponent already
held an **immediate threat** — three in column 4 (`c4r2`–`c4r4`) with `c4r5` open and playable
(`opponentPunishment`, `realized_pattern`, owner 2). The **block was `c4r5`** (`bestCol 3`), and your
best move would have taken it (`lostResource`, `denial`/`occupation` at `c4r5`). You played column 1
instead, so the opponent completes the four at `c4r5` — the very square you failed to block
(`tie: tied`).* Do not reach for the sign-taxonomy swindle machinery here (`gate` is `null`); the
lesson is simply the conceded immediate threat.

---

## 4. The tie — `opponentPunishment.tie`

`tie` states the **verified relationship** between half (b) and half (a). Always one of:

| `tie.kind` | Fields | Meaning / what to say |
|---|---|---|
| `tied` | `sharedCells: [cNrM, …]` | The punishment exploits a **square of the lost resource**. `win_to_draw`: the opponent's denial cell / saving reply is a cell of your lost win. `win_to_lose`: the opponent wins on a square your resource occupied. `draw_to_lose`: your draw-holding square is inside the opponent's winning window. **This is the heart of the lesson** — name the shared square. |
| `independent` | `sharedCells: []` | **No shared square** — the punishment is geometrically unrelated to the lost resource. This is **honest information**, not a missing signal: e.g. a `win_to_draw` denial that drew without the opponent ever taking a pattern cell. Do **not** invent a connection; say the two are independent. |
| `temporal` | `playedPlies`, `swindlePlies`, `tied` | `lose_to_faster_lose` only: the relationship is **speed**, not a shared cell — the played move loses in `playedPlies` vs the swindle's `swindlePlies`. |

**Never upgrade `independent` to `tied`.** If `sharedCells` is empty, the explanation must not claim
"you handed it to them on that square."

---

## 5. Denial / occupation semantics (`kind: "denial"`)

A `denial` half (the `win_to_draw` punishment and the `draw_to_lose` lost resource) carries **two
separate claims that must never be collapsed**:

- **LOCAL (proved by the witness):** "the denier occupies `cell`, killing window `window`." This is
  verified cell-by-cell (the window was live before the move, dead after). It is a claim about **one
  square and one window**.
- **GLOBAL (proved by the outcome / `case`):** "and the line only draws — the win never forms." This
  is carried by the case, as a **separate** clause.

**Do NOT merge these into "this move refutes everything"** or "this single move kills the win." The
honest statement is the conjunction of a *local* occupation and a *global* drawn result. For
`draw_to_lose` the roles invert (the **player's** best move is the denier holding the draw), but the
two-claim rule is identical.

`verdict: "no_occupation"` (win_to_draw only) means no occupation witness was found:
`exhaustive: true` = the optimal line was walked to a terminal draw (confirmed the opponent never
needs a pattern cell); `exhaustive: false` = only the depth budget was hit ("no witness within
budget" — an honest residual, not proof). With `no_occupation`, `tie` is `independent`.

---

## 6. `register`, `line`, `finalMovestring` — when a line is shown

`register` is derived engine-side from how soon the resolution is (or directly from a fork node) and
is given to you ready-made — you never compute it:

| `register` | Meaning | `line` |
|---|---|---|
| `immediate` | Resolves now / the fork already exists. State it as a fact: "column C completes your four at `<cell>`." | empty/short |
| `forced_sequence` | A short forced line (≈≤6 plies). **The most instructive form** — walk through `line` move by move. | shown |
| `parity` | A long zugzwang resolution (>~12 plies). **Too long to teach as a sequence** — `line` is `null`. Describe the structure via `parityAttribution` instead. | `null` |

- `line` entries are `{ ply, mover, col, cell }`: `mover` is `1`/`2`, `col` is **0-indexed**,
  `cell` is the `cNrM` landing square. (No per-move `score` — solver evaluations are withheld, §1.)
- `finalMovestring` is the board at the end of the walk (where `completingCell` is occupied). You may
  reference cells from `line`/`window`/`completingCell`; do **not** invent cells beyond them.
- A `null` line on a `parity` register is **expected** — it is "the win is real but too deep to
  spell out," not a missing signal. Lean on `parityAttribution`.

---

## 7. `parityAttribution`, `anchorCells`, `tacticTag` (gated naming)

### `parityAttribution` (parity-register wins only)

Describes the controlling structure of a deep win when the line is suppressed. Shape:

| Field | Meaning |
|---|---|
| `nameable` | `true` if a single controlling group dominates; `false` (with `reason`) for an unnameable multi-window board-fill — then say only "a parity/zugzwang advantage," no geometry. |
| `controllingGroup` | The 4-cell window `[cNrM×4]` whose parity decides the game. |
| `ownDiscs`, `groupKind` | How many of your discs are in it; `"major"` (3) or `"minor"` (2). |
| `empties` | Per empty cell `{ cell, zcount, parity }` — `zcount` = height-relative count; `parity` `odd`/`even`. |
| `leverCells` | The **odd**-parity empties — the zugzwang levers (z-threats). |
| `forcedFirstRequired` | `true` when there is **no** lever — the win rests on a forced-first / Aftereven argument (deferred; do not name a specific rule). |
| `completingCell` | The cell that eventually completes the four. |
| `parityNamingDeferred`, `namedRule: null` | The canonical Allis/V-rule **name is intentionally not given.** Describe the group + lever cells; do **not** invent a rule name. |

Narrative for parity wins: "the win is a long zugzwang — you control the parity of group
`controllingGroup` (lever at `leverCells`), so the opponent eventually has to give you
`completingCell`." Keep it structural; never fabricate a forced line.

### `optimalWinSamples` — evidence-only; **not in the vector you read**

For the same parity-register wins, the engine also samples the *distribution* of optimal winning
realizations (many seeded random optimal walks from `movestring + bestCol`): `{ n, distinct,
orientation: {horizontal, vertical, diagonal}, oddCompletingFraction, lines: [{ window,
completingCell, orientation, completingParity, pliesToEnd, count }] }`. It lives on the raw evidence
object (inspectable in `/admin/fv-suff`'s evidence view) as `lostResource.optimalWinSamples`, and
exists to answer "is this win always odd? is its orientation fixed, or just an artifact of the one
walked line?".

It is a **diagnostic, deliberately stripped from the narrator vector** (`toNarratorVector` removes it
— see `HIDDEN_HALF_FIELDS`). **You will never see it, and you must not reference or expect it.** If
you find yourself reasoning about it, that is a sign you are reading raw evidence rather than the
narrator vector. The teachable content of a parity win is `parityAttribution` above — use that.

### `anchorCells`

The move-level squares that **define** the lost resource; the `tie` (§4) is verified against these
(not against the eventual completing cell). Use them when you need to point at "the resource you gave
up." They are already listed in the vector — do not derive your own.

### `tacticTag` — a name, gated by the solver (may be `null`)

Each half may carry a `tacticTag` (with `tacticCells`) — a named tactic from the production
classifier (drawn from the same vocabulary as `tag`; the full list is in §3b —
`double_threat`, `immediate_threat`, `figure_7`, `j_shape`, `undercut`, `overcut`, `z_threat`,
`claimeven`, `major_threat_parity`, …). Note this half-level `tacticTag` is distinct from the
top-level `tag`: `tag` is the `tagBlunder` classification that *routed* the vector, while `tacticTag`
is a solver-gated name on a sign-taxonomy half. It is admitted **only** when it is consistent
with the solver-proven nature and location of the win. **`tacticTag: null` is common and correct** —
it means no named tactic passed the gate, **not** that nothing happened. When `tacticTag` is present,
you may name it; when it is `null`, explain the mechanism from the half's `window`/`line`/fork/parity
fields **without** inventing a tactic name. `tacticFromDiff: true` means the best move builds this
tactic and the played move does not — a strong "this is what you gave up" signal.

---

## 8. `replyHistogram` and `gate`

### `replyHistogram` — `{ afterBest, afterPlayed }`

Counts of the **opponent's non-losing replies** after each move (how much counterplay each move
leaves the opponent). Typical readings:
- `win_to_draw`: `afterBest: 0` (the win leaves the opponent no escape), `afterPlayed: 1` (the draw
  move leaves the opponent exactly one saving reply).
- A larger `afterPlayed` than `afterBest` quantifies "how much you let the opponent off the hook."

It is a counterplay magnitude, not a geometry claim — don't name cells from it.

### `gate` — `lose_to_faster_lose` only

The swindle-gate result: `{ ran, exhaustive, verdict, witness, nodesVisited }`.
- `verdict: "Blunder"` — a reachable swindle exists (the move is a real blunder). `witness` = `{
  node, devCols, devCol, devVal, oppPlies }`: the opponent replies (`devCols`, 0-indexed) that let
  you back in and how deep (`oppPlies`).
- `verdict: "NotABlunder"` with `notABlunder: true` — no reachable swindle; losing one move later is
  not a teachable mistake (these are filtered out of the eval).
- `exhaustive` — whether the subtree was fully searched (`true`) or only depth-bounded (`false`,
  "no swindle within budget"). Soundness is asymmetric: a `Blunder` verdict is always solver-true; a
  `NotABlunder` is exact only when `exhaustive: true`.

---

## 9. Pruning, absence, and how to avoid fabricating

- **Absence = empty/null.** Empty arrays/objects and `null` fields are pruned out. A missing field
  means that signal was not present — a genuine "nothing here," not "unknown, fill it in." (Unlike
  some vectors, meaningful **scalars are kept** — `replyHistogram.afterBest: 0` means the opponent
  has no non-losing reply, `playedCol: 0` is column 1, `tie.tied: false` is real; do not treat a
  `0`/`false` as absence.)
- **`tacticTag: null` / `parity` line `null` / `tie.independent`** are all **honest signals**, not
  gaps. Narrate them as "no named tactic," "too deep to spell out," "geometrically unrelated."
- **Never overstate an outcome.** A winning position is *winnable with correct play*, not an
  automatic win. Only a four-in-a-row completes by itself.
- **Only name cells the vector carries.** Every square you reference must come from a `cells` /
  `window` / `windows` / `line` / `forkCells` / `anchorCells` / `completingCell` / `cell` field, or be
  directly derivable from `movestring`. Do not invent coordinates, lines, or controllers.
- **Keep the two halves separate** (§3). Do not attribute a half-(b) cell to half (a) unless `tie`
  says they coincide.

---

## 10. Worked reading (illustrative)

### A `win_to_draw` (board `3325`, you = player 1, played col 5, best col 1)

```jsonc
{
  "movestring": "3325", "playedCol": 5, "bestCol": 1,
  "player": 1, "opponent": 2, "case": "win_to_draw",
  "lostResource": {
    "kind": "winning_line", "register": "immediate", "terminal": "fork", "forkCase": "A",
    "forkCells": ["c1r1", "c5r1"], "forkWindows": [["c1r1","c2r1","c3r1","c4r1"], ["c2r1","c3r1","c4r1","c5r1"]],
    "tacticTag": "double_threat", "anchorCells": ["c1r1","c2r1","c3r1","c4r1","c5r1"]
  },
  "opponentPunishment": {
    "kind": "denial", "verdict": "occupation", "cell": "c2r1", "window": ["c1r1","c2r1","c3r1","c4r1"],
    "tie": { "kind": "tied", "sharedCells": ["c2r1"] }
  },
  "replyHistogram": { "afterBest": 0, "afterPlayed": 1 }
}
```

Reading: *You (player 1) played column 6; **column 2** (`bestCol 1`) wins. The best move builds an
unstoppable **double-threat fork** on the bottom row — two winning windows sharing `c1r1`/`c5r1` the
opponent can't both block (`afterBest: 0`). The move you played instead lets the opponent **occupy
`c2r1`, killing the `c1r1–c4r1` window** (`denial / occupation`), and the position only draws — and
`c2r1` is a square of the very fork you gave up (`tie: tied`).* Do **not** say column 6 "loses" (it
draws), and do **not** say one opponent move "refutes the fork" — state the local occupation **and**
the global drawn result separately (§5).

### A `draw_to_lose` (board `333301463554`, you = player 1, played col 0, best col 1)

```jsonc
{
  "case": "draw_to_lose", "playedCol": 0, "bestCol": 1,
  "lostResource": {
    "kind": "denial", "verdict": "occupation", "register": "immediate",
    "cell": "c2r2", "window": ["c2r2","c3r2","c4r2","c5r2"], "anchorCells": ["c2r2"], "tacticTag": null
  },
  "opponentPunishment": {
    "kind": "winning_line", "register": "parity", "completingCell": "c3r2",
    "window": ["c2r2","c3r2","c4r2","c5r2"], "line": null,
    "parityAttribution": { "nameable": true, "controllingGroup": ["c2r2","c3r2","c4r2","c5r2"], "leverCells": ["c2r2"] },
    "tie": { "kind": "tied", "sharedCells": ["c2r2"] }
  }
}
```

Reading: *You were **holding a draw** (`case: draw_to_lose`). The best move (**column 2**) occupies
**`c2r2`**, plugging the opponent's winning window `c2r2–c5r2` (`lostResource` denial). The move you
played (column 1) **vacates `c2r2`**, and the opponent now wins on that window — a long parity win
(`line` is `null`; the controlling group is `c2r2–c5r2`, lever `c2r2`). The square that held the draw
(`c2r2`) sits **inside** the opponent's winning window (`tie: tied`).* `tacticTag` is `null` — do not
name a tactic; explain it from the window + parity group. Do not spell out a forced line (`register:
parity`, `line: null`).
