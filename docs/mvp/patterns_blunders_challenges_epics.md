# Patterns → Blunders → Challenges — Implementation Epic Breakdown

*Defines the implementation epics for shipping the three-layer model described in
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
- **i18n entries for `undercut`, `overcut`, `odd_even_threat`, `claimodd` are already present** in `en.json` (`coach.<tag>.prompt.*` and `deepReveal.patternLabel.<tag>`). No i18n work is required by these epics.

---

## Non-obvious facts (must be encoded in implementing specs)

1. **`classifyPattern` does not exist.** `rg classifyPattern server/` returns nothing. Every epic referencing it must state it is a new function. `classifyAll` exists at `classifier.js:1217` and `classifyBestMove` at `:1245` — Epic 1 must audit both before retiring either. **`classifyAll` is preserved in Epic 2** (active callers: `/api/debug/classify-all` endpoint, `scripts/classify_all.mjs`, `explainSimulate.js`) and removed in Epic 3 (its callers are adapted to `classifyPattern`/`tagBlunder`); `classifyBestMove` is audited and removed in Epic 2 if it has no callers.

2. **`blunders.user_id` is `NOT NULL`.** Schema-enforced. The anonymous-write skip is a client-side guard that matches a DB constraint, not a workaround.

3. **Removing `unknown` from the CHECK constraint is a breaking change.** Any code still inserting `'unknown'` fails at DB level the moment the migration applies. Epic 1 must require a pre-deploy audit: `rg "'unknown'" server/scripts/ server/index.js`. Epic 2 extends this audit to `src/` (specifically `ReviewScreen.jsx`, which has a `VALID_CATEGORIES` set and an `'unknown'` fallback at line ~82–84 on the old client-side `POST /api/blunders` path). Similarly, `forbidden_columns` is a live tag today — emitted by `classifier.js` and both import scripts. The new tagger stops emitting it (replacing it with `immediate_threat`), but `forbidden_columns` **stays in the constraint** as a legacy-tolerated value. The audit must enumerate `forbidden_columns` callsites too.

4. **`forced_win` tag ≠ `forced_win` puzzle category.** See settled decisions above.

---

## Epic order

```
Epic 1 (schema + core algorithm)  → unblocked; must land before Epic 2
Epic 2 (production wiring)        → depends on Epic 1 (tagBlunder must exist)
Epic 3 (coach explanation rebuild) → depends on Epic 2 (tagBlunder must be wired and producing
                                     non-null reason/direction on stored blunder rows)
```

---

### Epic 1 — Schema + Core Algorithm

**Goal:** Update the `blunders` schema to support the new tag set and add the `reason` column,
then implement `classifyPattern` and `tagBlunder` — the two new classifier functions.
Neither function exists today. The DB migrations are bundled here because the `reason` column
is exactly what `tagBlunder` returns, and the constraint update must land before the first
`tagBlunder` insert. Together these form one coherent "build the engine" deliverable.

**Scope:**

*Pre-deploy audit (hard prerequisite before any migration runs):*

- Run `rg "'unknown'" server/scripts/ server/index.js` and enumerate every callsite inserting
  a `pattern_category` value. **IF** any live callsite still inserts `'unknown'`, **THEN**
  patch it to fall through to `'suboptimal_move'` before the migration applies.
- Run `rg "'forbidden_columns'" server/scripts/ server/index.js` and enumerate every callsite.
  These callsites are **not patched** — the new tagger stops emitting `forbidden_columns`
  naturally, and the tag stays valid in the constraint as a legacy-tolerated value.

*Data truncation (hard prerequisite — must execute before migration (a)):*

- **TRUNCATE the `blunders` table** before the constraint migration runs. This eliminates
  validation failure on pre-existing rows with `'unknown'` tags. Postgres validates existing
  rows at `ADD CONSTRAINT` time; applying the new constraint to a non-empty table containing
  `'unknown'` rows causes the migration to fail.
- All existing blunder rows are intentionally discarded. They will be regenerated in the
  Epic 2 reprocess-all-games step with correctly tagged rows.

*Migration (a) — update CHECK constraint:*

- Drop the existing `blunders_pattern_category_check` constraint.
- Re-create it as:
  ```sql
  CHECK (pattern_category IN (
    'immediate_threat', 'forced_block', 'forced_win', 'double_threat',
    'undercut', 'overcut', 'figure_7', 'j_shape', 'z_threat',
    'odd_even_threat', 'claimeven', 'claimodd',
    'drawing_move', 'suboptimal_move',
    'forbidden_columns'
  ))
  ```
  `unknown` is excluded. `forbidden_columns` is retained as a legacy-tolerated value even
  though the new tagger no longer emits it. This is a **breaking change** for `unknown` —
  any code still inserting `'unknown'` fails at DB level immediately on migration apply.

*Migration (b) — reason column:*

- Add `reason TEXT` (nullable) to the `blunders` table. No index required; offline inspection only.

*Migration (c) — direction column:*

- Add `direction TEXT` (nullable) to the `blunders` table. Persists the direction field returned
  by `tagBlunder` (`'missed_own'`, `'enabled_opponent'`, or `'defensive_miss'`) as a first-class
  column alongside `reason`. No index required.

*Pre-implementation audit:*

- `rg classifyAll server/` — enumerate all callers; determine which are on the blunder-tagging
  path vs. other paths.
- `rg classifyBestMove server/` — same. Document whether each caller can be replaced by
  `classifyPattern` or must be preserved. Do not retire either function in this epic.

*DETECTOR_REGISTRY perspective audit (prerequisite before implementing `classifyPattern`):*

- Enumerate **every entry in DETECTOR_REGISTRY** (`rg 'DETECTOR_REGISTRY' server/`).
- For each detector, record whether it already accepts a `perspective` argument or defaults
  to `Board.currentPlayer` / derives perspective from `ms` alone.
- Produce a two-column list: detectors that need a `perspective` parameter added vs. those
  that already have it.
- The retrofit must **not alter behavior of the existing `classify()` puzzle-generation path**,
  which is kept entirely unchanged. The puzzle-gen path is NOT being modified in these epics.
  Detectors that gain a `perspective` parameter must keep their current behavior when called
  from `classify()` — use a default of `Board.currentPlayer(ms)` so existing callers are unaffected.

*`classifyPattern(ms, perspective)` — new function:*

```
classifyPattern(ms, perspective) → Promise<Set<string>>
```

- Runs all detectors in the registry with `perspective` as the explicit evaluating player,
  regardless of who is to move in `ms`.
- Returns the **full set** of matching tags; the caller applies the §3.4 priority cascade.
- Each detector must accept `perspective` as an explicit parameter (default: `Board.currentPlayer(ms)`).
  This allows evaluating either player's patterns without constructing movestrings that end on
  their turn.
- `detectClaimeven` runs up to 60 `solver.query` calls per invocation; this cost is acceptable
  because `classifyPattern` is called from `tagBlunder` on the lazy post-game analyze path and
  never blocks the UI. No per-call query budget or wall-clock timeout is required.

*`tagBlunder(moves, playedCol, correctCol, solver)` — new function:*

```
tagBlunder(moves, playedCol, correctCol, solver) → Promise<{
  tag: string,
  direction: 'missed_own' | 'enabled_opponent' | 'defensive_miss',
  reason: string
}>
```

Implements the 5-step priority cascade (`patterns_blunders_challenges.md §3.4`) in order:

1. **Defensive miss** — `forced_block ∈ P(moves, blunderer)` → `{ tag: 'forced_block', direction: 'defensive_miss' }`
2. **Enabled immediate (1-ply)** — `immediate_threat ∈ P(moves + playedCol, opponent)` → `{ tag: 'immediate_threat', direction: 'enabled_opponent' }`
3. **Missed own** — `{ T : T ∈ P(moves, blunderer) ∧ T ∉ P(moves + playedCol, blunderer) }`, priority-pick per §3.4 missed order.
4. **Enabled opponent (2-ply)** — compare `after_blunder` vs `after_correct`; union includes `undercut` via `enabled_self`. Priority-pick per §3.4 enabled order.
5. **Score-based fallbacks** — `drawing_move` → `suboptimal_move`.

**Never throws.** On solver failure: `{ tag: 'suboptimal_move', direction: 'missed_own', reason: 'solver error: <message>' }`.

`reason` is persisted to `blunders.reason` (column added in migration (b) above).

*Player-only pattern guards (encode in tests):*

- **IF** a `missed` or `enabled` set contains `odd_even_threat` or `claimodd` for a Yellow
  perspective, **THEN** that is a detector bug — add an assertion.
- Same for `claimeven` for a Red perspective.

*Tests:*

- Unit test for each per-pattern predicate in §3.3 (missed-own / enabled-opponent /
  defensive-miss directions, each with a concrete movestring from DB or codebase history —
  never invent a movestring by hand).
- Integration test: a position triggering both `missed_own` and `enabled_opponent` resolves
  to `missed_own`.
- Test that `tagBlunder` resolves to `{ tag: 'suboptimal_move' }` (does not throw) on a
  synthetic solver-failure input.
- `classify(moves, candidateCol, scores)` is **not modified** and has no new tests here.

**Acceptance criteria:**

- `INSERT INTO blunders (pattern_category, ...) VALUES ('unknown', ...)` is rejected by the DB.
- `INSERT INTO blunders (pattern_category, ...) VALUES ('forbidden_columns', ...)` succeeds (legacy-tolerated).
- `INSERT INTO blunders (pattern_category, reason, direction, ...) VALUES ('drawing_move', 'win dropped to draw, no pattern detected', 'missed_own', ...)` succeeds.
- The `blunders` table is empty before the constraint migration runs (truncated in the data-truncation step).
- `tagBlunder` resolves (does not throw) on every input, including degenerate and solver-error cases.
- All player-only guard assertions pass for Red-only and Yellow-only patterns.
- No existing caller of `classify()` (puzzle-generation path) changes behavior after the perspective retrofit.

**NOT included:** Updating call sites (Epic 2). Retiring `classifyAll` / `classifyBestMove`
(deferred to Epic 2 after confirming no remaining callers). Any i18n changes (already done).
Reprocessing existing blunder rows (Epic 2 reprocess-all-games step).

**Estimated spec:** 220–260 lines. **Estimated tasks:** 14–18.

---

### Epic 2 — Production Wiring

**Goal:** Wire `tagBlunder` into all production call sites, persist `reason`/`direction` at
every write site, eliminate the `'unknown'` fallback everywhere it exists (including the
frontend), and run a best-effort backfill of existing game rows.

**Scope:**

*Pre-implementation audit:*

- `rg classifyAll server/` and `rg classifyBestMove server/` — enumerate remaining callers
  after Epic 1. Document which can be replaced by `classifyPattern` and which must be preserved.
  This audit result drives the conditional retire step below.

*`'unknown'` fallback audit — extend to `src/`:*

- Run `rg "'unknown'" server/scripts/ server/index.js src/` to enumerate every site still
  emitting `'unknown'` as a `pattern_category` / `VALID_CATEGORIES` member.
- Patch every site found to use `'suboptimal_move'` instead. This is a hard prerequisite:
  the Epic 1 migration removes `'unknown'` from the DB CHECK constraint, so any remaining
  callsite causes a DB error at insert time.

*Call site migrations:*

**`server/index.js` — `POST /api/games/analyze` (server-direct write — primary sparring path):**

The real sparring blunder-persistence path is a 3-hop flow today:
1. `POST /api/games/analyze` computes `patternTag` and returns it in JSON (no INSERT).
2. `ReviewScreen.jsx` reads `patternTag` per move and fires `POST /api/blunders`.
3. `POST /api/blunders` does the actual INSERT.

This epic moves persistence server-side (into hop 1), eliminating the client round-trip for new writes:

- Replace `classify(movesBeforeThisPly, col, scores)` with
  `await tagBlunder(movesBeforeThisPly, col, bestCol, solver)`.
- Destructure: `const { tag, reason, direction } = result`.
- **IF** `req.user` is set, **THEN** INSERT directly into `blunders` with `pattern_category = tag`,
  `reason`, `direction`, and `user_id = req.user.id`. Do not rely on the client to fire
  `POST /api/blunders` for new writes.
- The existing `POST /api/blunders` endpoint is **not removed** — it may still be called by
  older clients. Epic 2 does not rely on it for new writes; it is backward-compat only.
- `tagBlunder` always runs (tag is still returned in the JSON response for the frontend);
  the INSERT is gated on `req.user`.

**`scripts/reprocess_blunders.mjs`** (line ~95) — replace `classify(movesBeforeThisPly, col, scores)`
with `await tagBlunder(movesBeforeThisPly, col, bestCol, solver)`.
Include `reason` and `direction` in the `toInsert` object so all three new columns are populated
on every reprocessed row.

**`scripts/import_papergames_blunders.mjs`** (`extractBlunders`, line ~109) — **SKIPPED / no test
required.** Papergames.io integration was intentionally cut from the product (`product_decisions.md`).
The script must remain compilable (update the `tagBlunder` call signature and `VALID_PATTERN_CATEGORIES`
so it does not reference `'unknown'`), but no test coverage is required and it is not exercised
by Epic 2 acceptance criteria.

*`ReviewScreen.jsx` — frontend `'unknown'` fallback and dead-code cleanup:*

`ReviewScreen.jsx` is a load-bearing participant in the old 3-hop path. After server-direct
write is in place, the entire client-side blunder-write block is removed. The frontend still
reads `patternTag` from the analyze response for display. Changes required:

- Replace the `'unknown'` fallback (line ~82–84: `pattern_category: 'unknown'`) with
  `'suboptimal_move'` before removing the write block (ensures no DB constraint violation on
  any backward-compat `POST /api/blunders` call during the transition window).
- Remove the client-side blunder-write block (lines ~74–101: the `POST /api/blunders`
  fire-and-forget loop). The analyze endpoint is the sole write path after this epic.
- Remove dead code left by the write block removal: `VALID_CATEGORIES`, the `CATEGORY_ORDER`
  import, `blundersWrittenRef`, the `useRef` import, and the `useEffect` that resets the ref.
  Leaving these in place will break `npm run lint` (ESLint 9 `no-unused-vars`).
- `VALID_CATEGORIES` is NOT repurposed to hold blunder-specific tags — the blunder-tag
  allowlist lives exclusively in `server/blunderTags.js`.

*`VALID_PATTERN_CATEGORIES` — consolidate to single canonical set:*

The canonical set is created as `server/blunderTags.js` exporting `VALID_BLUNDER_TAGS`. All
per-file local copies are replaced by importing from this module. Actions:

| Site | Variable name | Action |
|---|---|---|
| `server/blunderTags.js` | `VALID_BLUNDER_TAGS` | **NEW** — 15-tag `Set`, mirrors migration 032 constraint |
| `server/scripts/reprocess_blunders.mjs` | `VALID_PATTERN_CATEGORIES` | **Remove** local set; import `VALID_BLUNDER_TAGS` |
| `server/scripts/import_papergames_blunders.mjs` | `VALID_PATTERN_CATEGORIES` | **Remove** local set; import `VALID_BLUNDER_TAGS` (compilability only) |
| `src/` (`ReviewScreen.jsx`) | `VALID_CATEGORIES` | **Remove entirely** — dead code once write block is deleted |
| `server/index.js` (analyze endpoint insert site) | _(none today)_ | Import `VALID_BLUNDER_TAGS`; add explicit guard: if `tag` not in set, substitute `'suboptimal_move'` |

**VALID_BLUNDER_TAGS contains:** `immediate_threat`, `forced_block`, `forced_win`,
`double_threat`, `undercut`, `overcut`, `figure_7`, `j_shape`, `z_threat`,
`odd_even_threat`, `claimeven`, `claimodd`, `drawing_move`, `suboptimal_move`,
`forbidden_columns`.
**`unknown` is absent.**
**`forbidden_columns` is retained** — legacy-tolerated; new tagger no longer emits it but it
stays in the set and the DB constraint.

*Anonymous user gating:*

- `tagBlunder` runs on **all** paths regardless of auth — tag and reason are always computed
  and returned in the JSON response.
- **IF** `req.user` is absent on the analyze endpoint, **THEN** skip the `INSERT INTO blunders`.
  Do not gate the `tagBlunder` call itself. `blunders.user_id` is `NOT NULL` at the DB level;
  the skip is a server-side guard that matches this constraint, not a workaround.

*Retire `classifyBestMove` (conditional) — preserve `classifyAll`:*

- After the migrations above, run `rg classifyBestMove server/`. **IF** no callers remain,
  **THEN** delete `classifyBestMove`. **IF** callers remain, **THEN** document them and do not delete.
- `classifyAll` is **NOT retired in Epic 2**. It has confirmed active callers: the
  `/api/debug/classify-all` endpoint, `scripts/classify_all.mjs`, and `explainSimulate.js`.
  Run `rg classifyAll server/`, record all callers, and produce an explicit
  "PRESERVE — active callers, removal deferred to Epic 3" finding. Do not delete `classifyAll`.

*Reprocess-all-games step (best-effort backfill — not a release gate):*

- Run `reprocess_blunders.mjs` to re-analyze every game in the DB and populate `blunders`
  with newly tagged rows (including `reason` and `direction`) using `tagBlunder`.
- The `blunders` table was truncated in Epic 1 before the constraint migration; this step
  is the sole source of new blunder rows for historical games post-migration.
- This step is **idempotent** and **best-effort**: do not gate Epic 2 completion on row counts
  or require it to finish before shipping. Analytics and challenge-matching will catch up as
  rows are populated. Do not frame this as a blocking release prerequisite.

**Acceptance criteria:**

- `POST /api/games/analyze` calls `tagBlunder(...)` and — when `req.user` is set — INSERTs
  a `blunders` row with non-null `pattern_category`, `reason`, and `direction`. No call to
  `classify(...)` remains for blunder tagging.
- `tagBlunder` is the sole blunder-tagging entry point on all active write paths.
- No site (server or frontend) inserts or emits `'unknown'` as a `pattern_category` value.
- `VALID_BLUNDER_TAGS` in `server/blunderTags.js` does not contain `'unknown'`. All server
  scripts import from it; `VALID_CATEGORIES` in `ReviewScreen.jsx` is removed as dead code.
- A game blunder by an authenticated user produces a `blunders` row with non-null `reason`
  and `direction` columns.
- A game blunder by an anonymous user does not produce a `blunders` row; `tagBlunder` still
  runs internally and the tag is returned in the analyze JSON response.
- `import_papergames_blunders.mjs` is importable without syntax errors (compilability); no
  runtime test is required for it.
- `POST /api/blunders` with a stale-client `pattern_category: 'unknown'` returns 200/201 (not 500);
  row is stored with `pattern_category = 'suboptimal_move'`.
- `classifyAll` is preserved in `classifier.js` with documented callers; it is not deleted.

**NOT included:** New blunder UI, challenge-matching changes, any change to the Tier-1 coach
explanation path, i18n changes, removing the `POST /api/blunders` endpoint.

**Estimated spec:** 170–210 lines. **Estimated tasks:** 12–15.

---

### Epic 3 — Coach Explanation Rebuild

**Goal:** Replace the `explainSimulate`-based LLM grounding with `tagBlunder`'s structured output
(`{tag, reason, direction}`), and use `classifyPattern` on the correct-move board position to
describe what the best move achieves. After this epic there are exactly two classification APIs:
`classifyPattern` (board-level pattern detection) and `tagBlunder` (blunder analysis and coach
grounding). `explainSimulate.js` and `classifyAll` are removed. The coach explanation has one
clear, verifiable source of truth for why a move was bad.

**Depends on:** Epic 2 — `tagBlunder` must be wired into `POST /api/games/analyze` and
producing non-null `reason`/`direction` on stored `blunders` rows before this epic begins.

**Scope:**

*Pre-implementation audit:*

- Enumerate all callers of `explainSimulate` in `server/` (`rg explainSimulate server/`). Document
  which code paths call it and exactly what they consume from the result (`groups`, `activeCells`,
  `topGroups`, etc.). This is the removal surface.
- Enumerate all callers of `classifyAll` in `server/` (`rg classifyAll connect-four/server/`).
  Document the replacement plan for each caller before any deletion.
- Enumerate every direct caller of `classifyPattern` in `server/` (`rg classifyPattern server/`).
  This is a required pre-change audit: the return-type signature change (if Option A is chosen,
  see below) silently breaks `tagBlunder`'s internal `P()` helper which uses set-membership
  operations on the result. All callers must be identified before any signature change is made.
- Read `buildExplainContext` in `server/index.js` top-to-bottom. Document the four explanation
  types (type1/2/3/4), the `allowedSet` construction path for each, and which functions are
  called exclusively from within it. These are all candidates for removal.

*Reason string enrichment — prerequisite for LLM grounding:*

`tagBlunder`'s `reason` strings are currently terse internal match descriptors
(e.g., `"matched missed_own: double_threat"`). LLM prompts need human-readable context.

- Define a `REASON_TEMPLATES` map (in `server/classifier.js` or a new `server/blunderReasons.js`)
  that maps each `{tag, direction}` pair to a plain-language sentence. Example:
  - `{double_threat, missed_own}` → `"You had a double threat available but played elsewhere, giving up the winning position."`
  - `{immediate_threat, enabled_opponent}` → `"Your move allowed your opponent to create an immediate winning threat."`
  - `{forced_block, defensive_miss}` → `"You had a forced defensive move but played elsewhere, letting your opponent win immediately."`
- Cover all 15 tags × relevant directions. Tags that only appear in one direction (e.g.,
  `forced_block` is always `defensive_miss`) have one entry; others have up to three.
- **`tagBlunder` retains its terse machine-readable `reason` strings.** `blunders.reason` stores
  these terse values as-is (e.g., `"matched missed_own: double_threat"`). `tagBlunder`'s return
  value is not changed; existing tests that assert terse reason strings are not updated.
- **`REASON_TEMPLATES` is applied only inside the prompt builder**, keyed on `{tag, direction}`.
  The prompt builder maps `{tag, direction}` to a human-readable sentence before inserting it
  into the LLM prompt. The `reason` value stored to `blunders.reason` is the original terse
  string from `tagBlunder`; the value passed to the LLM is the enriched sentence from the template.

*`classifyPattern` extension — cell-location source for `allowedSet` (Decision: Option A):*

The `allowedSet` mechanism that constrains which board cells the LLM may reference currently
derives cell data from `explainSimulate`'s group results. Removing `explainSimulate` removes
that source. **No existing detector returns `activeCells` or per-cell coordinate strings** —
detectors return `{ matched: boolean }`, `{ matched, cols }` (column indices), or
`{ matched, correctCol }`. Per-cell coordinate extraction is **real new work**, not a
propagation step.

**Decision: Option A** — `classifyPattern` returns `Map<string, { cells: string[] }>`.

- **Option A (chosen):** Extend `classifyPattern` to return `Map<string, { cells: string[] }>`.
  Add genuine per-cell coordinate output to each relevant detector — a non-trivial sub-task;
  scope and test each detector separately. Existing callers that only need tag names adapt
  with `new Set(result.keys())`.
  - **`tagBlunder` adaptation required:** `tagBlunder` has an internal
    `P(ms, player) => classifyPattern(ms, player)` helper used for set-membership tests
    (`∈`, `∉`, `∪`) across all five cascade steps. If `classifyPattern` returns `Map`, these
    operations break silently at runtime. Adapt as:
    `const P = async (ms, player) => new Set((await classifyPattern(ms, player, solver)).keys())`
    Add a regression test asserting the cascade resolves identically on a known blunder
    movestring (source from DB or codebase, never invented by hand) before shipping.
  - Enumerate every direct `classifyPattern` caller in `server/` (pre-implementation audit above).
    Every caller must be adapted before the signature change ships.

- **Option B (rejected):** Keep `classifyPattern` returning `Set<string>` (tags only). Derive
  annotation cell data from a board/threat-map utility (e.g., `getMajorThreatCells`) independently
  of detectors, in a separate helper called from `buildExplainContext`. No `tagBlunder` adaptation
  required under this option.

*`buildExplainContext` rework — replace simulation with `tagBlunder` + `classifyPattern`:*

`buildExplainContext` currently dispatches to four explanation types (type1/2/3/4) and runs
`explainSimulate` for types 2/3/4. Replace with a unified two-sided grounding:

- **Scope: both blunders and optimal moves.** `POST /api/explain-move-llm` is called with the
  recommended/best column (`DeepRevealButton` passes `candidateCol`) as well as the player's
  played column. `buildExplainContext` must handle both cases. When `col == bestCol` the move is
  optimal; `tagBlunder` is not called because there is no blunder to analyze.
- **Blunder side — `col ≠ bestCol` ("what went wrong"):** Call
  `tagBlunder(movestring, col, bestCol, solver)` → `{tag, reason, direction}`. Use `tag` to
  identify the pattern. Apply `REASON_TEMPLATES` in the prompt builder (keyed on `{tag, direction}`)
  to produce the human-readable sentence inserted into the LLM prompt. The terse `reason` from
  `tagBlunder` is **not** inserted directly into the prompt. Use `direction` for framing
  (missed_own / enabled_opponent / defensive_miss).
- **Optimal-move side — `col == bestCol` ("what the best move achieves"):** Do not call
  `tagBlunder`. Use `classifyPattern(movestring + col, perspective)` to extract patterns active
  after the move and frame the prompt as "this is good because X". The same pattern-context
  mechanism works symmetrically for both cases.
- **Correct-move side (both cases):** `classifyPattern(movestring + bestCol, perspective)` —
  returns patterns active after the best move. For blunder explanations this contrasts with the
  played move; for optimal explanations this is the move itself. This replaces
  `explainSimulate(movestring + contrastCol, ...)`.
- **`allowedSet` derivation:** Build from the union of cell data from
  `classifyPattern(movestring, perspective)` (patterns at the played position) and
  `classifyPattern(movestring + bestCol, perspective)` (patterns after the best move). This
  replaces `buildAllowedSet`, `buildType1AllowedSet`, and `selectTopGroups`. The exact mechanism
  uses the `cells` arrays returned by `classifyPattern` (Option A, Map with cells).
- **Retain unchanged:** board visualizations, `selectContrastMove`, the all-moves-equal /
  settled check, and the `validateAnnotation` gate (annotation integrity, spec 021).
- **Remove:** the type1/2/3/4 dispatch, `buildType12Prompt`, `buildType3Prompt`,
  `buildType4Prompt`, `buildType1AllowedSet`, `selectTopGroups`. Replace with a single unified
  prompt builder (see below).

*LLM prompt template:*

- Write a single new `buildBlunderExplainPrompt({tag, direction, reason, blunderPatternCells, correctMovePatterns, boardViz, postBoardViz, playerName, gap, gapBucket, allowedSet})`.
  Here `reason` is the human-readable sentence from `REASON_TEMPLATES` (not the terse string
  from `tagBlunder`). For optimal-move calls (`col == bestCol`), `tag`/`direction` are omitted
  or null and the prompt frames the move positively.
- The prompt must preserve the P1–P6 annotation constraints from spec 021. The `allowedSet` and
  `validateAnnotation` gate are **retained unchanged** — only the data fed into them changes.
- Do not change the LLM model, the retry logic, the quota gate, or the fallback path in
  `POST /api/explain-move-llm`.

*`explanation_cache` handling:*

- Cached prompts use the old template. Old entries remain valid — users see the explanation text,
  not the prompt. No migration or forced invalidation is required.
- Add a nullable `template_version TEXT` column to `explanation_cache` (new rows get `'v2'`; old
  rows stay NULL). This lets operators identify and optionally purge old-format entries without a
  hard cutover. One `ALTER TABLE ADD COLUMN` migration, no data backfill.

*`explainSimulate.js` removal:*

- After `buildExplainContext` is reworked, run `rg explainSimulate server/` to confirm zero callers.
  **IF** zero callers, **THEN** delete `explainSimulate.js`.
  **IF** callers remain, document them and do not delete until they are migrated.
- `DETECTOR_REGISTRY` is **not removed** — it is the backbone of `classifyPattern`.

*`classifyAll` removal and caller adaptation:*

- `classifyAll` is currently called from: `server/index.js` debug endpoint (~line 2016) and
  `server/scripts/classify_all.mjs`.
- Replace the debug endpoint's `classifyAll` call with two `classifyPattern` calls — one with
  Red perspective, one with Yellow perspective. Return both pattern sets in the response shape
  (e.g., `{ red: [...tags], yellow: [...tags] }`). This preserves the endpoint's "what patterns
  exist in this position" debugging purpose.
- Replace `server/scripts/classify_all.mjs` with a script that calls `classifyPattern`
  (both perspectives) per position, matching the new canonical pattern-inspection API.
- After all callers are adapted, run `rg classifyAll connect-four/server/` to confirm zero hits,
  then delete `classifyAll` from `classifier.js`.

*Tests:*

- Unit test: `REASON_TEMPLATES` covers all 15 tags × relevant directions; every `{tag, direction}`
  pair used by `tagBlunder` has a corresponding human-readable sentence. Use snapshot assertions
  so a future change to template text is an explicit, reviewable diff.
- Unit test: `classifyPattern` returns non-empty `cells` for at least the `immediate_threat` and
  `double_threat` detectors on verified movestrings from the codebase or DB — never invented by hand.
- Unit test: `tagBlunder`'s cascade resolves identically before and after the `P()` adaptation —
  regression test on a known blunder movestring sourced from DB or codebase, never invented by hand.
- Integration test: `buildExplainContext` on a known blunder movestring (`col ≠ bestCol`) returns
  a non-null prompt containing a human-readable enriched reason sentence (from `REASON_TEMPLATES`)
  and passes `validateAnnotation`.
- Integration test: `buildExplainContext` on an optimal-move call (`col == bestCol`) returns a
  non-null prompt and passes `validateAnnotation` (no `tagBlunder` call on this path).
- **Manual quality gate (required before shipping):** Compare LLM explanations generated by the
  new system against a sample of 10 existing cached explanations for the same movestrings. Any
  regression in accuracy or clarity blocks the epic. This is a human review step.

**Acceptance criteria:**

- `POST /api/explain-move-llm` produces a valid, `validateAnnotation`-passing explanation for
  both a blunder position (`col ≠ bestCol`) and an optimal-move position (`col == bestCol`).
- `rg explainSimulate server/` returns zero hits (file deleted).
- `rg classifyAll connect-four/server/` returns zero hits in the main source tree (function
  deleted from `classifier.js`; the debug endpoint uses `classifyPattern` with both perspectives;
  the replacement script uses `classifyPattern`).
- `classifyPattern` returns `Map<string, {cells: string[]}>` and all callers are updated,
  including `tagBlunder`'s internal `P()` adapted to `new Set(result.keys())`.
- `REASON_TEMPLATES` covers all `{tag, direction}` pairs; the LLM prompt contains a
  human-readable enriched reason sentence. `blunders.reason` still stores the terse
  machine-readable string from `tagBlunder`.
- `validateAnnotation` still passes for LLM-generated explanations (no annotation integrity regression).
- A `template_version` column exists on `explanation_cache`; new rows have value `'v2'`.

**NOT included:** Changing the LLM model or provider, modifying the annotation integrity spec
(spec 021) or Deep Reveal product (spec 022), UI changes to explanation display, reprocessing
the `explanation_cache` table, new explanation categories or types.

**Estimated spec:** 190–230 lines. **Estimated tasks:** 13–17.
