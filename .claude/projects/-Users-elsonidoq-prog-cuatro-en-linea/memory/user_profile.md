---
name: User profile
description: Technical background and collaboration style of the user.
type: user
originSessionId: b0f55ba3-5d89-4123-8903-e23bf84def14
---
Strong technical background — comfortable reading C++ bitboard code, React hooks, and low-level solver algorithms. Approaches bugs empirically (uses browser debugger, captures network requests, verifies board states). Asks precise questions and validates hypotheses before accepting them. Prefers concise responses without filler.

**Curates git commits himself, in parallel.** During an agent session he will commit work-in-progress independently, with terse one-word messages (`spanish`, `spec 049 done`, `new ai difficulty`), sometimes reorganizing history. Do NOT auto-commit, rebase, or rewrite branch topology; leave working-tree changes uncommitted for him to fold into his own commits unless he explicitly asks you to commit. When git state looks surprising mid-session (files you thought were uncommitted are now committed under a terse message), it's him, not a bug — verify with `git log` rather than re-doing work.
