---
name: deep-reveal-zone-validation-fixes
description: "Four P5Strong-related bugs fixed in deep reveal: missing whitelist for played col/cell, LLM zone tag malformation (column→col), prompt format gaps"
metadata: 
  node_type: memory
  type: project
  originSessionId: d5fc9c08-c38f-4637-8716-9aed7fa9081b
---

## Bugs fixed (2026-06-13)

### 1. P5strong: col_not_allowed for played/better columns
`server/explainContext.js` only whitelisted the contrast column in allowedSet, not the played column. LLM naturally mentions "Playing [zone:col2]column 2[/zone:col2]..." → rejected. Fixed by adding `{ col, validationOnly: true }` for the played column alongside the existing contrast column entry.

### 2. LLM zone tag malformation (column N → colN)
LLMs frequently write `[zone:column 2]Column 2[/zone:column]` instead of the required `[zone:col2]...[/zone:col2]`. The frontend parser requires exact opening/closing tag match (`\1` backreference), so mismatched tags are treated as plain text — no highlights render.

Fixed by adding `normalizeZoneTags()` in `server/index.js`:
- Normalizes `[zone:column N]` → `[zone:colN]` (opening tags)
- Pairs opening with closing tags and fixes closing to match (`[/zone:column]` → `[/zone:colN]`)

### 3. Prompt "Hard grounding rules" hid allowed columns from LLM
The prompt listed only pattern-derived cells in "Strategic reference cells" and said "NOT where the move was played." `validationOnly` entries (played/contrast columns) were hidden from the prompt. LLM had no way to know which columns it could reference.

Fixed in `server/llmCoachHelpers.js`:
- Explicitly list allowed columns with exact zone tags: `[zone:col3]column 3[/zone:col3]`
- Removed misleading "NOT where the move was played" label
- Added explicit syntax examples and "col (3 letters), NOT column" warning

### 4. Pending: P5strong: cell_not_allowed for played cell
When LLM references the exact cell where the disc landed (e.g., `[zone:c3r3]that cell[/zone:c3r3]`), it's rejected because only pattern-derived cells are in allowedSet. Fix: also whitelist the played cell (computed by counting discs in `col` within `movestring`). Handoff prompt written for next agent.

## Files
- `server/explainContext.js` — allowedSet construction, played col/cell whitelisting
- `server/llmCoachHelpers.js` — prompt building, grounding rules, format instructions
- `server/index.js` — `normalizeZoneTags()`, applied to both first attempt and retry
- `server/annotationGate.js` — `checkP5Strong()` validation logic (read-only reference)
- `src/lib/annotatedText.js` — frontend `parseAnnotatedText()` zone parsing (read-only reference)
