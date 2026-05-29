---
name: MVP planning — DecodeC4
description: Current state of MVP product spec, key decisions made 2026-04-29, and what to do next
type: project
originSessionId: b5f3f5f6-6551-4043-aa85-675f2c36e6de
---
Canonical MVP doc: `docs/mvp/mvp_product_spec.md` (last updated 2026-04-29)
End-game spec: `docs/product/end_game_product_specifications.md` (last updated 2026-04-29)
Wireframe: `mvp_wireframe.html` (built earlier, for reference only — may be outdated)
PoC: `connect-four/` — keep the backend (2 API endpoints: /api/scores, /api/explain). Rebuild frontend from scratch with proper routing and components.

**Papergames integration: BLOCKED** — their API has no game history endpoint. All papergames features are Phase 2.

---

## Key decisions locked in 2026-04-29 session

**1. 6 pattern categories**
3 free (bitboard-only detection): Immediate Threat, Forced Block, Double Threat
3 paid (solver-required): Fork Setup (multi-move), Zugzwang, Parity Control (Claimeven/Lowinverse/Highinverse)
Split is a single config value — easy to change post-launch.

**2. 3-tier account model**
- Anonymous: basic puzzles (cat 1–3), sparring, one-line summaries only. No Deep Reveals.
- Signed-in free: same + 3 Deep Reveals/day (resets midnight UTC).
- Paid ($4.99/mo · $39/yr): all 6 pattern categories, unlimited Deep Reveals, Personal AI Coach.

**3. Deep Reveal mechanics**
Always user-initiated ("tap to see why"). Auto-reveals after wrong answers are one-liners regardless of tier. Cap never consumed by auto-reveals. Deep Reveal limit is the sign-in motivation for anonymous users.

**4. Anonymous local profile + state migration**
IndexedDB with device-bound UUID for anonymous users. On signup, local state migrates to Supabase. Storage-agnostic abstraction layer — all app components are unaware of which backend is active.

**5. Multi-move puzzles (Fork Setup, Parity Control)**
User and AI alternate moves. AI plays cooperatively — won't block the pattern being taught. Each puzzle has a goal predicate (not just "find best solver score"). E.g., Forced Block checks that user's move eliminates opponent's immediate win, even if another move scores equally.

**6. Personal AI Coach (paid, replaces "Blunder Log")**
MVP version: captures failed puzzles by pattern category, shows weakness map (which categories you miss most), serves review queue. Full prescriptive drills and benchmarking vs. average users are Phase 2.

**7. Analytics schema**
`tracks` table: uid (device hash, always present), user_id (Supabase ID or null), path, event_data (JSON), created_at. Instrument KPI events first: session_start, puzzle_attempted, puzzle_solved_correct, puzzle_solved_wrong, deep_reveal_viewed, signup_completed, paywall_viewed, upgrade_completed.

**8. Infrastructure**
Railway (Node.js backend + static frontend served together), Supabase (Postgres + auth), Cloudflare (DNS + DDoS). No Vercel needed — frontend is static files served from Railway.

**9. i18n**
react-i18next wired from day 1. English at launch, Spanish post-launch.

---

## Next session task
Write `docs/mvp/technical_roadmap.md`. Read both specs and this memory before starting. Role is Principal Engineer. Each item in the roadmap should be epic-level (not small tasks). Must cover all MVP product functionalities.
