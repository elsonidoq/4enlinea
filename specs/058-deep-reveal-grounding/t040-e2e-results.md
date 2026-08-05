# T040 — End-to-end acceptance results

Real-pipeline re-run (`computeMechanism` → `toAllowedSet` → `guardExplainMoveLlmPayload`, the exact
sequence `server/index.js`'s fresh-generation branch runs, including a real `OPENAI_API_KEY` LLM
call — not a hand-written fixture) for the 4 staging movestrings from the epic's evidence table.
Raw output: `t040-e2e-results.json` (same directory).

Script: `t040-e2e-script.mjs` (same directory) — rerunnable as-is with `node
specs/058-deep-reveal-grounding/t040-e2e-script.mjs` from `connect-four/`. `playedCol` for the first 3 boards was derived as the
digit immediately following each prefix in the full `3154442332131341225551` game string (each of
the 4 movestrings is a verified prefix of the same 22-ply game); `playedCol=5` for the full string
matches the previously-verified value from earlier batches' handoff notes.

## Results per board

| movestring | col | offered | required | emitted | required ⊆ emitted | Decision A rejections |
|---|---|---|---|---|---|---|
| `3154` | 4 | `col6`, `col5` | (none) | `col6`, `col5` | yes | 0 |
| `315444233213` | 1 | `col4`, `col2`, `c3r4`, `future:windows:c3r5,c7r1` | (none) | `col2`, `col4`, `c3r4` | yes | 0 |
| `315444233213134122` | 5 | `col3`, `col6`, `c1r3`, `c1r4` | `c1r3` | `col3`, `c1r3`, `col6` | yes | 0 |
| `3154442332131341225551` | 5 | `col3`, `col6`, `c1r3`, `c1r4`, `windows:c1r3,c7r6`, `c7r6`, `future:windows:c2r6,c5r5` | (none) | `col6`, `col3` | yes | **2** (`c2r6`, `c5r5`) |

**SC-004 (required ⊆ offered ⊆ ... )**: holds for all 4 boards — every `requiredSpecs[]` entry
appears in `emittedSpecs[]` (checked via `guarded.explanation`'s actual `[zone:...]` tags, not the
raw pre-guard mechanism).

## Decision A mitigation — did whole-window-only actually reject anything real?

**Yes, on the exact board that motivated this feature.** On `3154442332131341225551` (the epic's
own evidence row, `forkCells: ["c2r6","c5r5"]`), the LLM's raw mechanism named the two deep fork
cells as bare coordinates in prose: *"...they can press the four-in-a-row line at c2r6 and also keep
the linked threat at c5r5..."*. `promoteRawCoordinates` wrapped both as real `[zone:c2r6]`/
`[zone:c5r5]` zone tags. `checkP5Strong` then rejected both — the engine only offered these two
cells as a single `future:windows:c2r6,c5r5` unit (`windowOnly: true`), never as standalone
single-cell aliases, and Decision A requires an exact-signature match, not per-cell membership. Both
promotions fell back to flattened prose per the settled FR-011/FR-012 conflict resolution
(spec.md Edge Cases): the served explanation reads *"...they can press the four-in-a-row line at
column 2 and also keep the linked threat at column 5..."* — vague prose, not a confidently-wrong
highlight, and not a raw internal token either.

This is the real, user-visible cost the owner was warned about and accepted. On the other 3 boards
(no `windows:`/multi-cell alias was named piecewise in the served text), Decision A rejected
nothing. **Total: 2 rejections across the 4-board sample, both on the one board with a genuine
deep-fork window alias, both real losses of a would-be single-cell highlight that a per-cell rule
would have kept.**

## SC-001 — every named square/line/future square carries a highlight

Holds for 3 of 4 boards without qualification. On the 4th board
(`3154442332131341225551`), the two deep-fork future squares are named in prose but do **not**
carry a highlight in the served text — by design, per the settled FR-011/FR-012 conflict
resolution (Story 3 ranked above Story 1's promotion goal for exactly this case) and Decision A.
This is the intended, documented degradation, not a defect.
