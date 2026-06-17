---
name: project-spec036-google-oauth
description: Spec 036 — Google OAuth replaces magic-link; spec/plan/tasks complete at specs/036-google-oauth-auth/
metadata: 
  node_type: memory
  type: project
  originSessionId: eeccfcf5-fd26-4620-a25e-6d295f81cc1c
---

**Spec 036 — Google OAuth Auth** is complete (spec/plan/tasks) at `specs/036-google-oauth-auth/`.

**What it does:** Replaces magic-link sign-in with Google OAuth as the sole auth method. Magic-link is removed entirely. No email+password.

**Key architecture decisions:**
- New `GET /api/auth/oauth/google` server endpoint 302-redirects to `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(FRONTEND_URL)}`. The frontend button does `window.location.href` (NOT `fetch()`).
- The callback leg (`#access_token=` hash → `POST /api/auth/callback` → httpOnly cookies) is unchanged — `ProfileStore.checkSession` handles Google OAuth identically to the old magic-link path.
- Anonymous→account migration (`switchToSupabase()` → `migrateToSupabase()`) requires zero changes.
- `encodeURIComponent` on `redirect_to` is load-bearing — raw `://` breaks Supabase URL parsing.

**i18n changes:** Remove 7 keys from `en.json` (`sendLink`, `checkEmail`, `continueWithEmail`, `checkInbox`, `magicLinkSent`, `sendError`, `email`). Add `auth.continueWithGoogle`. Keep `auth.deepRevealGate` (used by `DeepRevealPane.jsx`).

**DeepRevealPane.jsx trap:** Currently passes `reason="deep_reveal"` (raw slug) to `AuthModal`. Must be changed to `reason={t('auth.deepRevealGate')}` in T002 — otherwise the slug renders literally on screen.

**Infrastructure (pre-deploy gate):** Google Cloud Console OAuth credential + Supabase provider enable + redirect URL allowlist — one set per environment. Must complete before deploying each environment. Production FR-018 closes [[bug_auth_magic_link_redirect]].

**Why:** Spec 030 removed the client-side Supabase SDK (commit `87f2818`), making `supabase.auth.signInWithOAuth()` impossible. All auth is server-mediated via httpOnly cookies.

**How to apply:** When implementing: T001 (server endpoint) → T002 (AuthModal + DeepRevealPane + i18n) → T003 (update frontend-conventions.md auth section). Unit test for URL builder lives in `server/authUtils.test.js`.
