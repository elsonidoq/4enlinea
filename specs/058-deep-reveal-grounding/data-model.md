# Data Model: Deep-Reveal Grounding

This feature is a render-layer fix (spec.md Assumptions: "This feature is a render-layer fix, not a
reasoning-engine fix"). It adds no new *engine* fields to the feature vector (FR-016). Its data-model
surface is: (1) an in-memory shape threaded from the render layer through the retry loop to the guard,
and (2) one DB schema change for two-attempt logging.

## 1. Offered handle set (`aliases[]`) — existing shape, one new field value

**Source**: `buildAnnotationOffer` return, `zones.aliases` — `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs:49-107`.

Existing per-alias shape (verified at every `aliases.push(...)` call site, `zoneAnnotations.mjs:68,82`):

```js
{ handle: string, spec: string, role: string, truthBoard: 'decision'|'afterBest'|'afterPlayed', kbId: string|null }
```

**Change (US1, Settled decision 8)**: a new source of aliases — deep fork cells named by
`tacticTag: "double_threat"` on the projected-deep board — added alongside the existing structural
(`immediate`/`major`/`double`) source (`STRUCTURAL`, `zoneAnnotations.mjs:19`, currently
`Set(['immediate', 'major', 'double'])`).

**Mechanism (superseding an earlier draft of this file that proposed a boolean `future: true` field —
plan.md's design is authoritative): a `future:` string prefix on the `spec` itself**, e.g.
`future:c2r6` for a single deep fork cell or `future:windows:c2r6,c5r5` for a multi-cell fork (reusing
the existing `windows:` shape). This is deliberately spec-string-encoded rather than a separate alias
field, because every downstream consumer of a spec (`zoneParser.js`'s `isValidSpec`/`expandSpec` on
the server, `annotatedText.js`'s `isValidSpec`/`getZoneColor`/`zoneToOverlays`/`zoneToWindowGroups` on
the client) already dispatches purely on the spec string — adding one prefix-strip line to each,
rather than threading a new boolean through every layer, is the smaller, more consistent change (see
plan.md §"The future-square visual mechanism" for the full per-file breakdown). `roleText()`
(`zoneAnnotations.mjs:36-41`) gains a future-tense branch selected by the presence of the `future:`
prefix on the tag's derived spec, returning "this square matters later, once X happens"-shaped text
(FR-002). `spec` for a deep fork cell is typically a single `future:cNrM` (a fork cell is a single
completing square — verified against `forkCells` shape in `docs/epics/deep-reveal-grounding-epic.md`
Settled decision 8: `forkCells: ["c2r6","c5r5"]`), with `future:windows:...` available for a
multi-cell case.

## 2. Required set (`requiredSet[]`) — new, derived (US2)

**Source**: new `deriveRequiredSet(pruned, zones)` in `renderReasonModel.mjs` (research.md D1).

```js
[
  { half: 'lostResource'|'opponentPunishment', spec: string, handle: string, role: string }
  // 1-3 entries, capped per the Derivation Rule (spec.md, verbatim from epic Settled decision 2)
]
```

- `spec`/`handle` are looked up from the matching `zones.aliases[]` entry (research.md D2) — never a
  freshly-invented spec string.
- Derivation walks `pruned.lostResource` and `pruned.opponentPunishment` (the two halves;
  `blunder-reason-evidence.md`: `{ kind, register, completingCell, window, pliesToEnd, line,
  finalMovestring }` per half), computing `denialCell(half)` (`causalLinks.mjs:23`,
  `h?.cell ?? h?.completingCell ?? null`) or falling back to `half.window` when the half's story is a
  line (T-parity case, spec.md Derivation Rule).
- A half with neither a resolvable cell nor a window yields **no entry** (FR-006) — not an empty-string
  placeholder.
- Capped at 1-3 groups (FR-005): at most one per half, plus at most one line/window.

**Consumers**:
1. Prompt assembly — **corrected**: the `# Highlightable regions` block a tasks author must edit
   is `assembleGroundedPrompt` in `connect-four/server/scripts/renderReasonModel.mjs` (verified,
   `export function assembleGroundedPrompt(model)` heads the block containing
   `'# Highlightable regions'`, currently at line 311 of that file — line numbers drift, the
   symbol is what to grep for). An earlier draft of this file and of `research.md` D6 named
   `compute.mjs`'s `buildPromptForCondition` instead; that is **wrong** — `compute.mjs` only calls
   `buildPromptForCondition`, which itself calls `assembleGroundedPrompt`; `compute.mjs` is
   correctly *absent* from plan.md's Source Code map for this reason. The new required-set block
   (`# You MUST build the explanation around these`, naming each required handle + role) is added
   inside `assembleGroundedPrompt`, alongside the existing regions/termLines blocks.
2. `computeMechanism`'s retry check (`mechanismExplainer.mjs`) — **pinned (resolves plan-critique
   blocking issue 3): checks the post-`processAnnotations` `mechanism`, not the raw LLM
   `attempt.mechanism`.** `runLlmAttempt` (`mechanismExplainer.mjs:50`) calls
   `postprocessAnswer(answer, render_decision)` (`server/scripts/compute.mjs:294`), which calls
   `processAnnotations(mechanism, zones)` (`server/scripts/reason_engine/zoneAnnotations.mjs:191`).
   `processAnnotations` rewrites every offered `[zone:{handle}]` into its expanded `[zone:{spec}]`
   **before** `computeMechanism` ever inspects `attempt.mechanism`
   (`zoneAnnotations.mjs:209-211`: `text.replaceAll(\`[zone:${handle}]\`, \`[zone:${spec}]\`)`), so
   no handle survives to be string-matched against — only the expanded spec does. `processAnnotations`
   already computes exactly the right membership test as a **local** variable, `usedSpecs`
   (`zoneAnnotations.mjs:208`: `const usedSpecs = new Set();`, populated at `:210` only when
   `text.includes(\`[zone:${handle}]\`)` — i.e. only for handles the LLM actually used), but its
   return shape (`zoneAnnotations.mjs:216`: `return { mechanism: text, keyCells: [...cells].sort(),
   zonesEmitted: usedSpecs.size > 0, repairs };`) drops it.

   **Required, explicit small change — three hops, verified, none is a pass-through**:
   1. `processAnnotations` (`zoneAnnotations.mjs:216`): widen the return to
      `{ mechanism, keyCells, zonesEmitted, repairs, usedSpecs: [...usedSpecs] }`.
   2. `postprocessAnswer` (`compute.mjs:294`, full body read):
      `export function postprocessAnswer(answer, render_decision) { if (!answer ||
      !render_decision?.zones) return { answer, repairs: [] }; const { mechanism, keyCells,
      zonesEmitted, repairs } = processAnnotations(answer.mechanism ?? '', render_decision.zones);
      answer.mechanism = mechanism; if (zonesEmitted) answer.key_cells = keyCells; return { answer,
      repairs }; }` — this **destructures** `processAnnotations`'s result and returns a narrower
      `{ answer, repairs }` shape; it is not a transparent pass-through. It must also destructure
      `usedSpecs` and add it to its own return: `return { answer, repairs, usedSpecs }` (the
      early-return branch, `!answer || !render_decision?.zones`, has no annotations to have used,
      so it returns `usedSpecs: []` there too).
   3. `runLlmAttempt` (`mechanismExplainer.mjs:50-58`, full body read):
      `const { answer: postAnswer, repairs: annotationRepairs } = postprocessAnswer(answer,
      renderDecision); return { raw, answer: postAnswer, mechanism: postAnswer?.mechanism ?? null,
      parseError, callError, annotationRepairs };` — must also destructure `usedSpecs` and add it to
      the returned `attempt` object: `return { raw, answer: postAnswer, mechanism: ..., parseError,
      callError, annotationRepairs, usedSpecs }`.

   The compliance check in `computeMechanism` is then
   `requiredSet.every(g => attempt.usedSpecs.includes(g.spec))` — spec equality, matching how the
   required set itself was matched to an offered alias (§2 above, D2). `research.md` D3's hedge
   ("or its already-expanded `spec`, post `processAnnotations`") is removed — this **is** the
   contract, not an alternative.
3. `buildRenderDecision`'s persisted output (`renderReasonModel.mjs:223-237`) — for grader ground
   truth (extends the existing `render_decision.zones` field with a sibling `requiredSet` field).

## 3. `AllowedSetEntry[]` — existing shape, one new spec class must be recognized (US3)

**Source**: `checkP5Strong(zones, allowedSet)` — `connect-four/server/annotationGate.js:323-403`.

```js
// CONCRETE-ELIGIBLE, single-cell-admissible (feeds concreteCells/concreteRows/concreteCols)
{ cells: string[] }   // e.g. { cells: ["c4r3"] } — single-cell alias
// CONCRETE-ELIGIBLE, window-only (Decision A — see below; feeds offeredWindowSignatures only,
// NOT concreteCells/concreteRows/concreteCols)
{ cells: string[], windowOnly: true }   // e.g. { cells: ["c1r1","c2r2"], windowOnly: true }
// ABSTRACT-ONLY
{ col: number }        // 0-indexed
```

**Gap this plan closes — expanded per plan-critique's systemic finding (do not stop at the one
named gap; re-walk the whole function).** Re-reading `checkP5Strong` in full
(`annotationGate.js:323-403`) surfaces **three** silent-fallthrough gaps in the same spec-matching
loop (`:349-399`), not one:

1. **No `windows:` branch (research.md D5).** `buildAnnotationOffer`'s `tagSpec()`
   (`zoneAnnotations.mjs:44-47`) emits `windows:c1r1,c2r2,...` for every window-bearing structural
   tag — a valid, recognized spec everywhere else (`zoneParser.js:17` `isValidSpec`;
   `zoneParser.js:109-110`'s `expandSpec` case). `checkP5Strong`'s loop only branches on
   `spec === 'tg'`, `/^col(\d+)$/`, `/^c(\d+)r(\d+)$/`, `/^cells:(.+)$/`, `/^row(\d+)$/`
   (`annotationGate.js:349,357,372,381,392`) — a `windows:` spec matches none of them and falls off
   the end of the `for` loop with **no `failures.push(...)` at all**, i.e. silently admitted.
   **Fix**: add a `windows:(.+)` branch mirroring the existing `cells:` branch
   (`annotationGate.js:380-389`) — split on `,`. **Post-Decision-A correction**: do *not* simply
   "require every resulting cell in `concreteCells`" — under whole-window-only admission (see below,
   the "Admission semantics — Decision A" paragraph), a highlight's `windows:` spec must match by
   **exact signature** against the `offeredWindowSignatures` Set (sorted, comma-joined cells of a
   `windowOnly` allowed-set entry), not by per-cell `concreteCells` membership — otherwise a
   highlight naming a strict subset of an offered window's cells would incorrectly pass.
2. **No `future:` branch (new — found by the required re-walk, not named by the critique's own
   examples but the same class).** `checkP5Strong` never calls `isValidSpec`/`expandSpec` — unlike
   `checkP1`/`checkP2`/`checkP5`, it matches the raw spec string against its own four regexes
   directly. A `future:c2r6` (US1) or `future:windows:c2r6,c5r5` spec matches none of `tg`/`col`/
   `cNrM`/`cells:`/`row`, so it **also** falls through silently — identical failure shape to (1),
   confirmed false the plan's earlier assertion that stripping the `future:` prefix inside
   `zoneParser.js`'s `isValidSpec`/`expandSpec` gives `checkP5Strong` coverage "for free." **Fix,
   ship in the same task as (1) and (3) per the owner's answer**: strip a leading `future:` before
   the four existing regex tests (one branch handles both `future:cNrM` and plain `cNrM` once
   stripped; likewise for `future:windows:...`).
3. **`SPAN_CARRYING_CODES` in `reasonRenderGuard.mjs` doesn't include `P5strong` (new — found by
   the required re-walk of the guard's consumer, not `annotationGate.js` itself).** Verified,
   `reasonRenderGuard.mjs:151`: `const SPAN_CARRYING_CODES = new Set(['P1', 'P2', 'P5', 'P6']);` —
   every code `checkP5Strong` emits (`P5strong:tg`, `P5strong:col_not_allowed:*`,
   `P5strong:cell_not_allowed:*`) is absent. `stripFailingZoneSpans` (`reasonRenderGuard.mjs:162`)
   only strips a span for a code in that set (`:166`: `if (!SPAN_CARRYING_CODES.has(code))
   continue;`) — so once `allowedSet` is threaded live (this plan), a `checkP5Strong` rejection
   still marks `validateAnnotation`'s `valid: false` (triggering the `console.warn` at
   `reasonRenderGuard.mjs:216`), but `stripFailingZoneSpans` leaves the ungrounded `[zone:...]`
   span completely intact, and it is served to the player unchanged. **Fix**: add `'P5strong'` to
   `SPAN_CARRYING_CODES`. Note the destructuring at `reasonRenderGuard.mjs:165`
   (`const [code, , ...specParts] = failure.split(':');`) already produces the right `spec` for
   `P5strong:cell_not_allowed:c4r3` (`code='P5strong'`, `spec='c4r3'`) and for
   `P5strong:col_not_allowed:col3` — it does **not** for the codeless `P5strong:tg` failure
   (`specParts` is empty, so `spec` is `''`, and `if (spec) specs.add(spec)` at
   `reasonRenderGuard.mjs:168` never fires) — a `tg` rejection is flagged but its span is never
   stripped even after this fix. This is a **pre-existing, narrower gap**, not introduced by this
   plan (a `tg` handle should essentially never be offered/used in practice — `zoneAnnotations.mjs`
   never emits `tg` as an alias `spec`, it is a client-only sentinel per `zoneParser.js`'s
   `expandSpec` comment); flagged here for completeness (I12 "counterexample per case") but treated
   as **out of scope** for this plan — it existed before checkP5Strong was wired live and is not
   one of the three gaps the owner's answer named as required. If a tasks author wants zero residual
   gap, the smallest fix is teaching `stripFailingZoneSpans` to strip `[zone:tg]...[/zone:tg]`
   unconditionally (parallel to `checkP1`/`checkP5`'s existing unconditional skip of `tg`), but that
   is a judgment call left to task-writing time, not decided here.

All three of (1)-(2)-(3) ship as **one task** per the owner's answer ("Ship the `windows:` branch,
the `future:` handling, and the `SPAN_CARRYING_CODES` fix as ONE task") — landing them separately
leaves a class of highlight silently unchecked in the interim.

**Adapter (new, US3)**: a function mapping `zones.aliases[]` (offered handle set, §1) into
`AllowedSetEntry[]` for `checkP5Strong` — e.g. `toAllowedSet(aliases)` in `reasonRenderGuard.mjs`.
**Corrected during this pass**: an earlier draft of this section wrote
`{ cells: expandSpec(alias.spec) }` — verified wrong: `expandSpec` (`zoneParser.js`) returns
`Array<{col, row}>` (0-indexed coordinate objects), but `checkP5Strong`'s `concreteCells` Set holds
1-indexed **strings** (`cell.match(/c(\d+)r(\d+)/)`, `annotationGate.js:337`) — feeding it raw
`{col,row}` objects would make every `concreteCells.has(...)` lookup fail silently (`Set.has` on an
object never matches a string). The adapter must map each `{col,row}` through the same
`c${col+1}r${row+1}` conversion `zoneAnnotations.mjs:138`'s local (unexported) `rcToCellStr` already
uses — either import-and-reuse if exported, or a one-line equivalent in `reasonRenderGuard.mjs`.
Only `computeMechanism`'s **fresh-generation** response path (`server/index.js:1424`, see the
Consumers note in §2) has a `renderDecision.zones.aliases` in scope to build this from — see the
three-call-sites note in plan.md.

**Admission semantics — Decision A (settled by the owner post-tasks-critique,
`deep-reveal-grounding-epic.tasks-answers.md`, against the reviewer's own recommendation): whole-
window-only, not per-cell.** This is "the only part with real design content" per OI-143's own
estimate table. An offered `windows:`/multi-cell `cells:` alias admits **only the full window as a
single unit** — a highlight naming just one cell that is merely a *member* of an offered multi-cell
window (but was never itself offered as its own standalone single-cell alias) must be **rejected**,
not admitted via per-cell membership. This diverges deliberately from `checkP5Strong`'s existing
production `cells:` *highlight*-branch (`annotationGate.js:380-389`), which already treats a
multi-cell highlight spec as satisfied by per-cell membership in the aggregate `concreteCells` Set —
that branch's behavior is unchanged for a `cells:` alias whose members were each independently
offered as their own alias, but this decision means a window-decomposed member cell no longer
satisfies it. Because `checkP5Strong` currently flattens **every** `allowedSet` entry's cells into
one shared `concreteCells` Set regardless of the entry's origin (`annotationGate.js:332-347`),
realizing whole-window-only requires `checkP5Strong` itself (not only the adapter) to distinguish
single-cell-eligible entries from window-only entries: the adapter marks a multi-cell entry
`{ cells: [...], windowOnly: true }`; `checkP5Strong` builds `concreteCells`/`concreteRows`/
`concreteCols` only from non-`windowOnly` entries, and checks a `windows:`/`cells:` *highlight* spec
by exact signature match against a separate `offeredWindowSignatures` Set built from `windowOnly`
entries, not by per-cell membership. **The owner was explicitly warned of the trade-off and chose
this anyway**: the risk is losing real, correct single-cell highlights drawn from inside an offered
window (a false rejection), not admitting a wrong one — and since `checkP5Strong` rejections now
actually strip the span (`SPAN_CARRYING_CODES` gains `'P5strong'`, see §3 gap 3 above), this is a
real, user-visible cost the owner accepted knowingly, with the explicit intent to revisit after
seeing evidence. That evidence is the required output of tasks.md's Phase 6.5 end-to-end acceptance
task (T040), which measures and records, per staging board, how often whole-window-only rejects a
highlight a per-cell rule would have kept. Both the adapter and `checkP5Strong`'s code sites must
carry an explicit comment naming this as a deliberate divergence, not an oversight.

## 4. `deep_reveal_failures` — schema change (US2, deploy prerequisite)

**Current** (`connect-four/server/migrations/031_deep_reveal_failures.sql`, full file):

| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO (default) |
| position_hash | text | NO |
| movestring | text | NO |
| col | integer | NO |
| endpoint | text | NO (default) |
| llm_prompt | text | NO |
| raw_llm_output | text | NO |
| failure_reason | text | NO |
| created_at | timestamptz | NO (default) |

**New migration adds** (additive, all nullable — existing terminal-failure insert at
`server/index.js:1363-1372` is unaffected):

| Column | Type | Nullable | Purpose |
|---|---|---|---|
| attempt1_raw_llm_output | text | YES | Raw output of the first LLM attempt (Settled decision 5) |
| attempt1_mechanism | text | YES | Parsed `mechanism` of attempt 1, pre-strip |
| attempt2_raw_llm_output | text | YES | Raw output of the retried attempt |
| attempt2_mechanism | text | YES | Parsed `mechanism` of attempt 2, pre-strip |
| missing_handles | jsonb | YES | `requiredSet` handles attempt 1 omitted, that triggered the retry |
| served_attempt | smallint | YES | Always `2` under this feature (FR-009) — recorded per-row, not assumed |

`failure_reason` gains a new value, `'missing_required_squares'`, alongside the existing
`callError`/`parseError`/`'empty mechanism'` values (`server/index.js:1370`) — this is a **new
enum-like value on an existing free-text column**, not a schema change, so it needs no migration of
its own, only documentation in `docs/architecture/db-schema.md`.

**No backfill**: existing `deep_reveal_failures` rows keep `NULL` in the new columns — per
`CLAUDE.md`'s pre-launch disposability rule, no historical-row repair is planned.

## 5. `promoteRawCoordinates(text, locale)` — new function (US3, FR-011, resolves plan-critique
blocking issue 1 + decisions 1/2)

**Source**: new export, `connect-four/server/reasonRenderGuard.mjs`, called from
`guardExplainMoveLlmPayload` (`reasonRenderGuard.mjs:207-225`) **before** `validateAnnotation`
(`:210`) and before the final `stripInternalTokens` call (`:221`) — i.e. first in the function body,
ahead of everything currently there.

**Why this is a new, separate symbol, not a `stripInternalTokens` edit (Decision 1)**: Cross-lane
constraint 1 (spec.md, verbatim from the epic) forbids this epic from modifying
`stripInternalTokens`/`RANGE_RE` — those are Plan A's. `promoteRawCoordinates` is a new exported
function in the same file, leaving both of Plan A's symbols byte-identical, so the two lanes'
diffs to this file are non-overlapping.

**Mechanism**: for every bare `cXrY` token (reusing `stripInternalTokens`'s own `CXRY_RE`,
`/\bc(\d+)r\d+\b/gi`, as the detection pattern — `reasonRenderGuard.mjs:28`) that is **not** already
inside an existing `[zone:...]...[/zone:...]` pair, wrap it as
`[zone:{token}]{columnWord(col)}[/zone:{token}]`, where `columnWord` is the same
`serverT(locale, 'column')` closure `stripInternalTokens` already uses (`reasonRenderGuard.mjs:87`,
`locale.mjs:58/65`). Concretely: `[zone:c4r3]column 4[/zone:c4r3]`, not
`[zone:c4r3]c4r3[/zone:c4r3]`.

**Must skip zone-tag delimiters (Decision 1, owner's answer)**: reuse the existing
`ZONE_TAG_RE`/`text.split(...)` pattern `stripInternalTokens` already uses
(`reasonRenderGuard.mjs:63,99`) — split on `[\/?zone:[^\]]*]`, only promote tokens found in the
even-indexed (non-delimiter) segments, exactly as `stripInternalTokens` already does for its own
rewrite. Skipping this would corrupt an existing `[zone:cells:c4r1,c4r2]` spec exactly as that
file's own comment warns (`reasonRenderGuard.mjs:54-59`).

**A `cXrY` token already inside an *existing* zone tag's own inner text must also be left alone —
this is not just the delimiter itself.** `promoteRawCoordinates` must not re-wrap a coordinate that
already sits inside another zone's inner text (e.g. `[zone:c4r1]watch c4r1 closely[/zone:c4r1]`),
or it produces a nested/malformed `[zone:...]` pair. Splitting on `ZONE_TAG_RE` and only scanning
even-indexed segments does **not** by itself solve this — the inner text of an *already-open* zone
is itself an even-indexed segment.

**Decision B (settled by the owner post-tasks-critique, `deep-reveal-grounding-epic.tasks-
answers.md`) — no longer an open design question at planning time.** Track open/close zone-tag
depth across the `ZONE_TAG_RE`-split segments and **skip promotion in any segment where depth > 0**.
Rejected: restricting promotion to segments with net-zero enclosing zone depth — that alternative
silently skips promotion in any segment containing both an opened and a closed zone tag, which is a
strictly worse approximation of "already inside a zone" than depth tracking. tasks.md's T026 (test)
and T028 (implementation) must both encode exactly this rule and are marked must-land-in-the-same-
commit, the same treatment already given to T025/T027 for the `checkP5Strong` gaps above.

**Why the inner text must be the flattened word, not the raw token (a defect this planning pass
found and fixes, not present in the epic/handoff/critique text)**: `checkP6`
(`annotationGate.js:295-306`) fails any zone whose **inner text** contains a raw-coordinate-shaped
substring — `const rawCoordRegex = /\bc\d+r\d+\b/gi; if (rawCoordRegex.test(innerText) ...)
failures.push(\`P6:raw_coordinate:${spec}\`);` — unconditionally, regardless of `allowedSet`. `P6`
is already in `SPAN_CARRYING_CODES` (`reasonRenderGuard.mjs:151`). If `promoteRawCoordinates` wrapped
the raw token as its own inner text (`[zone:c4r3]c4r3[/zone:c4r3]`), `checkP6` would reject **every**
promoted coordinate unconditionally — the promotion would self-destruct before `checkP5Strong` ever
ran. Using the already-flattened word as the inner text (`[zone:c4r3]column 4[/zone:c4r3]`) avoids
this: `checkP6`'s `rawCoordRegex` does not match `"column 4"`.

**Ordering delivers Decision 2's fallback for free — no new fallback code needed.** Because
`promoteRawCoordinates` runs before `validateAnnotation`, and its inner text is already the
flattened word:
- If `checkP5Strong` (once threaded with a real `allowedSet`) accepts the promoted spec (the
  coordinate was in fact offered), the span survives and the player gets a real, clickable
  highlight — FR-011 delivered.
- If `checkP5Strong` rejects it (the coordinate was never offered — the more common case for a
  promoted coordinate, since by construction the coach was not given a handle for it),
  `stripFailingZoneSpans` (`reasonRenderGuard.mjs:162-177`) removes the `[zone:...]` wrapper but
  **keeps the inner text** (`result = result.replace(re, '$1')` — capture group 1 is the inner
  text) — leaving exactly `"column 4"` in the prose, byte-identical to what `stripInternalTokens`
  would have produced on the original raw `"c4r3"` token if `promoteRawCoordinates` had never run.
  This is precisely Decision 2's required fallback ("that one coordinate falls back to today's
  'column N' flattening"), achieved by ordering alone, not by a second code path.

**Final `stripInternalTokens` pass is then a harmless no-op for anything `promoteRawCoordinates`
already touched**: a promoted-and-kept span's inner text is `"column 4"`, which contains no `cXrY`/
`cX`-shaped substring for `CXRY_RE`/`RANGE_RE`/`BARE_COL_RE` to match; a promoted-and-stripped
span's leftover prose is likewise already `"column 4"`. `stripInternalTokens` still runs unmodified
(Cross-lane constraint 1) and still catches any raw coordinate this function's regex missed (e.g. a
`cX-cY` range, which `RANGE_RE` — not `CXRY_RE` — owns; `promoteRawCoordinates` deliberately only
targets the single-cell `cXrY` shape FR-011 is about, not ranges).
