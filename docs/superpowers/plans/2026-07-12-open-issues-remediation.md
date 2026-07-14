# Open-Issues Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the 11 open entries in `docs/open_issues.md` — a mix of buildable code fixes, empirical/ops steps, two SpecKit-routed features, and two accepted-risk close-outs.

**Architecture:** This is a cross-subsystem backlog, not one feature. Each theme below is independently executable (own test cycle, own commit). Themes are ordered so foundational/quick items land first. Two items (OI-1 puzzle correctness, OI-15 Spanish translation content) are explicitly **routed to their own SpecKit specs** rather than forced into bite-sized code here, because empirical investigation showed they exceed a single plan's scope.

**Tech Stack:** Node.js + Express server, React + Vite frontend, `node:test` runner (hand-maintained file lists in `connect-four/package.json`), Supabase/Postgres, `@sentry/node` (server) / `@sentry/react` (frontend), i18next + react-i18next, OpenAI TTS.

## Global Constraints

- **Test runner:** `node:test` + `node:assert/strict` ONLY. No Jest/Mocha/vitest for existing suites. New test files MUST be appended to both the `test` and `test:fast` file lists in `connect-four/package.json` (they enumerate files explicitly — no globbing). Verbatim from `docs/architecture/testing-conventions.md:5`.
- **Regular test command:** `npm run test:fast` from `connect-four/` (never `npm test` unless testing candidate generation — it hangs on solver IPC). Verbatim from `CLAUDE.md` "Running tests".
- **Coordinates:** 0-indexed everywhere in server/tests/specs (row 0 = bottom, col 0 = left). Verbatim from `CLAUDE.md` "Row/column coordinate convention".
- **Two players only:** refer to discs as **green** (P1) / **gray** (P2) in any user-facing copy, never red/yellow. Verbatim from `CLAUDE.md` "Player color aliases".
- **Frontend env vars:** read via `import.meta.env.VITE_*`. Server env vars via `process.env.*` (server loads `--env-file=server/.env`).
- **Migrations:** applied with `node --env-file=server/.env server/migrate.js` from `connect-four/` (no `migrate` npm script exists); sequential-numeric filenames; idempotent ledger in `schema_migrations`.
- **i18n reality:** app currently hardcodes `lng:'en'` and registers only `en`. `es.json` is a 2-of-24-section stub; `fallbackLng:'en'` covers gaps. See `reference_i18n_english_only.md`.

---

## Theme A — Quick wins (OI-6, OI-11, OI-13)

Three low-risk edits with no cross-dependencies. Do first.

### Task A1: OI-6 — Mark superseded de-dup language in the auth-session contract

**Files:**
- Modify: `specs/045-account-session-checkout/contracts/api-auth-session.md:6` (insert note after the `## POST /api/auth/refresh` header, before line 8)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing (doc-only).

Context: `contracts/api-auth-session.md:8-12` and `:18-20` describe a server-side de-dup Map coalescing concurrent same-token refreshes. That Map was **deliberately never built** — `research.md` R1 (2026-07-11) empirically found GoTrue does not enforce rotation-with-reuse-detection. The live behavior is documented in `docs/architecture/server-conventions.md:744` and `connect-four/server/authRefresh.js:6-11`. This contract file is the last artifact describing the unbuilt coalescing as if real.

- [ ] **Step 1: Insert the SUPERSEDED note**

In `specs/045-account-session-checkout/contracts/api-auth-session.md`, immediately after the line `## POST /api/auth/refresh` (existing, `:257`)` (line 6) and before the `**Unchanged request/response.**` paragraph, insert:

```markdown
> **SUPERSEDED (OI-6, 2026-07-12):** The server-side de-dup / coalescing behavior
> described below was never built. `research.md` R1 empirically found GoTrue does
> not enforce refresh-token rotation-with-reuse-detection, so `attemptRefresh` has
> no single-flight Map. Authoritative current behavior:
> `docs/architecture/server-conventions.md` ("No de-dup Map — documented absence")
> and `connect-four/server/authRefresh.js`. See OI-5 for the re-verification path.
```

- [ ] **Step 2: Verify the note is present and references OI-5/OI-6**

Run: `grep -n "SUPERSEDED (OI-6" specs/045-account-session-checkout/contracts/api-auth-session.md`
Expected: one match on the inserted line.

- [ ] **Step 3: Commit**

```bash
git add specs/045-account-session-checkout/contracts/api-auth-session.md
git commit -m "docs(OI-6): mark superseded de-dup language in auth-session contract"
```

### Task A2: OI-11 — Close out admin second-factor as accepted risk

**Decision:** accept localhost-only (owner-confirmed 2026-07-12). No code change to the gate.

**Files:**
- Modify: `docs/open_issues.md` (OI-11 entry, ~lines 219-246)

- [ ] **Step 1: Update the OI-11 status line to CLOSED**

In `docs/open_issues.md`, change the OI-11 `**Status**:` line to:

```markdown
**Status**: ✅ CLOSED — won't-fix (accepted risk, owner-confirmed 2026-07-12). The header-spoof hardening (FR-009, `req.socket.remoteAddress`) is delivered; adding a mandatory authenticated admin session on top of `requireLocalhost` remains deliberately out of scope. Reopen only if the threat model changes (e.g. shared-host / SSH-forward exposure becomes real).
```

- [ ] **Step 2: Commit**

```bash
git add docs/open_issues.md
git commit -m "docs(OI-11): close as accepted-risk (localhost-only admin gate)"
```

### Task A3: OI-13 — Close out per-browser onboarding marker as accepted design

**Decision:** keep per-browser localStorage marker (owner-confirmed 2026-07-12). No code change.

**Files:**
- Modify: `docs/open_issues.md` (OI-13 entry, ~lines 270-292)

- [ ] **Step 1: Update the OI-13 status line to CLOSED**

In `docs/open_issues.md`, change the OI-13 `**Status**:` line to:

```markdown
**Status**: ✅ CLOSED — accepted design limitation (owner-confirmed 2026-07-12). The `onboarding_offer_shown_v1` localStorage marker stays per-browser; a benign always-dismissible import offer re-showing on a new device is acceptable, and syncing it would reintroduce the server-row-for-anonymous problem the design avoids. Reopen only if the offer becomes non-dismissible or costly to re-show.
```

- [ ] **Step 2: Commit**

```bash
git add docs/open_issues.md
git commit -m "docs(OI-13): close as accepted per-browser onboarding marker"
```

---

## Theme B — Deep-reveal cold-load timeout (OI-12)

`DeepRevealPane.jsx:107` sets a 6s `setTimeout` that flips the UI to a failure state (`setTimedOut(true)`) but does **not** `controller.abort()` — so an uncached reasoning-model call that legitimately takes >6s shows "unavailable" while the request is still succeeding server-side. Fix: two-stage timing — a soft "still thinking…" hint at 6s (no failure, request continues), a hard abort+failure at 30s.

### Task B1: Extract timeout constants + soft/hard state helper (test-first)

**Files:**
- Create: `connect-four/src/lib/deepRevealTimeout.js`
- Test: `connect-four/tests/unit/deepRevealTimeout.test.js`
- Modify: `connect-four/package.json` (add test file to `test` + `test:fast` lists)

**Interfaces:**
- Produces:
  - `DEEP_REVEAL_SOFT_MS = 6000` (show "still thinking" hint)
  - `DEEP_REVEAL_HARD_MS = 30000` (abort + show failure)
  - `deepRevealPhase(elapsedMs, resolved)` → `'loading' | 'slow' | 'timedOut' | 'done'`

- [ ] **Step 1: Write the failing test**

```js
// connect-four/tests/unit/deepRevealTimeout.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEEP_REVEAL_SOFT_MS,
  DEEP_REVEAL_HARD_MS,
  deepRevealPhase,
} from '../../src/lib/deepRevealTimeout.js';

test('hard cap is well beyond the soft hint and covers cold reasoning-model calls', () => {
  assert.ok(DEEP_REVEAL_HARD_MS > DEEP_REVEAL_SOFT_MS);
  assert.ok(DEEP_REVEAL_HARD_MS >= 20000);
});

test('phase transitions: loading -> slow -> timedOut, and done wins whenever resolved', () => {
  assert.equal(deepRevealPhase(0, false), 'loading');
  assert.equal(deepRevealPhase(DEEP_REVEAL_SOFT_MS - 1, false), 'loading');
  assert.equal(deepRevealPhase(DEEP_REVEAL_SOFT_MS, false), 'slow');
  assert.equal(deepRevealPhase(DEEP_REVEAL_HARD_MS, false), 'timedOut');
  assert.equal(deepRevealPhase(DEEP_REVEAL_HARD_MS + 5000, true), 'done');
  assert.equal(deepRevealPhase(1000, true), 'done');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test tests/unit/deepRevealTimeout.test.js`
Expected: FAIL — `Cannot find module '.../src/lib/deepRevealTimeout.js'`.

- [ ] **Step 3: Write minimal implementation**

```js
// connect-four/src/lib/deepRevealTimeout.js
// Two-stage timing for the deep-reveal fetch (OI-12). A cold, uncached
// reasoning-model call can exceed the old fixed 6s cap; instead of failing at
// 6s we show a "still thinking" hint and only abort/fail at the hard cap.
export const DEEP_REVEAL_SOFT_MS = 6000;
export const DEEP_REVEAL_HARD_MS = 30000;

export function deepRevealPhase(elapsedMs, resolved) {
  if (resolved) return 'done';
  if (elapsedMs >= DEEP_REVEAL_HARD_MS) return 'timedOut';
  if (elapsedMs >= DEEP_REVEAL_SOFT_MS) return 'slow';
  return 'loading';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && node --test tests/unit/deepRevealTimeout.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Register the test file in package.json**

Add `tests/unit/deepRevealTimeout.test.js` to BOTH the `"test"` and `"test:fast"` script file lists in `connect-four/package.json`.

- [ ] **Step 6: Commit**

```bash
git add connect-four/src/lib/deepRevealTimeout.js connect-four/tests/unit/deepRevealTimeout.test.js connect-four/package.json
git commit -m "feat(OI-12): add two-stage deep-reveal timeout helper + test"
```

### Task B2: Wire the two-stage timeout into DeepRevealPane

**Files:**
- Modify: `connect-four/src/components/DeepRevealPane.jsx:102-167`

**Interfaces:**
- Consumes: `DEEP_REVEAL_SOFT_MS`, `DEEP_REVEAL_HARD_MS` from Task B1.

- [ ] **Step 1: Import the constants**

At the top of `DeepRevealPane.jsx`, add:

```js
import { DEEP_REVEAL_SOFT_MS, DEEP_REVEAL_HARD_MS } from '../lib/deepRevealTimeout.js';
```

- [ ] **Step 2: Replace the single 6s timeout with soft + hard timers**

Replace the current block at lines 102-114 (the `const controller = new AbortController();` through the `fetch(...)` opening) so that:
- a **soft** timer at `DEEP_REVEAL_SOFT_MS` sets a new `slow` state (add `const [slow, setSlow] = useState(false);` near the other state) and does **not** abort or set `timedOut`;
- a **hard** timer at `DEEP_REVEAL_HARD_MS` calls `controller.abort()`, `setTimedOut(true)`, and clears loading.

```js
const controller = new AbortController();
setSlow(false);
const softId = setTimeout(() => setSlow(true), DEEP_REVEAL_SOFT_MS);
const hardId = setTimeout(() => {
  controller.abort();
  setLoading(false);
  setLoadingTts(false);
  setTimedOut(true);
}, DEEP_REVEAL_HARD_MS);

fetch(`${API}/api/explain-move-llm`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  signal: controller.signal,
  body: JSON.stringify({ movestring: moveString, col }),
})
```

- [ ] **Step 3: Clear BOTH timers everywhere the old single timer was cleared**

In the `.then` (line 116), the `.catch` (lines 156-162), and the cleanup return (lines 164-167), replace `clearTimeout(timeoutId)` with `clearTimeout(softId); clearTimeout(hardId);`. In the cleanup return also keep `controller.abort(); stopSpeech();` and add `setSlow(false);`.

- [ ] **Step 4: Render the "still thinking" hint while slow and not yet timed out**

Near the existing loading render, when `loading && slow && !timedOut`, render a "still thinking…" line instead of the plain spinner text. Use an i18n key (add `deepReveal.stillThinking` to `en.json`, value e.g. `"Still thinking… detailed explanations can take a few seconds on the first look."`).

- [ ] **Step 5: Manual verification against a cold call**

Per `docs/open_issues.md` OI-12: the explanation cache is TRUNCATEd on deploy, so the first post-deploy call is uncached. Locally, force a cold path (new movestring/col not in `explanation_cache`), open the deep-reveal pane, and confirm: at ~6s a "still thinking" hint appears (no failure), and the explanation renders when the LLM returns (well before 30s). Record the observation.

- [ ] **Step 6: Commit**

```bash
git add connect-four/src/components/DeepRevealPane.jsx connect-four/src/i18n/en.json
git commit -m "feat(OI-12): two-stage deep-reveal timeout (soft hint at 6s, hard abort at 30s)"
```

---

## Theme C — Frontend Sentry (OI-10)

`ErrorBoundary.jsx:3,16` imports `@sentry/react` and calls `captureException`, but there is **no `Sentry.init` in `src/`** and no frontend DSN — so it's a no-op. Wire it up (owner-confirmed: "wire it up"). Server-side Sentry is already gated on `process.env.SENTRY_DSN` (`index.js:77-83`), commented out in `connect-four/.env.example:44`. Browser Sentry POSTs to `*.ingest.sentry.io`, which the CSP `connect-src` (`index.js:117`) does not allow.

### Task C1: Initialize frontend Sentry + provision DSN + CSP allowance

**Files:**
- Modify: `connect-four/src/main.jsx:1-11` (add `Sentry.init` before render)
- Modify: `connect-four/.env.example` (add `VITE_SENTRY_DSN` and confirm server `SENTRY_DSN`)
- Modify: `connect-four/server/index.js:117` (add Sentry ingest host to `connectSrc`)

**Interfaces:**
- Consumes: `import.meta.env.VITE_SENTRY_DSN` (frontend), `process.env.SENTRY_DSN` (server, existing).

Note: this theme has no unit test — it's SDK initialization + a CSP-directive string + env docs. Verification is a manual browser check (Step 5). This matches the repo's "no DOM harness" reality; do not fabricate a Sentry unit test.

- [ ] **Step 1: Add `Sentry.init` to the frontend entrypoint**

In `connect-four/src/main.jsx`, before `createRoot(...).render(...)`, add:

```jsx
import * as Sentry from '@sentry/react';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
```

(Gated exactly like the server's `if (process.env.SENTRY_DSN)` at `index.js:77`; a missing DSN → no-op, so dev/local is unaffected.)

- [ ] **Step 2: Document the frontend DSN in `.env.example`**

In `connect-four/.env.example`, near the existing commented `# SENTRY_DSN=...` (line 44), add:

```
# Frontend (browser) Sentry DSN — separate project/DSN from the server SENTRY_DSN above.
# Must be exposed to the client via the VITE_ prefix.
# VITE_SENTRY_DSN=https://<public-key>@o<org>.ingest.sentry.io/<project>
```

- [ ] **Step 3: Allow the Sentry ingest host in the CSP**

In `connect-four/server/index.js`, extend the `connectSrc` directive (line 117) to include the Sentry ingest host. Use an env-derived host so it isn't hardcoded to a project:

Above the `helmet(...)` call (near line 109 where `SUPABASE_HOST` is derived), add:

```js
const SENTRY_INGEST = process.env.SENTRY_INGEST_HOST || 'https://*.ingest.sentry.io';
```

Then change line 117 to:

```js
connectSrc: ["'self'", PAPERGAMES_ORIGIN, PAPERGAMES_WS, SENTRY_INGEST],
```

(Follow the existing comment at `index.js:88-105` warning that `connect-src` gaps only break in prod, not Vite dev.)

- [ ] **Step 4: Re-add the error-reporting leg to the CSP smoke test**

Spec 047 FR-005 dropped the "error events reach the reporting service" leg as N/A (per OI-10). Locate that smoke-test doc/checklist (`specs/047-*/` and/or `staging_checks.md`) and restore the leg, noting it now requires `VITE_SENTRY_DSN` set and the `connect-src` Sentry allowance.

- [ ] **Step 5: Manual browser verification**

With `VITE_SENTRY_DSN` set to a real test project DSN, build and serve the Express-served `dist` (NOT Vite dev — CSP isn't applied under Vite dev per `project_csp_helmet_traps.md`), trigger a thrown error inside a component (temporary throw), and confirm in the browser Network tab that the POST to `*.ingest.sentry.io` is **not** CSP-blocked and the event appears in Sentry. Remove the temporary throw.

- [ ] **Step 6: Commit**

```bash
git add connect-four/src/main.jsx connect-four/.env.example connect-four/server/index.js
git commit -m "feat(OI-10): initialize frontend Sentry + allow ingest host in CSP"
```

### Task C2: Update OI-10 status + resolve the gap note

**Files:**
- Modify: `docs/open_issues.md` (OI-10 entry)

- [ ] **Step 1: Mark OI-10 resolved with the delivered pieces**

Update the OI-10 `**Status**:` line to `✅ RESOLVED 2026-07-12` and summarize: `Sentry.init` added in `main.jsx` gated on `VITE_SENTRY_DSN`; `.env.example` documents the frontend DSN; CSP `connect-src` now allows the Sentry ingest host; CSP smoke-test error leg restored. Note the deploy prerequisite: `VITE_SENTRY_DSN` must be set in the frontend build env and `SENTRY_DSN` in the server env.

- [ ] **Step 2: Commit**

```bash
git add docs/open_issues.md
git commit -m "docs(OI-10): mark frontend Sentry wired up"
```

---

## Theme D — React Testing Library adoption (OI-7)

Owner-confirmed: adopt React Testing Library (jsdom). The repo has zero DOM test infra today; component behavior is only testable via extracted pure functions (`testing-conventions.md:152-170`). This theme adds the harness and one real component test so the pattern is established, then documents it. Do this **before** any future work that wants render/remount assertions.

### Task D1: Add RTL + jsdom dev tooling and a runnable DOM test

**Files:**
- Modify: `connect-four/package.json` (devDependencies + a new `test:dom` script)
- Create: `connect-four/tests/dom/setup.js` (jsdom global registration for node:test)
- Create: `connect-four/tests/dom/ErrorBoundary.dom.test.jsx` (first real component test)

**Interfaces:**
- Produces: a `test:dom` npm script and a documented pattern for DOM tests using `node:test` + jsdom + `@testing-library/react`.

Rationale for keeping `node:test`: Global Constraints forbid introducing Jest/vitest for existing suites. `@testing-library/react` is runner-agnostic; jsdom can be registered as a global environment for `node:test` via a `--import` setup file. Keep DOM tests in a **separate** `test:dom` script (they need the jsdom global) rather than folding into `test:fast`.

- [ ] **Step 1: Install dev dependencies**

Run:
```bash
cd connect-four && npm install -D jsdom @testing-library/react @testing-library/dom global-jsdom
```
Expected: `jsdom`, `@testing-library/react`, `@testing-library/dom`, `global-jsdom` added to `devDependencies`.

- [ ] **Step 2: Create the jsdom setup file**

```js
// connect-four/tests/dom/setup.js
// Registers a jsdom global environment so node:test can render React components.
// Imported via `node --import ./tests/dom/setup.js --test` (see the test:dom script).
import 'global-jsdom/register';
```

- [ ] **Step 3: Write the first DOM test (failing until wired)**

```jsx
// connect-four/tests/dom/ErrorBoundary.dom.test.jsx
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../../src/components/ErrorBoundary.jsx';

function Boom() {
  throw new Error('boom');
}

test('ErrorBoundary renders the fallback when a child throws', () => {
  // Suppress React's expected error log noise for this deliberate throw.
  const orig = console.error;
  console.error = () => {};
  try {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
  } finally {
    console.error = orig;
  }
  // ErrorFallback shows a Retry button (role=button). Assert the fallback mounted.
  assert.ok(screen.getByRole('button'));
});
```

Note: `ErrorBoundary` uses `useTranslation()` in its fallback; the i18n side-effect import initializes synchronously, and missing keys fall back to the key string, so no provider wrapper is required. If the render throws on i18n, wrap with a minimal `I18nextProvider` importing `src/i18n/index.js`.

- [ ] **Step 4: Add the `test:dom` script**

In `connect-four/package.json` `scripts`, add:

```json
"test:dom": "node --import ./tests/dom/setup.js --test tests/dom/"
```

- [ ] **Step 5: Run the DOM test**

Run: `cd connect-four && npm run test:dom`
Expected: PASS (1 test) — the fallback button is found.

- [ ] **Step 6: Commit**

```bash
git add connect-four/package.json connect-four/package-lock.json connect-four/tests/dom/
git commit -m "test(OI-7): add React Testing Library + jsdom DOM harness with first component test"
```

### Task D2: Document the DOM-test convention

**Files:**
- Modify: `docs/architecture/testing-conventions.md` (add a "DOM / component tests" section)
- Modify: `docs/open_issues.md` (OI-7 entry → RESOLVED)

- [ ] **Step 1: Add the convention section**

In `testing-conventions.md`, after the Pure Function Extraction Pattern section, add a "DOM / component tests (React Testing Library)" section stating: DOM tests live under `connect-four/tests/dom/*.dom.test.jsx`, run via `npm run test:dom` (separate from `test:fast` because they need the jsdom global registered through `tests/dom/setup.js`), use `@testing-library/react`'s `render`/`screen`, and are the right tool for render/remount/interaction assertions that the pure-function pattern can't express. Keep pure-function extraction as the default for pure logic.

- [ ] **Step 2: Mark OI-7 resolved**

Update the OI-7 `**Status**:` line to `✅ RESOLVED 2026-07-12 — React Testing Library + jsdom adopted under `npm run test:dom`; documented in testing-conventions.md`.

- [ ] **Step 3: Commit**

```bash
git add docs/architecture/testing-conventions.md docs/open_issues.md
git commit -m "docs(OI-7): document DOM-test convention; close OI-7"
```

---

## Theme E — Language switcher wiring (OI-15, code half)

Owner-confirmed: wire up a language switcher. **Split:** this theme delivers the *switcher machinery* (buildable now with real code). The *Spanish translation content* (`es.json` covers only 2 of 24 key-sections) is a separate content effort — routed to SpecKit / owner in Theme H. Until the translation lands, selecting `es` renders mostly English via `fallbackLng:'en'`, which is acceptable and non-regressive.

### Task E1: Add a persisted-language hook (test-first)

**Files:**
- Create: `connect-four/src/lib/useLanguage.js`
- Test: `connect-four/tests/unit/useLanguage.test.js`
- Modify: `connect-four/package.json` (register test file)

**Interfaces:**
- Produces:
  - `LANG_STORAGE_KEY = 'app_language'`
  - `SUPPORTED_LANGS = ['en', 'es']`
  - `readStoredLang(fallback = 'en')` → one of SUPPORTED_LANGS (falls back if stored value is absent/invalid)
  - `writeStoredLang(lang)` → void (try/catch, private-browsing safe)

Follows the established `useAudio.js` localStorage-pattern (dedicated hook/helpers, no direct localStorage reads elsewhere).

- [ ] **Step 1: Write the failing test**

```js
// connect-four/tests/unit/useLanguage.test.js
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { LANG_STORAGE_KEY, SUPPORTED_LANGS, readStoredLang, writeStoredLang } from '../../src/lib/useLanguage.js';

// Minimal localStorage shim for node:test (no jsdom needed for the pure helpers).
beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
});

test('supported langs and key are stable', () => {
  assert.deepEqual(SUPPORTED_LANGS, ['en', 'es']);
  assert.equal(LANG_STORAGE_KEY, 'app_language');
});

test('readStoredLang falls back for missing or invalid values', () => {
  assert.equal(readStoredLang(), 'en');
  writeStoredLang('es');
  assert.equal(readStoredLang(), 'es');
  globalThis.localStorage.setItem(LANG_STORAGE_KEY, 'fr');
  assert.equal(readStoredLang(), 'en'); // 'fr' unsupported -> fallback
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test tests/unit/useLanguage.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// connect-four/src/lib/useLanguage.js
// Persisted UI-language preference (OI-15). Mirrors the useAudio localStorage
// pattern: components MUST NOT read localStorage for language directly — use
// these helpers / the hook so the storage key and validation stay in one place.
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const LANG_STORAGE_KEY = 'app_language';
export const SUPPORTED_LANGS = ['en', 'es'];

export function readStoredLang(fallback = 'en') {
  try {
    const v = globalThis.localStorage?.getItem(LANG_STORAGE_KEY);
    return SUPPORTED_LANGS.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

export function writeStoredLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  try {
    globalThis.localStorage?.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* private browsing — ignore */
  }
}

export function useLanguage() {
  const { i18n } = useTranslation();
  const [lang, setLang] = useState(() => readStoredLang(i18n.language || 'en'));
  const changeLanguage = useCallback(
    (next) => {
      if (!SUPPORTED_LANGS.includes(next)) return;
      writeStoredLang(next);
      i18n.changeLanguage(next);
      setLang(next);
    },
    [i18n],
  );
  return { lang, changeLanguage, supported: SUPPORTED_LANGS };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && node --test tests/unit/useLanguage.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Register the test file**

Add `tests/unit/useLanguage.test.js` to the `test` + `test:fast` lists in `connect-four/package.json`.

- [ ] **Step 6: Commit**

```bash
git add connect-four/src/lib/useLanguage.js connect-four/tests/unit/useLanguage.test.js connect-four/package.json
git commit -m "feat(OI-15): add persisted useLanguage hook + helpers"
```

### Task E2: Register the `es` bundle and honor the stored language at init

**Files:**
- Modify: `connect-four/src/i18n/index.js` (register `es`, read stored lang for `lng`)

**Interfaces:**
- Consumes: `readStoredLang` from Task E1 (import ordering note below).

- [ ] **Step 1: Register `es` and set `lng` from storage**

Replace `connect-four/src/i18n/index.js` with:

```js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import es from './es.json';
import { readStoredLang } from '../lib/useLanguage.js';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    lng: readStoredLang('en'),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
```

Note: `useLanguage.js` imports `react`/`react-i18next` only for the hook, and `readStoredLang` is a plain function with no React dependency at call time — safe to import here. If a circular-import warning appears, move `LANG_STORAGE_KEY`/`SUPPORTED_LANGS`/`readStoredLang`/`writeStoredLang` into a dependency-free `src/lib/languagePref.js` and re-export from `useLanguage.js`.

- [ ] **Step 2: Verify the app still boots in `en` and can load `es`**

Run: `cd connect-four && npm run build` (must succeed). Then, in the browser dev app, run `localStorage.setItem('app_language','es'); location.reload()` and confirm the two translated `es` sections (`setcard`, `onboarding`) render in Spanish while everything else falls back to English (expected until Theme H).

- [ ] **Step 3: Commit**

```bash
git add connect-four/src/i18n/index.js
git commit -m "feat(OI-15): register es bundle and init language from stored preference"
```

### Task E3: Add a language selector to Settings

**Files:**
- Modify: `connect-four/src/screens/SettingsScreen.jsx` (add a language `<section>` in the authenticated stack, ~line 397 area)
- Modify: `connect-four/src/i18n/en.json` (+ `es.json`) — add `settings.language` label keys

**Interfaces:**
- Consumes: `useLanguage` from Task E1.

- [ ] **Step 1: Add label keys**

In `en.json`, add under a `settings` section (create if absent): `"language": { "label": "Language", "en": "English", "es": "Español" }`. Add the same keys to `es.json` with Spanish values (`"Idioma"`, `"Inglés"`, `"Español"`) to keep the two in lockstep for these keys.

- [ ] **Step 2: Render the selector**

In `SettingsScreen.jsx`, import `useLanguage` and add a new `<section>` in the authenticated stack (near the "Replay intro" section at line 397):

```jsx
<section>
  <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>
    {t('settings.language.label')}
  </label>
  <select
    value={lang}
    onChange={(e) => changeLanguage(e.target.value)}
    className="btn btn-ghost"
    style={{ width: '100%', fontSize: 14, padding: '10px' }}
  >
    <option value="en">{t('settings.language.en')}</option>
    <option value="es">{t('settings.language.es')}</option>
  </select>
</section>
```

with `const { lang, changeLanguage } = useLanguage();` added near the existing hooks (line 11-12 area).

- [ ] **Step 3: Manual verification**

In the dev app Settings, switch language to Español and confirm: the two translated sections change immediately, the choice persists across reload (localStorage `app_language`), and switching back to English restores everything.

- [ ] **Step 4: Commit**

```bash
git add connect-four/src/screens/SettingsScreen.jsx connect-four/src/i18n/en.json connect-four/src/i18n/es.json
git commit -m "feat(OI-15): add language selector to Settings"
```

### Task E4: Update the i18n-english-only memory + OI-15 status

**Files:**
- Modify: `docs/open_issues.md` (OI-15 entry)
- Update memory `reference_i18n_english_only.md` (now partially stale — switcher exists, but `es.json` still incomplete)

- [ ] **Step 1: Update OI-15 status to reflect the split**

Set OI-15 `**Status**:` to: `⏳ PARTIAL 2026-07-12 — switcher machinery SHIPPED (useLanguage hook, es bundle registered, Settings selector). REMAINING: es.json covers only 2 of 24 key-sections; full Spanish translation is a separate content effort (see Theme H / its own spec). Selecting es renders English via fallback until then.`

- [ ] **Step 2: Correct the memory file**

Update `reference_i18n_english_only.md` to note a switcher now exists and reads `app_language`, but `es.json` is still incomplete so the app is effectively English until the translation lands. Do NOT delete the memory — its "es.json is dead code" claim is now only half-true and the incompleteness trap remains.

- [ ] **Step 3: Commit**

```bash
git add docs/open_issues.md
git commit -m "docs(OI-15): switcher shipped; flag remaining Spanish-translation content work"
```

---

## Theme F — Refresh-token rotation probe (OI-5), then conditional de-dup

Owner-confirmed: re-run the probe against a **real email/OAuth session**. The de-dup Map is built **only if** the probe fails. This theme is empirical-gated.

### Task F1: Run the two-concurrent-refresh probe against a real session

**Files:**
- Create: `connect-four/scripts/probe-refresh-rotation.mjs` (probe harness)

**Interfaces:**
- Produces: a pass/fail observation recorded in `research.md` / this plan.

This is an empirical gate, not a TDD cycle. The prior check (research.md R1) used `signInAnonymously()`; this MUST use a real email/password (or OAuth) session. Requires a real test account's credentials — an owner-supplied input.

- [ ] **Step 1: Write the probe script**

```js
// connect-four/scripts/probe-refresh-rotation.mjs
// OI-5: re-run the FR-002a rotation probe against a REAL email/OAuth session
// (research.md R1 only tested anonymous sessions). Usage:
//   node --env-file=server/.env scripts/probe-refresh-rotation.mjs <email> <password>
import { createClient } from '@supabase/supabase-js';

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('usage: probe-refresh-rotation.mjs <email> <password>');
  process.exit(2);
}
const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const client = createClient(url, anon, { auth: { persistSession: false } });

const { data: signIn, error: signInErr } = await client.auth.signInWithPassword({ email, password });
if (signInErr) { console.error('sign-in failed:', signInErr.message); process.exit(1); }
const refreshToken = signIn.session.refresh_token;

// Fire two concurrent refreshes presenting the SAME refresh token from two clients.
const c1 = createClient(url, anon, { auth: { persistSession: false } });
const c2 = createClient(url, anon, { auth: { persistSession: false } });
const [r1, r2] = await Promise.all([
  c1.auth.refreshSession({ refresh_token: refreshToken }),
  c2.auth.refreshSession({ refresh_token: refreshToken }),
]);
console.log('call1:', r1.error ? `ERROR ${r1.error.message}` : 'OK');
console.log('call2:', r2.error ? `ERROR ${r2.error.message}` : 'OK');
const bothOk = !r1.error && !r2.error;
console.log(bothOk
  ? 'RESULT: no rotation-with-reuse-detection (real session) — NO de-dup Map needed.'
  : 'RESULT: rotation detected (refresh_token_already_used) — BUILD the de-dup Map (Task F2).');
process.exit(0);
```

- [ ] **Step 2: Run the probe (owner-run, needs real test credentials)**

Run: `cd connect-four && node --env-file=server/.env scripts/probe-refresh-rotation.mjs <test-email> <test-password>`
Record the RESULT line.

- [ ] **Step 3: Update `server-conventions.md` and OI-5 with the finding**

In `docs/architecture/server-conventions.md:744` (the "No de-dup Map" note), update the **Caveat** to record that the probe was re-run against a real email/OAuth session on 2026-07-12 with the observed outcome. Update `docs/open_issues.md` OI-5 status: `✅ RESOLVED` if both calls succeeded (no code needed); or `→ proceed to Task F2` if rotation was detected.

- [ ] **Step 4: Commit**

```bash
git add connect-four/scripts/probe-refresh-rotation.mjs docs/architecture/server-conventions.md docs/open_issues.md
git commit -m "chore(OI-5): re-run refresh-rotation probe against a real session; record finding"
```

### Task F2: (CONDITIONAL — only if F1 detected rotation) Build the single-flight de-dup Map

**Skip this task entirely if F1's RESULT was "no rotation".** Do not build unmotivated machinery (Principle II).

**Files:**
- Modify: `connect-four/server/authRefresh.js:21-40` (add TTL-bounded in-flight Map inside `createAttemptRefresh`)
- Test: `connect-four/server/authRefresh.test.mjs` (add coalescing test; the existing "two concurrent calls both succeed independently" test at lines 94-109 asserts the OPPOSITE and must be updated)

**Interfaces:**
- Consumes: `createAttemptRefresh({ authClient })` — signature unchanged; returns `attemptRefresh(refreshToken)`.
- Produces: same `attemptRefresh(refreshToken)` returning `{ accessToken, refreshToken } | null`, now coalescing concurrent same-token calls per research.md R1 (lines 99-104): keyed by the refresh-token string, TTL-bounded in-memory Map.

- [ ] **Step 1: Update the failing/opposite test to expect coalescing**

In `authRefresh.test.mjs`, replace the "no coalescing" assertion (currently `assert.equal(callLog.length, 2)`, lines ~94-109) with a test that fires two concurrent `attemptRefresh(token)` calls sharing one token and asserts the underlying `authClient.auth.refreshSession` was called **once** (`callLog.length === 1`) and both callers received the same resolved value.

- [ ] **Step 2: Run it to verify it fails**

Run: `cd connect-four && node --test server/authRefresh.test.mjs`
Expected: FAIL — current implementation calls `refreshSession` twice.

- [ ] **Step 3: Implement the TTL-bounded in-flight Map**

Inside `createAttemptRefresh`, add a `Map` keyed by `refreshToken` holding the in-flight promise; on a hit, return the same promise; delete the entry when it settles (and defensively after a short TTL). Mirror the in-memory job-map pattern research.md R1 references.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd connect-four && node --test server/authRefresh.test.mjs`
Expected: PASS.

- [ ] **Step 5: Update the docs to reflect the Map now exists**

Reverse the "documented absence" note in `server-conventions.md:744` and remove the SUPERSEDED framing from OI-6/the contract (the coalescing is now real). Update OI-5 to RESOLVED-with-code.

- [ ] **Step 6: Commit**

```bash
git add connect-four/server/authRefresh.js connect-four/server/authRefresh.test.mjs docs/architecture/server-conventions.md docs/open_issues.md specs/045-account-session-checkout/contracts/api-auth-session.md
git commit -m "feat(OI-5): add single-flight de-dup Map after real-session rotation confirmed"
```

---

## Theme G — Onboarding carryover ops verification (OI-14)

The code path is correct by construction (`userHelpers.js` includes `onboarding_status` in `USER_PROFILE_SELECT_COLUMNS`, `defaultUserProfile`, and the migrate carryover at `userRoutes.js:527-540`). The only gap is that migration `057_users_onboarding_status.sql` was never applied locally, so PostgREST silently drops the unknown column on UPDATE. This is an ops/verify task, not code.

### Task G1: Apply migration 057 and verify carryover end-to-end

**Files:**
- Apply: `connect-four/server/migrations/057_users_onboarding_status.sql` (idempotent, `ADD COLUMN IF NOT EXISTS`, no grants)

- [ ] **Step 1: Apply the migration**

Run (from `connect-four/`, per `reference_supabase_connection.md` for the `DATABASE_URL`/session-pooler string):
```bash
node --env-file=server/.env server/migrate.js
```
Expected: `057_users_onboarding_status.sql` applied (or already-in-ledger). Confirm the `users` table now has the `onboarding_status` column with `CHECK (onboarding_status IN ('not_encountered','seen','skipped'))`.

- [ ] **Step 2: Restart the dev server**

Restart `npm run dev` so the running process picks up the Epic-8 server code (no hot-reload for server code).

- [ ] **Step 3: Run the account-carryover verification**

Follow `specs/048-onboarding-experience/quickstart.md:60-71` ("Manual verification — account carryover"): complete onboarding anonymously to reach `seen`, sign up from within the app, then `GET /api/user/profile` (authenticated) or query the `users` row and confirm `onboarding_status: 'seen'`. Then sign in on a clean-IndexedDB browser and confirm onboarding does not auto-show post-sign-in.

- [ ] **Step 4: Record the result and mark OI-14**

Update `docs/open_issues.md` OI-14 status to `✅ RESOLVED 2026-07-12` (or note the staging-deploy prerequisite if only verified locally). Confirm `staging_checks.md`'s Epic-8 entry reflects that migration 057 must be applied on deploy.

- [ ] **Step 5: Commit (docs only — the migration file already exists)**

```bash
git add docs/open_issues.md docs/architecture/staging_checks.md
git commit -m "docs(OI-14): verify onboarding_status carryover after applying migration 057"
```

---

## Theme H — Lesson narration audio for the 12 remaining lessons (OI-9) + Spanish translation (OI-15 content)

Two owner-run content efforts. Both cost real money/time and the owner chooses scope/order.

### Task H1: Generate narration audio for the 12 lessons (owner-run, real OpenAI TTS cost)

**Files (generated):** `connect-four/public/audio/lessons/*.mp3` + `audio` fields written into `connect-four/lessons/lesson-02..lesson-13*.json`.

The endpoint `POST /api/admin/lessons/:id/generate-audio` (`index.js:867`, `requireLocalhost`+`requireAdmin`) calls `generateLessonAudio` (`lessonAudio.js:52`), which is idempotent (skips messages whose `audio` already matches the text hash), writes MP3s to `public/audio/lessons/`, and persists the updated lesson JSON. TTS is OpenAI (`ttsProvider.js`, needs `OPENAI_API_KEY` — present per `feedback_openai_key_present.md`).

The 12 lesson `id`s needing audio (all except `immediate-threat`): `block-before-build`, `the-fork`, `odd-rows-belong-to-red`, `claimeven`, `z-threats`, `opening-centre`, `opening-imitate`, `undercut`, `overcut`, `figure-7-trap`, `j-shape`, `opening-sharp`.

- [ ] **Step 1: Generate audio per lesson (localhost only, one at a time)**

For each of the 12 `id`s, with the dev server running on localhost:
```bash
curl -X POST http://localhost:3001/api/admin/lessons/<id>/generate-audio
```
Expected JSON: `{ lesson, generated: [...], failed: [] }`. Inspect `failed` — a non-empty `failed` array means some clips didn't synthesize (re-run; generation is incremental so completed clips are skipped).

- [ ] **Step 2: Verify MP3s and JSON updates**

Confirm new files under `connect-four/public/audio/lessons/` and that each lesson JSON's `coachMessages[].audio` now points at `/audio/lessons/<hash>.mp3`. Spot-check playback in the lesson UI.

- [ ] **Step 3: Commit the generated content (never generate in prod — FR-012a)**

```bash
git add connect-four/public/audio/lessons/*.mp3 connect-four/lessons/lesson-*.json
git commit -m "content(OI-9): generate narration audio for the 12 remaining lessons"
```

- [ ] **Step 4: Mark OI-9 and redeploy**

Update `docs/open_issues.md` OI-9 to reflect which lessons now have audio. Redeploy so the committed MP3s ship.

### Task H2: (SPECKIT-ROUTED) Complete the Spanish translation of `es.json`

`es.json` covers 2 of 24 top-level key-sections. Completing it in lockstep with `en.json` (22 missing sections, ~33KB of source copy) is a content-translation effort with product-copy quality bars (green/gray disc terms, coach voice, pedagogy), not a mechanical code task.

- [ ] **Step 1: Spin up a dedicated spec**

Run `/speckit-specify` for "Spanish localization content — bring es.json to full parity with en.json." Scope: translate all 22 missing sections, add a key-parity test (`en`/`es` top-level + nested keys match) added to `test:fast`, and a native-review pass. The switcher machinery (Theme E) is a hard dependency and is already shipped.

- [ ] **Step 2: (in that spec) Add the key-parity guard test**

The parity test belongs with the translation spec, not here: it will fail until `es.json` is complete, so it can't land in this plan without breaking `test:fast`.

---

## SpecKit-Routed Item — OI-1 (single-answer puzzle scoring by pattern)

**Not implemented in this plan.** Empirical investigation (this session) found OI-1 exceeds a single plan's scope and needs a payload/contract change:

- `ChallengeScreen.jsx:241-242` judges single-answer categories by `data.quality === 'optimal'` (solver-score), while the 3 multi-solution categories use `data.accepted`. The six single-answer categories (`z_threat`, `overcut`, `claimeven`, `undercut`, `figure_7`, `j_shape`) always get `accepted: null` from the server.
- **Blocker:** `/api/evaluate-move` (`index.js:1687-1757`) receives only `{ movestring, col, category }`. The single-answer predicate evaluators in `predicates.js` (`evalZThreat`, `evalClaimeven`, `evalUndercut`, `evalOvercut`, `evalFigure7`, `evalJShape`) read `puzzle.highlightMetadata?.column`, `puzzle.correctCol`, or `puzzle.highlightMetadata?.cells` — **none of which are in the request body**. Simply adding these categories to `MULTI_SOLUTION_CATEGORIES` would make every predicate return `wrong`.
- **Design decision required:** either (a) pass a puzzle id and have the server load `highlightMetadata`/`correctCol`, or (b) include the needed metadata in the request body, or (c) evaluate pattern membership client-side against already-loaded puzzle data. This is a correctness-model + API-contract change touching client, server, and the dual-server predicate seam (`project_puzzle_correctness_seams.md`).

**Action:** run `/speckit-specify` for "Single-answer puzzle categories scored by pattern membership, not bare solver-score," carrying the two repro boards from OI-1 as acceptance fixtures (`z_threat` `3333302444422222060315555054` → col 0 must read incorrect; `z_threat` `3333334512266550121166` → `correct_col` 0 must read correct). Read `docs/knowledge-base/<slug>.md` for all six patterns and `project_puzzle_correctness_seams.md` first.

---

## Self-Review

**Spec coverage (11 open issues):**
- OI-1 → SpecKit-Routed section (with discovered blocker). ✓ (routed, not silently dropped)
- OI-5 → Theme F (probe F1, conditional de-dup F2). ✓
- OI-6 → Task A1. ✓
- OI-7 → Theme D (D1 harness, D2 docs). ✓
- OI-9 → Task H1. ✓
- OI-10 → Theme C (C1 wiring, C2 status). ✓
- OI-11 → Task A2 (close-out). ✓
- OI-12 → Theme B (B1 helper, B2 wiring). ✓
- OI-13 → Task A3 (close-out). ✓
- OI-14 → Theme G. ✓
- OI-15 → Theme E (switcher code) + Task H2 (translation, SpecKit-routed). ✓
- Already-resolved OI-2/3/4/8: no tasks (correct). ✓

**Placeholder scan:** no TBD/TODO/"handle edge cases"/"similar to Task N". Code steps carry real code; ops/doc/empirical steps are explicitly marked as such (not TDD) with concrete commands. OI-1 and H2 are honestly routed to SpecKit rather than faked as bite-sized code.

**Type/name consistency:**
- `createAttemptRefresh({ authClient })` → `attemptRefresh(refreshToken)` returning `{ accessToken, refreshToken } | null` — consistent F1/F2 and matches `authRefresh.js:21-40`.
- `DEEP_REVEAL_SOFT_MS`/`DEEP_REVEAL_HARD_MS`/`deepRevealPhase` consistent across B1/B2.
- `LANG_STORAGE_KEY`/`SUPPORTED_LANGS`/`readStoredLang`/`writeStoredLang`/`useLanguage` consistent across E1/E2/E3.
- Every new `*.test.js` includes a "register in package.json test lists" step (Global Constraint honored) except DOM tests, which correctly go under the separate `test:dom` script.
