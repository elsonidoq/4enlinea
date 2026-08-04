---
name: project_lesson_lock_copy_lives_in_saga
description: "Locked-lesson copy is NOT in the lesson screens — useLessonLockGuard redirects before they mount, so editing them changes nothing"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7e1e8e7c-6f43-4699-a8f4-728afb96ebf6
  modified: 2026-08-04T02:30:37.007Z
---

**Trigger: you are about to change what a user sees when a lesson is locked** — the upgrade prompt, the paywall copy, the CTA — and you are reaching for `ConceptScreen.jsx`, `SocraticScreen.jsx` or `CLChallengeScreen.jsx`.

Those three render **no locked-lesson copy at all**. `useLessonLockGuard.js` calls `goReplace('saga', {lockAction})` and redirects **before the screen mounts**; the screens only ever render once access is `'allowed'`. Edit them and nothing on screen changes — the work looks done and isn't. The copy actually lives in `SagaScreen.jsx` and `UpgradeModal.jsx`.

Verified at source 2026-08-03 (all three screens call `useLessonLockGuard` and gate rendering on its status). Full chain now documented in `docs/architecture/frontend-conventions.md` §"Direct-URL lock guard".

**`sagaLock.js` is three chained functions, not one.** A new lock outcome threads through **all three** — each has its own return set:
- `deriveLockReason` → `'none' | 'tier' | 'order' | 'both'`
- `dispatchLockAction` → `'upgrade' | 'orderLock' | 'navigate'`
- `deriveLessonAccess` → `'allowed' | 'upgrade' | 'orderLock'`

Changing only the outermost is the natural mistake. Watch the existing `'both'` case (tier **and** order locked) — a new outcome is not obviously a simple substitution there.

**The `authenticated` signal exists on the wire but the client throws it away.** `server/entitlement.js` returns `{entitled, authenticated}`, but **every return path in `getEntitlement()` (`src/lib/entitlement.js`) reduces it to `{entitled}`**. So today a signed-out visitor and a signed-in free-tier user both collapse to `tier === 'free'` and get the identical prompt (that is OI-95). Anyone told "the entitlement endpoint already carries the signal" is right about the server and wrong about the client — un-dropping it in the helper is part of the work, not a given.

Related: [[project_entitlement_client_cache_traps]] (the same client module's cache is module- not account-scoped), [[project_lesson_progress_unlock_is_pairwise]], [[project_lesson_json_fields_not_rendered]].
