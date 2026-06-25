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

## P5strong:tg — zero-count threat contradiction trap

`formatThreatStats` (in `explainContext.js`) outputs bare `0` (no zone tag) when a threat count is zero. The prompt instruction in `llmCoachHelpers.js` says "never write a bare number — copy the zone tag from that line". When the line has no zone tag (count = 0), the LLM invents `[zone:tg]` to satisfy the instruction. `checkP5Strong` always fails `tg`.

**Fix (2026-06-24):** Prompt instruction now has an explicit exception: "If a line shows a bare '0' with no zone tag, write '0' without any zone tag — never use `[zone:tg]` or any other invented tag for a zero count." (`llmCoachHelpers.js` line ~769)

**Why:** If you ever edit the threat zone tag instruction in `llmCoachHelpers.js`, preserve this zero-count exception or the `P5strong:tg` failure will resurface.

## P3:engine_jargon — markup tags stripped before jargon scan

`checkP3` in `annotationGate.js` scans for forbidden slugs (including `forced_win`). Before 2026-06-24, it scanned the raw text including `[term:forced_win]` markup — the tag spec itself triggered the check even though the visible text was fine. Fixed by stripping all `[zone:...]`/`[term:...]` tags before scanning. Only visible text is now checked.

**Why:** If you add a new forbidden slug and a KB term shares that slug name, the jargon check will silently fire on every response that uses that term tag — even correct ones.

## PENDING: P5strong rejects played cell references

When an LLM references the exact cell where the disc landed (e.g., `[zone:c3r3]that cell[/zone:c3r3]`), `checkP5Strong()` in `server/annotationGate.js` rejects it because only pattern-derived cells are in `allowedSet`. Fix: also whitelist the played cell in `server/explainContext.js` (computed by counting discs in `col` within `movestring`).
