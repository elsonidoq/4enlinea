---
name: feedback-use-ripgrep
description: Preferred search tools: rg for text, fd for files, ast-grep for structural patterns, LSP for semantic search
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0146edf4-e56e-4708-b0a5-b2bfa95a4da8
---

Use the right tool for each search type — all four are installed:

- **Text/regex search:** `rg <pattern>` or `rg <pattern> --type js` — never `grep -r` or `find | xargs grep`.
- **File finding:** `fd <name>` — never `find . -name ...`.
- **Structural/AST patterns:** `sg <pattern>` (ast-grep) — for finding call sites, argument shapes, or syntactic constructs regardless of formatting; more precise than regex for refactoring audits.
- **Semantic search:** LSP tool — go-to-definition, find-references, type-aware navigation; requires a running language server.

**Why:** User installed ast-grep and fd specifically to improve code browsing beyond text grep.

**How to apply:** Default to `rg` for text; reach for `sg` when the search is about code structure (e.g., "all calls to X with a null second arg"); use `fd` instead of `find`; use LSP for cross-file symbol resolution when available.
