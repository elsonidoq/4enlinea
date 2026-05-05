# API Contracts: Puzzle Generator Improvements

All endpoints remain guarded by `requireLocalhost`.

---

## POST /api/admin/generate (unchanged interface)

The request and response shapes are **unchanged**. Internally:
- The generation engine now uses solver-weighted sampling instead of random play.
- The opening book is loaded at server startup (not per-request).
- Candidates inserted into `candidates` table now include `user_player` (computed from `move_string.length`).

No client-facing contract changes. Existing integrations continue to work.

---

## No new endpoints

This feature touches only the candidate generation internals and the board renderer. No new API endpoints are required.
