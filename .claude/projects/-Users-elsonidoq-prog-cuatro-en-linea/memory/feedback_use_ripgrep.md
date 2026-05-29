---
name: feedback-use-ripgrep
description: Use rg (ripgrep) for code search instead of find | xargs grep; LSP tool available for semantic search
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0146edf4-e56e-4708-b0a5-b2bfa95a4da8
---

Use `rg` (ripgrep) for all text/regex searches instead of `find | xargs grep` or `grep -r`. Ripgrep is installed (v14.1.1), faster, respects `.gitignore`, and has better defaults.

**Why:** User asked for better search tooling; `rg` is already available and is the clear upgrade.

**How to apply:** Replace every `find ... | xargs grep` or `grep -r` with `rg <pattern>` or `rg <pattern> --type js`, etc. For semantic search (find all references, go to definition, call graph), use the LSP tool — it requires a language server running for the file type (not always available).
