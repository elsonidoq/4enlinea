# Implementation Plan: Google OAuth Authentication

**Branch**: `036-google-oauth-auth` | **Date**: 2026-06-16 | **Spec**: `specs/036-google-oauth-auth/spec.md`
**Input**: Feature specification from `/specs/036-google-oauth-auth/spec.md`

## Summary

Replace the magic-link auth flow with Google OAuth as the sole sign-in method. The change consists of four parts: (1) adding a stateless `GET /api/auth/oauth/google` redirect endpoint on the server, (2) rewriting `AuthModal` to a single-screen Google-only modal and removing all magic-link state and UI, (3) pruning the 7 removed i18n keys atomically with the code that references them, and (4) updating `frontend-conventions.md` to document the current server-mediated httpOnly-cookie auth model. The existing OAuth callback path (`#access_token` hash → `POST /api/auth/callback` → httpOnly cookie → `ProfileStore.checkSession`) requires **zero code changes** — it already handles Google tokens identically to magic-link tokens. Infrastructure setup (Google Cloud Console + Supabase dashboard configuration) is a pre-ship checklist, not a code task.

## Technical Context

**Language/Version**: Node.js (Express 5) — server; React 18 — frontend  
**Primary Dependencies**: Express, `@supabase/supabase-js` (server service-role only), `react-i18next`, `import.meta.env`  
**Storage**: No schema changes. Supabase `users` table unchanged.  
**Testing**: Manual golden-path verification on staging (OAuth round-trip). No automated test files to add or modify.  
**Target Platform**: Browser (web app, mobile-responsive PWA)  
**Performance Goals**: `GET /api/auth/oauth/google` is a pure 302 redirect — sub-millisecond, no solver or DB call.  
**Constraints**: The Google OAuth button **must** use full-page navigation (`window.location.href = ...`), not `fetch()`. A fetch would follow the redirect server-side and fail to initiate the browser OAuth flow.  
**Scale/Scope**: Small — 3 server lines added, ~100 lines removed from AuthModal, 7 i18n keys removed, 1 key added, ~15 doc lines updated.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I — Explanation Engine as Single Source of Truth**: Not applicable. This epic touches auth only; no move evaluations or annotations.

**Principle II — Code Quality & Simplicity**:
- ✅ No speculative abstractions. The new endpoint is 3 lines; the modal rewrite removes ~80 lines net.
- ✅ No half-finished implementations. The callback path already works — nothing is stubbed.
- ✅ Storage-agnostic interface honored. `ProfileStore` is unchanged; `AuthModal` calls `refetchSession()` through the store hook.
- ✅ Comments follow the convention: `// GET /api/auth/oauth/google — redirect to Supabase Google OAuth` (spec FR-003).

**Principle III — Testing Standards**:
- ✅ No solver-dependent feature. Manual golden-path verification required before marking complete.
- No new test files required. Existing `checkSession` flow tests (if any) are unaffected.

**Principle IV — UX Consistency**: The new modal is simpler (one screen). Progressive disclosure not changed; auth is pre-content, not part of the explanation surface.

**Principle V — Performance**: The redirect endpoint returns synchronously in <1 ms. No latency risk.

**Principle VI — Implementation & Debugging Methodology**:
- ✅ `POST /api/auth/callback` was verified to work for Google OAuth before this spec was written (Epic 7 decisions, `TODOs_epics.md`). Assumption confirmed empirically.

**Principle VII — Software Design Philosophy**:
- ✅ Explicit over implicit: the Google button uses `window.location.href`, making the full-page-navigation requirement visible at the call site.
- ✅ Simpler after the change than before (two-phase form → single button).

**Principle VIII — Documentation**:
- ✅ Existing architecture docs read before this plan was drafted.
- ✅ `frontend-conventions.md` stale auth section will be updated as part of this spec (FR-013, FR-014).
- ✅ New `GET /api/auth/oauth/google` endpoint contract documented in `specs/036-google-oauth-auth/contracts/api-auth-oauth-google.md`.

## Project Structure

### Documentation (this feature)

```text
specs/036-google-oauth-auth/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/
│   └── api-auth-oauth-google.md   # GET /api/auth/oauth/google contract
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (files touched)

```text
connect-four/
├── server/
│   └── index.js                              # ADD GET /api/auth/oauth/google; REMOVE POST /api/auth/magic-link; UPDATE callback comment
└── src/
    ├── components/
    │   ├── AuthModal.jsx                     # REWRITE (magic-link → Google OAuth)
    │   └── DeepRevealPane.jsx                # UPDATE reason prop → t('auth.deepRevealGate') (FR-008b)
    └── i18n/
        ├── en.json                           # REMOVE 7 keys; ADD auth.continueWithGoogle
        └── es.json                           # No changes (no auth section)
docs/
└── architecture/
    └── frontend-conventions.md              # UPDATE §Auth Integration + §Environment Variables
```

## Phase 0: Research

All NEEDS CLARIFICATION items were pre-resolved by the spec and epic decisions document. Findings are recorded in `research.md`.

Key confirmed decisions:
1. **Full-page navigation for Google OAuth**: `window.location.href = \`${API}/api/auth/oauth/google\`` (not fetch). Full-page nav is required so the browser follows the redirect chain to Google's consent screen and back.
2. **`redirect_to` encoding**: `FRONTEND_URL` must be `encodeURIComponent`-encoded in the `GET /api/auth/oauth/google` handler. Supabase rejects an un-encoded absolute URL with `://` in a query parameter.
3. **Callback path unchanged**: `ProfileStore.checkSession` already processes `#access_token=` hashes from Google OAuth redirects identically to magic-link redirects. No changes to `ProfileStore.jsx` or `POST /api/auth/callback`.
4. **`POST /api/auth/refresh` stays in place, unwired**: It exists, no callers wire it post this epic. Do not remove or wire it.
5. **`reason` prop display**: When `AuthModal` receives a non-empty `reason`, it replaces the `auth.subtitle` line with the `reason` string verbatim. Both branches (with/without reason) must be handled.
6. **`auth.sendError` and `auth.email` removal**: Confirmed present in `en.json` (see research.md grep output). Both are removed in FR-010 together with the other 5 magic-link keys.
7. **`AuthGate` unchanged**: The component is co-located in `AuthModal.jsx` and must survive the rewrite intact.

## Phase 1: Design & Contracts

### Data Model

No new DB tables, columns, or migrations. The existing `users` table and all Supabase auth tables are unchanged.

See `data-model.md` for confirmation.

### API Contracts

#### New endpoint: `GET /api/auth/oauth/google`

Full contract in `contracts/api-auth-oauth-google.md`.

**Route**: `GET /api/auth/oauth/google`  
**Auth**: None required. Runs through `loadUser` (global middleware) but `req.user` is irrelevant.  
**Response**: `302 Found` with `Location: ${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(FRONTEND_URL)}`  
**Error**: `503` if `SUPABASE_URL` is not set (uses existing `if (!supabase)` guard pattern).  
**FRONTEND_URL fallback**: `http://localhost:5173` (same pattern as existing magic-link and Stripe endpoints).  
**Route comment** (required by FR-003): `// GET /api/auth/oauth/google — redirect to Supabase Google OAuth`

#### Removed endpoint: `POST /api/auth/magic-link`

Lines 176–199 of `server/index.js` are deleted in full. No replacement.

#### Updated comment: `POST /api/auth/callback`

Line 201 comment updated from:
> `// POST /api/auth/callback — exchange magic-link tokens for httpOnly cookies`

to:
> `// POST /api/auth/callback — exchange OAuth tokens for httpOnly cookies`

### Frontend AuthModal Rewrite

The rewritten `AuthModal` has one screen (no `sent` branch). State surface: zero stateful variables (all magic-link state removed). Structure:

```
<>
  <div className="sheet-backdrop" onClick={onClose} />
  <div className="modal-card">
    {/* icon — retain existing circle/user-SVG div from current AuthModal signIn branch */}
    <h3>{t('auth.signIn')}</h3>
    {reason
      ? <p>{reason}</p>
      : <p>{t('auth.subtitle')}</p>
    }
    <button className="btn btn-primary" onClick={() => { track('signup_initiated', { method: 'google' }); window.location.href = `${API}/api/auth/oauth/google`; }}>
      {t('auth.continueWithGoogle')}
    </button>
    <button className="btn btn-ghost" onClick={onClose}>{t('auth.dismiss')}</button>
    {import.meta.env.DEV && (
      <button onClick={async () => {
        try { await fetch(`${API}/api/auth/anonymous`, { method: 'POST', credentials: 'include' }); } catch (_) {}
        onClose();
        refetchSession();
      }}>
        🛠 Dev: skip auth
      </button>
    )}
  </div>
</>
```

Removed from `AuthModal`: `email`, `sent`, `loading`, `error` state; `handleSend`, `handleBack` functions; the two-phase JSX tree; the `<form>`, `<input>`, and confirmation screen.

Retained: `onClose` prop, `reason` prop, `AuthGate` export (unchanged).

### i18n Changes

**Keys removed from `en.json` `auth` namespace** (FR-010):
- `sendLink`
- `checkEmail`
- `continueWithEmail`
- `checkInbox`
- `magicLinkSent`
- `sendError`
- `email`

**Keys added to `en.json` `auth` namespace** (FR-011):
- `continueWithGoogle`: `"Sign in with Google"`

Removal is done in the same edit as the `AuthModal` rewrite (same task) to keep code and key removal atomic.

### Documentation Updates

**`docs/architecture/frontend-conventions.md`** — `§ Auth Integration` (lines 65–69) and `§ Environment Variables` table (lines 71–77):

Current (stale):
```
The frontend uses the Supabase anon key (VITE_SUPABASE_ANON_KEY) for auth only.
getSupabaseClient() (exported from ProfileStore.jsx) is the sole source of the Supabase client instance.
On auth state change, ProfileStore automatically swaps the store and tracks the signup_completed event.
```

Replacement:
```
The frontend has no Supabase SDK dependency. Auth is entirely server-mediated via httpOnly cookies:

1. **Sign-in initiation**: The "Sign in with Google" button navigates the browser to `GET /api/auth/oauth/google`,
   which issues a 302 redirect to Supabase's OAuth authorize endpoint.
2. **Return leg**: After Google consent, Supabase redirects to the app with `#access_token=…` in the URL hash.
   `ProfileStore.checkSession` detects the hash, calls `POST /api/auth/callback` with the token,
   and the server sets httpOnly `sb_access_token` and `sb_refresh_token` cookies.
3. **Session restore**: On page load, `checkSession` calls `GET /api/auth/session` to read the cookie
   and restore signed-in state.
4. **Sign-out**: `POST /api/auth/signout` clears the cookies.
5. **Store swap**: On successful sign-in, `ProfileStore` swaps `IndexedDBStore` for `SupabaseStore`
   and calls `migrateToSupabase` to migrate locally-recorded puzzle attempts.

The only frontend environment variable required for auth is `VITE_API_BASE_URL`.
There is no `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, or client-side Supabase SDK.
```

**Environment Variables table** — remove `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` rows.

### Pre-Ship Infrastructure Checklist (non-code, human-in-the-loop)

These steps are required before the OAuth flow can succeed on any deployed environment. They are dashboard actions, not code tasks. Add to a `## Pre-Ship Checklist` section at the top of `tasks.md`.

**For each environment (staging, production):**

1. **Google Cloud Console** (FR-016):
   - Create an OAuth 2.0 Client ID credential (type: Web application).
   - Add authorized redirect URI: `https://<supabase-project-ref>.supabase.co/auth/v1/callback`.
   - Note the Client ID and Client Secret.

2. **Supabase dashboard** (FR-017):
   - Auth → Providers → Google → Enable.
   - Paste the Client ID and Client Secret from step 1.

3. **Supabase redirect allowlist** (FR-018):
   - Auth → URL Configuration → Redirect URLs.
   - Add the app's `FRONTEND_URL` (staging URL for staging env; production URL for prod env).
   - This also resolves the open bug `bug_auth_magic_link_redirect.md`.

## Implementation Task Ordering

Tasks to be generated by `/speckit-tasks`. Prescribed ordering to satisfy the sequencing constraints in the handoff context:

1. **T-001 — Server: add `GET /api/auth/oauth/google`, remove `POST /api/auth/magic-link`, update callback comment**
   - Files: `connect-four/server/index.js`
   - Adds FR-001 / FR-002 / FR-003 / FR-004 / FR-015
   - No dependency on frontend tasks
   - Can be done first; unblocks manual testing of the redirect endpoint

2. **T-002 — Frontend: rewrite `AuthModal`, remove i18n keys, add `continueWithGoogle`**
   - Files: `connect-four/src/components/AuthModal.jsx`, `connect-four/src/i18n/en.json`, `connect-four/src/components/DeepRevealPane.jsx`
   - Covers FR-005 / FR-006 / FR-007 / FR-008 / FR-008a / FR-009 / FR-010 / FR-011
   - FR-008a is a detail inside the AuthModal rewrite — **not a separate task**
   - i18n key removal is **atomic with code removal** — same edit session, code first then keys
   - `AuthGate` block at bottom of file must be preserved verbatim
   - **DeepRevealPane.jsx sub-step**: In `DeepRevealPane.jsx`, change the `reason="deep_reveal"` prop on `AuthModal` to `reason={t('auth.deepRevealGate')}`. The `auth.deepRevealGate` key is already present in `en.json` with the correct copy ("Create a free account to unlock 20 Deep Reveals per week.") and is **not** in the FR-010 removal list — do not remove it.
   - **Button styling (FR-005)**: The "Sign in with Google" button uses `className="btn btn-primary"`, matching the current "Continue with Email" button. The dismiss button uses `className="btn btn-ghost"`. The existing icon `<div>` (circle with user SVG) at the top of the `signIn` branch is **retained** — do not remove it from the rewrite.

3. **T-003 — Docs: update `frontend-conventions.md` auth section**
   - Files: `docs/architecture/frontend-conventions.md`
   - Covers FR-013 / FR-014
   - No dependency on T-001 or T-002; can be done in any order
   - Note: `frontend-conventions.md` line 196 (`Authorization: Bearer <session.access_token>`) is knowingly left stale in this epic — it describes the old client-SDK fetch pattern, not the server-mediated model. A follow-up task is recorded in `TODOS_new.md`.

## Complexity Tracking

No constitution violations. All complexity tracking fields left empty.
