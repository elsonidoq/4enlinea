---
name: allen-v-rule-examples
description: Verified Connect Four movestrings demonstrating all Allen V-rules V1–V5; all cases confirmed as of 2026-05-18
metadata:
  type: reference
---

Canonical file: `specs/008-new-puzzle-categories/allen_v_rule_examples.yaml`

## Verified (2026-05-18) — ALL CASES DONE

| Rule | Movestring | Winner | Key structure |
|------|-----------|--------|---------------|
| V5   | `42354643256425346355663` | Draw | col1r3(R) + col7r5(Y) odd threats → T7 cancels both; all scr=0 |
| V3   | `77273746` | Red | col5r1(R) + col7r5(Y) cancel via T7; col1r1(R) survives; scr=[17,-17,-17,-17,17,-17,16] |
| V2   | `727364` | Black | col1r1(Y) + col5r1(Y) odd threats; Red has 0 threats; all scr=-18 |
| V1   | `44452556366` | Red | col1r1(R), col3r3(R), col7r3(R) — 3 Red odd threats, 0 Black odd; no T7 needed |
| V4   | `2134124321317273` | Black | col4r4(Y) even threat; no odd threats anywhere; scr all negative |

## Construction insights

- **V2/V3 row-1 trick:** Yellow (or Red) playing 3 consecutive cols at row 1 creates two simultaneous horizontal windows. E.g. cols 2,3,4 → `[Y]` at col1 row1 AND col5 row1.
- **V1 structure:** Red at cols 2,3,4,5 row1 + Red at col3,6 row3 creates three `[R]` windows in separate columns. Black mirrors with even-row threats only (T6 makes them worthless).
- **V4 structure:** Fill cols 1–3 rows 1–4 with alternating R/Y; Yellow gets 3-in-a-row at row 4 (cols 1–3), threatening col4 row4. Critical: rows 1–3 must alternate to avoid odd-row threats.
- **T7:** one Red odd + one Black odd in *separate* columns cancel 1:1. Count pairs.

**Why:** Working examples needed for Allen V-rule documentation in spec 008.
