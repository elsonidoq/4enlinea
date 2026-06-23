---
name: feedback-mockup-production-gap
description: "Mockup prototypes use infrastructure (NAV_GROUPS, mkCols, variant rail, app-level useState) that doesn't exist in production — verify every mockup concept against src/ before speccing"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a92b750d-c217-4da0-bd63-3bfb02181583
---

The mockup files at `docs/mvp/mockup/project/` are UX prototypes, not production code. They use a simplified app shell with infrastructure that does not exist in `connect-four/src/`. Before writing a spec or plan that references mockup infrastructure, verify each concept against the production source tree.

**Known mockup-only concepts (do not spec into production):**
- `NAV_GROUPS` constant — no equivalent in production. Screen grouping uses `SCREENS` (screenRegistry.jsx), `URL_MAP` (urlMapping.js), and `SURFACE_BG` (surfaceGroups.js).
- `mkCols()` helper — does not exist in `src/`. The production Board component takes `board[row][col]` with `'red'`/`'yellow'`/`'empty'`, not `cols` strings.
- App-level variant state (`gamesVariant`, `mistakesVariant`) controlled by a rail selector — the rail selector doesn't exist in production. `MistakesListScreen` derives variant internally from auth + fetch. Follow that pattern.
- `setShowAuthModal` on ProfileStore — doesn't exist. Gated screens use local `useState` + render `<AuthModal>` directly (see HomeScreen pattern).

**How to apply:** When a mockup file shows a pattern (state variable, helper function, constant), grep the production `src/` and `server/` trees before writing it into a spec FR. If it doesn't exist, either create it explicitly (like `colsToBoard`) or adapt to the production equivalent (like SCREENS+URL_MAP+SURFACE_BG for NAV_GROUPS). Document the decision in the spec's Assumptions section.

**Systematic fix:** The `past-games-manager` skill now has a `production_audit` stage injected between `epic_fix` and `spec_create`. It greps every named symbol from the epic/mockup against `connect-four/src/`, produces a ⚠ Mockup-only table, and passes it as a hard constraint into the spec-creation agent's prompt so no mockup-only symbol is silently assumed to exist.
