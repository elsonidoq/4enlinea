# Coordinator prompt — Papergames Live Game Integration

Use this prompt verbatim with a fresh agent. The agent will orchestrate implementation by spawning sequential sub-agents, one batch at a time.

---

## Your role

You are a coordinator agent. Your job is to orchestrate the implementation of the feature described in `docs/mvp/papergames_play_game_integration.md` by spawning a sequence of focused sub-agents, each responsible for a coherent group of tasks. You do NOT implement anything yourself — you read, partition, orchestrate, and track.

---

## Step 1 — Load context

Read the following before doing anything else:

1. `docs/mvp/papergames_play_game_integration.md` — the full plan: goals, architecture context, tasks T0–T7, implementation order, and files to touch. This is the primary artifact.
2. `docs/architecture/frontend-conventions.md` — conventions for React hooks and components
3. `docs/architecture/api-conventions.md` — conventions for Express endpoints
4. `docs/architecture/server-conventions.md` — conventions for server-side modules
5. `connect-four/src/lib/useGameBoard.js` — the existing hook being refactored in T0
6. `connect-four/src/screens/PlayOnlineScreen.jsx` — the PoC being upgraded in T1–T3, T6

---

## Step 2 — Propose a batch partition

Analyze tasks T0–T7 from the plan and group them into sequential implementation batches. Each batch must:
- Be implementable without depending on uncommitted work from a later batch
- Group tasks that touch the same primary files
- Contain enough work to justify a sub-agent cold-start (aim for 3–6 tasks per batch; pure setup that is immediately consumed by the next task belongs in the same batch as its consumer)

**Dependency constraints from the plan:**
- T1 requires T0 (useBoardState must exist before PlayOnlineScreen can import it)
- T2 and T3 both modify `PlayOnlineScreen.jsx` and require T1 (boardApiRef established)
- T6 requires T3 (`go`/`goBack` props) and T5 (endpoint must exist)
- T4 and T5 are server-side and independent of T1–T3

**Suggested partition to start from** (you may adjust if the dependency analysis warrants it):

- **Batch 1**: T0 + T1 — Extract `useBoardState` hook and wire it into `PlayOnlineScreen`
- **Batch 2**: T2 + T3 + T4 + T5 — Board component + layout + server importer + endpoint
- **Batch 3**: T6 + T7 — Post-game save flow + documentation

Present the partition to the user. For each batch, list which tasks it covers, what files it creates or modifies, and what it depends on from prior batches.

**Wait for the user to approve, modify, or reject the partition before proceeding.**

---

## Step 3 — Execute sequentially

Once approved, implement batches one at a time. For each batch:

1. **Spawn a sub-agent** using the Agent tool:
   - `model`: `"sonnet"`
   - `prompt`: a self-contained implementation brief (format below)

2. **Wait for the sub-agent to finish** before spawning the next one. Never run batches in parallel.

3. **After each sub-agent completes:**
   - Invoke the `handoff-prompt` skill using the Skill tool (`skill: "handoff-prompt"`). This skill runs tests, reads the plan, compares plan vs. reality, and produces a tight context summary. Use its output as the `[handoff from previous batch]` in the next sub-agent prompt.
   - If the skill is unavailable, use the sub-agent's own `## Handoff context` section instead.

---

## Sub-agent prompt format

Each sub-agent prompt must be fully self-contained. Use this structure:

```
## Context

You are implementing part of a feature for a Connect Four web app (Express + React).
The full plan is at `docs/mvp/papergames_play_game_integration.md` — read it in full before writing any code.

### Handoff from previous batch
[Paste the handoff-prompt skill output verbatim, or "This is the first batch — nothing has been built yet." for batch 1]

### Architecture rules to follow
Before writing any code, read:
- docs/architecture/frontend-conventions.md  [include if batch touches frontend]
- docs/architecture/api-conventions.md       [include if batch touches endpoints]
- docs/architecture/server-conventions.md    [include if batch touches server]

---

## Your task

Implement the following tasks from the plan at `docs/mvp/papergames_play_game_integration.md`:

### [T0 / T1 / etc.] — [title]
[Paste the full task section from the plan verbatim, including all code snippets and notes]

### [T_N] — [title]
[Paste verbatim]

---

## Key constraints for this batch

[Extract and paste the relevant subsections from the plan's Architecture Context that apply to
these tasks — e.g. the boardApiRef pattern for Batch 1, the savedRef pattern for Batch 3, etc.]

---

## Done when

- All tasks listed above are fully implemented
- `npm run test:fast` passes (run from inside `connect-four/`)  [include for Batch 1 and after server changes]
- No lint errors on touched files

---

## Handoff context (required)

At the very end of your response, output a section titled "## Handoff context". Include:
- Every file you created or modified, with a one-line description of what changed
- Key decisions or patterns you established that the next batch must follow
- Anything incomplete, deferred, or left as a stub
- Non-obvious constraints the next agent will hit if it doesn't know about them
```

---

## Batch-specific briefs

Use these as your starting templates, pasting the relevant task text from the plan:

### Batch 1 brief template

Tasks: T0, T1
Files: `connect-four/src/lib/useBoardState.js` (new), `connect-four/src/lib/useGameBoard.js` (refactor), `connect-four/src/screens/PlayOnlineScreen.jsx` (wire hook + boardApiRef)

Key constraints to paste into the brief:
- The full "New hook: `useBoardState`" section from the plan (signature, commitMove contract, no onGameEnd)
- The full "WebSocket closure safety — `boardApiRef` pattern" section
- The warning: "Run `npm run test:fast` after T0 to confirm sparring is unbroken before touching PlayOnlineScreen"

### Batch 2 brief template

Tasks: T2, T3, T4, T5
Files: `connect-four/src/screens/PlayOnlineScreen.jsx` (Board + layout), `connect-four/server/papergamesImporter.js` (saveLiveGame + extractAndSaveBlunders), `connect-four/server/index.js` (endpoint)

Key constraints to paste into the brief:
- The full "Replacing `playableFrames` with `heights`" section (landing y formula)
- The full "Board component" section (color convention)
- The full "Post-game save strategy" section (save-fast + fire-and-forget blunders)
- The game:action handler in T2 that uses `boardApiRef.current.commitMove`

### Batch 3 brief template

Tasks: T6, T7
Files: `connect-four/src/screens/PlayOnlineScreen.jsx` (saveAndReview + anonymous prompt), `docs/architecture/frontend-conventions.md`, `docs/architecture/api-conventions.md`

Key constraints to paste into the brief:
- The full "Single-save guard — `savedRef`" section
- The full "Anonymous user handling" section (showLoginPrompt)
- The game:finish handler rule (only fires saveAndReview when boardApiRef.current.gameOver is null)
- T7 doc content: what to add to each architecture doc (exact content is in the plan under T7)

---

## Step 4 — Summary

After all batches have run, output:

1. **What was built** — for each batch: files created/modified and which tasks they satisfy
2. **Open items** — anything a sub-agent flagged as incomplete, skipped, or stubbed
3. **Verification steps** — how to manually confirm the feature works end-to-end:
   - Navigate to `/play-online` in the dev app
   - Click "Play online", wait for a match, play a full game
   - Confirm the board uses the production Board component (green/gray discs, drop animation)
   - Confirm the layout matches the sparring screen (TopBar, opponent banner, Resign button)
   - Confirm that after the game ends, the app navigates to ReviewScreen and shows analysis
   - Confirm that an anonymous user sees the "Log in to save" prompt instead of ReviewScreen

---

## Step 5 — QA

After the summary, ask the user whether to proceed with a browser-driven QA pass. If yes, spawn a QA sub-agent with the following prompt:

```
## Context

You are a QA agent reviewing a newly implemented feature for a Connect Four web app.

### Feature
Play Online screen — live games against random opponents via papergames.io.
Full spec/plan: `docs/mvp/papergames_play_game_integration.md`

### What was just built
[Paste the ## What was built section from the Step 4 summary]

### Open items
[Paste the ## Open items section, or "None reported."]

### Authentication bypass
In dev mode, the AuthModal has a hidden "🛠 Dev: skip auth" button (dashed border, below the main buttons) that signs in anonymously. Use it when you hit an auth wall.

---

## Your task

1. Open the browser at http://localhost:5173 (or check package.json for the dev port).
2. Navigate to `/play-online`.
3. Exercise the full game flow: register as guest → match → play moves → game ends → review screen.
4. Also test: anonymous user (not logged in) sees "Log in to save" prompt after game ends.
5. Also test: the board uses the production Board component (drop animation, column hover).
6. Fix every bug you find. State root cause, apply fix, re-verify.

---

## Done when

- Full game flow works end-to-end
- Anonymous user prompt appears correctly
- Board visuals match the sparring screen
- No console errors from the new feature

---

## QA Report (required)

Output a section titled "## QA Report" at the end:

### Acceptance scenarios
| Scenario | Result |
|----------|--------|
[one row per scenario tested]

### Bugs found and fixed
- **Bug**: symptom
- **Root cause**: one sentence
- **Fix**: files changed
- **Verified**: yes/no

### Remaining issues
[None. or list with reasons.]
```
