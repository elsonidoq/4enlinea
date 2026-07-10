# Staging Environment Checks

Verification items that **cannot** (or should not) be exercised in local dev and must be confirmed
against the deployed **staging** environment before a change is considered done. These are the
residue of each epic's acceptance pass: anything that depends on a real external provider, a real
cross-origin redirect round-trip, real deploy-time config/migrations, a genuinely clean signed-out
session, or production-like data.

**This file is append-only per epic.** Each epic in `polish_epic.md` records its staging-only
checks here under its own `## Epic N — <title>` heading (see the "Staging checks" section
convention in `polish_epic.md`). Do not delete an epic's section when it ships — instead tick the
boxes once the checks pass in staging, so this doc doubles as the staging sign-off log.

## How to add checks (for each epic / coordinator)

When an epic's implementation or QA pass produces a verification item that could only be partially
confirmed locally (e.g. "the return-to-target mechanism was verified via a direct fetch, but the
real OAuth redirect was not exercised"), append it here rather than marking it silently done.
For each check record:

- **What** — the concrete action to perform in staging.
- **Why staging** — why local dev could not fully confirm it.
- **Expected** — the pass condition.
- **Source** — the epic / spec / FR it traces to.
- A `- [ ]` checkbox to tick on sign-off (with tester + date).

---

## Epic 3 — Global UI/UX & Accessibility Polish (spec 043)

- [ ] **Real OAuth return-to-destination round-trip.**
  - **What**: While genuinely signed out in staging, tap the Home "Past games" card → complete a
    **real** external sign-in (full `staging-frontend → staging-server → external IdP → staging-frontend`
    redirect). Confirm you land on the **Past Games** list, not Home, and that the
    `postLoginReturnTo` sessionStorage key is gone afterward.
  - **Why staging**: Local dev verified the consumption path only via a direct `/api/auth/anonymous`
    fetch (the identical `Navigator` `session`-effect code path). The actual external redirect
    (with reCAPTCHA / real IdP) cannot be automated locally, and `sessionStorage` survival across a
    real cross-origin redirect round-trip was never exercised end-to-end. (Spec 043 FR-013, T016.)
  - **Expected**: User lands on Past Games within one sign-in flow; no dead-end; stash key cleared.
  - **Source**: Epic 3 / spec 043 US3, FR-013.

- [ ] **Dismiss-then-unrelated-login does not redirect (real sign-in).**
  - **What**: Signed out, tap a gated CTA → dismiss the AuthModal without signing in → browse
    elsewhere → sign in via a **real** OAuth flow from an unrelated entry point (profile icon).
    Confirm you land on the default screen (Home), NOT the earlier abandoned destination.
  - **Why staging**: Verified locally only with the dev-skip button; the real redirect path was not
    exercised. This is the highest-value correctness case in the feature (FR-014).
  - **Expected**: No silent redirect to the abandoned CTA's destination.
  - **Source**: Epic 3 / spec 043 US3, FR-014.

- [x] **Signed-out Stats "Sign up to track your progress" button affordance.** — **RESOLVED
  LOCALLY 2026-07-10; no longer requires staging.**
  - **What**: In a genuinely signed-out session, open Stats and confirm the "Sign up to track your
    progress over time" control renders as a button (background/border + hover/active/focus states)
    and, when tapped, opens the sign-in prompt.
  - **Why it was here**: Local dev originally could not reach a clean signed-out state (the httpOnly
    session cookie can't be cleared from DevTools), so this element's signed-out visual was only
    inferred from shared `className` with the "Review past mistakes" button.
  - **How it was closed**: The dev-only "🛠 Dev: clear IndexedDB & sign out" button on the Settings
    screen (localhost-only) now drops the session cookie + clears local data, giving a real
    signed-out state locally. Confirmed by direct screenshot: the element renders as a button
    (tan/beige background, rounded corners) and is exposed as `role=button`; the tap opens AuthModal
    and stashes `{screenKey:'stats'}` (Batch 2).
  - **Source**: Epic 3 / spec 043 US2 (FR-011) + US3 (FR-015).

<!-- Epics 4–8: append your staging-only checks below under a `## Epic N — <title>` heading. -->
