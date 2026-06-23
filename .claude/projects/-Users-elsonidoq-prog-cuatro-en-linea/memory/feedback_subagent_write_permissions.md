---
name: feedback-subagent-write-permissions
description: "Background subagents can't get interactive Edit/Write approval — they get denied; implement directly or have them return a design"
metadata:
  node_type: memory
  type: feedback
---

# Background subagents get Edit/Write denied

When a spawned background agent (`Agent` tool) needs to edit files, its Edit/Write calls can be **denied outright** because it can't surface an interactive permission prompt — it just comes back blocked, having designed everything but written nothing.

**Why**: background agents cannot surface an interactive permission prompt, so Edit/Write calls are denied outright.

**How to apply**: For batches that must write code, prefer implementing in the main session, OR have the subagent return a tight, ready-to-apply design (file + exact change) that the main agent applies. Reserve background subagents for read/research/analysis that returns conclusions. If you do spawn a writing subagent, expect to apply its output yourself. Relates to [[reference-multiagent-orchestration-patterns]].
