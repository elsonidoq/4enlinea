# Answers and decisions (plan_critique)

## Blocking issue 1 — FR-011 has no implementation site
Answer: see Decision 1 below — **new `promoteRawCoordinates()` in `reasonRenderGuard.mjs`.**

## Blocking issue 2 — `checkP5Strong` wiring is partial in two more ways
Answer: Accept recommendation (auto-applied — no alternative).

Both sub-issues are real defects with no alternative resolution:
- Add `P5strong` to `SPAN_CARRYING_CODES` in `reasonRenderGuard.mjs`. Without it, once `allowedSet` is
  threaded an ungrounded highlight marks the payload invalid, emits a `console.warn`, and is then
  **served to the player unchanged** — FR-012, US3 scenario 2, SC-006 and the quickstart all fail.
  Make it an explicit task with a test.
- Make `checkP5Strong` handle `future:` specs. The plan's assertion that stripping the prefix inside
  `zoneParser.js`'s `isValidSpec`/`expandSpec` gives P5Strong coverage "for free" is **verified false**:
  `checkP1`/`checkP2`/`checkP5` call those helpers, but `checkP5Strong` matches raw spec strings with
  its own regexes (`/^col(\d+)$/`, `/^c(\d+)r(\d+)$/`, `/^cells:(.+)$/`, `/^row(\d+)$/`) and never calls
  either. A `future:c2r6` spec falls through every branch unchecked — the identical silent-fallthrough
  bug the plan diagnosed for `windows:`.
- **Ship the `windows:` branch, the `future:` handling, and the `SPAN_CARRYING_CODES` fix as ONE task.**
  Landing them separately leaves a class of highlight silently unchecked in the interim.

Per the critique's systemic finding: do not merely patch the three named gaps. **Re-walk
`annotationGate.js` + `reasonRenderGuard.mjs` end-to-end** for spec-shape coverage and failure-code
coverage, and fix every instance of this class found.

## Blocking issue 3 — The compliance check as specified can never pass
Answer: Accept recommendation (auto-applied — no alternative).

As written it checks that every `requiredSet[].handle` appears as `[zone:{handle}]` in
`attempt.mechanism` — but `runLlmAttempt` → `postprocessAnswer` → `processAnnotations` rewrites every
handle into its expanded spec **before** `computeMechanism` sees the text. No handle survives, so the
check would fail, retry, and log a `deep_reveal_failures` row on **every single request**.

Pin it in **both** `plan.md` and `data-model.md`: the check runs against `[zone:{spec}]` on the
post-`processAnnotations` mechanism. Preferred implementation is to surface `processAnnotations`'
existing `usedSpecs` — noting the epic's own warning that `usedSpecs` is a **local variable**, not part
of that function's return shape, so surfacing it is an explicit (small) change, not a given. Remove
`research.md` D3's hedge ("or its already-expanded `spec`, post `processAnnotations`") so no ambiguity
survives into tasks.

## Decision 1 — Where raw-coordinate promotion lives
Answer: **New exported function in the same file.**

Add `promoteRawCoordinates(text)` as a **new exported function** in
`connect-four/server/reasonRenderGuard.mjs`, called from `guardExplainMoveLlmPayload` **before**
`stripInternalTokens`. Plan A's two symbols (`stripInternalTokens`, `RANGE_RE`) stay **byte-identical** —
a new function is a clean, non-overlapping diff against Plan A's edits to the same file. This keeps all
text sanitization in one module.

Required in the plan:
- Add an explicit **Source Code file map entry** for this. The project's rule is that
  `/speckit-tasks` reads the file map, not the prose — a requirement named only in the Summary receives
  zero tasks.
- State the ordering constraint: promotion runs **before** flattening.
- Promotion **must skip zone-tag delimiters** via the existing `ZONE_TAG_RE` split, or it will corrupt
  `[zone:cells:c4r1,c4r2]` — exactly as that file's own comment warns.
- Rejected: (b) handing FR-011 to Plan A (leaves US3 half-delivered and SC-002 unowned); (c) promoting
  in `server/index.js` (splits one sanitization concern across two modules and misses the cache-hit and
  not-a-blunder response paths).

## Decision 2 — Promotion vs. the annotation gate ordering
Answer: **Promote first, validate second, fall back on rejection.**

Promotion runs first; `validateAnnotation` then runs normally. If `checkP5Strong` rejects the promoted
cell (which it will whenever the coach was not offered that handle), that **one coordinate** falls back
to today's "column N" flattening rather than being served as a highlight. This preserves the "nothing
ungrounded reaches the player" invariant — which the epic ranks as the more serious failure mode — and
degrades to current behaviour rather than to a confident wrong highlight.

Rejected: promoting after validation unconditionally, which would make the coach's own unprompted
coordinates the one class of highlight nobody checks.

## Also fold in (the critique's "non-obvious" corrections — apply in this pass)
- **`research.md` D6 and `data-model.md` §2 are wrong** about where the `# Highlightable regions` prompt
  block lives: they say `compute.mjs`'s `buildPromptForCondition`; it is actually
  `assembleGroundedPrompt` in `renderReasonModel.mjs`. `plan.md` is right, and its omission of
  `compute.mjs` from the file map is **correct** (compute.mjs only wraps `assembleGroundedPrompt`). Fix
  research.md and data-model.md so the tasks author does not task the wrong file.
- **Delete `research.md` D6's ambiguity** about the 5th colour ("added to `ZONE_COLORS` or a parallel
  constant"). `plan.md` is right that it must NOT join `ZONE_COLORS`: `getZoneColor` hashes mod
  `ZONE_COLORS.length`, so growing the array silently re-colours every existing spec.
- **State explicitly** that `guardExplainMoveLlmPayload` is called from **three** sites in
  `server/index.js` (cache hit, not-a-blunder, fresh) and that only the fresh path can build an
  `allowedSet`. Leave nothing implied.

## Confirmed correct — do not re-check
Migration `065` is genuinely free (highest on disk is `064_drop_correct_col.sql`); the
`deep_reveal_failures` additions are additive/nullable against the all-`NOT NULL` `031` schema;
`docs/deployment_steps.md` **is** in the file map and the entry matches that file's template;
`Board.jsx`'s prop list matches D7 exactly with no existing numbering prop; all six named existing test
files are present and on `package.json` line 17.
