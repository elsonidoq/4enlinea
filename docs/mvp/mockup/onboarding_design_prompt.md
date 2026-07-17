# Design prompt — DecodeC4 first-run onboarding

You are extending the **DecodeC4** interactive prototype in this project (the phone-framed React-in-browser mockup: `app.jsx` shell + navigator rail, `primitives.jsx`, `board.jsx`, `coach.jsx`, and the `screens_*.jsx` files). Your task is to **design the new first-run onboarding experience** and the small modifications it requires to existing screens. Match the prototype's existing visual language exactly — reuse its components, tokens, and the phone frame. This is a design task: produce mockup screens in the same HTML/CSS/JS medium as the rest of the bundle, wired into the navigator rail like the other screens.

## Product intent (the one idea onboarding must deliver)

**Onboarding has a single job: show the coach reacting to the user's own play, as fast as possible — with zero friction.** No tutorial, no splash, no "how to play" modal, no account required, no up-front questions. The differentiator of DecodeC4 is that a coach analyzes *your* moves; onboarding proves that by demonstration in the first ~60 seconds, not by explaining it.

Every brand-new user gets the **same** flow (there is no branching by user type at the start):

1. **Drop straight into a sparring game** against the AI on **Easy** difficulty. Easy is very beatable (it deliberately plays sub-optimally) but it is *not* a scripted guaranteed win — treat the first game as "very winnable," not "rigged to win." The player just starts playing; there is no difficulty picker to choose.
2. **The aha moment = the first time the coach reacts to one of the user's own moves.** The coach speaks after the user's move (green disc), giving a short, encouraging, plain-language insight about what just happened. This is the emotional payoff and the moment onboarding is considered "successful." The user does **not** need to win or finish the game for onboarding to count.
3. **After the aha**, surface a single, always-dismissible **"Import your real games"** offer (call-to-action) — shown to *everyone*, phrased as an optional next step ("Play online? Bring your real games in and I'll coach those too."). Dismissing it returns the user to normal app use (Home). Accepting it leads into the existing authenticated Papergames import flow. Import is a *post-value* offer, never a precondition.
4. Onboarding is **skippable at any moment** (a low-emphasis "Skip" affordance), and **re-accessible later from Settings** ("Replay intro" / "Show onboarding again").

Design principle for tone/visuals: calm, confident, uncluttered — this app is a focused coach, not a gamified funnel. Keep chrome minimal so the board and the coach's first line are the heroes.

## Screens / states to design

Design these as new prototype screens (add them to the navigator rail under a new **"Onboarding"** group, following the exact pattern in `app.jsx`'s `NAV_GROUPS` + variant toggles):

1. **Onboarding sparring game (in-progress, pre-aha).** Reuse the existing `GameBoard` / `Board` presentation. The distinguishing element vs. a normal sparring game is the *first-run framing*: a subtle, welcoming header or first-move nudge (e.g. "Your move — drop a green disc") and a persistent but unobtrusive **Skip** control. No difficulty picker, no settings clutter. Show the board mid-early-game with it being the user's turn.

2. **The aha moment (coach's first reaction).** The same board, now with the **coach speaking** (reuse `CoachAvatar` + `CoachDialog` from `coach.jsx`). Design the moment the coach's first insight appears about the user's just-played move — this is the star frame. Consider how the coach dialog enters (it should feel like a reward, not an interruption) and how the board stays visible. The coach line should be short, warm, and specific-sounding (e.g. "Nice — that move sets up a threat on the right. See how the board opened up?").

3. **Post-aha import offer.** A dismissible card/sheet (over or after the board) presenting the optional "Import your real games" CTA to everyone. Include: a one-line value hook, a primary "Import my games" action, and a clear "Not now / Maybe later" dismiss. Design both the **accept** affordance and the **dismiss** affordance; dismiss must feel guilt-free.

4. **Skip confirmation (lightweight).** What happens when the user taps Skip mid-onboarding — either an immediate exit to Home or a one-tap "Skip intro?" confirm. Keep it frictionless; do not trap the user.

5. **Modification — Settings entry point.** A small **"Replay intro"** / "Show onboarding again" row in the Settings screen so onboarding is re-accessible after completion or skip. (If the prototype has no Settings screen yet, mock the single row/section in context.)

6. **(Optional but valuable) First-frame welcome micro-state.** If you feel the drop-in needs one beat of orientation before the board, design the most minimal possible version (a single line, no multi-slide carousel — carousels/walkthroughs are explicitly rejected). Show it as a variant so it can be compared against the pure no-intro drop-in.

## Hard design constraints (match the existing prototype)

- **Disc colors:** player 1 = **green**, player 2 = **dark gray**. Red / orange / yellow are **reserved for evaluation feedback only** — never use them for discs or general UI accents. (See the rail footer note in `app.jsx`.)
- **Reuse existing components** rather than inventing new ones wherever possible: `Board` (`board.jsx`), `GameBoard` (`screens_sparring.jsx`), `CoachAvatar` + `CoachDialog` (`coach.jsx`), `TopBar` / `Icon` / primitives (`primitives.jsx`), and the `AuthModal` pattern (`screens_home.jsx`) if the import path needs sign-in framing. Follow their prop shapes.
- **Phone frame + StatusBar:** render inside the existing `.phone` frame exactly like every other screen (see `app.jsx`).
- **Navigator wiring:** add an "Onboarding" `NAV_GROUPS` entry and, if you produce variants (e.g. with/without the welcome micro-state, or import-offer-as-card vs. as-sheet), add a variant toggle box in the rail mirroring how `sagaVariant` / `fbVariant` work.
- **No new color system, no new type scale** — use the existing `styles.css` tokens.
- **Mobile-first**, 390×844 target (the existing phone dimensions).

## What is explicitly OUT of scope for this design

- No multi-slide value-proposition **carousel** or **interactive walkthrough/tutorial** (rejected in favor of the drop-into-play demonstration).
- No **up-front "do you play online?" question** or any gate before the first game; no sign-in wall before the aha.
- No **difficulty selection** in onboarding (it is fixed to Easy).
- No account-creation UI design here (the import path reuses the existing auth flow; you only design the *offer* CTA, not the auth screens).
- No changes to the coach's underlying logic or the board mechanics — you are framing existing behavior, not redesigning it.

## Deliverable

Prototype screens in the bundle's HTML/CSS/JS style, added to the navigator rail under an "Onboarding" group, covering the flow: **drop-in sparring → coach aha → dismissible import offer**, plus the **Skip** affordance and the **Settings "Replay intro"** row. Where a layout choice is genuinely open (e.g. import offer as an over-board card vs. a bottom sheet; whether a one-line welcome precedes the board), provide 2–3 variants toggleable from the rail so the choice can be compared visually. Keep everything consistent with the existing DecodeC4 look.

When anything about the intended behavior is ambiguous, ask before building — it's cheaper to confirm scope than to mock the wrong flow.
