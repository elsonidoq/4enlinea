# Contract: `guardExplainMoveLlmPayload` diagnostics field (FR-004)

**Status**: Phase 1 output for spec 059 / Epic 12. Referenced by `plan.md:305-306` (Project Structure)
and `data-model.md:47` (which defers the full before/after contract to this file). Written after the
plan-critique/plan-answers review resolved the field set (mandatory core = `failures` +
`strippedSpecs`; `promotedCoordinates`/`humanizedCoordinates` cut, not threadable without new
instrumentation).

All citations below are `file:line` against `connect-four/server/reasonRenderGuard.mjs` and
`connect-four/server/annotationGate.js` at HEAD in this working tree, verified fresh in the review
this contract implements (not re-derived from an earlier draft).

## Function under contract

`guardExplainMoveLlmPayload` — `reasonRenderGuard.mjs:418`. **Synchronous.** Confirmed no `async`
keyword; calls `promoteRawCoordinates` (`:217-241`) → `humanizeGroundedCoordinates` (`:156-181`) →
`validateAnnotation` (`annotationGate.js:524`, which runs `checkP5Strong` when `allowedSet` is
non-null) → (on failure) `stripFailingZoneSpans` (`:365-380`) → `stripInternalTokens`. Every one of
these is a pure string/regex/board-lookup transform — no solver call, no LLM call, no DB call, no
network call.

## Before (current signature and return, unchanged by this contract when the opt-in flag is absent)

```js
function guardExplainMoveLlmPayload({
  explanation, prompt, terms, locale = 'en', board = null, allowedSet = null, ...rest
}) {
  // promoteRawCoordinates -> humanizeGroundedCoordinates -> validateAnnotation -> stripFailingZoneSpans
  // -> stripInternalTokens
  return {
    ...rest,
    explanation: stripInternalTokens(...),
    prompt,
    terms: sanitizeTermsMap(terms),
  };
}
```

Return shape today, verbatim: `{ ...rest, explanation, prompt, terms }` (`reasonRenderGuard.mjs:437-442`).
No `diagnostics` key exists today.

## After (this contract's addition)

The function gains one new, optional input and one new, optional output key. Nothing about the
existing five inputs or the existing four output keys changes.

**New input** — opt-in flag, part of the same options object:

```js
guardExplainMoveLlmPayload({
  explanation, prompt, terms, locale, board, allowedSet,
  diagnostics = false,   // NEW — opt-in, default false
  ...rest,
});
```

**New output** — present **only** when the caller passed `diagnostics: true`:

```js
{
  ...rest,
  explanation: stripInternalTokens(...),
  prompt,
  terms: sanitizeTermsMap(terms),
  diagnostics: {              // present iff caller passed { diagnostics: true }
    failures: string[],       // validateAnnotation's own array, threaded out verbatim from
                               // reasonRenderGuard.mjs:429 (currently only console.warn'd at :434,
                               // never returned to the caller — this contract exposes it, doesn't
                               // recompute it)
    strippedSpecs: string[],  // the same `specs` Set stripFailingZoneSpans already builds internally
                               // from span-carrying failure codes (reasonRenderGuard.mjs:366-372,
                               // SPAN_CARRYING_CODES = new Set(['P1','P2','P5','P6','P5strong']) at
                               // :354) — threaded out of that private function's return, not a
                               // second call to validateAnnotation/stripFailingZoneSpans
  },
}
```

### Mandatory core: exactly two fields

Per the owner's decision (plan-critique blocking issue 2 / plan-answers "Blocking issue 2 (field
set)"): **`failures` and `strippedSpecs` are the entire mandatory contract.** Both are genuinely
threadable from existing internals — no new instrumentation, no new collection logic inside a
production text-rewriting function, only widening what two already-computed values are returned.

### Cut: `promotedCoordinates` / `humanizedCoordinates`

These are explicitly **out of scope for this contract**, not deferred-with-a-plan:

- `promoteRawCoordinates` (`reasonRenderGuard.mjs:217-241`) is a bare `seg.replace(CXRY_RE, …)` — it
  performs the substitution inline and collects nothing about what it rewrote. There is no existing
  value to thread out.
- `humanizeGroundedCoordinates` (`reasonRenderGuard.mjs:156-181`) has exactly one `push` in its body,
  and it is the zone-tag depth stack used to track nesting (`open.push`) — not a record of any
  coordinate it humanized. There is no existing value to thread out here either.

Exposing either would require **new instrumentation written inside two production text-rewriting
functions** — the opposite of the "thread out, don't recompute" principle this contract otherwise
follows, and explicitly rejected by the owner as out of scope for this epic. If a future need for
these fields arises, it is a new, separately-scoped instrumentation task, not an extension of this
contract.

## Byte-identity guarantee (AC 2a)

When the caller omits `diagnostics` (or passes `diagnostics: false`, the default), the function's
return shape is `{ ...rest, explanation, prompt, terms }` — **identical to today**, no `diagnostics`
key present at all (not `diagnostics: undefined` serialized, not an empty object; the key is simply
absent from the returned object). The live `/explain` endpoint (`index.js:1470`) does not pass the new
flag, so its response is byte-identical to pre-epic behavior. This is the literal mechanism satisfying
FR-004's "When the flag is absent, the function's return shape and the live `/explain` endpoint's
response … MUST be byte-identical to today's."

## Consumers of this contract

1. **`mechanismExplainer.mjs` / FR-013 (Design Decision 1, `plan.md`)** — calls
   `guardExplainMoveLlmPayload({ explanation: attempt1.mechanism, board, allowedSet, diagnostics: true })`
   immediately before the existing `missingRequiredGroups(requiredSet, attempt1)` call
   (`mechanismExplainer.mjs:221`), reads `diagnostics.strippedSpecs` to compute
   `survivedSpecs = attempt1.usedSpecs.filter(s => !diagnostics.strippedSpecs.includes(s))`, and passes
   `survivedSpecs` into that same call site. This is the ONLY consumer of `strippedSpecs` inside
   production code (task 2.6, depends on this contract — task 1.7 must land first).
2. **`compute.mjs` / FR-001/FR-002 (task 1.1/1.2)** — calls the same function with
   `diagnostics: true` to record `servedExplanation` and `guardDiagnostics` (both `failures` and
   `strippedSpecs`) on each answers row (see `data-model.md`'s Answers row section). This is an
   offline, read-only consumer — it does not feed back into production serving.

## Test surface this contract implies

`reasonRenderGuard.test.mjs` (extended, per `plan.md`'s Source Code map) must assert:
- `diagnostics` is absent from the return when the flag is omitted (byte-identity, AC 2a).
- `diagnostics.failures`/`diagnostics.strippedSpecs` are present and correctly populated when the flag
  is `true`, against a real corpus record known to trigger at least one stripped span (the harvested
  US1 regression fixture: 5 runs in `…2026-08-26T15-47-56Z` lose a span).
- No third key (`promotedCoordinates`, `humanizedCoordinates`, or anything else) is added to
  `diagnostics` — a negative assertion guarding against silent scope creep back into the cut fields.
