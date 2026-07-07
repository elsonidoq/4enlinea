---
name: app-qa
description: Use when asked to QA the Connect Four app, do a full app walkthrough, find UI/UX/navigation/tier bugs, or exercise the app end-to-end in a real browser and log the findings. Drives the local dev app in Chrome and records every failure to agentic_QA.md.
user-invocable: true
argument-hint: "[area: home | past-games | blunders | deep-reveal | lessons | challenges | import | nav | tier-journey]  [--mobile]  (no arg = full end-to-end sweep)"
---

# App QA — end-to-end browser walkthrough

## Overview

Drive the running local app in a real Chrome browser **as a user would**, exercising
navigation back-and-forth, every call-to-action, the free→paid journey, and deep-reveal
quality. Record **every** failure — visual, behavioral, console error, server stack
trace, dead link, awkward flow — into `agentic_QA.md` at the repo root, with enough
structured detail that a later agent can locate the code to fix and group findings into
user stories.

**Core principle:** a QA run is worthless unless failures are captured with repro + evidence.
Observe, don't assume. Never claim "works" without having driven the flow and read the console.

## When to use

- User asks to "QA the app", "do a walkthrough", "find bugs", "test the whole thing".
- Before a release, after a big merge, or to validate a feature area.
- **Not** for: writing a fix (that's a follow-up), unit tests (use `npm run test:fast`),
  or verifying one specific code change (use the `verify` skill).

## Setup checklist (do these first, in order)

Create a todo per step.

1. **Read the mindset seeds.** Read `new_TODOs.md` and `TODOs.md` at repo root. These are
   the QA mindset — known bug classes, product gaps, and the *kinds* of problems to hunt.
   Use them as a seed, not a limit: verify whether each listed bug still reproduces, and
   look for adjacent problems.

2. **DB decision — ASK THE USER.** Before touching the DB, ask whether to **preserve** the
   pre-populated DB (browse existing games/blunders as-is) or **reset** to a clean slate.
   Do not decide unilaterally. Reset flow (only if the user says reset — see
   `references/environment.md` for exact commands):
   `./reset_local_supabase.sh && ./migrate.sh --env local` → create a user via first login
   → decide tier → import papergames id `69e773d36bf9938bffc1509a`.

3. **Start the app + own the server lifecycle.** Launch the **API server as its own background
   process redirected to a log FILE** (`$LOG_PATH`) and Vite separately — a background shell's
   buffer isn't readable by subagents, but a file is. Vite serves **http://localhost:5173**, API
   **:3001**. See `references/environment.md` for the exact launch, health-check, **relaunch**
   (kill port 3001 + truncate log), and the **delta log-read** pattern (offset before an action,
   `tail -n +$START` after — never re-`tail` the whole log). You own the server: relaunch it when
   a health probe fails or server code changed. Pass `$LOG_PATH` to every subagent.

4. **Open Chrome via the chrome-devtools MCP** (`new_page` → `navigate_page` to
   http://localhost:5173). Use `take_snapshot` to inspect the a11y tree, `click`/`fill` to
   interact, `take_screenshot` for visual bugs, `list_console_messages` and
   `list_network_requests` after each meaningful action. **Viewport:** if the run is `--mobile`
   (or the area is mobile-specific), set a small phone viewport first with
   `resize_page`/`emulate` (e.g. 390×844) so layout bugs that only appear on small screens are
   caught — see the mobile pass below.

5. **Log in with "🛠 Dev: skip auth".** ALWAYS authenticate via the dev button (labeled
   exactly `🛠 Dev: skip auth` in the AuthModal — magic-link email won't deliver in dev).
   It creates an **anonymous, free-tier** user with **no email**.

6. **Create `agentic_QA.md`** at repo root using the template in `references/bug-template.md`.

## Execution mode: monolithic vs coordinator

Choose based on scope. The token cost of QA is **tool output** (a11y snapshots, screenshots,
network dumps), not reasoning — so a full sweep in one context bloats fast and degrades by the
time it reaches deep-reveal grading.

- **Single area argument** (e.g. `/app-qa lessons`) → run **monolithically**: do the setup, drive
  that one area yourself, log findings. No dispatch overhead. Exception: a monolithic
  `/app-qa deep-reveal` inherits whatever model invoked the skill — deep-reveal grading wants
  **Opus**, so either run it from an Opus session or treat a non-Opus grade as explicitly
  best-effort and say so in the findings.
- **No-arg full sweep** → run as a **coordinator** that dispatches one **sequential** subagent per
  area, so each area's snapshots stay in the subagent's context and never reach yours. See
  `references/coordinator.md` for the dispatch architecture, the model-per-role table, and the
  per-area subagent prompt. Key rules: **sequential, not parallel** (one shared browser + one DB —
  parallel agents collide); subagents must be **foreground** (background subagents can't write
  files); keep **Opus for the deep-reveal grader**, Sonnet for area-drivers and coordination.

## What a full sweep covers

No-arg invocation = **full end-to-end sweep**, run in **coordinator mode** (above). With an area
argument, do that slice **monolithically** and note what you skipped. Walk each area as a real
user, going *back and forth* between screens:

- **Home / onboarding** — first-run experience, CTAs, logo→home.
- **Past games** — list, filters/chips, open a game, step through moves, mobile layout.
- **Blunders & deep reveal** — open blunders, run **deep reveal** (mandatory pass below),
  "start a game from here", "what should I have played", "mark as reviewed".
- **Lessons** — saga order/locking, coach speech, board behavior, slide transitions.
- **Challenges** — challenge sets, progress, board disc-drop animation & feedback.
- **Import** — set papergames id, import, free-tier limit vs paid.
- **Navigation** — back button correctness across chains (home→past-games→game→blunder→
  game-link and back should unwind cleanly, not ping-pong). Every call-to-action must be
  clickable/tappable; logged-out CTAs should route to register/login.

## Mandatory pass: free → paid tier journey

The tier transition is a **required dedicated pass**, not one checkbox. Test upgrading at
several points in the journey and re-check smoothness after each:

- As **free**: hit the paywalls/CTAs (import limit of 5 games, locked lessons, paid puzzle
  categories, deep-reveal quota). Confirm each blocked action shows a clear upgrade CTA.
- **Flip to paid mid-journey** (the anonymous user has no email, so `set-tier.js` won't
  find it — flip by DB update; snippet in `references/environment.md`), reload, and verify
  the just-blocked action now works and the transition feels smooth (no stale state, no
  need to re-login, counts update).
- Flip **back to free** and confirm limits re-apply. Log any rough edge as a finding.

## Mobile / small-viewport pass

The app is used on phones, and several known bugs are layout-only on small screens (e.g. the
past-games separator crowding the chip filters). Run at least a **mobile viewport pass**:

- Set a phone viewport with `resize_page` / `emulate` (e.g. **390×844**, and optionally a narrow
  360px width) **before** walking the flow.
- Re-check the layout-sensitive screens: past games (chips/separator), board sizing/zoom,
  blunder + deep-reveal split (the draggable split resizing the board), lessons slides,
  challenge board, nav/header, and every CTA's tap-target size.
- A `--mobile` invocation does the *whole* run in mobile viewport; a desktop run should still do
  a focused mobile sweep of the layout-sensitive screens. Log viewport (WxH) in each finding's
  input so a fixer can reproduce.

## Mandatory pass: deep-reveal quality (SAMPLE — do NOT grade them all)

Deep reveals are expensive to check, and checking many is **not** the point. Open a **small
sample — cap at 3** deep reveals (varied: e.g. an opening blunder, a mid-game fork, a losing
position) and evaluate each against **our own rubric below**. Do **not** try to cover every
blunder.

**Do NOT run any check that requires the feature vector** (vector-sufficiency, field-gap
attribution — that is `grade-fv-sufficiency`'s offline job, not this QA). Here you check the
**rendered** deep reveal against **board ground truth**, not against the vector.

Ground-truth oracles (use these to confirm the claim is TRUE, not to grade the vector):
- **`./visualize_board.sh <movestring>`** (repo root) — annotated board with every threat cell,
  parity, and per-column solver score.
- **`connect-four/server/scripts/reason_engine/TOOLS/`** — solver-backed tools. Primary:
  `node compute_feature_vector.mjs <movestring> <playedCol>` (all cols 0-indexed) dumps the true
  reason for the position. Others in that dir (`optimal_line.mjs`, `decisive_check.mjs`,
  `parity_cells.mjs`, `forward_projection.mjs`, …) take a movestring for deeper checks.

Flag as a finding any of:
- **Fabrication / unsound claim** — a board/threat/line claim that isn't true. Verify concrete
  claims with the oracles above before trusting or rejecting them.
- **Highlight integrity** — every cell, row, column, or region the text names **must be
  highlighted** on the board, and highlighted cells should correspond to what the text explains.
  A mentioned-but-not-highlighted (or highlighted-but-unexplained) cell/row/column is a finding.
- **Wrong perspective** — green/gray mixed up (user's disc color mislabeled). In
  `visualize_board.sh`: **`X`=player1=GREEN**, **`O`=player2=GRAY** (the in-app disc colors).
- **Tone / coach-voice** — every non-vector aspect from `grade-fv-sufficiency` (esp. the A5
  coach-voice axis): not defeatist in a losing/opening position (should be hold-the-line), clear,
  addressed to the right player. You may skim that skill for the tone criteria, but do **not**
  invoke it or load its vector machinery.
- **Community-* term leakage** — e.g. "community immediate threat" instead of "immediate threat".

Log each deep-reveal defect with the movestring/board as input and the oracle output as evidence.

## Recording a finding

Every bug, error, or misbehavior gets one entry in `agentic_QA.md`, grouped by app area,
using the structured template (see `references/bug-template.md`). Each entry MUST have:

- **Title** + **Severity** (`blocker` / `major` / `minor` / `polish`).
- **Area** and **Suspected code location** (screen/component/endpoint — so findings can be
  grouped into user stories and the fixer knows where to look).
- **Repro steps** and the **exact input used** (movestring, papergames id, tier, which
  button, which game).
- **Observed vs Expected**.
- **Evidence** — console messages (`list_console_messages`), failing network requests
  (`list_network_requests` / `get_network_request`), the **server stack trace delta-read from
  `$LOG_PATH`** (`tail -n +$START "$LOG_PATH"`, not the background shell), and — for visual bugs —
  a screenshot **saved to disk** (`take_screenshot filePath=<scratchpad>/…`) referenced by path,
  never ingested inline.

## Token discipline (best-effort, first-run)

The cost of QA is **tool output**, not reasoning. Follow these to avoid waste:

- **Screenshots are images — the most expensive call.** Take one **only for a confirmed visual
  bug** (layout, spacing, color, "doesn't look like a button"), one per bug, and **save it to disk**
  with `take_screenshot filePath=<scratchpad>/<slug>.png` (this writes the file instead of
  attaching the image to your context) — reference the path in the finding. NEVER screenshot to
  confirm a page loaded or a click worked — use the text a11y snapshot for that. This rule applies
  in **both** monolithic and coordinator modes.
- **Snapshot once per screen; reference it, don't re-ingest.** The snapshot you took is still in
  your context — for *reasoning* ("did the bug reproduce?", "what's here?") scroll back to it, don't
  call `take_snapshot` again. Re-snapshot **only** when you need fresh element uids to *interact*
  after the DOM changed (navigation, modal). uids are per-snapshot and go stale after navigation.
- **Verify single facts with `evaluate_script`, not a full re-snapshot.** To check one thing (did
  the game count update? is the upgrade button enabled now?) run a targeted
  `document.querySelector(...).textContent` — a few tokens — instead of re-snapshotting the whole
  a11y tree.
- **Do NOT build a snapshot cache.** Caching raw snapshots (to disk or across subagents) nets ~zero
  (a Read costs about as much as the `take_snapshot` it replaces) and risks acting on a stale tree
  in a live, stateful app. Minimize revisits by traversal order instead. Only revisit this if run-1
  metrics show subagents re-deriving the same static structure repeatedly.
- **Filter console/network reads with the actual params.** A bare `list_network_requests` returns
  *every* request since navigation (a React dev app floods with asset/HMR/XHR entries). Pass
  `resourceTypes: ['xhr','fetch']` and a small `pageSize` (e.g. 20); read `list_console_messages`
  only *after* an observed failure and extract the matched line. Never paste a full dump into a
  finding.
- **Delta-read server logs** only on misbehavior (see `references/environment.md`).
- **Subagents don't re-read the whole skill.** The coordinator's dispatch prompt carries the rules;
  each area subagent reads **only `references/bug-template.md`** — not SKILL.md or every reference.

## Run instrumentation (so the next session is cheaper)

Agents can't read their own token count, so record **proxies**. Each area (subagent or monolithic
run) appends one metrics record; the coordinator aggregates a "Run Metrics" section in
`agentic_QA.md`:

```
| Area | Actions | Snapshots | Screenshots | Console/Net reads | ~Output lines | Biggest single tool output (~lines) | Findings |
```

Count *events* but also record the **biggest single tool output** — one huge lessons-saga snapshot
and one tiny modal snapshot both count as "1 snapshot" but differ 20× in tokens, so magnitude, not
count, is what Hotspots should key on.

Then add:
- **Hotspots** — the 2–3 most expensive operations observed, with a one-line hypothesis to cut each
  next time (e.g. "past-games re-snapshotted 9× while stepping moves → snapshot once, click by
  cached uid").
- **Next-session tuning** — concrete changes to try (skip an area that yielded nothing, tighter
  screenshot budget, a helper for a repeated action).

This turns run 1 into its own baseline: a real bug list **plus** the data to optimize run 2.

## Inspire more checks

While walking the app, note new QA ideas or product gaps you discover that aren't yet
tracked. Append them to `new_TODOs.md` (or `TODOs.md` for broader product items) so the
backlog grows from what the sweep surfaced — but keep confirmed **bugs** in `agentic_QA.md`.

## Red flags — you're doing it wrong

- Marking something "works" without reading the console/network after the action.
- Skipping the DB question and resetting (or not) on your own.
- Logging a deep-reveal claim as fine without verifying it on the board.
- Logging into anything except the `🛠 Dev: skip auth` button.
- Vague findings with no suspected code location or no input — a later agent can't group or
  fix those.
