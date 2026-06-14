---
name: reference-en-json-duplicate-mistakes
description: en.json has two top-level "mistakes" keys; only the second one (line ~707) is effective — edits to the first (~line 492) are silently ignored
metadata:
  type: reference
---

`connect-four/src/i18n/en.json` has **three** `"mistakes"` occurrences:

- Line 483: nested inside another block (not top-level, harmless)
- Line 492: top-level `"mistakes"` block — **DEAD**, overridden by the one below
- Line 707: top-level `"mistakes"` block — **EFFECTIVE** (JSON last-wins on duplicate keys)

**Any new or updated key under the `mistakes.*` namespace must go into the block at line ~707.** Editing the block at line ~492 silently discards the change — the key never appears in the app.

This is a pre-existing structural issue. Do not consolidate the blocks without checking all callers; the nested one at line 483 is inside a different namespace and is unrelated.
