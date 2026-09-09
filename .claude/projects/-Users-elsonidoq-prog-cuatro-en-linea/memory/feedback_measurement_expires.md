---
name: feedback_measurement_expires
description: "A verification taken mid-epic expires — re-measure against the FINAL code before trusting any \"already checked, nothing to do\" conclusion"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 09ab1bbf-3752-44fc-9a64-d05aa25d0cce
  modified: 2026-08-02T17:17:17.557Z
---

[[feedback_verify_at_the_source_layer]] says verify at the right *layer*. This is the **time** axis
of the same failure: a check that was honest when it ran can be false by the end of the change.

Spec 052 produced three of these in one epic, all of the form "we already verified this, it's fine":

- **FR-006's pool count** was measured after US1 but before US2 widened the detector. Its "42 rows,
  all identical, no repair needed" was true when taken and wrong at merge — 18 rows had drifted.
  Re-running it at the end is what found the deploy blocker (OI-92).
- **FR-017's premise** — "a genuine draw keeps its `drawing_move` tag" — described a case that never
  existed; `tagBlunder` only ever emitted that tag for a forfeited win.
- **FR-019's acceptance scenario** described a position later *proven* unreachable.

**Why:** these claims assert something about code or data while doing the least checking, so they
attract the least scrutiny — and unlike a stale line number, nothing about them looks stale.

## A backlog epic's own "Non-obvious facts" expire too

Epic 8 opened its `/epics-manager` run with three headline facts, and **two were already false**: OI-58
("five CSP fixes exist only on `stagging`") had been ported to `main` out-of-band by the owner
themselves — the `helmet(...)` block is byte-identical between the branches and commit `ae3c006` is
reachable from `main` — and OI-70's "254 errors" had drifted to 282. Both were caught only because the
review agent re-ran the measurement instead of reading the epic. An epic's `Non-obvious facts` and
`docs/open_issues.md` entries are **dated snapshots written by an earlier session**, not current state;
the owner fixing something himself between sessions is the normal case, not the exception. Re-measure
every load-bearing number and status claim at the *start* of an epic run — the epic file's own preamble
says so, but that warning lives in a section a spec agent reading only its own epic never sees.

## The sharpest form: an unchanged line does NOT mean an unfixed bug

Spec 053 reasoned "`App.jsx:113` still reads `const goBack = useCallback(() => { window.history.back(); }, [])`,
so the `/mistakes ↔ /stats` cold-load back loop remains plausibly live." Both halves were true and the
conclusion was false: the loop was **never** in `goBack`. It lived in the screen's back handler and was
fixed 2026-07-16 by `f4de927`, in `src/screens/categoryListBack.js` — a file the QA finding never named.
The inference survived a spec, a plan, and a quickstart, and the prescribed "fix" (a `history.length`
guard in the global `goBack`) would have **regressed** in-session Back navigation that already worked.

**Why:** "the code I'd expect to change didn't change" only rules out a fix *at that location*. A fix
that landed anywhere else leaves your chosen line pristine, so the evidence looks like confirmation
while proving nothing. It is the negative-claim trap ([[feedback_verify_at_the_source_layer]]) with a
timestamp on it.

**How to apply:** before assigning any "still broken / fix-here" disposition to a previously-reported
bug, run both `git log --oneline --grep "<finding keyword>"` and `git log --oneline -- <the-file-that-actually-owns-the-behavior>`.
Find the owning symbol first — the reporter's cited file is frequently not it. Two commands, and they
are what caught this.

**How to apply:** when a task says "confirm X, then act on the result", re-run the confirmation
against the **final** state of the branch, not the state it had when the task was written. Treat any
inherited "already satisfied / no task needed" from an earlier batch or a spec as a hypothesis to
re-test, not a fact — sub-agent handoffs are especially prone to laundering one into the other
([[feedback_isolated_review_misses_seams]]). Record explicitly when an environment was unreachable
rather than assuming its result matches another's.

**A stored artifact is not a baseline for live code.** 2026-08-11: a render change was nearly reported
as a regression ("non-opening aliases 8.9 -> 8.0") because the 8.9 came from `render_decision` blocks
**embedded in an answers file generated days earlier by older code**, while the 8.0 was computed live.
Re-running the identical probe against the pre-change commit in a throwaway `git worktree` gave
7.97 -> 7.97: no change at all. If a number came out of a file some earlier run wrote, it measures
THAT run's code — compare live-to-live at two commits, or you are diffing two variables at once.

## A recorded *blocker* expires too — and "owner-confirmed" is not evidence

2026-09-07: three documents stated `VITE_PADDLE_CLIENT_TOKEN` is unset locally and therefore
"Paddle does not work locally (**owner-confirmed**)" — `docs/open_issues.md` (OI-96 area),
`specs/057-mvp-launch-gate/spec.md:99`, `docs/epics/pre-launch-mvp-epic.md:180`. Every downstream
artifact inherited it, and the entire paid journey went unQA'd for seven weeks.

The observation was accurate; the **conclusion was a category error**. An active sandbox client
token had existed since 2026-07-18, minted for exactly this and named for it — the `.env` line was
simply never persisted. A one-line fix, restated as a property of the environment. Worse, the
project's own memory recorded driving Paddle's checkout fields locally *on that same day*, so it
had demonstrably worked and the config was then lost.

**Why:** a *symptom* ("clicking Become Pro does nothing") gets written down as a *constraint*
("Paddle can't be tested locally"), and the owner-confirmation attaches to the symptom while
appearing to certify the constraint. Nobody re-tests a blocker — a closed door is not something you
push on again — so the premise compounds across every spec that reads it. This is the negative-claim
trap with an authority stamp on it.

**How to apply:** before letting any recorded blocker shape scope, ask *what exactly would have to
be true for this to be false, and can I test that in one command?* Missing credentials, missing env
vars, and "not supported locally" claims are the highest-yield candidates — they are usually one
lookup away from being retired, and the provider's own API will often tell you (here,
`client.clientTokens.list` answered it in one call). Treat "owner-confirmed" as dating the
observation, never as certifying the inference drawn from it.
