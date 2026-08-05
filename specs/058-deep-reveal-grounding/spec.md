# Feature Specification: Deep-Reveal Grounding

**Feature Branch**: `058-deep-reveal-grounding`
**Created**: 2026-08-04
**Status**: Draft
**Input**: User description: "Epic 11 — Deep-Reveal Grounding (docs/epics/deep-reveal-grounding-epic.md)"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - The coach has a legal way to point at every square it names (Priority: P1)

A player opens a deep-reveal explanation. The coach's mechanism talks about a winning line, a
key square, or a deep fork square that only matters a few moves later. Today the coach has no
legal way to mark some of these — in particular a deep, not-yet-playable fork square (the exact
kind of square the player most often asks "which one is it?" about). Because there is no legal
handle for it, the coach either omits it or names it as raw text that later gets flattened to a
vague "column N."

This story gives the coach a complete set of legal handles: one for every square, line, or future
square the mechanism might need to point at, including a new class of handle for a square that
matters later (once a forced sequence reaches it) rather than right now. A future square is
visually and verbally distinguished from a present one, so the player is never told "watch this
square" about a square that isn't actually playable yet.

**Why this priority**: Every later story depends on this one. A story that requires the coach to
point at a square, but offers no legal way to do so, is unsatisfiable by construction — the coach
would fail every time. This must land first.

**Independent Test**: Take a position whose mechanism needs to reference a deep fork square (e.g.
one of the four staging boards below). Confirm the system now offers a legal handle for that
square, distinguishable from an ordinary present-tense handle, without needing any other part of
this feature to be built.

**Acceptance Scenarios**:

1. **Given** a position whose explanation revolves around a square that only becomes relevant
   several moves into a forced sequence, **When** the system builds the set of squares/lines the
   coach is allowed to reference, **Then** that deep square is included as a distinct "future
   square" handle, not silently omitted.
2. **Given** a future-square handle is offered, **When** the coach's explanation uses it,
   **Then** the resulting player-facing highlight and wording present it as something that
   matters later ("this square matters once X happens"), never as a threat happening right now.

---

### User Story 2 - Highlighting the load-bearing squares is required, not optional (Priority: P1)

Today the coach is only *offered* the ability to highlight the squares its explanation depends
on — and it frequently declines. In a sample of 4 real staging explanations, 3 named a square in
plain prose with zero highlights at all, and the coach wrote 6 raw, unhighlighted squares across
the sample. The player is told "column 5" or "column 1" with no way to find the exact cell.

This story makes highlighting the squares an explanation is actually built on mandatory: the
system determines, from the same evidence the explanation is generated from, which one or two
squares (or one line) the explanation cannot be honest without, and requires the coach to mark
every one of them. If the coach's first attempt misses a required square, the system asks again,
naming exactly what was missed, once. The explanation shown to the player is always the second
(retried) attempt — deterministically, never re-evaluated for quality against the first — even if
the second attempt still misses the required square (a paid feature must never go silent); any
coordinate the second attempt still gets wrong is caught by the safety net in the next story
instead of reaching the player as bare text. Every such retry is recorded so the team can see how
often the coach still gets it wrong.

**Why this priority**: This is the direct fix for the evidence: three of four sampled real
explanations skipped highlighting entirely. Making the load-bearing squares mandatory, with a
single retry and full logging of both attempts, is the core of the fix.

**Independent Test**: Run the four staging positions below through the pipeline in isolation
(assuming Story 1 has already shipped its handles). Confirm each explanation's required squares
are computed correctly, that a response omitting one triggers exactly one retry naming the miss,
and that both attempts plus the outcome are recorded.

**Acceptance Scenarios**:

1. **Given** a position with an explanation that rests on one or two specific squares (or one
   line), **When** the coach generates its explanation, **Then** the system requires every one of
   those squares/lines to be highlighted, and only squares/lines for which a legal handle exists
   (Story 1) are ever required.
2. **Given** the coach's first explanation omits a required square, **When** the system detects
   the omission, **Then** it retries exactly once, explicitly naming the missing square(s) to the
   coach.
3. **Given** the retry also omits a required square, **When** the system decides what to serve,
   **Then** it always serves the second (retried) attempt to the player — never a hard failure,
   and never re-evaluated against the first attempt for quality — and records both attempts,
   which squares were missing, and that the second attempt was served.

---

### User Story 3 - Nothing ungrounded reaches the player, ever (Priority: P2)

Two remaining failure modes must be closed as a backstop under Story 2. First: a raw board
coordinate could still leak into the text the player reads or hears, un-highlighted. Second — the
more serious one — the coach could highlight a square that is well-formed and superficially
consistent with the surrounding text, but that the reasoning engine never actually found to be
tactically relevant: a confident, wrong answer that looks exactly like a correct one to a learner
who doesn't already know the position. Today the one check that would catch this second failure
mode exists in the codebase but is never actually run on real traffic.

This story closes both gaps: no coordinate reaches the player without becoming a real, clickable
highlight, and every highlight the coach produces is checked against the actual set the coach was
offered — not just checked for being well-formed.

**Why this priority**: This is the safety net under Story 2's mandatory-highlighting fix, and it
closes a known, previously-deferred defect (the truth-check that never runs live). It depends on
Stories 1 and 2 existing (there must be a required/offered set to check against).

**Independent Test**: Feed the guard layer a synthetic explanation containing (a) a raw,
un-highlighted coordinate and (b) a highlight naming a square outside the offered set. Confirm the
first is promoted into a real highlight and the second is caught and stripped, independent of
whether Story 2's retry logic ran.

**Acceptance Scenarios**:

1. **Given** an explanation reaches the response boundary with a raw board coordinate still in the
   prose, **When** the response is prepared for the player, **Then** the coordinate is turned into
   a real highlight, not flattened into vague prose.
2. **Given** an explanation highlights a square the reasoning engine never actually offered as
   evidence for this position, **When** the response is validated, **Then** that highlight is
   caught and does not reach the player unchallenged.
3. **Given** a fully valid, fully grounded explanation, **When** it passes through validation,
   **Then** nothing about it is altered or stripped.

---

### User Story 4 - The player can find the column and row a reference points to (Priority: P3)

Even a perfectly highlighted square is hard to communicate verbally ("column 5, row 3") if the
board itself has no visible coordinates. On the deep-reveal screen specifically, the player should
be able to look at the board and see which column and row a reference is talking about.

This story adds visible column/row numbering to the board, but only on the deep-reveal screen —
every other place the board appears (the live game, challenges, lessons, admin tools) is
unaffected. It is independent of Stories 1–3 and can be built and shipped in parallel.

**Why this priority**: Real, but lower — it makes an already-correct reference easier to use,
rather than fixing a reference that is wrong or missing. It is not blocked by, and does not block,
the grounding fixes above.

**Independent Test**: Open the deep-reveal screen and confirm the board shows column and row
numbers. Open any other screen that renders a board (game, challenge, lesson, admin) and confirm
nothing changed there.

**Acceptance Scenarios**:

1. **Given** a player opens a deep-reveal explanation, **When** the board renders, **Then**
   columns and rows are visibly numbered.
2. **Given** a player is on any other screen that shows a board, **When** that screen renders,
   **Then** its appearance is unchanged from before this feature.

---

### Edge Cases

- What happens when a position's explanation has no square it specifically rests on (e.g. a
  diffuse, hard-to-isolate parity win)? The system must not force a required square onto an
  explanation that genuinely doesn't have one — over-requiring invents a reason that isn't there.
- What happens when the coach's second (retried) attempt is *worse* than the first (e.g. it now
  omits something the first attempt got right)? The system always serves the second attempt —
  deterministically, never re-evaluated for quality against the first — because the second attempt
  is always the one that saw the explicit "you missed these squares" correction. Both attempts are
  recorded regardless of which is served.
- What happens when a deep "future square" handle is used, but the explanation's wording treats it
  as happening right now? This is exactly the failure mode this feature exists to prevent — the
  prompt-level rule and the validation layer must both guard against it.
- What happens to an explanation already sitting in the cache when this feature ships? A cached
  explanation was produced under the old, non-grounded rules and must not be treated as
  retroactively compliant; see Assumptions.
- What happens when a derived load-bearing cell/window (per the Derivation Rule below) has no
  matching offered handle? That group is dropped from the required set on match failure — the
  required ⊆ offered invariant is enforced at derivation time, not only at validation time. There
  is no priority ordering or "collision" concept anywhere in this design; the only drop rule is
  match failure.
- What happens when a raw coordinate (FR-011) is turned into a highlight, but that coordinate names
  a square the reasoning engine never actually offered as evidence (FR-012)? FR-012 wins: the
  attempted highlight is caught and does not reach the player, and the coordinate falls back to the
  same vague "column N" phrasing it would have received before this feature existed — the player is
  neither shown a real highlight for a square the engine cannot vouch for, nor shown a raw internal
  token. This is the one case where FR-011's promise ("a real, player-findable highlight") is not
  delivered for that specific coordinate; it degrades to the pre-feature behavior rather than to a
  confident, ungrounded highlight, because Story 3's "nothing ungrounded reaches the player" is
  ranked above Story 1's promotion goal for this specific conflict.

## Requirements *(mandatory)*

### Derivation Rule — Required Set

The following rule is copied **verbatim** from the epic (`docs/epics/deep-reveal-grounding-epic.md`,
Settled decision 2) and governs FR-003–FR-005 below. It is not to be re-derived, re-worded, or
summarized — a prior paraphrase of this rule was itself the defect this section exists to fix.

> **The required set is derived from the causal link's halves, via an explicit cell-derivation
> rule — not from `covers`.** `renderReasonModel.mjs` imports `classifyCausalLink`
> (`server/scripts/reason_engine/causalLinks.mjs`), which returns
> `{ id, confidence, covers, guardrail, text }`. `covers` is a list of field-name *codes* (e.g.
> `'lostResource.terminal'`, `'opponentPunishment.kind'`) and every matched link lists fields from
> **both** halves — it cannot by itself say which half is load-bearing, and it names no cells.
> **Derivation rule:** for each of `fv.lostResource` and `fv.opponentPunishment`, the load-bearing
> cell (if any) is `half.cell ?? half.completingCell` (the same precedence `causalLinks.mjs`'s own
> `denialCell()` helper uses), or the full `half.window` array when the half's story is a line
> rather than a single square (as several `template` functions already render via `cells(window)`).
> A half with neither field yields no required cell — it is not forced into one (case `T-parity`,
> `covers: ['route', 'lostResource.terminal', 'opponentPunishment.terminal']`, is a real example:
> its own template says "the exact culprit square isn't cleanly isolable" and falls back to
> `lostResource.window`). Each derived cell/window is then **matched to an offered handle** by spec
> equality against `buildAnnotationOffer`'s `aliases[].spec` (a `cNrM`, `colN`, or `windows:…`
> string) — not by re-deriving a new spec format. **On match failure** (the derived cell has no
> offered handle), the group is dropped from the required set rather than left unenforceable;
> Settled decision 3 (required ⊆ offered) makes this the same invariant, just applied at
> derivation time instead of only at validation time. Cap the required set at **1–3 groups**
> (one per half that resolves to a cell, plus at most one line/window).
> *Rationale:* requiring a cell the mechanism does not rest on makes the model manufacture a reason
> it matters — the exact A3/A4 fabrication mode `feature-vector-grounding-epic.md` documents.

### Functional Requirements

- **FR-001**: The system MUST offer the coach a legal handle for every square/line class its
  explanation may need to reference, including a new handle class for a square that becomes
  relevant later in a forced sequence rather than immediately ("future square").
- **FR-002**: A future-square handle MUST be presented to the coach, and rendered to the player,
  in language and styling that distinguishes it from a present, immediately-relevant square — it
  must never be described or highlighted as a current threat.
- **FR-003**: For every explanation, the system MUST derive a required set of squares/lines
  according to the Derivation Rule above — computed directly from the causal link's two halves
  (`lostResource`/`opponentPunishment`), and MUST NOT be derived from `classifyCausalLink`'s
  `covers` field, which names field codes from both halves and cannot say which half is
  load-bearing or name a cell.
- **FR-004**: A square/line MUST only ever be required if a legal handle for it exists (per
  FR-001): each derived cell/window is matched against the offered handle set by exact spec
  equality (per the Derivation Rule above), and dropped from the required set on match failure —
  required squares are a subset of offered squares, without exception.
- **FR-005**: The required set for a single explanation MUST be capped at **1–3 groups** (one per
  half that resolves to a cell, plus at most one line/window) — enough to ground the explanation's
  core claims, not an exhaustive list of every square on the board.
- **FR-006**: If a component of the explanation has no cleanly isolable load-bearing square (e.g.
  a diffuse parity win), the system MUST NOT invent or force a required square for it.
- **FR-007**: The system MUST require the coach's explanation to mark every square/line in the
  required set with a real highlight.
- **FR-008**: If the coach's first explanation omits a required square/line, the system MUST retry
  exactly once, explicitly telling the coach which square(s) were missing.
- **FR-009**: The system MUST never fail to serve an explanation to the player solely because a
  required square was missed after the retry — an explanation is always served, and it is always
  the second (retried) attempt, deterministically, never re-evaluated for quality against the
  first attempt.
- **FR-010**: The system MUST record, for every retry, both attempts' full output and the specific
  squares that were missing on the first attempt.
- **FR-011**: If a coach's explanation contains a raw board coordinate in plain text, the system
  MUST convert it into a real, player-findable highlight rather than replacing it with vague text
  that loses the exact location.
- **FR-012**: The system MUST validate every highlight the coach produces against the actual set
  of squares/lines the coach was offered for that explanation, and MUST prevent an unoffered
  highlight from reaching the player unchallenged.
- **FR-013**: The system MUST NOT alter or strip a highlight that is both well-formed and
  genuinely grounded in the offered evidence.
- **FR-014**: The deep-reveal screen MUST display visible column and row numbering on the board.
- **FR-015**: No screen other than the deep-reveal screen MUST change its board appearance as a
  result of this feature.
- **FR-016**: The system MUST NOT change what the reasoning engine determines to be true about a
  position (which squares/lines matter and why) — this feature only changes whether and how those
  already-true facts reach the player as highlights.

### Key Entities *(include if feature involves data)*

- **Offered handle set**: the complete list of squares/lines/future-squares the coach is legally
  allowed to reference for a given explanation, each with a role describing what it means.
- **Required set**: the subset of the offered handle set that a given explanation's core claims
  cannot be honest without; every entry maps back to evidence the reasoning engine already
  produced for that explanation.
- **Explanation attempt record**: the record of one or two attempts to generate a compliant
  explanation for a position, including which squares were found missing on the first attempt (if
  any); when two attempts exist, the second is always the one served to the player.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For each of the four real staging positions that motivated this feature, the
  re-generated explanation highlights every square, line, and future square it names in prose —
  verified by re-running the explanation for that exact position, not by a hand-written example.
- **SC-002**: Zero raw board coordinates (in any form a player could not parse as plain language)
  reach the player in the deep-reveal explanation text.
- **SC-003**: A future-square handle (Settled decision 8) renders, on the deep-reveal screen, both
  visually and verbally distinguishable from a present-threat highlight — a player can tell,
  without prior knowledge of the position, that the square matters later rather than right now.
- **SC-004**: On a broad, representative set of positions, every required square/line has a legal
  way for the coach to reference it — there is no position where the system requires something it
  cannot offer.
- **SC-005**: When the coach's first attempt at an explanation misses a square it should have
  highlighted, the player still receives a usable explanation, and the miss is recorded for later
  review — measured as: zero explanation requests fail outright due to a missed highlight.
- **SC-006**: A highlight that the reasoning engine never actually found evidence for is caught
  before reaching the player, on the live traffic path (not only in offline testing).
- **SC-007**: The deep-reveal screen's board is visibly numbered by column and row; every other
  screen that shows a board is unchanged **by this feature** from before this feature shipped
  (a concurrent, independent effort may change board sizing/layout; this feature makes no claim
  about that).
- **SC-008**: The existing automated test suite remains fully green after this feature ships (the
  baseline is **zero** failures as of 2026-08-04), with no reduction in the number of scenarios it
  covers.

## Assumptions

- **Staging and production data are disposable pre-launch.** Any previously-cached explanation
  produced under the old (non-mandatory) highlighting rules is not retroactively fixed; the cache
  is expected to be cleared as part of shipping this feature rather than migrated in place.
- **This feature is a render-layer fix, not a reasoning-engine fix.** It assumes the reasoning
  engine already computes correct, solver-grounded facts about each position (the winning lines,
  fork squares, etc.) — this feature is entirely about whether and how those already-correct facts
  become highlights the player can see. Whether the reasoning engine's *facts themselves* are
  correct is a separate, already-scoped body of work and is explicitly out of bounds here.
- **A parallel, independent effort is fixing two adjacent problems this feature depends on but
  does not itself touch**: (1) the text-sanitization step that turns internal coordinates into
  plain language has a narrow gap with certain dash characters, and (2) the spoken/audio version of
  a deep-reveal explanation is not yet sanitized the same way the on-screen text is. This feature
  is written to build on top of both of those fixes landing first, and makes no promises about the
  spoken/audio surface — only about the text the player reads.
- **A second, independent effort may change board sizing/layout on the shared board component at
  the same time.** This feature's board-numbering addition assumes that effort owns sizing/layout
  entirely and limits itself to an additive, opt-in numbering display that does not change how big
  or how the board is laid out.
- **Rolling the new column/row numbering out to every other screen that shows a board (the live
  game, challenges, lessons, admin tools) is out of scope for this feature.** It is a natural,
  low-cost follow-up once the numbering capability exists, but is deferred so this feature's scope
  stays limited to the deep-reveal screen.
- **The two failure modes this feature targets are display bugs, not reasoning bugs.** All four
  motivating real-world examples were traced to the reasoning engine having correct information
  that simply never reached the player as a highlight — no case required inventing new tactical
  knowledge.

## Constraints (Cross-Lane)

This feature is being developed concurrently with two other worktrees ("Plan A" and "Plan B")
touching overlapping files in the reason-engine render path. The following five constraints are
copied **verbatim** from the epic (`docs/epics/deep-reveal-grounding-epic.md`, "Cross-lane
constraints") and are hard boundaries on the deliverable, not implementation details to be
inferred by the plan:

> **Cross-lane constraints (owner, mid-review — hard constraints, not suggestions):**
> 1. `connect-four/server/reasonRenderGuard.mjs` — `stripInternalTokens` and `RANGE_RE` are owned by
>    Plan A. Do not modify them; build on the post-Plan-A version.
> 2. No TTS work in this epic — Plan A owns the `GET /api/user/tts/deep-reveal` sanitizer routing.
>    The two-attempt `deep_reveal_failures` logging (Settled decision 5) also lives in
>    `connect-four/server/index.js`: keep it in its own region of that file, away from the TTS
>    handler.
> 3. `connect-four/src/components/Board.jsx` (US4) — a separate parallel worktree ("Plan B") may
>    touch board sizing. Preserve the existing `Board.jsx` API; treat sizing as owned by Plan B, not
>    this epic.
> 4. Any new open-issue id this epic's spec/plan opens must use the range **OI-170+** (highest
>    existing is OI-147; all three parallel lanes would otherwise collide on OI-148). US3 **closes
>    the existing OI-143** — do not open a duplicate issue for it.
> 5. `connect-four/package.json` line 17 (`test:fast`) is a single line listing ~180 test files, and
>    all three lanes append to it concurrently. Any test file this epic's plan adds must be listed
>    **explicitly** in the plan so the append is a clean, reviewable diff.
