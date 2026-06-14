# Data Model: Coach Explanation Rebuild (Epic B)

All shapes are **internal** to the server layer. None appear in HTTP responses.

## GroupRecord (leaf-level, `collectLeaves` output)

Produced at terminal leaves in `explainSimulate.js:collectLeaves`.

```js
{
  cells: string[],           // 4 cells in wire format: "c${col+1}r${row+1}" (1-indexed)
  owner: 'player'|'opponent', // player = coached player; opponent = the other player
  type: 'completed'|'draw_threat'
}
```

**Constraints**:
- `cells` always has exactly 4 elements (one 4-window)
- `owner` is derived from disc color, not from perspective variable:
  - `type: 'completed'`: `wonByPerspective → owner='player'`; `wonByOpponent → owner='opponent'`
  - `type: 'draw_threat'`: owner = player whose discs occupy 3 of the 4 cells
- Cell wire format: `c${col+1}r${row+1}` — both are 1-indexed to match existing `zoneParser.js` convention

---

## AggregatedGroup (aggregation output, `explainSimulate.js:aggregateLeaves`)

Keyed in the output Map by `canonicalCells:owner` where `canonicalCells` is the cells array sorted alphabetically and joined with `,`.

```js
{
  cells: string[],           // same wire format as GroupRecord
  owner: 'player'|'opponent',
  completed_freq: number,    // N_won_leaves_where_group_appeared / total_leaves
  draw_freq: number,         // N_draw_leaves_where_group_appeared / total_leaves
  // total_leaves = wonByPerspective + wonByOpponent + draws + all_depth_limit_leaves
}
```

**Key construction**: `canonicalCells = cells.slice().sort().join(',')` + ':' + owner

**Two separate records** for same 4-window with different owners — never merged. The aggregation Map key disambiguates them.

**Denominator**: `total_leaves` includes ALL leaves (won + draw + depth_limit at any ply), NOT just perspective-to-move leaves. This differs from the existing `perspectiveLeaves` denominator used for pattern ratios. Both denominators coexist in the output.

---

## AllowedSetEntry (gate input, internal contract)

Built by `buildAllowedSet()`. Two structural variants:

```js
// CONCRETE-ELIGIBLE: ≥2 discs of the owner in this group
{
  cells: string[],   // wire-format cell coords, same as GroupRecord
  zoneSpec: string   // e.g. "cells:c4r3,c5r3,c6r3,c7r3" or "col4" if all in one column
}

// ABSTRACT-ONLY: <2 discs of the owner in this group
{
  col: number,       // 0-indexed column (e.g. col4 → col: 3)
  parity: 'odd'|'even',  // parity of the key completing cell's row
  zoneSpec: string   // e.g. "col4" (always column-level for abstract entries)
  // NO cells field — structural enforcement of D2 grounding contract
}
```

**D2 eligibility rule** (per spec FR-020):
- For player groups: count discs of the coached player in the 4 cells
- For opponent groups: count discs of the opponent in the 4 cells
- A coached-player disc inside an opponent group does NOT count toward opponent eligibility

**zoneSpec construction** for CONCRETE-ELIGIBLE:
- All 4 cells in same column: `col${col+1}` (1-indexed)
- Cells span multiple columns: `cells:${cells.join(',')}` (cells in original order)

---

## ExplainContext (return value of `buildExplainContext`)

```js
{
  prompt: string | null,           // null when allMovesEqual=true
  allowedSet: AllowedSetEntry[] | null,  // null when allMovesEqual=true
  allMovesEqual: boolean,          // true triggers immediate short-circuit in handler
}
```

**HTTP response shape** (unchanged from Epic A, per FR-038):
```js
{ explanation: string, prompt: string, cached?: boolean }
```
`allowedSet` is **never** in the HTTP response.

---

## ExplainTypeResult (classifier output)

```js
// Types 1, 2, 4
{ type: 'type1' | 'type2' | 'type4' }

// Type 3 only — includes parity flip data for frozen sentence
{
  type: 'type3',
  parityFlipData: {
    colA: number,         // played column, 1-indexed (for user display)
    colX: number,         // parity-flipped column, 1-indexed (always = colA per R7)
    rowR: number,         // landing row after placing, 1-indexed
    playerLabel: 'you' | 'your opponent',  // whose parity story this is
  }
}
```

---

## State transitions

```
Position (movestring, col)
  ↓ solver.query(movestring) → preScores
  ↓ score_coached check
  ├─ allMovesEqual → { prompt: null, allowedSet: null, allMovesEqual: true }
  └─ notAllEqual
       ↓ explainSimulate × 2 (A branch, B branch) → leaves with groups
       ↓ aggregateLeaves → AggregatedGroup Map per branch
       ↓ selectTopGroups → AggregatedGroup[] (≤10)
       ↓ buildAllowedSet → AllowedSetEntry[]
       ↓ classifyExplanationType → ExplainTypeResult
       ↓ buildContextBlock → string
       ↓ buildTypeNPrompt → string
       → { prompt: string, allowedSet: AllowedSetEntry[], allMovesEqual: false }
```

---

## Table changes

**No new migrations required** (per spec Assumption bullet 6).

- `deep_reveal_failures` table: already exists (Epic A migration 031). Epic B logs to it using existing schema.
- `explanation_cache.deep_reveal_json`: shape `{ explanation, prompt }` — unchanged (FR-039).
