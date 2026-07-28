---
name: How to open Chrome with remote debugging
description: Launching Chrome with remote debugging on 9222, and what to do when the chrome-devtools MCP browser is already locked by another client
type: reference
originSessionId: 5616756b-cf08-4a73-b7f0-51dc61b75ec4
modified: 2026-07-28T13:16:21.233Z
---
Use the binary directly with a fresh user-data-dir — `open -a` and normal GUI launch do NOT bind the port reliably. Do NOT `pkill` existing Chrome; a distinct `--user-data-dir` launches a separate, isolated instance that coexists with the user's normal Chrome, so there's no need to kill their session.

**Command:**
```
nohup "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug2 > /tmp/chrome.log 2>&1 &
```

Then verify with:
```
curl http://localhost:9222/json/version
```

**Why:** On macOS (tested on Darwin 25.4 / Chrome 147–150), `open -a` and the Chrome GUI toggle for remote debugging both fail to bind port 9222. Only launching the binary directly with `--user-data-dir` pointing to a fresh directory works. The fresh dir also means a **separate profile/instance** — Chrome's "already running" conflict is per-profile, so pointing at a new dir lets the debug instance run alongside the user's existing Chrome without `pkill`.

## When the chrome-devtools MCP browser is locked (2026-07-28)

Every `mcp__chrome-devtools__*` call — including `list_pages` — can fail with:

```
The browser is already running for /Users/<you>/.cache/chrome-devtools-mcp/chrome-profile.
Use --isolated to run multiple browser instances.
```

That means **another concurrent client owns that browser** (the user runs agents in parallel — see
[[feedback_concurrent_agents_clobber]]). You cannot attach to it: it launches with
`--remote-debugging-pipe`, not a TCP port, so there is no `9222` to connect to and no
`DevToolsActivePort` file to read. Do **not** kill it — it may belong to a live sibling session.

**Workaround:** launch your own instance with the command above and drive it over raw CDP. Node 23
has a global `WebSocket`, so no puppeteer/playwright is needed (neither is installed in this repo):

```js
const t = (await (await fetch('http://localhost:9222/json/list')).json()).find(x => x.type === 'page');
const ws = new WebSocket(t.webSocketDebuggerUrl);  // then Page.enable / Page.navigate /
                                                   // Runtime.evaluate / Page.captureScreenshot
```

`Page.captureScreenshot` returns base64 → `fs.writeFileSync(p, Buffer.from(data, 'base64'))`, then
read the PNG back with the Read tool. `Runtime.evaluate` with `awaitPromise: true` covers seeding
IndexedDB/localStorage and clicking (`[...document.querySelectorAll('button')].find(…).click()`).

**A fresh profile lands on onboarding, not your target URL.** A brand-new `--user-data-dir` has no
IndexedDB, so `shouldAutoRouteToOnboarding` fires (`onboardingStatus == null` is treated as
`not_encountered`) and any deep link — e.g. `/concept/<lessonId>` — silently redirects to `/`. Seed
the `decodec4` DB (v2) *before* navigating: `profile.onboarding_status = 'complete'` (+ `tier` for
paid content), plus one `lesson_progress` row per lesson for the order lock (see
[[project_lesson_progress_unlock_is_pairwise]] — the check is pairwise, so seed **every**
predecessor, not just the target). Clean up afterwards with `pkill -f <your-user-data-dir>`.

**The `lesson_progress` row shape is `{ lessonId, status: 'complete' }`** — verified 2026-07-28 by
watching a deep link bounce to `/saga` with a plausible-looking but wrong record. `deriveLessonAccess`
/ `deriveLockReason` (`src/screens/sagaLock.js`) test `p.status === 'complete'` **only**; a
`{completed: true}` or `{conceptDone: true, …}` row satisfies nothing and silently redirects. Note
`deriveLessonAccess` short-circuits on the target's own row (`isDone` → `allowed`), so seeding just
the target is enough for a deep link — the pairwise predecessor rule matters for tapping through the
saga UI. Get real ids from `await (await fetch('/api/lessons')).json()`; don't guess them from
filenames (`lesson-05-opening-imitate.json` has id `opening-imitate`).
