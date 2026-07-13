---
name: project_spanish_is_argentinian_voseo
description: "Spanish (es.json) MUST be Argentinian/Rioplatense voseo, not neutral/Iberian tú-Spanish"
metadata: 
  node_type: memory
  type: project
  originSessionId: e3a7a7c2-793a-4773-b95b-cfbf38df50ab
---

The app's Spanish translation (`connect-four/src/i18n/es.json`, spec 049 / OI-15) MUST use
**Argentinian / Rioplatense Spanish (voseo)**, not neutral or Iberian tú-based Spanish.

**Why:** The user (Argentinian) requires the coach/UI voice to read as native Rioplatense. The
first es.json pass was done in neutral tú-Spanish and had to be corrected.

**How to apply:** Convert every second-person-singular verb form to voseo:
- Affirmative imperatives lose the diphthong, shift stress to the last syllable, and drop the
  esdrújula accent when a clitic attaches: `encuéntrala` → `encontrala`; `juega` → `jugá`;
  `mira` → `mirá`; `busca` → `buscá`; `elige` → `elegí`; `prueba` → `probá`; `piensa` → `pensá`;
  `fíjate` → `fijate`; `sigue` → `seguí`.
- Present indicative: `tienes` → `tenés`; `puedes` → `podés`; `quieres` → `querés`;
  `sabes` → `sabés`; `eres` → `sos`.
- Pronoun `tú` → `vos`. (`te`, `tu`, `ti` are unchanged — voseo keeps those.)
- Leave keys, `{{placeholders}}`, and disc-color terms (verde/gris, see FR-015) untouched — the
  FR-019 key-parity test still passes because only string values change.

Default: preserve original punctuation/tone; do NOT add exclamation marks wholesale unless the
user asks for a more energetic voice. Related: [[reference_i18n_english_only]].
