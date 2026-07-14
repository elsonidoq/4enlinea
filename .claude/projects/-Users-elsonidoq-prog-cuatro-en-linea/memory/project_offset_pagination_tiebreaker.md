---
name: project-offset-pagination-tiebreaker
description: Offset pagination over a non-unique ORDER BY silently skips/duplicates rows — every paginated endpoint needs a unique tiebreaker (id ASC)
metadata: 
  node_type: memory
  type: project
  originSessionId: 7e4f1468-e785-4dd9-b658-eea78af3231c
---

# Offset pagination needs a unique ORDER BY tiebreaker

**Trigger**: adding `.range()`/offset-limit pagination to any Supabase/Postgres list endpoint, or reviewing one.

`ORDER BY <non-unique columns>` + `OFFSET/LIMIT` is nondeterministic across queries: rows sharing identical sort-key values (realistic here — a papergames import stamps a whole batch of blunders with the same `created_at`) can shuffle between pages, so paging to completion **skips some rows and returns others twice** with no error. Reproduced on `/api/coach/queue`: 137 rows paged as offset 0/50/100 yielded only 129 unique ids (8 skipped, 8 duplicated), while a single `limit=200` call returned all 137.

**Why it's a trap**: the spec-041 implementation batch added pagination, preserved the documented ordering (`severity DESC, created_at ASC`), passed all unit tests, and verified 137/137 against a live seed — the bug only surfaced in a *later* QA run because tie-shuffling depends on seed timing. Tests with distinct sort keys can't catch it.

**How to apply**: always append a unique final tiebreaker (`.order('id', { ascending: true })`) after the semantic ordering. `/api/coach/queue` is fixed (contract is `severity DESC, created_at ASC, id ASC`, documented in `docs/architecture/api-conventions.md`); audit any future paginated endpoint for the same hole. `GET /api/games` predates this finding — check its ordering if it ever exhibits paging anomalies.
