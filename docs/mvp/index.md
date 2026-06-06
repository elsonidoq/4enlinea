# docs/mvp — Index

Quick guide to which file to read for a given task.

---

## Authoritative product documents (start here)

| File | Purpose | Read when… |
|---|---|---|
| [`product_vision.md`](./product_vision.md) | Top-level product definition: what the app is, visual style, explanation tiers, all screens. | Orienting to the product from scratch; understanding screen layout or navigation. |
| [`product_decisions.md`](./product_decisions.md) | Settled behavioral rules that override `product_vision.md`: scoring thresholds, accuracy formula, hint semantics, edge cases. | Implementing scoring, evaluation labels, hint logic, or any business rule that has an edge case. **Wins over all other docs when there is a conflict.** |

---

## Feature-level product specs

| File | Purpose | Read when… |
|---|---|---|
| [`deep_reveal_product.md`](./deep_reveal_product.md) | **Authoritative** spec for the Deep Reveal interactive annotation layer: principles P1–P6, highlight–text sync, annotation integrity. | Building or debugging anything in the Deep Reveal panel (annotations, highlights, honesty guarantees). |
| [`coach_explanation_principles.md`](./coach_explanation_principles.md) | **Authoritative** content spec for the coach LLM: Type 1–4 explanation taxonomy, grounding contract, group-of-4 + parity mechanism, decisions D1–D3. | Writing or modifying the coach prompt, the explanation builder, or `explainSimulate`. |
| [`patterns_blunders_challenges.md`](./patterns_blunders_challenges.md) | **Authoritative** reference for the three-layer pattern → blunder → challenge model: `classifyPattern` API, `tagBlunder` algorithm, per-pattern predicate table. | Touching `classifier.js`, the blunder import pipeline, or challenge generation. |

---

## Implementation epic breakdowns

| File | Purpose | Read when… |
|---|---|---|
| [`epics.md`](./epics.md) | Master epic plan (v4): all 10 epics in ship order, cross-cutting concerns (analytics, i18n, prompt caching), gap list 1–30. | Scoping a new epic, understanding what has already shipped, or checking cross-cutting conventions. |
| [`deep_reveal_epics.md`](./deep_reveal_epics.md) | Epic breakdown for Deep Reveal hardening (annotation integrity + coach rebuild). Points to source-of-truth docs. | Planning or picking up work on spec 021 (annotation gate) or spec 022 (coach rebuild). |
| [`patterns_blunders_challenges_epics.md`](./patterns_blunders_challenges_epics.md) | Epic breakdown for the pattern → blunder → challenge pipeline. | Planning or picking up the blunder tagging / classifyPattern implementation work. |

---

## Curriculum and lesson content

| File | Purpose | Read when… |
|---|---|---|
| [`lesson-curriculum.md`](./lesson-curriculum.md) | 11 MVP + 2 post-MVP lessons with difficulty ratings, what was cut and why. | Adding a new lesson, checking if a concept is in scope, or understanding lesson sequencing. |

---

## Prior art / reference (handle with care)

| File | Status | Read when… |
|---|---|---|
| [`deep_reveal_improvements.md`](./deep_reveal_improvements.md) | **Stale** — Phase 1 (interactive highlights) already shipped. Contains a staleness banner. | Historical context only. Do **not** use as a plan. Check the staleness banner before acting on any claim. |
| [`old_mvp_product_spec.md`](./old_mvp_product_spec.md) | Superseded by `product_vision.md` + `product_decisions.md`. | Background reading only. Prefer the current docs above. |

---

## Mockups

`mockup/` — design mockups for the app screens. Read these when building or reviewing frontend UI.
