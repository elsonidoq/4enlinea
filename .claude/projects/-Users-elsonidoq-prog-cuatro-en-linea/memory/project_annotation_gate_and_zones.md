---
name: project_annotation_gate_and_zones
description: "Coach annotation gate — LIVE again since 2026-08-04 (strip-and-log at the response seam) but P5Strong does NOT run, so ungrounded highlights pass; text transforms must skip [zone:] delimiters or highlights die silently; P3 codes carry no span"
metadata: 
  node_type: memory
  type: project
  originSessionId: 61abbe1a-cb8c-4db3-a79d-d3e4d4378c9a
  modified: 2026-08-04T15:00:46.528Z
---

Everything about the coach's **annotation gate** (`server/annotationGate.js` + `server/explainContext.js` + `llmCoachHelpers.js`) and its zone-tag validation.

> ## ⚠️ RE-CORRECTED 2026-08-04 (spec 057, D3/T028) — the gate IS BACK on the live path, but only 5 of its 6 predicates run
>
> The 2026-08-03 correction below ("no longer on the live path") was true when written and is **now false again**.
> `validateAnnotation` is wired into `guardExplainMoveLlmPayload` (`server/reasonRenderGuard.mjs`), which every
> served explanation passes through — **including cache hits**. Failure policy: **strip the offending zone span,
> log, serve**. Enforcement costs no LLM call (the module is pure — its own header says "No side effects, no DB,
> no I/O"); only a *retry* policy would have, and retry was rejected for exactly that reason. Measured added
> latency ≈ **0.014 ms/call** against the <2 s budget.
>
> **Four live traps this creates:**
> 1. **`checkP5Strong` does NOT run.** The seam passes a hardcoded `null` `allowedSet`
>    (`/usr/bin/grep -n allowedSet server/index.js` → **zero matches**). P1/P2/P3/P5/P6 run. P5Strong is the ONLY
>    predicate that asks whether the engine actually produced evidence for a highlighted cell — the other five only
>    check well-formedness. **So a plausible-but-ungrounded highlight passes every active check.** The allowed set
>    already exists as `zoneAliasMap` from `buildAnnotationOffer`
>    (`server/scripts/reason_engine/zoneAnnotations.mjs:106`) and is dropped at `renderReasonModel.mjs:235`, which
>    keeps only `aliases` + `terms`. See **OI-143** — it carries the full trace and a ~half-day estimate.
> 2. **A text transform at this seam MUST skip zone-tag delimiters.** `stripInternalTokens`' `CXRY_RE` rewrote
>    coordinates *inside the spec*, turning `[zone:cells:c4r1,c4r2]` into `[zone:cells:column 4,column 4]`;
>    `src/lib/annotatedText.js`'s `isValidSpec` then rejects it and the client **silently drops the highlight** —
>    no error at any layer, prose still renders. Every `cNrM` and `windows:` highlight was dead on arrival; only
>    `colN` survived, which is why a test asserting "a valid zone annotation is left untouched" passed over it.
>    Fixed by splitting on `ZONE_TAG_RE` and rewriting only the prose *between* delimiters. Any future transform
>    added here must do the same.
> 3. **`P3:disc_notation` / `P3:player_name` / `P3:engine_jargon` carry NO span**, so "strip the offending span" is
>    unimplementable for them — they are **log-and-serve by design**. Only `P1:*`, `P2:col_mismatch`, `P5:*` and
>    `P6:*` carry the `:${spec}` suffix the stripper targets.
> 4. **`stripFailingZoneSpans` does not match the `!` (default-active) variant** — a failing `[zone:col9!]` is
>    detected, logged, then **served unchanged**: silent no-op enforcement with a log line claiming it acted.
>    Latent (no current emitter). See **OI-139**.
>
> **`tg` failing P5Strong is CORRECT — do not "fix" it by relaxing the check.** `tg` is a client-only wildcard:
> `expandSpec` returns `[]` server-side (`zoneParser.js:64-66`) and the client resolves it from its own
> `userMajorThreats` (`src/lib/annotatedText.js:228`), so the server cannot bound the claim. The LLM is explicitly
> instructed not to emit it (`llmCoachHelpers.js:823`: *"never use `[zone:tg]` or any other invented tag"*), and the
> live offer never includes it. A `P5strong:tg` failure means the model invented a forbidden tag.
>
> **Still true from the 2026-08-03 correction**: `buildExplainContext` remains **dead** (zero callers) — the live
> path is `computeMechanism`. Do not reuse its `buildAllowedSetFromPatternMaps`; it costs `classifyPattern` solver
> queries the live path never makes.
>
> ---
>
> ## (superseded 2026-08-04, kept for the record) CORRECTED 2026-08-03 — the gate was NOT on the live path
>
> This memory used to open "Part of the live `/api/explain*` path." **That was true as of 2026-08-03**, verified at source:
> `server/index.js` imports **neither** `validateAnnotation` nor `normalizeZoneTags` (both defined in
> `annotationGate.js`, at :486 and :415), and nothing imports `buildExplainContext` outside tests and
> `server/scripts/`. The only importers of `annotationGate.js` anywhere are
> `server/scripts/run_eval.mjs` and `server/scripts/corpus_annotation_check.mjs` — both offline.
>
> The live `/api/explain-move-llm` now runs `computeMechanism(...)` (`index.js:1319`), and its own comment
> says the result "drops straight into the response as `explanation`" — **the `[zone:…]` tags it carries
> are never validated**. A zone that highlights the wrong column, names a dead window, or leaks raw
> coordinates reaches the UI unchecked. Tracked as **OI-124**.
>
> **So the `deep_reveal_failures` bullet below is stale**: that table is still written (`index.js:1341`),
> but only on `result.callError || result.parseError || !result.mechanism`, with
> `failure_reason: result.callError ?? result.parseError ?? 'empty mechanism'`. It can no longer contain
> P5strong codes, so querying it for `P5strong:*` will always come up empty — don't read that as "the gate
> is passing."
>
> Everything below still accurately describes **how the gate behaves when it runs** (the eval/corpus
> scripts), and is the spec to restore if it is ever re-wired. One change since: **P2 now validates every
> cell-bearing spec**, not just `colN` — it compares prose column references against the set of columns
> the zone actually occupies (spec 055, OI-120), so `cells:`/`cNrM` zones are covered too.

## Internal contracts
- `buildExplainContext` returns `{ prompt, allowedSet, allMovesEqual }`; `allowedSet` is NEVER in any HTTP response.
- **allowedSet shapes:** CONCRETE-ELIGIBLE = `{ cells, zoneSpec }` (≥2 owner discs); ABSTRACT-ONLY = `{ col, parity, zoneSpec }` (no `cells`).
- **`allowedSet = null` vs `[]`:** `null` → `validateAnnotation` SKIPS P5strong entirely (use when all matched patterns are Tier 3 / position-global); `[]` → FAILS every `tg` zone on P5strong (use the real array when ≥1 Tier-1/2 entry exists). Rule lives in `explainContext.js` allowedSet derivation.
- `findMajorThreatWindows` is the canonical group-level threat scanner — never `getMajorThreatCells` for group ops.
- `classifyExplanationType` must run BEFORE simulation; Type 1 bypasses simulation entirely.
- **`inverted` semantic (this memory was BACKWARDS until 2026-07-16 — re-verified at source):** `getGapAndFraming` (`server/llmCoachHelpers.js`) computes `scoreA = -preScores[col]` (played, user perspective), `scoreB = -preScores[contrastCol]`, `const inverted = scoreA >= scoreB;` → `inverted` is TRUE when the user's move is **at least as good as the contrast, i.e. OPTIMAL**. `docs/architecture/server-conventions.md` is correct. Prefer `contrast.isOptimal` from `selectContrastMove` for intent-revealing code, but do not "fix" `inverted` to the opposite meaning.
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
