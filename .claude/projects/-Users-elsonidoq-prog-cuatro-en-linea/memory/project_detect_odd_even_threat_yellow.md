---
name: project_detect_odd_even_threat_yellow
description: detectOddEvenThreat extended to Yellow perspective (2026-06-20); FR-009 lifted; parity abstraction + renamed categoryEvidence fields
metadata: 
  node_type: memory
  type: project
  originSessionId: 33ab3dc9-3b9c-488b-be39-b1881dff9ec5
---

## Change (2026-06-20)

`detectOddEvenThreat` in `connect-four/server/classifier.js` (line ~878) was Red-only
per FR-009. The guard `if (perspective !== 1) return { matched: false }` was removed.

## Parity abstraction

```js
const majorFlag = perspective === 1 ? 'rm' : 'ym';
const minorFlag = perspective === 1 ? 'rn' : 'yn';
const isGoodRow = row => row % 2 === (perspective - 1);
```

- Red (1): good row = `row % 2 === 0` (Allen odd rows, 0-indexed)
- Yellow (2): good row = `row % 2 === 1` (Allen even rows, 0-indexed)

All four parity literals in the body replaced with `isGoodRow(row)` / `!isGoodRow(row)`.

## Renamed categoryEvidence fields

Old → New:
- `oddRowCol` → `goodRowCol`
- `oddRow` → `goodRow`
- `evenMinorCol` → `badMinorCol`
- `evenMinorRow` → `badMinorRow`

These fields are not consumed anywhere downstream (grep confirmed); safe to rename.

## Test update

`tests/classifier/classifier.test.js`: four field-name assertions updated; the old
"Yellow turn — must not match (FR-009)" negative test flipped to a positive (the board
`'333334444466306640210'` correctly matches for Yellow with all-positive scores).

**Why:** Yellow has an identical odd-even threat structure — promote a good-parity minor
without accidentally promoting a bad-parity one. The only differences from Red are the
threat flag pair and the parity polarity, both now derived from `perspective`.
