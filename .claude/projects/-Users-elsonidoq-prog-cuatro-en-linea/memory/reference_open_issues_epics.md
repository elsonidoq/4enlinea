---
name: reference_open_issues_epics
description: "docs/epics/open-issues-epics.md is the spec-ready lane-ordered epic backlog for docs/open_issues.md — consecutive epic numbers = same lane, closing the OI entry is a per-epic acceptance criterion, launch blockers live in a separate file, and counting statuses first-line-only undercounts resolved"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e514c82c-5e29-4914-af3f-2b963bbfa77f
  modified: 2026-08-03T17:31:24.340Z
---

**Trigger: about to work an `OI-N` from `docs/open_issues.md`, or asked to plan/prioritise the open-issues backlog.**

`docs/epics/open-issues-epics.md` (created 2026-07-29) consolidates every still-open `OI-N` into speckit-ready epics — 8 at creation, **9 as of spec 056**. Run with `/epics-manager docs/epics/open-issues-epics.md N`. Do not re-derive a grouping from `open_issues.md` — read this file first.

**Launch blockers are in a DIFFERENT file.** `docs/epics/pre-launch-mvp-epic.md` (Epic 10 — MVP Launch Gate, Lane D, runs alone) holds the 16 `OI-N`s judged blocking for a public paid launch. It exists because Epics 1–9 predate several of them (OI-92, OI-104, OI-126, OI-130) — so "it's covered by an epic" is **not** the same as "it's covered before launch". The two files don't overlap and neither renumbers the other.

## Three things that are easy to get wrong

1. **Epic numbers are lane-major, not priority-major.** Consecutive numbers belong to the *same* lane: 1→2→3→4 = Lane A (correctness: pattern acceptance, detectors, payments, handlers), 5→6→7 = Lane B (content: audio, lesson surface, QA/UX), 8 alone = Lane C (repo-wide lint/CSP/doc gates). Lanes A and B are designed to run **in parallel in separate worktrees**; order *within* a lane is load-bearing (1→2 shares the multi-column contract; 5→6 because a lesson translated-but-unvoiced is worse than silent). Epic 8 must run alone — its `eslint --fix` sweep touches the whole tree.

2. **Closing the `OI-N` entry is part of the work, not cleanup.** Every epic's `Acceptance criteria` requires updating `docs/open_issues.md` in the same change that ships the fix (resolved-with-date, or still-open with a dated `UPDATE` naming what remains — never resolve because *most* of it shipped). Epic 8's doc story is the **audit**, not the mechanism.

3. **Counting or triaging by the FIRST `**Status**:` line per entry undercounts resolved.** An entry can carry a stale top status *and* a second, differently-formatted marker further down its body — `**Status: ✅ RESOLVED <date>**` (note the colon inside the bold) — recording the real fix. Measured 2026-08-03 across the whole file: first-line-only scanning read **78 resolved / 49 open**, while scanning each entry's full body read **82 / 45**. The four it misses are **OI-14, OI-17, OI-40, OI-53** — all fixed by spec 054, all still opening with "deferred". The file names this trap for OI-40 only, buried in its Epic-8 audit blockquote; it is general. **Scan whole entry bodies, and never trust a status line without reading to the next `## OI-` heading.** (The older "7 entries lie" list — OI-1/12/15/24/77 + the text half of 18/36/64 — was closed out by spec 055's audit on 2026-08-02.)

## The epic file's measurements go stale within the hour

Written 2026-07-29; a **parallel session generated all 15 lessons' en+es audio while the file was being authored**, so Epic 5's headline fact ("12 of 15 lessons have no audio") was false before the file was saved — it now carries a SUPERSEDED banner and a re-measure command. Treat every `Non-obvious facts` count in that file as a point-in-time sample: **re-measure at the start of each `/epics-manager` run**, not at spec-writing time. Same class as [[feedback_concurrent_agents_clobber]] — this repo runs concurrent agents by default.

## Parallel-lane hazard

Worktrees isolate files, not the local Supabase DB, the c4solver, or the **120-req/min per-IP API limit** ([[project_api_rate_limit_breaks_bulk_scripts]]) — never run two bulk/generation passes at once. `/epics-manager` state files are per-epic so pipeline state won't collide, but both lanes write the epic file itself (via `epic_fix`), `staging_checks.md`, `specs/index.md`, and `docs/open_issues.md`; expect to hand-merge those four.

Related: [[reference_custom_commands]], [[feedback_open_issues_destination]], [[feedback_process_and_agent_preferences]], [[project_repo_worktree_setup]].
