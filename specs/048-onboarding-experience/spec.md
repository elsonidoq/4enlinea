# Feature Specification: Onboarding Experience

**Feature Branch**: `048-onboarding-experience`
**Created**: 2026-07-12
**Status**: Draft
**Input**: User description: "Epic 8 — Onboarding Experience: design and implement a first-run onboarding flow whose single job is to show the coach reacting to the user's own play, as fast as possible. Uniform sparring-first workflow for every first-time user (no routing-question gate, no sign-in wall before value); onboarding completes at the first coach insight on the user's own move; post-aha optional 'import your real games' offer for online players leading into the existing authenticated Papergames import flow (spec 038)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — First-run detection & routing (Priority: P1)

A brand-new visitor opens the app for the very first time. Without seeing any splash screen, tutorial modal, walkthrough carousel, or "do you play online?" question, they are taken directly into a short practice game against the AI. The system remembers that this user has been shown onboarding so it never repeats the experience on a later visit, and this memory survives even if the user later creates an account.

**Why this priority**: Every other onboarding behavior depends on correctly detecting a first-time visitor exactly once and routing them into the experience without racing other startup logic (returning-session detection, magic-link sign-in completion). Without this, no other story can be exercised correctly.

**Independent Test**: Can be fully tested by opening the app with a clean/empty local profile and confirming: (a) the user lands directly in a sparring game with no intermediate screen, (b) reloading the app afterward does not repeat onboarding, (c) if the user is mid-way through completing a magic-link sign-in when they open the app, onboarding routing does not interrupt or get interrupted by that sign-in completing.

**Acceptance Scenarios**:

1. **Given** a user opening the app for the first time on a device with no prior local profile, **When** the app finishes loading, **Then** the user is routed directly into a practice game against the AI — no intermediate screen is shown.
2. **Given** a user who has already completed or skipped onboarding, **When** they open the app again (same device), **Then** they land on the normal Home screen, not onboarding.
3. **Given** a first-time user whose browser session contains an in-progress magic-link sign-in (i.e., they clicked an email sign-in link and are being routed back into the app), **When** the app mounts, **Then** the sign-in completes correctly AND the first-run routing decision is made using up-to-date state — neither process interrupts or overrides the other, and the user is not shown onboarding twice or dropped into a broken intermediate state.
4. **Given** a first-time user who later creates an account (signs up), **When** the account is created, **Then** the fact that onboarding was already completed carries over to their account via the (extended) existing migration path and is not re-triggered on a different device where they subsequently sign in with the same account.

---

### User Story 2 — Sparring-first demonstrated value (Priority: P1)

A first-time user is dropped straight into a short game against the AI at an approachable difficulty. As they play, the coach reacts to their own moves in real time — not through explanatory text or a walkthrough, but by literally watching the coach respond to what they just did. This is how the user discovers what the product does, without being told about it first.

**Why this priority**: This is the core value demonstration the whole epic exists to deliver — everything else (routing, engagement tracking, the import offer) is scaffolding around this single experience.

**Independent Test**: Can be fully tested by playing through several moves of the onboarding game on both a 390×844 mobile viewport and a desktop viewport, and confirming the coach produces a reaction to each user move without any accompanying explanatory copy, tutorial hint, or walkthrough step.

**Acceptance Scenarios**:

1. **Given** a first-time user routed into onboarding, **When** the practice game loads, **Then** no splash screen, tutorial modal, or multi-step carousel is shown before or during the game — the board is immediately playable.
2. **Given** a first-time user makes a move in the onboarding game, **When** that move is evaluated, **Then** the coach produces a short reaction to that specific move (not a generic scripted line unrelated to the move played).
3. **Given** the onboarding game is viewed at a 390×844 mobile viewport, **When** the user plays, **Then** the board, coach reaction, and any onboarding-specific UI remain fully usable and legible at that size.
4. **Given** a first-time user completes or abandons the onboarding game, **When** their session is later analyzed, **Then** the fact that onboarding was shown to completion (or not) is recorded for measuring return behavior.

---

### User Story 3 — Guided first workflow + import offer (Priority: P2)

Once the user has played through the onboarding sparring game to its natural end (win, loss, draw, resignation, or abandonment), every user sees an optional "bring your real games into the app for deeper analysis" offer, regardless of whether they've indicated they play elsewhere online. This offer is entirely optional and always dismissible, and it never blocks or delays play in the sparring game itself — it only appears once that game is over. A user who engaged with the sparring game (played at least one move) but left before reaching that natural end is not left without ever seeing the offer: it surfaces once, the next time they land on Home. Accepting it may involve signing in (handled by the existing account flow, not rebuilt here).

**Why this priority**: This is the bridge from the free demonstration of value to the app's deeper, account-gated value (real game import) — important for conversion, but strictly secondary to, and dependent on, User Story 2 already having succeeded.

**Independent Test**: Can be fully tested by (a) playing an onboarding game to its natural end and confirming the import offer appears immediately afterward and that accepting it leads to the existing import entry point, and (b) starting an onboarding game, playing one move, then leaving before the game ends, and confirming the import offer instead surfaces once on the user's next visit to Home.

**Acceptance Scenarios**:

1. **Given** a first-time user reaches the natural end of the onboarding sparring game (win, loss, draw, resignation, or abandonment), **When** the game-end sequence runs, **Then** the user is routed to the import offer instead of the normal post-game review screen.
2. **Given** the onboarding sparring game has ended, **When** the import offer is shown, **Then** an optional "import your real games" offer is presented to every user regardless of whether they've indicated they play elsewhere online; declining or dismissing it proceeds without penalty.
3. **Given** the user accepts the import offer, **When** they are not currently signed in, **Then** they are taken into the existing sign-in step as part of reaching the existing import entry point (this flow's mechanics belong to the existing account and import features, not to this feature).
4. **Given** the import offer is shown, **When** the user has no interest in it (dismisses it, or it does not apply to them), **Then** they are handed off to the normal Home screen.
5. **Given** a user played at least one move in the onboarding game (onboarding status is "seen") but exited before the game's natural end, **When** they next land on the Home screen, **Then** the import offer is shown to them exactly once as a fallback, after which it does not appear again automatically.

---

### User Story 4 — Skip & re-access (Priority: P3)

A user who doesn't want to go through onboarding right now can skip it at any point, and a user who skipped it (or wants to revisit it) can find it again later from Settings. If the user is interrupted mid-onboarding (closes the tab, navigates away), their progress isn't lost or duplicated when they return.

**Why this priority**: Necessary for a good experience but does not block the core value demonstration — a user forced through an unskippable flow would violate the "no gate" principle the whole epic is built on.

**Independent Test**: Can be fully tested by starting onboarding, tapping a skip control, confirming the user reaches Home immediately, then navigating to Settings and re-launching onboarding from there.

**Acceptance Scenarios**:

1. **Given** a user in the onboarding game or on the import offer, **When** they choose to skip, **Then** they are taken to the normal Home screen and onboarding is marked as not needing to show again automatically.
2. **Given** any user (whether they completed, skipped, or never saw onboarding), **When** they visit Settings, **Then** they can find and re-launch the onboarding experience on demand.
3. **Given** a user closes the app mid-onboarding-game without finishing, **When** they return later, **Then** they are not forced to repeat onboarding automatically (per Story 1) but can still re-launch it manually from Settings if they choose.
4. **Given** any onboarding-specific text or coach copy, **When** the app's active language is changed, **Then** all onboarding copy is shown in the selected language (no untranslated strings).

---

### Edge Cases

- What happens if the user resigns, abandons, or the game ends (win/loss/draw) without ever playing a move themselves? Onboarding status only ever moves to "seen" once the user has actually played a move; a game that ends with zero user moves leaves the status at "not_encountered" (still eligible for the first-run fallback described in User Story 3).
- What happens if the user is on their first visit and simultaneously in the middle of completing a magic-link sign-in (arrives via an email link)? Sign-in completion must not race the first-run redirect decision (see User Story 1, Scenario 3).
- What happens if a first-time anonymous user later signs in on a *different* device — should that device also skip onboarding? Yes: once the flag is reconciled to the account on sign-up/sign-in, it should carry across devices for that account, but a device that has never seen an anonymous profile for this app still needs its own local first-run check to run before any account state is available.
- What happens if the import offer is shown but the user has no way to indicate whether they play online elsewhere? The offer must be able to be dismissed with no consequence — it is never a required step.
- What happens if a user engaged with onboarding (status "seen") but exited before game end, and then never returns to Home (closes the tab) — is the import offer lost? No: the fallback in User Story 3, Scenario 5 fires the next time Home is reached, however long that takes; it is a one-time-per-user surfacing tied to Home visits, not to a session.
- What happens if a locale's onboarding copy is missing? Falls back to the existing project-wide i18n fallback behavior (English), not to an untranslated key.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST detect, on app load, the current user's onboarding state (by device, and — once available — by account), and MUST suppress automatic onboarding routing whenever that state is anything other than "not yet encountered" (i.e., both "seen" and "skipped" suppress auto-show — see Key Entities for the full three-state model).
- **FR-002**: The system MUST route a first-time user directly into a sparring game against the AI on the existing "Easy" difficulty tier, with no intermediate splash screen, tutorial modal, walkthrough carousel, sign-in prompt, or "do you play online?" question shown before this point.
- **FR-003**: The system MUST NOT introduce a new or tuned AI difficulty for onboarding; it MUST reuse the existing Easy difficulty exactly as configured elsewhere in the app, including its existing behavior of being beatable but not guaranteeing a first-attempt win.
- **FR-004**: The system MUST surface the existing live, per-move coach feedback mechanism during the onboarding game, reacting to the user's own moves as they are played.
- **FR-005**: The system MUST set the onboarding state to "seen" the first time the user plays a move of their own in the onboarding sparring game — a simple, reliable engagement signal, not a detector of any particular coach reaction — independent of whether the game is subsequently won, lost, drawn, resigned, or abandoned. *(Previously specified a "first coach reaction" / "aha" detection mechanism; the owner dropped aha detection in favor of this simpler engagement signal — see research.md and the epic decision log.)*
- **FR-006**: *(Removed. The aha-specific success/reward acknowledgment this requirement described no longer exists — there is no aha-detection mechanism to attach it to. No replacement acknowledgment is required by this spec.)*
- **FR-007**: The system MUST offer every user an optional "import your real games" prompt at the natural end of the onboarding sparring game (win, loss, draw, resignation, or abandonment reaching the game's end-of-game sequence), regardless of whether they've indicated they play Connect Four elsewhere online; the offer MUST always be dismissible with no consequence. If the user's onboarding state is "seen" (they played at least one move) but they exited before the game reached its natural end, the system MUST instead surface this same offer exactly once, the next time the user lands on the Home screen, so the offer is never silently lost.
- **FR-008**: Accepting the import offer MUST lead the user into the existing authenticated game-import entry point; this feature does not alter that existing flow's own mechanics, requirements, or limits.
- **FR-009**: The system MUST allow a user to skip onboarding at any point — during the sparring game or at the import offer — landing them on the normal Home screen without penalty, and MUST set the onboarding state to "skipped".
- **FR-010**: The system MUST make onboarding re-launchable on demand from Settings, for any user regardless of prior onboarding state.
- **FR-011**: The onboarding state MUST be stored as a field on the user's existing local anonymous profile record. No existing write path updates this record after its initial creation, so this feature MUST add a small profile-write capability (a single-record update) to the local profile store; the flag MUST NOT be stored in a new, separate, or parallel storage location.
- **FR-012**: The onboarding state MUST be carried over to a server-side account record by extending the existing account-creation/sign-in data-migration mechanism — not by building a new, separate reconciliation service. Because the current migration mechanism does not yet carry any profile fields end-to-end, this feature MUST extend it across all three layers required to make the value actually arrive server-side: (a) include the onboarding state in the client's migration payload, (b) add handling for that field to the existing server-side migration endpoint, (c) add the corresponding column to the server-side user record via a database migration. No separate, bespoke reconciliation path is to be built alongside the existing migration mechanism.
- **FR-013**: The system MUST NOT create or require a server-side record for anonymous, non-account users solely to track onboarding status.
- **FR-014**: First-run onboarding routing decisions MUST NOT interfere with, be interrupted by, or race against the existing session/sign-in restoration process that runs at app startup (including magic-link completion); the two MUST be sequenced so that neither produces an incorrect or duplicated user-facing outcome.
- **FR-015**: The system MUST record analytics events sufficient to measure onboarding lifecycle completion and its relationship to unprompted return behavior: at minimum `onboarding_started`, `onboarding_finished` (the user reached the import offer, whether via game-end or the Home fallback), and `onboarding_skipped`. For anonymous (not-yet-signed-in) users, these events MUST carry the profile's device identifier as the anonymous-attribution field (`uid`) on the existing analytics-tracking call, using that mechanism's existing anonymous-attribution support, so lifecycle events are attributable to a specific anonymous user without requiring sign-in.
- **FR-016**: All user-facing onboarding copy (coach lines, import offer, skip controls) MUST be delivered through the existing translation-key system, with no hardcoded user-facing strings.
- **FR-017**: The onboarding sparring game and its surrounding screens MUST remain fully usable at a 390×844 mobile viewport as well as common desktop viewports.

### Key Entities

- **Onboarding status**: A per-profile flag (and, once linked to an account, a per-account flag) recording a single onboarding state, one of **three** values:
  - `not_encountered` — default state; auto-show routing (FR-001) is active.
  - `seen` — the user played at least one move of their own in the onboarding sparring game; set by FR-005. Suppresses auto-show; the simple engagement signal this feature measures (no finer-grained "aha" detection exists).
  - `skipped` — the user explicitly skipped onboarding; set by FR-009. Suppresses auto-show.
  Any state other than `not_encountered` suppresses automatic onboarding routing (FR-001); onboarding remains manually re-launchable from Settings (FR-010) regardless of state. Lives alongside existing anonymous-profile data (via the profile-write capability added per FR-011) and is carried to the account record on sign-up via the extended migration mechanism (FR-012).
- **Onboarding session**: The transient state of a single pass through the onboarding sparring game — whether the import offer has been shown yet (at game end, or via the one-time Home fallback per FR-007/User Story 3 Scenario 5), and whether it was accepted or declined. Not persisted beyond the session except for the final onboarding status; the one-time "fallback offer already shown" marker is tracked separately, outside the profile record (see data-model.md).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user reaches the playable practice game in under 60 seconds from app load, with zero intermediate screens shown before it starts.
- **SC-002**: At least 95% of first-time users are routed into onboarding exactly once and never see it again automatically on a later visit to the same device.
- **SC-003**: Onboarding never blocks or delays reaching the practice game behind a sign-in step or a routing question — 100% of first-time sessions reach the practice game with no such gate, verified by session instrumentation.
- **SC-004**: Users who skip onboarding can locate and re-launch it from Settings on their next visit, in two navigation actions or fewer.
- **SC-005**: Onboarding's start/finish/skip lifecycle completion rate and its correlation with 7-day unprompted return are measurable from analytics events without additional ad-hoc instrumentation.

## Assumptions

- Onboarding "engagement" is defined purely as the user playing at least one move of their own during the onboarding sparring game (`onboarding_status` flips to `seen`), per the owner's decision to drop aha/coach-reaction detection in favor of a simple, reliable signal — not a detector of any specific coach reaction, not game completion, not a win.
- The existing Easy AI difficulty tier, the existing live per-move coach-feedback mechanism, and the existing authenticated Papergames import flow are reused unmodified; this feature only composes with them at the UI/routing level.
- The existing anonymous local profile store and its existing account-migration mechanism are the sole persistence path for the onboarding flag; no new storage layer is introduced. Per FR-011/FR-012, this does require extending that path with a small profile-write capability, a client migration-payload field, a server migration-handler branch, and a new database column/migration — but no separate/parallel mechanism.
- Sequencing the first-run redirect against session/sign-in restoration at app startup is treated as a concrete design problem to be resolved during planning (not deferred as an implementation detail) — this spec establishes the requirement (FR-014) and the acceptance scenario (User Story 1, Scenario 3) that any implementation must satisfy, without prescribing the exact mechanism.
- A brand-new user, by definition, has not yet created an account; the account-linked side of the onboarding flag (FR-012) only becomes relevant once/if that user signs up or signs in, which is out of scope to implement here beyond ensuring the existing migration mechanism carries the field.
- Auth/account-creation flow implementation itself is explicitly out of scope; this feature only triggers/composes with the existing sign-in flow when a user accepts the import offer.
- A value-prop carousel or multi-screen walkthrough, a curated first-puzzle or first-lesson default path, and an up-front "do you play online?" routing-question gate are explicitly excluded from this feature, per the epic's settled decisions — these are not deferred, they are rejected designs.
- Aha/coach-reaction detection (a mechanism for identifying the first coach reaction specifically, as distinct from the first move played) is explicitly excluded from this feature, per the owner's decision — this is a rejected design, not a deferred one; `useGameBoard.js` remains a pure, store-agnostic hook with no such detection added to it.
- FR-001's app-load auto-routing into onboarding fires only for anonymous first-run users (no active session). A signed-in user whose account has never been onboarded (`onboarding_status` not_encountered) is intentionally NEVER auto-routed into onboarding on app load — they reach onboarding only via the Settings "Replay intro" control (FR-010). This is a settled owner decision, not a gap: signed-in-user auto-detection-and-redirect is out of scope for this feature.
