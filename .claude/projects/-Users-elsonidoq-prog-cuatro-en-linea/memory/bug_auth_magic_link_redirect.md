---
name: bug_auth_magic_link_redirect
description: Magic link emails stopped arriving after adding emailRedirectTo — Supabase rejects unlisted redirect URLs silently
metadata:
  type: project
---

`AuthModal.jsx` passes `emailRedirectTo: window.location.origin` to `supabase.auth.signInWithOtp`. Supabase rejects requests where the redirect URL is not on the project's allowlist (Auth → URL Configuration → Redirect URLs), and returns an error — but the `handleSend` catch block silently swallows it, so no email is sent and the UI shows no feedback.

**Why:** Added on 2026-05-31 to fix magic links always redirecting to localhost. The fix was correct in intent but broke sending because the URL wasn't allowlisted.

**How to apply:** Before using `emailRedirectTo`, ensure the target URL is in the Supabase allowlist. Also consider surfacing auth errors to the user instead of swallowing them silently.

**Status:** Open — not yet fixed. Fix requires Supabase dashboard access to add the URLs.
