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
