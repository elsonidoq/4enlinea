---
name: deep-reveal-zone-validation-fixes
description: "Four P5Strong-related bugs fixed in deep reveal: missing whitelist for played col/cell, LLM zone tag malformation (column→col), prompt format gaps"
metadata: 
  node_type: memory
  type: project
  originSessionId: d5fc9c08-c38f-4637-8716-9aed7fa9081b
---

## LLM zone tag malformation trap

LLMs frequently write `[zone:column 2]Column 2[/zone:column]` instead of the required `[zone:col2]...[/zone:col2]`. The frontend parser (`src/lib/annotatedText.js`) requires exact opening/closing tag match via `\1` backreference — mismatched tags silently render as plain text with no highlights. `normalizeZoneTags()` in `server/index.js` patches this on both first attempt and retry.

When prompting the LLM, explicitly warn: "col (3 letters), NOT column" and show exact syntax examples.

## PENDING: P5strong rejects played cell references

When an LLM references the exact cell where the disc landed (e.g., `[zone:c3r3]that cell[/zone:c3r3]`), `checkP5Strong()` in `server/annotationGate.js` rejects it because only pattern-derived cells are in `allowedSet`. Fix: also whitelist the played cell in `server/explainContext.js` (computed by counting discs in `col` within `movestring`).
