# Deep Reveal Doc Gap Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all blocking and advisory gaps found in the three Deep Reveal product/design docs so a planning agent can write a correct spec and tasks without inventing any decision.

**Architecture:** Pure documentation edits across three markdown files. No code changes. Each task targets a coherent group of related gaps and shows the exact replacement text to write. Gaps are cross-referenced to the review report (B1–B13, A1–A8).

**Tech Stack:** Markdown. No build step. Self-review is the only verification.

---

## Files touched

| File | Gaps closed |
|---|---|
| `docs/mvp/coach_explanation_principles.md` | B7, B8, B9, B13, A1, A3, A6, A7 |
| `docs/mvp/deep_reveal_epics.md` | B1, B2, B3, B4, B5, B6, B10, B11, B12, A2, A4, A5 |
| `docs/mvp/deep_reveal_product.md` | B3 (product side), A8 |

---

## Task 1 — `coach_explanation_principles.md`: Player identity derivation + eval-gap normalization (B7, B8)

**Files:**
- Modify: `docs/mvp/coach_explanation_principles.md`

The doc hardcodes "Player: Green … ODD rows" in every example. The coached player can be either color. Eval-gap formula omits that c4solver scores are opponent-perspective after a move is played.

- [ ] **Step 1: Add player-identity derivation note to context block**

Locate the `## Context block specification` section. After the opening sentence ("The context handed to the coach is built by the algorithm below"), insert:

```markdown
**Player identity (derived, not hardcoded):** The coached player is whoever just
played move A. Derive color and winning parity from `movestring.length` **after**
appending A:

- Odd length → coached player is Red → **Green** disc → winning parity = ODD rows (1, 3, 5)
- Even length → coached player is Yellow → **Grey** disc → winning parity = EVEN rows (2, 4, 6)

Every `Player:` line and every parity annotation in the context block must be
computed from this rule. The Green/ODD examples in this doc are illustrative only.
```

- [ ] **Step 2: Add score-perspective normalization to "COMPUTE EVAL GAP"**

Locate step `2. COMPUTE EVAL GAP` in the prompt-construction algorithm. After the line `gap = score(B) - score(A), using c4solver scores (range [-18, +18]).` insert:

```markdown
   **Score perspective:** c4solver returns scores from the perspective of the
   player *about to move* at the resulting position (positive = that player wins).
   After playing col A or B, the next player is the **opponent**. Normalize to
   coached-player perspective before computing the gap:

       score_coached(col) = −raw_score(col)

   Then: `gap = score_coached(B) − score_coached(A)`. A positive gap means B is
   better for the coached player. The JS off-by-1 on odd `moveCount` (see
   `reference_c4solver_behavior.md`) is handled inside `c4solver-wrapper.js`;
   callers receive the already-corrected raw value.
```

- [ ] **Step 3: Self-review**

Read the updated section. Confirm: (a) a planner knows how to identify which color the coached player is, (b) the gap sign convention is unambiguous, (c) no mention of "Green" or "ODD" remains without a derivation rule.

- [ ] **Step 4: Commit**

```bash
git add docs/mvp/coach_explanation_principles.md
git commit -m "docs: add player-identity derivation and eval-gap score normalization (B7, B8)"
```

---

## Task 2 — `coach_explanation_principles.md`: Case taxonomy when A is optimal or all moves tie (B9)

**Files:**
- Modify: `docs/mvp/coach_explanation_principles.md`

The entire doc assumes A is suboptimal. When A is optimal or all moves tie the framing inverts and the algorithm must branch early.

- [ ] **Step 1: Add case-branching block**

Locate step `1. CLASSIFY STAGE / EVIDENCE` in the prompt-construction algorithm. Immediately **before** that step insert a new step 0:

```markdown
0. BRANCH BY A'S QUALITY

   Let score_coached(col) = −raw_score(col) (see step 2 for normalization).
   Let B = best alternative = non-A column with the highest score_coached value.

   a. ALL MOVES EQUAL: every non-full column has the same score_coached value.
      → Skip simulation and all classification steps.
      → Return plain-text prompt (no zone annotations): "Every column is equivalent
        here — the game state is already determined regardless of which column you
        pick."
      → No quota unit is consumed (no LLM call needed; serve this as Tier-2 text).

   b. A IS OPTIMAL: score_coached(A) ≥ score_coached(B) for all alternatives B.
      → Proceed through steps 1–6 normally, but:
        • B = the highest-scoring alternative (gap ≤ 0).
        • Step 5 tone framing is INVERTED: instead of "why B is better," frame as
          "why A was the right call." Replace the small/moderate/large ladder with:
            - gap = 0           → "Both A and the alternative are equivalent; your
                                   move is fine."
            - gap between –3..0 → "Your move is solid; the alternative is a touch
                                   more flexible but the difference is minor."
            - gap < –3          → "Your move is the strongest here; [what it
                                   preserves or builds]."
        • Do not describe A as having a flaw. Do not suggest B is superior.

   c. A IS SUBOPTIMAL (normal case): score_coached(B) > score_coached(A).
      → Proceed through steps 1–6 with the standard framing.
```

- [ ] **Step 2: Self-review**

Read the updated algorithm. Confirm: (a) the "all equal" path exits cleanly before any simulation, (b) the "A is optimal" path still runs the taxonomy to pick the right type of evidence, (c) the suboptimal path is unchanged.

- [ ] **Step 3: Commit**

```bash
git add docs/mvp/coach_explanation_principles.md
git commit -m "docs: add three-case taxonomy for A optimal / all equal / A suboptimal (B9)"
```

---

## Task 3 — `coach_explanation_principles.md`: Type 3 detection rule + group mechanics (B13, A3, A6, A7, A1)

**Files:**
- Modify: `docs/mvp/coach_explanation_principles.md`

Five smaller gaps, all in the same doc, grouped for one commit.

- [ ] **Step 1: Replace vague Type 3 trigger with a detectable rule (B13)**

Locate step `1c` in CLASSIFY STAGE: `Else if \`par\` shows a parity shift tied to a real major threat → Type 3`. Replace it with:

```markdown
   c. Else if **all three** hold:
        1. At least one major threat exists on the board after A (non-empty result
           from `getMajorThreatCells` on the post-A board).
        2. At least one column's empty-cell count changes parity between the
           pre-A board and the post-A board (compare the `par` row before and
           after placing A).
        3. The parity-flipped column is the same column, or adjacent to a column,
           that contains one of the major threat cells from condition 1.
      → Type 3.
      *(Full evidence-block spec for Type 3 is deferred; see "Out of scope."
      This rule is sufficient to route positions away from Type 4 correctly.)*
```

- [ ] **Step 2: Clarify CONCRETE-ELIGIBLE for opponent-owned groups (A3)**

Locate the D2 locked decision: `Highlight a specific group of 4 only when it already holds ≥2 of the player's discs`. After this sentence add:

```markdown
  For groups **owned by the opponent** (`winner = 'opponent'`), the threshold
  applies to the *opponent's* discs, not the coached player's: an opponent group
  with ≥2 opponent discs is CONCRETE-ELIGIBLE and may be cited with explicit
  cells as a warning. A coached-player disc inside an opponent group does not
  contribute toward the opponent's eligibility count.
```

- [ ] **Step 3: Define group_key collision behavior (A6)**

Locate the M1 aggregation frequency table definition (`group_key → { completed_freq, draw_freq, winner, cells }`). After it add:

```markdown
  **Same-window, different winners:** If the same 4-window appears as a
  `completed` win for the coached player in some leaves and as a `draw_threat`
  for the opponent in others, create **two separate records** keyed as
  `<canonical_cells>:player` and `<canonical_cells>:opponent`. The `winner`
  field disambiguates them. Do not merge them into one record.
```

- [ ] **Step 4: Clarify M2 union includes draw_threat groups (A7)**

In M2, locate the sentence: `A 4-window is included in the context block if it appears as a winning line in any leaf of the A-branch simulation OR any leaf of the B-branch simulation (union).`

Replace `appears as a winning line` with:
`appears as a \`completed\` winning line **or as a \`draw_threat\`**`

- [ ] **Step 5: Fix ASCII board notation (A1)**

Locate the `## Boards` line in the context block spec (`<before / after-A / after-B ASCII, as today, including the \`par\` row>`). Replace it with:

```markdown
## Boards
<before / after-A / after-B ASCII, including the `par` row>
Discs must render as **Green** / **Grey** (not `R`/`Y`). Pass the board through
a Green/Grey relabeling step before embedding. Passing `R`/`Y` to the LLM
causes it to echo the diagram letters in its output, violating P3 (perceived as
"what are the R discs?" by users — see llm_feedback row `e094ee00`).
```

- [ ] **Step 6: Self-review**

Read all five changed sections. Confirm: (a) Type 3 detection is implementable with `getMajorThreatCells` + `par`-row diff, (b) CONCRETE-ELIGIBLE is unambiguous for both player and opponent groups, (c) same-window collision is handled, (d) union includes draw_threat, (e) board ASCII says Green/Grey.

- [ ] **Step 7: Commit**

```bash
git add docs/mvp/coach_explanation_principles.md
git commit -m "docs: fix Type 3 detection, opponent CONCRETE-ELIGIBLE, group_key collision, M2 union, board notation (B13,A1,A3,A6,A7)"
```

---

## Task 4 — `deep_reveal_epics.md` Epic A: P5 board-check algorithm (B1, B2, B3)

**Files:**
- Modify: `docs/mvp/deep_reveal_epics.md`

The P5 board-only check only defines "blocked group-of-4" but zone specs can reference 1–4 cells, full columns, rows, or `tg`. The algorithm for expanding them to candidate 4-windows is missing. Also reconciles the occupied-cell contradiction between epics and coach docs.

- [ ] **Step 1: Replace the P5 bullet with the expanded algorithm (B1)**

Locate `**P5 (board-only):** reject a zone that references a **group-of-4 that is already blocked**…`. Replace the entire P5 bullet (through the sentence ending "…are caught here.") with:

```markdown
  - **P5 (board-only):** For each zone spec in the explanation, expand it to the
    set of board cells it references:
    - `col\d+`          → all 6 cells in that column (rows 0–5)
    - `c\d+r\d+`        → that single cell (1-indexed wire → 0-indexed: subtract 1)
    - `cells:c1r1,...`  → the listed cells (same -1 conversion each)
    - `row\d+`          → all 7 cells in that row
    - `tg`              → skip blocked-group check; validate only out-of-bounds

    Then check every **4-window** (horizontal, vertical, or diagonal) that
    contains **at least one** of the referenced cells. A 4-window is **blocked**
    if it contains at least one disc of each color (can never be completed by
    either player). A zone **fails** the P5 board-only check if **every**
    4-window containing any of its referenced cells is blocked.

    A zone referencing partially-occupied cells where at least one candidate
    4-window is still live **passes** — an occupied disc can legitimately appear
    in a live group. Occupation alone is not grounds for rejection.

    Out-of-bounds cells (col < 0 or > 6, row < 0 or > 5 in 0-indexed coords)
    always fail regardless of 4-window status.

    **Fixtures caught here:**
    - `e86eeac9` (`cells:c2r1,c2r2`): both cells are occupied (Grey and Green);
      every 4-window through them contains both colors → blocked → rejected. ✓
    - `8d83947e` (`cells:c4r3,c5r2,c6r1`): the diagonal through a Green disc;
      every 4-window that includes c5r2 (a Green disc in a line the Grey coach
      claims) contains both colors → blocked → rejected. ✓
    - `403a21c9` (non-existent threat, geometrically valid): NOT caught here —
      the 4-window is live. Deferred to the strong-form P5 in Epic B.
```

- [ ] **Step 2: Add fixture-attribution reconciliation note (B2, B3)**

After the regression harness paragraph (the one ending "…mark them as such"), add a new paragraph:

```markdown
  **How Epic A and Epic B relate to the occupied-cell fixtures:**
  Epic A catches `e86eeac9` and `8d83947e` at the *gate*: both zone specs expand
  to cells where every candidate 4-window is blocked, so the board-only P5 check
  rejects the output. Epic B makes them *structurally impossible to generate*: the
  grounding contract never lists occupied cells as future-line members in the
  allowed-set, so the model cannot compose prose that references them. These
  layers are complementary — Epic A is the safety net, Epic B is structural
  prevention. Both epics list both fixtures in their definitions of done.
```

- [ ] **Step 3: Self-review**

Read the updated P5 bullet. Verify: (a) every `isValidSpec` type (`col\d+`, `c\d+r\d+`, `cells:`, `row\d+`, `tg`) has an expansion rule, (b) the two fixtures are traceable through the algorithm to "rejected," (c) 403a21c9 is correctly deferred.

- [ ] **Step 4: Commit**

```bash
git add docs/mvp/deep_reveal_epics.md
git commit -m "docs: define P5 4-window expansion for all zone types, reconcile fixture attribution (B1,B2,B3)"
```

---

## Task 5 — `deep_reveal_epics.md` Epic A: P2 / P3 / P6 enforcement (B4, B5)

**Files:**
- Modify: `docs/mvp/deep_reveal_epics.md`

P2 check is stated as a goal with no mechanism. P3 and P6 are text-content checks with no blocklist or matching rule.

- [ ] **Step 1: Replace P2 bullet with implementable mechanism (B4)**

Locate `**P2 (text ↔ highlight agreement):**`. Replace the bullet with:

```markdown
  - **P2 (text ↔ highlight agreement):** P2 is enforced primarily at
    *generation time* via the grounding contract: the model composes prose only
    over pre-labeled locations, so text–highlight divergence is rare by
    construction. At gate time the check is narrow and mechanical: for each zone
    whose spec names a specific column (e.g. `col4`), scan the prose *inside that
    zone's tags* for an explicit reference to a **different** column number. Use
    the regex `col(?:umn)?\s*([1-7])` (case-insensitive); if any captured group
    does not match the spec's column, reject and retry. Full NLP prose parsing is
    out of scope — the grounding contract is the primary guard against subtler
    mismatches.
```

- [ ] **Step 2: Replace P3 bullet with blocklists (B5)**

Locate `**P3 (perceivable vocabulary):**`. Replace the bullet with:

```markdown
  - **P3 (perceivable vocabulary):** Scan the *entire* explanation string (not
    just zone content) against three blocklists. Any match → reject and retry.

    **Disc-notation blocklist** (word-boundary, case-insensitive):
    `\bR\b`, `\bY\b`
    (the diagram letters from ASCII board output; word boundaries prevent
    false-positives on "row," "year," etc.)

    **Player-name blocklist** (whole word, case-insensitive):
    `\bRed\b`, `\bYellow\b`, `\bBlack\b`

    **Engine-jargon blocklist** (phrase, case-insensitive):
    `forced win`, `leaf position`, `the solver`, `forced_win`, `the simulation`,
    `your score`, `the score is`, `patterns in data`

    *(Note: the bare word "score" is not blocked — "scoring a win" is legitimate.
    Only the engine-specific phrases above are blocked.)*
```

- [ ] **Step 3: Replace P6 bullet with structural check (B5 continued)**

Locate `**P6 (natural-language references):**`. Replace the bullet with:

```markdown
  - **P6 (natural-language references):** For each zone, verify the *visible text
    inside the zone tags* does not contain a raw coordinate token. Specifically,
    the inner text must not match `\bc\d+r\d+\b` or `\bcol\d+\b` as a bare token.

    Examples:
    - `[zone:c4r3]c4r3[/zone:c4r3]` → **FAIL** (raw token exposed to user)
    - `[zone:c4r3]the cell on row 3[/zone:c4r3]` → **PASS**
    - `[zone:col4]col4[/zone:col4]` → **FAIL**
    - `[zone:col4]the fourth column[/zone:col4]` → **PASS**
```

- [ ] **Step 4: Self-review**

Read the three updated bullets. Confirm: (a) P2 has a concrete regex check, (b) P3 blocklists cover all failure types from the llm_feedback traceability table (R/Y letters, Red/Yellow/Black, engine jargon), (c) P6 check is a single regex, (d) no false-positive risks are left unaddressed.

- [ ] **Step 5: Commit**

```bash
git add docs/mvp/deep_reveal_epics.md
git commit -m "docs: add P2 mechanism, P3 blocklists, P6 structural check (B4,B5)"
```

---

## Task 6 — `deep_reveal_epics.md` Epic A: Fallback behavior + quota rule (B10, B11)

**Files:**
- Modify: `docs/mvp/deep_reveal_epics.md`

The fallback says "return Tier-1 summary" but doesn't say where that comes from or how to log failures. Quota behavior on retry/fallback is unspecified.

- [ ] **Step 1: Replace the "On validation failure" bullet (B10)**

Locate `**On validation failure:** regenerate (re-call the LLM, bounded retry).`. Replace the entire bullet with:

```markdown
  - **On validation failure:** re-call the LLM once (1 retry, same prompt). If
    still invalid after the retry:

    1. **Show Tier-1:** Read the `explanation_cache` row for this `position_hash`
       where `deep_reveal_json` has the Tier-1 shape
       `{ patternTag, fullText, continuationLine, boardAnnotation }` (written by
       the `/api/explain-move` endpoint, `index.js:436`). Return `fullText` as the
       explanation. If no such row exists, return the static string
       `"Detailed explanation unavailable."` No zone annotations; plain text only.

    2. **Log the failure** by inserting a row into a `deep_reveal_failures` table
       (create via migration if it does not exist) with columns:
       `id` (uuid), `position_hash` (text), `movestring` (text), `col` (int),
       `endpoint` (text, value `'/api/explain-move-llm'`), `llm_prompt` (text),
       `raw_llm_output` (text), `failure_reason` (text — which principle(s) failed,
       e.g. `'P3:player_name'`), `created_at` (timestamptz). This table is for
       offline analysis to improve the explanation engine; it is never read by the
       app at runtime.

    3. **Do not cache** the invalid output. If Tier-1 fallback is returned,
       `explanation_cache` receives no Tier-2 write for this position. Future
       requests retry the LLM. (Consistency note: re-opens of the same position
       may vary until a valid Tier-2 response is produced and cached. This is
       intentional — caching a fallback would permanently degrade the position.)
```

- [ ] **Step 2: Add quota rule bullet (B11)**

After the "Cache invariant" bullet, add:

```markdown
  - **Quota accounting:** The user's weekly Deep Reveal quota unit is decremented
    **only when a valid Tier-2 explanation is delivered to the user.** Internal
    retries are transparent to the quota counter. If the final result is a Tier-1
    fallback, the quota unit is **not** consumed. Implementation: the existing
    quota decrement at `index.js:762` must be moved to *after* the validation gate
    confirms a valid explanation; it must not run on a cache miss before validation
    completes.
```

- [ ] **Step 3: Self-review**

Read the updated bullets. Confirm: (a) Tier-1 source is pinpointed (`index.js:436`, field `fullText`), (b) fallback table columns are fully specified, (c) quota decrement timing is explicit (post-validation, not pre-validation), (d) no-cache-on-fallback is stated with rationale.

- [ ] **Step 4: Commit**

```bash
git add docs/mvp/deep_reveal_epics.md
git commit -m "docs: specify Tier-1 fallback source, failure logging table, quota timing (B10,B11)"
```

---

## Task 7 — `deep_reveal_epics.md` Epic B: Draw leaves + deletions + strong-P5 + reuse (B6, B12, A2, A4, A5)

**Files:**
- Modify: `docs/mvp/deep_reveal_epics.md`

Epic B's simulation change bullet omits draw leaves. Strong-P5 allowed-set membership is undefined for heterogeneous zone types. Functions being replaced are not enumerated. opponentResponseMovestring reuse is not mentioned. Named-scaffold sourcing is unstated.

- [ ] **Step 1: Extend simulation change bullet to include draw leaves (B6)**

Locate the simulation leaf-data change bullet: `Change … collectLeaves … so that at a **won leaf** it records the **specific 4-cell winning group**…`. After `and surface the top A-vs-B delta groups (with occupants + parity) to the context builder.` add:

```markdown
    At a **draw leaf**, record every **major threat group** present on the board
    (each 4-window with 3 discs of one color and 1 empty cell) as
    `{ cells, winner: 'player'|'opponent', type: 'draw_threat' }`. Aggregate into
    a separate `draw_freq` counter (= N_draw_leaves_where_this_group_appeared /
    total_leaves), tracked alongside `completed_freq`. Both frequencies enter the
    context block per the M2 format in `coach_explanation_principles.md`.
    **Rationale:** blunders often convert winning continuations to draws, not
    losses; without draw-leaf records the branch-A vs branch-B frequency
    comparison misses groups the coached player was still building toward in those
    near-wins (see M1 in `coach_explanation_principles.md` for the full argument).
```

- [ ] **Step 2: Specify strong-P5 allowed-set membership across zone types (B12)**

Locate the strong-form P5 bullet: `Extend the Epic A validate-then-cache gate so that … it rejects any highlight whose location is **not in the closed allowed-set**…`. Replace from "The allowed-set must be available…" to the end of that bullet with:

```markdown
    The context builder returns the closed allowed-set alongside the prompt as
    `{ prompt, allowedSet }` where `allowedSet` is a flat array of
    `{ cells: string[], zoneSpec: string }` entries (one per mentionable group).

    At gate time, for each zone spec in the LLM output:
    1. Expand the spec to a cell set using the same parse logic as `zoneToOverlays`
       (apply the -1 coordinate conversion: `c4r3` → col 3, row 2).
    2. Check that every cell in the expanded set appears in **at least one** entry
       in `allowedSet`.

    Coverage by zone type:
    - `col4`: passes if any `allowedSet` entry contains a cell in col 3 (0-indexed).
    - `c4r3`: passes if any `allowedSet` entry contains `[3,2]` (0-indexed).
    - `cells:c4r3,c5r3,…`: passes if all listed cells appear across allowed entries.
    - `tg` (entire board): **always fails** strong-P5 — the rebuilt coach never
      emits `tg`; if it appears, reject unconditionally.
    - `row\d+`: passes if any allowed entry contains a cell in that row.
```

- [ ] **Step 3: Add opponentResponseMovestring reuse note (A2)**

In the Type 1–4 taxonomy bullet, after the sentence `The selection step is the missing piece — the current prompt is effectively always-Type-2.` add:

```markdown
    For **Type 2 detection** (step 1b of the prompt-construction algorithm), the
    critical position is the board after move A + opponent's optimal reply.
    `buildExplainContext` already computes this as `opponentResponseMovestring` via
    `getOpponentResponseMs` — **reuse it directly. Do not add new solver calls.**
```

- [ ] **Step 4: Add named-scaffold sourcing note (A5)**

In the same Type 1–4 bullet, after the opponentResponseMovestring note, add:

```markdown
    For the **named-scaffold check** (Figure-7 / J-config) in step 1b, apply the
    existing pattern detectors (`allen-j-configuration`, `community-figure-7` — see
    `docs/knowledge-base/README.md`) to the *critical-position* board, not the
    current board. Wire the detectors to the `opponentResponseMovestring` board.
```

- [ ] **Step 5: Enumerate replaced functions (A4)**

In the "Reuse (do not rebuild)" block, add a sibling block immediately after it:

```markdown
**DELETE — do not preserve as "existing functionality":**

- `computeDeltaTable` (`server/index.js`) — the classifier-tag diff; replaced by
  group-frequency comparison from the new simulation aggregation.
- `claimevenNarration`, `zThreatNarration`, `figure7Narration`,
  `jShapeNarration` — pre-built narration strings injected into the old prompt;
  replaced by the grounding-contract context block.
- The KB-section generation code that produces those narration strings.

These must be **removed**, not left dormant. Preserving them alongside the new
code produces a hybrid that still emits the old always-Type-2 classifier tags.
```

- [ ] **Step 6: Self-review**

Read all five additions. Confirm: (a) draw-leaf aggregation is fully specified with a `draw_freq` counter and the rationale is clear enough that an implementer won't drop it, (b) `allowedSet` shape is `{ cells, zoneSpec }[]` and the membership check covers every `isValidSpec` type, (c) `opponentResponseMovestring` reuse is explicit, (d) named-scaffold detectors are pointed at the right board, (e) three specific functions/strings are named for deletion.

- [ ] **Step 7: Commit**

```bash
git add docs/mvp/deep_reveal_epics.md
git commit -m "docs: draw leaves, strong-P5 membership, opponentResponseMovestring reuse, deletion list (B6,B12,A2,A4,A5)"
```

---

## Task 8 — `deep_reveal_product.md`: Occupied-cell clarification + fallback cache stability (B3, A8)

**Files:**
- Modify: `docs/mvp/deep_reveal_product.md`

The product doc's P5 section is silent on occupied cells, which creates an apparent conflict with the epics doc. The Stability section promises consistent re-opens but doesn't address the fallback case.

- [ ] **Step 1: Add occupied-cell nuance to P5 (B3)**

Locate P5: `Every highlighted location MUST be a genuine board location…`. After the sentence ending `…and only those may be highlighted.` add:

```markdown
An occupied cell is not intrinsically invalid as a highlight: it may legitimately
appear in an explanation as a disc that is part of an existing live group (e.g.,
"your two green discs in column 4"). What is invalid is describing or highlighting
an **occupied cell as a future threat location** — as if it were empty and
available for a winning line. The gate enforces this via the blocked-group check
(Epic A) and the grounding contract (Epic B); the distinction is "occupied disc in
a live group" (valid) vs "occupied cell treated as empty future-line member"
(invalid).
```

- [ ] **Step 2: Add fallback note to Stability section (A8)**

Locate the `## Stability & responsiveness` section. After the "Stable per position" bullet, add a sub-note:

```markdown
  *Fallback case:* When the gate cannot produce a valid Tier-2 explanation and
  falls back to Tier-1, the fallback is **not cached** under the Tier-2 position
  hash. Future re-opens of the same position will retry the LLM. A small class of
  positions may show Tier-1 on every open until the LLM produces a valid Tier-2
  response that passes the gate. This is intentional: caching a fallback would
  permanently degrade that position even after the explanation engine improves.
```

- [ ] **Step 3: Self-review**

Read both additions. Confirm: (a) P5 distinction between "occupied in live group" and "occupied as fake future threat" is unambiguous, (b) Stability section no longer implies unconditional re-open consistency, (c) the trade-off rationale is stated.

- [ ] **Step 4: Commit**

```bash
git add docs/mvp/deep_reveal_product.md
git commit -m "docs: clarify P5 occupied-cell rule, add fallback cache stability note (B3,A8)"
```

---

## Self-review checklist (run after all tasks)

**Spec coverage — verify each blocking gap is closed:**

| Gap | Task | Check |
|---|---|---|
| B1 zone-expansion algorithm | Task 4 | P5 bullet covers all `isValidSpec` types |
| B2 fixture attribution | Task 4 | Attribution note added |
| B3 occupied-cell contradiction | Tasks 4 + 8 | Both docs reconciled |
| B4 P2 mechanism | Task 5 | Regex check specified |
| B5 P3/P6 blocklists | Task 5 | Three blocklists + P6 regex |
| B6 draw leaves in Epic B | Task 7 | `draw_freq` + rationale |
| B7 player identity | Task 1 | Odd/even length rule |
| B8 score perspective | Task 1 | `score_coached = −raw` |
| B9 case taxonomy | Task 2 | Three cases with framing |
| B10 fallback + logging | Task 6 | Table schema + source |
| B11 quota timing | Task 6 | Post-validation decrement |
| B12 strong-P5 set membership | Task 7 | Per-type coverage table |
| B13 Type 3 detection | Task 3 | Three-condition rule |
| A1 ASCII board notation | Task 3 | Green/Grey relabeling note |
| A2 opponentResponseMovestring | Task 7 | "Reuse directly" note |
| A3 CONCRETE-ELIGIBLE opponent | Task 3 | Opponent-disc threshold |
| A4 deletion list | Task 7 | Three named deletions |
| A5 named-scaffold sourcing | Task 7 | "Wire to critical position" |
| A6 group_key collision | Task 3 | Two-record rule |
| A7 M2 union + draw_threat | Task 3 | Union definition updated |
| A8 cache stability fallback | Task 8 | Sub-note in Stability |
