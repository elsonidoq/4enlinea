---
name: project_annotation_gate_and_zones
description: "Coach annotation gate (annotationGate.js/explainContext.js) — allowedSet shapes, P5strong/P3 zone-validation traps, the deep_reveal_failures debug table, and the blunder-pipeline debugging guide"
metadata: 
  node_type: memory
  type: project
  originSessionId: 61abbe1a-cb8c-4db3-a79d-d3e4d4378c9a
---

Everything about the production coach's **annotation gate** (`server/annotationGate.js` + `server/explainContext.js` + `llmCoachHelpers.js`) and its zone-tag validation. Part of the live `/api/explain*` path (see [[project_explain_system]]).

## Internal contracts
- `buildExplainContext` returns `{ prompt, allowedSet, allMovesEqual }`; `allowedSet` is NEVER in any HTTP response.
- **allowedSet shapes:** CONCRETE-ELIGIBLE = `{ cells, zoneSpec }` (≥2 owner discs); ABSTRACT-ONLY = `{ col, parity, zoneSpec }` (no `cells`).
- **`allowedSet = null` vs `[]`:** `null` → `validateAnnotation` SKIPS P5strong entirely (use when all matched patterns are Tier 3 / position-global); `[]` → FAILS every `tg` zone on P5strong (use the real array when ≥1 Tier-1/2 entry exists). Rule lives in `explainContext.js` allowedSet derivation.
- `findMajorThreatWindows` is the canonical group-level threat scanner — never `getMajorThreatCells` for group ops.
- `classifyExplanationType` must run BEFORE simulation; Type 1 bypasses simulation entirely.
- **`inverted` semantic:** `getGapAndFraming.inverted` is TRUE when the user played **SUBOPTIMALLY** (FR-008's "inverted==true → optimal" was WRONG). Use `contrast.isOptimal` from `selectContrastMove`; never rely on `inverted` to mean optimal.
- `classifyPattern` returns a **Map**; pick one tag via `PRIORITY.find(t => map.has(t))` — NOT `[...map.keys()]` (Promise.all insertion order is non-deterministic). Its inline detector list must stay in sync with the old DETECTOR_REGISTRY (circular-dep avoidance; marked by a comment).

## Zone-validation traps
- **Zone-tag malformation:** LLMs write `[zone:column 2]…[/zone:column]` instead of `[zone:col2]…[/zone:col2]`; the frontend parser (`annotatedText.js`) needs an exact `\1` backreference match or it silently renders plain text. `normalizeZoneTags()` (`server/index.js`) patches this on attempt + retry. Prompt must warn "col (3 letters), NOT column" with syntax examples.
- **P5strong:tg zero-count trap:** `formatThreatStats` emits bare `0` (no zone tag) for a zero count, but the prompt says "never write a bare number — copy the zone tag". The LLM then invents `[zone:tg]` and `checkP5Strong` always fails `tg`. Fix (2026-06-24, `llmCoachHelpers.js` ~769): explicit exception "if a line shows bare '0' with no zone tag, write '0' with no tag." **Preserve this exception** if you edit the threat-zone instruction.
- **P3 jargon scan strips markup first:** `checkP3` (annotationGate.js) scans visible text for forbidden slugs (e.g. `forced_win`) only AFTER stripping `[zone:…]`/`[term:…]` tags — else a KB `[term:forced_win]` tag itself trips the check. Adding a forbidden slug that shares a KB term name would silently fire on every correct use without this.
- **PENDING — played cell rejected:** `checkP5Strong` rejects `[zone:c3r3]` for the exact landing cell (only pattern-derived cells are in `allowedSet`). Fix: also whitelist the played cell in `explainContext.js` (count discs in `col` within `movestring`).

## Debug tools
- **`deep_reveal_failures` table** (Supabase) — logged by `/api/explain-move-llm` whenever `validateAnnotation` fails on BOTH attempt + retry. Columns: `id, position_hash, movestring, col, endpoint, llm_prompt, raw_llm_output, failure_reason, created_at`. `failure_reason` = JSON array of P5strong codes (`P5strong:col_not_allowed:col2`, `:cell_not_allowed:c3r4`, `:tg`). Query it when LLM responses look spatially wrong or P5strong seems to over-reject — it shows exactly what the LLM said and why.
- **Blunders silently not populated — check in order:** (1) auth gate — `insertGameBlunder()` returns silently when `row.user_id` is falsy (`loadUser` → `req.user=null` on expired token/missing header/Supabase error); log `req.user` before the INSERT guard. (2) fire-and-forget — INSERT errors go to server stdout only. (3) ReviewScreen session race — analyze fetch in `useEffect([id])`; null session on mount = no token; log `session`. (4) `scoreMove` quality — if `quality==='blunder'` never fires, `tagBlunder` never runs.

**Open:** migration `031_deep_reveal_failures.sql` may need applying to Supabase if not done during Epic A.


---

## (merged from `project_zone_alias_must_match_prompt` — Zone alias map must be populated for every metric that appears with zone tags in the prompt — mismatch silently causes P1:invalid_spec failures)

**Rule:** every zone alias used in the LLM prompt MUST have an entry in `zoneAliasMap`. If the alias is absent, `expandZoneAliases` silently skips it, the raw alias name (e.g. `player-major-pre`) reaches `validateAnnotation`, and `P1:invalid_spec:player-major-pre` fires.

**Why:** discovered 2026-06-24 when major threat zone aliases were made conditional (`showPlayerMajor`) but major threat counts always appear in the prompt. The LLM correctly copied the zone tag format from the prompt, but the alias wasn't in the map, so expansion never happened.

**How to apply:** the invariant is: *alias in map ↔ row visible in prompt*. Concretely:
- Both **major and minor threat rows** are hidden entirely when the comparison isn't meaningful.
- Aliases for each metric are added to `zoneAliasMap` only when `showPlayerMajor` / `showOpponentMajor` / `showPlayerMinor` / `showOpponentMinor` is true — exactly matching when the row appears.
- Any new conditional metric follows the same pattern: gate the alias addition on the SAME condition that gates the row in `formatThreatStats`.

**Empty-cell safety:** `cellsToZoneSpec([])` returns `'tg'` (gate skips it), not `'windows:'` (which passes P1 syntax but fails P1:empty). Use `tg` as the sentinel for any zone spec derived from an empty cell list.
