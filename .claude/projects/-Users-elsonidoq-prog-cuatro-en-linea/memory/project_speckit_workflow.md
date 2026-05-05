---
name: SpecKit workflow and feature directory
description: How SpecKit commands were used, where the feature spec lives, and workflow notes
type: project
---

# SpecKit workflow for DecodeC4 MVP

## Feature directory

`specs/001-decodec4-mvp/` — all design artifacts live here.

Key files:
- `spec.md` — 4 user stories (US1=Puzzles P1, US2=Sparring P2, US3=Coach P3, US4=Account P4)
- `plan.md` — tech stack, 11 epics, directory tree, Constitution Check, Risk Register
- `tasks.md` — 80 tasks (T001-T080) with [X] for completed, [ ] for pending
- `data-model.md` — 7 Supabase tables + IndexedDB schema
- `contracts/api.md` — 15 REST endpoints
- `contracts/store.md` — ProfileStore interface
- `research.md` — 9 locked architectural decisions
- `quickstart.md` — phase gate checklists

## CLAUDE.md pointer

`CLAUDE.md` points to `specs/001-decodec4-mvp/plan.md` (set by speckit-plan).

## `.specify/feature.json`

```json
{ "feature_directory": "specs/001-decodec4-mvp" }
```

## Task ordering note

US4 (Stripe/Paywall) was implemented before US3 (Coach) because Coach is paid-only — Stripe must work before Coach can ship. The tasks.md note explains this.

## check-prerequisites.sh warning

Running on `main` branch causes `check-prerequisites.sh` to exit with error (it expects a feature branch). This is non-fatal — proceed with `.specify/feature.json` directly.
