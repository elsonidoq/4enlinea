# Epic 7 — Auth & Onboarding: Brainstorming Decisions

**Date:** 2026-06-16
**Scope:** Resolves the two `#### Brainstorming needed` items in `TODOs_epics.md` Epic 7.

---

## Decision 1 — Which providers

**Decision:** Google OAuth is the sole authentication method. Magic-link is removed entirely. No email+password.

**Rationale:** Google OAuth covers the largest share of users with minimal setup (~30 min), produces a zero-friction sign-in UX (one button tap), and avoids the password-reset complexity of email+password. Magic-link is removed because it is the inferior experience the epic exists to replace.

### OAuth prerequisites (per environment)

For **each** Supabase project (staging and production):

1. **Google Cloud Console** — Create an OAuth 2.0 credential (Client ID + Client Secret).
   - Authorized redirect URI: `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
   - One credential per environment is simplest; alternatively, one credential with both redirect URIs.
2. **Supabase dashboard** — Auth → Providers → Google → enable, paste Client ID + Secret.
3. **`FRONTEND_URL` allowlist** — Add the environment's frontend URL to Auth → URL Configuration → Redirect URLs (already required by Epic 7 scope; carries over from the magic-link bug fix).

### Client-side integration

Use `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: <FRONTEND_URL> })`.
Supabase initiates the OAuth redirect. After Google auth, Supabase redirects to the app with `#access_token=…` in the URL hash — the **same code path as the current magic-link callback**. No changes to `ProfileStore.jsx` `checkSession` are needed.

---

## Decision 2 — Anonymous-to-account migration

**Decision:** No changes needed to `IndexedDBStore.migrateToSupabase` or the migration path.

**Rationale:** The migration is auth-method-agnostic. `ProfileStore.jsx` `switchToSupabase()` fires for any successful auth event and calls `migrateToSupabase()`. For Google OAuth, the callback lands with `#access_token=` in the hash; `checkSession` processes it identically to the magic-link path and calls `switchToSupabase({ user })`. The migration code itself (POST `/api/user/migrate` via httpOnly cookie) has no auth-method dependency.

**Store-path adjustments required:** None.

---

## Summary for epic update

Replace the two `#### Brainstorming needed` sections with `#### Decisions` containing:

- **Which providers:** Google OAuth only; magic-link removed; no email+password. Prerequisites: OAuth credential in Google Cloud Console with Supabase callback URI per environment; Google provider enabled in each Supabase project dashboard; `FRONTEND_URL` allowlisted in each project's Auth redirect URLs.
- **Anonymous-to-account migration:** No changes needed. Google OAuth uses the same `#access_token=` hash callback path as magic-link; existing `switchToSupabase` flow migrates IndexedDB data identically.
