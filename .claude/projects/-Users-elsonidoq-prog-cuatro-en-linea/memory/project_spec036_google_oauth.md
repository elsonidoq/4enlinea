---
name: project-spec036-google-oauth
description: Google OAuth auth — gotchas and invariants
metadata: 
  node_type: memory
  type: project
  originSessionId: eeccfcf5-fd26-4620-a25e-6d295f81cc1c
---

**Google OAuth auth** replaces magic-link. Magic-link is gone; no email+password.

**Key invariants:**
- `GET /api/auth/oauth/google` 302-redirects to Supabase. The frontend button does `window.location.href` (NOT `fetch()`).
- The callback leg (`#access_token=` hash → `POST /api/auth/callback` → httpOnly cookies) — `ProfileStore.checkSession` handles Google OAuth identically to the old magic-link path.
- `encodeURIComponent` on `redirect_to` is load-bearing — raw `://` breaks Supabase URL parsing.
- Client-side `supabase.auth.signInWithOAuth()` is impossible — Spec 030 removed the client-side Supabase SDK. All auth is server-mediated via httpOnly cookies.

**i18n:** Magic-link keys (`sendLink`, `checkEmail`, `continueWithEmail`, `checkInbox`, `magicLinkSent`, `sendError`, `email`) are removed. `auth.continueWithGoogle` added. Keep `auth.deepRevealGate` (used by `DeepRevealPane.jsx`).

**DeepRevealPane.jsx trap:** If `reason` is passed as a raw slug string (e.g. `reason="deep_reveal"`) to `AuthModal`, it renders literally on screen. Must use `reason={t('auth.deepRevealGate')}`.

**Infrastructure (pre-deploy gate):** Google Cloud Console OAuth credential + Supabase provider enable + redirect URL allowlist — one set per environment. Must complete before deploying each environment.
