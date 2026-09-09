# Task: QA-verify, in a real browser, the 18 fixes made for the 2026-09-08 QA findings

You are starting with **no prior context**. Read this whole brief before doing anything.

A full-app agentic QA pass ran on 2026-09-08 and filed **19 issues, OI-163 through OI-181** (3
blockers). A remediation session on 2026-09-09 fixed **18 of them in code** (OI-175 was dropped by
owner directive — see "Out of scope"). **Nothing has been verified in a browser.** That is your job.

You are doing verification now, not repair. **Do not fix newly-found bugs inline** — that destroys
the state you are testing. File them instead (see "Filing new defects").

## Why this matters more than the green suite suggests

The unit suites are green and prove less than they appear to. **1785 green tests coexisted with all
three original blockers.** Every blocker here lives in a seam the suites cannot reach: two endpoints
disagreeing about a filter, a store migration that only runs on a real page reload, a screen that
never read tier, a Paddle event that fires synchronously inside our own close call. A fix you cannot
demonstrate through the UI is **not verified**.

---

## Source documents — read these first, in this order

1. `docs/open_issues.md` → entries **OI-163 … OI-184**. Each carries its original repro, and most
   now carry a 2026-09-09 block recording what was fixed and what remains unverified. **The repro in
   the entry is the repro you must drive.**
2. `agentic_QA_2026-09-08-1929.md` (repo root) — the baseline findings file you are measured
   against. **Do not overwrite it.** Its closing "Coverage gaps" section is a task list, not an
   excuse; four of its gaps are yours to close.
3. `.superpowers/sdd/qa-2026-09-08-remediation/progress.md` — the remediation ledger. Every fix,
   every ruling, and **every "UNVERIFIED" / "OWED IN PHASE 2" line**. Those lines are the honest
   list of what the fixers could not prove; they are your highest-value targets.
4. `CLAUDE.md` at the repo root — project conventions. Non-negotiable.

## Environment

This is a **git worktree**. Run everything from the worktree root
(`/Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/e2e-qa-enablement`); **never `cd` to the
main checkout**.

```
eval "$(./worktree-ports.sh)"     # exports $API_PORT / $VITE_PORT — run before starting,
                                   # restarting or killing ANY server, every time
```
Resolves to **API 4799 / Vite 6799** here — always derive it, never hardcode.

**The currently running API server is STALE.** It predates almost every server change from the
remediation and **does not hot-reload**. Restart it before judging anything:
```
lsof -ti tcp:$API_PORT | xargs kill
cd connect-four && node --env-file=server/.env server/index.js > <scratch>/server.log 2>&1 &
cd connect-four && npm run vite                                > <scratch>/vite.log   2>&1 &
```
Redirect to a log FILE so you can read it. **Kill ONLY by `$API_PORT`/`$VITE_PORT`. Never
`pkill node`, never a bare port number** — other worktrees' servers are running and you would kill
them.

`node_modules` and both `.env` files already exist here.

**Auth**: there is NO email/password and NO magic-link sign-in. `AuthModal` has exactly two real
controls — "Continue with Google" and dismiss — plus a dev-only **"🛠 Dev: skip auth"** button
(dashed border, at the bottom, easy to miss) that signs in anonymously. Do not look for an email
field or report its absence. **Never attempt Google OAuth**: it hardcodes port 3001 and reaches the
MAIN checkout's server. A true first-run reset is Settings → **"🛠 Dev: clear IndexedDB & sign out"**;
a bare sign-out is not a reset.

**QA tooling** (localhost-only, dev-only):
```
POST /api/admin/qa-rollback       {userId}                    → tier=free, paddle_customer_id=NULL
POST /api/admin/qa-set-paid-state {userId, paddleCustomerId}  → tier=paid + customer id together
POST /api/admin/qa-set-email      {userId, email}
```
**After ANY tier change made directly in the DB you MUST reload the page before judging the UI** —
the entitlement cache is module-scoped and a DB write does not invalidate it.

**DB access** (service role): `.env` is at `connect-four/server/.env` (NOT the repo root); the key
var is `SUPABASE_SERVICE_ROLE_KEY`; `cd connect-four` first so `require('@supabase/supabase-js')`
resolves; parse `.env` manually — `dotenv` is not reliable in `node -e`. **Never print secrets.**

**Rate limit: 120 req/min per IP**, shared with your browser session. A 429 returns a **plain-text**
body, which surfaces as an opaque JSON-decode error with **NO server log line**. Unexplained JSON
error with nothing in the log → suspect this first and back off. **429s are not bugs.**

**Databases are disposable pre-launch** — staging and production have no users. Never write to
staging or production; measuring is read-only.

## Baselines to measure against

- `cd connect-four && npm run test:fast` → **1843 pass / 0 fail** (47 lint warnings / 0 errors is
  healthy). **Never `npm test`** — it calls the real solver hundreds of times and hangs.
- `cd connect-four && npm run test:dom` → **117 pass / 0 fail**. **This is a SECOND, SEPARATE gate**
  that `test:fast` does not include: React screen tests live in `tests/dom/*.dom.test.jsx`. Most of
  what you are verifying is screen-level, so **report both numbers**.

---

## How to run this — coordinator-driven, grouped by ACCOUNT STATE

**Invoke the `app-qa` skill** and follow its methodology (browser driving via the chrome-devtools
MCP, evidence discipline, token discipline, the stamped findings-file convention).

Create a fresh stamped findings file **`agentic_QA_<YYYY-MM-DD-HHMM>.md`** at the repo root.

**Constraint: there is ONE Chrome and ONE database.** Verification subagents must be **sequential**,
and must never flip tier while another is reading it. **Group by account state, not by issue
number**, so the expensive state changes happen once:

> **signed out → free → paid → rolled back**

Do the shell-only work yourself — log sweeps, `test:fast`, `test:dom`, DB reads. No browser, no
stall risk, and it keeps a concurrent writer away from the QA account.

If the chrome-devtools MCP browser is **locked by a sibling session**, do not fight it — launch your
own Chrome on a dedicated remote-debugging port (e.g. 9333) and drive it over raw CDP. Two agents
did this successfully during the remediation.

**Have each subagent append its findings to a shared file AS IT GOES, not buffer them.** The
2026-09-08 run lost an agent to a 600s watchdog after it had already executed a real state change
and reported nothing. When an agent dies, **check what it actually changed before re-dispatching**.

**Mobile**: use `emulate({viewport:"390x844x2,mobile,touch"})`. **`resize_page` silently floors the
width at 500px**, so a "390px" sweep done with it is not mobile and any conclusion from it is void.

---

## The work — 27 checks

### A. Drive every OI's original repro (18)

For **each** of OI-163…OI-181 **except OI-175**, drive the repro from `docs/open_issues.md` and
record **✅ FIXED / ❌ STILL BROKEN / ⚠️ PARTIAL** with the evidence you actually observed.

Notes on the ones with traps:

- **OI-170 (blocker)** — the reliable check is the **advertised-vs-drawable table for all 12
  categories** (see B). This server code has never run in a browser.
- **OI-171 (major)** — since OI-170's fix, the empty-draw path is hard to reach. **The 403 path is
  the reliable repro**: `/challenge/undercut` at `tier = 'free'`. Confirm the three states are
  genuinely distinguishable (needs-Pro + CTA / empty / load error), not one generic message.
- **OI-173 (blocker)** — see B. **Read `streak_count` and `last_active_date` as well as W/L/D.**
  Checking only the sparring record will show green while the streak is still being wiped.
- **OI-177 (blocker)** — requires a **paid** account and a **full reload** (module-scoped cache).
- **OI-176** — `/admin/fv-suff` and `/admin/reason`. Also confirm the page no longer preselects the
  *oldest* run (the fix orders by run stamp, not lexically).
- **OI-178 (major)** — needs a **real sandbox purchase**. Confirm the modal reaches success and
  auto-dismisses. Do this from **`SagaScreen` and `SetPickerScreen`**, not only `SettingsScreen`
  (see D).
- **OI-179** — confirm the already-Pro acknowledgement appears **and that the purchase CTA is still
  reachable** (that is what makes Paddle payment-link `?_ptxn=` checkouts work — a hidden CTA is a
  regression, not a fix).
- **OI-180** — verify **all four** surfaces at 390×844: the three toggles on `/game`, the three on
  `/challenge/<cat>`, and both chip rows on Past Games.
- **OI-181** — signed-out deep links to `/saga`, `/settings`, `/stats` must render each screen's own
  unauthenticated branch. **Also confirm genuine first-run still auto-routes to onboarding** — that
  is the property most at risk from this fix.

**OI-182, OI-183 and OI-184 were filed during the remediation and NOT fixed.** No verification is
required. If OI-183 (`verify-transaction` answering `not_completed` after a successful payment)
reproduces during your purchase runs, record the timing — it is the observation that would settle
whether it is a race.

### B. Re-run the three measurements, like for like (3)

The baseline file records these numbers; reproduce the same measurement so the comparison is valid:

1. **The advertised-vs-drawable table for all 12 categories** (OI-170) — `/setpicker` advertised
   count vs. what actually draws for each.
2. **The `clientHeight`/`scrollHeight` sweep across all 45 lesson slides** (OI-166/167). Baseline:
   15/45 truncating, 3 coach bubbles clipped at exactly `120/139`.
3. **W/L/D — and `streak_count`/`last_active_date` — before and after TWO hard reloads** (OI-173),
   with at least one game played in between.

### C. Re-verify server-side effects in the DB, not just the UI (part of A)

Several writers are **fire-and-forget**, so a green UI can hide a swallowed error. Confirm the row,
not the screen.

### D. Close the four coverage gaps the first run declared (4)

1. A sparring **win** and a **draw** driven end to end. All 5 games in the baseline run were losses,
   so win/draw routing and persistence are still untested — **and OI-172's 500 was only ever seen on
   the loss path.**
2. A paid challenge set actually **played** (blocked before by OI-177 + OI-170).
3. The mobile text-clipping sweep across **all** lesson slides, not one lesson.
4. A real payment from **`SagaScreen`** and **`SetPickerScreen`**, not only `SettingsScreen`.

### E. Close out (2)

1. **Sweep the server log** for any error class; attribute each to a known issue or file it as new.
   Rate-limit artifacts (429, plain-text body, no log line) are not bugs.
2. Run **`npm run test:fast`** and **`npm run test:dom`** and report both against the baselines.

---

## Claims the fixers could NOT verify — these need a browser and are yours to settle

Taken verbatim from the remediation ledger. Each is an honest gap, not a defect:

- **Board stability on `/game` and `/challenge/<cat>`** after the `CoachDialog` change. The `fixed`
  variant reserves `height: 140` so an appended coach message does not push the board down; that
  branch was **never exercised in a real browser** (`/game` bounced to `/` during the attempt).
- **Whether the gray `win` ring actually reads as a ring** — `#525a6b` around a `#3c4250` disc on a
  `#fbf4e3` hole. jsdom paints nothing and resolves no CSS custom properties; every assertion was on
  the token string. Check `/concept/block-before-build` (slides 0, 1, 3) and `/concept/the-fork`
  (slide 0), and confirm **lesson-06 slide 3's overlay is still GREEN** (it marks an empty target
  square, not a disc — it must not have turned gray).
- **Spanish and 390×844** for the lesson text fix — the new 200px coach cap is sized for ~20% longer
  text but was never measured, and more slides will show the scroll chip on mobile because the
  legend wraps.
- **Whether Paddle emits exactly ONE `checkout.closed` per completed payment.** The OI-178 fix
  swallows exactly one. If Paddle ever emits two, the second reaches the dismissed listener and the
  bug returns. Only a real purchase can tell you.
- **Four of the five UpgradeModal call sites** are covered structurally (shared hook + shared
  component), not by a payment test.
- The four `coach.spoken.sparring.review.mistakes{Strong,Rough}` summaries **ship text without
  audio** (their clips are generated but unapproved — see OI-184). Silent narration there is
  **expected**, not a new defect.

## Out of scope — do not test, do not fix, do not report as gaps

- **The live Papergames Play-Online surface** (`PlayOnlineScreen`, live rooms, OI-175). Owner,
  2026-09-09: *"that was just a test, do not work on it."* Driving it creates real guest accounts and
  pairs you with **real human opponents**. The Papergames **import** path is a separate feature and
  remains in scope.
- The `past_due` downgrade transition (blocked upstream; OI-158)
- Google OAuth (owner verifies manually; structurally untestable from a worktree)
- The Deep Reveal surface (`DeepRevealPane`) and its auth/checkout CTAs
- Webhook payload drift (has its own staging check)
- Admin **write** workflows — candidate curation, audio generation, lesson authoring/deletion

## Filing new defects

Any NEW defect goes into `docs/open_issues.md` as a new **`OI-N`** (read the file for the next free
number — **OI-184 is taken** — and match the entry format): repro, the evidence you observed, the
root cause you established, and a concrete first step. **If you cannot establish a root cause, write
"root cause: unknown" explicitly** rather than guessing; a confident wrong root cause costs the next
person more than an honest unknown. **You own `docs/open_issues.md`** — subagents report, you record,
or two agents will renumber against each other.

## Deliverables

1. The new stamped `agentic_QA_<date>.md` with a ✅/❌/⚠️ line for **every** OI-163…OI-181 (OI-175
   marked out of scope), the three re-run measurements, and the four coverage gaps.
2. `docs/open_issues.md` updated: each verified-fixed issue marked resolved with the date and the
   file it was fixed in; anything still broken left open **with what you observed**; new defects
   filed as new `OI-N`.
3. Anything only confirmable in a deployed environment appended to `staging_checks.md` under
   **Epic 13** — tick or extend the existing checks rather than duplicating them.
4. Per-change deploy prerequisites appended to `docs/deployment_steps.md` (read its "Lifecycle"
   section first).
5. A closing summary stating plainly: which issues are **fixed and demonstrated**, which are
   **fixed but unverified and why**, which are **still broken**, and **what you could not cover**.
   An honest gap is a finding; a silently skipped area is a defect in the work.
