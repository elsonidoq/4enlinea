# Deep Reveal Evaluation

Evaluation framework for the LLM-generated move explanations produced by the
`POST /api/explain-move-llm` endpoint and cached in `explanation_cache`.

---

## What is the deep reveal?

When a user reviews a past game, each blunder (or strong move) can trigger a
"deep reveal" — a 2–3 sentence LLM-generated coaching explanation. The pipeline:

1. `buildExplainContext(movestring, col, rounds, solver)` in
   `connect-four/server/explainContext.js` runs the classifier, board
   visualizations, and threat comparison, then assembles a prompt.
2. The prompt is sent to OpenAI via `callLLM()` in `llmCoachHelpers.js`.
3. The response (`explanation`) is scanned for `[term:X]` tags; each kbId is
   resolved to a short summary via `loadKBShortSummary(kbId)` to build a
   `terms` map.
4. The result `{ explanation, prompt, terms }` is stored in
   `explanation_cache.deep_reveal_json` (JSONB) keyed by
   `SHA256(movestring + ":" + col)` → `position_hash`.

---

## Data source

```sql
SELECT position_hash, deep_reveal_json, created_at
FROM explanation_cache
ORDER BY created_at DESC;
```

Each row's `deep_reveal_json` has:

```jsonc
{
  "prompt": "## Role\n...",        // full LLM prompt as sent
  "explanation": "Playing ...",    // raw LLM output
  "terms": {                       // kbId → short_summary; empty {} when no KB terms matched
    "community-z-threat": "..."
  }
}
```

To query from Node.js inline, read
`memory/reference_supabase_connection.md` first — the env file is at
`connect-four/server/.env`, not the project root.

---

## Prompt structure (as of 2026-06-21)

The prompt is assembled in `buildBlunderExplainPrompt()` (`llmCoachHelpers.js`)
with sections in this order:

| Section | Always present | Notes |
|---|---|---|
| `## Role` | yes | blunder vs optimal framing |
| `**Language rule**` | yes | banned internal terms; no positive vocabulary list |
| `## Players` | yes | player names, parity rows |
| `## Boards` | yes | 3 boards: Before / After best move / After move played |
| `## Move context` | yes | player, eval gap, columns, key insight (humanReason) |
| `## Threat comparison` | yes | pre-computed major/minor threat counts + parity alignment |
| `## Best-move tactical evidence` | when patterns fired | correctMovePatterns from classifyPattern |
| `## Hard grounding rules` | yes | column/cell whitelist |
| `## Tone` | yes | severity framing |
| `## KB term definitions` | only when terms exist | classifier-driven; empty positions omit this entirely |
| `## Output format` | yes | zone/term tag syntax; term instruction omitted when no KB terms |
| `## Task` | yes | 2–3 sentence instruction |

**Key insight** (`## Move context → Key insight`) comes from
`REASON_TEMPLATES` in `connect-four/server/blunderReasons.js`, keyed on
`"${tag}:${direction}"`. The blunder tag is NOT directly visible in the
prompt — it can only be inferred by cross-referencing `blunderReasons.js`.
Common tags: `suboptimal_move` (generic fallback), `z_threat`, `double_threat`,
`forced_win`, `j_shape`, `figure_7`, `undercut`, `overcut`, `claimeven`,
`odd_even_threat`.

**Threat comparison** format (always present):

```
## Threat comparison

After the best move (column N):
- Gray major threats: 1 (1 parity-aligned, 0 immediately playable)
- Gray minor threats: 3
- Green major threats: 0
- Green minor threats: 2

After the move played (column M):
- Gray major threats: 0
- Gray minor threats: 2
- Green major threats: 1 (0 parity-aligned, 1 immediately playable)
- Green minor threats: 3
```

Parity-aligned = threat row matches the player's winning parity (Gray wins on
1-indexed even rows 2,4,6; Green on odd rows 1,3,5). Immediately playable =
gravity-top cell (can be reached in one move).

---

## Explanation output format

The LLM is instructed to produce:
- 2–3 sentences
- Zone tags for spatial references: `[zone:colN]column N[/zone:colN]`,
  `[zone:cNrM]that cell[/zone:cNrM]`, `[zone:cells:c1r2,c2r3]...[/zone:cells:c1r2,c2r3]`,
  `[zone:rowN]row N[/zone:rowN]`
- Term tags **only when `## KB term definitions` is present**:
  `[term:kbId]display text[/term:kbId]`
- No internal technical terms (see banned list below)

**Banned words** (from LANGUAGE_RULE in `llmCoachHelpers.js`):
`forced_win`, `losing_position`, `leaf`, `leaf position`, `leaf board`,
`simulation`, `pattern data`, `pattern comparison`, `solver`, `score`,
`terse_reason`, `matched_direction`, `tag`, `direction`

**Term tag mechanics**: after the LLM responds, `index.js` scans for
`[term:X]` tags and calls `loadKBShortSummary(kbId)`. If the kbId is a
PATTERN_KB alias key (e.g. `fork`), `loadKBShortSummary` resolves it through
`PATTERN_KB[id].id` as a fallback. The kbId used in `terms` is exactly what
the LLM wrote, not the resolved slug.

---

## Layer 1 — Deterministic checks

**Goal:** Catch structural and factual failures cheaply. Run against all rows
in `explanation_cache`. No LLM calls.

**Implementation:** A standalone Node.js script
(`connect-four/server/scripts/eval_deep_reveal_deterministic.mjs`) that:
1. Fetches all rows from `explanation_cache`
2. Runs each check below
3. Outputs a report: pass/fail per check per row, with the failing snippet

### Checks

**C1 — No orphan term tags when terms is empty**
If `terms` is `{}` (or the key count is 0), the explanation must contain zero
`[term:` substrings.
```js
if (Object.keys(terms).length === 0 && explanation.includes('[term:')) FAIL
```

**C2 — Every term tag kbId is in the terms map**
Extract all `[term:X]` kbIds from the explanation. Each must exist as a key in
`terms`.
```js
const termTagRegex = /\[term:([^\]]+)\]/g;
for (const [, kbId] of explanation.matchAll(termTagRegex)) {
  if (!terms[kbId]) FAIL(`unknown kbId: ${kbId}`)
}
```

**C3 — No banned internal terms**
```js
const banned = ['forced_win','losing_position','leaf position','leaf board',
  'simulation','pattern data','pattern comparison','solver','score',
  'terse_reason','matched_direction'];
for (const word of banned) {
  if (explanation.toLowerCase().includes(word)) FAIL(`banned word: ${word}`)
}
```

**C4 — Zone column tags reference valid columns**
All `[zone:colN]` tags must have N between 1 and 7.
```js
const colZoneRegex = /\[zone:col(\d+)\]/g;
for (const [, n] of explanation.matchAll(colZoneRegex)) {
  if (parseInt(n) < 1 || parseInt(n) > 7) FAIL(`invalid column: ${n}`)
}
```

**C5 — Zone cell tags reference valid cells**
All `[zone:cNrM]` tags must have N in 0–6 and M in 0–5 (0-indexed internal
coordinates). The board headers in the prompt use 1-indexed columns 1–7 and
rows 1–6, but cell zone specs use 0-indexed. The tag parser in the frontend
handles this — just confirm the numbers are in range.
```js
const cellZoneRegex = /\[zone:c(\d+)r(\d+)\]/g;
for (const [, c, r] of explanation.matchAll(cellZoneRegex)) {
  if (parseInt(c) > 6 || parseInt(r) > 5) FAIL(`out-of-range cell c${c}r${r}`)
}
```

**C6 — Length is 2–3 sentences**
Split on `.`, `!`, `?` (excluding trailing whitespace). Sentence count should
be between 2 and 3. This is a soft check — flag, don't hard fail.

**C7 — Closing tags match opening tags**
Every `[zone:X]` must have a matching `[/zone:X]` and every `[term:X]` must
have `[/term:X]`.
```js
const openTags  = [...explanation.matchAll(/\[(zone|term):([^\]]+)\]/g)];
const closeTags = [...explanation.matchAll(/\[\/(zone|term):([^\]]+)\]/g)];
// verify every open has a matching close with the same spec
```

---

## Layer 2 — LLM-as-judge

**Goal:** Catch semantic failures: hallucinated tactical patterns, claims not
grounded in the board data, unhelpful framing. Run on a sample (e.g., latest
100 rows, or on demand after prompt changes).

**Implementation:** A standalone script
(`connect-four/server/scripts/eval_deep_reveal_llm_judge.mjs`) that:
1. Fetches a sample from `explanation_cache`
2. For each row, calls the LLM judge with a structured prompt
3. Stores scores back to a separate `eval_results` table or writes a JSON report

### Judge prompt

```
You are evaluating a Connect Four coaching explanation for quality.

## The explanation prompt
{prompt}

## Threat comparison (pre-computed ground truth)
{threatComparisonSection extracted from prompt}

## The explanation to evaluate
{explanation}

## Scoring
Score each criterion 0 or 1 (0 = fail, 1 = pass). Output ONLY valid JSON:

{
  "grounded": <0|1>,        // explanation only references things visible in the boards or threat comparison
  "no_hallucination": <0|1>, // does not name a tactical pattern that isn't in KB term definitions or threat data
  "useful": <0|1>,          // a player would understand what they did wrong and why the better move was better
  "reason": "<one sentence explaining the lowest-scoring criterion>"
}
```

**Model:** Use a capable model (Claude Sonnet or better). Avoid the same model
that generated the explanation to reduce self-preference bias.

**Grounding check nuance:** The judge should verify that claims about threats
are consistent with the `## Threat comparison` section in the prompt. If the
explanation says "you missed a double threat" but the threat comparison shows
0 major threats for the player after the best move, that's a hallucination.

**Sampling strategy:**
- Always run on the most recent N rows after a prompt change (regression check)
- Run weekly on a random sample of 20–50 rows for ongoing monitoring
- Flag any row where `grounded + no_hallucination < 2` for human review

---

## Layer 3 — Golden set (regression)

**Goal:** Maintain a curated set of known-good explanations that serve as
regression tests when the prompt changes.

**Implementation:** A JSON file at
`connect-four/server/scripts/eval_golden_set.json` containing an array of
entries:

```jsonc
[
  {
    "position_hash": "3c834296...",
    "movestring": "542",
    "col": 3,                        // 0-indexed
    "blunder_tag": "suboptimal_move",
    "direction": "missed_own",
    "notes": "Early game, no patterns fire, threat comparison is the main signal",
    "expected": {
      "no_term_tags": true,          // terms should be {} for this position
      "mentions_col4": true,         // should reference the played column
      "mentions_col5": true,         // should reference the better column
      "no_hallucinated_pattern": true
    },
    "approved_explanation": "Playing column 4 gave up..."  // optional: a known-good explanation
  }
]
```

**How to use:**
1. After a prompt change, re-generate explanations for all positions in the
   golden set by clearing their `explanation_cache` rows (delete by
   `position_hash`) and re-triggering the deep reveal.
2. Run Layer 1 deterministic checks on the new outputs.
3. Run the LLM judge on the new outputs and compare scores to the baseline.
4. If any golden entry goes from passing to failing, the prompt change is a
   regression.

**How to grow the golden set:**
- After a human reviews an explanation in the app and finds it correct,
  add the `position_hash` + `movestring` + `col` to the set.
- Aim for coverage of: each blunder tag, positions with and without KB terms,
  early game (few pieces), mid-game, late game.
- Target: 20–30 entries covering the main failure modes seen in production.

**Curating the initial set:**
Query `explanation_cache` for rows that passed Layer 1 checks AND Layer 2
judge scoring `grounded + no_hallucination + useful = 3`. Add those to the
golden set with the `approved_explanation` field set.

---

## Known issue: `correct_move` tiebreaker vs. pedagogical best move

`eval_set.json` stores a `correct_move` column for each entry. The eval harness
now overwrites this at runtime with the column that `buildExplainContext` actually
put in the prompt (via `context.contrastCol`), so the two are always consistent.

However, the column chosen by `selectContrastMove` (in `llmCoachHelpers.js`) uses
a `centerMost` tiebreaker: when multiple columns share the best solver score, it
picks the one geometrically closest to col 4 (center). This is arbitrary and can
produce a less instructive "better move" than what a human curator would choose —
for example, a claimeven column that clearly illustrates the pairing concept might
lose the tiebreak to a more central column that is equally optimal but less
pattern-relevant.

**Post-MVP improvement to consider:** replace the `centerMost` tiebreaker in
`selectContrastMove` with a pattern-aware ranking: among tied-score columns,
prefer the column whose resulting position most clearly fires the target
`pattern_category` classifier. This would require running `classifyPattern` on
each candidate and picking the one with the most informative annotation. The
change should be made in `selectContrastMove` in `llmCoachHelpers.js`.

---

## Running order

1. **After every prompt change:** run Layer 1 on all cached rows + Layer 3
   golden set re-generation.
2. **Weekly:** run Layer 2 on a random sample of 50 rows.
3. **Before deploying a new prompt version:** Layer 1 + Layer 3 must be clean;
   Layer 2 sample score must not regress vs baseline.

---

## Annotation gate eval harness (Layer 1 — implemented)

The annotation gate harness is the concrete implementation of Layer 1. It runs
the full production pipeline end-to-end (no mocks) against a curated eval set
and surfaces annotation validation failures.

### Scripts

| Script | Purpose |
|---|---|
| `server/scripts/run_eval.mjs` | Run the pipeline over an eval set; collect raw JSONL results |
| `server/scripts/filter_failing_evals.mjs` | Extract failing entries from a results JSONL into a new eval set |
| `.claude/skills/judge-deep-reveals/SKILL.md` | Claude skill: score a JSONL against the 8-item rubric |

### Eval set files

| File | Description |
|---|---|
| `server/scripts/eval_set_small.json` | Small subset for quick smoke tests |
| `server/scripts/eval_set_large.json` | 49 positions: forced_win, immediate_threat, odd_even_threat, claimeven, … |

### Typical debug loop

```bash
# 1. Run against the full eval set
cd connect-four
node server/scripts/run_eval.mjs server/scripts/eval_set_large.json
# → server/scripts/eval_results_<timestamp>.jsonl

# 2. Inspect failures (look for final_response === null)
#    Then invoke /judge-deep-reveals in Claude Code to get a structured report.

# 3. Fix annotationGate.js / llmCoachHelpers.js / explainContext.js as needed.

# 4. Filter only the failing entries to create a fast regression target:
node server/scripts/filter_failing_evals.mjs \
  server/scripts/eval_results_<timestamp>.jsonl \
  server/scripts/eval_set_large.json
# → server/scripts/eval_set_large_failing_<timestamp>.json

# 5. Re-run against the filtered subset to verify fixes:
node server/scripts/run_eval.mjs server/scripts/eval_set_large_failing_<ts>.json
```

### Output record shape

Each line in the output JSONL is:

```jsonc
{
  "id": "eval-5",
  "board_state": "...",
  "move_played": 0,          // 0-indexed
  "correct_move": 0,         // 0-indexed (overwritten at runtime by contrastCol)
  "pattern_category": "immediate_threat",
  "predicates": ["P02", ...],
  "severity": 3,
  "context_outcome": "success",   // success | null_returned | trivial | all_moves_equal | error
  "context_error": null,
  "llm_error": null,
  "prompt": "...",
  "allowed_set": [...],
  "attempt1_response": "...",
  "attempt1_passed": false,
  "attempt1_failures": ["P5strong:tg"],
  "attempt2_response": "...",
  "attempt2_passed": false,
  "attempt2_failures": ["P5strong:tg"],
  "final_response": null          // null = both attempts failed
}
```

`final_response` is non-null only when at least one attempt passed annotation validation.

### Common failure codes

| Code | Meaning | Typical cause |
|---|---|---|
| `P3:engine_jargon` | Forbidden slug in visible text | LLM uses `[term:forced_win]` — markup tags are stripped before checking, so only visible text triggers this |
| `P5strong:tg` | LLM used `[zone:tg]` for a zero count | Prompt contradicts itself: instruction says "no bare numbers" but zero-count lines have no zone tag; fixed by explicit exception in prompt |
| `P5strong:cell_not_allowed` | Cell zone references a cell outside the allowed set | LLM hallucinating a cell that wasn't grounded |
| `P6:raw_coordinate` | Zone inner text contains `c4r3`-style coords | LLM writing raw coords inside a zone tag |
