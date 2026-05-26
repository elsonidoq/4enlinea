---
name: reference-gemini-model
description: Correct Gemini model name to use in prompts and tool calls
metadata:
  type: reference
---

The correct Gemini model name is `gemini-3.1-pro-preview` — this model exists and should be used in prompts that call Gemini via MCP.

**Why:** Previously used `gemini-3.1-pro` (without `-preview`) or `gemini-2.0-flash` as fallbacks; the user confirmed `gemini-3.1-pro-preview` is the correct name.

**How to apply:** In any prompt or tool call that invokes Gemini (e.g. `mcp__gemini__gemini-query`), set `model: gemini-3.1-pro-preview`.
