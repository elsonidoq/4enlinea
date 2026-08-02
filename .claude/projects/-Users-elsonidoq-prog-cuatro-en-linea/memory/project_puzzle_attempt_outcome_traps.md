---
name: project-puzzle-attempt-outcome-traps
description: "Every puzzle_attempts write is fire-and-forget, so a CHECK or type violation is swallowed silently — a green client test proves nothing about whether the row actually landed"
metadata: 
  node_type: memory
  type: project
  originSessionId: 49125b48-5638-46e1-abe2-bafc82f071c0
  modified: 2026-08-02T14:09:08.143Z
---

Before touching `puzzle_attempts` — its columns, its CHECK constraint, its writers, or anything that
counts attempts — know that the obvious mental model is wrong. Spec 054 (Epic 4) fixed several of
these; **the swallowing mechanism that hid them is still there** and will hide the next one.

**The root trap, still live: every write to `puzzle_attempts` is fire-and-forget.** The server writer
ends in `.catch(err => console.error('[puzzle attempt]', err.message))`; the client writers call
`store?.recordPuzzleAttempt(...)` and never await a result. **Any** Postgres rejection — CHECK
violation, type mismatch, NOT NULL — is therefore invisible: no user-facing error, no failed request,
just a missing row. Two independent bug classes have now hidden here. Assume a third will.

**1. `ChallengeScreen.jsx` is not the only writer.** `server/index.js` writes one too, inside
`POST /api/puzzles/:id/check`, from `evaluatePredicate`'s (`server/predicates.js`) vocabulary
`{ result: 'correct' | 'wrong' | 'tied' }`. Four writers total.

**2. Vocabulary mismatch (FIXED, spec 054).** `'correct'`/`'wrong'` were not in the CHECK set, so
those inserts silently failed and **only tied gradings ever produced a row**. Now normalized through
`server/outcomeVocabulary.js`'s `toStoredOutcome()`. The enum is now exactly
`'correct_first' | 'tied' | 'incorrect' | 'abandoned'` (migration 063); `'revealed'` and
`'correct_retry'` were dropped, leaving `first_attempt_correct` as the only first-vs-retry signal.

**3. `moves_tried` is `integer[]`, and three client sites passed a scalar (FIXED, spec 054).** The
column is `integer[] NOT NULL`. Postgres rejects a scalar with `malformed array literal: "1"` —
measured, not theorized — and the fire-and-forget path swallowed it, so **every signed-in user's
multi-column and sequence-puzzle attempt was lost**. Anonymous users were unaffected: `IndexedDBStore`
has no schema to violate, so the bug lives only on the `SupabaseStore` → `POST
/api/user/puzzle-attempts` → `writePuzzleAttempts` path. **This is the shape of the next bug too** — a
client site that looks fine against IndexedDB and dies against Postgres.

**4. A green DOM test does not mean the row landed.** Spec 054's test asserted the store-mock payload
and went green while Postgres was rejecting the write — it even asserted the *buggy* scalar, freezing
the defect in place. **To prove an attempt write works, insert the real value against a real
Postgres** (`node` + `pg` against local suffices). Never trust a mock of the store.

**5. `'tied'` is live vocabulary, not dead.** Any narrowing that treats it as unused breaks a working
path. A validating `ADD CONSTRAINT` checks existing rows, so one non-conforming row aborts the
migration — and on Railway `node server/migrate.js && node server/index.js` means that takes the
deploy down. Query before narrowing; never assume zero.

`ChallengeScreen.jsx`'s hardcoded `device_uuid: 'local'` looks like another trap but is **inert**:
`SupabaseStore.recordPuzzleAttempt` drops it from the request body and `writePuzzleAttempts` sets
`device_uuid` from its own parameter. Do not "fix" it.

Nothing reads `outcome` or `moves_tried` anywhere (stats aggregate on `first_attempt_correct`) —
exactly why these stayed invisible so long. See [[project_stats_architecture]].

Related: [[project_puzzle_grading_reads_stored_metadata]], [[feedback_verify_at_the_source_layer]],
[[feedback_wrong_test_is_part_of_the_bug]], [[project_migration_ledger_and_pooler]].
