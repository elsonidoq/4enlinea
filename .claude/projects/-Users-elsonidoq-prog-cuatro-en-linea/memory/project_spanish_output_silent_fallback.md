---
name: project_spanish_output_silent_fallback
description: Deep-reveal/audio Spanish = English-prompt→Spanish-output + fallbacks; NEW player-facing surfaces ship English silently
metadata: 
  node_type: memory
  type: project
  originSessionId: b103bb0b-f9c9-4850-9e8f-c46d73e5ecda
---

Spanish (`es`) deep-reveal + coach audio shipped via an **isolated final-layer** approach, not a re-localized pipeline (feature branch `feature/full-spanish`, plan `docs/superpowers/plans/2026-07-14-spanish-audio-and-deep-reveal-i18n.md`). See `docs/architecture/api-conventions.md` §Language/locale and `db-schema.md` (`explanation_cache` composite PK).

**The trap — silent English leakage.** The design deliberately uses graceful English fallback everywhere (KB `short_summary_es` missing → English; unapproved coach clip → English clip; only the `mechanism` LLM field is Spanish). So any NEW player-facing surface added later ships **English inside a Spanish build with no error**:
- a new hardcoded server string not routed through `serverT(locale, key)`,
- a new `[term:…]` tag whose `server/kb/<slug>.md` lacks `short_summary_es`,
- a **newly player-facing LLM output field** — only `mechanism` is covered by `SPANISH_OUTPUT_DIRECTIVE`; promoting another field to user-facing leaves it English until the directive is extended,
- a new coach `coach.*` key whose Spanish clip hasn't been generated+approved.

**How to apply:** when touching deep-reveal/coach/audio output, ask "does this add a player-facing string/term/field?" If yes, add its Spanish coverage in the same change. Don't trust that "es works" — the fallback hides gaps.

**Why:** correctness/grounding is validated in English only; the graders (`judge-deep-reveals`, `grade-fv-sufficiency`) never see Spanish, and cache invalidation is per-locale. Content/grounding fixes transfer to Spanish automatically; surface additions do not. Related: [[project_explain_system]], [[project_pattern_kb_architecture]], [[project_spanish_is_argentinian_voseo]].
