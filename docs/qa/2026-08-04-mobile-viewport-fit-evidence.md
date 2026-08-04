# Plan B — mobile viewport fit: measured evidence

## Harness

Start the app first (from repo root):

```bash
eval "$(./worktree-ports.sh)"     # exports $API_PORT / $VITE_PORT — never hardcode
cd connect-four && npm run dev
```

Then, per screen, `mcp__chrome-devtools__emulate` to the target viewport and run this via
`mcp__chrome-devtools__evaluate_script`:

```js
async () => {
  await new Promise(r => setTimeout(r, 3000)); // app-qa: the board fills in ~2s;
                                               // a faster read reports an EMPTY board
  const de = document.documentElement;
  const root = document.getElementById('root');
  const appWrap = root.firstElementChild;
  const screenRoot = appWrap.lastElementChild;

  // naturalContentH: true content height with the viewport floor removed
  const prev = [root.style.minHeight, appWrap.style.minHeight, screenRoot.style.minHeight];
  root.style.minHeight = appWrap.style.minHeight = screenRoot.style.minHeight = '0';
  const naturalContentH = Math.round(screenRoot.getBoundingClientRect().height);
  [root.style.minHeight, appWrap.style.minHeight, screenRoot.style.minHeight] = prev;

  const controls = [...document.querySelectorAll('button')].map(b => ({
    label: (b.innerText || b.getAttribute('aria-label') || '').trim().slice(0, 24),
    bottom: Math.round(b.getBoundingClientRect().bottom),
    belowFold: b.getBoundingClientRect().bottom > window.innerHeight + 1,
  }));

  return {
    path: location.pathname,
    innerH: window.innerHeight,
    contentH: de.scrollHeight,
    naturalContentH,
    P1_hOverflow: de.scrollWidth - de.clientWidth,           // must be 0
    P2_deadScroll: de.scrollHeight - Math.max(naturalContentH, window.innerHeight), // must be <= 1
    P4_screenRootH: Math.round(screenRoot.getBoundingClientRect().height),
    screenRootCss: {
      height: getComputedStyle(screenRoot).height,
      minHeight: getComputedStyle(screenRoot).minHeight,
    },
    controlsBelowFold: controls.filter(c => c.belowFold),
    kids: [...screenRoot.children].map(el => ({
      h: Math.round(el.getBoundingClientRect().height),
      t: (el.innerText || '').slice(0, 30).replace(/\n/g, '|'),
    })),
  };
}
```

**P3 (reachability) is judged by hand** from `controlsBelowFold`: a control listed there is a PASS
only if scrolling its nearest scrollable ancestor brings it into view. A control below the fold inside
an `overflow: hidden` ancestor is a FAIL.

## Before (2026-08-04, 390×664)

All numbers below were read out of a real Chrome at emulated `390x664x3,mobile,touch` against this
worktree's dev server. `naturalContentH` was measured by temporarily zeroing `minHeight` on `#root`,
the `App.jsx` wrapper, and the screen root, then reading `getBoundingClientRect().height` — i.e. it is
the screen's true content height with the `100vh` floor removed.

| Screen | URL used | naturalContentH | Overflow @664 | Shape |
|---|---|---:|---:|---|
| PlayOnline | `/play-online` | **128** | 0 | short |
| Stats | `/stats` | **526** | 0 | short |
| GameScreen | `/game?devBoard=3233333556&devSide=first&devDifficulty=easy` | **581** | 0 | board + bottom Toolbar |
| Socratic | `/socratic/immediate-threat` | **584** | 0 | board + bottom Toolbar |
| Settings (unauth) | `/settings` | **605** | 0 | short |
| Challenge | `/challenge/claimeven?devBoard=3233333556` | **674** (incl. 40px DEV panel ⇒ ~634 in prod) | 9 | board + bottom Toolbar |
| Home | `/` | **706** | 41 | one-screen, spills |
| Difficulty | `/difficulty` | **736** | 71 | one-screen, spills |
| **Review** | `/game/<uuid>` | **819** | **155** | **defect 2** |
| Pricing | `/pricing` | **820** | 155 | one-screen, spills |
| Saga | `/saga` | **1156** | 492 | legitimately long |
| SetPicker | `/setpicker` | **1327** | 662 | legitimately long |
| MistakesList *(already `dvh`)* | `/mistakes` | **734** | 70 | legitimately long |
| PastGamesList *(already `dvh`)* | `/pastGames` | **2239** | 1574 | legitimately long |

**Horizontal overflow was `0` on every screen measured.** Defect 1 and 2 are both vertical. The
plan's pass condition still asserts `hOverflow === 0` as a regression guard, not as a fix target.

## After Task 2 (App.jsx)

`connect-four/src/App.jsx`'s two root wrappers (the `!sessionChecked` boot frame and the
per-screen `<div>` wrapping every `ScreenComponent`) were changed from `minHeight: '100vh'` to
`minHeight: '100dvh'`.

**Important caveat, repeated from the task brief:** Chrome DevTools emulation has no browser
chrome, so under emulation `100vh === 100dvh === 100svh` (verified: both resolve to the same
pixel value at a 664px-tall emulated viewport). The sweep below therefore proves *nothing
regressed* from the wrapper edit — it does **not** and cannot prove the `dvh` fix itself works
(that a real mobile browser's retracting chrome no longer inflates the floor). The proof that the
unit landed is the static source-scan guard (`tests/unit/viewportUnits.test.js`) flipping from
failing to passing for `App.jsx`.

### Sweep — 390×664×3, mobile, touch (measured against this worktree's dev server)

All ten paths were navigated in order and the harness snippet run against each. Every path's
`naturalContentH` matched the baseline exactly (or within ±1px of measurement-timing rounding, well
inside the ±2px tolerance), and `P1_hOverflow` was `0` on all ten.

| Path | Baseline naturalContentH | After Task 2 naturalContentH | P1_hOverflow | Notes |
|---|---:|---:|---:|---|
| `/` | 706 | 706 | 0 | matches |
| `/stats` | 526 | 526 | 0 | matches |
| `/mistakes` | 734 | 734 | 0 | matches |
| `/saga` | 1156 | 1156 | 0 | matches |
| `/setpicker` | 1327 | 1327 | 0 | matches |
| `/difficulty` | 736 | 736 | 0 | matches |
| `/settings` | 605 | 605 | 0 | matches |
| `/pricing` | 820 | 820 | 0 | matches |
| `/pastGames` | 2239 | 2239 | 0 | matches |
| `/play-online` | 128 | 128 | 0 | matches |

All ten screens: **unchanged geometry, zero horizontal overflow** — the wrapper edit did not
regress any screen.

### Static guard: `tests/unit/viewportUnits.test.js`

- Before Task 2: 16 failing file-assertions (per Task 1's end state).
- After Task 2: **15** failing file-assertions — `App.jsx uses no 100vh` now passes; every other
  screen file's assertion is unchanged (still failing, to be converted in later tasks).

### `npm run test:fast` (from `connect-four/`)

```
ℹ tests 1764
ℹ pass 1749
ℹ fail 15
```

eslint ran first with no errors (tests executed, confirming the run wasn't short-circuited).
`fail` dropped by exactly 1 relative to Task 1's end state, as expected.

### Deviation from the brief worth flagging

The brief's Step 2 "After" comment block, transcribed verbatim, contains the literal substring
`100vh` inside a prose comment ("a 100vh floor made even a 128px screen..."). The static guard
(`viewportUnits.test.js`) does a raw `line.includes('100vh')` scan with no comment-awareness, so
transcribing that comment verbatim kept `App.jsx uses no 100vh` failing. The comment was reworded
to preserve its meaning without the literal token (now: "the old fixed-viewport unit made even a
128px screen (PlayOnline) scroll ~180px of empty background."). This is a wording change only —
the code semantics (`minHeight: '100dvh'` at both sites) match the brief exactly.
