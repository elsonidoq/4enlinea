## 1. What "one tier-check interface" actually is (US3.2)
Decision: **New `GET /api/user/entitlement` endpoint + cached client** — the entitlement answer is computed
server-side from `users.tier`, and the client holds a short-TTL cache invalidated explicitly on checkout
return. The same server code path must also serve US3.1's server-side lesson gate, so client and server
cannot drift. The spec must define the failure policy (fail-open vs fail-closed) when the endpoint is
unreachable, and must define the cache TTL and every invalidation trigger.

Consequence the fix agent MUST fold in: the epic's US3.2 instruction to "implement on top of
`getSubscriptionStatus`" is not literally executable. `connect-four/server/paymentProcessor.js:47` is a pure
synchronous `tier === 'paid'` ternary with no I/O, and `docs/architecture/server-conventions.md`
§"PaymentProcessor Seam" says do NOT wire it into a call site unless a new requirement needs a derived
(non-`tier`) subscription status. This decision IS that new requirement, but the interface must actually read
the DB — a rename over the existing pure function gains no authority. Record that `server-conventions.md`
§PaymentProcessor Seam must be updated in the same change, and drop/replace the "implement on top of
`getSubscriptionStatus`" wording.

## 2. First-payment forgery window on the money path (US3.3)
Decision: **Accept and document the risk.** The current model — repeat payments cross-checked against the
stored `users.paddle_customer_id`, first payments trusted — is adequate for this app's risk profile, because
an attacker must spend real money to upgrade a stranger's account. Record this as a settled owner decision in
`docs/architecture/server-conventions.md` §"Identity binding on `transaction.completed` (OI-55)", replacing
the existing "unilateral judgment call, treat as a proposal" disclaimer with a dated owner ratification.
Explicitly name the accepted residual risks: grief-granting, and laundering a chargeback-able payment onto a
third-party account. No code change to the identity binding. US3.3 therefore reduces to: ratify + document,
then re-map or close OI-34 against Paddle's `verifyTransaction` sync-activation fallback and, if kept, add the
idempotent `upgrade_completed` write keyed on the transaction id, plus the `paddleProcessor.test.mjs`
extension.

## 3. Where the real pricing page lives (US3.4)
Decision: **In-app React route at `/pricing`** — served from the SPA so it reuses `src/lib/usePaddlePrices.js`
(live `GET /api/paddle/config` prices, `formatPrice`, `computeAnnualSavings`), the existing monthly/annual
toggle and savings-badge treatment from `src/components/UpgradeModal.jsx`, the i18n layer (Rioplatense voseo),
and `src/lib/useUpgradeCheckout.js` for the CTA into the existing Paddle overlay.

Two hard constraints the spec must carry as explicit, blocking tasks — both are UNVERIFIED premises, not
facts:
- **Paddle domain review on a JS-rendered page.** Paddle's domain review requires `/pricing` to be publicly
  reachable and to carry the Merchant-of-Record clause, the 14-day refund statement, and the `/terms` link
  verbatim (epic Settled decision #3). Nobody has confirmed that a client-rendered SPA route satisfies that
  reviewer. The spec must include a task to verify this against live Paddle documentation via the
  `paddle-docs` MCP server (per `CLAUDE.md`: never rely on training data for Paddle) BEFORE the old static
  page is removed, and must keep `connect-four/server/pricing.html` in place until that verification passes.
  If verification fails, the fallback is to keep the static page as the reviewer-facing compliance artifact
  and treat the React route as the in-app funnel.
- **CSP must be re-verified against the Express-served `dist/` build, not `npm run dev`.** Vite dev enforces
  no CSP, so a passing local smoke test proves nothing (memory `project_csp_helmet_traps`); Paddle CSP took
  five rounds of discovery (memory `project_paddle_integration`).

Additional required behaviour: `/api/paddle/*` routes all return 503 when `PADDLE_API_KEY` is unset, including
the public `GET /api/paddle/config` the page depends on — the spec must define the page's degraded state when
prices are unavailable.
