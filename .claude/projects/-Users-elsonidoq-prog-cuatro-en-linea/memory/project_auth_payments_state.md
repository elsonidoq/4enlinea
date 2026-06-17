---
name: project-auth-payments-state
description: Auth is mostly built and ships early; payments deferred to end of development (provider TBD)
metadata: 
  node_type: memory
  type: project
  originSessionId: eeccfcf5-fd26-4620-a25e-6d295f81cc1c
---

**Auth infrastructure is substantially complete:**
- `ProfileStore.jsx` — Supabase client, `onAuthStateChange`, `switchToSupabase` with migration
- `AuthModal.jsx` — magic link OTP flow, `AuthGate` component
- `IndexedDBStore.js` — anonymous local store (IndexedDB, not localStorage); `migrateToSupabase` implemented
- `SupabaseStore.js` — authenticated store, same interface
- Migration flow: on sign-in, IndexedDB bulk-inserts to Supabase then clears

**What the auth epic (Epic 7 / Spec 036) actually does:**
- Replace magic-link with Google OAuth as the sole sign-in method (magic-link removed entirely)
- New `GET /api/auth/oauth/google` server endpoint 302-redirects to Supabase authorize URL
- `AuthModal` rewritten: email form removed, single "Sign in with Google" button added
- See [[project-spec036-google-oauth]] for full implementation details

**Auth infrastructure notes (post-spec-030):**
- The client-side Supabase SDK was removed in commit `87f2818` — no `getSupabaseClient()`, no anon key in frontend
- Auth is now fully server-mediated via httpOnly cookies (`sb_access_token`, `sb_refresh_token`)
- `ProfileStore.jsx` uses `POST /api/auth/callback` + `GET /api/auth/session` — no Supabase client calls
- `frontend-conventions.md` auth section is stale (still describes removed client-SDK model); T003 of spec 036 will fix it

**Payments:**
- Stripe server routes already exist (`/api/stripe/create-checkout`, `/api/stripe/webhook`, `/api/stripe/portal`)
- `stripe_events` table, `users.tier`, `users.stripe_customer_id` already in DB
- **Deferred to end of development** — payment provider not yet decided
- `UpgradeModal` shows waitlist email capture only; `users.tier` stays `'free'` for all until payment epic

**Why:** User wants to build and validate the product before committing to a payment provider.

**How to apply:** Don't propose Stripe work until after all learning surfaces are built. Don't remove existing Stripe routes — just don't wire them to any UI.
