---
name: feedback_supabase_config_modifiable
description: "User CAN modify production Supabase configuration via the dashboard; never assume it's off-limits"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2d5e24e1-81d4-449f-ae4c-7c0514a18041
---

Both local and production Supabase configurations are modifiable. Do not assume production settings are locked.

**Why:** Claude assumed production Supabase config was off-limits and fell back to workarounds. The user confirmed they can change production settings via the Supabase dashboard.

**How to apply:** When a Supabase feature is disabled by default (e.g. aggregate functions, max_rows), propose enabling it in config rather than working around it in code.
