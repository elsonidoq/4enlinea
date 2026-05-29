---
name: project-new-mvp-epics
description: Current state of the new MVP epic breakdown — 10 epics covering the full redesign; product_decisions.md updated to gaps 1–30
metadata:
  type: project
---

The new MVP is a complete visual redesign of the existing app. The authoritative implementation plan is `docs/mvp/epics.md` (v3). The product behavioral decisions are in `docs/mvp/product_decisions.md` (gaps 1–30, was 1–17 before this session).

**Why:** The old visual design (red/yellow discs, BrowserRouter+BottomNav, emoji icons) is being replaced with the mockup design (green/gray discs, state-based navigator, per-surface tints, CoachAvatar). The mockup JSX files at `docs/mvp/mockup/project/` are the authoritative visual spec.

**10 epics in ship order:**
- 1a: Design Tokens & Component Library
- 1b: App Shell + Navigation Migration (keeps i18n, adds analytics)
- 7: Auth & Progress Persistence (reskin existing auth; no payments)
- 2: Challenges Surface (includes Forbidden Columns multi-select)
- 3a: Sparring: Game Board (saves to new `games` table)
- 3b: Post-Game Review + Explorer (blunder writes as side effect)
- 3c: Past Mistakes Review (authenticated users only)
- 4: Lesson Infrastructure + Saga Map (Variant C only)
- 5: Lesson Content (11 JSON files + minor backend additions)
- 6: Data Pipeline (puzzle counts + generation predicates)

**How to apply:** Use this as the starting point for any spec work. Each epic produces one spec (~100–300 lines) + tasks list (~10–25 items).
