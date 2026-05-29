---
name: project-new-mvp-key-decisions
description: Key product decisions made during the new MVP planning session (gaps 18–30 in product_decisions.md)
metadata:
  type: project
---

Key decisions from the 2026-05-28 planning session, now encoded in `docs/mvp/product_decisions.md` gaps 18–30:

- **Stats screen**: unauthenticated = session-only accuracy; authenticated = full all-time stats
- **Anonymous Deep Reveals**: same weekly cap as free users (20/week via IndexedDB); no separate lockout
- **Tied moves**: no special state; a tie with the best = Optimal; tie with non-best = Suboptimal
- **Personal AI Coach MVP scope**: real-time one-liners during play + past mistake review on demand. No weakness map, no SR queue, no prescriptive drills (post-MVP)
- **Game persistence**: new `games` table (migration needed); saved on game completion
- **Blunder capture**: side effect of Post-Game Review lazy analysis; no async job; requires user to open review screen
- **Past Mistakes screen**: authenticated only; browse `blunders` table; Deep Reveal on demand; mark as reviewed
- **Forbidden Columns**: multi-select tagging UI; exact-match predicate; both false positives and false negatives wrong
- **Prompt caching**: all Deep Reveals check `explanation_cache` first; key = `SHA256(movestring + ":" + col)`
- **LLM flag**: "Flag this explanation" on every Deep Reveal → `llm_feedback` table; no moderation UI
- **Analytics**: `tracks` table instrumented throughout; `track()` utility wired in Epic 1b
- **i18n**: react-i18next kept everywhere; all strings through translation keys; Spanish = post-MVP content
- **SR scheduler**: out of scope entirely
- **Payments**: deferred to end; provider TBD; upgrade modal = waitlist email only

**How to apply:** Before starting any epic spec, check these decisions apply correctly to the surface being specified.
