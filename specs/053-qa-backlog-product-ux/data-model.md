# Phase 1 Data Model: QA Backlog & Product/UX Decisions

This feature introduces **no database schema, no new table, no new column, no migration**. Its
"entities" are documentation/tracking artifacts — markdown records with a fixed shape, not rows in a
store. This file documents that shape so `tasks.md` and the implementer produce a consistent record
instead of ad-hoc prose.

## Entity: QA Finding

**Source of truth**: `agentic_QA_2026-07-15-1321.md` (repo root, 624 lines as of 2026-08-01, currently
untracked — FR-001 commits it).

| Field | Type | Notes |
|---|---|---|
| Severity | enum: `[blocker]` / `[major]` / `[minor]` / `[polish]` / `[product decision]` | As authored in the findings file's own bracket-tag convention (see file body, e.g. `[major] Back button infinite-toggles...`). |
| Code location | file/line or screen name | As authored; may be stale (e.g. OI-35's own `server/index.js:942` citation is stale — the real fix landed at `:1037-1040`). |
| Repro | free text | As authored. |
| **Disposition** (this feature's write) | enum: `fixed` \| `stale` \| `fix-here` \| `owned-by-another-epic` \| `new OI-N` | Exactly one per finding (FR-002). Required field — no finding may be left without one (SC-002). |
| Evidence (for `fixed`) | file/line, test name, or commit hash | Must be a citation the reader can independently check, not a restatement of the finding (FR-002). |
| Reason (for `stale`) | free text | Why the original repro no longer applies. |
| Pointer target (for `owned-by-another-epic`) | epic name/number, "shipped" vs "still open" | Per FR-009: Epic 6-owned findings point at the **shipped** Epic 6 work (commit `4d78aa2`), not at a still-open story; Epic 3-owned findings (upgrade-funnel/payments) point at Epic 3 without editing anything there. |
| New OI-N (for `new OI-N`) | `docs/open_issues.md` entry id | Only for findings confirmed still open and **outside** the FR-004/005/006 fix-here scope (Assumptions: those three are the full and only set this feature may fix in code). |

**Validation rule**: `disposition` must be exactly one of the five values — never blank, never two
values on the same finding (SC-002's "zero findings left unaddressed or ambiguous").

**Write targets**: the disposition is written **in two places** per finding — inline in
`agentic_QA_2026-07-15-1321.md` (FR-003 "updated in place") and durably in `docs/open_issues.md`'s OI-35
entry (FR-003 "not merely a pointer back to the findings file"). The two must agree; `docs/open_issues.md`
is authoritative if they ever drift, since it survives independent of the findings file's own future edits.

## Entity: Open-issue entry (`OI-N`)

**Source of truth**: `docs/open_issues.md`. This feature writes to three specific existing entries and
may create new ones.

| OI-N | Current `Status` line (verified 2026-08-01) | This feature's target end-state |
|---|---|---|
| OI-35 | `deferred / open` + false "committed" claim | `RESOLVED <date>` or a dated `UPDATE` — corrected "committed" claim, full disposition table for every finding, per FR-023's issue-closeout convention (`docs/epics/open-issues-epics.md` preamble: "An `OI-N` is not done when its code ships — it is done when `docs/open_issues.md` says so"). |
| OI-21 | `open — product/UX design task` | `RESOLVED <date>` — documents the accepted alternative + rationale (FR-010), **and** is gated on FR-014a: if the real-browser check finds a silent block, OI-21 itself may still close (the *design* question is settled either way) but `staging_checks.md:495` stays un-signed and a **new**, separate `OI-N` is filed for the silent-block finding (FR-014b) — do not conflate closing OI-21 with signing off the staging item. |
| OI-37 | `deferred / open (surfaced during Batch B task 18...)` | `RESOLVED <date>` — evidence covering **both** triggers (342-game Papergames `finish_reason` breakdown, already measured; the in-app FR-018 verification result), OR left open with a dated note if FR-019's fix is still landing. |
| new `OI-N` (US1, conditional) | n/a | One entry per confirmed-still-open finding outside FR-004–006's fix-here scope (disposition 5). Also one entry if FR-014b's silent-block case fires. Format matches existing entries: `## OI-N — <title>`, `**Status**:`, `**Area**:`, body, optional `**UPDATE <date>**` block — copy the shape of a recent worked example (OI-38's `UPDATE 2026-07-30` block is the closest analog: corrects a stale count without re-litigating the underlying decision). |

**Closeout convention** (restated from `docs/epics/open-issues-epics.md` lines 17–37, binding per Epic 7
Acceptance Criteria and FR-023): fully fixed → `**Status**: ✅ RESOLVED <YYYY-MM-DD>` + what shipped and
where; partially fixed → keep open + dated `**UPDATE <YYYY-MM-DD>**`; found already resolved → say so
with the evidence; deliberately not fixed → leave open, record the decision and rationale (this is OI-37's
likely shape for the accuracy-calculation-stays-unchanged half, even after the resign-repro half closes).

## Entity: Onboarding greeting (documentation-only, no code entity)

Not a stored record — the "entity" is the **pairing** of two already-existing artifacts this feature
verifies stay in sync: `onboarding.mission.*` text keys (EN + ES, in `src/i18n/en.json`/`es.json`) and
the spoken `coach.onboardingMission.greeting` audio clip. This feature's concern (per spec.md Key
Entities) is confirming the text alone is sufficient, not changing either.

## Entity: Deep-reveal spend policy record (D2)

Not a DB row — a **decision record** that must exist, verbatim in substance, in two files:

| Location | Required content |
|---|---|
| `docs/open_issues.md` | The retired "blunders only" constraint, the reversal trigger (evidence anon users spend on suboptimal moves), and the response (steer via copy/UI nudges, not restrict) — FR-017. |
| `docs/epics/open-issues-epics.md` Epic 7 | Same substance, in Epic 7's own Settled Decision #5 (already present as of this plan — verify it still reads correctly after US3, do not duplicate a second, drifting copy). |

This is **not** a new entity type introduced by this feature — Epic 7's Settled Decision #5 already
carries this text; US3's job is to also land it in `docs/open_issues.md` (FR-017's "both locations"
requirement) and to remove the stale line from the design doc (FR-015).

## Entity: Game accuracy badge (verification-only, no schema change)

Read-only for this feature (FR-021 forbids any change to its calculation). Documented here only to make
explicit what is **not** touched: `puzzle_attempts`-derived Stats aggregate accuracy (unrelated, see
Non-Obvious Facts — `StatsScreen`'s "avg accuracy" card is puzzle accuracy, not game accuracy, and has
nothing to threshold), the in-app Review screen's `data.scored`-derived per-game accuracy
(`ReviewScreen.jsx:145`, `:299`), and the Papergames importer's derived-upper-bound accuracy
(`papergamesImporter.js:167`). No column, migration, or backfill is part of this feature (Non-Obvious
Facts, "Scored-count facts, kept for the record only").
