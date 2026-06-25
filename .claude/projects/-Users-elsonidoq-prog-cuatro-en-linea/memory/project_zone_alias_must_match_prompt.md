---
name: project_zone_alias_must_match_prompt
description: Zone alias map must be populated for every metric that appears with zone tags in the prompt — mismatch silently causes P1:invalid_spec failures
metadata:
  type: project
---

**Rule:** every zone alias used in the LLM prompt MUST have an entry in `zoneAliasMap`. If the alias is absent, `expandZoneAliases` silently skips it, the raw alias name (e.g. `player-major-pre`) reaches `validateAnnotation`, and `P1:invalid_spec:player-major-pre` fires.

**Why:** discovered 2026-06-24 when major threat zone aliases were made conditional (`showPlayerMajor`) but major threat counts always appear in the prompt. The LLM correctly copied the zone tag format from the prompt, but the alias wasn't in the map, so expansion never happened.

**How to apply:** the invariant is: *alias in map ↔ row visible in prompt*. Concretely:
- Both **major and minor threat rows** are hidden entirely when the comparison isn't meaningful.
- Aliases for each metric are added to `zoneAliasMap` only when `showPlayerMajor` / `showOpponentMajor` / `showPlayerMinor` / `showOpponentMinor` is true — exactly matching when the row appears.
- Any new conditional metric follows the same pattern: gate the alias addition on the SAME condition that gates the row in `formatThreatStats`.

**Empty-cell safety:** `cellsToZoneSpec([])` returns `'tg'` (gate skips it), not `'windows:'` (which passes P1 syntax but fails P1:empty). Use `tg` as the sentinel for any zone spec derived from an empty cell list.
