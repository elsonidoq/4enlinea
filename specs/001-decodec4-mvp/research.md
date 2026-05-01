# Research: DecodeC4 MVP

**Feature**: `001-decodec4-mvp`
**Date**: 2026-04-30
**Source**: `docs/mvp/technical_roadmap.md` (locked decisions) + PoC code analysis

All decisions below were made during the technical roadmap phase and are locked for MVP.
This document records the rationale so future contributors understand why alternatives
were rejected.

---

## Decision 1: Keep existing Node.js server as-is; add endpoints alongside

**Decision**: Extend `connect-four/server/index.js` by adding new routes (`/api/explain-move`,
`/api/track`, `/api/puzzles/*`, `/api/coach/*`, `/api/stripe/*`) without modifying existing
routes (`/api/scores`, `/api/explain`, `/api/ping`).

**Rationale**: The two existing solver endpoints are production-worthy. The `Connect4Solver`
class with its stdin/stdout queue is already correct and has been validated in production
use. Rewriting it risks introducing bugs in the most critical path (solver communication).

**Alternatives considered**:
- Full rewrite in TypeScript: rejected — adds migration risk, no functional gain at MVP scale.
- Separate microservice for LLM/classifier: rejected — over-engineering for a solo founder at 
  < 1000 users; single Railway deployment is simpler and cheaper.

---

## Decision 2: Pattern classifier is rule-based JavaScript, server-side

**Decision**: Implement the pattern classifier as a custom rule-based module (`server/classifier.js`)
that operates on board state + solver scores. No ML, no external API for classification.

**Rationale**:
- Categories 1–3 (Immediate Threat, Forced Block, Double Threat) are fully detectable by
  bitboard operations without additional solver calls. This keeps latency < 100ms.
- Categories 4–6 require solver scores already available in the explain-move request.
  The classification logic can be derived directly from those scores.
- ML overhead and training data requirements are unjustified when the rules are deterministic
  and fully specifiable from the game's theory.

**Alternatives considered**:
- LLM-as-classifier: rejected — LLMs are not reliable for structured classification without
  constrained output formats; adds latency and cost.
- External pattern detection library: rejected — no suitable Connect Four libraries exist;
  building a wrapper would add complexity without value.

---

## Decision 3: Explanation cache in Supabase `explanation_cache` table

**Decision**: Cache explanations by `sha256(moves + candidateCol)` in Supabase. Cache hit
skips LLM call entirely (< 100ms). Cache miss calls Claude Sonnet and writes the result.

**Rationale**:
- The same position/move combination will be seen by multiple users (especially popular
  puzzle positions). Computing the explanation once and sharing it reduces LLM cost
  asymptotically toward zero as the user base grows.
- Supabase is already the DB for this project. A separate Redis layer would add
  infrastructure and operational overhead.
- TTL: none needed for MVP. Explanations for a given position are deterministic (same
  classifier output → same LLM prompt → cached). Only invalidated if the classifier
  changes, at which point the table can be bulk-cleared.

**Alternatives considered**:
- Redis/Upstash: rejected — separate managed service, additional cost, unnecessary for
  MVP scale (< 50 unique positions × 7 columns = 350 possible cache entries at launch).
- In-memory cache on the server: rejected — does not survive server restarts; cross-user
  sharing requires persistence.

---

## Decision 4: Storage-agnostic state layer with IndexedDB ↔ Supabase

**Decision**: `ProfileStore` interface with two implementations: `IndexedDBStore` (anonymous,
device-bound UUID) and `SupabaseStore` (authenticated). All feature code calls `ProfileStore`
only. On signup, state migrates from IndexedDB to Supabase transparently.

**Rationale**: This is a locked architectural decision from the spec. The alternative
(anonymous users have no state) would require losing puzzle progress on signup, which
is a friction point that kills conversion. The migration is one-time and well-bounded.

**Alternatives considered**:
- Server-side session for anonymous users: rejected — requires a backend session store,
  adds infrastructure, and ties device state to server instead of the device.
- Skip the abstraction, use Supabase for all: rejected — anonymous users should not need
  to create accounts to start training. Creating an account to *try the product* is a
  conversion-killing gate.

---

## Decision 5: LLM integration is server-side only (Claude Sonnet)

**Decision**: All Anthropic API calls are made from `server/index.js`. The frontend never
touches the Anthropic API.

**Rationale**: The PoC called the Anthropic API directly from the browser, exposing the API
key. This is a security violation that also prevents caching. Moving to server-side enables:
- API key security (never leaves the server environment)
- Explanation caching (shared across users)
- Rate limiting and cost control

**Alternatives considered**:
- Keep browser-side calls: rejected — API key exposure, no caching, no rate limiting.
- Use a third-party LLM proxy: rejected — adds a vendor dependency and latency hop.

---

## Decision 6: React PWA with react-router-dom and react-i18next

**Decision**: React 18 + Vite, with react-router-dom for client-side routing and
react-i18next for internationalization wired from day 1. English only at launch.

**Rationale**:
- React is already used in the PoC; no new learning curve.
- Vite provides fast dev iteration (HMR) and optimized production builds.
- PWA (manifest + service worker) enables installability on mobile — important for
  a training app where users return daily.
- i18n wired from day 1 because retrofitting it later requires touching every string;
  Spanish is planned post-launch once the product is validated.

**Alternatives considered**:
- Next.js: rejected — SSR overhead not needed for a client-heavy interactive board game;
  Railway deployment is simpler with a static SPA served by Express.
- Remix: rejected — same reasoning.

---

## Decision 7: Supabase for DB + Auth; Railway for hosting

**Decision**: Supabase for managed Postgres + Auth (magic link). Railway for Node.js +
static frontend hosting. Cloudflare for DNS + DDoS.

**Rationale**:
- Supabase: managed, one service for both DB and auth; Postgres is the right choice for
  relational user/puzzle/blunder data; built-in Auth reduces custom session management.
- Railway: simplest path from Node.js + static files to a deployed URL; auto-deploy from
  `main` branch; affordable at MVP scale.
- Cloudflare: free DDoS protection, fast DNS propagation.

**Alternatives considered**:
- Heroku: rejected — pricing changes, Railway is simpler for this use case.
- Vercel + separate API: rejected — adds a separate deployment for the API; the PoC server
  already serves both static files and API from a single process.
- Self-managed Postgres: rejected — unnecessary ops burden for one engineer.

---

## Decision 8: Stripe for payments

**Decision**: Stripe Checkout + Customer Portal. Monthly ($4.99) and annual ($39) plans.

**Rationale**: Stripe is the standard for SaaS payments. Checkout handles the payment UI;
Customer Portal handles subscription management. Both are managed surfaces — no custom
payment UI to build or PCI-scope to worry about.

**Alternatives considered**:
- Paddle: considered — handles VAT automatically for EU; rejected for MVP because Stripe
  is more familiar and faster to integrate; revisit if EU tax compliance becomes an issue.
- LemonSqueezy: similar reasoning; deferred to Phase 2 evaluation.

---

## Decision 9: 50 hand-curated puzzles at launch; no adaptive selection

**Decision**: 50 hand-curated positions (~8 per category) authored and solver-verified before
migration. No algorithmic puzzle generation or adaptive selection at launch.

**Rationale**:
- Hand-curation ensures quality teaching positions. Algorithmic generation can produce
  positions that are technically valid but poor for learning specific patterns.
- Adaptive selection requires blunder data. The MVP collects that data; Phase 2 adapts to it.
- 50 positions is enough to validate the learning loop (8 puzzles/session target) without
  over-investing in content before product-market fit is confirmed.

**Alternatives considered**:
- Algorithmic puzzle generation: rejected for MVP — quality too variable; deferred to
  post-launch once the classifier can validate position quality.
- Fewer puzzles (20): rejected — insufficient for the 8 puzzles/session target across 6
  categories.

---

## Resolved Clarifications

No `[NEEDS CLARIFICATION]` markers were present in the spec. All technical decisions were
already locked in `docs/mvp/technical_roadmap.md` and are recorded above.
