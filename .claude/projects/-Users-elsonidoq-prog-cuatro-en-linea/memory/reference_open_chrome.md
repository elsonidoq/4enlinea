---
name: How to open Chrome with remote debugging
description: Command to launch Chrome with remote debugging on port 9222 for chrome-devtools-mcp
type: reference
originSessionId: 5616756b-cf08-4a73-b7f0-51dc61b75ec4
---
Use the binary directly with a fresh user-data-dir — `open -a` and normal GUI launch do NOT bind the port reliably.

**Command:**
```
pkill -x "Google Chrome"; nohup "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug2 > /tmp/chrome.log 2>&1 &
```

Then verify with:
```
curl http://localhost:9222/json/version
```

**Why:** On macOS (tested on Darwin 25.4 / Chrome 147–148), `open -a` and the Chrome GUI toggle for remote debugging both fail to bind port 9222. Only launching the binary directly with `--user-data-dir` pointing to a fresh directory works.
