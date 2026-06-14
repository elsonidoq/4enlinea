---
name: feedback_quarantine_before_delete
description: "Move suspected-dead files to quarantine folder first, QA the site, then delete if clean"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 82299498-e078-4575-8559-f3166f8918ca
---

When removing dead code, prefer moving files to a quarantine folder (e.g., `src/_quarantine/`) rather than deleting them outright. This allows the owner to QA the running site before permanent deletion.

**Why:** The user explicitly requested this for the 6 SURFACE components in Spec 032: "Move all 6 surface files into a different folder, that way I can perform a QA on the site, and if everything works, we can then delete them."

**How to apply:** When a dead-code audit identifies files for deletion:
1. Create `src/_quarantine/` (or equivalent)
2. Move files there instead of `git rm`
3. Run tests + lint to confirm no breakage
4. Tell the user to QA the site
5. Only delete the quarantine folder after owner confirmation
