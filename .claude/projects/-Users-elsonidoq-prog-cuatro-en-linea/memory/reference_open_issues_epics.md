---
name: reference_open_issues_epics
description: "docs/epics/open-issues-epics.md is the spec-ready lane-ordered epic backlog for docs/open_issues.md — consecutive epic numbers = same lane, closing the OI entry is a per-epic acceptance criterion, and 7 OI entries are already stale-resolved"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e514c82c-5e29-4914-af3f-2b963bbfa77f
  modified: 2026-07-29T14:07:22.875Z
---

**Trigger: about to work an `OI-N` from `docs/open_issues.md`, or asked to plan/prioritise the open-issues backlog.**

`docs/epics/open-issues-epics.md` (created 2026-07-29) consolidates every still-open `OI-N` into 8 speckit-ready epics. Run with `/epics-manager docs/epics/open-issues-epics.md N`. Do not re-derive a grouping from `open_issues.md` — read this file first.

## Three things that are easy to get wrong

1. **Epic numbers are lane-major, not priority-major.** Consecutive numbers belong to the *same* lane: 1→2→3→4 = Lane A (correctness: pattern acceptance, detectors, payments, handlers), 5→6→7 = Lane B (content: audio, lesson surface, QA/UX), 8 alone = Lane C (repo-wide lint/CSP/doc gates). Lanes A and B are designed to run **in parallel in separate worktrees**; order *within* a lane is load-bearing (1→2 shares the multi-column contract; 5→6 because a lesson translated-but-unvoiced is worse than silent). Epic 8 must run alone — its `eslint --fix` sweep touches the whole tree.

2. **Closing the `OI-N` entry is part of the work, not cleanup.** Every epic's `Acceptance criteria` requires updating `docs/open_issues.md` in the same change that ships the fix (resolved-with-date, or still-open with a dated `UPDATE` naming what remains — never resolve because *most* of it shipped). Epic 8's doc story is the **audit**, not the mechanism.

3. **`docs/open_issues.md` currently lies about 7 entries.** Verified against the tree 2026-07-29: **OI-1** (single-answer scoring — `ChallengeScreen`'s `usesAcceptedGate` shipped), **OI-15** (es bundle registered in `src/i18n/index.js`), **OI-12** (deep-reveal soft/hard timeout constants), **OI-24** (Settings upgrade CTA), **OI-77** (`infoProse` paragraph split), the *text* half of **OI-18/36/64** (all 15 lessons carry `text_es`), and most of **OI-19** are DONE while the entries still read open. The evidence table is in the epic file's "Already resolved" section. Check there before starting any OI.

## The epic file's measurements go stale within the hour

Written 2026-07-29; a **parallel session generated all 15 lessons' en+es audio while the file was being authored**, so Epic 5's headline fact ("12 of 15 lessons have no audio") was false before the file was saved — it now carries a SUPERSEDED banner and a re-measure command. Treat every `Non-obvious facts` count in that file as a point-in-time sample: **re-measure at the start of each `/epics-manager` run**, not at spec-writing time. Same class as [[feedback_concurrent_agents_clobber]] — this repo runs concurrent agents by default.

## Parallel-lane hazard

Worktrees isolate files, not the local Supabase DB, the c4solver, or the **120-req/min per-IP API limit** ([[project_api_rate_limit_breaks_bulk_scripts]]) — never run two bulk/generation passes at once. `/epics-manager` state files are per-epic so pipeline state won't collide, but both lanes write the epic file itself (via `epic_fix`), `staging_checks.md`, `specs/index.md`, and `docs/open_issues.md`; expect to hand-merge those four.

Related: [[reference_custom_commands]], [[feedback_open_issues_destination]], [[feedback_process_and_agent_preferences]], [[project_repo_worktree_setup]].
