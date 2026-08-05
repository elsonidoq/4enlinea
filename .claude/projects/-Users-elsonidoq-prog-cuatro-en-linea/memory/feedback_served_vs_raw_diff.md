---
name: feedback_served_vs_raw_diff
description: Diagnosing a bad deep-reveal — diff the SERVED text against the RAW cached mechanism to tell a generation failure from a gate/render failure before touching either
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5ffcaefa-eed7-49ee-a494-7099e99c934e
  modified: 2026-08-05T19:12:34.699Z
---

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

Related: [[project_annotation_gate_and_zones]], [[feedback_reproduce_fv_case_from_coverage]],
[[reference_railway_staging_logs]], [[reference_supabase_connection]] (the `.env.staging` inline-script
pattern this needs).
