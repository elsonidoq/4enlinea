# Research: Google OAuth Authentication

**Feature**: 036-google-oauth-auth  
**Phase**: 0 — Pre-design research

All items below were resolved from the spec, epic decisions document (`TODOs_epics.md` §Epic 7), and direct inspection of `server/index.js` and `AuthModal.jsx`.

---

## Decision 1: Full-page navigation for OAuth initiation

**Decision**: The "Sign in with Google" button sets `window.location.href = \`${API}/api/auth/oauth/google\`` — a full browser navigation, not a `fetch()` call.

**Rationale**: A `fetch()` call would follow the 302 redirect server-side (within the fetch API) and return the HTML of Google's consent screen as a response body. The browser would never actually navigate to Google. Full-page navigation is required to initiate an OAuth flow.

**Alternatives considered**: `fetch()` with manual redirect handling — rejected because the browser cannot follow cross-origin OAuth redirects under CORS constraints without user-visible navigation.

---

## Decision 2: `redirect_to` must be percent-encoded

**Decision**: The `redirect_to` query parameter in the `GET /api/auth/oauth/google` handler is constructed as `encodeURIComponent(FRONTEND_URL)`.

**Rationale**: `FRONTEND_URL` contains `://` and potentially path separators. An un-encoded URL in a query string causes Supabase to reject or mis-parse the redirect target. The spec explicitly requires encoding (FR-001).

**Pattern already used in codebase**: The existing magic-link `emailRedirectTo` passes the URL directly but via a JSON body field, not a query parameter — a different serialization context. The OAuth endpoint uses a query param, so encoding is mandatory here.

---

## Decision 3: Callback and session flows unchanged

**Decision**: `POST /api/auth/callback` and `ProfileStore.checkSession` require zero modifications.

**Rationale**: The callback endpoint calls `supabase.auth.getUser(access_token)`, which is auth-method agnostic. `ProfileStore.checkSession` already detects `#access_token=` in `window.location.hash` and posts it to `/api/auth/callback`. Both paths are identical for magic-link and Google OAuth tokens. Confirmed in Epic 7 decisions and by direct read of both files.

---

## Decision 4: `POST /api/auth/refresh` stays in place, unwired

**Decision**: The refresh endpoint is not removed or wired.

**Rationale**: It is not called by any client-side code. Removing it would be a silent deletion of future capability. The spec requires leaving it in place.

---

## Decision 5: `reason` prop — subtitle replacement, not addition

**Decision**: When `AuthModal` receives a non-empty `reason` prop, the `auth.subtitle` text is replaced by the `reason` string. When `reason` is absent or empty, `auth.subtitle` is shown.

**Rationale**: FR-008a: "This replaces the subtitle (auth.subtitle) for that render — the subtitle is shown only when reason is absent or empty." Existing call sites: `HomeScreen` passes no `reason` (shows subtitle); `DeepRevealPane` passes `reason="deep_reveal"` — this call site will need to be updated to pass a human-readable reason string if the product intends to show a contextual message. Spec example: `<AuthModal reason="Create a free account to unlock Deep Reveals" />`.

**Note for implementer**: `DeepRevealPane` currently passes `reason="deep_reveal"` (an opaque slug). After this rewrite, that string will be rendered verbatim above the Google button. If the product intent is to show `t('auth.deepRevealGate')` there, the call site should be updated to pass the translated string or a new `reasonKey` prop. This is a **call site concern**, not an AuthModal concern — AuthModal renders whatever string it receives. The spec does not require changing `DeepRevealPane`; flag for product review.

---

## Decision 6: i18n key removal is atomic with code removal

**Decision**: Remove the 7 magic-link i18n keys in the same edit session as the AuthModal rewrite, with code removal happening first.

**Rationale**: The handoff context explicitly states: "FR-010 (i18n key removals) must be done atomically with FR-006 (removing the code that references those keys). Remove code first, then keys — never the reverse." This prevents a state where `en.json` is missing keys that `AuthModal` still references (which would cause blank UI labels in dev).

**Keys confirmed present in `en.json` `auth` namespace** (verified 2026-06-16):
- `email` — present ✓
- `sendLink` — present ✓
- `checkEmail` — present ✓
- `continueWithEmail` — present ✓
- `checkInbox` — present ✓
- `magicLinkSent` — present ✓
- `sendError` — present ✓

Keys kept: `signIn`, `signUp`, `deepRevealGate`, `signOut`, `dismiss`, `subtitle`.

**New key added**: `continueWithGoogle: "Sign in with Google"`.

---

## Decision 7: Infrastructure steps are pre-ship checklist items, not code tasks

**Decision**: Google Cloud Console credential creation, Supabase provider setup, and Supabase redirect URL allowlisting are documented as a checklist in `tasks.md`, not as automated code tasks.

**Rationale**: These are human-in-the-loop dashboard actions. They cannot be scripted. They must be completed before end-to-end testing on staging or production. The handoff context confirms: "Infrastructure tasks (FR-016–FR-018) are human-in-the-loop Supabase/Google Cloud dashboard steps — put in a pre-ship checklist, not as automated code tasks."
