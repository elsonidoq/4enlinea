# Answers and decisions (spec_critique)

## Blocking issue 1 — The required-cell derivation rule is hollowed out in spec.md
Answer: Accept recommendation (auto-applied — no alternative).

Restate the epic's Settled decision 2 **verbatim** in spec.md — as a bounded "Derivation rule"
subsection under Requirements, or as the definition of the **Required set** key entity. **Copy it from
the epic; do not re-word it.** The rule has already survived one lossy paraphrase; a second one is how
the wrong implementation ships looking compliant.

Specifically the spec must state, verbatim from the epic:
- For each of the two halves (`fv.lostResource`, `fv.opponentPunishment`), take
  `half.cell ?? half.completingCell`, or the whole `half.window` when the story is line-shaped.
- Match each result by **exact string equality** against the offered handle list (`aliases[].spec`).
- **Drop on match failure.**
- Cap the whole set at **1–3 groups** — replace FR-005's "a handful of groups" with the hard 1–3 cap.
- State explicitly that the required set must **NOT** be derived from `classifyCausalLink`'s `covers`
  field. FR-003's current wording ("not from an unrelated summary of that evidence") does not exclude
  it, because `covers` *is* part of the same evidence — it lists field-name codes from both halves and
  names no cells.
- Add the required→offered **matching step** to the requirements; FR-004 currently states the
  invariant (`required ⊆ offered`) without saying how it is enforced.

Also replace **Edge Case 5**, which is invented: it describes two required squares "colliding on one
handle → drop the lower-priority group", but no priority ordering exists anywhere in this design.
Replace it with the epic's real rule — drop on **match failure**.

## Blocking issue 2 — Cross-lane constraints missing from the artifact the planner scans
Answer: Accept recommendation (auto-applied — no alternative).

Add a "Constraints (cross-lane)" section to spec.md carrying all five constraints **verbatim**, not as
Assumptions paraphrase. spec.md currently paraphrases (a)–(c) loosely and omits (d) and (e) entirely.
These are hard boundaries on the deliverable, not implementation details:

(a) Do not touch `stripInternalTokens` / `RANGE_RE` in `server/reasonRenderGuard.mjs` — Plan A owns
    them and lands first; US3 builds on the post-Plan-A version.
(b) No TTS work — Plan A routes `GET /api/user/tts/deep-reveal` through the shared sanitizer. Keep the
    two-attempt `deep_reveal_failures` logging in its own region of `server/index.js`, away from the
    TTS handler.
(c) Preserve the existing `Board.jsx` API; board **sizing** is owned by Plan B.
(d) Any new tracked issue must be numbered **OI-170+** (highest existing is OI-147; all three lanes
    would otherwise collide on OI-148). US3 **closes existing OI-143** — do not open a duplicate.
(e) Any new test file must be an explicit, line-level append to the single ~180-file `test:fast` line
    in `connect-four/package.json` (line 17) — never a rewrite of that line. Name every test file the
    feature adds explicitly.

## Blocking issue 3 — "Future square" treatment has no decision and no success criterion
Answer: Accept recommendation (auto-applied — no alternative), with the treatment decided below.

Add a Success Criterion verifying that a future-square highlight is **visually and verbally
distinguishable** from a present-threat highlight on the deep-reveal screen. Without it, FR-002 can
ship unimplemented while every measurable outcome still passes — and FR-002 is the *only* mitigation
for the present-threat misreading that justified relaxing the structural-only rule at all. Do not
treat this as "just styling."

## Decision 1 — Which attempt is served when the retry also fails
Answer: **Always serve attempt 2.**

Matches the epic's settled policy. Deterministic and simple, and attempt 2 is always the one that saw
the explicit "you missed these squares" correction instruction. Both attempts are still recorded per
incident in `deep_reveal_failures`. Write this into spec.md as a **requirement**, not as an open edge
case — the current text ("which of the two attempts gets served must be a stated, recorded decision")
states that a decision is needed without making it, in a spec that claims zero unresolved questions.

## Decision 2 — How a "later, not now" square looks on the board
Answer: **Reserved colour + verbal framing.**

Give future squares a distinct **reserved colour** from the existing 7-colour highlight palette, plus
future-tense wording in the coach's prose. This touches the colour-assignment helper in
`src/lib/annotatedText.js` (the pool is deterministically keyed off the spec string), **not** the
`zhCells` renderer inside `Board.jsx` — which keeps it clear of the parallel lane (Plan B) editing that
file. Rejected: a dashed/ghosted visual form (clearest, but requires editing the `Board.jsx` highlight
renderer Plan B owns) and wording-only (weakest guard against precisely the misreading this mechanism
exists to prevent).

## Also fold in (the critique's own dropped findings — apply in this pass)
- Raw-coordinate promotion currently appears **twice**: as US2 Acceptance Scenario 4 and as US3/FR-011.
  The epic assigns it to **US3 only** — remove the duplicate so it does not become two lanes of work
  for one behaviour.
- SC-006's "pixel-for-pixel unchanged" is unverifiable while Plan B changes board sizing concurrently.
  Rescope it to "unchanged **by this feature**".
- SC-007 must carry the epic's **0-failure** `test:fast` baseline.

## Note for the plan author (not a blocking issue)
`server/migrations/031_deep_reveal_failures.sql` declares `raw_llm_output text NOT NULL` with one row
per failure, so recording **two** attempts genuinely requires a migration. The critique deliberately
did not block on this (prescribing schema in a spec is against convention) — but the plan must not
miss it.
