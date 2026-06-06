# Patterns → Blunders → Challenges

*Reference model for how DecodeC4 detects tactics, derives mistakes from them, and turns those mistakes into puzzles. Authoritative for the boundary between `classifier.js`, the blunder import pipeline, and challenge generation. Where this conflicts with older classifier comments, this document wins.*

---

## 1. The three-layer model

| Layer | What it is | Belongs to | Produced by |
|---|---|---|---|
| **Pattern** | A board condition that exists in a position for one specific player. | A player (the holder). | `classifyPattern` over a position. |
| **Blunder** | A player failing to act on a pattern — either missing their own or enabling the opponent's. | The player who erred. | `tagBlunder` over a (position, played, correct) triple. |
| **Challenge** | A puzzle that re-presents the learner with a pattern they need to recognize. | The learner. | Challenge pipeline (curated independently from blunders). |

Key invariant — **the tag describes the situation, not the cure.** A blunder is tagged with the pattern the player *was in or created*, never with whatever the correct move happens to build afterward. If the opponent had an immediate threat and the player ignored it, the tag is `forced_block` — even if the correct block also incidentally creates two threats.

---

## 2. Patterns

A pattern is a predicate over `(board, player)`. All detectors accept an explicit **`perspective`** parameter (the player whose patterns are evaluated); by default `perspective = Board.currentPlayer`, but it can be overridden to evaluate either player at any point in time without constructing a movestring that ends on their turn.

| Pattern | Intuitive meaning | Can belong to | Notes |
|---|---|---|---|
| `immediate_threat` | Player has a gravity-top major threat — wins this turn. | Both | Gravity-top only. |
| `forced_block` | Opponent has a gravity-top major threat; player must block or win. | Both | A pattern *about the opponent* that constrains the player. |
| `double_threat` | Player has two gravity-top major threats, **or** two stacked consecutive major threats with no opponent undercut. | Both | `detectDoubleThreat` Case A / Case B. |
| `undercut` | Opponent's lower threat in a column kills the player's upper threat — playing that column loses. | Both | The holder is the one *at risk*. Allen T2/T4/T5. |
| `overcut` | Player's lower threat in a column neutralizes the opponent's upper threat — playing that column wins. | Both | The holder *benefits*. Mirror of undercut. |
| `figure_7` | Player holds a 7-shaped zugzwang trap yielding a forced double threat. | Both | Junction-cell completion. |
| `j_shape` | Player holds a J-shaped zugzwang trap. | Both | Canonical + mirror variants. |
| `z_threat` | Player has an odd-parity vertical capsule (odd empty-to-threat count) confirmed winning. | Both | Parity advantage. |
| `odd_even_threat` | Player has ≥2 major-threat moves, one landing on an odd row and one on an even row. | **Red only** | Red's odd-row parity advantage. |
| `claimodd` | Red, with all columns even-height, controls via the center column. | **Red only** | Response to Claimeven. |
| `claimeven` | Player holds a claimeven-winning endgame (pairing strategy). | **Yellow only** | Yellow is second player; simulation-verified. |
| `forced_win` | Player has a solver-confirmed forced win from this position (`solver.score(ms, player) > 0`). | Both | Detected by querying the solver directly; subsumes `double_threat` — use `forced_win` when the win is confirmed but the specific tactic is unclear. |

"Both" = either player can hold it depending on the position. Red-only / Yellow-only patterns are parity-bound and must never be tagged for the wrong player.

---

## 3. Blunders

### Storage gate — independent of tagging

A move is stored as a blunder solely based on `scoreMove()` output. `tagBlunder` runs **after** this gate; whether it finds a named pattern has no effect on whether the row is stored.

`scoreMove(scores, playedCol)` applies two branches:

**Standard branch** (best available score ≥ 0 — a win or draw was reachable):
- `score(played) === score(best)` → **optimal** (not stored)
- `sign(played) === sign(best)` but `played ≠ best` → **suboptimal** (not stored)
- `sign(played) < sign(best)` → **blunder** (stored) — crosses a category boundary: win→draw, win→loss, or draw→loss

**Losing branch** (all scores negative — position is already lost):
- `played === bestScore` → **optimal** (not stored)
- `played < bestScore − 4` → **blunder** (stored) — more than 4 score points below the least-negative option (~2 extra ply surrendered)
- otherwise → **suboptimal** (not stored)

`bestCol` is `argmax(scores)` with lowest-index tie-break. It serves as `correctCol` for the tagging step and is already computed here, so the caller gets it for free.

A blunder is a non-forced move whose solver score drops the outcome category. Every blunder carries a **direction**, a **pattern tag**, and a **reason** string.

### 3.1 Primitives

```
bm(ms)           bestMove: argmax of solver.query(ms), ties broken by lowest column index.
P(ms, who)       classifyPattern(ms, perspective=who) → Set<tag>. All patterns held by `who` at position `ms`.

blunderer        the player who made the blunder
opponent         the other player
moves            the movestring before the blunder
playedCol        the column the blunderer played
correctCol       bm(moves) — provided by caller (already computed for quality scoring)

after_blunder    moves + playedCol + bm(moves + playedCol)
after_correct    moves + correctCol + bm(moves + correctCol)

missed(T)        T ∈ P(moves, blunderer)  ∧  T ∉ P(moves + playedCol, blunderer)
                 Blunderer held T before playing; the pattern is gone after.

enabled_opp(T)   T ∈ P(after_blunder, opponent)  ∧  T ∉ P(after_correct, opponent)
                 Opponent gained T after the blunder but not in the correct line (2-ply).

enabled_self(T)  T ∈ P(after_blunder, blunderer)  ∧  T ∉ P(after_correct, blunderer)
                 Blunderer now holds T (used when the pattern's impact is felt by the blunderer).
```

`after_blunder` and `after_correct` each require one `bm()` call (one solver query each), in addition to any queries inside `P()` itself. `detectClaimeven` inside `P()` runs up to 60 `solver.query` iterations per invocation; each call to `tagBlunder` may invoke `P()` several times.

### 3.2 Three directions

| Direction | Meaning | Trigger |
|---|---|---|
| **Missed own** | The player held an exploitable pattern and didn't act on it. | `missed(T)` at the pre-move position. |
| **Enabled opponent** | The player's move let the opponent establish a pattern they otherwise wouldn't have. | `enabled_opp(T)` or `enabled_self(T)` depending on the pattern (see §3.3). |
| **Defensive miss** | The opponent already had an immediate threat before the blunder; the player failed to block or win. | Pre-move check: `forced_block ∈ P(moves, blunderer)`. |

### 3.3 Per-pattern predicates and narratives

---

**`immediate_threat`**

| Direction | Predicate | Narrative |
|---|---|---|
| Missed own | `missed(immediate_threat)` | *"You had a winning move right there and didn't take it."* |
| Enabled opponent | `immediate_threat ∈ P(moves + playedCol, opponent)` *(1-ply)* | *"That move handed your opponent an immediate win."* |

The enabled-opponent case is **1-ply only**. The threat exists the moment after the blunderer plays; the opponent's best response would simply be to win, making the 2-ply terminal degenerate. Detect this before the general 2-ply comparison. This is the `forbidden_columns` scenario in the current code.

---

**`forced_block`**

| Direction | Predicate | Narrative |
|---|---|---|
| Defensive miss | `forced_block ∈ P(moves, blunderer)` *(pre-move)* | *"Yellow was about to win. You had to block and didn't."* |

Pre-move check only — the opponent already had the threat before the blunder. No enabled-opponent direction: the opponent holding `forced_block` would mean the blunderer has an immediate threat, which is good for the blunderer, not a blunder source.

---

**`forced_win`**

| Direction | Predicate | Narrative |
|---|---|---|
| Missed own | `missed(forced_win)` | *"You had a forced win and let it slip."* |
| Enabled opponent | `enabled_opp(forced_win)` | *"Your move handed your opponent a forced win."* |

Detected via solver score: `forced_win ∈ P(ms, player)` iff `solver.score(ms, player) > 0`. Requires **2-ply** for enabled-opponent (same as `double_threat`).

---

**`double_threat`**

| Direction | Predicate | Narrative |
|---|---|---|
| Missed own | `missed(double_threat)` | *"You could have built a double threat — two winning columns at once — and missed it."* |
| Enabled opponent | `enabled_opp(double_threat)` | *"Your move let your opponent set up two winning threats at once."* |

Enabled-opponent requires **2-ply**: the opponent typically needs to play their constructive move before both threats are gravity-top detectable as `double_threat`.

---

**`undercut`**

| Direction | Predicate | Narrative |
|---|---|---|
| Enabled opponent | `enabled_self(undercut)` | *"Your move let your opponent undercut your threat — their lower disc now kills your win."* |

Uses the **blunderer's** perspective (`enabled_self`). `undercut ∈ P(ms, X)` means X is the one being undercut. The blunderer gains undercut exposure; the opponent simultaneously gains overcut capability — these are mirror facts at the same position. No missed-own direction: undercut is a danger, not an opportunity to exploit.

Note: `enabled_self(undercut)` ≡ `enabled_opp(overcut)` — the same column configuration seen from opposite sides. The tag `undercut` is used because it names the blunderer's experience.

---

**`overcut`**

| Direction | Predicate | Narrative |
|---|---|---|
| Missed own | `missed(overcut)` | *"You had an overcut — a column where your lower disc neutralizes their upper threat — and didn't play it."* |

The enabled-opponent direction for `overcut` (`enabled_opp(overcut)`) is the same event as `enabled_self(undercut)` — the same column configuration, from the other side. Do not double-count: tag as `undercut` when this scenario fires.

---

**`figure_7`**

| Direction | Predicate | Narrative |
|---|---|---|
| Missed own | `missed(figure_7)` | *"You had a Figure-7 fork structure and didn't complete it."* |
| Enabled opponent | `enabled_opp(figure_7)` | *"You let your opponent build a Figure-7 fork you can't answer."* |

---

**`j_shape`**

| Direction | Predicate | Narrative |
|---|---|---|
| Missed own | `missed(j_shape)` | *"You had a J-shape trap available and didn't use it."* |
| Enabled opponent | `enabled_opp(j_shape)` | *"You let your opponent build a J-shape trap."* |

---

**`z_threat`**

| Direction | Predicate | Narrative |
|---|---|---|
| Missed own | `missed(z_threat)` | *"You had the parity advantage — an odd vertical capsule — and abandoned it."* |
| Enabled opponent | `enabled_opp(z_threat)` | *"Your move handed your opponent the parity advantage."* |

---

**`odd_even_threat`** *(Red only)*

| Direction | Predicate | Narrative |
|---|---|---|
| Missed own | `missed(odd_even_threat)` *(blunderer is Red)* | *"You had threats on both row parities — a fork neither player can fully answer — and let it go."* |
| Enabled opponent | `enabled_opp(odd_even_threat)` *(opponent is Red; blunderer is Yellow)* | *"Your move gave Red threats on both row parities."* |

---

**`claimeven`** *(Yellow only)*

| Direction | Predicate | Narrative |
|---|---|---|
| Missed own | `missed(claimeven)` *(blunderer is Yellow)* | *"You had a claimeven endgame — the pairing was yours — and threw it away."* |
| Enabled opponent | `enabled_opp(claimeven)` *(opponent is Yellow; blunderer is Red)* | *"You gave Yellow a claimeven endgame — they now control the pairing."* |

---

**`claimodd`** *(Red only)*

| Direction | Predicate | Narrative |
|---|---|---|
| Missed own | `missed(claimodd)` *(blunderer is Red)* | *"You had the claimodd control — all even columns, center command — and lost it."* |
| Enabled opponent | `enabled_opp(claimodd)` *(opponent is Red; blunderer is Yellow)* | *"Your move gave Red the claimodd endgame control."* |

---

**Score-based fallbacks** *(not expressible as `P()` predicates)*

| Tag | Condition | Narrative |
|---|---|---|
| `drawing_move` | Blunderer had a winning solver score; outcome drops to draw; no pattern detected above. | *"You had a win available and settled for a draw."* |
| `suboptimal_move` | Final catch-all: blunder confirmed by `scoreMove()` but no named pattern or score-based case matched. | *"There was a stronger move — this one gives ground."* |

`unknown` is not a valid tag. Any blunder that cannot be classified more specifically falls through to `suboptimal_move`, so unexplained blunders remain inspectable and can later be promoted to a named pattern.

---

### 3.4 Priority when multiple patterns fire

Detection runs in this order; first match wins:

1. **Defensive miss** — `forced_block ∈ P(moves, blunderer)` → tag `forced_block`
2. **Enabled immediate** — `immediate_threat ∈ P(moves + playedCol, opponent)` → tag `immediate_threat`
3. **Missed own** — pick highest-priority from `{T : missed(T)}`:
   `immediate_threat > forced_win > double_threat > z_threat > odd_even_threat > figure_7 > j_shape > overcut > claimeven > claimodd`
4. **Enabled opponent** — pick highest-priority from `{T : enabled_opp(T)} ∪ {undercut : enabled_self(undercut)}`:
   `forced_win > double_threat > z_threat > odd_even_threat > figure_7 > j_shape > undercut > claimeven > claimodd`
5. **Score-based fallbacks** — `drawing_move` → `suboptimal_move`

Missed-own takes precedence over enabled-opponent when both fire.

---

## 4. Challenges and blunders — vocabulary alignment

Challenges and blunders are **distinct artifacts** that share the same pattern vocabulary. A blunder tagged `double_threat` corresponds to the `double_threat` challenge set — the tag names the pattern that was missed or enabled. That is the full relationship.

**Challenges** are curated pedagogical positions drawn from the challenge pipeline (approval-gated, sourced from the `puzzles` table with `is_active`). They are not generated row-by-row from blunders.

**Blunders** are per-user errors recorded during gameplay, tagged with the pattern they exemplify.

The alignment means: correct blunder tagging keeps blunder statistics and challenge-set membership in the same vocabulary. A user who frequently blunders `undercut` is a candidate to be shown `undercut` challenge sets — but the challenge position itself is curated independently.

Tag exclusions for challenge matching: `forced_win`, `drawing_move`, and `suboptimal_move` have no single-move teaching position; blunders with these tags are not matched to challenge sets. This exclusion applies only to blunder-derived matching — `forced_win` as a sequence (multi-move) puzzle category is a separate concept and is unaffected.

**Screen 6 prompts and Screen 8 pattern labels** — every tag used in blunders must have a Coach prompt (Screen 6 Challenge Board) and a Deep Reveal pattern label (Screen 8). The four tags introduced by this doc that were previously missing entries:

| Tag | Screen 6 prompt | Screen 8 label |
|---|---|---|
| `undercut` | *"One of your threats is a trap. Which column would cost you?"* | Undercut |
| `overcut` | *"Your opponent's threat has a weakness. Find the column that kills it."* | Overcut |
| `odd_even_threat` | *"Red has threats on both row parities. How do you control both?"* | Odd/Even Threat |
| `claimodd` | *"Red controls the center with all even columns. How do you respond?"* | Claimodd |

These map to i18n keys in `en.json` (populated) and `es.json` (stub). Key naming follows the existing `coach.<tag>.prompt.<n>` and `deepReveal.patternLabel.<tag>` conventions.

---

## 5. Classifier API

### 5.1 `classifyPattern(ms, perspective)` — all patterns held by a player

```
classifyPattern(ms, perspective) → Promise<Set<string>>
```

- Runs all detectors in the registry with the given `perspective` player, regardless of who is to move in `ms`.
- Returns the **full set** of matching tags; the caller applies the priority in §3.4.
- **Detector contract change:** each detector now accepts `perspective` as an explicit parameter (default `Board.currentPlayer`). This allows evaluating either player's patterns at any point in time without constructing movestrings that end on their turn.
- `solver` is implicitly required; `detectClaimeven` runs a simulation of up to 60 `solver.query` calls per invocation.
- **Performance:** this cost is acceptable. `classifyPattern` is called from `tagBlunder`, which runs lazily and fire-and-forget on the post-game analyze path — it never blocks the UI. No per-call query budget or wall-clock timeout is required.

This replaces the blunder-tagging use of `classify()` and `classifyAll()`. **`classify(moves, candidateCol, scores)` is kept unchanged** for the puzzle-generation path — it classifies what a candidate column creates, which is a different question.

### 5.2 `tagBlunder(moves, playedCol, correctCol, solver)` — tag a blunder

```
tagBlunder(moves, playedCol, correctCol, solver) → Promise<{
  tag: string,
  direction: 'missed_own' | 'enabled_opponent' | 'defensive_miss',
  reason: string        // human-readable explanation, persisted to blunders.reason
}>
```

`reason` examples:
- Named pattern matched: `"matched missed_own: double_threat"`
- Score-based fallback: `"win dropped to draw, no pattern detected"` / `"no pattern detected"`
- Solver failure: `"solver error: <message>"`
- Degenerate position (e.g. terminal line): `"degenerate position: <description>"`

`tagBlunder` **never throws**. On any solver failure or degenerate input it resolves to `{ tag: 'suboptimal_move', direction: 'missed_own', reason: 'solver error: <message>' }` so the blunder row is always storable.

Algorithm:

```
// Step 1 — defensive miss (pre-move)
if forced_block ∈ P(moves, blunderer):
  return { tag: 'forced_block', direction: 'defensive_miss', reason: 'matched defensive_miss: forced_block' }

// Step 2 — enabled immediate (1-ply)
if immediate_threat ∈ P(moves + playedCol, opponent):
  return { tag: 'immediate_threat', direction: 'enabled_opponent', reason: 'matched enabled_opponent: immediate_threat' }

// Step 3 — missed own (pre-move vs 1-ply)
missed = { T : T ∈ P(moves, blunderer) ∧ T ∉ P(moves + playedCol, blunderer) }
if missed is non-empty:
  t = priority_pick(missed, §3.4 missed order)
  return { tag: t, direction: 'missed_own', reason: `matched missed_own: ${t}` }

// Step 4 — enabled opponent (2-ply)
opp_bm  = bm(moves + playedCol)
corr_bm = bm(moves + correctCol)
enabled = { T : T ∈ P(moves + playedCol + opp_bm, opponent)
                ∧ T ∉ P(moves + correctCol + corr_bm, opponent) }
       ∪ { undercut :   undercut ∈ P(moves + playedCol + opp_bm, blunderer)
                      ∧ undercut ∉ P(moves + correctCol + corr_bm, blunderer) }
if enabled is non-empty:
  t = priority_pick(enabled, §3.4 enabled order)
  return { tag: t, direction: 'enabled_opponent', reason: `matched enabled_opponent: ${t}` }

// Step 5 — score-based fallbacks
if blunderer score was winning → draw:  return { tag: 'drawing_move', direction: 'missed_own', reason: 'win dropped to draw, no pattern detected' }
else:                                   return { tag: 'suboptimal_move', direction: 'missed_own', reason: 'no pattern detected' }
```

**Caller responsibility:** detect that the move is a blunder (via `moveQualityScorer`), supply `playedCol`, `correctCol` (= `bm(moves)`, already computed for quality scoring), and the solver handle.

### 5.3 `classify()` — puzzle-generation path (unchanged)

`classify(moves, candidateCol, scores)` classifies what a *candidate column creates*. It is correct for puzzle generation and must not be used for blunder tagging.

---

## 6. Implementation changes

### 6.1 What the new functions replace

| Current | Replacement |
|---|---|
| `classify(moves, candidateCol, scores)` used to tag blunders | Wrong — classifies what `candidateCol` creates. Keep for puzzle-gen; replace with `tagBlunder` everywhere blunders are tagged. |
| `classifyAll()` as pattern scanner | `classifyPattern(ms, perspective)` replaces the blunder-path usage. |
| `classifyBestMove(moves, scores)` | Becomes `classifyPattern(ms, perspective)` over the desired player; or retire — **audit all callers first** (`rg classifyBestMove server/`). |
| Inlined priority cascade in `classify()` | §3.4 defines the canonical order for both paths. |

### 6.2 Blunder tagging call sites

All three production sites must migrate to `tagBlunder`:

**`scripts/import_papergames_blunders.mjs`** (`extractBlunders`, line ~109):
```js
// Current — classifies what bestCol creates (tags the cure, not the blunder)
const r = classify(movesBefore, bestCol, scores);

// Replacement — col (played) is already in scope at line 95
const { tag } = await tagBlunder(movesBefore, col, bestCol, solver);
patternTag = VALID_PATTERN_CATEGORIES.has(tag) ? tag : 'suboptimal_move';
```

**`scripts/reprocess_blunders.mjs`** (line ~95):
```js
// Current — wrong function
const classifyResult = classify(movesBeforeThisPly, col, scores);

// Replacement — bestCol is already computed by scoreMove() at line 83
const { tag } = await tagBlunder(movesBeforeThisPly, col, bestCol, solver);
patternTag = VALID_PATTERN_CATEGORIES.has(tag) ? tag : 'suboptimal_move';
```

**`server/index.js`** (`POST /api/games/analyze`, line ~1487):
```js
// Current — wrong function
const classifyResult = classify(movesBeforeThisPly, col, scores);

// Replacement — bestCol is already computed by scoreMove() at the same line
const { tag } = await tagBlunder(movesBeforeThisPly, col, bestCol, solver);
patternTag = tag ?? null;
```

**Canonical contract:** `tagBlunder(movesBefore, playedCol, correctCol, solver)`. All three call sites already hold all four inputs.

**Anonymous users:** `tagBlunder` runs on all paths regardless of auth — the tag and reason are computed. The DB write to `blunders` is skipped at the call site when `user_id` is absent (`product_decisions.md` §Game persistence: "Blunder writes require a `user_id`"). Do not gate the `tagBlunder` call itself on auth.

**`VALID_PATTERN_CATEGORIES` additions:** add `drawing_move`, `suboptimal_move`, `odd_even_threat`, `claimodd`, `forced_win`. Remove `unknown` — it is not a valid tag.

**Storage policy for non-challenge tags:** `forced_win`, `drawing_move`, and `suboptimal_move` are stored in the `blunders` table like any other tag. They are excluded from challenge-set matching only (§4). They are not dropped at insert time — stored rows are inspectable and `suboptimal_move` rows in particular are candidates for promoting to a named pattern in future iterations.

**DB CHECK constraint — prerequisite:** the `blunders_pattern_category_check` constraint (migration 027) does not include `drawing_move`, `suboptimal_move`, `odd_even_threat`, `claimodd`, or `forced_win`, and still includes `unknown`. **A migration updating this constraint must ship before any inserts using the new tags.** This is not deferrable alongside the row-relabeling work.

**`reason` column — prerequisite:** add a nullable `reason TEXT` column to the `blunders` table (separate migration). This column stores the human-readable explanation from `tagBlunder`'s return value (e.g. `"matched missed_own: double_threat"`, `"solver error: timeout"`). Must ship alongside or before the tagging code.

### 6.3 Challenge generation

- Challenges draw from the `puzzles` table (curated, `is_active`-gated). Correcting blunder tagging aligns blunder statistics with challenge vocabulary but does not change challenge sourcing.
- `forced_win`, `drawing_move`, and `suboptimal_move` are excluded from challenge-set matching (no single-move teaching position). `forced_win` as a sequence puzzle category is unaffected.
- The Screen-6 prompt and Screen-8 pattern label derive from `pattern_category`; every tag in §2 must have a prompt entry. The vision table groups `figure_7` / `j_shape` as "Fork" — keep that mapping. Prompts and labels for `undercut`, `overcut`, `odd_even_threat`, and `claimodd` are defined in §4 above.

---

*This is a design reference, not a spec. The implementing spec covers: finalized function signatures, tests, and three distinct migrations — (a) updating `blunders_pattern_category_check` to add the new tags and remove `unknown` (prerequisite, must ship before tagging code); (b) adding a nullable `reason TEXT` column to `blunders` (prerequisite, must ship alongside or before the tagging code); and (c) relabeling existing mislabeled `blunders.pattern_category` rows (deferrable — re-running `reprocess_blunders.mjs` will regenerate correctly tagged rows).*
