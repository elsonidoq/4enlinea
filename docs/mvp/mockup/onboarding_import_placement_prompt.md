# Design prompt — DecodeC4 onboarding: fix the import-offer placement

You previously designed the DecodeC4 first-run onboarding in `screens_onboarding.jsx` (drop-in sparring → coach aha → dismissible import offer, with Skip and a Settings "Replay intro" row). It's great. This is a **small, targeted follow-up**: correct *when and where* the "Import your real games" offer appears. Do **not** redesign the flow or restyle the offer — the offer's visual design (card and sheet variants) is approved and should be reused as-is. Only its trigger point changes.

## The change

Right now the prototype auto-advances to the import offer ~1.9 seconds after the user's **first move**, floating it over a board with a single disc played. That mis-signals the intended behavior: it reads as an abrupt mid-game upsell after one move.

The correct behavior is **import offer at game-end, with an early-exit fallback**:

1. **Primary placement — game-end.** The import offer appears when the onboarding sparring game **finishes** (the natural stopping point), not seconds after the first move. In the prototype, show the import-offer state over a **fuller / finished board** (a game that has clearly been played out), not a one-move board — so it visually reads as "after the game," not "mid-game."

2. **New state — early-exit fallback on Home.** A user can stop playing after the coach's first reaction and leave before the game ends (onboarding still counts as done for them). To make sure the import offer is never silently lost, it must surface **once** the next time that user lands on the **Home screen**. Add a new prototype state that shows the **import offer appearing on the Home screen** (reuse the same offer card/sheet component, now presented over Home instead of over the board). It is shown to everyone and is always dismissible ("Not now"); dismissing it just reveals normal Home.

## What to keep unchanged

- The offer's visual design (the card variant and the sheet variant) — reuse exactly.
- "Shown to everyone, always dismissible," primary "Import my games" action, guilt-free "Not now."
- The drop-in game, the coach-aha moment, the Skip control + Skip confirm, and the Settings "Replay intro" row — all unchanged.
- Disc colors (green / dark-gray), the phone frame, existing tokens.

## Rail wiring

- Rename/repoint the existing **"Import offer"** rail item so its board deep-link shows the **finished-board** game-end version.
- Add one new rail item under the Onboarding group, e.g. **"Import offer · on Home"**, that deep-links to the new Home-fallback state.
- If you keep the existing card/sheet variant toggle, it should drive both the game-end offer and the on-Home offer identically.

## Scope guardrails

- No new copy tone, no new colors, no new components beyond wiring the existing offer into the Home-fallback state.
- Do not reintroduce any pre-game gate, question, or difficulty picker — those remain out of scope.
- If anything about the two placements is ambiguous, ask before building.
