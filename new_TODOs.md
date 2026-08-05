# new_TODOs

All 26 items previously tracked here have shipped. Traceability from each item to the
epic that closed it lives in `polish_epic.md` (§ "Appendix — issue → deliverable
traceability"); the epics map to specs `041`–`050` under `specs/`.

New items go below.


## Staging issues logged 2026-08-04 — triaged

Triage performed 2026-08-04. Each item is routed to exactly one deliverable.

**Small-fixes plan** (one branch, one deploy):

- There are bubbles that the coach speaks that do not sound when you are playing a game
  — `GameScreen.jsx:159` keys the speech effect on `[coachMessages.length]`, so a `replace`-mode
  update and any two bubbles landing in one React batch speak only once; `useGameBoard.js:303`
  also passes `'sparring.draw'` where every sibling passes `'coach.spoken.sparring.outcome.draw'`.
- During the onboarding the coach should tell the user to click any red or orange bubble to review the mistake
  — new i18n key + en/es clips, rendered on `ReviewScreen` when `onboarding` is set.
- Signing up in the system should take you to the page you were visiting before deciding to sign in
  — the `postLoginReturn.js` machinery already works; `MistakeDetailScreen.jsx:530` and
  `DeepRevealPane.jsx:201` just open `AuthModal` without calling `stashReturnTo`.
- We need to remove the audio from the home, it is annoying — `HomeScreen.jsx:22-29`.
- The save button in the papergames import should only be active when you modified the content
  — `SettingsScreen.jsx:428` is `disabled={saving}`; `savedValue` already exists at `:37`.
- The replay intro button should not exist — `SettingsScreen.jsx:32,346,478`.
- **(added by triage)** The deep-reveal coach *speaks* "c5"/"c1r3" while the screen shows
  "column 5"/"column 1" — `GET /api/user/tts/deep-reveal` reads the raw cached text and runs only
  `stripAnnotationsForTTS`, never `stripInternalTokens`. Two response seams, one cache, one sanitizer.
- **(added by triage)** `RANGE_RE` (`reasonRenderGuard.mjs:33`) uses an ASCII hyphen, so the model's
  en-dash `c2–c5` misses the range rule and each endpoint is rewritten separately.

**Mobile-viewport plan:**

- Rendering in mobile does not consider the fact that the browser occupies space in the viewport
- The post game screen does not fit the viewport
  — 29 `100vh` sites to convert to the `100dvh` pattern `ConceptScreen.jsx:192` already established,
  plus a layout pass on `ReviewScreen` and emulated QA at mobile sizes.

**Epic — [`docs/epics/deep-reveal-grounding-epic.md`](docs/epics/deep-reveal-grounding-epic.md):**

- There are many issues with the deep reveal (recorded in staging `llm_feedback`)
  — root-caused: the annotation gate strips nothing; the model simply never emits the annotations.
  Zero zone tags in 3 of 4 sampled responses despite an offer block that says "Never write a raw
  square". Fix is required (not optional) cell groups, a widened handle offer, and coordinate
  promotion as a safety net.

**Closed — not a bug:**

- ~~Having just signed up, I imported games from papergames and it just imported one game~~
  — wrong `account_id` was configured. The importer behaved correctly: staging logs show
  `gameLimit: 15`, `lastImportAt: null`, `stopEarly: false`, and `[importForUser] API total rooms: 1`
  — Papergames' own API returned `count: 1` for that account. Confirmed by querying
  `https://papergames.io/api/profile/<id>/rooms?...&gameType=Connect4` directly.
