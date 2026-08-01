## Blocking issue 1 — the "four tier-gate call sites" list is wrong at the source
Answer: Accept recommendation (auto-applied — no alternative)

Replace the list in BOTH the `Non-obvious facts` bullet and US3.2 with the five verified tier-read sites:
`src/screens/SettingsScreen.jsx` (`setTier(profile.tier === 'paid' ? 'paid' : 'free')`),
`src/screens/PostSetSummaryScreen.jsx` (`setIsFreeUser(!profile || profile.tier === 'free')`),
`src/screens/SagaScreen.jsx` (`.then(p => setTier(p?.tier ?? 'free'))`),
`src/components/DeepRevealPane.jsx` (`tier: profile?.tier`, feeds `describeQuota`),
`src/lib/useLessonLockGuard.js` (`store.getProfile().then(p => p?.tier ?? 'free')`).
Keep the "locate by symbol, not line" caveat. Add an explicit note that `src/screens/sagaLock.js` (note:
`src/screens/`, NOT `src/lib/`) and `src/store/CheckoutReturnBanner.jsx` (note: `src/store/`, NOT
`src/components/`) were verified as **not** tier readers — `deriveLockReason(lesson, lessons, progress, tier)`
receives tier as a parameter, and `CheckoutReturnBanner.jsx` contains zero `.tier` references — so a future
agent does not re-add them from OI-39's stale text. Update the epic's count wording from "four" to "five"
everywhere it appears, including the Acceptance criteria. All five migrate to the new interface.

## Blocking issue 2 (factual half) — routing structure the epic never named
Answer: Accept recommendation (auto-applied — no alternative)

Add to `Non-obvious facts`: this app has **no router library** (`react-router`/`wouter` are absent from
`package.json`); navigation is hand-rolled via a `URL_MAP` table in `src/lib/urlMapping.js`, a `SCREENS`
registry in `src/lib/screenRegistry.jsx`, and `window.history.pushState` in `src/App.jsx`. Adding an in-app
route means touching all three. Also record that `connect-four/server/index.js` registers the `/pricing`
`res.sendFile` handler BEFORE `express.static(dist)` and before the SPA catch-all `app.get('/{*path}', ...)`,
and Express matches in registration order — so whichever handler is registered first at a path wins. Add these
three frontend files to US3.4's task list.

## Blocking issue 3 — "one server code path backs both the entitlement endpoint and the lesson gate"
Answer: Shared server module, endpoint is a thin wrapper

Put the entitlement rule in ONE server module. `GET /api/user/entitlement` becomes a thin wrapper over that
module, and the `GET /api/lessons/:id` handler calls the same module directly — no HTTP hop between two server
handlers. Rewrite Settled decision #5 and the Acceptance criteria to say this precisely, replacing the current
"the endpoint code path must also serve US3.1's lesson gate" wording, which is not implementable as stated.

Also fold in the two mitigating facts the reviewer confirmed at source, because they shrink US3.1:
- `app.use(loadUser)` is registered globally in `server/index.js` well BEFORE the lesson routes, so
  `req.user.tier` is already available on `GET /api/lessons/:id` despite that route's "no auth required"
  comment — no auth wiring is needed for US3.1.
- `getLessons()` in `server/lessonLoader.js` already projects to `{ id, title, order, free }` only, so US3.1's
  "keep metadata public so the saga list renders" requirement is ALREADY satisfied by the list endpoint. Only
  `getLesson(id)` leaks `slides`. Scope US3.1 to `getLesson(id)` accordingly.

## Decision 1 — where the in-app pricing page lives
Answer: React page takes `/pricing`; the static compliance page moves to `/pricing-legal`

New information from the owner that invalidates the reviewer's premise: **Paddle has already verified and
approved this domain.** Approval is granted per domain, not per page, so changing what `/pricing` serves does
not trigger a new review and there is nothing to re-submit. The reviewer's recommended option (a) existed only
to avoid a re-submission cost that does not exist.

Therefore:
- The designed in-app React page becomes the canonical `/pricing` (register the SPA path so the catch-all
  serves it; the static `res.sendFile` handler for `/pricing` is removed or re-pointed).
- `connect-four/server/pricing.html` is **retained**, served at `/pricing-legal`, and linked from the footer
  alongside `/terms`. It is NOT deleted and NOT submitted anywhere. Rationale: it preserves a server-rendered
  copy of the Merchant-of-Record clause, the 14-day refund statement, and the `/terms` link on the approved
  domain, in case a future Paddle spot-check does not execute JavaScript.
- Its hardcoded price literals (`$2.99` / `$21.99` / `39%` / `$1.83`) must still be de-hardcoded or removed, so
  OI-41's drift risk is closed on both surfaces.

Consequent epic edits:
- Rewrite Settled decision #6: the "keep `pricing.html` at `/pricing` until Paddle domain review is verified"
  constraint is **superseded** — the domain is already approved. Replace it with the `/pricing` +
  `/pricing-legal` arrangement above. Remove the corresponding "do not remove `pricing.html` before
  verification" item from `NOT included`, replacing it with "do not delete `pricing.html`" (it moves, it does
  not disappear).
- US3.4's Paddle-domain-review verification task drops from a **blocking gate** to a **note**: confirm via the
  `paddle-docs` MCP server that no re-submission is required for a content change on an already-approved
  domain, but do not block the story on it.
- The CSP re-verification requirement is UNCHANGED and still blocking: CSP must be verified against the
  Express-served `dist/` build, never `npm run dev` (Vite enforces no CSP).
- The `PADDLE_API_KEY`-unset 503 degraded state for `GET /api/paddle/config` is UNCHANGED and still required.

## Decision 2 — unentitled response shape for `GET /api/lessons/:id`
Answer: 200 with a redacted stub

Return `{ id, title, order, free, locked: true }` with **no** `slides`. Rationale: the lesson list endpoint
already publishes exactly that metadata to every caller, so the stub leaks nothing new, and it lets a
locked-lesson screen render a real title plus an upgrade CTA instead of an error. This resolves the epic's
last remaining `Open question` — remove it from `Open questions` and record it as a Settled decision. The
`locked: true` flag is part of the API contract US3.1's integration test asserts; document it in
`docs/architecture/api-conventions.md`.
