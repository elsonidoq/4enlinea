---
name: project-spec038-papergames-self-service-import
description: "Spec 038 — Papergames Self-Service Import: loadUser trap for new columns"
metadata: 
  node_type: memory
  type: project
  originSessionId: 57444168-0988-4f85-98d9-67fe50bdff48
---

# Spec 038 — Papergames Self-Service Import

## loadUser trap

`index.js` has **two** SELECT projections for the `users` row (normal path and insert-reselect for brand-new users) plus a fallback literal. All three must be extended whenever new columns are added to `users` — missing any one leaves the field as `undefined` on that code path. Affected columns added by this spec: `papergames_id`, `last_import_at`.
