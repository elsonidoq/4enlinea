## Blocking issue 1 — US5's cold-boot recovery cannot work; T059 targets a module wiped on restart
Answer: Accept recommendation (auto-applied — no alternative)

`connect-four/src/lib/checkoutReturnFlow.js` is a plain in-memory module-level `let state = 'idle'` with four
string values, no payload field, no persistence — on a cold boot it resets and holds no nonce, so T060's
comparison can never match after a restart. Re-target T059 onto a carrier that survives a restart:

- **Preferred:** append the nonce to the checkout **return path**. `useUpgradeCheckout(returnPathOverride)`
  builds `const returnPath = returnPathOverride || window.location.pathname` and hands it to Paddle — a URL
  survives a full restart, the in-memory store does not.
- **Acceptable alternative if the return path proves unsuitable:** drop the nonce/return-flow coupling
  entirely and have T060 self-validate the `sessionStorage` entry (freshness timestamp + category match),
  which requires no change to `checkoutReturnFlow.js` at all.

Do NOT widen `checkoutReturnFlow.js` to carry a payload: its header comment declares `useUpgradeCheckout.js`
the sole writer and `CheckoutReturnBanner.jsx` a pure reader, and all five `UpgradeModal` call sites subscribe
to it and must keep calling `resetCheckoutReturnState()` — that is the OI-59 replay-on-subscribe fix, which
T061 must keep green.

Add an explicit acceptance step to T061 that simulates a **genuine cold boot** — fresh module state AND a reset
return-flow store — not merely a component remount. A remount-only test is what would let this ship broken.

## Blocking issue 2 — no task adds any user-facing text; Spanish fails silently
Answer: Accept recommendation (auto-applied — no alternative)

Add two US4 tasks:
- One adding the full `pricing.*` namespace (headings, the FR-022 "pricing temporarily unavailable" degraded
  state, the quota fallback copy, the CTA) plus `footer.pricingLegal` to `connect-four/src/i18n/en.json`.
- A paired one adding the **Rioplatense voseo** Spanish equivalents to `connect-four/src/i18n/es.json`.

Add both files to `plan.md`'s Source Code map. Make T043 (the pricing-page DOM test) assert against real
translation keys rather than hardcoded strings.

Why this is load-bearing: a missing translation key falls back to English **silently, with no error**, so the
Spanish build would ship a half-English pricing page with every test green. T043 as currently written mocks the
data sources, not the translation layer, so it cannot catch it.

## Blocking issue 3 — `frontend-conventions.md` would instruct future developers to undo this epic
Answer: Accept recommendation (auto-applied — no alternative)

`docs/architecture/frontend-conventions.md` §"Reading the user's tier — profile, never session" currently
mandates `store.getProfile().then(p => setTier(p.tier))` and names `PostSetSummaryScreen.jsx` as the canonical
precedent — the exact pattern, and the exact line, that T022–T026 delete.

Add a US2 task updating that section to make `getEntitlement()` the mandated pattern, **retaining** the "never
`session.tier`" warning. Add a US4 sub-note correcting `LegalFooter.jsx`'s documented "these links live outside
the SPA" claim, which becomes false once `/pricing` is an in-app route. Constitution Principle VIII makes doc
lockstep part of the definition of done; leaving this stale would point the next paid-status feature straight
back at a raw cached tier read, creating a sixth entitlement source.

Also apply the two minor items:
- `staging_checks.md` already contains a section headed **"## Epic 3 — Global UI/UX & Accessibility Polish
  (spec 043)"** — a *different* Epic 3. T044/T047 say "under this epic's section" and could land in the wrong
  place. Specify the exact heading text these tasks must create or append under.
- FR-005 (the lesson *list* endpoint stays unchanged) has no verifying task. Low risk since no task touches it,
  but add a one-line assertion to an existing US1 test task rather than a new task.

## Decision 1 — should the locked-lesson response carry an `authenticated` flag?
Answer: Drop `authenticated` from the lesson stub

Keep `authenticated` ONLY on `GET /api/user/entitlement`, where FR-033's session-lapse logic actually consumes
it. The locked-lesson body returns exactly the ratified shape: `{ id, title, order, free, locked: true }`, with
`slides` absent. Edit T004, T005, T011 and T014 accordingly — T014 in particular must not document the
divergent six-field version into `api-conventions.md`.

This restores agreement between the tasks, spec FR-002, the "Lesson (locked view)" Key Entity, and the epic's
Settled decision #7. The sixth field was an inference carried over from a different decision, not an
instruction. Distinguishing "Sign in" from "Upgrade" prompts on the three lesson screens is a product call
nobody has made — if it is ever wanted, it is a separate change with its own spec amendment.

## Decision 2 — a paying customer during a database outage
Answer: Treat "signed in previously, now `authenticated: false`" as a transient failure, not a downgrade

When `loadUser`'s DB read fails, the server treats the request as fully anonymous — correct and safe
server-side, and FR-010's fail-closed rule stays exactly as is. But the client must not read that as a
cancellation. Amend T019: if the client holds a last-known-good of `entitled: true` and receives
`{ entitled: false, authenticated: false }`, it attempts the single bounded session refresh; if the answer is
unchanged, it **keeps serving the last known "paid" answer until the cache window expires** rather than
accepting the downgrade. Add this as an extra case in T020's test list (making six scenarios, not five).

Rationale: the server-side gate is the real enforcement point and cannot be bypassed by a lenient client — no
paid content can leak — so a transient backend failure must never show a paying customer an upgrade prompt.
This deliberately pushes the client **further** open. Do NOT "harmonize" it with FR-010's server-side
fail-closed rule; the asymmetry is the design.

## Cross-cutting instruction (from the reviewer's systemic finding)
Two patterns produced all three blocking issues, and both should be swept once before finishing:
1. **Artifacts absent from `plan.md`'s Source Code map are invisible to the task generator.** `en.json`,
   `es.json` and `frontend-conventions.md` were never listed, so no task existed for any of them. Treat that
   map as the coverage frontier and ask once more: what else does this change make stale?
2. **The task list cites modules by intent rather than by shape.** T059 said "thread the nonce through
   `checkoutReturnFlow.js`" without anyone having opened that 80-line file. Every remaining "attach X to
   existing module Y" task deserves a read of Y before it is considered final.
