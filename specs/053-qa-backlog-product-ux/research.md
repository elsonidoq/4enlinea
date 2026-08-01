# Phase 0 Research: QA Backlog & Product/UX Decisions

There are **no NEEDS CLARIFICATION markers** in the Technical Context — every design question this
feature could raise was already resolved by the owner before the spec was written (spec.md Settled
Decisions #1–#5, restated verbatim from `docs/epics/open-issues-epics.md` Epic 7). This file records
*why* each of those decisions closes the question, and separately flags the items whose *factual
outcome* (not design) is still open pending a live-check — those are not research unknowns, they are
implementation-time verification steps (FR-004/005/006/007/018/014a), tracked in `tasks.md`, not
resolved here.

## Decision: OI-35 disposition model (5-way, not a fix sweep)

- **Decision**: Every finding in `agentic_QA_2026-07-15-1321.md` gets exactly one of five dispositions
  (fixed / stale / fix-here / owned-by-another-epic / new `OI-N`), and only three named items may be
  fixed in code under this feature (FR-002/FR-004–FR-006).
- **Rationale**: Confirmed at source — `docs/open_issues.md`'s OI-35 entry currently reads "the
  **committed** findings file `agentic_QA_2026-07-15-1321.md`" while `git status --short` still shows
  `?? agentic_QA_2026-07-15-1321.md` (untracked) and `git log --diff-filter=A -- agentic_QA_2026-07-15-1321.md`
  returns nothing — that claim is false today. Re-verified 2026-08-01 with the same two commands.
  Two of the three items given a "fix-here" slot are **already fixed at source**:
  - `connect-four/server/index.js:1037-1040` (verified 2026-08-01):
    ```
    const movesErr = validateMoves(moves);
    if (movesErr) return res.status(400).json({ error: movesErr });
    ```
    — the originally-cited `server/index.js:942` is stale; a malformed movestring now 400s, not 500s.
  - `connect-four/src/components/KbTermPopup.jsx:66` (verified 2026-08-01):
    ```
    const displayName = t(`kb.term.${kbId}`, { defaultValue: humanize(kbId) });
    ```
    — the KB-term-popup leak is gone. (Past Games sort chips / Review headers were not independently
    re-verified in this planning pass — that re-verification is a US1 task, not a research finding.)
- **Alternatives considered**: Treat the whole findings file as still-open and re-fix everything
  (rejected — Non-obvious Facts confirm much of the 25-finding backlog shipped since 2026-07-16, so a
  blind fix sweep would duplicate work and risk touching files owned by Epic 3/Epic 6). Merely append a
  note to OI-35 without correcting the "committed" claim (rejected — FR-001 explicitly requires the
  claim be corrected in the same change, not just supplemented).

## Decision: OI-21 — accept first-interaction playback (status quo), verify don't redesign

- **Decision**: No new onboarding entry UI. The coach greeting plays on the user's first interaction
  (already shipped, `useCoachSpeech`'s pointerdown/keydown/touchend replay). This story's job is
  (a) confirm the text bubble alone conveys the greeting, (b) document the decision in OI-21, and
  (c) obtain a real, non-automated browser confirmation before signing off `staging_checks.md:495`.
- **Rationale**: Browsers block `audio.play()` before a user gesture; the mission screen is reached via
  an auto-route (`Navigator`'s `sessionChecked && !session` effect, `connect-four/src/App.jsx:130-148`)
  with no prior gesture — this is a hard browser rule (Settled Decision #3, OI-21's own body). The
  automation-tooling risk is concrete, not theoretical: `docs/open_issues.md`'s OI-21 entry and
  `staging_checks.md:495` both already document that local QA ran in `chrome-devtools MCP` automation
  Chrome, which disables autoplay-blocking, so a `206` fetch there does **not** prove real-browser
  audibility.
- **Alternatives considered** (from OI-21's own body, all rejected by the owner pre-spec): a "Meet your
  coach" splash before the mission screen; forcing the auto-route through a minimal welcome-card tap;
  a visible speaker/"tap to hear" affordance. All three add UI/a tap Settled Decision #3 rules out.

## Decision: OI-37 — do not fold outcome into accuracy; verify the in-app resign repro before closing

- **Decision**: The accuracy calculation stays board-move-optimality-only, unconditionally (FR-021, no
  exceptions). The remaining open question is empirical, not one of design: does the in-app "optimal
  moves then resign" repro from the findings file still show "Clean game. Nothing to revisit." /
  Accuracy 100%, or does `review.cleanButLost` already cover it?
- **Rationale**: `connect-four/src/screens/ReviewScreen.jsx:293` and both locale files already carry the
  fix (verified 2026-08-01):
  ```
  connect-four/src/screens/ReviewScreen.jsx:293:      ? t('review.cleanButLost')
  connect-four/src/i18n/en.json:1005:    "cleanButLost": "No mistakes on the board — but the game was lost. Review how it ended."
  connect-four/src/i18n/es.json:1005:    "cleanButLost": "No hubo errores en el tablero, pero perdiste la partida. Mirá cómo terminó."
  ```
  but this proves the **copy** fix shipped, not that the **trigger condition** (`outcome === 'lost'`)
  actually fires for an in-app resign specifically, as opposed to only for a `time-up`/`winner` loss —
  the 342-game Papergames dataset never exercised a resign. FR-018 requires playing a real sparring game
  with only optimal moves and then resigning, and reading what ReviewScreen actually renders, before any
  close-as-not-a-bug claim.
- **Alternatives considered**: a minimum-scored-moves threshold (considered and explicitly rejected by
  the owner — Settled Decision #4, full trade-off table in spec.md Non-Obvious Facts; not reopened here).
  Folding game outcome into the accuracy number (rejected — Settled Decision #2, destroys both answers).

## Decision: Deep-reveal spend policy — record D2, ship no gate

- **Decision**: Retire the "blunders only" line, ship no gate code (server or client), record the
  rationale in both `docs/open_issues.md` and `docs/epics/open-issues-epics.md`.
- **Rationale**: Already approved 2026-07-16 (`docs/superpowers/specs/2026-07-16-qa-remediation-decisions-design.md`
  §D2, throwaway location — hence the durable-record requirement). A server-side gate isn't cleanly
  implementable (the anon gate is keyed `${movestring}:${col}`, ambiguous against stored rows); a
  client-only gate is theatre against the public no-auth `/api/blunders/:id` permalink; blocking a
  deliberate click costs conversion; and a gate would contradict shipped spec-042's "severity is label +
  color only, never gates an action" invariant.
- **Verified target line, 2026-08-01**: `docs/superpowers/specs/2026-07-13-anon-free-deep-reveal-design.md:41`
  ```
  4. **Which mistakes:** **blunders only.** Only genuine blunders open the reveal — that is what the
  ```
  still live — this is the FR-015 edit target. `docs/superpowers/plans/2026-07-13-anon-free-deep-reveal.md:18`
  is a **different file**, already struck through and marked `RETIRED 2026-07-16` — confirmed unchanged
  and cited as evidence D2 shipped; it is explicitly out of scope for any edit under this feature.
- **Alternatives considered**: none — this is a closed product call restated for durability, not an
  open design question (spec.md Open Questions: "None").

## Non-research items deliberately deferred to `tasks.md`

The following are **not** design unknowns and are not resolved here — they are live-verification steps
whose *procedure* is fixed by the spec (FR-004, FR-006's "any other leak", FR-007, FR-018, FR-014a) and
whose *outcome* determines a task's branch (fix vs. record-as-stale/closed). Listing them here only to
make explicit that Phase 0 does not attempt to predict their result:

- Cold-load `/mistakes ↔ /stats` back-nav loop reproduction (FR-004).
- Any English-in-Spanish leak beyond the four named ones, not already owned by Epic 6 (FR-006).
- Anon challenge-progress 401 fix still holding (FR-007).
- In-app "optimal moves then resign" ReviewScreen repro (FR-018).
- Real-browser (non-automation) onboarding-greeting audibility, EN and ES (FR-014a).
