# Condition-D grounded-render answerer failures — fix design

**Status:** design, not yet implemented.
**Motivating evidence:** a `grade-fv-sufficiency` run over 57 condition-D answers (grounded-render
prompt, model `gpt-5.4`, one run each): **40 pass / 17 fail, every failure `prompt_confusion`**.
Answers + vectors + `render_decision`:
`connect-four/server/scripts/fv_suff_answers_boards_coverage_opening_2026-07-05T18-58-35Z_2026-07-06T16-55-16Z.jsonl`
(+ `_grades.jsonl`, `_grade_report.md`).

Read first (mandatory, per CLAUDE.md): `docs/architecture/reason-INVARIANTS.md`,
`docs/architecture/reason-DECISIONS.md` (esp. D20, D28, D29, D30, D32, D34),
`docs/architecture/reason-case-taxonomy.md`, `docs/architecture/blunder-reason-evidence.md`,
`docs/architecture/reason-render-grounded-prompt.md` (esp. §10, the zone/term tag design this
doc extends).

This is a **render-layer, prompt-only** fix. It does not change what `computeReason` stores
(reason-INVARIANTS I0 / memory `feedback_engine_soundness_then_render`).

---

## Issue 1 — malformed/unclosed annotation tags leak raw markup to the player

**Symptom (13–14/17 fails; the headline):** the model is told to wrap a phrase as
`[zone:<handle>]…[/zone:<handle>]` / `[term:<slug>]…[/term:<slug>]`. In ~25% of answers it instead
emits a **bare, unclosed** tag used as a noun, e.g.:

- `"You needed to keep the [term:immediate_threat] on c2 alive..."` (eval-30)
- `"Playing in [zone:col1] keeps the central fight alive... [zone:col2] hands them the quicker finish"` (eval-37)
- `"Your opponent already has a [term:double_threat] sitting there..."` (eval-42)

**Confirmed root cause:** both `processAnnotations`'s `dropUnoffered` (server, `zoneAnnotations.mjs`)
and the frontend `parseAnnotatedText` (`src/lib/annotatedText.js`) require a **paired** open+close
via a backreferenced regex (`\[kind:X\](.*?)\[/kind:X\]`). A bare open with no close anywhere in the
text matches neither, so nothing strips or expands it — the raw token (internal slug + machine
markup) renders verbatim in the coach text the player reads. Reproduced directly: ran the eval-30/37
`mechanism` text through `parseAnnotatedText` and got the literal `[term:immediate_threat]` /
`[zone:col1]` back in `cleanText`.

Affected cases: eval-30, 37, 42, 43, 45, 46, 47, 49, 51, 53, 54, 55, 56, 57.

### Fix (four pieces, one owner each)

1. **Prompt tightening (`renderReasonModel.mjs`, `assembleGroundedPrompt`, the `# Highlightable
   regions` / `# KB terms you may name` instruction lines ~300/304).** Add an explicit paired-tag
   rule and a bad/good example. Draft (to be refined at implementation time):

   > "To highlight a phrase, wrap it in **both** an opening and a closing tag:
   > `[zone:<handle>]phrase[/zone:<handle>]`. Every opening tag MUST have a matching closing tag —
   > never write a handle on its own as if it were a word.
   > Bad: `the [term:immediate_threat] on c2 is worth keeping` (no closing tag; used as a noun)
   > Good: `[term:immediate_threat]the threat you need to keep alive[/term:immediate_threat] on c2`
   > Never write a raw square. Do not overlap a highlight and a term on the same words."

   Same pattern for the `[term:...]` instruction line.

2. **Server-side backstop (`reason_engine/zoneAnnotations.mjs`, `processAnnotations`).** After
   `normalizeAnnotationTags` (which already pairs an opener with the *next* closer it finds, fixing
   id-drift), any opener still left unpaired is genuinely unclosed. Bare-strip it: delete the tag
   token itself, leave the surrounding prose untouched (per user decision — no attempt to substitute
   a canonical phrase; simplicity over prose smoothness on this rare repair path). `processAnnotations`
   gains a new return field `repairs: string[]`, one entry per stripped tag, e.g.
   `["unclosed_tag:term:immediate_threat"]` (empty array when nothing was repaired). The function
   stays pure — no Supabase/DB call inside it; callers decide what to do with `repairs`.

3. **Eval-side tagging (`compute.mjs`, `postprocessAnswer` / the `runLlm` output-record assembly).**
   Thread `repairs` from `processAnnotations` onto the per-record output line as a new
   `annotationRepairs` field (currently the record has no `flags`/`warnings` field at all — this is
   new). `grade-fv-sufficiency` (`.claude/skills/grade-fv-sufficiency/SKILL.md`, G7 section) gets a
   rule addition: a non-empty `annotationRepairs` on a record is an **automatic G7 fail**, triaged
   `prompt_confusion` (the model's fault — it emitted the malformed tag — not a render bug), without
   needing the manual mechanism-vs-`render_decision.zones` diff for this specific defect.

4. **Production logging — documented as a TODO, not built now.** `processAnnotations` has exactly one
   caller today (`compute.mjs:316`, eval-only); `docs/architecture/reason-render-grounded-prompt.md`
   §10's "Not wired to production" note is still accurate. There is nowhere to wire a real DB write
   yet. Add a `TODO(production-wiring)` note in that doc (§10, next to the existing "Not wired to
   production" line) and near `processAnnotations` in code, specifying the exact shape for whoever
   wires the future production endpoint (the one that will replace `/explain-move-llm`):
   - Table: `deep_reveal_failures` (existing schema, no migration needed — `id, position_hash,
     movestring, col, endpoint, llm_prompt, raw_llm_output, failure_reason, created_at`).
   - Write a row when `processAnnotations(...).repairs.length > 0`.
   - `endpoint` = the new condition-D production endpoint's name.
   - `raw_llm_output` = the **pre-repair** `mechanism` (so the malformed text is preserved for
     debugging).
   - `failure_reason` = the `repairs` array, reusing the existing code-array convention already used
     for `P5strong:*` validation failures in `server/index.js` (~line 1085) — e.g.
     `["unclosed_tag:term:immediate_threat"]`.
   - This is **not a user-facing error** — the bare-strip already produced clean text for the player;
     this write is purely an internal defect signal.

---

## Issue 2 — invented centrality asymmetry against a null signal

**Symptom (eval-18, A4):** `render_decision.openingContext.centralityComparison.qualitative` is
`null` (no landing-cell centrality advantage — both columns are geometrically equivalent), but the
model's `mechanism` still claims one column is "the stronger central column" and the other "the side
column."

**Confirmed root cause — a genuine code bug, not a prompt-wording gap.** `openingFrame.mjs`'s
`composeOpeningFrame` already correctly omits any centrality clause when
`centralityQualitative(fv)` is null (`centralityClause` returns `''`) — so the *engine-composed*
frame text never claims a false asymmetry. The bug is one layer up: `assembleGroundedPrompt`
(`renderReasonModel.mjs` ~line 294) always prints:

```js
`Guardrail: ${model.link.guardrail}`,
```

— which is **only** the guardrail from the unconditional L1–L9 `classifyCausalLink` classification
(computed for every record, opening or not, to feed horizon scaffolding — see
`reason-render-grounded-prompt.md` §9). `composeOpeningFrame` computes its **own** guardrail
(stored on `frames[0].guardrail`, e.g. "explain through the opening, don't ground a deep cell") but
`assembleGroundedPrompt` never reads `frames[0].guardrail` — only `frames[0].text` is pulled from the
frame object. So for every opening case, the model only ever sees the L-family guardrail (about
causation/lost-position framing — an unrelated concern for openings); the opening frame's own
guardrail is computed and silently discarded. There is currently **no** guardrail instruction
anywhere telling the model "don't invent a centrality/difficulty difference when none is given,"
because the one place such an instruction would naturally travel is dropped before reaching the
prompt.

Verified: no test in the repo asserts on `.guardrail` content or the literal `"Guardrail:"` prompt
line (grep across `server/scripts/**/*.test.mjs`), so this fix carries no ripple risk analogous to the
D34 causal-link-text verbatim tests.

### Fix (two pieces)

1. **Code-bug fix (`renderReasonModel.mjs`, `assembleGroundedPrompt`).** Combine both guardrails
   instead of dropping the frame's own:
   ```js
   [model.link.guardrail, model.frames[0]?.guardrail].filter(Boolean).join(' ')
   ```
   (Non-opening records have no distinct frame guardrail beyond `model.link.guardrail` today — this
   change is a no-op for them; verify at implementation time that `frames[0].guardrail` for the
   non-opening branch is either absent or identical to `link.guardrail` so nothing doubles up.)

2. **Guardrail wording addition (`openingFrame.mjs`, `GUARDRAIL`).** Append a clause, conditioned on
   the same `centralityQualitative(fv)` check already used for the clause text, forbidding an invented
   claim. Draft:
   ```js
   const GUARDRAIL_NO_CENTRALITY = ' The two landing cells are NOT stated to differ in centrality or '
     + 'difficulty here — do not say one column is "more central," "the stronger column," or "easier '
     + 'to win through" than the other unless this vector gives you that comparison.';
   ```
   Composed inside `composeOpeningFrame` as `GUARDRAIL + (centralityQualitative(fv) === null ?
   GUARDRAIL_NO_CENTRALITY : '')`, reusing the existing `centralityQualitative(fv)` call.

---

## Issue 3 — player-2 opening defeatism despite a clean hold-the-line frame

**Symptom (eval-23, eval-24, A5b):** the model adds a defeatist trailer clause even though the
composed frame (L7 / the D34 hold-the-line rewrite) never says the position is lost — e.g. "both
lines still end poorly with best play" (eval-23), "the final result still goes against you"
(eval-24).

**Confirmed root cause — model non-compliance with an already-correct instruction, not a missing or
buggy guardrail.** These opening-defense boards route through `openingContext.defense` (frame O2) for
their *text*, but their rendered `Guardrail:` line still comes from the unconditional L1–L9
classification — here, `lose_to_faster_lose` → **L7**, whose guardrail (per D34) already says:

> "Do not claim the better move wins, and do NOT tell the player they are lost; frame the better move
> as the toughest, most resilient defense that keeps the practical swindle alive."

The model added defeatist wording anyway — a direct violation of an instruction that was already
present in the prompt. Also confirmed: `grade-fv-sufficiency`'s A5b/G2 rubric is an **LLM-judged**
rubric (not a mechanical keyword scan) and already correctly caught both cases as failures — so no
grader change is needed here; the grader isn't blind, the model is non-compliant.

Given this is (a) already guarded, (b) already correctly graded, and (c) only 2/57 cases, a mechanical
auto-repair (like Issue 1's bare-strip) is disproportionate — safely rewriting free prose without
breaking grammar/flow would need another LLM pass, not a regex.

### Fix (one piece — wording only, no code/grader change)

**Strengthen L7's (and L3's, same family) `guardrail` field in `causalLinks.mjs`** with concrete
banned phrases, extending the existing D34 sentence. Draft:

> Current: `'Do not claim the better move wins, and do NOT tell the player they are lost; frame the
> better move as the toughest, most resilient defense that keeps the practical swindle alive.'`
>
> Extended: `'... frame the better move as the toughest, most resilient defense that keeps the
> practical swindle alive. Do not add a closing caveat like "but the position is still lost," "both
> lines end poorly," "the result still goes against you," or "you still lose either way" — the
> practical-resistance framing must stand on its own, with no defeatist final clause.'`

L3's guardrail (the non-opening `lose_to_faster_lose` sibling) gets the analogous appended sentence
with the same banned-phrase list, for consistency across the family.

**Accept as monitored residual, don't over-engineer further:** if this recurs at a meaningfully higher
rate in the next grading round after the wording change ships, revisit with a heavier approach
(mechanical post-hoc detector, or a second LLM pass to rewrite an offending trailer) at that point —
not preemptively for 2 cases.

---

## Cross-cutting: documentation and decision log

- **`docs/architecture/reason-render-grounded-prompt.md` §10** gets updated with: the bare-strip
  behavior + `repairs` field, the `annotationRepairs` eval field, and the production
  `TODO(production-wiring)` note for `deep_reveal_failures` (durable, mandatory-read doc — per
  `feedback_superpowers_docs_not_durable`, this is where it must land, not just this throwaway spec).
- **`docs/architecture/reason-DECISIONS.md`** gets a new entry (next in sequence after D34) logging
  this brainstorm's resolved outcome: the three root causes, the bare-strip decision (vs.
  canonical-phrase substitution), the `assembleGroundedPrompt` guardrail-combine fix, and the
  "accept as monitored residual" call on Issue 3.

## Testing

- `npm run test:fast` (inside `connect-four/`) — per CLAUDE.md, never `npm test` (candidate-generator
  hangs).
- Any existing test asserting the exact `causalLinks.mjs` L3/L7 `guardrail` or `template` string
  verbatim will need its expected string updated (memory: editing `causalLinks.mjs` link text ripples
  to verbatim-asserting tests, per the D34 experience) — locate these before editing, not after.
- New unit coverage needed: `processAnnotations` on a bare-unclosed-tag input (asserting `repairs`
  populated + token stripped + rest of text intact); `assembleGroundedPrompt` on an opening record
  (asserting both guardrails appear in the rendered prompt).
- Re-run condition D over the frozen 57-case set (or at minimum the 17 failing ids) after the fix and
  confirm: Issue 1's 13-14 cases show zero raw `[zone:`/`[term:` leakage in `mechanism`; eval-18 no
  longer claims a centrality asymmetry; eval-23/24 checked for the banned defeatist phrases (may still
  need a fresh grading pass to confirm A5b now passes, given wording-only fixes are the least
  deterministic of the three).

## Acceptance

- Zero occurrences of literal `[zone:` / `[term:` (unclosed) surviving in any `mechanism` in a
  re-graded run.
- `annotationRepairs` non-empty on any record is caught by `grade-fv-sufficiency` as an automatic G7
  fail (verify via a synthetic record with a forced bare tag).
- eval-18 re-answered: no centrality-asymmetry claim when `qualitative` is null.
- eval-23/eval-24 re-answered: no defeatist trailer phrase family present (spot-check; full A5b
  re-grade recommended given wording-only nature of this fix).
- No regression on the 40 currently-passing condition-D cases.
