---
name: allis-rule-examples
description: "Verified Connect Four movestrings for all 9 of Allis's strategic rules; all confirmed 2026-05-18"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 69c7d065-ea4d-4481-93a1-0ddc58cab74f
---

Canonical files: `docs/knowledge-base/allis-*.md` (each rule's `worked_examples` field)

## Verified (2026-05-18)

| Rule | Movestring | Key structure |
|------|-----------|---------------|
| claimeven (boardwide) | `2364354354354256` | all par=E, [R] at col2/col6 row4, all scr=-13 |
| claimeven (singlepair) | `7112233` | Claimeven col4 rows1-2; [R] at col4 row2 (Red 3-in-row cols1-3 row2) |
| baseinverse | `2233` | (col1,row1)+(col4,row1) in (r) window cols1-4 row1; structural only — col4 scr=18 |
| vertical | `41424` | Vertical col4 rows4-5 (upper=row5 odd); [R] at col4 row4; all scr≤0 |
| aftereven | `71122` | Red cols1-2 row2; Claimeven pairs col3/col4 rows1-2 cover empties; structural — col2 scr=+2 |
| lowinverse | `45675172537` | col4+col6 Vertical pairs rows2-3 (upper=row3 odd); (r) window cols4-7 row3; all scr≤0 |
| highinverse | `45675172537` | same position; col4+col6 triple rows2,3,4 (lower=even, mid=odd, upper=even) |
| before | `36666` | "/" diagonal col3-6 rows1-4; Red at rows1,4; Claimeven col4 rows1-2 + Vertical col5 rows2-3; all scr≤0 |
| baseclaim | `263223362` | P1=col5r1, P2=col4r1 (odd), P3=col1r1, E=col4r2; "\" diag (col5-col2 rows1-4) has Red at col3r3+col2r4 → (r) through P1+E; horiz row1 cols1-4 has Red at col2r1+col3r1 → (r) through P2+P3; all scr≤0 |
| specialbefore | `2365555` | "/" diag (col2r1)-(col3r2)-(col4r3)-(col5r4) Before group; col3r2 directly playable (col3r1=Yellow); col4r3 Vertical; extra=col1r1; all scr≤0 |

## Construction notes

- baseinverse and aftereven examples are structural demos; the overall positions are not Black-winning (some scr>0 columns). This is noted in the KB descriptions.
- lowinverse and highinverse share the same movestring — valid because the same position demonstrates both rules.
- baseclaim and specialbefore both found without Gemini assistance (2026-05-18).
