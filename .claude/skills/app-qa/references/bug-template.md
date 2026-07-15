# findings file — structure & per-finding template

The findings file lives at the **repo root**, named per-run: `agentic_QA_<YYYY-MM-DD-HHMM>.md`
(the coordinator/monolithic driver stamps it once at run start). Group findings by app area. Each finding is one
entry using the template below. Keep entries self-contained: a later agent must be able to
(a) locate the code to fix and group similar findings into a user story, and (b) reproduce
it from the recorded input + evidence.

## File skeleton

```markdown
# Agentic QA — <date>

Run scope: <full sweep | area>
DB state: <preserved pre-populated | reset+reimported papergames 69e773d36bf9938bffc1509a>
Tier(s) exercised: <free | paid | free→paid journey>
Viewport(s): <desktop | mobile 390x844 | both>
Environment: local dev, Chrome (chrome-devtools MCP), API server log at <LOG_PATH>

## Summary
- Blockers: N   Major: N   Minor: N   Polish: N
- <one-line highlights>

## Findings

### Area: <Home | Past Games | Blunders / Deep Reveal | Lessons | Challenges | Import | Navigation | Tier journey>

#### [SEVERITY] <short title>
...(template below)...

## Run Metrics (proxies for token cost — drives next-session tuning)

| Area | Actions | Snapshots | Screenshots | Console/Net reads | ~Output lines | Biggest single output (~lines) | Findings |
|------|---------|-----------|-------------|-------------------|---------------|--------------------------------|----------|
| ...  | ...     | ...       | ...         | ...               | ...           | ...                            | ...      |

**Hotspots:** <2–3 priciest operations + one-line fix each>
**Next-session tuning:** <concrete cuts to try>
```

## Per-finding template

```markdown
#### [major] Back button ping-pongs between game and blunder, never reaches home

- **Severity:** major            (blocker | major | minor | polish)
- **Area:** Navigation
- **Suspected code location:** MistakeDetailScreen.jsx / store nav stack (go('review',{id}));
  see history handling in <component>. (Name the screen/component/endpoint you suspect.)
- **Repro steps:**
  1. Home → Past Games → open game <which>
  2. Click blunder move at Move 10/16
  3. Click the game link (top-right "Move 10 / 16 · Jun 17")
  4. Press browser Back
- **Input used:** game id / papergames id / movestring / tier=free / viewport WxH / which button
- **Observed:** Back toggles between game and blunder view; never returns to Past Games/Home.
- **Expected:** Back unwinds blunder → game → past games → home.
- **Evidence:**
  - Console: <relevant list_console_messages lines>
  - Network: <failing request: method, path, status, body from get_network_request>
  - Server log: <delta from $LOG_PATH: `tail -n +$START "$LOG_PATH"`, stack trace if any>
  - Screenshot: <path to saved .png (take_screenshot filePath=…), not inline>
```

## Severity guide

- **blocker** — crashes, data loss, a flow that cannot be completed, 500s on a core path.
- **major** — feature broken or wrong result, navigation traps, paywall not enforced or
  not liftable, deep-reveal fabrication.
- **minor** — visual glitch, awkward-but-usable flow, missing feedback, non-fatal console error.
- **polish** — spacing, copy, "doesn't look like a button", nice-to-have.

## Notes

- If a bug already listed in `new_TODOs.md`/`TODOs.md` still reproduces, log it here anyway
  (with fresh evidence) and note "tracked in new_TODOs.md".
- One finding per distinct defect — don't bundle. Similar defects across screens can share a
  suspected code location; that's the grouping signal for the fixer.
