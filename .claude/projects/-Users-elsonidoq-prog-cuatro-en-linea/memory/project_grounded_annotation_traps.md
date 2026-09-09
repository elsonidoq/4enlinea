---
name: project_grounded_annotation_traps
description: term/zone can never co-wrap a phrase (nesting leaks raw tags on screen); rawMechanism replays attribute a missing highlight with no LLM
metadata: 
  node_type: memory
  type: project
  originSessionId: cfb9cb8a-6253-42d4-a773-75ae83ef5ba1
  modified: 2026-08-28T20:11:05.423Z
---

Two traps when working on deep-reveal grounded annotations (`[zone:...]` / `[term:...]`).

## 1. A term and a zone can NEVER wrap the same phrase — nesting leaks raw tags to the user

`parseAnnotatedText`'s combined regex (`connect-four/src/lib/annotatedText.js`) is single-pass and
**non-nesting**. Measured, both directions:

```
zone inside term -> zones=[] terms=[double_threat]
   cleanText = "Your [zone:c2r6]double threat[/zone:c2r6] wins."   <- RAW TAGS RENDER ON SCREEN
term inside zone -> zones=[c2r6] terms=[]
   cleanText = "Your [term:double_threat]double threat[/term:double_threat] wins."  <- same
adjacent         -> zones=[c2r6] terms=[double_threat]  cleanText clean
```

So "highlight the double threat" can only be built by **adjacency** — a `[term:]` phrase next to a
separate `[zone:]` phrase. The prompt's "do not overlap a highlight and a term on the same words"
instruction is **load-bearing, not stylistic**; if the model disobeys, the failure is visible
literal markup, not a missing highlight.

Related: a `[term:]` never highlights anything. It routes to `KbTermPopup` and never reaches
`zhZones`/`onHighlightsChange`. A term alone is a glossary popup, so "the coach named it" ≠ "the
coach pointed at it".

## 2. Attribute a missing highlight WITHOUT an LLM or solver — replay the stored `rawMechanism`

Every `t04*-results.json` under `specs/058-deep-reveal-grounding/` stores the **pre-guard**
`rawMechanism` alongside the served text. Replaying those strings through the guard chain attributes
each missing spec in seconds, free and deterministically:

```
MODEL_NEVER_EMITTED  vs  STRIPPED_BY_GUARD:<code>  vs  spec/anchor MISMATCH
```

This is what inverted the spec-058 diagnosis: `MODEL_NEVER_EMITTED` was **0** and
`STRIPPED_BY_GUARD(P6:raw_coordinate)` was **11 of 11** — the model was right and the guard was
eating correct highlights. An offer-set dump or a rendered page cannot tell you which of the two is
happening; this can. Treat the stored corpus as a **reusable regression harness**: any future guard
change scores against real model outputs at zero cost.

Beware the inflated version of this number: "N would pass if the guard didn't strip" is only a fix
argument after you decompose it — some strips are *correct* (a zone pointing at one square while its
words name another). See [[feedback_require_dont_suggest_llm_handles]], the merged sections below.


---

## (merged from `feedback_served_vs_raw_diff` — diff the SERVED text against the RAW cached mechanism FIRST, to tell a generation failure from a gate/render failure)

**Trigger:** a deep-reveal explanation is wrong, vague, or "missing highlights" — whether reported via
staging `llm_feedback`, QA, or the owner. Run this **before** opening the annotation gate, the
render guard, or the prompt.

## The two-query diff

1. Read the complaint and its `movestring` from `llm_feedback` (staging). `llm_response` there is the
   **post-guard, served** text — what the user actually saw.
2. Read the **raw** text for the same position from `explanation_cache`:
   `position_hash = sha256("<movestring>:<col>")`, then
   `deep_reveal_json.explanation` (or `.fullText` for pre-Epic-3 rows). `deep_reveal_json.prompt`
   holds the **exact prompt** that produced it.
3. Diff them.

## Reading the result

- **Raw has `[zone:…]` tags that the served text lacks** → the gate/guard stripped them. Debug
  `validateAnnotation` / `stripFailingZoneSpans` / the render guard.
- **Raw and served differ ONLY by coordinate rewrites** (`c5`→"column 5", `c1r3`→"column 1") → the
  gate stripped **nothing**. This is a **generation** failure: the model never emitted the
  annotations. Debug the prompt and the annotation offer, not the gate.
- **Served text is vaguer than the audio** → a second unsanitized reader of the same cache; see
  [[project_blunder_serving_dual_paths]] trap 3b.

## Why this is worth doing first

2026-08-04: four vague complaints ("a lot of missing highlights", "which is the double threat?",
"what is the long four in a row line?") all looked like gate over-rejection, and the standing memory
about the annotation gate pointed straight at the gate. The diff showed the gate was innocent in all
four — the model emitted **zero** zone tags in 3 of 4 responses despite the prompt carrying a
`# Highlightable regions` offer and the instruction *"Never write a raw square."* Two queries
redirected the whole fix from the gate to generation. Without them the obvious move — hunting in
`annotationGate.js` — would have found nothing wrong and burned the session.

**Corollary:** `stripInternalTokens` rewriting `c1r3` → "column 1" **deliberately drops the row**
(documented "Decision A"). So the served text can be strictly *less* precise than what the model
actually claimed — never judge the model's grounding from the served string alone.

Related: [[project_annotation_gate_and_zones]], `docs/architecture/feature-vector-sufficiency-experiment.md` §14,
[[reference_railway_staging_logs]], [[reference_supabase_connection]] (the `.env.staging` inline-script
pattern this needs).


---

## (merged from `project_ungrounded_highlights_look_real` — a rendered highlight is NOT evidence of a grounded one)

**Trigger: you are judging whether a deep-reveal explanation is *grounded* — especially from the
rendered app, a screenshot, or `/admin/grounding-diff`.**

`AnnotatedExplanation` falls back to `regexFallbackParse` when a text has **zero** zones *and* zero
terms; that fallback scrapes `"column N"` out of prose and synthesises `colN` zones **client-side**.
So an explanation with zero annotations does not look empty on screen — **it looks highlighted**, and
those ungrounded highlights ship to real players, bypassing every server-side guard (**OI-173**). The
fallback is all-or-nothing, so partial grounding renders *fewer* underlines than none: the visual
signal is not even monotonic in grounding.

**Never judge grounding from a rendered page or browser-driven QA.** Count `[zone:…]` specs in the
**stored** text and keep the cell-level ones — `AdminGroundingDiffPage.jsx`'s `countGroundedZones` is
already that helper. Full mechanism, the counting snippet, and the worked spec-058 case:
`docs/architecture/frontend-conventions.md` §"`AnnotatedExplanation`'s regex fallback".
