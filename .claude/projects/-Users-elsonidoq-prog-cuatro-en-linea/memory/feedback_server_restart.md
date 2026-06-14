---
name: feedback-server-restart
description: pkill on server/index.js also kills Vite when both were started in the same terminal session
metadata: 
  node_type: memory
  type: feedback
  originSessionId: b9f8f8e6-5d30-4a8e-965d-bb516d5e5874
---

Do not use `pkill -f "server/index.js"` to restart the backend. Both the Vite dev server and the Node server were started together in the user's terminal (same process group), so killing one terminates the other.

**Why:** During the 009-puzzles-v1 session, `pkill` killed both processes, causing a blank-page Vite failure that required manually restarting the dev server.

**How to apply:** When a server restart is needed, tell the user to restart it manually in their terminal. If you must restart it yourself, start the new server process first, then kill the old one — and verify Vite is still running before reporting success.
