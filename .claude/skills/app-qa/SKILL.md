---
name: app-qa
description: Use when asked to QA the Connect Four app, do a full app walkthrough, find UI/UX/navigation/tier bugs, or exercise the app end-to-end in a real browser and log the findings. Drives the local dev app in Chrome and records every failure to agentic_QA.md.
user-invocable: true
argument-hint: "[area: home | past-games | blunders | deep-reveal | lessons | challenges | import | nav | tier-journey]  [--feature <plan-or-spec-path>]  [--focus \"<free-text context on what to scrutinize>\"]  [--mobile]  (no arg = full end-to-end sweep)"
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
- User asks to QA / acceptance-test a **specific feature** end-to-end in the browser
  ("QA this feature", "verify the acceptance criteria", `--feature <plan/spec>`) — run
  **feature-verification mode** (below): drive the feature's acceptance flow to a pass/fail
  verdict, reusing this skill's browser/lifecycle/grounding/finding machinery, THEN sweep the
  touched screens for adjacent bugs.
- **Not** for: writing a fix (that's a follow-up), unit tests (use `npm run test:fast`),
  or verifying one small self-contained code change with no multi-screen flow (use the
  `verify` skill). Feature-verification mode is for a multi-screen browser flow whose
  acceptance criteria are written down in a plan/spec.

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

5. **Reach the required precondition state** (do NOT default to signed-in for a feature that
   starts elsewhere):
   - **Signed-in anonymous user** (the default for a general sweep) → click `🛠 Dev: skip auth`
     in the AuthModal (magic-link email won't deliver in dev). It creates an **authenticated,
     anonymous, free-tier** user with **no email** and a non-null `session`.
   - **Logged-out / first-run user** (`session === null`, IndexedDBStore) — required by
     onboarding and any logged-out-only flow → do NOT click Dev: skip auth; instead use Settings →
     **"Dev: clear IndexedDB & sign out"** to reach a genuine pre-auth state. `🛠 Dev: skip auth`
     produces an *authenticated* anonymous session and will silently bypass a logged-out-only path.
   - **Paid tier** → reach signed-in first, then flip tier by DB update (anonymous users have no
     email, so `set-tier.js` won't find them — see `references/environment.md`).

   In **feature-verification mode**, the precondition is whatever the feature's plan/spec says its
   flow starts from — honor that, not this step's default.

6. **Create the per-run findings file** at repo root: `agentic_QA_<YYYY-MM-DD-HHMM>.md`, using the
   template in `references/bug-template.md`. Derive the stamp **once** at run start
   (`date +%Y-%m-%d-%H%M`) and reuse that exact filename for the whole run — including every
   subagent (the coordinator passes it into each dispatch prompt), so a coordinator run stays in one
   file. Time (not just date) is in the name so two runs the same day never collide. Wherever this
   skill says "`agentic_QA.md`", it means **this run's stamped file**.

## Feature-verification mode (`--feature <plan-or-spec-path>`)

Use when the goal is to acceptance-test **one specific feature's** end-to-end browser flow, not to
hunt broadly. This mode reuses everything else in this skill unchanged — server lifecycle, the
chrome-devtools conventions + token discipline, the deep-reveal **grounding oracles + rubric**, the
finding template, and `project_app_qa_setup_gotchas` — and only changes what you're driving toward.

The difference from a sweep is the **verdict shape**: a sweep answers "what's broken?"; feature mode
answers "**do these acceptance criteria pass?**" — then also asks "what else did I break nearby?".

1. **Read the acceptance criteria from the plan/spec.** Open the `--feature` path and extract its
   QA / acceptance-criteria / "definition of done" section (e.g. a plan's `## QA` or a Task named
   "browser QA"). Turn each criterion into an explicit checklist item. These are your pass/fail
   gates — do not invent your own instead of the written ones.
2. **Honor the feature's precondition state** (setup step 5) — the flow's starting user/auth/tier
   state is whatever the plan says, NOT the default signed-in anon. A logged-out-only feature must
   be driven from `session === null`; using `Dev: skip auth` would silently skip the very path
   under test.
3. **Drive each criterion and mark it `✅ pass` / `❌ fail`** in `agentic_QA.md`, with the same
   evidence discipline as any finding (network/console/DB/log delta, oracle output for deep-reveal
   grounding, screenshot-to-disk only for a visual defect). A criterion you cannot exercise is
   `⚠️ blocked` with the reason — never silently drop it.
4. **Verify server-side effects, not just the UI.** If the feature writes/reads data (rows,
   columns, re-association, quota), confirm it in the DB (`references/environment.md` connection
   recipe), because the QA browser can mis-render state (see `project_app_qa_setup_gotchas`).
5. **Then sweep the touched screens for adjacent bugs** — every screen the flow crosses gets the
   normal bug-hunt + a mobile-viewport glance. Feature acceptance and adjacent-bug findings both
   land in `agentic_QA.md` (tag which is which).
6. **End with a one-line verdict**: `Feature <name>: N/M criteria pass` + the list of any ❌/⚠️.

Scope note: run feature mode **monolithically** unless the feature genuinely spans many independent
areas; the acceptance flow is usually one linear journey and splitting it across subagents loses the
cross-screen state (a mid-flow sign-up, a migrated row) the criteria depend on.

## Focus mode (`--focus "<text>"`)

Use when the user hands you **free-form prose** describing what to scrutinize — typically written by
an agent that read a set of specs/epics and summarized *what has been built and what to check* (e.g.
`polish_epic.md` plus recent design specs). Unlike `--feature` (which reads criteria from one file),
`--focus` takes the context inline and composes with `area`, `--feature`, and `--mobile`.

**Semantics — full sweep + deep focus.** `--focus` does **not** narrow coverage. Still run the
**whole app end-to-end** (coordinator mode by default), but spend extra depth on the focused areas:

1. **Parse the focus text into (a) emphasis on existing areas** it maps to (home, past-games,
   blunders, deep-reveal, lessons, challenges, import, nav, tier-journey), **and (b) derived
   focus-areas not in the fixed area list** (e.g. "dev board injector", "spanish audio i18n",
   "onboarding mission screen"). Dispatch the derived focus-areas as **extra subagent passes** so the
   prose can name anything and have it actually get driven.
2. **Focused + derived areas get acceptance-criteria treatment** — apply the feature-verification
   mechanics above: turn the focus claims into explicit ✅ pass / ❌ fail / ⚠️ blocked checklist
   items driven to a verdict, with the same evidence discipline (verify server-side effects in the
   DB, not just the UI). Unfocused areas get the normal bug-hunt.
3. **Thread the full `--focus` text verbatim into every subagent prompt**, each tagged with a
   one-line "why this area is in focus" (or "not in focus — regression pass only"), so the context
   reaches the agents that actually drive the browser.
4. **Tag every finding `focus` vs `adjacent`** (as feature mode does).
5. **End with a focus summary** written into the run file (not just chat):
   `Focus: N/M checklist items pass` + the list of any ❌/⚠️.

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

Every bug, error, or misbehavior gets one entry in **this run's findings file** (the stamped
`agentic_QA_<YYYY-MM-DD-HHMM>.md` from setup step 6), using the structured template (see
`references/bug-template.md`).

**Persist immediately — nothing is lost.** Append each finding to the file **the moment it's
confirmed** (append-on-discovery, not buffered to the end of the run), and **the agent that finds it
writes it** — a subagent appends its own findings and focus checklist verdicts to the run file
**before returning**, rather than returning them for the coordinator to write. Subagents run
sequentially (one writer at a time), so direct append is safe; if a subagent or the whole run dies
mid-way, everything found so far is already on disk. Appended findings may land chronologically
rather than grouped by area — the optional final synthesis pass regroups them; do not delay writing
to keep the file tidy.

Each entry MUST have:

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
