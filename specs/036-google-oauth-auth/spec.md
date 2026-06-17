# Feature Specification: Google OAuth Authentication

**Feature Branch**: `036-google-oauth-auth`
**Created**: 2026-06-16
**Status**: Draft
**Epic**: 7 — Auth & Onboarding

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New User Signs In With Google (Priority: P1)

A first-time visitor wants to save their puzzle progress across devices. They tap "Sign in" from any auth gate, see a single "Sign in with Google" button, tap it, go through Google's standard OAuth consent screen, and land back in the app already signed in with their local progress migrated to their account.

**Why this priority**: This is the core deliverable of the epic — replacing magic-link with Google OAuth. Without this, no other story can be validated.

**Independent Test**: Open the app anonymously, trigger an auth gate, tap "Sign in with Google", complete the Google OAuth flow, and confirm the session is established and the user returns to the app signed in.

**Acceptance Scenarios**:

1. **Given** an anonymous user is on any screen with an auth gate, **When** they tap the auth gate prompt, **Then** `AuthModal` opens showing only a "Sign in with Google" button (no email input, no magic-link form).
2. **Given** the user taps "Sign in with Google", **When** the browser is redirected to `/api/auth/oauth/google`, **Then** the server issues a 302 redirect to Supabase's OAuth authorize endpoint with `provider=google` and `redirect_to` set to the app's `FRONTEND_URL`.
3. **Given** the user completes Google's OAuth consent screen, **When** Supabase redirects back to the app with `#access_token=…` in the URL hash, **Then** `ProfileStore.checkSession` picks up the token, calls `POST /api/auth/callback`, sets httpOnly cookies, swaps from `IndexedDBStore` to `SupabaseStore`, and the user is now signed in.
4. **Given** the user was previously anonymous with locally recorded puzzle attempts, **When** sign-in completes, **Then** `migrateToSupabase` is called automatically, migrating local IndexedDB data to the server before the session is confirmed.

---

### User Story 2 - Returning User Session Persists Across Page Loads (Priority: P2)

A signed-in user closes and reopens the app. The app should restore the session from the httpOnly cookie without requiring another OAuth flow.

**Why this priority**: Session persistence is a core auth concern. Without it, users must re-authenticate every visit, destroying the value of signing in.

**Independent Test**: Sign in, close the browser, reopen the app, and confirm the session is restored automatically without redirecting to Google.

**Acceptance Scenarios**:

1. **Given** a user previously signed in via Google OAuth, **When** they reload the page or open a new tab, **Then** `checkSession` reads the `sb_access_token` cookie via `GET /api/auth/session` and restores the signed-in state with no user action required.
2. **Given** a user whose access token has expired, **When** `GET /api/auth/session` fails with 401, **Then** `checkSession` returns the user to anonymous mode. There is no automatic token refresh — an expired or invalid cookie drops the session silently. Session refresh is not in scope for this epic.

---

### User Story 3 - Magic-Link UI Is Fully Removed (Priority: P3)

A developer or existing user encounters no remnant of the magic-link flow anywhere in the app — no email input, no "Check your inbox" confirmation screen, no magic-link-specific i18n strings surfaced in the UI.

**Why this priority**: Leaving residual magic-link UI creates confusion and dead-end interactions. Removal is a scope requirement of the epic, not an enhancement.

**Independent Test**: Open `AuthModal`, inspect its rendered output, and confirm no email field, no magic-link send button, and no "Check your inbox" phase is present. Grep the codebase for removed i18n keys to confirm they are not referenced.

**Acceptance Scenarios**:

1. **Given** any user opens `AuthModal`, **When** the modal renders, **Then** it shows only the "Sign in with Google" button (plus the dev-only skip button in `DEV` builds).
2. **Given** the magic-link i18n keys (`auth.sendLink`, `auth.checkEmail`, `auth.continueWithEmail`, `auth.checkInbox`, `auth.magicLinkSent`) are removed from `en.json`, **When** the codebase is searched for references to these keys, **Then** no live component or screen references them.
3. **Given** the `POST /api/auth/magic-link` endpoint is removed, **When** a request is made to that path, **Then** the server returns 404.

---

### User Story 4 - Dev-Environment Bypass Preserved (Priority: P4)

In development builds, developers need a way to skip auth entirely (e.g. for UI testing without completing an OAuth flow). The existing "Dev: skip auth" button must survive the modal rewrite.

**Why this priority**: Loss of the dev bypass would slow down all local development that requires a signed-in session.

**Independent Test**: In a `DEV` build, open `AuthModal` and confirm the dashed "Dev: skip auth" button is present and still calls `POST /api/auth/anonymous` then closes the modal.

**Acceptance Scenarios**:

1. **Given** the app is running with `import.meta.env.DEV === true`, **When** `AuthModal` opens, **Then** a dashed "Dev: skip auth" button is visible below the Google button.
2. **Given** the dev button is tapped, **When** the `POST /api/auth/anonymous` call completes, **Then** the modal closes and `refetchSession` is called to refresh the session state.

---

### User Story 5 - External Auth Infrastructure Configured (Priority: P5)

Staging and production environments are configured so that Google OAuth callbacks succeed end-to-end. This is an infrastructure task rather than a UI task, but it is a hard requirement for the feature to function.

**Why this priority**: No amount of correct application code can make Google OAuth work without correct Supabase and Google Cloud Console configuration.

**Independent Test**: Trigger the OAuth flow on the staging deployment. Confirm the redirect chain completes without error and the user lands in the app signed in.

**Acceptance Scenarios**:

1. **Given** the Google OAuth credential exists in Google Cloud Console with the Supabase callback URI registered, **When** the OAuth flow is triggered, **Then** Google redirects to Supabase without an "invalid redirect URI" error.
2. **Given** Supabase has the Google provider enabled with the correct Client ID and Secret, **When** Supabase receives the Google callback, **Then** it redirects to `FRONTEND_URL` with the `#access_token=…` hash.
3. **Given** `FRONTEND_URL` is listed in each Supabase project's Auth → URL Configuration → Redirect URLs, **When** Supabase attempts to redirect to the app, **Then** the redirect is accepted (not blocked as an unlisted URL).

---

### Edge Cases

- What happens if the user cancels the Google OAuth consent screen? The browser returns to the app with no hash token; `checkSession` finds nothing to process and the user remains anonymous. The auth modal should close or redirect back to the triggering surface without an error state.
- What happens if `POST /api/auth/callback` fails (e.g. Supabase is unavailable)? The user remains anonymous. No partial session state is left behind.
- What happens if a user visits the app during the OAuth redirect (i.e., lands on the app root with the `#access_token=` hash but `checkSession` runs while Supabase is temporarily unreachable)? The hash is not cleared; a subsequent reload will retry. Current `checkSession` behavior already handles this case.
- What happens on the staging environment before the Google Cloud Console credential is created? The `GET /api/auth/oauth/google` endpoint redirects to Supabase, but Supabase will return an error because the Google provider is not yet enabled. This is a configuration gap, not an application bug — document in the checklist as a pre-ship step.
- What happens if `FRONTEND_URL` is not set on the server? `GET /api/auth/oauth/google` falls back to `http://localhost:5173` as the `redirect_to`, which will fail in production. The spec requires `FRONTEND_URL` to be set in each environment's server env.

## Requirements *(mandatory)*

### Functional Requirements

**Server-side new endpoint:**

- **FR-001**: The server MUST expose `GET /api/auth/oauth/google` that responds with a `302 Found` redirect to `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(FRONTEND_URL)}`. `FRONTEND_URL` is an absolute URL containing `://` and MUST be percent-encoded or Supabase will reject or mis-parse the redirect target. No session is created or token handled in this endpoint — it is a pure redirect.
- **FR-002**: The `GET /api/auth/oauth/google` endpoint MUST use the existing `SUPABASE_URL` and `FRONTEND_URL` server environment variables. No new environment variables are required.
- **FR-003**: The `GET /api/auth/oauth/google` route comment MUST follow the project convention: `// GET /api/auth/oauth/google — redirect to Supabase Google OAuth`.

**Server-side removed endpoint:**

- **FR-004**: The `POST /api/auth/magic-link` endpoint MUST be removed from `server/index.js`.

**Frontend — AuthModal rewrite:**

- **FR-005**: `AuthModal` MUST be rewritten to a single-screen modal containing only:
  - An icon / branding element at the top.
  - A title (using the existing `auth.signIn` i18n key).
  - A subtitle (using the existing `auth.subtitle` i18n key).
  - A "Sign in with Google" button that navigates the browser to `${API}/api/auth/oauth/google` (full-page navigation, not `fetch`).
  - A "Maybe later" dismiss button (using the existing `auth.dismiss` i18n key).
  - In `DEV` builds only: the existing dashed "Dev: skip auth" button calling `POST /api/auth/anonymous` then `refetchSession()` and `onClose()`.
- **FR-006**: All state variables specific to the magic-link flow (`email`, `sent`, `loading`, `error`) and the two-phase form UI (`handleSend`, `handleBack`, the confirmation screen) MUST be removed from `AuthModal`.
- **FR-007**: The "Sign in with Google" button MUST call `track('signup_initiated', { method: 'google' })` before navigating to the OAuth endpoint.
- **FR-008**: `AuthModal` MUST retain the `onClose` and `reason` props for API compatibility with existing callers (`AuthGate`).
- **FR-008a**: When `AuthModal` receives a non-empty `reason` prop, it MUST display the `reason` string as a contextual line above the "Sign in with Google" button. This replaces the subtitle (`auth.subtitle`) for that render — the subtitle is shown only when `reason` is absent or empty. Example call site: `<AuthModal reason="Create a free account to unlock Deep Reveals" />`.
- **FR-008b**: `DeepRevealPane.jsx` MUST be updated to pass `reason={t('auth.deepRevealGate')}` instead of `reason="deep_reveal"` when rendering `AuthModal`. `auth.deepRevealGate` is the i18n key (`"Create a free account to unlock 20 Deep Reveals per week."`) — it MUST NOT be removed in FR-010.
- **FR-009**: `AuthGate` (co-located in `AuthModal.jsx`) MUST remain unchanged.

**i18n:**

- **FR-010**: The following keys MUST be removed from `en.json` under the `auth` namespace: `sendLink`, `checkEmail`, `continueWithEmail`, `checkInbox`, `magicLinkSent`, `sendError`, `email`. `sendError`'s only two call sites are inside `handleSend`, which is deleted in FR-006. `email` is already unreferenced in production. Total removals: 7 keys.
- **FR-011**: A new key `auth.continueWithGoogle` MUST be added to `en.json` with the value `"Sign in with Google"` for use as the button label.
- **FR-012**: `es.json` has no `auth` section. New keys will fall back to English. No Spanish translations for the new auth keys are required for this epic.

**Documentation:**

- **FR-013**: The `Auth Integration` section of `docs/architecture/frontend-conventions.md` (lines 65–78) MUST be rewritten to describe the current server-mediated, httpOnly-cookie model. The stale references to `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`, and `getSupabaseClient()` MUST be removed. The only frontend environment variable for auth is `VITE_API_BASE_URL`.
- **FR-014**: The `Environment Variables` table in `frontend-conventions.md` MUST be updated to remove `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` rows (they do not exist in the frontend).
- **FR-015**: The `POST /api/auth/callback` route comment in `server/index.js` MUST be updated from "exchange magic-link tokens" to a provider-agnostic description (e.g. "exchange OAuth tokens for httpOnly cookies").

**Infrastructure (per environment — staging and production):**

- **FR-016**: A Google OAuth 2.0 credential (Client ID + Client Secret) MUST be created in Google Cloud Console with the authorized redirect URI set to `https://<supabase-project-ref>.supabase.co/auth/v1/callback` for each environment.
- **FR-017**: The Google auth provider MUST be enabled in each Supabase project dashboard (Auth → Providers → Google) with the correct Client ID and Secret.
- **FR-018**: The app's `FRONTEND_URL` (staging URL and production URL respectively) MUST be added to Auth → URL Configuration → Redirect URLs in each Supabase project.

### Key Entities

- **AuthModal**: The sign-in modal component. After this epic it has a single screen with one action button. Co-located with `AuthGate` in `src/components/AuthModal.jsx`.
- **Google OAuth redirect endpoint**: `GET /api/auth/oauth/google` — new server route; a stateless 302 redirect initiating the OAuth flow.
- **OAuth callback flow**: Unchanged — the `#access_token=` hash → `POST /api/auth/callback` → httpOnly cookie path in `ProfileStore.checkSession` already handles Google OAuth tokens identically to magic-link tokens.
- **`FRONTEND_URL`**: Server-side environment variable (already exists). Used in the redirect target of the new `GET /api/auth/oauth/google` endpoint and must be allowlisted in Supabase redirect URLs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can complete registration or sign-in via Google OAuth end-to-end in under 60 seconds from tapping the auth gate to landing back in the app as a signed-in user.
- **SC-002**: The magic-link sign-in flow is fully absent from the UI — no email input field, no magic-link confirmation screen, and no magic-link-specific i18n keys are rendered by any live component.
- **SC-003**: The `POST /api/auth/magic-link` endpoint returns 404 on any environment where this spec is deployed.
- **SC-004**: Returning users' sessions are restored from cookie on page load without requiring re-authentication, in 100% of cases where the cookie is valid.
- **SC-005**: The `frontend-conventions.md` auth section accurately describes the server-mediated model and contains no references to the client Supabase SDK or removed env vars.
- **SC-006**: The OAuth flow succeeds end-to-end on both staging and production environments (post infrastructure setup).

## Assumptions

- `SUPABASE_URL` and `FRONTEND_URL` environment variables are already set on the server in both staging and production. No new server env vars are needed.
- The only frontend env var needed for auth is `VITE_API_BASE_URL`, which already exists. No client-side Supabase SDK or env vars are introduced.
- The existing `POST /api/auth/callback` endpoint requires no code changes — it already works for Google OAuth tokens (it calls `supabase.auth.getUser(access_token)`, which is auth-method agnostic).
- `ProfileStore.checkSession` requires no code changes — the `#access_token=` hash processing path it already has handles the Google OAuth redirect return leg identically to magic-link.
- `migrateToSupabase` in `IndexedDBStore` requires no changes — the migration is auth-method agnostic.
- `es.json` has no `auth` section; Spanish auth UI falls back to English. This is explicitly accepted for this epic.
- Full-page navigation (`window.location.href = ...`) is the correct mechanism for initiating the Google OAuth redirect (so the browser follows the redirect chain to Google and back). A `fetch()` call to the endpoint would only follow the redirect server-side and not work for OAuth.
- Account linking or merging across providers (e.g. a user who previously used magic-link with the same email now using Google OAuth) is out of scope. Supabase handles this at the identity level; no application-level merge logic is required.
- Auth email template redesign is out of scope — Google OAuth sends no app-side auth emails.
- Profile/settings redesign, 2FA, and other auth provider additions (Apple, GitHub, etc.) are out of scope.
