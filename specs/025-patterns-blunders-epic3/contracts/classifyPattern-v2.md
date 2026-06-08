# Contract: classifyPattern (v2)

## Signature

```js
classifyPattern(ms, perspective, solver) → Promise<Map<string, { cells: string[] }>>
```

**Module**: `connect-four/server/classifier.js`

## Version History

| Version | Return type | When |
|---|---|---|
| v1 (Epic 1) | `Promise<Set<string>>` | Before this epic |
| v2 (Epic 3) | `Promise<Map<string, { cells: string[] }>>` | This epic |

## Parameters

- `ms` — 0-indexed movestring (digits 0–6)
- `perspective` — 1 (Red) or 2 (Yellow)
- `solver` — c4solver wrapper with `.query(ms)` method

## Return value

`Map<string, { cells: string[] }>` where:
- Key: matched tactical pattern tag
- Value: `{ cells }` — array of wire-format cell coordinates

**Wire format**: `"c{col+1}r{row+1}"` (1-indexed)
**Examples**: `"c4r3"`, `"c1r1"`, `"c7r6"`

**Empty `cells`** (ABSTRACT-ONLY): detectors with no spatial output — `forced_win`,
`forced_block`, `forbidden_columns`, `z_threat`, `odd_even_threat`, `claimeven`.

**Non-empty `cells`** (CONCRETE): `immediate_threat`, `double_threat`, `undercut`, `overcut`,
`figure_7`, `j_shape`, `claimodd`.

## Cells derivation per detector

| Detector | cells derivation |
|---|---|
| `immediate_threat` | `cols.map(c => "c${c+1}r${board.colHeights[c]+1}")` |
| `double_threat` | Same as immediate_threat |
| `undercut` / `overcut` / `figure_7` / `j_shape` | `highlightMetadata.cells.map(c => "c${c.column+1}r${c.row+1}")` |
| `claimodd` | `["c4r${board.colHeights[3]+1}"]` (correctCol is always 3) |
| All others | `[]` (ABSTRACT-ONLY) |

## Callers

### tagBlunder P() helper (MUST ship in same commit as signature change)

```js
// Before (v1):
const P = (ms, player) => classifyPattern(ms, player, solver);
// P returns Set<string> directly — has() works

// After (v2):
const P = async (ms, player) => new Set((await classifyPattern(ms, player, solver)).keys());
// P still returns Set<string> — has() works unchanged
```

### buildExplainContext (new primary caller after Epic 3)

```js
// Get patterns as Map (for cells):
const patternsMap = await classifyPattern(ms, perspective, solver);

// Get tag names only:
const tagSet = new Set(patternsMap.keys());
```

### debug endpoint / classify_all.mjs (adapted in FR-020/FR-021)

```js
const redMap = await classifyPattern(ms, 1, solver);
const yellowMap = await classifyPattern(ms, 2, solver);
return {
  red: [...new Set(redMap.keys())],
  yellow: [...new Set(yellowMap.keys())],
};
```

## Invariants

- All callers adapted atomically in the same commit as the signature change.
- `tagBlunder`'s P() adapter ships in the same commit.
- `cells` is never undefined — always `[]` when no spatial output.
- The inline detector list in `classifyPattern` must match `DETECTOR_REGISTRY` in
  `explainSimulate.js` before the latter is deleted (reconciliation step T16).
