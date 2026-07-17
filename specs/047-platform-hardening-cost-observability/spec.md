# Feature Specification: Platform Hardening & Cost Observability

**Feature Branch**: `047-platform-hardening-cost-observability`
**Created**: 2026-07-11
**Status**: Draft
**Input**: User description: "Epic 7 — Platform Hardening & Cost Observability — remediate the findings of `docs/security_audit_fable.md` (dependency vulns, deploy/transport hardening, admin-gate/server-response hardening, repo hygiene + live config verification) and add per-request token/dollar telemetry for OpenAI chat calls."

## Non-obvious facts (from the security audit, `docs/security_audit_fable.md`, 2026-07-07 — reflected verbatim)

- **This epic's mandatory `staging_checks.md` convention applies.** Any acceptance item whose truth can only be confirmed against the live-deployed system (not a local dev run) MUST be recorded in `staging_checks.md` under an "Epic 7" heading with a sign-off checkbox, per the polish-epic convention — not marked done from local evidence alone.
- **The exposure assessment is already done.** The audit found **no real secret committed** in any tracked file or in git history (every credential-shaped string is a placeholder); the frontend has no Supabase client SDK, the service-role key is server-only, RLS is deny-by-default, the solver is spawned with array args (no shell injection). **No secret rotation is indicated.** This feature is therefore *remediation* of the audit's findings F1–F9 plus running its production verification checklist C1–C12 — not a fresh exploration of "are we exposed."
- **F1** (High) — `concurrently` is mis-scoped as a **production** dependency; it drags in `shell-quote` (critical). `ws` (high), `qs`/`ip-address`/`@opentelemetry/core`/`brace-expansion` (moderate).
- **F2** (High, verify) — `NODE_ENV=production` gates **both** the auth-cookie `Secure` flag **and** the admin-authorization gate; if unset in prod, admin write endpoints go world-open and cookies drop `Secure`.
- **F3** (Medium) — no security response headers (no CSP/HSTS/X-Frame-Options/X-Content-Type-Options/Referrer-Policy).
- **F4** (Medium, verify) — the admin localhost gate trusts `req.ip` behind a single trusted proxy hop; safe under exactly one hop, worth verifying live.
- **F5** (Low) — raw `err.message` is echoed on ~53 of the server's 500-error handlers.
- **F6** (Low) — a 673 KB dev-server log is tracked in git, containing user IDs and IPs. **F7** (Low) — `.DS_Store` files are tracked; the root `.gitignore` doesn't exclude them. **F8** (Info) — a localhost-only debug endpoint skips the standard movestring input validation used everywhere else. **F9** (Info) — the project's auto-memory directory (recon-useful operational detail; no secrets) is tracked in git.
- **F10** (Info) — a set of positive security controls were verified sound in the audit (service-role key server-only, RLS enabled, no shell-injection surface, no permissive-CORS footgun, no unsafe HTML rendering, tier/role enforced server-side, Stripe webhook signature verified). These must be preserved, not re-litigated, and should be captured as regression guards so later work doesn't reintroduce the underlying issues.
- **LLM call sites are NOT a single choke-point — there are 4–5 independent call sites.** The production deep-reveal explanation path is the primary OpenAI chat call site. A second, offline-only helper is used by the eval harness script and currently discards usage data and receives no request-scoped context (endpoint/user/purpose) — that context is only available one layer up, in the request handlers that call it. A third, independent OpenAI call exists in the offline compute/eval script. Separately, a live Anthropic call path exists with its own distinct usage-accounting shape (input/output token fields differ from OpenAI's prompt/completion fields), and a billable OpenAI text-to-speech call exists that is priced per character, not per token — both are explicitly out of scope for this feature (see Deferred). Two different model-selection environment variables govern different call sites and their names are easy to confuse for one another. Any telemetry wrapper must **wrap each call individually** — an uncaught error in one call must never silently drop that call's record.
- **Line numbers and exact file/line references anywhere in supporting audit material will drift over time** — they must be re-confirmed against the current codebase at planning time rather than trusted at face value from any prior document.

## Authoritative sources of truth

- `docs/security_audit_fable.md` — §7 "Prioritized Remediation Checklist" is the task backbone; §5 is the production verification checklist (C1–C12); §6 lists verifications that are owner-run against dashboards (Railway, Supabase, GitHub) rather than code changes.
- Memory: `project_secret_scan_placeholders`, `bug_railway_trust_proxy`, `reference_llm_model_env_vars`, `feedback_calllm_error_handling`.
- `docs/architecture/server-conventions.md`, `docs/architecture/llm-coach-endpoints.md`, `docs/best_practices_spec_driven_development.md`.

## Settled decisions

- **Audit + fix the safe items in-scope; breaking or risky remediations become tracked tickets**, not in-scope changes. The audit's own severity ranking and per-finding fix guidance already say which is which.
- **Telemetry scope is OpenAI chat calls only.** The three OpenAI chat call sites (production deep-reveal path, offline eval-harness helper, offline compute/eval script) route through one unified, instrumented call path that returns both the generated content and the usage/token data, plus a per-call context object (which endpoint, which user, why the call was made). The live Anthropic call path and the OpenAI text-to-speech call are explicitly **out of scope for this feature** — see Deferred.
- **Usage is persisted to a new, append-only ledger**, decoupled from the existing explanation cache's lifecycle, and never purged on deploy — so cost history survives across deploys and time, unlike the cache it is decoupled from.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dependency vulnerability remediation (Priority: P1)

As the founder, I want the known dependency vulnerabilities fixed without breaking the build, so that the running server isn't carrying reachable, remotely-triggerable weaknesses (denial-of-service, memory disclosure) in production.

**Why this priority**: Highest-severity, most directly exploitable class of finding (audit F1 — 2 critical, 1 high, several moderate); also the cheapest and lowest-risk to fix (a dependency re-scope plus non-breaking upgrades).

**Independent Test**: Can be fully tested by running the dependency audit tool against the production dependency set before and after the change and confirming the critical/high count drops to zero, independent of any other story in this feature.

**Acceptance Scenarios**:

1. **Given** the dev-only build tool is currently listed as a production dependency, **When** it is correctly re-scoped as a development-only dependency, **Then** it and the vulnerable package it pulls in are no longer part of the production dependency graph.
2. **Given** the remaining flagged vulnerabilities all have non-breaking fixes available, **When** those fixes are applied, **Then** a production-scoped vulnerability scan reports zero critical or high-severity findings.
3. **Given** the fixes have been applied, **When** the full build and fast test suite are run, **Then** both complete successfully with no regressions.
4. **Given** the fixes are verified locally, **When** the application is rebuilt and redeployed, **Then** a vulnerability scan run in the deployed context also reports zero critical or high-severity findings.

---

### User Story 2 - Deploy & transport hardening (Priority: P1)

As the founder, I want the production deployment to fail safe on session-cookie security and admin authorization, and to serve standard security response headers, so that a misconfigured environment cannot silently downgrade session security or expose admin-only functionality to the public internet.

**Why this priority**: The audit rates the underlying environment-configuration risk as High — a single missing environment setting can simultaneously strip cookie security and open every admin endpoint to the world. Response headers close a related but lower-severity gap (clickjacking, MIME-sniffing, protocol downgrade). Both are pre-launch blockers for a production deployment.

**Independent Test**: Can be fully tested against the live deployment by inspecting response headers, cookie flags, and admin-endpoint behavior for unauthenticated requests, independent of the dependency and telemetry stories.

**Acceptance Scenarios**:

1. **Given** the production environment is correctly configured, **When** the server boots, **Then** it either boots normally or, if the production-mode flag is missing while the production database is configured, it refuses to boot or emits a loud, impossible-to-miss warning (exact behavior resolved during technical planning).
2. **Given** the production deployment, **When** any page is requested, **Then** the response carries a content-security policy, HTTP Strict Transport Security, `nosniff`, a frame-ancestors/anti-clickjacking directive, and a referrer policy.
3. **Given** the content-security policy is active, **When** the coach's spoken-audio feature and a full Google OAuth sign-in round-trip are exercised end-to-end, **Then** spoken audio still plays and the OAuth round-trip still succeeds, with no policy violation blocking either — verified by an explicit smoke test before the policy ships. (Error-reporting is not part of this smoke test — see FR-005 and Deferred: no error-reporting service is currently wired for the frontend.)
4. **Given** a successful login in production, **When** the session cookies are inspected, **Then** both the access and refresh cookies carry the secure, http-only, and same-site-lax flags. *(Live-only — recorded in `staging_checks.md`, see FR-025.)*
5. **Given** a plain-HTTP request to the production host, **When** it is made, **Then** the server redirects to HTTPS; and requests for the environment file, the git directory, or JavaScript source maps all return "not found." *(Live-only — recorded in `staging_checks.md`, see FR-025.)*
6. **Given** no authentication, **When** an admin-only endpoint is requested (read or write), **Then** the server responds with an authorization failure, never with the protected data or a success status. *(Live-only for the production-gate confirmation — recorded in `staging_checks.md`, see FR-025.)*

---

### User Story 3 - Admin-gate & server-response hardening (Priority: P2)

As the founder, I want the admin localhost gate to be unspoofable and server error responses to never leak internal detail, so that neither a forged network header nor a routine server error can hand an outside party information or access they shouldn't have.

**Why this priority**: Medium-severity findings that harden defense-in-depth once the P1 issues (which are higher blast-radius) are closed. Still must be resolved pre-launch since they are concrete, testable gaps.

**Independent Test**: Can be fully tested by sending forged-header requests at localhost-gated admin endpoints and malformed input at the debug endpoint, and by inspecting error response bodies for any endpoint that is made to fail, independent of the other stories.

**Acceptance Scenarios**:

1. **Given** a request to a localhost-only admin endpoint carrying a forged "forwarded from localhost" header, **When** it originates from a non-localhost address, **Then** the server rejects it with an authorization failure — the header must not be able to spoof the localhost check.
2. **Given** any public endpoint encounters an unexpected server error, **When** the error response is returned to the caller, **Then** the body contains a generic message only; the underlying error detail is recorded in the server's error log/monitoring integration, never in the client-visible response.
3. **Given** the localhost-only debug classification endpoint, **When** it receives a malformed move sequence, **Then** it rejects the input using the same validation rule applied everywhere else in the codebase, rather than passing it through to the game solver unchecked.
4. **Given** the above changes are shipped, **When** the regression test suite runs, **Then** it includes an automated check that server-error response bodies carry no raw internal error text and that the debug endpoint rejects malformed input.

---

### User Story 4 - Repo hygiene, secret-posture guardrails & live config verification (Priority: P2)

As the founder, I want tracked reconnaissance-useful artifacts removed from version control and the live security-relevant configuration (data-access policies, storage privacy, redirect allowlists, rate limiting, repository protections) verified against the deployed system, so that the repository doesn't leak operational detail and the "sound by design" posture the audit found is also confirmed true in the running system.

**Why this priority**: Lowest severity of the four hardening stories (mostly Low/Info in the audit), but closes the loop between "the code looks correct" and "the deployed system actually behaves correctly" — several of these can only be confirmed by testing the live system, not by reading source.

**Independent Test**: Can be fully tested by inspecting the git-tracked file set for removed artifacts and by running the audit's live-verification checklist items against the deployed system and its dashboards, independent of the other three stories.

**Acceptance Scenarios**:

1. **Given** a dev-server log file and stray desktop-metadata files are currently tracked in git, **When** they are removed from tracking and added to the ignore list, **Then** they no longer appear in `git status` or future commits, and the same category of file is prevented from being re-added.
2. **Given** the project's auto-memory directory contains no secrets but does contain infrastructure/recon detail, **When** this feature is completed, **Then** a deliberate, documented decision has been made about whether it stays tracked (rather than the status quo persisting by default/inertia).
3. **Given** the live deployment, **When** an unprivileged (anonymous-key) data access attempt is made against a user-data table, **Then** it returns no rows (row-level security is confirmed enforced, not just configured); an unsigned public URL to the private audio-storage bucket returns a client error; and the sign-in redirect allowlist contains no wildcard or unintended origins. *(Live-only — recorded in `staging_checks.md`, see FR-025.)*
4. **Given** the live deployment, **When** a burst of requests exceeds the configured rate limit from a single client address, **Then** the client begins receiving rate-limit rejections (confirming the limiter sees the real client address behind the proxy, not the proxy's own address). *(Live-only — recorded in `staging_checks.md`, see FR-025.)*
5. **Given** the completed remediation, **When** the audit's positive-control findings (service-role key server-only, RLS enforced, no shell-injection surface, no unsafe HTML rendering, server-enforced user tier, signed payment-webhook verification) are reviewed, **Then** they are recorded as explicit regression guards so future feature work does not silently reintroduce any of them.

---

### User Story 5 - LLM token/cost telemetry for OpenAI chat calls (Priority: P1)

As the founder, I want every OpenAI chat completion call in the product to record how many tokens it used and what it cost, tagged with which feature and which user triggered it, so that I can see and control the real dollar cost of the AI coaching features as usage grows.

**Why this priority**: Without this, LLM spend is invisible until the bill arrives — for a solo founder bootstrapping a paid product, unmonitored variable cost is a direct business risk. Ranked P1 because it's independent of the security stories and directly protects runway.

**Independent Test**: Can be fully tested by triggering the production deep-reveal explanation feature and the offline evaluation script, then confirming a usage record with correct model, token counts, and cost appears for each — independent of the four hardening stories.

**Acceptance Scenarios**:

1. **Given** a user triggers the deep-reveal move-explanation feature, **When** the underlying OpenAI chat call completes, **Then** a usage record is persisted capturing which endpoint made the call, which user triggered it, why the call was made, the model used, prompt/completion/total token counts, an estimated dollar cost, and a timestamp.
2. **Given** the offline evaluation script makes an OpenAI chat call outside of any user request, **When** the call completes, **Then** a usage record is persisted with the same shape, using a placeholder (no user) for the user field and an appropriate offline-purpose label.
3. **Given** the model-to-price mapping used for cost estimation, **When** a call is made with a given model, **Then** the recorded cost reflects that specific model's rate, not a different call site's model rate (the two OpenAI call sites in this feature's production path do not necessarily use the same model).
4. **Given** an OpenAI call fails or throws partway through, **When** the failure occurs, **Then** it does not silently vanish — the failure is surfaced/logged distinctly from a successful call, and does not cause a fabricated usage record.
5. **Given** the usage ledger is running in production, **When** a routine deploy happens, **Then** prior usage history is preserved — the ledger is never purged as part of deploy, unlike the unrelated explanation cache it is decoupled from.
6. **Given** a future feature adds a new OpenAI chat call site, **When** it is implemented using the unified call path this feature establishes, **Then** it automatically gets token/cost telemetry without bespoke per-call-site logging code.

---

### Edge Cases

- What happens when the production-mode environment flag is unset but the app is otherwise pointed at production data? (Resolved by US2 AC1 — exact refuse-vs-warn behavior is a technical-planning decision, not a product-scope question.)
- What happens when a security-response-header policy that is too strict blocks a legitimate third-party integration (spoken audio, Google OAuth) that the app depends on? (US2 AC3 requires this be caught by an explicit smoke test before the policy ships, not discovered after. Error reporting is out of this edge case's scope — see Deferred: no error-reporting service is currently wired for the frontend.)
- What happens when an OpenAI call throws or times out mid-call? (US5 AC4 — the call's failure must be visibly logged, and no partial/fabricated usage record may be written.)
- What happens when the localhost-only admin gate is probed with a forged "forwarded-for" header from a non-localhost origin? (US3 AC1 — must be rejected.)
- What happens when a production error path is triggered by a caller with no legitimate access — does the response body leak schema, file paths, or query text? (US3 AC2 — response must be generic; detail goes to logs only.)
- What happens to already-tracked repo artifacts (dev log, `.DS_Store` files) if a future contributor's tooling tries to regenerate them at the same tracked path? (US4 AC1 — the ignore-list update must prevent re-tracking, not just remove the current snapshot.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The production dependency set MUST NOT include the dev-only build/orchestration tool currently mis-scoped as a production dependency, nor the vulnerable package it pulls in transitively.
- **FR-002**: A production-scoped dependency vulnerability scan MUST report zero critical- or high-severity findings after remediation, both locally and in the deployed build context. Any vulnerability whose fix would require a breaking upgrade MUST instead be recorded as a tracked ticket with justification, not silently left unfixed or force-upgraded.
- **FR-003**: The server MUST emit standard security response headers (content-security policy, HTTP Strict Transport Security, MIME-sniffing protection, anti-clickjacking/frame-ancestors, referrer policy) on responses in production.
- **FR-004**: **Corrected during technical planning (see plan.md research.md §2, §4, §5).** The content-security policy MUST explicitly permit the app's real external dependencies that a bare same-origin-only default would silently break. On investigation, that set is narrower than originally assumed: the frontend never calls `Sentry.init()` (`@sentry/react`'s `captureException` is currently a no-op that issues no network request — see Deferred), and the Google OAuth sign-in hop is a full top-level page navigation (`window.location.href` assignment), which standard CSP source directives (`connect-src`/`frame-src`/`form-action`) do not restrict. Neither therefore needs a CSP source directive. The policy MUST explicitly permit: the app's own same-origin data/auth backend (`connect-src 'self'`) and the storage host serving signed coach-audio URLs (`media-src`, derived from the configured Supabase project host). No `form-action`/`frame-src` entry is required for OAuth, and no `connect-src` entry is required for error reporting.
- **FR-005**: Before the content-security policy ships, an explicit smoke test MUST confirm that coach spoken-audio playback still works and that a full Google OAuth sign-in round-trip (redirect out and back) still succeeds, all with the policy active. The error-reporting leg is **N/A for this feature** — no error-reporting service is currently wired for the frontend (see Deferred); this is tracked as a backlog item in `docs/open_issues.md`, not a CSP smoke-test leg.
- **FR-006**: The server MUST fail safe when the production-mode environment flag is not set while pointed at the production data backend — either refusing to boot or emitting an unmissable warning (the specific choice is a technical-planning decision within this constraint).
- **FR-007**: In production, session cookies (both access and refresh) MUST carry the secure, http-only, and same-site-lax attributes; plain-HTTP requests MUST redirect to HTTPS; and requests for the environment file, the git metadata directory, and JavaScript source maps MUST all return "not found."
- **FR-008**: Unauthenticated requests to any admin-only endpoint (read or write) MUST be rejected with an authorization failure, never served successfully, in production.
- **FR-009**: The localhost-only admin gate MUST NOT be bypassable by a client-forged "forwarded-for" style header claiming a localhost origin. The admin gate remains localhost-only (no mandatory admin-session/second-factor check) for this feature; requiring an authenticated admin session in addition to the localhost check is deliberately deferred and MUST be filed as a tracked ticket rather than implemented here (see Out of Scope).
- **FR-010**: Server error responses (5xx) on public endpoints MUST return a generic error message to the caller; the underlying error detail MUST still be captured in server-side logging/monitoring.
- **FR-011**: The localhost-only debug classification endpoint MUST validate its input move-sequence using the same validation rule used by every other endpoint that accepts one, before passing it to the game solver.
- **FR-012**: A regression test MUST assert that 5xx response bodies never contain raw internal error text and that the debug endpoint rejects a malformed move sequence.
- **FR-013**: The dev-server log file and `.DS_Store` files currently tracked in git MUST be removed from version control and added to the ignore configuration so they cannot be re-tracked.
- **FR-014**: A deliberate decision on whether the project's auto-memory directory remains tracked in git MUST be made and documented as part of this feature, rather than left as an unexamined default.
- **FR-015**: The following live-system properties MUST be verified against the deployed system and recorded: row-level data-access security actually blocks unprivileged reads of user-data tables; the coach-audio storage bucket is not publicly readable via an unsigned URL; the sign-in redirect allowlist contains no wildcard or unintended origin; and per-client rate limiting is effective behind the production proxy (limit-exceeding bursts receive rate-limit rejections).
- **FR-016**: The audit's verified-sound positive controls (service-role credential is server-only, row-level security is enabled on user-data tables, no shell-injection surface exists in solver invocation, no permissive-CORS footgun / same-origin API access is preserved, no unsafe raw-HTML rendering exists in the frontend, user tier/role is enforced server-side only, and the payment webhook's signature is verified) MUST be recorded as explicit regression guards so later feature work does not silently reintroduce any of them.
- **FR-017**: Every OpenAI chat completion call made by the three in-scope call sites (the production deep-reveal explanation path, the offline evaluation-harness helper, and the offline compute/evaluation script) MUST route through one unified, instrumented call path.
- **FR-018**: The unified call path MUST return both the generated content and the call's token-usage data (not content alone, as the current call sites do).
- **FR-019**: Each caller of the unified call path MUST supply a context describing which endpoint/feature triggered the call, which user (if any) triggered it, and why the call was made (its purpose).
- **FR-020**: The system MUST derive a dollar-cost estimate for each call from a per-model rate table, correctly distinguishing between the different models used by different in-scope call sites. The rate table MUST be a single, version-controlled, in-repo constants module keyed by model id; externalizing pricing to env vars or a database table is out of scope for this feature unless prices are found to need runtime changes without a deploy.
- **FR-021**: Each call's usage (endpoint/feature, purpose, user, model, prompt tokens, completion tokens, total tokens, estimated cost, timestamp) MUST be persisted as a row in a new, append-only usage ledger that is independent of the existing explanation-cache's lifecycle and is never purged as part of a deploy.
- **FR-022**: An uncaught error in any individual OpenAI call MUST be surfaced/logged distinctly and MUST NOT silently drop that call's telemetry record or fabricate a usage row for a call that didn't complete.
- **FR-023**: The unified call path MUST be structured so that a future new OpenAI chat call site inherits token/cost telemetry automatically by using it, without bespoke per-call-site logging.
- **FR-024**: The live Anthropic call path and the OpenAI text-to-speech call path are explicitly OUT OF SCOPE for telemetry in this feature (see Deferred) and MUST NOT be modified as part of this feature.
- **FR-025**: Every acceptance item in this spec that can only be truthfully confirmed against the live-deployed system (prod cookie `Secure` flag, HTTPS redirect, `.env`/`.git`/source-map 404s, admin gate active in prod, live RLS-denial probe, private TTS-audio bucket, per-IP rate limiting, and the code-addressable subset of the audit's C1–C12 checklist) MUST be recorded in `staging_checks.md` under an "Epic 7" heading, each with its own sign-off checkbox, before this feature is considered shipped. These items are staging sign-off deliverables, not items a local dev run can mark passing.

### Key Entities *(include if feature involves data)*

- **LLM usage record**: One row per OpenAI chat completion call. Represents which feature/endpoint triggered the call, which user (if any) triggered it, the purpose of the call, the model used, prompt/completion/total token counts, an estimated dollar cost, and when it happened. Append-only; never deleted or truncated by routine deploys; independent lifecycle from the explanation cache.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A production-scoped dependency vulnerability scan reports zero critical- or high-severity findings, both before and after every future deploy, with no unticketed exceptions.
- **SC-002**: 100% of production responses carry the full set of standard security response headers, verifiable by inspecting any live response. *(Live-deployment-only — confirmed via `staging_checks.md` sign-off, not a locally-run automated check; see FR-025.)*
- **SC-003**: 100% of unauthenticated requests to admin-only endpoints, in production, are rejected — zero successful unauthenticated admin actions are observable. *(Live-deployment-only — confirmed via `staging_checks.md` sign-off; see FR-025.)*
- **SC-004**: Zero raw internal error text is observable in any public-endpoint error response body, across a representative sample of forced-error test requests.
- **SC-005**: The tracked-artifact count for dev-server logs and OS-metadata files in the repository is zero, and stays zero across subsequent commits.
- **SC-006**: 100% of OpenAI chat completion calls made through the three in-scope call sites produce a corresponding usage-ledger record with correct model and non-null cost, verified by triggering each call site and inspecting the ledger.
- **SC-007**: Historical LLM usage records persist across at least one full deploy cycle with zero record loss. *(Live-deployment-only — confirmed via `staging_checks.md` sign-off; see FR-025.)*
- **SC-008**: All of the audit's C1–C12 live-verification checklist items that are code-addressable (i.e., not dashboard-only) are confirmed against the deployed system after this feature ships, and the result of each is recorded as a signed-off line item in `staging_checks.md` under "Epic 7" (see FR-025) — not asserted as a locally-passing acceptance check. A code-addressable C1–C12 item is satisfied by this feature only once its `staging_checks.md` line is checked off; it is never simultaneously claimed as a passing local SC and deferred as an owner-run dashboard item (those remain distinct, per Assumptions).

## Assumptions

- The security audit (`docs/security_audit_fable.md`, dated 2026-07-07) remains an accurate static assessment of the codebase as of feature start; any drift in exact file/line references is expected and will be re-confirmed during technical planning, not assumed stale in substance.
- No secret rotation is required or in scope — the audit found no real secret exposure anywhere in tracked files or git history.
- Checklist items whose authoritative confirmation is inherently dashboard-side (Railway environment variables, Supabase project configuration, GitHub repository settings) are owner-run verifications outside of this feature's code deliverables, though this feature's acceptance criteria still require they be checked and the results recorded.
- **Two distinct kinds of "not locally verifiable" exist, and they are recorded in the same place but are not the same claim**: (1) code-addressable checks whose truth only shows up against the live-deployed system (e.g. prod cookie `Secure` flag, HTTPS redirect, admin gate active in prod, live RLS-denial probe, private TTS bucket, per-IP rate limiting, the code-addressable C1–C12 items) — these are covered by this feature's code changes but their PASS/FAIL is only knowable post-deploy, and (2) items that are dashboard-side by nature (Railway/Supabase/GitHub settings) and were never code-addressable to begin with. Both are recorded in `staging_checks.md` under an "Epic 7" heading with sign-off checkboxes per the epic's mandatory Staging-checks convention (see FR-025), but only kind (1) is "delivered" by this feature's code; kind (2) remains an owner-run verification outside this feature's code deliverables as stated above. A code-addressable, live-only item (kind 1) is never simultaneously counted as a passing local Success Criterion — its acceptance is the staging sign-off checkbox, not a locally-run test.
- Breaking or risky dependency upgrades are deliberately deferred to separately tracked tickets rather than forced through as part of this feature, to avoid destabilizing the build for a hardening pass.
- The three in-scope OpenAI chat call sites may use different models from each other; the cost-estimation approach must not assume a single shared model/rate.
- A cost-visualization dashboard, automated spend rate-limiting, and a full third-party penetration test are explicitly not part of this feature's scope (see below).

## Out of Scope

- A full penetration test or third-party security audit (this feature is remediation of an existing static defensive review, not a new audit).
- Breaking dependency upgrades (tracked as separate tickets with justification).
- A cost-visualization/spend dashboard UI.
- Automated spend rate-limiting or cost-based throttling.
- The Stripe payment secret setup itself (owned by a prior feature; this feature only verifies its handling is sound).
- **Anthropic call-path token/cost telemetry** — deferred; Anthropic's usage-accounting shape (input/output tokens) differs from OpenAI's (prompt/completion tokens) and needs its own rate table and instrumentation, tracked separately.
- **OpenAI text-to-speech cost telemetry** — deferred; text-to-speech is billed per character, not per token, and needs a different usage shape and rate calculation than the chat-completion telemetry this feature builds, tracked separately.
- Dashboard-side-only checklist confirmations (Railway environment variables, Supabase project dashboard settings, GitHub repository branch-protection settings) remain owner-run verifications, not code changes delivered by this feature.
- **Mandatory authenticated admin session as a second factor alongside the localhost gate** — deferred; the admin gate remains localhost-only for this feature (hardened for XFF-spoofing per FR-009), and adding a required admin session on top of it is tracked as a separate ticket, not implemented here.
- **Frontend error-reporting (Sentry) wiring** — deferred; technical planning discovered `@sentry/react`'s `Sentry.init()` is never called in `connect-four/src/`, so `ErrorBoundary.jsx`'s `captureException` call is currently a no-op that transmits nothing. This feature does not wire it up (FR-003/004/005 concern response headers and their interaction with *existing* external calls, not configuring a previously-unconfigured integration). Tracked as a backlog item in `docs/open_issues.md`. FR-005's smoke test therefore covers only the TTS-audio and Google OAuth legs, not error reporting (see FR-005).
