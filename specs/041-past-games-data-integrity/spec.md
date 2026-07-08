# Feature Specification: Past Games & Mistakes — Server Data Integrity

**Feature Branch**: `041-past-games-data-integrity`
**Created**: 2026-07-07
**Status**: Draft
**Input**: User description: "Past Games & Mistakes: Server Data Integrity — Epic 1 of the polish backlog (feature/polish branch). Make all persisted blunders reviewable, all aggregate counts correct at scale, and fix the latent import blocker where a second user loses all blunders."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review all blunders despite the queue cap (Priority: P1)

A player who has accumulated many blunders (e.g. 137) wants to work through every one of them, not just the first 50. Today the coach queue silently caps at 50 rows, so 87 of 137 blunders — and entire categories such as undercut and forced_win — are permanently unreachable from the UI.

**Why this priority**: This is a confirmed QA-major defect (QA:major C / new_TODOs #11): real user data exists but is invisible, defeating the purpose of the mistake-review feature entirely.

**Independent Test**: Seed a user with 137 blunders across multiple categories. Confirm every blunder becomes reachable through the coach queue UI/API, and the "N to review" count reflects the true total, not a 50-row ceiling.

**Acceptance Scenarios**:

1. **Given** a user has 137 blunders, **When** they page through the coach queue, **Then** all 137 are eventually reachable (none are permanently hidden).
2. **Given** a user has blunders in the undercut and forced_win categories, **When** the queue is paged to completion, **Then** blunders from both categories appear.
3. **Given** the existing ordering contract (severity DESC, created_at ASC), **When** pagination is added, **Then** that ordering is preserved across pages.

---

### User Story 2 - See a card for every category with blunders (Priority: P2)

A player opens the mistakes overview and expects to see a card for every pattern category they've ever blundered in, including rarer ones like undercut or forced_win. Today these cards are derived from the same truncated 50-row page as User Story 1, so categories that fall outside the first 50 rows silently vanish from the overview, even though the underlying data exists.

**Why this priority**: This story delivers its own server-side aggregate (a new per-category count endpoint, FR-004) as the mechanism for its category cards — User Story 1's pagination fix alone does not repair the category overview, because the overview must be driven by a true per-category count, not by paging the queue. The category-counts endpoint is created and consumed entirely within this story; it is not deferred to or shared with User Story 3 (which fixes three unrelated aggregate endpoints for scale — see FR-009 for the one point of overlap: this story's endpoint must also be scale-correct beyond 1,000 rows).

**Independent Test**: Seed a user with blunders spanning every valid blunder category, including ones that would fall outside a 50-row page. Confirm the overview shows one card per category with at least one blunder, with an accurate count on each card.

**Acceptance Scenarios**:

1. **Given** a user has blunders in every valid blunder category, **When** they view the mistakes overview, **Then** a card appears for every category with ≥1 blunder, including undercut and forced_win.
2. **Given** a category card, **When** the player selects it, **Then** they are taken to the full list of that category's blunders (not a truncated subset).
3. **Given** 137 total blunders across categories, **When** the overview loads, **Then** each card's count matches the true per-category total.

---

### User Story 3 - Correct aggregate counts at any scale (Priority: P1)

A long-time player has accumulated more than 1,000 blunder or puzzle-attempt rows. Several places in the app — overall stats, per-game mistake counts, and the weakness map — compute totals by fetching all matching rows into server memory and counting them in JavaScript. Past 1,000 rows, the underlying query silently truncates, so every one of these counts becomes wrong without any visible error.

**Why this priority**: Silent data corruption at scale (new_TODOs #10) — the user sees a plausible-looking but incorrect number, with no indication anything is wrong.

**Independent Test**: Seed a user with more than 1,000 blunder rows and more than 1,000 puzzle-attempt rows. Confirm every aggregate endpoint under scope returns the true count, not a 1,000-row-capped count.

**Acceptance Scenarios**:

1. **Given** a user has 1,200 blunder rows, **When** stats, per-game mistake counts, and the weakness map are computed, **Then** each reflects all 1,200 rows.
2. **Given** the current query filters for each in-scope aggregate (none of which apply a `quality` filter today — a "blunder" row and a "suboptimal" row in the `blunders` table are both counted, per the existing suboptimal/blunder unification), **When** these aggregates are fixed for scale, **Then** the exact same filter set is replicated and only the aggregation *mechanism* changes (JS reduce over an unbounded select → DB-side `count()`) — no filter (e.g. `quality = 'blunder'`) may be added that isn't present in today's query.
3. **Given** the new per-category count aggregate (supporting User Story 2), **When** queried for a user with >1,000 blunders, **Then** it returns the true per-category totals.

---

### User Story 4 - Each user gets their own imported game and blunders (Priority: P1)

Two different players both import games from the same public papergames.io account (e.g. a shared/community account, or two people who happen to reference the same room). Today, when the second player imports a room the first player already imported, the shared game record is silently reassigned to the second player — the first player's game disappears from their own Past Games list, and both players' blunders end up pointing at the same game row. This can cause 0 blunders to persist for the second user, with no visible error.

**Why this priority**: Confirmed QA blocker (QA:blocker A) — real data loss for existing users, not merely a missing feature.

**Independent Test**: As user A, import a room X. As user B, import the same room X. Confirm both users retain their own independent game row and their own blunders, with neither user's data disturbed by the other's import.

**Acceptance Scenarios**:

1. **Given** user A has imported room X, **When** user B imports the same room X, **Then** user B gets their own game row and their own blunders.
2. **Given** the scenario in (1), **When** user A revisits their Past Games list, **Then** user A's game for room X and user A's blunders are unchanged and still visible.
3. **Given** a user re-imports a room they already imported themselves, **When** the re-import completes, **Then** no duplicate game or blunder rows are created for that user.

---

### User Story 5 - Trustworthy import result reporting (Priority: P2)

After the ownership fix in User Story 4, a genuine duplicate-detection signal (the same user re-importing the same room) should be reported honestly to the user, distinct from the cross-user collision this epic eliminates. Today the importer already computes error/skip counts internally but does not surface them, so users cannot tell whether an import fully succeeded.

**Why this priority**: Builds directly on User Story 4's fix; without it shipping first, any "error" surfaced here would be a false positive from the cross-user collision rather than a genuine one.

**Independent Test**: Import a room, then re-import the identical room as the same user. Confirm the second import's result reports the games/blunders that were skipped as duplicates, with no false error count, and that a first-time cross-user import (per User Story 4) reports zero collisions.

**Acceptance Scenarios**:

1. **Given** a user re-imports the same room they already imported, **When** the import result is shown, **Then** it reports the number of blunders skipped as duplicates rather than a generic error.
2. **Given** the User Story 4 fix is in place, **When** a second user imports a room a first user already imported, **Then** the import reports success with no error count.

---

### User Story 6 - Get to imported games right after importing (Priority: P3)

Right after a successful papergames import, a player wants to jump straight to their newly imported games rather than hunting for a navigation path.

**Why this priority**: A confirmed but minor usability gap (QA:minor B / new_TODOs #26) — no data is at risk, only a missing shortcut.

**Independent Test**: Complete a papergames import and confirm the success state presents an interactive element that navigates to Past Games.

**Acceptance Scenarios**:

1. **Given** an import completes successfully, **When** the player views the import success state, **Then** an interactive element is present that navigates to Past Games.
2. **Given** an import completes with some games skipped as duplicates, **When** the player views the result, **Then** the partial-success copy is accurate and the navigation element is still present.

---

### Edge Cases

- What happens when a user has **zero** blunders in every category? The mistakes overview must show zero cards (or an empty state), not an error.
- What happens when the coach queue is paged and the underlying data changes between pages (e.g. a new blunder is recorded mid-session)? This is a best-effort guarantee, not a hard one: under normal use (no concurrent writes for that user during the paging session), no blunder should be skipped or duplicated. A new blunder recorded mid-session may shift page boundaries; this feature does not require cursor-based pagination to eliminate that possibility.
- What happens when a user imports a room, then a *different* user imports the same room, then the *original* user re-imports it? The original user's data must remain theirs throughout, with no cross-contamination at any step.
- What happens when an aggregate endpoint is queried for a brand-new user with 0 rows? It must return 0 / empty, not an error.
- What happens when a category has exactly the valid-tag list membership but zero recorded blunders? No card is shown for it (cards are driven by actual data, not by the static category list).

## Requirements *(mandatory)*

### Functional Requirements

**Queue reachability (User Story 1)**

- **FR-001**: The system MUST allow a player to reach every one of their blunders, regardless of how many they have, removing the current 50-row hard ceiling — by paging through a bounded page size, not by returning an unbounded result set. An unbounded default response (all rows in one call) is itself a defect this feature must not reintroduce.
- **FR-002**: The system MUST preserve the existing ordering guarantee (worst/most-severe first, oldest-first among ties) while paging through blunders.
- **FR-003**: The system MUST NOT change the shape of data already returned per blunder (existing fields) when adding pagination — pagination controls are additive.
- **FR-003a**: Every consumer of the blunder queue (UI and any internal caller) MUST page to completion to reach all of a user's blunders — none may rely on a single, default-sized page to represent the full set.

**Category overview (User Story 2)**

- **FR-004**: The system MUST provide a way to see the true count of blunders per category for a user, independent of any single page of the blunder list.
- **FR-005**: The system MUST show one overview card per category that has at least one blunder for the user — no valid category with recorded blunders may be silently omitted from the overview, including categories with few blunders.
- **FR-006**: Selecting a category from the overview MUST lead to that category's full blunder list, not a subset limited by an unrelated page size.

**Scale-correct aggregates (User Story 3)**

- **FR-007**: Every user-facing aggregate count in scope (overall stats, per-game mistake counts, and the weakness map's fallback computation) MUST remain accurate when the underlying row count exceeds 1,000.
- **FR-008**: Fixing aggregate counts for scale MUST replicate the exact current filter set for each in-scope query (today's queries against the `blunders`/`puzzle_attempts` tables apply no `quality` filter — a `quality='blunder'` row and a `quality='suboptimal'` row are both counted identically today) and change only the aggregation *mechanism* (JS-side reduce over an unbounded select → DB-side `count()`/grouped query). No requirement in this feature may be read as license to add a filter (e.g. restricting to `quality='blunder'`) that is not already present in the current query — that would silently change *what* is counted, which is Epic 2's responsibility, not this feature's (see Out of Scope).
- **FR-009**: The per-category count aggregate introduced for User Story 2 MUST itself be scale-correct beyond 1,000 rows.

**Per-user import ownership (User Story 4)**

- **FR-010**: When two different users import the same externally-sourced game (room), the system MUST give each user their own independent copy of that game's record.
- **FR-011**: Importing a room that a different user has already imported MUST NOT alter, hide, or reassign that other user's existing game record or blunders in any way.
- **FR-012**: A user re-importing a room they themselves already imported MUST NOT produce duplicate game or blunder records for that user.
- **FR-013**: The uniqueness rule for a user's blunder records tied to an imported game MUST be scoped per-user (the same game position for two different users is not a collision).

**Honest import reporting (User Story 5)**

- **FR-014**: The import result presented to the user MUST distinguish "this exact item already existed for you" (a genuine duplicate) from a real failure, and MUST report accurate counts of each.
- **FR-015**: After the per-user ownership fix (FR-010–FR-013), a first-time import by a second user of a room already imported by someone else MUST report as a normal successful import, with no duplicate/error count attributed to the ownership collision that no longer occurs.

**Post-import navigation (User Story 6)**

- **FR-016**: After a successful (or partially successful) import, the system MUST present the user with an interactive way to navigate directly to their imported games.
- **FR-017**: The post-import success state MUST accurately reflect partial results (e.g., some items skipped as duplicates) without misrepresenting them as failures.

### Key Entities

- **Blunder**: A recorded player mistake, belonging to exactly one user, tagged with a pattern category, a severity, and (optionally) a link to the game in which it occurred. Its reachability and per-category counting are the subject of User Stories 1–3.
- **Imported Game**: A record of a game a user played on an external platform (papergames.io), identified by an external room identifier. Prior to this feature, an imported game's ownership could be silently reassigned when a second user imported the same external room; this feature makes ownership per-user (User Story 4).
- **Category Count**: A derived, per-user, per-category tally of blunders, used to drive the mistakes overview (User Story 2) and required to stay accurate beyond ordinary row-count limits (User Story 3).
- **Import Result**: The outcome summary of one import operation, reporting how many games/blunders were newly saved versus recognized as already-existing duplicates for that user (User Stories 5–6).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with 137 recorded blunders can reach all 137 through normal use of the mistakes feature, with zero permanently unreachable.
- **SC-002**: A user with blunders spread across every valid category (including low-frequency ones) sees a mistakes-overview card for every category that has at least one blunder — zero categories silently missing.
- **SC-003**: Every in-scope aggregate count (overall stats, per-game mistake counts, weakness map, per-category counts) remains accurate for a user with more than 1,000 underlying rows — verified against a known ground-truth total.
- **SC-004**: When two different users import the same external game room, both retain their own game record and their own blunders with 100% data integrity — neither user's pre-existing data is altered by the other's import, across repeated test runs.
- **SC-005**: A user re-importing an already-imported room produces zero duplicate records and an import result that accurately reports "already imported" rather than an error.
- **SC-006**: 100% of successful (or partial) import completions present the user with a working, interactive path to their imported games.

## Out of Scope

- **Mistake-count redefinition**: Whether "mistake" should include suboptimal moves in addition to blunders is Epic 2 / US2.2's responsibility. Note the in-scope queries today already apply no `quality` filter (both `blunder`- and `suboptimal`-quality rows in the `blunders` table are counted) — this feature replicates that exact filter set unchanged; it must not add a `quality` filter, and it does not need to add one to satisfy any requirement here (see FR-008).
- **MistakesList / coach-queue UI redesign**: Any redesign of the mistakes list or coach queue beyond making it correctly show a card per category with an accurate count (User Story 2) is out of scope. This feature does not redesign card content, layout, or interaction beyond count-driven cards.
- **The `byPattern` aggregate**: Belongs to `/api/user/session-stats/all`, not the aggregates in scope here (`/api/stats`, per-game mistake counts, weakness map, per-category counts). It is already correct and is not touched by this feature.
- **Historical-data repair**: The production database has no real users yet, so any already-corrupted rows (e.g. games/blunders reassigned by the cross-user collision bug in User Story 4, or counts already wrong due to the truncation bug in User Story 3) do not need to be identified, audited, or backfilled. The affected tables may be reset/recreated cleanly as part of shipping this feature rather than repaired in place. No requirement or success criterion in this feature depends on the correctness of pre-existing rows.

## Assumptions

- The current definition of "mistake count" (blunders only, not yet merged with suboptimal moves) is intentionally preserved in this feature; redefining it is Epic 2's responsibility.
- All data continues to flow through server-side endpoints — no client-side direct database access is introduced or relied upon to satisfy any requirement in this feature (per the project's existing server-mediated data access model).
- The production database has no real users yet, so no backfill/repair strategy for historical rows is required (see Out of Scope); any schema or ownership migration needed to satisfy User Story 4 may cleanly recreate affected records rather than repair them in place.
- Existing consumers of today's blunder/queue/stats response shapes continue to work unless a user story explicitly requires a shape change; new capabilities (pagination, category counts) are additive.
- "Valid category" means a category already recognized by the system's existing pattern-category vocabulary; this feature does not introduce new categories.
