# Contract: UpgradeModal plan toggle + post-checkout activation

## `UpgradeModal` (existing, `src/components/UpgradeModal.jsx`) — additive change only

**Preserved API** (per CLAUDE.md `feedback_spec_existing_apis` and the epic's explicit instruction):
```js
<UpgradeModal onDismiss={fn} onUpgrade={async (plan) => {...}} />
```
- `onDismiss` — unchanged, no signature change.
- `onUpgrade` — **signature extended** from `() => Promise<void>` (currently never actually passed by
  any call site — dead no-op) to `(plan: 'monthly' | 'annual') => Promise<void>`. Because no existing
  call site passes `onUpgrade` today, this is not a breaking change to any real caller — it's the first
  time the prop is wired at all.
- `uiState` internal state machine gets two new values: `'activating'` (post-payment, still polling) and
  `'timeout'` (bounded wait elapsed, still not confirmed) — both additive, `idle | loading | success`
  unchanged in meaning.

**New internal UI**: a monthly/annual segmented toggle rendered above the existing CTA button
(`t('upgrade.cta')` label unchanged; the toggle is new UI, existing strings untouched). Selecting a plan
does not itself call `onUpgrade` — only pressing the existing CTA button does, now passing the
currently-selected plan: `onUpgrade(selectedPlan)`.

## The 4 call sites (`PostSetSummaryScreen.jsx`, `SetPickerScreen.jsx`, `SagaScreen.jsx`,
`DeepRevealPane.jsx`)

All four gain a real `onUpgrade` handler for the first time:
```js
async function handleUpgrade(plan) {
  const res = await fetch(`${apiBase}/api/stripe/create-checkout`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error('checkout failed');
  const { checkoutUrl } = await res.json();
  window.location.href = checkoutUrl; // full navigation to Stripe Checkout — matches existing success/cancel_url round-trip design
}
```
This handler is identical in shape at all 4 sites — extract to a single shared hook/helper (e.g.
`src/lib/useUpgradeCheckout.js`) rather than duplicating 4 times, per Constitution Principle II (no
duplicated logic across near-identical call sites).

## Return-flow handling (`?checkout=success` / `?checkout=cancelled`)

**New**: a top-level effect (e.g. in `App.jsx` or a small dedicated component mounted at the root,
consistent with how the existing hash-callback handling in `ProfileStore` already inspects
`window.location` on mount) that:
1. Reads `?checkout=success` from the URL on load.
2. If present: strips the query param via `replaceState` (preserving `window.location.hash` per the
   `App.jsx:31` trap, even though checkout returns won't carry a hash in practice — consistency with the
   existing pattern), then triggers the bounded-wait poll described in `research.md` R4
   (`GET /api/auth/session`, `[0, 2, 4, 7, 10]`s schedule) via `refetchSession` (`ProfileStore` already
   exposes this).
3. Renders one of three states while `?checkout=success` is being resolved (FR-012/FR-013/SC-004):
   - Polling in progress → **"activating your subscription…"** banner/overlay (never the bare free-tier
     screen).
   - Poll resolves `tier === 'paid'` → banner dismissed, normal paid UI renders.
   - Poll exhausts the budget → **"payment received — still activating"** message with a manual
     "refresh" affordance that re-runs the same poll on demand.
4. `?checkout=cancelled` (FR-014): strip the query param, no banner, no error — user lands on the free
   tier exactly as if they'd dismissed the modal.

This state lives in a small new piece of app state (not Zustand/Redux — matches the project's existing
lightweight React-context store pattern, `ProfileStore.jsx`), not in `UpgradeModal` itself, since the
user may have already closed the modal (or never had it open, e.g. if they bookmarked the return URL)
by the time Stripe redirects back.

## Non-goals reaffirmed here (do not implement)

- No billing/invoice UI (existing `UpgradeModal` `success` state stays a single confirmation message).
- No proration UI, no plan-switch flow beyond the existing monthly/annual choice at initial upgrade time.
- No "remember me" checkbox anywhere in this flow.
