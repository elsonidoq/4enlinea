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


---

## (merged from `project_odd_even_threat_puzzle_only` — odd_even_threat is PUZZLE-ONLY since 2026-06-25 — still a classifyPattern tag + puzzle category, but de-listed from the coach prompt and the blunder vocabulary)

`odd_even_threat` lives a split life after 2026-06-25, and grepping `classifier.js` will mislead you: `detectOddEvenThreat` is **still registered in `classifyPattern`'s detector list**, so the tag still appears in pattern Maps. But it is **de-listed from the coach and blunder vocabularies** — do NOT re-add it to either without a reason.

**Still wired (puzzle path — KEEP):** `categories.js` (VALID_CATEGORIES/ORDER/NAMES), `challengeSets.js`, `src/lib/categories.js`, `candidate-generator.js` (`checkOddEvenThreatPredicate`), `predicates.js` (`evalOddEvenThreat`), `classifyAiMove.js` (`AI_PATTERN_PRIORITY`), `shapeDescriptor.js` (`descriptorForPositional`), and `detectOddEvenThreat` + its `classifyPattern` registration. Puzzle generation/checking is fully intact.

**Removed (coach + blunder — do NOT restore):** `PATTERN_KB` entry (`llmCoachHelpers.js`), `POSITIVE_CASCADE` (`explainContext.js`), `VALID_BLUNDER_TAGS` (`blunderTags.js`), both `tagBlunder` cascades (`MISSED_OWN_PRIORITY`, `ENABLED_OPP_PRIORITY` in `classifier.js`), and its REASON/POSITIVE templates (`blunderReasons.js`). Its KB article `docs/knowledge-base/derived-odd-even-threat.md` was **deleted**, along with its `kbTermLesson.js` entry and the row in `llm-coach-endpoints.md`'s Pattern→KB table.

**Replacement:** three parity-aware threat tags took its coach + blunder role — `major_threat_parity`, `major_threat_nonparity`, `minor_threat` (built on `categorizeThreats`; see [[reference_classify_vs_classifyPattern]] and docs/architecture/server-conventions.md → Threat categorization). They are valid blunder tags and coach KB terms; `major_threat_parity` → new `docs/knowledge-base/derived-parity-aligned-threat.md`, the other two map to existing `allen-major-threat` / `allen-minor-threat`.

**Why this stays in memory:** an agent that sees `odd_even_threat` firing in `classifyPattern` (or in a puzzle) will wrongly assume it is also a coach term / blunder tag and try to "fix" a missing template or KB entry. The asymmetry is intentional. Verify against the lists above. Related: [[project_detect_odd_even_threat_yellow]] (the detector's parity convention, unchanged), [[reference_valid_blunder_tags]].
