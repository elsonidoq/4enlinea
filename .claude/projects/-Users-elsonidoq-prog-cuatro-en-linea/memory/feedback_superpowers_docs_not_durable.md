---
name: feedback_superpowers_docs_not_durable
description: Design docs & plans under docs/superpowers/ are ephemeral local scaffolding agents never read — migrate all durable info into docs/architecture/ before a feature is done
metadata: 
  node_type: memory
  type: feedback
  originSessionId: af7ae640-0a81-4a6c-b3e1-5bf4a296fbfa
---

Design docs and implementation plans produced by the brainstorming / writing-plans flow land under `docs/superpowers/specs/` and `docs/superpowers/plans/`. **These are ephemeral local scaffolding: they are untracked (never committed) and a future agent will NOT read them.** Treat them as throwaway build aids, not a durable record.

**The rule:** before a feature is "done", migrate everything durable from the design doc/plan into the right `docs/architecture/` file — because `docs/architecture/` is the ONLY place an agent looks. "Durable" includes: the *why* (rejected alternatives, rationale), tunable constants and their as-implemented values, known limitations, designed-but-not-yet-built items, and contracts. Once migrated, the design doc and plan are fully redundant and can be deleted. Memory links must point at the arch doc, never at a `docs/superpowers/` path (that link will rot when the scaffolding is deleted).

**Why:** the user flagged that I left the durable "why"/tunables/limitations only in the design doc and offered to commit the design doc itself. An agent reading only the code + arch docs would be surprised by the gaps (e.g. the look-ahead's tunable budget/depth and its opponent-indifference dead-end limitation). Architecture docs exist precisely so agents find this without the design doc.

**How to apply (session close-out):** diff the design doc/plan against the relevant `docs/architecture/*.md`; fold any durable fact the arch doc lacks into it; repoint any memory links to the arch doc; then delete the `docs/superpowers/` design doc + plan. This is the same spirit as CLAUDE.md's two-destination rule (arch docs vs memory), extended: `docs/superpowers/` is NOT a third durable destination. See [[feedback_product_doc_authoring]].
