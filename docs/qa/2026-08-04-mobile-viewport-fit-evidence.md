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

## After Task 3 (ReviewScreen)

### Edits (`connect-four/src/screens/ReviewScreen.jsx`)

**Site A — pin the root, open a scroller** (was `return (` at ~line 298):

Before:
```jsx
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={t('review.title')} onBack={goBack} onLogoClick={() => go('home')} />

      <CoachDialog fixed messages={coachMessages} />

      {/* Board area */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 12px',
        }}
      >
```

After:
```jsx
  return (
    // height (not minHeight) + minHeight:0 on the scroller — same shape as
    // ConceptScreen.jsx. The root is pinned to the viewport so the content
    // scrolls INTERNALLY and nothing sits below the fold. Measured 2026-08-04
    // at 390x664: content was 819px against a 664px viewport, so the Move
    // Timeline and the Prev/Next mistake row were entirely off screen.
    // minHeight would let the root grow past the viewport again; a bare pin
    // without the scroller below would CLIP those 155px instead of hiding
    // them, which is worse.
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <TopBar title={t('review.title')} onBack={goBack} onLogoClick={() => go('home')} />

      <CoachDialog fixed messages={coachMessages} />

      {/* Everything below the coach scrolls internally. flexShrink on the board
          wrapper is deliberately left default so the board gives way before the
          accuracy card and the navigation row do. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      {/* Board area */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 12px',
        }}
      >
```

**Site B — close the scroller before the onboarding button** (was `{onboarding && (` at ~line 512):

Before:
```jsx
        </div>
      )}

      {onboarding && (
        <div style={{ padding: '16px', marginTop: 'auto' }}>
```

After:
```jsx
        </div>
      )}
      </div>

      {onboarding && (
        <div style={{ padding: '16px', flexShrink: 0 }}>
```

Transcribed verbatim from the brief — no deviations needed (the brief's comment text already avoids
the literal `100vh`/old-unit substring the static guard scans for).

### Reproduction path used (Step 1)

`http://localhost:$VITE_PORT/game?devBoard=3333302444422222060315555054&devSide=first&devDifficulty=easy`
→ wait ~3s for the board (Move 28) → click **Resign** → lands on `/game/<uuid>`
(`2bfeedb7-2e17-43f6-a077-258f122e53bf` in this run). Confirms the brief's harvested route.

### Non-onboarding variant — four-size sweep (`/game/2bfeedb7-...`)

| Viewport | innerH | P1_hOverflow | P2_deadScroll | P4_screenRootH (pin holds?) | stillBelowFold |
|---|---:|---:|---:|---|---|
| 390×664×3 | 664 | 0 | 0 | 664 (yes) | `[]` (scroller reaches 155px of content, matching the pre-fix clip amount) |
| 390×844×3 | 844 | 0 | 0 | 844 (yes) | `[]` (no scroller needed — content fits) |
| 375×553×3 | 553 | 0 | 0 | 553 (yes) | `[]` |
| 360×600×3 | 600 | 0 | 0 | 600 (yes) | `[]` |

Screenshots: `qa-evidence/review-390x664-after.png`, `review-390x844-after.png`,
`review-375x553-after.png`, `review-360x600-after.png`.

### Onboarding variant — the second height (Step 5)

`App.jsx`'s DEV-gated `/game?devBoard=` branch reads only `devBoard`/`devSide`/`devDifficulty` into
`resolvedParams` (`difficulty`, `side`, `initialMoves`) — confirmed by reading the mount effect;
`onboarding=true` on that URL is silently dropped. Used the real route instead: Settings → **Replay
intro** → OnboardingMissionScreen → **Start sparring** → play one move (column 4) → **Resign** →
landed on `/game/94eea81a-10a9-49f8-ab63-682d29f53b1a` with the **Continue** button rendered
(onboarding variant confirmed reachable). (Resigning at move 0 produced `/game/null` — no move had
been recorded yet — so one real move was played first.)

| Viewport | innerH | P1_hOverflow | P2_deadScroll | P4_screenRootH | Continue button bottom |
|---|---:|---:|---:|---|---:|
| 390×664×3 | 664 | 0 | 0 | 664 | 648 (≤ 665) |
| 390×844×3 | 844 | 0 | 0 | 844 | 828 (≤ 845) |
| 375×553×3 | 553 | 0 | 0 | 553 | 537 (≤ 554) |
| 360×600×3 | 600 | 0 | 0 | 600 | 584 (≤ 601) |

Continue button never scrolled to reach — pinned outside the scroller, as designed. Screenshot:
`qa-evidence/review-onboarding-390x664-after.png`.

### Step 5a — Plan A's extra coach message (lane overlap L2)

Verified via the brief's DOM-clone snippet on the onboarding review page (`/game/94eea81a-...`) at
390×664, without touching Plan A's file:

```json
{"before":{"outerH":140,"scrollH":103,"clientH":103,"docH":664},
 "after":{"outerH":140,"scrollH":219,"clientH":120,"docH":664}}
```

`after.outerH === before.outerH === 140` and `after.docH === before.docH === 664` — the extra
cloned coach line scrolled inside its 120px cap (`scrollH 219 > clientH 120`) without growing the
coach block or the screen. The `fixed` reservation holds on this screen.

Re-ran the four-size sweep with the clone still appended (the tallest state this screen will ever
reach — onboarding button + extra coach line):

| Viewport | innerH | P1_hOverflow | P2_deadScroll | P4_screenRootH | Continue button bottom |
|---|---:|---:|---:|---|---:|
| 390×664×3 | 664 | 0 | 0 | 664 | 648 |
| 390×844×3 | 844 | 0 | 0 | 844 | 828 |
| 375×553×3 | 553 | 0 | 0 | 553 | 537 |
| 360×600×3 | 600 | 0 | 0 | 600 | 584 |

All four hold identically to the non-cloned onboarding sweep — the clone changed nothing outside
the coach's own scroll region.

### Step 6 — both locales (390×664, `/game/2bfeedb7-...`)

| Locale | clipped (120px coach cap) | hOverflow |
|---|---:|---:|
| EN | 0 | 0 |
| ES | 0 | 0 |

Matches the brief's harvested pre-fix baseline (`clipped: 0` both locales — this is a copy-length
non-issue, not a layout regression) and confirms `hOverflow: 0` post-fix in both, as expected.

### Static guard: `tests/unit/viewportUnits.test.js`

- Before Task 3: 15 failing file-assertions (Task 2's end state).
- After Task 3: **14** failing file-assertions — `ReviewScreen.jsx uses no 100vh` now passes; no
  other screen file's assertion changed.

### `npm run test:fast` (from `connect-four/`)

```
ℹ tests 1764
ℹ pass 1750
ℹ fail 14
```

eslint ran first with no errors. `fail` dropped by exactly 1 relative to Task 2's end state, as
expected — no other test regressed.

### What could NOT be verified

Nothing. Both the non-onboarding and onboarding variants were reached and measured at all four
sizes, Step 5a's coach-clone claim was verified (not assumed), and both locales were checked. The
only deviation from the brief's Step 5 primary route (the `onboarding=true` query param) was
anticipated by the brief itself and the documented fallback route worked on the first attempt.

## After Task 4 (board screens)

Four screens with a bottom `<Toolbar>`: `GameScreen.jsx`, `SocraticScreen.jsx` (main return only —
sites 8/9/10 loading/error/no-board branches are Task 5's), `ChallengeScreen.jsx` (main return
only — sites 11/12 lesson-empty/loading are Task 5's), `PostSetSummaryScreen.jsx` (characterized,
downgraded to unit-only — see below).

**Caveat repeated from Task 2/3:** Chrome DevTools emulation has no browser chrome, so
`100vh === 100dvh === 100svh` under emulation. The sweeps below prove the **pinning and
shrink-to-fit behavior** (roots holding at `innerH`, board areas shrinking, Toolbars staying
reachable) — they do not and cannot prove the unit swap itself; that is the static guard's job.

### Edits

**GameScreen.jsx** — Step 1 (root pin) and Step 2 (`minHeight: 0` on the board wrapper),
transcribed verbatim from the brief. No deviations.

**SocraticScreen.jsx** — Step 4 (root pin, main return only — confirmed the other three
`minHeight: '100vh'` occurrences, lines 197/208/220, are untouched) and Step 5 (`minHeight: 0` on
the existing scroller). Transcribed verbatim.

**ChallengeScreen.jsx** — Step 7's root pin transcribed verbatim (confirmed lines 747/762
untouched). The spacer edit **required more than the brief's literal transcription** — see
deviation below.

**PostSetSummaryScreen.jsx** — Step 9: unit-only swap (`minHeight: '100vh'` →
`minHeight: '100dvh'`), no pinning. Decision and evidence below.

### Deviation from the brief: ChallengeScreen's spacer fix, expanded per the brief's own warning

The brief's Step 7 "After" for the spacer (`<div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }} />`)
was applied first and measured at 360×600 as instructed. Confirmed the predicted failure exactly:

```json
{"controlsBelowFold":[{"label":"Hint","bottom":632,"belowFold":true}, ...three mute buttons...],
 "kids":[40,52,21,140,297,0,82]}
```

The spacer collapsed to `0` height (as designed) but the Hint button was still below the fold,
because the spacer is a flex **sibling** of the board — collapsing it to zero does nothing to an
over-tall board that precedes it. Per the brief's explicit instruction ("Do that wrapping in this
task; do not defer it"), wrapped the board + Tier-1 evaluation-strip region in a
`flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column'` scroller, kept
a plain `flex: 1` spacer *inside* it (to still push the Toolbar down when content is short), and
removed the now-redundant standalone spacer. Re-measured at 360×600: `controlsBelowFold` empty,
board area 249px (visibly shrunk). Comment text avoids the literal `100vh` token per the guard
constraint.

Before (post brief's literal Step 7):
```jsx
          {/* Spacer that also absorbs overflow: with the root pinned to 100dvh
              this is the only flexible child, so it must be able to shrink
              (minHeight: 0) and scroll rather than clip on a short viewport. */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }} />
        </>
      )}
```

After (final):
```jsx
        <>
          {/* Scrollable region: with the root pinned to 100dvh, the board + the
              Tier-1 evaluation strip are the only flexible content, so THEY (not
              just the trailing spacer) must live inside the scroller — the spacer
              is a sibling of the board, not its parent, and cannot rescue an
              over-tall board on its own. flex:1 + minHeight:0 lets this region
              shrink and scroll instead of clipping the board on a short viewport. */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Board — original layout when reveal is closed */}
          {board && ( ... )}
          {/* Tier-1 evaluation strip — shown after move is evaluated */}
          {phase === 'post-move' && evaluation && ( ... )}
          {/* Spacer: pushes the Toolbar to the bottom of the scroller when
              content is short. When content is tall, the scroller above
              absorbs the overflow instead. */}
          <div style={{ flex: 1 }} />
          </div>
        </>
      )}
```

### GameScreen — sweep (`/game?devBoard=3233333556&devSide=first&devDifficulty=easy`)

| Viewport | innerH | P1_hOverflow | P4_screenRootH | controlsBelowFold | board area `h` (kids[2]) |
|---|---:|---:|---|---|---:|
| 390×844×3 | 844 | 0 | 844 (pinned) | `[]` | 579 |
| 390×664×3 | 664 | 0 | 664 (pinned) | `[]` | 399 (matches baseline exactly) |
| 375×553×3 | 553 | 0 | 553 (pinned) | `[]` | 288 |
| 360×600×3 | 600 | 0 | 600 (pinned) | `[]` | 335 (< 399 baseline — visibly shrunk, confirming `minHeight: 0` landed) |

### SocraticScreen — sweep (`/socratic/immediate-threat`)

| Viewport | innerH | P1_hOverflow | P4_screenRootH | controlsBelowFold | board area `h` (kids[2]) |
|---|---:|---:|---|---|---:|
| 390×844×3 | 844 | 0 | 844 (pinned) | `[]` | 574 |
| 390×664×3 | 664 | 0 | 664 (pinned) | `[]` | 394 (matches baseline exactly) |
| 375×553×3 | 553 | 0 | 553 (pinned) | `[]` | 283 |
| 360×600×3 | 600 | 0 | 600 (pinned) | `[]` | 307 |

### ChallengeScreen — three-state sweep (`/challenge/claimeven?devBoard=3233333556`; forbidden_columns via generated+promoted puzzle)

**State 1 — `phase === 'pre-move'`** (as loaded):

| Viewport | innerH | P1_hOverflow | P4_screenRootH | controlsBelowFold |
|---|---:|---:|---|---|
| 390×844×3 | 844 | 0 | 844 (pinned) | `[]` |
| 390×664×3 | 664 | 0 | 664 (pinned) | `[]` |
| 375×553×3 | 553 | 0 | 553 (pinned) | `[]` |
| 360×600×3 | 600 | 0 | 600 (pinned) | `[]` (before the spacer→scroller wrap: `Hint` + 3 mute buttons below fold) |

**State 2 — `phase === 'post-move'`** (clicked column 1, waited ~2.2s for the Tier-1 strip):

| Viewport | innerH | P1_hOverflow | P4_screenRootH | controlsBelowFold | Notes |
|---|---:|---:|---|---|---|
| 390×844×3 | 844 | 0 | 844 (pinned) | `[]` | |
| 390×664×3 | 664 | 0 | 664 (pinned) | `[]` | |
| 375×553×3 | 553 | 0 | 553 (pinned) | `[]` | |
| 360×600×3 | 600 | 0 | 600 (pinned) | `["Learn more ▼" bottom 715]` | PASS by hand: scrolled the scroller (`scrollTop = scrollHeight`) and the button's bottom moved to 504 (≤600) — reachable via its nearest scrollable ancestor, per the harness's P3 rule. Toolbar (Hint/Submit/Next) itself never listed. |

**State 3 — `category === 'forbidden_columns'`** (`/challenge/forbidden_columns?devBoard=333336451255115110106446424400` — see "Puzzle pool" below):

| Viewport | innerH | P1_hOverflow | P4_screenRootH | controlsBelowFold |
|---|---:|---:|---|---|
| 390×844×3 | 844 | 0 | 844 (pinned) | `[]` |
| 390×664×3 | 664 | 0 | 664 (pinned) | `[]` |
| 375×553×3 | 553 | 0 | 553 (pinned) | `[]` |
| 360×600×3 | 600 | 0 | 600 (pinned) | `[]` |

Toolbar showed **Submit** (not Hint), confirming the multi-select branch was actually reached.

**Puzzle pool note:** local `puzzles` had zero active `forbidden_columns` rows and `candidates` had
zero pending ones (measured directly against Supabase). Per
`feedback_generate_puzzles_for_local_qa`, generated 10 with
`node server/scripts/generate_all_candidates.mjs --category forbidden_columns --count 10 --port $API_PORT`
and promoted all 10 via `POST /api/admin/candidates/approve-batch` (goal_prompt harvested from an
existing, non-active `forbidden_columns` puzzle row: "Avoid columns that hand your opponent an
immediate win."). Not reported as unreachable; not deferred.

### PostSetSummaryScreen — characterization and pin-vs-unit-only decision

**Reached via the real flow** (not devBoard, since `/summary` is `SESSION_ONLY_SCREENS`):
`/setpicker` → Immediate Threat (8-puzzle set) → answered all 8 (mix of optimal/suboptimal/blunder
— outcome doesn't matter for layout) → landed on `/summary`.

**Characterization at 390×664 (before editing):**
```json
{"naturalContentH": 628, "P1_hOverflow": 0, "P4_screenRootH": 664, "controlsBelowFold": []}
```
`kids: [{h:52,"DecodeC4"}, {h:612,"Set complete!|0/8 optimal|0%"}]` — a `TopBar` plus **one**
scrollable content div (`flex: 1, overflowY: 'auto'`, already present at `PostSetSummaryScreen.jsx:160`)
that contains the hero, accuracy card, coach recommendation, primary CTA **and** the ghost
"Back to Challenges" button — there is no separate `<Toolbar>` and no bottom-pinned control outside
that scroller.

**At 360×600 (before editing):** `P4_screenRootH: 639` (root grows past the 600 floor, as
`minHeight` always allows), and "Back to Challenges" (`bottom: 615`) is below the fold. Confirmed
by hand this is a **page-level** scroll, not a clip: `document.documentElement` itself overflows
(the root's `minHeight` grows to fit content), and scrolling the page — not some inner region —
brings the button into view. This is the same "legitimately long, scrolls" shape as Saga/SetPicker
in the Before table, not the Toolbar-pinning defect Steps 1–8 fix.

**Decision: unit-only** (per the brief's second bullet — "plain scrolling summary with no
bottom-pinned control"). Changed `minHeight: '100vh'` → `minHeight: '100dvh'` at
`PostSetSummaryScreen.jsx:155`, no pinning, no scroller changes.

**Post-edit re-verification (same session, via Vite HMR — no reload, since `/summary` can't survive one):**

| Viewport | innerH | P1_hOverflow | P4_screenRootH | controlsBelowFold |
|---|---:|---:|---|---|
| 390×664×3 | 664 | 0 | 664 | `[]` |
| 390×844×3 | 844 | 0 | 844 | `[]` |
| 375×553×3 | 553 | 0 | 639 | `["Go to Immediate Threat…" 555, "Back to Challenges" 615]` |
| 360×600×3 | 600 | 0 | 639 | `["Back to Challenges" 615]` |

Geometry at 375×553 and 360×600 is **unchanged from pre-edit** (`P4_screenRootH: 639` both before
and after) — confirms this was a pure unit swap with no behavior regression, matching the intent of
a unit-only change. `screenRootCss.minHeight` computed to `600px` at the 360×600 emulation (i.e.
the `dvh` value took effect), even though under DevTools emulation it necessarily equals what `vh`
would have given (see the emulation caveat above).

### Static guard: `tests/unit/viewportUnits.test.js`

- Before Task 4: 14 failing file-assertions (Task 3's end state).
- After Task 4: **12** failing file-assertions — `GameScreen.jsx uses no 100vh` and
  `PostSetSummaryScreen.jsx uses no 100vh` now pass. `SocraticScreen.jsx uses no 100vh` and
  `ChallengeScreen.jsx uses no 100vh` remain failing **as expected** — each file's other
  loading/error/empty early-return branches (Socratic sites 8/9/10 at lines 197/208/220; Challenge
  sites 11/12 at lines 747/762) still carry the old unit and are explicitly Task 5's scope, not
  this task's. Predicted 12 (PostSetSummaryScreen fully converted) before running; confirmed.

### `npm run test:fast` (from `connect-four/`)

```
ℹ tests 1764
ℹ pass 1752
ℹ fail 12
```

eslint ran first with no errors (full test list printed, confirming the run wasn't
short-circuited). `fail` dropped by exactly 2 relative to Task 3's end state (14→12), matching the
two newly-passing file-assertions (GameScreen, PostSetSummaryScreen) with no other regression.

### What could NOT be verified

- **The unit swap itself** (that a real mobile browser's retracting chrome no longer inflates the
  floor) — inherent to DevTools emulation, not specific to this task; the static guard is the only
  mechanical proof, and it passes for the two files this task fully converted.
- Everything else in scope was verified directly: all four screens/states at all four viewports,
  the ChallengeScreen spacer defect predicted by the brief (reproduced, then fixed per the brief's
  own instruction), the forbidden_columns branch (puzzle pool was empty locally — generated and
  promoted 10 puzzles rather than reporting it unreachable), and PostSetSummaryScreen reached via
  the real completion flow (not skipped, not assumed).

## After Task 5 (unit sweep)

### Re-derived site list (Step 1) — vs. the brief's 17/12

```
cd connect-four && /usr/bin/grep -ran "100vh" src/screens/ src/App.jsx
```

Result: **17 sites across 12 files** — matching the brief's original count exactly, **not** the
task-prompt's corrected "16 across 11". Re-checked directly: `PostSetSummaryScreen.jsx` already
carries only `height: '100dvh'` (no `100vh` occurrences at all — Task 4 fully converted it), so it
was never part of this sweep's count either way; the discrepancy claim does not hold against the
current tree. Full list (grep output, `/usr/bin/grep -ran "100vh" src/screens/ src/App.jsx`):

| File | Line(s) | Branch |
|---|---|---|
| SettingsScreen.jsx | 338, 360 | two early returns |
| DifficultyPickerScreen.jsx | 30 | main return |
| SocraticScreen.jsx | 197, 208, 220 | loading / error / `!board` early returns (D6) |
| OnboardingImportOfferScreen.jsx | 82 | main return |
| ChallengeScreen.jsx | 747, 762 | `lessonMode` empty-puzzles / `loading` early returns (D6) |
| HomeScreen.jsx | 69 | main return |
| SagaScreen.jsx | 267 | main return |
| StatsScreen.jsx | 88 | main return |
| SetPickerScreen.jsx | 140 | main return |
| PricingScreen.jsx | 127 | main return |
| OnboardingMissionScreen.jsx | 72 | main return |
| PlayOnlineScreen.jsx | 435, 530 | `phase === 'playing'` and non-playing-phase main returns |

Confirmed the two SocraticScreen and two ChallengeScreen sites are the loading/error/empty branches
(not the main returns Task 4 already pinned) by reading the surrounding `if` guards before editing
— `loadState === 'loading'`, `loadState === 'error' || !lesson`, `!board` for Socratic;
`lessonMode && puzzles.length === 0` and `phase === 'loading'` for Challenge.

### Sweep applied

Every `minHeight: '100vh'` → `minHeight: '100dvh'` in the 12 files above, in place, no other
change. No `minHeight` became `height`; no scroll container added.

### Step 3 — confirm nothing became `height`

```
cd connect-four && /usr/bin/grep -ran "height: '100dvh'" src/screens/
```

Result: exactly the Group B pinned roots from Tasks 3–4 (`GameScreen.jsx:183`,
`SocraticScreen.jsx:235` [main], `ChallengeScreen.jsx:788` [main], `ReviewScreen.jsx:307`), **plus
three pre-existing `ConceptScreen.jsx` sites (158, 169, 194)** that predate this whole epic
(confirmed via `git log -p` — first appears in commit `cbdef47`, spec-052/053 work, unrelated to
mobile-viewport-fit). No `SettingsScreen`/`HomeScreen`/`SagaScreen`/`SetPickerScreen`/etc. line
appears in this list — the sweep did not accidentally pin any Group C file.

### Step 4 — static guard

```
cd connect-four && npx node --test tests/unit/viewportUnits.test.js
```
`ℹ tests 25`, `ℹ pass 25`, `ℹ fail 0` — up from 12 failing file-assertions before this task.

### Step 5 — long-screen measurements (390×664×3, mobile, touch; harness above)

| Screen | naturalContentH baseline | P4_screenRootH (measured) | screenRootCss.minHeight | Pinned? |
|---|---:|---:|---|---|
| `/saga` | 1156 | **1156** | 664px | No — scroll to bottom reaches `scrollY=492` (== 1156−664), last content visible |
| `/setpicker` | 1327 | **1337** (+10px vs. baseline; content-size drift, not a pin — see note) | 664px | No |
| `/pastGames` | 2239 | **2237** (±2px) | 664px | No |
| `/mistakes` | 734 | **734** (exact) | 664px | No |
| `/settings` | 605 | **664** | 664px | Expected — content (605) is *shorter* than the 664 viewport, so the `minHeight` floor legitimately governs; this is the documented "shorter content stops painting extra background" behavior, not a pin. `naturalContentH` (measured with the floor zeroed) still reads 605, matching baseline. |

None of the five collapsed `P4_screenRootH` to 664 while their natural content exceeds 664 (Saga,
SetPicker, PastGames, Mistakes) — the failure signature described in the brief ("`P4_screenRootH`
of exactly 664 on `/saga`") did not occur. SetPicker's +10px vs. the pre-work baseline is content
drift (list length / dynamic set count), not a layout regression — `screenRootCss.minHeight` is
`664px` (dvh unit in effect) and the root height tracks content, not the viewport, on all four
genuinely-long screens.

### Step 6 — D7 screens (390×664×3)

| Screen | Baseline `contentH` | Measured `contentH` | `P1_hOverflow` |
|---|---:|---:|---:|
| `/` (Home) | 706 | **664** (naturalContentH now 596, no overflow) | 0 |
| `/difficulty` | 736 | **735** (±1px) | 0 |
| `/pricing` | 820 | **819** (±1px) | 0 |

Difficulty and Pricing match baseline within rounding. Home's `naturalContentH` dropped from 706 to
596 — this is **not** an effect of this task (only the `minHeight` token was touched in
`HomeScreen.jsx`, per the layout-only restriction); it reflects the parallel "Plan A" session's
concurrent copy/behavior edits to `HomeScreen.jsx`, which is out of this task's scope to
investigate or revert. `P1_hOverflow` is `0` on all three, confirming no horizontal regression.

### Guard count: 12 → 0

Confirmed above (Step 4).

### `npm run test:fast` (from `connect-four/`)

```
ℹ tests 1764
ℹ pass 1764
ℹ fail 0
```

ESLint ran first with no errors (full test list printed). `1764` exceeds the `≥1740` target
(1739 baseline + 25 viewportUnits assertions, net of the file being counted differently across
runs); zero failures.

### What could NOT be verified

- **The unit swap itself** under a real mobile browser's retracting chrome — same DevTools-emulation
  limitation noted in every prior section; the static guard (now 0 failures) is the mechanical proof
  that the token was swapped everywhere required.
- `HomeScreen.jsx`'s content-height drift (706→596) was observed but not root-caused, since
  diagnosing "Plan A"'s concurrent copy/behavior changes is outside this task's layout-only mandate
  for that file.

## After (final)

Consolidated final state across all five tasks. Every number below is a restatement of a
measurement already taken in the sections above — nothing new was re-measured for this rollup; it
exists to give one place to read the finished picture.

### Pinned screens (`height: '100dvh'` + internal scroller) — four-viewport summary

| Screen | 390×664 | 390×844 | 375×553 | 360×600 | Source |
|---|---|---|---|---|---|
| `ConceptScreen` | pinned, pre-existing | — | — | — | predates this epic (commit `cbdef47`) |
| `GameScreen` | pinned, `P1_hOverflow` 0, board 399 | pinned, board 579 | pinned, board 288 | pinned, board 335 (shrunk) | After Task 4 |
| `SocraticScreen` (main return) | pinned, board 394 | pinned, board 574 | pinned, board 283 | pinned, board 307 | After Task 4 |
| `ChallengeScreen` (main return, 3 states) | pinned, `[]` below fold all 3 states | pinned, `[]` | pinned, `[]` | pinned, `[]` (post spacer→scroller fix; `Learn more ▼` reachable by hand-scroll in state 2) | After Task 4 |
| `ReviewScreen` (non-onboarding) | pinned, scroller reaches 155px clip amount | pinned, no scroll needed | pinned | pinned | After Task 3 |
| `ReviewScreen` (onboarding, incl. Plan A's extra coach line) | Continue bottom 648 (≤665) | Continue bottom 828 (≤845) | Continue bottom 537 (≤554) | Continue bottom 584 (≤601) | After Task 3, Step 5a |

All pinned screens: `P1_hOverflow: 0` and no unintended `controlsBelowFold` at all four sizes,
confirmed above.

### Unit-only screens (`minHeight: '100dvh'`, correctly left unpinned)

- **Legitimately long** (`SagaScreen` 1156px, `SetPickerScreen` 1327px, `PastGamesListScreen`
  2239px, `MistakesListScreen` 734px, `SettingsScreen`): geometry unchanged from baseline at
  390×664 (After Task 2 sweep); none collapsed to the viewport height while content exceeds it.
- **One-screen, spills modestly** (`HomeScreen`, `DifficultyScreen`, `PricingScreen`): unchanged
  within ±1px of baseline (After Task 5, Step 6), `P1_hOverflow: 0` on all three.
- **`PostSetSummaryScreen`**: characterized and deliberately left unit-only (After Task 4) —
  `P4_screenRootH` identical before/after the unit swap (639 at 375×553 and 360×600), confirming a
  pure unit change with no behavior regression. Its below-the-fold ghost-button wart is pre-existing
  and now tracked as **OI-161**, not fixed here.
- **17-file sweep** (Task 5): all `minHeight: '100vh'` → `minHeight: '100dvh'`, no `height` and no
  scroller added anywhere in that batch; confirmed via `grep -ran "height: '100dvh'"` matching only
  the five pinned roots plus `ConceptScreen`.

### Guard and suite, final state

```
cd connect-four && npx node --test tests/unit/viewportUnits.test.js
```
`ℹ pass 25`, `ℹ fail 0`.

```
cd connect-four && npm run test:fast
```
`ℹ tests 1764`, `ℹ pass 1764`, `ℹ fail 0`.

```
cd connect-four && /usr/bin/grep -ran "100vh" src/screens/ src/App.jsx
```
No output (exit 1) — zero in-scope `100vh` sites remain.

```
cd connect-four && /usr/bin/grep -ran "100vh" src/
```
Exactly the 5 admin sites of **OI-160** (`AdminFvSuffPage.jsx:280,621`,
`AdminDeepRevealEvalPage.jsx:371,378`, `AdminAudioPage.jsx:435`) — deliberately excluded, not a gap.

### Not verified

Naming what this plan did **not** reach, so it does not silently read as full coverage:

- **The unit swap itself was never verified on a real device.** Chrome DevTools emulation has no
  browser chrome, so all three viewport units (`vh`/`dvh`/`svh`) resolve to identical pixels there —
  every sweep in this document proves the *pinning/scroller* half, never the *unit* half. Only the
  static guard (`viewportUnits.test.js`, now 0 failures) proves the token was swapped everywhere
  required. Real-device confirmation is exactly what the deploy-queue entry's "Verification after
  deploy" steps (`docs/deployment_steps.md`, 2026-08-04 Plan B entry) exist to close.
- **Task 3's onboarding-variant measurement was taken on a 2-disc game** (Settings → Replay intro →
  Start sparring → one move played → Resign), with no Move Timeline and no Prev/Next mistake row
  rendered — the mistake-review UI only appears when there are mistakes to review. The genuine worst
  case — a full-length review *with* both the Move Timeline/Prev-Next row *and* the onboarding
  Continue button in the same render — was never measured in one shot. The "tallest possible state"
  wording used earlier in this document (Step 5a) is not supported by that gap and should be read as
  "tallest state reached," not "tallest state possible."
- **`ChallengeScreen`'s `deepRevealOpen` branch** is now a child of the pinned root (After Task 4)
  but was not measured in any state — none of the three sweeps opened deep reveal. It is expected to
  be fine: `SplitReveal.jsx` already carries `flex: 1, minHeight: 0, overflow: hidden` per the
  `SplitReveal`/`useDragSplit` convention in `docs/architecture/frontend-conventions.md` §"CSS Layout
  Gotchas", but that expectation was never measured against this task's pinned root specifically.
- **The `HomeScreen` content-height drift (706→596) observed in Task 5 was misattributed** in that
  task's own report to the parallel "Plan A" lane. That attribution is impossible as stated — Plan A
  runs in a separate worktree and cannot alter this branch's files. Re-verified at source for this
  task: `git show 6244e8d -- src/screens/HomeScreen.jsx` (the commit that made this file's
  mobile-viewport-fit edit) touches exactly one line — the `minHeight` unit token; nothing else in
  the file changed as part of this plan. The real cause is almost certainly local app state carried
  over from
  Tasks 3–4's manual QA on this dev server — those tasks played sparring games and completed an
  8-puzzle challenge set, which changes which conditional cards `HomeScreen` renders relative to a
  fresh-profile baseline (e.g. resume-game / recent-activity cards). Recorded here so nobody spends
  time hunting a phantom cross-worktree cause.

## Final review fix wave

FIX 1 of the final whole-branch review added `overflowY: 'auto'` to `GameScreen.jsx`'s `flex: 1`
board-area child (was `flex: 1, minHeight: 0` with no scroller — the lone pinned screen missing it).
Re-verified GameScreen at all four required viewports via the harness above, at
`/game?devBoard=3233333556&devSide=first&devDifficulty=easy`:

| Viewport | innerH | `P4_screenRootH` | `P1_hOverflow` | `controlsBelowFold` | Result |
|---|---|---|---|---|---|
| 390×844×3,mobile,touch | 844 | 844 | 0 | `[]` | PASS — Hints on / Resign visible |
| 390×664×3,mobile,touch | 664 | 664 | 0 | `[]` | PASS — Hints on / Resign visible |
| 375×553×3,mobile,touch | 553 | 553 | 0 | `[]` | PASS — Hints on / Resign visible |
| 360×600×3,mobile,touch | 600 | 600 | 0 | `[]` | PASS — Hints on / Resign visible |

At every size the screen root height equals `innerH` (pinned, no clip), horizontal overflow is 0,
and the board-area child (the `kids[2]` entry, heights 579/399/288/335 across the four sizes) sits
inside the new scroller — Hint/Resign stayed on screen without needing to scroll at the current
(pre-row/column-labels) board height. The `overflowY: 'auto'` addition is inert today (no overflow
to scroll) and exists to absorb the taller board the parallel row/column-label lane is about to add.

Suite after the fix wave: `npm run test:fast` → `ℹ pass 1764`, `ℹ fail 0`.
