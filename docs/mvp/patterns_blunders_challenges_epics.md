# Patterns → Blunders → Challenges — Implementation Epic Breakdown

*Defines the four implementation epics for shipping the three-layer model described in
`docs/mvp/patterns_blunders_challenges.md`. That doc is the authoritative design reference;
these epics decompose it into `/speckit-specify`-ready scopes. Where this file conflicts
with the source doc, the source doc wins.*

---

## Source-of-truth docs

| Doc | Role |
|---|---|
| [`patterns_blunders_challenges.md`](./patterns_blunders_challenges.md) | **Authoritative** — three-layer model, `classifyPattern`/`tagBlunder` API, per-pattern predicates, priority cascade, call-site diffs. Read before speccing any epic. |
| [`product_decisions.md`](./product_decisions.md) | Settled product decisions; do not re-open. |
| [`docs/architecture/db-schema.md`](../architecture/db-schema.md) | `blunders` table columns and constraints; ground all DB-touching epics here. |

---

## Settled decisions (do not re-derive)

- **Storage gate is independent of tagging.** `tagBlunder` runs after the blunder is confirmed by `scoreMove()`; whether a named pattern matches does not affect whether the row is stored.
- **Tag describes the situation, not the cure.** A blunder is tagged with the pattern the player *was in or created*, not with what the correct move builds afterward.
- **`unknown` is not a valid tag.** Any unmatched blunder falls through to `suboptimal_move`. Goal: inspectable rows promotable to named patterns in future iterations.
- **`tagBlunder` never throws.** On solver failure or degenerate input it resolves to `{ tag: 'suboptimal_move', direction: 'missed_own', reason: 'solver error: <message>' }`.
- **Anon write prohibition.** `blunders.user_id` is `NOT NULL` in the DB (constraint-level). The client-side skip for anonymous users matches this constraint — it is not a workaround for a nullable column.
- **Non-challenge tags are stored.** `forced_win`, `drawing_move`, and `suboptimal_move` are stored in `blunders` like any other tag. They are excluded from challenge-set matching only; they are never dropped at insert.
- **`forced_win` tag ≠ `forced_win` puzzle category.** The blunder tag means "solver confirmed the player had a forced win." The puzzle category labels a multi-move learner exercise. They share a name; they are distinct concepts.

---

## Non-obvious facts (must be encoded in implementing specs)

1. **`classifyPattern` does not exist.** `rg classifyPattern server/` returns nothing. Every epic referencing it must state it is a new function. `classifyAll` exists at `classifier.js:1217` and `classifyBestMove` at `:1245` — Epic 3 must audit both before retiring either.

2. **`blunders.user_id` is `NOT NULL`.** Schema-enforced. The anonymous-write skip is a client-side guard that matches a DB constraint, not a workaround.

3. **Removing `unknown` from the CHECK constraint is a breaking change.** Any code still inserting `'unknown'` fails at DB level the moment the migration applies. Epic 2 must require a pre-deploy audit: `rg "'unknown'" server/scripts/ server/index.js`.

4. **`forced_win` tag ≠ `forced_win` puzzle category.** See settled decisions above.

5. **Four i18n entries are missing in production today.** `undercut`, `overcut`, `odd_even_threat`, and `claimodd` lack `coach.<tag>.prompt.<n>` and `deepReveal.patternLabel.<tag>` entries in `en.json`/`es.json`. Any user who blunders one of these patterns gets a silent `coach.undefined.prompt.0` rendering failure. Epic 1 is a production bug fix, not a nice-to-have.

---

## Epic order

```
Epic 1 (i18n fix)               → unblocked; ships immediately
Epic 2 (DB migrations)          → unblocked; must land before Epic 3
Epic 3 (classifyPattern +       → depends on Epic 2 (reason column + constraint)
         tagBlunder)
Epic 4 (call sites + repair)    → depends on Epic 3
```

Epics 1 and 2 are independent of each other and of each other's content. Epics 3 and 4 form a strict chain.

---

### Epic 1 — i18n Production Bug Fix

**Goal:** Add four missing i18n entries so no blunder tag produces a `coach.undefined.prompt.0`
rendering failure in the Coach Screen 6 or Deep Reveal Screen 8 surfaces.

**Scope:**

Add the following to `en.json`, using the exact strings from `patterns_blunders_challenges.md §4`:

| Key | Value |
|---|---|
| `coach.undercut.prompt.0` | *"One of your threats is a trap. Which column would cost you?"* |
| `coach.overcut.prompt.0` | *"Your opponent's threat has a weakness. Find the column that kills it."* |
| `coach.odd_even_threat.prompt.0` | *"Red has threats on both row parities. How do you control both?"* |
| `coach.claimodd.prompt.0` | *"Red controls the center with all even columns. How do you respond?"* |
| `deepReveal.patternLabel.undercut` | `Undercut` |
| `deepReveal.patternLabel.overcut` | `Overcut` |
| `deepReveal.patternLabel.odd_even_threat` | `Odd/Even Threat` |
| `deepReveal.patternLabel.claimodd` | `Claimodd` |

Add stub entries (empty string) for all eight keys in `es.json`.

**IF** any key already exists in `en.json`, **THEN** preserve the existing value and do not overwrite — flag for review instead.

**Acceptance criteria:**
- `t('coach.undercut.prompt.0')` returns a non-empty string in the English locale (same for the other three tags).
- `es.json` contains all eight keys (empty string is acceptable for stubs).
- No existing i18n key is changed or deleted.

**NOT included:** Any change to classifier, DB, call sites, or challenge-set matching.

**Estimated spec:** 40–60 lines. **Estimated tasks:** 3–5.

---

### Epic 2 — DB Prerequisite Migrations

**Goal:** Update the `blunders` table schema so the new tag set can be inserted without
constraint failures and blunder rows can carry a human-readable reason string.

**Scope:**

*Pre-deploy audit (hard prerequisite before migration runs):*

- Run `rg "'unknown'" server/scripts/ server/index.js` and confirm every callsite that inserts a `pattern_category` value. **IF** any live callsite still inserts `'unknown'`, **THEN** patch it to fall through to `'suboptimal_move'` before the migration applies.

*Migration (a) — update CHECK constraint:*

- Drop the existing `blunders_pattern_category_check` constraint.
- Re-create it as:
  ```sql
  CHECK (pattern_category IN (
    'immediate_threat', 'forced_block', 'forced_win', 'double_threat',
    'undercut', 'overcut', 'figure_7', 'j_shape', 'z_threat',
    'odd_even_threat', 'claimeven', 'claimodd',
    'drawing_move', 'suboptimal_move'
  ))
  ```
  `unknown` is excluded. This is a **breaking change** — any code still inserting `'unknown'` fails at DB level immediately on migration apply.

*Migration (b) — reason column:*

- Add `reason TEXT` (nullable) to the `blunders` table. No index required; this column is for offline inspection only.

**Acceptance criteria:**
- `INSERT INTO blunders (pattern_category, ...) VALUES ('unknown', ...)` is rejected by the DB.
- `INSERT INTO blunders (pattern_category, reason, ...) VALUES ('drawing_move', 'win dropped to draw, no pattern detected', ...)` succeeds.
- Existing `blunders` rows with currently-valid tags are unaffected.

**NOT included:** `tagBlunder` implementation, call site changes, relabeling of existing rows with old tags (Epic 4).

**Estimated spec:** 60–80 lines. **Estimated tasks:** 5–7.

---

### Epic 3 — `classifyPattern` + `tagBlunder`

**Goal:** Implement the two new classifier functions per `patterns_blunders_challenges.md §5`.
Neither function exists today. `classifyAll` (`:1217`) and `classifyBestMove` (`:1245`) are
audited first — they serve different purposes and are not simply renamed.

**Scope:**

*Pre-implementation audit:*

- `rg classifyAll server/` — enumerate all callers. Determine which are on the blunder-tagging path vs. other paths.
- `rg classifyBestMove server/` — same. Document whether each caller can be replaced by `classifyPattern` or must be preserved.

*`classifyPattern(ms, perspective)`:*

```
classifyPattern(ms, perspective) → Promise<Set<string>>
```

- Runs all detectors in the registry with `perspective` as the explicit evaluating player, regardless of who is to move in `ms`.
- Returns the **full set** of matching tags; the caller applies the §3.4 priority cascade.
- Each detector must accept `perspective` as an explicit parameter (default: `Board.currentPlayer`). This allows evaluating either player's patterns without constructing movestrings that end on their turn.
- `detectClaimeven` runs up to 60 `solver.query` calls per invocation; this cost is acceptable because `classifyPattern` is called from `tagBlunder` on the lazy post-game analyze path and never blocks the UI. No per-call query budget or wall-clock timeout is required.

*`tagBlunder(moves, playedCol, correctCol, solver)`:*

```
tagBlunder(moves, playedCol, correctCol, solver) → Promise<{
  tag: string,
  direction: 'missed_own' | 'enabled_opponent' | 'defensive_miss',
  reason: string
}>
```

Implements the 5-step priority cascade (§3.4) in order:

1. **Defensive miss** — `forced_block ∈ P(moves, blunderer)` → `{ tag: 'forced_block', direction: 'defensive_miss' }`
2. **Enabled immediate (1-ply)** — `immediate_threat ∈ P(moves + playedCol, opponent)` → `{ tag: 'immediate_threat', direction: 'enabled_opponent' }`
3. **Missed own** — `{ T : T ∈ P(moves, blunderer) ∧ T ∉ P(moves + playedCol, blunderer) }`, priority-pick per §3.4 missed order.
4. **Enabled opponent (2-ply)** — compare `after_blunder` vs `after_correct`; union includes `undercut` via `enabled_self`. Priority-pick per §3.4 enabled order.
5. **Score-based fallbacks** — `drawing_move` → `suboptimal_move`.

**Never throws.** On solver failure: `{ tag: 'suboptimal_move', direction: 'missed_own', reason: 'solver error: <message>' }`.

`reason` is a human-readable string persisted to `blunders.reason` (column added in Epic 2).

*Player-only pattern guards:*

- **IF** a `missed` or `enabled` set contains `odd_even_threat` or `claimodd` for a Yellow perspective, **THEN** that is a detector bug — add an assertion in tests.
- Same for `claimeven` for a Red perspective.

*Tests:*

- Unit test for each per-pattern predicate in §3.3 (missed-own / enabled-opponent / defensive-miss directions, each with a concrete movestring).
- Integration test: a position triggering both `missed_own` and `enabled_opponent` resolves to `missed_own`.
- Test that `tagBlunder` returns `{ tag: 'suboptimal_move' }` (does not throw) on a synthetic solver-failure input.

`classify(moves, candidateCol, scores)` is **not modified**. It classifies what a candidate column creates and is correct for puzzle generation.

**NOT included:** Updating call sites (Epic 4). Retiring `classifyAll`/`classifyBestMove` (deferred to Epic 4 after confirming no remaining callers post-migration).

**Estimated spec:** 180–220 lines. **Estimated tasks:** 12–16.

---

### Epic 4 — Call Site Migration + Data Repair

**Goal:** Wire `tagBlunder` into all three production call sites, update `VALID_PATTERN_CATEGORIES`,
enforce anonymous-user gating, and relabel existing mislabeled blunder rows.

**Scope:**

*Three call site migrations (exact diffs from `patterns_blunders_challenges.md §6.2`):*

**`scripts/import_papergames_blunders.mjs`** (`extractBlunders`, line ~109) — replace `classify(movesBefore, bestCol, scores)` with `await tagBlunder(movesBefore, col, bestCol, solver)`; set `patternTag = VALID_PATTERN_CATEGORIES.has(tag) ? tag : 'suboptimal_move'`.

**`scripts/reprocess_blunders.mjs`** (line ~95) — replace `classify(movesBeforeThisPly, col, scores)` with `await tagBlunder(movesBeforeThisPly, col, bestCol, solver)`.

**`server/index.js`** (`POST /api/games/analyze`, line ~1487) — replace `classify(movesBeforeThisPly, col, scores)` with `await tagBlunder(movesBeforeThisPly, col, bestCol, solver)`; set `patternTag = tag ?? null`.

All three call sites already hold all four inputs to `tagBlunder` (`movesBefore`, `playedCol`, `correctCol`, `solver`).

*Anonymous user gating:*

- `tagBlunder` runs on **all** paths regardless of auth — tag and reason are always computed.
- **IF** `user_id` is absent, **THEN** skip the `INSERT INTO blunders` at the call site. Do not gate the `tagBlunder` call itself.

*`VALID_PATTERN_CATEGORIES` update:*

- **Add:** `drawing_move`, `suboptimal_move`, `odd_even_threat`, `claimodd`, `forced_win`.
- **Remove:** `unknown`.

*Retire `classifyAll` / `classifyBestMove` (conditional):*

- After the three migrations above, run `rg classifyAll server/` and `rg classifyBestMove server/`. **IF** no callers remain, **THEN** delete both functions. **IF** callers remain, **THEN** document them and do not delete.

*Relabeling migration (deferrable):*

- Run `reprocess_blunders.mjs` to regenerate correctly tagged rows for existing blunders. This is deferrable — existing mislabeled rows are imprecise but not broken. It must complete before any analytics or challenge-matching that relies on correct tags.

**Acceptance criteria:**
- `POST /api/games/analyze` no longer calls `classify(...)` for blunder tagging.
- `tagBlunder` is the sole blunder-tagging entry point across all three call sites.
- `VALID_PATTERN_CATEGORIES` does not contain `'unknown'`.
- A game blunder by an authenticated user produces a `blunders` row with a non-null `reason` column.
- A game blunder by an anonymous user does not produce a `blunders` row; `tagBlunder` still runs internally.

**NOT included:** New blunder UI, challenge-matching changes, any change to the Tier-1 coach explanation path.

**Estimated spec:** 150–180 lines. **Estimated tasks:** 10–13.
