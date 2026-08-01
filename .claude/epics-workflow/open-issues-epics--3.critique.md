# Epic 3 critique (epic_critique stage)

## Blocking issues

**1. The "four tier-gate call sites" list is wrong at the source, and it is load-bearing for both US3.2 and the epic's acceptance criteria.**

The epic (Non-obvious facts, US3.2, and Acceptance criteria) names four places that independently read the user's paid/free tier: `sagaLock.js:13`, `PostSetSummaryScreen.jsx:55`, `CheckoutReturnBanner.jsx:72`, and `SettingsScreen`'s Subscription section. It inherited this list verbatim from `docs/open_issues.md` OI-39. Grepping every `.tier` read in `connect-four/src/` gives a different set of **five**:

- `src/screens/SettingsScreen.jsx:108` — `setTier(profile.tier === 'paid' ? 'paid' : 'free')` ✅ in the epic's list
- `src/screens/PostSetSummaryScreen.jsx:79` — `setIsFreeUser(!profile || profile.tier === 'free')` ✅
- `src/screens/SagaScreen.jsx:191` — `.then(p => setTier(p?.tier ?? 'free'))` ❌ not in the list
- `src/components/DeepRevealPane.jsx:283` — `tier: profile?.tier` (feeds `describeQuota`) ❌ not in the list
- `src/lib/useLessonLockGuard.js:58` — `store.getProfile().then(p => p?.tier ?? 'free')` ❌ not in the list

Two of the epic's four do not read tier at all. `src/screens/sagaLock.js` (note: `src/screens/`, not `src/lib/`) exports pure functions whose signature is `deriveLockReason(lesson, lessons, progress, tier)` — tier arrives as a **parameter**; the read is in `SagaScreen.jsx`. `src/store/CheckoutReturnBanner.jsx` contains zero `.tier` references — only a comment mentioning "free-tier render". A spec written from the epic would migrate two files that need no migration, and leave the paid-lesson guard (`useLessonLockGuard.js`) and the Deep Reveal quota gate reading the client-cached tier — with the acceptance criterion "exactly one code path answers 'is this user paid'" nonetheless reported as met.

*Recommended resolution:* replace the list in both the Non-obvious facts bullet and US3.2 with the five verified read sites above, keep the existing "locate by symbol, not line" caveat, and add a note that `sagaLock.js`/`CheckoutReturnBanner.jsx` were verified as **not** tier readers (so a future agent doesn't re-add them from OI-39).

**2. The new in-app React `/pricing` route collides with the static page the same epic insists must stay — and the epic never names the files that define routing.**

`connect-four/server/index.js` registers `app.get('/pricing', (_, res) => res.sendFile(join(__dirname, 'pricing.html'), LEGAL_PAGE_OPTS))` **before** `app.use(express.static(join(__dirname, '../dist')))` and before the SPA catch-all `app.get('/{*path}', ...)`. Express matches in registration order, so as long as `pricing.html` is served at `/pricing` — which Settled decision #6, US3.4's blocking task, and the NOT-included list all *require* until Paddle domain review is verified — a browser navigating to `/pricing` can never reach the React app. The epic asks for two mutually exclusive things at one URL.

Separately, this app has **no router library** (`react-router`/`wouter` are absent from `package.json`). Navigation is hand-rolled: a `URL_MAP` table in `src/lib/urlMapping.js`, a `SCREENS` registry in `src/lib/screenRegistry.jsx`, and `window.history.pushState` in `src/App.jsx`. Adding an "in-app React route" means adding a `URL_MAP` entry, a screen-registry entry, and a nav entry point — three files the epic never mentions, while it does name `usePaddlePrices.js`, `UpgradeModal.jsx`, and `useUpgradeCheckout.js`.

*Recommended resolution:* add the URL-collision fact and the three routing files to Non-obvious facts and to US3.4's task list, and resolve the path conflict per Decision 1.

**3. "One server code path backs both the entitlement endpoint and US3.1's lesson gate" is not implementable as written.**

Settled decision #5 and the acceptance criteria both assert that the `GET /api/user/entitlement` code path "must also serve US3.1's lesson gate". These are different questions. The entitlement endpoint answers "is this user paid" (one boolean off `users.tier`). The lesson gate answers "may this user open lesson X", which `deriveLockReason(lesson, lessons, progress, tier)` computes from the lesson's `free` flag **plus predecessor completion progress** plus tier — and it lives in a **frontend** module (`src/screens/sagaLock.js`) with no server counterpart. An HTTP endpoint also cannot be a "code path" that the `GET /api/lessons/:id` handler calls; only a shared module can be. The spec needs an explicit shape here (extract the tier clause into a module both sides import? have the endpoint be a thin wrapper over a server helper the lesson handler also calls?), or `/speckit-plan` will invent one.

Two mitigating facts confirmed at source, both worth adding to the epic because they shrink US3.1: `app.use(loadUser)` is global at `server/index.js:533`, well before the lesson routes at :673, so `req.user.tier` **is** already available on `GET /api/lessons/:id` despite the route's "no auth required" comment — no auth wiring needed. And `getLessons()` in `server/lessonLoader.js` already projects to `{ id, title, order, free }` only, so the "keep metadata public so the saga list renders" requirement is already satisfied by the list endpoint; only `getLesson(id)` leaks slides.

Everything else checked held up at source: `getSubscriptionStatus`'s body is verbatim as the epic quotes it (`connect-four/server/paymentProcessor.js`), all three cited `server-conventions.md` sections exist with the wording the epic assumes (including the "treat this section as a proposal to sanity-check, not settled policy" disclaimer US3.3 replaces), `usePaddlePrices.js` exports `usePaddlePrices`/`formatPrice`/`computeAnnualSavings`, and the `/api/paddle/*` 503-when-unconfigured claim is documented in the seam section.

## Decisions required

**1. Where does the new in-app pricing page live, given that the compliance page keeps `/pricing`?**

- **(a)** Static page keeps `/pricing`; the React page ships at a new path (e.g. `/plans`), and all in-app CTAs point there. Both surfaces live indefinitely; if Paddle later accepts an SPA route, `/pricing` can redirect to `/plans`.
- **(b)** React page takes `/pricing`; the static compliance page moves to e.g. `/pricing-legal` and is submitted to Paddle at that URL. Risk: re-submitting a domain-review URL, which per project memory is a remove-and-re-add operation.
- **(c)** Keep both at `/pricing`, disambiguated server-side. Fragile and untestable.

*Recommended default:* (a).

**2. What does `GET /api/lessons/:id` return to a caller who isn't entitled to that lesson?**

- **(a)** 404 `not_found` — matches the handler's existing miss branch and leaks nothing.
- **(b)** 402 Payment Required — honest, but tells an attacker exactly which ids are paid.
- **(c)** 200 with a redacted stub — metadata (`title`, `free`, `order`) plus `locked: true`, no `slides`.

*Recommended default:* (c). The lesson list endpoint already publishes exactly that metadata to everyone, so a stub leaks nothing new; and it lets a locked-lesson screen render a real title and an upgrade CTA instead of an error. (Differs from the brainstorm gate's stated "obvious default" of 404.)

## Handoff context

**Systemic issues affecting the whole epic.** The epic's factual bullets are largely *inherited* from `docs/open_issues.md` rather than measured against the working tree, and OI-39 in particular is stale (it describes the state before `SagaScreen`/`DeepRevealPane`/`useLessonLockGuard` existed in their current form). The epic's own top matter warns that its numbers are point-in-time — but the fix agents kept treating the OI text as authoritative. Any further pass on this epic should re-measure rather than re-quote. Second systemic pattern: the epic names *helper* modules it wants reused (hooks, components) but never the *structural* files a change must touch (routing table, screen registry, Express route ordering) — that's how blocking issue 2 stayed invisible.

**Reviewer frame.** Running code was weighted above every document: `connect-four/server/index.js` (route registration order, `loadUser` placement), `connect-four/server/paymentProcessor.js`, `connect-four/server/lessonLoader.js`, `connect-four/src/lib/urlMapping.js`, `connect-four/src/App.jsx`, `connect-four/package.json`, and an exhaustive `.tier` grep over `connect-four/src/`. `docs/architecture/server-conventions.md` §PaymentProcessor Seam / §Identity binding / §Activation were read directly rather than trusting the epic's paraphrase — that section is accurate and can be trusted by the spec agent. `docs/open_issues.md` was treated as *history*, not as a source of truth about current code, which is precisely where the epic went wrong.

**Non-obvious intent a fix agent should know.** The three 2026-07-31 owner decisions are ratifications, not new work: #4 explicitly means **no code change** to the identity binding (US3.3 is a documentation story plus an OI-34 re-map), and #6's "keep `pricing.html`" is a hard constraint repeated in three places. Do not "simplify" by deleting the static page. Also, the epic's Overview triage table marks Epic 3 "Full speckit" while the brainstorm gate overrode that to "Brainstorm-first" — the table was deliberately left stale; don't reconcile it as a bug.

**What was not flagged, and why.** Path-precision nits (`src/screens/sagaLock.js` not `src/lib/`, `src/store/CheckoutReturnBanner.jsx` not `src/components/`) are folded into blocking issue 1. The task-count hints (9/5/10) were ignored — the prior handoff marks them non-binding and `/speckit-tasks` regenerates them. The `paddle-docs` MCP check on SPA domain-review compatibility was not attempted; the epic correctly scopes that as an in-story verification task, and Decision 1(a) would make it non-blocking anyway. US3.5 (checkout return continuity) and the OI-34/`verifyTransaction` re-map were not audited beyond confirming `verifyTransaction` exists and is documented as not writing the `upgrade_completed` track — both are internally consistent and neither was touched by the recent edits.
