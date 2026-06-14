---
name: project-auth-payments-state
description: Auth is mostly built and ships early; payments deferred to end of development (provider TBD)
metadata:
  type: project
---

**Auth infrastructure is substantially complete:**
- `ProfileStore.jsx` — Supabase client, `onAuthStateChange`, `switchToSupabase` with migration
- `AuthModal.jsx` — magic link OTP flow, `AuthGate` component
- `IndexedDBStore.js` — anonymous local store (IndexedDB, not localStorage); `migrateToSupabase` implemented
- `SupabaseStore.js` — authenticated store, same interface
- Migration flow: on sign-in, IndexedDB bulk-inserts to Supabase then clears

**What the auth epic (Epic 7) actually needs to do:**
- Reskin `AuthModal` to new visual style (remove dark theme, keep i18n keys)
- Extend both stores for new data types: lesson progress, sparring record, challenge session, Deep Reveal weekly counter
- Fix `SupabaseStore.saveSessionStats`: currently guards on `tier === 'paid'`; should save for any authenticated user

**Payments:**
- Stripe server routes already exist (`/api/stripe/create-checkout`, `/api/stripe/webhook`, `/api/stripe/portal`)
- `stripe_events` table, `users.tier`, `users.stripe_customer_id` already in DB
- **Deferred to end of development** — payment provider not yet decided
- `UpgradeModal` shows waitlist email capture only; `users.tier` stays `'free'` for all until payment epic

**Why:** User wants to build and validate the product before committing to a payment provider.

**How to apply:** Don't propose Stripe work until after all learning surfaces are built. Don't remove existing Stripe routes — just don't wire them to any UI.
