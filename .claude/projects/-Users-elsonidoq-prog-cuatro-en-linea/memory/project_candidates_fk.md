---
name: Candidates table — foreign key dependency
description: false_positive_records has FK to candidates; must delete it first before bulk-deleting candidates
type: project
---

`false_positive_records.candidate_id` has a foreign key constraint referencing `candidates.id`.

**Why:** Discovered when attempting `DELETE FROM candidates` — Supabase returned FK violation error pointing to this table.

**How to apply:** Any bulk delete of candidates (or individual deletes that would cascade) must first delete the relevant rows from `false_positive_records`. Pattern:
```js
await supabase.from('false_positive_records').delete().not('id', 'is', null);
await supabase.from('candidates').delete().not('id', 'is', null);
```
