# Tasks: Google OAuth Authentication

**Input**: `specs/036-google-oauth-auth/`
**Spec**: spec.md | **Plan**: plan.md | **Contract**: contracts/api-auth-oauth-google.md

---

## Pre-Ship Infrastructure Checklist

> Human-in-the-loop dashboard steps. Not code tasks. **HARD GATE: do not deploy or enable any environment for end-to-end OAuth testing until all three items below are checked for that environment.** With magic-link removed, a misconfigured environment has zero working sign-in. Repeat for both environments independently.

**For each environment (staging, production):**

- [ ] **FR-016 — Google Cloud Console**: Create an OAuth 2.0 Client ID credential (type: Web application). Add authorized redirect URI: `https://<supabase-project-ref>.supabase.co/auth/v1/callback`. Note the Client ID and Client Secret.
- [ ] **FR-017 — Supabase Provider**: Auth → Providers → Google → Enable. Paste the Client ID and Client Secret from the step above.
- [ ] **FR-018 — Supabase Redirect Allowlist**: Auth → URL Configuration → Redirect URLs. Add the environment's `FRONTEND_URL` (staging URL for staging; production URL for prod). Checking this box for production also closes open bug `bug_auth_magic_link_redirect.md`.

> **Do not mark any environment's checklist complete unless all three boxes above are checked for that environment.** Deploying code without completing the checklist leaves users with no sign-in path.

---

## Phase 1: Foundational — Server Changes

**Purpose**: Add the OAuth redirect endpoint and remove the magic-link endpoint. This must be complete before T002 (the frontend button navigates to this endpoint).

**⚠️ CRITICAL**: T002 cannot be manually tested end-to-end until this phase is deployed or running locally.

- [ ] T001 [US1] [US3] Add `GET /api/auth/oauth/google`, remove `POST /api/auth/magic-link`, and update callback comment in `connect-four/server/index.js`

  **Details for T001**:

  1. **Add** the new route **before** the `POST /api/auth/callback` block (around line 175). Use the exact implementation from `contracts/api-auth-oauth-google.md`:
     ```js
     // GET /api/auth/oauth/google — redirect to Supabase Google OAuth
     app.get('/api/auth/oauth/google', (req, res) => {
       if (!supabase) return res.status(503).json({ error: 'Auth not configured' });
       const redirectTo = process.env.FRONTEND_URL || 'http://localhost:5173';
       const authorizeUrl = `${process.env.SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
       res.redirect(authorizeUrl);
     });
     ```
     `encodeURIComponent` is **required** on `redirectTo` — `FRONTEND_URL` contains `://` and Supabase will reject an un-encoded absolute URL in a query parameter.

  2. **Delete** lines 176–199 (`POST /api/auth/magic-link`) in their entirety. No replacement.

  3. **Update** the comment on `POST /api/auth/callback` from:
     `// POST /api/auth/callback — exchange magic-link tokens for httpOnly cookies`
     to:
     `// POST /api/auth/callback — exchange OAuth tokens for httpOnly cookies`

  4. **Extract the `authorizeUrl` construction into a pure helper function** to enable unit testing. Move the URL-building logic out of the route handler into a named export (or module-local function) in `connect-four/server/index.js` (or a small utility file `connect-four/server/authUtils.js`):
     ```js
     // Pure function — no side effects, no Express dependency
     function buildGoogleAuthorizeUrl(supabaseUrl, frontendUrl) {
       return `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(frontendUrl)}`;
     }
     ```
     Update the route handler to call `buildGoogleAuthorizeUrl(process.env.SUPABASE_URL, redirectTo)`.

  5. **Add a `node --test` unit test** for `buildGoogleAuthorizeUrl`. Create `connect-four/server/authUtils.test.js` (or add to an existing server test file if one exists):
     ```js
     import { test } from 'node:test';
     import assert from 'node:assert/strict';
     import { buildGoogleAuthorizeUrl } from './authUtils.js'; // adjust path as needed

     test('buildGoogleAuthorizeUrl — starts with correct base', () => {
       const url = buildGoogleAuthorizeUrl('https://xyz.supabase.co', 'https://app.example.com');
       assert.ok(url.startsWith('https://xyz.supabase.co/auth/v1/authorize?provider=google'));
     });

     test('buildGoogleAuthorizeUrl — redirect_to is percent-encoded', () => {
       const url = buildGoogleAuthorizeUrl('https://xyz.supabase.co', 'https://app.example.com');
       const params = new URLSearchParams(url.split('?')[1]);
       // The raw value must not contain unencoded "://"
       assert.ok(!url.includes('redirect_to=https://'), 'redirect_to must be percent-encoded');
       // The decoded value must round-trip correctly
       assert.equal(params.get('redirect_to'), 'https://app.example.com');
     });
     ```
     Run with: `node --test connect-four/server/authUtils.test.js` (or equivalent). Both tests must pass.

  **Verify**: `curl -v http://localhost:3000/api/auth/oauth/google` should return a `302 Found` with a `Location` header pointing to your Supabase URL. `curl -X POST http://localhost:3000/api/auth/magic-link` should return `404`. Unit tests pass: `node --test connect-four/server/authUtils.test.js`.

**Checkpoint**: Server redirect is live. Manual smoke-test confirms 302 redirect shape.

---

## Phase 2: User Story 1 — New User Signs In With Google (P1) 🎯 MVP

**Goal**: Replace the two-phase magic-link modal with a single-screen Google OAuth modal.

**Independent Test**: Open the app, trigger any auth gate, confirm `AuthModal` renders only a "Sign in with Google" button (no email input, no magic-link form). Tap the button and confirm the browser navigates to `/api/auth/oauth/google` (full-page nav, not fetch). In a DEV build, confirm the "Dev: skip auth" button is present.

- [ ] T002 [US1] [US3] [US4] Rewrite `AuthModal`, update `DeepRevealPane`, and sync i18n in `connect-four/src/components/AuthModal.jsx`, `connect-four/src/i18n/en.json`, and `connect-four/src/components/DeepRevealPane.jsx`

  **Details for T002** — perform in this order (code first, then i18n keys):

  **Step A — Rewrite `AuthModal.jsx`**:

  Replace the entire `AuthModal` component body (preserve the `AuthGate` export at the bottom of the file verbatim — do not touch it). The new component:

  - Imports: keep all existing imports; add `useTranslation` if not already imported; remove any import used only by the removed magic-link code (e.g. `useState` if no longer needed).
  - **Zero stateful variables**: remove `email`, `sent`, `loading`, `error` state and the `handleSend` / `handleBack` functions.
  - **Single-screen JSX structure**:
    ```jsx
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="modal-card">
        {/* Retain the existing icon div (circle with user SVG) from the current signIn branch */}
        <h3>{t('auth.signIn')}</h3>
        {reason
          ? <p>{reason}</p>
          : <p>{t('auth.subtitle')}</p>
        }
        <button
          className="btn btn-primary"
          onClick={() => {
            track('signup_initiated', { method: 'google' });
            window.location.href = `${API}/api/auth/oauth/google`;
          }}
        >
          {t('auth.continueWithGoogle')}
        </button>
        <button className="btn btn-ghost" onClick={onClose}>
          {t('auth.dismiss')}
        </button>
        {import.meta.env.DEV && (
          <button
            style={{ border: '1px dashed', marginTop: 8 }}
            onClick={async () => {
              try {
                await fetch(`${API}/api/auth/anonymous`, { method: 'POST', credentials: 'include' });
              } catch (_) {}
              onClose();
              refetchSession();
            }}
          >
            🛠 Dev: skip auth
          </button>
        )}
      </div>
    </>
    ```
  - Props retained: `onClose`, `reason`. `AuthGate` export at the bottom of the file: **unchanged**.
  - The Google button uses `window.location.href` (full-page nav) — **not** `fetch()`.

  **Step B — Update `DeepRevealPane.jsx`**:

  Find the `<AuthModal ... />` call in `DeepRevealPane.jsx`. Change its `reason` prop from `reason="deep_reveal"` to `reason={t('auth.deepRevealGate')}`. The `auth.deepRevealGate` key already exists in `en.json` with value `"Create a free account to unlock 20 Deep Reveals per week."`. If `useTranslation` is not already imported in `DeepRevealPane.jsx`, add it.

  **Step C — Update `en.json`** (atomic with step A — do immediately after removing the code that references these keys):

  Under the `auth` namespace:
  - **Remove** these 7 keys: `sendLink`, `checkEmail`, `continueWithEmail`, `checkInbox`, `magicLinkSent`, `sendError`, `email`.
  - **Add** one key: `"continueWithGoogle": "Sign in with Google"`.
  - **Retain** all other existing keys: `signIn`, `subtitle`, `deepRevealGate`, `signOut`, `dismiss`.

  **`es.json`**: No changes. The `auth` namespace is absent from `es.json`; Spanish auth UI falls back to English per spec assumption.

  **Verify**:
  - `AuthModal` renders with only the Google button (plus dev skip in DEV mode).
  - `reason` prop: if passed (e.g. from `DeepRevealPane`), shows the reason string instead of `auth.subtitle`.
  - `AuthGate` still exported and unchanged.
  - `grep -r 'sendLink\|checkEmail\|continueWithEmail\|checkInbox\|magicLinkSent\|sendError' connect-four/src/` returns 0 results.
  - `npm run test:fast` passes (inside `connect-four/`).
  - **Edge-case (constitution requirement)**: Cancel the Google consent screen mid-flow. Confirm the user is returned to the app as anonymous, the `AuthModal` is dismissable (close button works), and no error state is displayed anywhere in the UI.

**Checkpoint**: AuthModal is Google-only. Magic-link UI is fully absent. Dev bypass intact.

---

## Phase 3: User Story 2 — Returning User Session Persists (P2)

**Goal**: Verify that the existing session restore path is unaffected by this change.

**No code changes required.** `ProfileStore.checkSession` and `POST /api/auth/callback` already handle Google OAuth tokens identically to magic-link tokens (auth-method agnostic). This story is satisfied by T001 and T002 not breaking the existing flow.

**Independent Test**: Sign in via Google OAuth (requires pre-ship checklist completed on staging), close and reopen the app, confirm session is restored automatically from the `sb_access_token` cookie without re-authenticating.

---

## Phase 4: Polish — Documentation Update

**Purpose**: Update `frontend-conventions.md` to accurately describe the server-mediated auth model and remove stale Supabase SDK references.

- [ ] T003 [P] Update the `Auth Integration` section and `Environment Variables` table in `docs/architecture/frontend-conventions.md` (currently lines 65–78)

  **Details for T003**:

  Replace the current `§ Auth Integration` block (which references `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`, and `getSupabaseClient()`) with:

  ```
  The frontend has no Supabase SDK dependency. Auth is entirely server-mediated via httpOnly cookies:

  1. **Sign-in initiation**: The "Sign in with Google" button navigates the browser to
     `GET /api/auth/oauth/google`, which issues a 302 redirect to Supabase's OAuth authorize endpoint.
  2. **Return leg**: After Google consent, Supabase redirects to the app with `#access_token=…`
     in the URL hash. `ProfileStore.checkSession` detects the hash, calls `POST /api/auth/callback`
     with the token, and the server sets httpOnly `sb_access_token` and `sb_refresh_token` cookies.
  3. **Session restore**: On page load, `checkSession` calls `GET /api/auth/session` to read the
     cookie and restore signed-in state.
  4. **Sign-out**: `POST /api/auth/signout` clears the cookies.
  5. **Store swap**: On successful sign-in, `ProfileStore` swaps `IndexedDBStore` for `SupabaseStore`
     and calls `migrateToSupabase` to migrate locally-recorded puzzle attempts.

  The only frontend environment variable required for auth is `VITE_API_BASE_URL`.
  There is no `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, or client-side Supabase SDK.
  ```

  In the `§ Environment Variables` table: remove the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` rows.

  **Note**: Line 196 (`Authorization: Bearer <session.access_token>`) describing the old client-SDK fetch pattern is knowingly left stale — it is out of scope for this spec and tracked in `TODOS_new.md`.

  **Verify**: Open `docs/architecture/frontend-conventions.md` and confirm no remaining references to `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, or `getSupabaseClient()` in the auth section.

**Checkpoint**: All code and docs are consistent with the server-mediated auth model.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (T001)**: No dependencies — can start immediately. Unblocks manual end-to-end testing.
- **Phase 2 (T002)**: Depends on T001 for end-to-end testing (frontend button navigates to the new server endpoint). Code-wise T002 can be written in parallel, but manual testing requires T001.
- **Phase 3**: No code tasks — story is satisfied by T001/T002 not breaking the existing flow.
- **Phase 4 (T003)**: Independent — no dependency on T001 or T002.

### Within T002

Strict ordering within the single task:
1. Rewrite `AuthModal.jsx` (remove state, handlers, JSX — retain `AuthGate` export)
2. Update `DeepRevealPane.jsx` (`reason` prop → `t('auth.deepRevealGate')`)
3. Remove 7 keys from `en.json` **after** removing code that references them
4. Add `continueWithGoogle` key to `en.json`

Never remove i18n keys before removing the code that uses them.

### Parallel Opportunities

- T003 (docs) can run in parallel with T001 or T002 — different files, no dependency.
- T001 and T002 can be authored in parallel, but T002 cannot be manually tested end-to-end until T001 is running.

---

## Parallel Example

```bash
# T001 and T003 can run simultaneously (different files, no dependencies):
Task: "Server changes in connect-four/server/index.js"
Task: "Docs update in docs/architecture/frontend-conventions.md"

# T002 follows T001 (for testability):
Task: "AuthModal rewrite + i18n + DeepRevealPane in connect-four/src/"
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Complete T001 (server endpoint + magic-link removal)
2. Complete T002 (AuthModal rewrite + i18n)
3. **STOP and VALIDATE**: Confirm Google button renders, navigates to `/api/auth/oauth/google`, and magic-link is absent
4. Complete pre-ship infrastructure checklist on staging
5. Run end-to-end OAuth flow on staging

### Full Delivery

1. T001 → T002 (sequential, core feature)
2. T003 (parallel with either, independent)
3. Pre-ship checklist (both environments)
4. End-to-end verification on staging + production

---

## Task Summary

| ID | Story | File(s) | FRs Covered |
|----|-------|---------|-------------|
| T001 | US1, US3 | `connect-four/server/index.js` | FR-001, FR-002, FR-003, FR-004, FR-015 |
| T002 | US1, US3, US4 | `AuthModal.jsx`, `en.json`, `DeepRevealPane.jsx` | FR-005–FR-012 |
| T003 | — | `docs/architecture/frontend-conventions.md` | FR-013, FR-014 |

**Total tasks**: 3 code tasks + 1 pre-ship infrastructure checklist (3 items × 2 environments = 6 human steps).

**Tests**: No new automated test files. Manual golden-path verification on staging covers SC-001 and SC-006.
