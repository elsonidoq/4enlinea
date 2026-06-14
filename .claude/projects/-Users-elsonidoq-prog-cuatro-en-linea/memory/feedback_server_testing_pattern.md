---
name: feedback_server_testing_pattern
description: "How to test server code that has no endpoint test harness — extract thin helper, unit-test with node --test"
metadata:
  type: feedback
---

When writing tests for server-side logic that touches an Express endpoint, do NOT reach for endpoint tests (supertest, exporting `app`, mocking the supabase module-level client). The repo has no infrastructure for this and adding it is expensive.

**Why:** `server/index.js` never exports `app`, there is no supertest dependency, and the supabase client is a lazily-created private module-level `let` with no injection seam. The analyze loop also calls the real solver — spawning it in tests causes the same IPC deadlock that makes `candidate-generator.test.js` excluded from `test:fast`.

**How to apply:** Extract a thin helper function containing the logic under test (e.g. `insertGameBlunder(supabase, row)`). Unit-test the helper with `node --test` (the repo's test runner — NOT Jest). Pass a mock supabase object directly to the helper. Tests cover: auth gate, validation guards, conflict handling (23505-as-success), etc. — without spawning the solver or HTTP.

This pattern is documented in `docs/architecture/testing-conventions.md` (created in Epic 2, T012).
