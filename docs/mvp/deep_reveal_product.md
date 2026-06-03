# Deep Reveal — Interactive Annotation Layer (Product Description)

> **Status:** product description. This file states *what must be true* for the
> feature, not how to build it. Implementation strategy (component design, where
> validation runs, the client→server migration) is derived in a separate planning
> session. A detailed engineering exploration exists in
> [`deep_reveal_improvements.md`](./deep_reveal_improvements.md) — treat that as
> non-binding prior art, not the plan.
>
> **Scope:** this is **not a new feature.** It is the *legibility layer of the existing
> Deep Reveal Panel* — the Tier-2 LLM explanation defined in
> [`product_vision.md`](./product_vision.md) (Screen 8, "Explanation System: Two
> Tiers"). It makes that panel's annotated board **interactive** and guarantees its
> annotations are honest. It **supersedes** the line in `product_vision.md` Screen 8
> that calls the Deep Reveal annotated board "non-interactive."

---

## What this is

The Deep Reveal Panel already shows a 2–4 sentence LLM explanation over an annotated
board (`product_vision.md`, Tier 2). Today that board is static. This layer makes the
explanation **legible**: as the explanation mentions a column, cell, row, or region,
the user can light that location up on the board — by tapping the reference in the
text, or hovering it on a pointer device. The text and the board stop being two
disconnected things and become one explanation with two synchronized surfaces.

It also guarantees the annotations are **honest**: every highlight points at a real,
relevant board location, the text and the highlight always agree, and the language is
something the user can actually perceive. These guarantees hold even when the coach LLM
misbehaves.

---

## Why it matters

Connect Four explanations are intrinsically spatial. "Your move gives up the winning
line in the fourth column" forces the user to find the column, imagine the line, and
map words onto the board. That translation step is where understanding is lost. This
layer removes it: the user reads the explanation and *sees exactly what the coach
means.* It is what turns a correct explanation into one the user learns from.

---

## Who hits it, and when

The user reaches the Deep Reveal Panel by an explicit gesture (tapping "Learn more" /
asking for the deeper explanation); it never interrupts play, and the position is fixed
and already on screen. **Deep Reveal is authenticated-only** and usage-gated — see
*Access & gating* below. This annotation layer is present wherever the Deep Reveal
Panel is, on the **three surfaces** defined in
[`product_decisions.md`](./product_decisions.md) (*Prompt caching for Deep Reveal*):

| Surface | `product_vision.md` ref | Board on screen? | Experience |
|---|---|---|---|
| **Challenges** Deep Reveal | Screen 7 → 8 | Yes | Tap a reference → the board highlights it |
| **Position Explorer** | Screen 13 | Yes | Same; the explanation's references highlight on the position board (distinct from the "try a different move" interaction) |
| **Past Mistakes** detail | `product_decisions.md` *Past Mistakes review surface* | Yes (board at mistake position) | Same |

All three render the explanation alongside a board, so highlights sync to the board on
every surface. (There is no live-in-game "sparring explain" surface; the live Sparring
board stays uncluttered per `product_vision.md` Screen 11.)

---

## Annotation Integrity Principles

These are the non-negotiable product invariants for every highlighted reference. They
exist because the coach is an LLM: it will sometimes point at the wrong cell, name a
column that disagrees with what lights up, or use words the user cannot perceive. The
product guarantee is that **the user never sees one of those mistakes** — regardless of
how the LLM behaves.

Each principle is stated as a requirement. *How* and *where* it is enforced (prompt,
generation time, client) is for the planning session.

### P1. No dangling affordance
If a reference in the text looks tappable, tapping it MUST highlight something on the
board. A reference that would highlight nothing — because it points at no real cells,
or was attached to an abstract phrase like "the double-threat setup" — is not presented
as interactive. The same rule covers a purely conceptual explanation with no spatial
references at all: it renders as **plain text with no affordances**, never as underlined
text that highlights nothing.

### P2. Text and highlight always agree
The location named in the words and the location that lights up MUST be the same. "Column
4" in the text while column 1 highlights is never shown. The highlighted location is the
single source of truth for any spatial claim.

### P3. Only vocabulary the user can perceive
The explanation addresses someone who **sees a graphical board** with **green and dark-gray
discs** (`product_vision.md`, *Visual Style* / *Semantic Color System* — the app does
not use red/yellow for pieces). It uses only what the user perceives: green/grey discs,
column numbers, row numbers, and Connect Four concepts. It never uses internal notation
(the `R`/`Y` diagram letters), the player names Red/Yellow/Black, or engine vocabulary
(forced win, leaf, solver, simulation, score, "patterns in data").

### P4. Nothing invalid reaches the user
An explanation whose highlights would violate P1–P3 or P5 MUST be corrected before the
user can read it — never merely hidden after the fact. (Today this check happens too
late, after the explanation is already stored; moving the guarantee earlier is exactly
the client→server migration the planning session will design.) When a valid explanation
cannot be produced at all, the panel falls back to the **Tier 1 summary** with
"Detailed explanation unavailable," per `product_decisions.md` *Empty and error states (b)*
— it never shows a broken or invalid annotated explanation.

### P5. Highlights point only at real, relevant locations
Every highlighted location MUST be a genuine board location that is part of the point
being made — not an occupied cell described as empty, not a winning line through the
user's own disc, not a cell unrelated to the explanation. This is the highlight-side
expression of the coach's grounding contract (see *Product boundary* below): the coach
commits to a closed set of locations its explanation may reference, and only those may
be highlighted.

### P6. References read as natural language
A highlighted reference MUST read like natural language a person would say ("the cell on
the third row"), not a raw coordinate token. This keeps the text coherent for screen
readers today and is a hard requirement for read-aloud if it ships later (see *Deferred*).

**Traceability to user feedback.** Every principle (except P6, anticipated) generalizes a
real failure logged in the `llm_feedback` table — the same table the in-product "Flag this
explanation" action writes to (`product_decisions.md`, *User flag for LLM explanation
quality*). A planning agent can query these rows by `id` and use them as regression
fixtures: the rebuilt coach must no longer fail any of them. They are failure modes that
**will recur** in any LLM-based coach, independent of how often a prior system produced them.

| Principle | `llm_feedback.id` | `movestring` | What the user reported |
|---|---|---|---|
| **P1** No dangling affordance | `59a11a79-6ad0-4c06-947c-0558952ac760` | `341441` | "'the stack in that column' is highlighted, but clicking it highlights nothing" |
| **P1** | `f4241ea6-fdd3-4961-9621-997d1a9a818e` | `344444433531111003225361` | "'double-threat setup' is not highlighted when clicked" |
| **P2** Text and highlight agree | `58f99d33-f57d-4fff-ab01-4f5eda9cdefd` | `344440` | "LLM says green should have played col 4, but the highlight shows column 1" |
| **P3** Perceivable vocabulary (diagram letters) | `e094ee00-943e-4aaf-a628-f514a7d551f8` | `341441` | "What are the 'R discs'?" |
| **P3** (player color-names) | `b6071ab4-b76a-45a4-8cb3-cd0370096044` | `33333342224` | "do not use yellow/red, use green/grey" |
| **P3** (player color-names) | `5a10047c-77eb-4703-82d7-92465ed85fa3` | `33333045555111101544035212` | "the coach should not say 'Black'" |
| **P3** (engine jargon) | `972f74e1-1e24-4846-93eb-8cd5575e6c63` | `32` | "should not talk about 'leaf positions' or 'forced_win' — only Connect Four language" |
| **P3** (engine jargon) | `092f4340-776c-4da3-8a45-324a59544b7c` | `31` | "does not have to refer to 'patterns in data'" |
| **P3** (engine jargon) | `0f0d66b3-ff0b-44d6-be45-3fab6970a43c` | `313330341014` | "do not mention the solver" |
| **P5** Real, relevant locations (occupied cells) | `e86eeac9-08e2-4189-9a30-1e03b911d2a1` | `3444444335311110` | "I don't see the threat" — highlighted a "parity threat" on already-filled cells |
| **P5** (line through own disc) | `8d83947e-820a-42d4-b1c6-8a1e6fd38c51` | `34` | "the cells you mention include a green disk" |
| **P5** (non-existent threat) | `403a21c9-3cb8-4ed9-8cb2-ff939dcf4d9c` | `344440403323` | "I don't think this is a double threat" |
| **P4** Nothing invalid reaches the user | *(umbrella)* | — | Every row above is a P4 failure: the invalid output reached the user instead of being corrected first. |
| **P6** Natural-language references | *(none yet)* | — | Anticipated; hard requirement once read-aloud ships. |

---

## Interaction behavior

- Tap a spatial reference in the explanation → the matching board location highlights.
  Multiple references can be lit at once; a clear action resets them; tapping outside a
  reference clears all.
- On **pointer devices**, hover gives a dim preview before committing. On **touch
  devices the experience is tap-only** — no preview state.
- The highlight color MUST stay clear of the reserved evaluation colors
  (red / orange / yellow) and the threat-overlay colors (translucent green / gray)
  defined in `product_vision.md` *Semantic Color System* — the coach-mention highlight is
  a distinct visual role and must not be confused with "blunder," "suboptimal," or a
  threat overlay.

---

## Access & gating

Per `product_decisions.md` (*Deep Reveal access for anonymous users*, *Freemium gate
scope*) — this layer adds no new gating; it inherits the Deep Reveal Panel's:

- **Anonymous:** no Deep Reveal access; "Learn more" opens the AuthModal.
- **Authenticated free:** 20 Deep Reveals/week (server-side counter, resets Mon 00:00
  UTC); over the cap, "Learn more" shows the UpgradeModal.
- **Pro:** unlimited.

Highlights and (future) read-aloud are part of an already-accessed Deep Reveal — they do
not consume additional quota units beyond the single Deep Reveal that opened the panel.

---

## Stability & responsiveness

- **Stable per position.** Re-opening the same position shows the same explanation and
  the same highlights. (The Deep Reveal explanation is already cached and shared across
  users — `product_decisions.md`, *Prompt caching for Deep Reveal*; this layer preserves
  that.)
- **Instant interaction.** Tapping a reference highlights immediately — no perceptible
  wait. A cache hit shows the annotated explanation with no spinner.

---

## Language

English for MVP. Per `product_decisions.md` *i18n strategy*, English is fully populated
at launch and Spanish is an empty stub (post-MVP). The coach explanation and all
surrounding UI go through `t('key')`; no hardcoded user-facing strings.

---

## Success criteria (user-facing)

- A user reading an explanation can identify every place it refers to **without
  re-reading or hunting** — the highlight makes it immediate.
- A user **never** encounters a highlight that contradicts the text, points at the wrong
  place, lights up nothing, or uses words they don't recognize. (P1–P6 hold in practice,
  measured by a drop in `llm_feedback` rows of the types in the traceability table.)

(Engineering-level acceptance — annotation coverage rates, parser behavior, latency
budgets — is defined during planning, derived from these outcomes.)

---

## Product boundary with the coach explanation

This layer is **presentation + integrity**: it makes the Deep Reveal explanation legible
and guarantees its highlights are honest. It does **not** decide *what* the coach says or
*which* move/line is worth explaining.

The content — what to explain, honesty about how much worse a move was, grounding every
claim in real board facts — is owned by
[`coach_explanation_principles.md`](./coach_explanation_principles.md). That doc defines
the closed set of board locations the explanation may reference; **P5 here enforces that
the same set is the only thing that can be highlighted.** The seam: the coach layer
produces grounded, location-bounded explanation text; this layer renders it and guarantees
P1–P6.

---

## Open product decisions

*(None outstanding. Naming, read-aloud scope, surfaces, gating, fallback, and language are
settled and folded into the sections above and the Deferred list.)*

---

## Deferred (post-MVP)

- **Read-aloud (spoken explanation with synchronized highlights).** The coach speaks the
  explanation while the board highlights each location as it is spoken. Not in MVP —
  neither `product_vision.md` nor `product_decisions.md` includes audio/TTS today; the
  Coach "speaks" only via text bubbles. If pursued, it builds directly on this layer's
  annotations, makes **P6 mandatory**, and would need: a single fixed coach voice,
  close-enough word-to-highlight sync, iOS support, and a cost envelope that is free at
  expected usage. (Prior-art exploration: `deep_reveal_improvements.md` Phases 2–3.)
- Voice selection, playback scrubber, speed control (only relevant if read-aloud ships).
- Word-precise (vs phrase-precise) highlight timing.
