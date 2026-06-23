---
name: project_detect_odd_even_threat_yellow
description: detectOddEvenThreat supports both Red and Yellow; parity abstraction and renamed categoryEvidence fields
metadata: 
  node_type: memory
  type: project
  originSessionId: 33ab3dc9-3b9c-488b-be39-b1881dff9ec5
---

## Parity abstraction in detectOddEvenThreat

`detectOddEvenThreat` in `connect-four/server/classifier.js` supports both perspectives. The parity formula is:

```js
const majorFlag = perspective === 1 ? 'rm' : 'ym';
const minorFlag = perspective === 1 ? 'rn' : 'yn';
const isGoodRow = row => row % 2 === (perspective - 1);
```

- Red (1): good row = `row % 2 === 0` (Allen odd rows, 0-indexed)
- Yellow (2): good row = `row % 2 === 1` (Allen even rows, 0-indexed)

## categoryEvidence field names

The fields use perspective-neutral names (not "odd"/"even"):
- `goodRowCol`, `goodRow` — the majority-threat column/row
- `badMinorCol`, `badMinorRow` — the minor-threat column/row

These fields are not consumed anywhere downstream — safe to rename if needed.
