---
name: bug_supabase_trigger_not_firing
description: "Supabase GoTrue doesn't fire on_auth_user_created trigger — public.users rows never auto-created"
metadata: 
  node_type: memory
  type: project
  originSessionId: 477d4e49-b083-47b9-8ed4-3e917f0b9c34
---

The `on_auth_user_created` trigger on `auth.users` exists, is enabled, and has correct SQL — but Supabase GoTrue's internal user creation bypasses user-defined triggers. Result: new auth users have no corresponding `public.users` row, causing FK violations on any table that references `public.users`.

**Why:** Discovered 2026-06-13 when all 10 production auth users had no `public.users` row. Direct INSERT into `public.users` works; the trigger just never fires.

**How to apply:**
- Never rely on this trigger to provision `public.users` rows.
- The `loadUser` middleware (index.js) now auto-creates the row on first authenticated request:
  ```js
  if (!profile) {
    await supabase.from('users').insert({ id: data.user.id })...
  }
  ```
- When setting up a fresh Supabase project, backfill manually:
  ```sql
  INSERT INTO public.users (id) SELECT id FROM auth.users ON CONFLICT (id) DO NOTHING;
  ```
